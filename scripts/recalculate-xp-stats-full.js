/**
 * XP統計テーブル全体再計算スクリプト
 *
 * quiz_answersを正として、以下のテーブルを再計算:
 * - user_category_xp_stats_v2
 * - user_subcategory_xp_stats_v2
 *
 * ※ course_xpは別ソース（course_session_completions）から計算
 *
 * 使用方法:
 *   node scripts/recalculate-xp-stats-full.js --dry-run   # プレビュー
 *   node scripts/recalculate-xp-stats-full.js --execute   # 実行
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
  console.log('  node scripts/recalculate-xp-stats-full.js --dry-run')
  console.log('  node scripts/recalculate-xp-stats-full.js --execute')
  process.exit(0)
}

async function main() {
  console.log('='.repeat(60))
  console.log(isDryRun ? '🔍 ドライラン（プレビューモード）' : '⚡ 実行モード')
  console.log('='.repeat(60))

  // Step 1: 全ユーザーのquiz_answersを取得
  console.log('\n📊 Step 1: quiz_answersからデータ取得...')

  let allAnswers = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    const { data: answers, error } = await supabase
      .from('quiz_answers')
      .select('user_id, category_id, subcategory_id, earned_xp, is_correct')
      .not('category_id', 'is', null)
      .not('subcategory_id', 'is', null)
      .neq('subcategory_id', '')
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error('Error fetching answers:', error)
      return
    }

    if (!answers || answers.length === 0) break
    allAnswers = allAnswers.concat(answers)
    console.log(`  取得: ${allAnswers.length}件...`)
    if (answers.length < pageSize) break
    offset += pageSize
  }

  console.log(`総quiz_answers数: ${allAnswers.length}`)

  // Step 2: ユーザー別・カテゴリー別・サブカテゴリー別に集計
  console.log('\n📊 Step 2: 集計計算...')

  const users = [...new Set(allAnswers.map(a => a.user_id))]
  console.log(`対象ユーザー数: ${users.length}`)

  const categoryStats = new Map() // key: `${user_id}|${category_id}`
  const subcategoryStats = new Map() // key: `${user_id}|${category_id}|${subcategory_id}`

  for (const ans of allAnswers) {
    const catKey = `${ans.user_id}|${ans.category_id}`
    const subKey = `${ans.user_id}|${ans.category_id}|${ans.subcategory_id}`

    // カテゴリー集計
    if (!categoryStats.has(catKey)) {
      categoryStats.set(catKey, {
        user_id: ans.user_id,
        category_id: ans.category_id,
        quiz_xp: 0,
        quiz_questions_answered: 0,
        quiz_questions_correct: 0
      })
    }
    const cat = categoryStats.get(catKey)
    cat.quiz_xp += ans.earned_xp || 0
    cat.quiz_questions_answered += 1
    cat.quiz_questions_correct += ans.is_correct ? 1 : 0

    // サブカテゴリー集計
    if (!subcategoryStats.has(subKey)) {
      subcategoryStats.set(subKey, {
        user_id: ans.user_id,
        category_id: ans.category_id,
        subcategory_id: ans.subcategory_id,
        quiz_xp: 0,
        quiz_questions_answered: 0,
        quiz_questions_correct: 0
      })
    }
    const sub = subcategoryStats.get(subKey)
    sub.quiz_xp += ans.earned_xp || 0
    sub.quiz_questions_answered += 1
    sub.quiz_questions_correct += ans.is_correct ? 1 : 0
  }

  console.log(`カテゴリー統計レコード数: ${categoryStats.size}`)
  console.log(`サブカテゴリー統計レコード数: ${subcategoryStats.size}`)

  // Step 3: course_session_completionsからcourse_xpを取得
  console.log('\n📊 Step 3: course_xp取得...')

  const { data: courseCompletions } = await supabase
    .from('course_session_completions')
    .select('user_id, category_id, subcategory_id, xp_earned')

  const courseCatXP = new Map()
  const courseSubXP = new Map()

  for (const c of (courseCompletions || [])) {
    if (!c.category_id) continue

    const catKey = `${c.user_id}|${c.category_id}`
    courseCatXP.set(catKey, (courseCatXP.get(catKey) || 0) + (c.xp_earned || 0))

    if (c.subcategory_id) {
      const subKey = `${c.user_id}|${c.category_id}|${c.subcategory_id}`
      courseSubXP.set(subKey, (courseSubXP.get(subKey) || 0) + (c.xp_earned || 0))
    }
  }

  console.log(`course_xpレコード数（カテゴリー）: ${courseCatXP.size}`)
  console.log(`course_xpレコード数（サブカテゴリー）: ${courseSubXP.size}`)

  // Step 4: 孤立generalを特定
  console.log('\n📊 Step 4: 孤立general統計を特定...')

  const { data: existingSubStats } = await supabase
    .from('user_subcategory_xp_stats_v2')
    .select('id, user_id, category_id, subcategory_id')
    .eq('subcategory_id', 'general')

  console.log(`削除対象のgeneral統計: ${existingSubStats?.length || 0}件`)

  if (isDryRun) {
    // サンプル表示
    console.log('\n📋 再計算後のサンプル（最初の5件）:')
    let count = 0
    for (const [, stats] of subcategoryStats) {
      if (count >= 5) break
      const accuracy = stats.quiz_questions_answered > 0
        ? ((stats.quiz_questions_correct / stats.quiz_questions_answered) * 100).toFixed(1)
        : 0
      console.log(`  ${stats.user_id.substring(0, 8)}... | ${stats.category_id}/${stats.subcategory_id} | quiz_xp: ${stats.quiz_xp}, answered: ${stats.quiz_questions_answered}, accuracy: ${accuracy}%`)
      count++
    }

    console.log('\n' + '='.repeat(60))
    console.log('🔍 ドライランモード - 実行には --execute を使用')
    console.log('='.repeat(60))
    return
  }

  // Step 5: 孤立general統計を削除
  console.log('\n📝 Step 5: 孤立general統計を削除...')

  if (existingSubStats && existingSubStats.length > 0) {
    const generalIds = existingSubStats.map(s => s.id)
    const { error: deleteError } = await supabase
      .from('user_subcategory_xp_stats_v2')
      .delete()
      .in('id', generalIds)

    if (deleteError) {
      console.error('❌ general削除エラー:', deleteError.message)
    } else {
      console.log(`✅ ${generalIds.length}件のgeneral統計を削除`)
    }
  }

  // Step 6: user_subcategory_xp_stats_v2をUPSERT
  console.log('\n📝 Step 6: サブカテゴリー統計を更新...')

  let subSuccess = 0
  let subError = 0

  for (const [subKey, stats] of subcategoryStats) {
    const courseXP = courseSubXP.get(subKey) || 0
    const accuracy = stats.quiz_questions_answered > 0
      ? (stats.quiz_questions_correct / stats.quiz_questions_answered) * 100
      : 0

    const { error } = await supabase
      .from('user_subcategory_xp_stats_v2')
      .upsert({
        user_id: stats.user_id,
        category_id: stats.category_id,
        subcategory_id: stats.subcategory_id,
        total_xp: stats.quiz_xp + courseXP,
        quiz_xp: stats.quiz_xp,
        course_xp: courseXP,
        quiz_questions_answered: stats.quiz_questions_answered,
        quiz_questions_correct: stats.quiz_questions_correct,
        quiz_average_accuracy: accuracy,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,category_id,subcategory_id'
      })

    if (error) {
      console.error(`  ❌ Error: ${stats.subcategory_id}:`, error.message)
      subError++
    } else {
      subSuccess++
    }

    if ((subSuccess + subError) % 100 === 0) {
      console.log(`  進捗: ${subSuccess + subError}/${subcategoryStats.size}`)
    }
  }

  console.log(`✅ サブカテゴリー統計更新完了: 成功 ${subSuccess}, エラー ${subError}`)

  // Step 7: user_category_xp_stats_v2をUPSERT
  console.log('\n📝 Step 7: カテゴリー統計を更新...')

  let catSuccess = 0
  let catError = 0

  for (const [catKey, stats] of categoryStats) {
    const courseXP = courseCatXP.get(catKey) || 0
    const accuracy = stats.quiz_questions_answered > 0
      ? (stats.quiz_questions_correct / stats.quiz_questions_answered) * 100
      : 0

    const { error } = await supabase
      .from('user_category_xp_stats_v2')
      .upsert({
        user_id: stats.user_id,
        category_id: stats.category_id,
        total_xp: stats.quiz_xp + courseXP,
        quiz_xp: stats.quiz_xp,
        course_xp: courseXP,
        quiz_questions_answered: stats.quiz_questions_answered,
        quiz_questions_correct: stats.quiz_questions_correct,
        quiz_average_accuracy: accuracy,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,category_id'
      })

    if (error) {
      console.error(`  ❌ Error: ${stats.category_id}:`, error.message)
      catError++
    } else {
      catSuccess++
    }
  }

  console.log(`✅ カテゴリー統計更新完了: 成功 ${catSuccess}, エラー ${catError}`)

  // Step 8: 検証
  console.log('\n📊 Step 8: 検証...')

  const { count: remainingGeneral } = await supabase
    .from('user_subcategory_xp_stats_v2')
    .select('id', { count: 'exact', head: true })
    .eq('subcategory_id', 'general')

  console.log(`残存general統計: ${remainingGeneral}件`)

  console.log('\n' + '='.repeat(60))
  console.log('🎉 完了!')
  console.log('='.repeat(60))
}

main().catch(console.error)
