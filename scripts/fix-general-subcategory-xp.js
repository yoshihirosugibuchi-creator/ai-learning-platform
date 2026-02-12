/**
 * XPサブカテゴリー修正スクリプト
 *
 * quiz_answersのsubcategory_id='general'を正しい値に修正し、
 * XP集計テーブルを再計算します。
 *
 * 使用方法:
 *   node scripts/fix-general-subcategory-xp.js --dry-run   # プレビュー
 *   node scripts/fix-general-subcategory-xp.js --execute   # 実行
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません')
  console.error('   NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を確認してください')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const isDryRun = process.argv.includes('--dry-run')
const isExecute = process.argv.includes('--execute')

if (!isDryRun && !isExecute) {
  console.log('使用方法:')
  console.log('  node scripts/fix-general-subcategory-xp.js --dry-run   # プレビュー（変更なし）')
  console.log('  node scripts/fix-general-subcategory-xp.js --execute   # 実行（本番適用）')
  process.exit(0)
}

async function main() {
  console.log('='.repeat(60))
  console.log(isDryRun ? '🔍 ドライラン（プレビュー）モード' : '⚡ 実行モード')
  console.log('='.repeat(60))
  console.log('')

  try {
    // STEP 1: 現状確認
    console.log('📊 STEP 1: 現状確認')
    console.log('-'.repeat(40))

    // generalのレコード数
    const { data: generalCount, error: countError } = await supabase
      .from('quiz_answers')
      .select('id', { count: 'exact', head: true })
      .eq('subcategory_id', 'general')

    if (countError) throw new Error(`カウント取得エラー: ${countError.message}`)

    console.log(`   quiz_answers で subcategory_id='general': ${generalCount?.length || 0} 件`)

    // 修正可能なレコードを取得
    const { data: fixableAnswers, error: fixableError } = await supabase
      .rpc('get_fixable_general_answers')
      .select('*')

    // RPCがない場合は直接クエリ
    let answersToFix = fixableAnswers
    if (fixableError) {
      console.log('   ℹ️ RPCがないため直接クエリで取得します...')

      // quiz_answersでgeneral、かつquestion_idが数値形式のものを取得
      const { data: generalAnswers, error: gaError } = await supabase
        .from('quiz_answers')
        .select('id, question_id, user_id, category_id, subcategory_id, earned_xp, is_correct, time_spent, created_at')
        .eq('subcategory_id', 'general')

      if (gaError) throw new Error(`general回答取得エラー: ${gaError.message}`)

      // 数値形式のquestion_idのみフィルタ
      const numericAnswers = (generalAnswers || []).filter(a => /^\d+$/.test(a.question_id))
      console.log(`   数値形式のquestion_id: ${numericAnswers.length} 件`)

      if (numericAnswers.length === 0) {
        console.log('   ℹ️ 修正対象のレコードがありません')
        return
      }

      // question_idsを取得
      const questionIds = [...new Set(numericAnswers.map(a => parseInt(a.question_id, 10)))]

      // quiz_questionsから正しいsubcategory_idを取得
      const { data: questions, error: qError } = await supabase
        .from('quiz_questions')
        .select('id, subcategory_id')
        .in('id', questionIds)
        .not('subcategory_id', 'is', null)
        .neq('subcategory_id', '')
        .neq('subcategory_id', 'general')

      if (qError) throw new Error(`問題取得エラー: ${qError.message}`)

      // マッピング作成
      const questionSubcategoryMap = new Map()
      for (const q of (questions || [])) {
        questionSubcategoryMap.set(q.id, q.subcategory_id)
      }

      // 修正対象を特定
      answersToFix = numericAnswers
        .filter(a => questionSubcategoryMap.has(parseInt(a.question_id, 10)))
        .map(a => ({
          ...a,
          correct_subcategory_id: questionSubcategoryMap.get(parseInt(a.question_id, 10))
        }))
    }

    console.log(`   修正可能なレコード: ${answersToFix?.length || 0} 件`)

    if (!answersToFix || answersToFix.length === 0) {
      console.log('')
      console.log('✅ 修正対象のレコードがありません')
      return
    }

    // サンプル表示
    console.log('')
    console.log('   サンプルデータ（最初の5件）:')
    for (const answer of answersToFix.slice(0, 5)) {
      console.log(`     ID: ${answer.id}, question_id: ${answer.question_id}`)
      console.log(`       current: 'general' → correct: '${answer.correct_subcategory_id}'`)
    }

    // 影響を受けるユーザー
    const affectedUsers = [...new Set(answersToFix.map(a => a.user_id))]
    console.log('')
    console.log(`   影響を受けるユーザー: ${affectedUsers.length} 人`)

    if (isDryRun) {
      console.log('')
      console.log('='.repeat(60))
      console.log('🔍 ドライランモードのため、ここで終了します')
      console.log('   実際に修正する場合は --execute オプションを使用してください')
      console.log('='.repeat(60))
      return
    }

    // STEP 2: quiz_answersの更新
    console.log('')
    console.log('📝 STEP 2: quiz_answers の subcategory_id を更新')
    console.log('-'.repeat(40))

    let updatedCount = 0
    const batchSize = 100

    for (let i = 0; i < answersToFix.length; i += batchSize) {
      const batch = answersToFix.slice(i, i + batchSize)

      for (const answer of batch) {
        const { error: updateError } = await supabase
          .from('quiz_answers')
          .update({ subcategory_id: answer.correct_subcategory_id })
          .eq('id', answer.id)

        if (updateError) {
          console.error(`   ❌ ID ${answer.id} の更新エラー: ${updateError.message}`)
        } else {
          updatedCount++
        }
      }

      console.log(`   進捗: ${Math.min(i + batchSize, answersToFix.length)}/${answersToFix.length} 件`)
    }

    console.log(`   ✅ ${updatedCount} 件を更新しました`)

    // STEP 3: user_subcategory_xp_stats_v2 の再計算
    console.log('')
    console.log('📊 STEP 3: user_subcategory_xp_stats_v2 の再計算')
    console.log('-'.repeat(40))

    for (const userId of affectedUsers) {
      // 該当ユーザーの既存レコードを削除
      const { error: deleteSubError } = await supabase
        .from('user_subcategory_xp_stats_v2')
        .delete()
        .eq('user_id', userId)

      if (deleteSubError) {
        console.error(`   ❌ ユーザー ${userId.substring(0, 8)}... の削除エラー: ${deleteSubError.message}`)
        continue
      }

      // quiz_answersから再集計
      const { data: userAnswers, error: uaError } = await supabase
        .from('quiz_answers')
        .select('category_id, subcategory_id, earned_xp, is_correct, time_spent, created_at')
        .eq('user_id', userId)
        .not('subcategory_id', 'is', null)
        .neq('subcategory_id', '')

      if (uaError) {
        console.error(`   ❌ ユーザー ${userId.substring(0, 8)}... の回答取得エラー: ${uaError.message}`)
        continue
      }

      // カテゴリー・サブカテゴリー別に集計
      const statsMap = new Map()
      for (const answer of (userAnswers || [])) {
        const key = `${answer.category_id}|${answer.subcategory_id}`
        if (!statsMap.has(key)) {
          statsMap.set(key, {
            user_id: userId,
            category_id: answer.category_id,
            subcategory_id: answer.subcategory_id,
            total_xp: 0,
            questions_answered: 0,
            correct_answers: 0,
            total_time_spent: 0,
            last_activity_at: null
          })
        }
        const stats = statsMap.get(key)
        stats.total_xp += answer.earned_xp || 0
        stats.questions_answered += 1
        stats.correct_answers += answer.is_correct ? 1 : 0
        stats.total_time_spent += answer.time_spent || 0
        if (!stats.last_activity_at || answer.created_at > stats.last_activity_at) {
          stats.last_activity_at = answer.created_at
        }
      }

      // INSERT
      const insertData = Array.from(statsMap.values()).map(s => ({
        user_id: s.user_id,
        category_id: s.category_id,
        subcategory_id: s.subcategory_id,
        total_xp: s.total_xp,
        questions_answered: s.questions_answered,
        correct_answers: s.correct_answers,
        accuracy_rate: s.questions_answered > 0 ? (s.correct_answers / s.questions_answered) * 100 : 0,
        average_time_spent: s.questions_answered > 0 ? s.total_time_spent / s.questions_answered : 0,
        last_activity_at: s.last_activity_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      if (insertData.length > 0) {
        const { error: insertSubError } = await supabase
          .from('user_subcategory_xp_stats_v2')
          .insert(insertData)

        if (insertSubError) {
          console.error(`   ❌ ユーザー ${userId.substring(0, 8)}... のINSERTエラー: ${insertSubError.message}`)
        }
      }
    }

    console.log(`   ✅ ${affectedUsers.length} ユーザーのサブカテゴリー統計を再計算しました`)

    // STEP 4: user_category_xp_stats_v2 の再計算
    console.log('')
    console.log('📊 STEP 4: user_category_xp_stats_v2 の再計算')
    console.log('-'.repeat(40))

    for (const userId of affectedUsers) {
      // 該当ユーザーの既存レコードを削除
      const { error: deleteCatError } = await supabase
        .from('user_category_xp_stats_v2')
        .delete()
        .eq('user_id', userId)

      if (deleteCatError) {
        console.error(`   ❌ ユーザー ${userId.substring(0, 8)}... の削除エラー: ${deleteCatError.message}`)
        continue
      }

      // quiz_answersから再集計
      const { data: userAnswers, error: uaError } = await supabase
        .from('quiz_answers')
        .select('category_id, earned_xp, is_correct, time_spent, created_at')
        .eq('user_id', userId)
        .not('category_id', 'is', null)
        .neq('category_id', '')

      if (uaError) {
        console.error(`   ❌ ユーザー ${userId.substring(0, 8)}... の回答取得エラー: ${uaError.message}`)
        continue
      }

      // カテゴリー別に集計
      const statsMap = new Map()
      for (const answer of (userAnswers || [])) {
        const key = answer.category_id
        if (!statsMap.has(key)) {
          statsMap.set(key, {
            user_id: userId,
            category_id: answer.category_id,
            total_xp: 0,
            questions_answered: 0,
            correct_answers: 0,
            total_time_spent: 0,
            last_activity_at: null
          })
        }
        const stats = statsMap.get(key)
        stats.total_xp += answer.earned_xp || 0
        stats.questions_answered += 1
        stats.correct_answers += answer.is_correct ? 1 : 0
        stats.total_time_spent += answer.time_spent || 0
        if (!stats.last_activity_at || answer.created_at > stats.last_activity_at) {
          stats.last_activity_at = answer.created_at
        }
      }

      // INSERT
      const insertData = Array.from(statsMap.values()).map(s => ({
        user_id: s.user_id,
        category_id: s.category_id,
        total_xp: s.total_xp,
        questions_answered: s.questions_answered,
        correct_answers: s.correct_answers,
        accuracy_rate: s.questions_answered > 0 ? (s.correct_answers / s.questions_answered) * 100 : 0,
        average_time_spent: s.questions_answered > 0 ? s.total_time_spent / s.questions_answered : 0,
        last_activity_at: s.last_activity_at,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))

      if (insertData.length > 0) {
        const { error: insertCatError } = await supabase
          .from('user_category_xp_stats_v2')
          .insert(insertData)

        if (insertCatError) {
          console.error(`   ❌ ユーザー ${userId.substring(0, 8)}... のINSERTエラー: ${insertCatError.message}`)
        }
      }
    }

    console.log(`   ✅ ${affectedUsers.length} ユーザーのカテゴリー統計を再計算しました`)

    // STEP 5: 検証
    console.log('')
    console.log('✅ STEP 5: 検証')
    console.log('-'.repeat(40))

    // generalの残存確認
    const { count: remainingGeneral } = await supabase
      .from('quiz_answers')
      .select('id', { count: 'exact', head: true })
      .eq('subcategory_id', 'general')

    console.log(`   quiz_answers で残存する general: ${remainingGeneral || 0} 件`)

    // サブカテゴリー統計のgeneral確認
    const { count: subGeneral } = await supabase
      .from('user_subcategory_xp_stats_v2')
      .select('id', { count: 'exact', head: true })
      .eq('subcategory_id', 'general')

    console.log(`   user_subcategory_xp_stats_v2 の general: ${subGeneral || 0} 件`)

    console.log('')
    console.log('='.repeat(60))
    console.log('🎉 修正完了！')
    console.log('='.repeat(60))

  } catch (error) {
    console.error('')
    console.error('❌ エラーが発生しました:', error.message)
    console.error(error.stack)
    process.exit(1)
  }
}

main()
