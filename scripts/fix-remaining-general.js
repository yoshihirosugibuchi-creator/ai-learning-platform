/**
 * 残存するgeneral subcategory_idを修正するスクリプト
 *
 * 使用方法:
 *   node scripts/fix-remaining-general.js --dry-run   # プレビュー
 *   node scripts/fix-remaining-general.js --execute   # 実行
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const isDryRun = process.argv.includes('--dry-run')
const isExecute = process.argv.includes('--execute')

if (!isDryRun && !isExecute) {
  console.log('使用方法:')
  console.log('  node scripts/fix-remaining-general.js --dry-run')
  console.log('  node scripts/fix-remaining-general.js --execute')
  process.exit(0)
}

async function main() {
  console.log('='.repeat(60))
  console.log(isDryRun ? '🔍 ドライラン' : '⚡ 実行モード')
  console.log('='.repeat(60))

  // Step 1: generalの回答を取得
  const { data: generalAnswers, error: gaError } = await supabase
    .from('quiz_answers')
    .select('id, question_id, user_id, subcategory_id')
    .eq('subcategory_id', 'general')

  if (gaError) {
    console.error('Error fetching general answers:', gaError)
    return
  }

  console.log(`\n📊 general回答数: ${generalAnswers?.length || 0}`)

  if (!generalAnswers || generalAnswers.length === 0) {
    console.log('✅ 修正対象なし')
    return
  }

  // Step 2: 数値形式のquestion_idのみ抽出
  const numericPattern = /^\d+$/
  const numericAnswers = generalAnswers.filter(a => numericPattern.test(a.question_id))
  console.log(`数値形式のquestion_id: ${numericAnswers.length}`)

  if (numericAnswers.length === 0) {
    console.log('✅ 修正可能な回答なし')
    return
  }

  // Step 3: quiz_questionsから正しいsubcategory_idを取得
  const questionIds = [...new Set(numericAnswers.map(a => parseInt(a.question_id, 10)))]

  const { data: questions, error: qError } = await supabase
    .from('quiz_questions')
    .select('id, subcategory_id')
    .in('id', questionIds)

  if (qError) {
    console.error('Error fetching questions:', qError)
    return
  }

  // マッピング作成
  const subcategoryMap = new Map()
  for (const q of (questions || [])) {
    if (q.subcategory_id && q.subcategory_id !== '' && q.subcategory_id !== 'general') {
      subcategoryMap.set(q.id, q.subcategory_id)
    }
  }

  console.log(`有効なsubcategory_idを持つ問題: ${subcategoryMap.size}`)

  // Step 4: 修正対象を特定
  const fixableAnswers = numericAnswers.filter(a =>
    subcategoryMap.has(parseInt(a.question_id, 10))
  )

  console.log(`修正可能な回答: ${fixableAnswers.length}`)

  if (fixableAnswers.length === 0) {
    console.log('✅ 修正対象なし')
    return
  }

  // サンプル表示
  console.log('\n📋 修正対象サンプル (最初の10件):')
  for (const ans of fixableAnswers.slice(0, 10)) {
    const correctSub = subcategoryMap.get(parseInt(ans.question_id, 10))
    console.log(`  question_id: ${ans.question_id}, general → ${correctSub}`)
  }

  if (isDryRun) {
    console.log('\n' + '='.repeat(60))
    console.log('🔍 ドライランモード - 実行には --execute を使用')
    console.log('='.repeat(60))
    return
  }

  // Step 5: 実行 - 一件ずつ確実に更新
  console.log('\n📝 更新開始...')
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < fixableAnswers.length; i++) {
    const ans = fixableAnswers[i]
    const correctSubcategory = subcategoryMap.get(parseInt(ans.question_id, 10))

    const { error: updateError } = await supabase
      .from('quiz_answers')
      .update({ subcategory_id: correctSubcategory })
      .eq('id', ans.id)

    if (updateError) {
      console.error(`❌ Error updating ${ans.id}:`, updateError.message)
      errorCount++
    } else {
      successCount++
    }

    // 進捗表示
    if ((i + 1) % 50 === 0 || i === fixableAnswers.length - 1) {
      console.log(`  進捗: ${i + 1}/${fixableAnswers.length}`)
    }
  }

  console.log(`\n✅ 更新完了: 成功 ${successCount}, エラー ${errorCount}`)

  // Step 6: 検証
  const { count: remainingGeneral } = await supabase
    .from('quiz_answers')
    .select('id', { count: 'exact', head: true })
    .eq('subcategory_id', 'general')

  console.log(`\n📊 残存するgeneral: ${remainingGeneral}件`)

  // Step 7: XP統計の再計算
  console.log('\n📊 XP統計を再計算...')

  // 影響を受けるユーザー
  const affectedUsers = [...new Set(fixableAnswers.map(a => a.user_id))]
  console.log(`影響を受けるユーザー: ${affectedUsers.length}人`)

  for (const userId of affectedUsers) {
    try {
      // quiz_answersから全回答を取得
      let allAnswers = []
      let offset = 0
      const pageSize = 1000

      while (true) {
        const { data: answers } = await supabase
          .from('quiz_answers')
          .select('category_id, subcategory_id, earned_xp, is_correct, created_at')
          .eq('user_id', userId)
          .not('subcategory_id', 'is', null)
          .neq('subcategory_id', '')
          .range(offset, offset + pageSize - 1)

        if (!answers || answers.length === 0) break
        allAnswers = allAnswers.concat(answers)
        if (answers.length < pageSize) break
        offset += pageSize
      }

      // サブカテゴリー別集計
      const subStats = new Map()

      for (const a of allAnswers) {
        const subKey = `${a.category_id}|${a.subcategory_id}`
        if (!subStats.has(subKey)) {
          subStats.set(subKey, {
            user_id: userId,
            category_id: a.category_id,
            subcategory_id: a.subcategory_id,
            total_xp: 0,
            quiz_xp: 0,
            course_xp: 0,
            quiz_questions_answered: 0,
            quiz_questions_correct: 0
          })
        }
        const sub = subStats.get(subKey)
        sub.total_xp += a.earned_xp || 0
        sub.quiz_xp += a.earned_xp || 0
        sub.quiz_questions_answered += 1
        sub.quiz_questions_correct += a.is_correct ? 1 : 0
      }

      // UPSERT
      for (const [, stats] of subStats) {
        const accuracy = stats.quiz_questions_answered > 0
          ? (stats.quiz_questions_correct / stats.quiz_questions_answered) * 100
          : 0

        await supabase
          .from('user_subcategory_xp_stats_v2')
          .upsert({
            user_id: stats.user_id,
            category_id: stats.category_id,
            subcategory_id: stats.subcategory_id,
            total_xp: stats.total_xp,
            quiz_xp: stats.quiz_xp,
            course_xp: stats.course_xp,
            quiz_questions_answered: stats.quiz_questions_answered,
            quiz_questions_correct: stats.quiz_questions_correct,
            quiz_average_accuracy: accuracy,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,category_id,subcategory_id'
          })
      }
    } catch (err) {
      console.error(`  ❌ ユーザー ${userId.substring(0, 8)}... エラー:`, err.message)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎉 完了!')
  console.log('='.repeat(60))
}

main()
