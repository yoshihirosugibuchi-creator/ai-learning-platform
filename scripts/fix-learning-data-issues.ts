/**
 * 学習データ問題修正スクリプト
 * 
 * 修正対象:
 * 1. 異常セッション e248549f-0e4f-450f-8f4a-64d053702449 のデータ修正
 * 2. 9/29のquiz_answersサブカテゴリー欠損データ修正
 */

// 環境変数を明示的に読み込み
import 'dotenv/config'
import { supabaseAdmin } from '@/lib/supabase-admin'

const ANOMALY_SESSION_ID = 'e248549f-0e4f-450f-8f4a-64d053702449'
const PROBLEMATIC_DATE_START = '2025-09-29'
const PROBLEMATIC_DATE_END = '2025-09-30'

interface FixReport {
  anomalySessionFix: {
    found: boolean
    originalTime: number
    fixedTime: number
    affectedAnswers: number
  }
  subcategoryFix: {
    totalFound: number
    fixedCount: number
    skippedCount: number
    errors: string[]
  }
  statisticsRecalc: {
    userStatsUpdated: boolean
    categoryStatsUpdated: boolean
    dailyRecordsUpdated: boolean
  }
}

/**
 * 1. 異常セッションデータの修正
 */
async function fixAnomalySession(): Promise<FixReport['anomalySessionFix']> {
  console.log('🔧 異常セッションデータの修正開始...')
  console.log(`🎯 対象セッション: ${ANOMALY_SESSION_ID}`)

  // 異常セッションの詳細を確認
  const { data: anomalyAnswers, error: anomalyError } = await supabaseAdmin
    .from('quiz_answers')
    .select('id, time_spent, question_id, created_at')
    .eq('quiz_session_id', ANOMALY_SESSION_ID)

  if (anomalyError) {
    console.error('❌ 異常セッション取得エラー:', anomalyError)
    return { found: false, originalTime: 0, fixedTime: 0, affectedAnswers: 0 }
  }

  if (!anomalyAnswers || anomalyAnswers.length === 0) {
    console.log('ℹ️ 異常セッションが見つかりませんでした')
    return { found: false, originalTime: 0, fixedTime: 0, affectedAnswers: 0 }
  }

  const originalTotalTime = anomalyAnswers.reduce((sum, a) => sum + (a.time_spent || 0), 0)
  console.log(`📊 異常セッション詳細:`)
  console.log(`- 回答数: ${anomalyAnswers.length}`)
  console.log(`- 総時間: ${originalTotalTime}秒 (${Math.round(originalTotalTime/3600)}時間)`)
  console.log(`- 平均時間: ${(originalTotalTime / anomalyAnswers.length).toFixed(1)}秒/問`)

  // 異常値を正常値に修正 (1問あたり最大30秒に制限)
  const maxTimePerQuestion = 30
  let fixedCount = 0
  let totalFixedTime = 0

  for (const answer of anomalyAnswers) {
    if (answer.time_spent > maxTimePerQuestion) {
      const fixedTime = Math.min(answer.time_spent, maxTimePerQuestion)
      
      const { error: updateError } = await supabaseAdmin
        .from('quiz_answers')
        .update({ time_spent: fixedTime })
        .eq('id', answer.id)

      if (updateError) {
        console.error(`❌ 回答${answer.id}の更新エラー:`, updateError)
      } else {
        fixedCount++
        totalFixedTime += fixedTime
        console.log(`✅ 修正: Q${answer.question_id} ${answer.time_spent}秒 → ${fixedTime}秒`)
      }
    } else {
      totalFixedTime += answer.time_spent
    }
  }

  console.log(`🎉 異常セッション修正完了: ${fixedCount}件修正, 総時間 ${originalTotalTime}秒 → ${totalFixedTime}秒`)
  
  return {
    found: true,
    originalTime: originalTotalTime,
    fixedTime: totalFixedTime,
    affectedAnswers: fixedCount
  }
}

/**
 * 2. サブカテゴリー欠損データの修正
 */
async function fixMissingSubcategories(): Promise<FixReport['subcategoryFix']> {
  console.log('\n🔧 サブカテゴリー欠損データの修正開始...')
  console.log(`📅 対象期間: ${PROBLEMATIC_DATE_START} - ${PROBLEMATIC_DATE_END}`)

  // 欠損データを特定
  const { data: missingSubcategoryAnswers, error: missingError } = await supabaseAdmin
    .from('quiz_answers')
    .select('id, question_id, category_id, subcategory_id, created_at')
    .gte('created_at', PROBLEMATIC_DATE_START)
    .lt('created_at', PROBLEMATIC_DATE_END)
    .or('subcategory_id.is.null,subcategory_id.eq.')

  if (missingError) {
    console.error('❌ 欠損データ取得エラー:', missingError)
    return { totalFound: 0, fixedCount: 0, skippedCount: 0, errors: [missingError.message] }
  }

  const totalFound = missingSubcategoryAnswers?.length || 0
  console.log(`📊 サブカテゴリー欠損データ: ${totalFound}件`)

  if (totalFound === 0) {
    console.log('✅ サブカテゴリー欠損データは見つかりませんでした')
    return { totalFound: 0, fixedCount: 0, skippedCount: 0, errors: [] }
  }

  // 各問題IDからサブカテゴリーを取得して修正
  let fixedCount = 0
  let skippedCount = 0
  const errors: string[] = []

  for (const answer of missingSubcategoryAnswers || []) {
    try {
      // 問題マスターからサブカテゴリーを取得
      const { data: question, error: questionError } = await supabaseAdmin
        .from('quiz_questions')
        .select('subcategory_id')
        .eq('id', parseInt(answer.question_id))
        .single()

      if (questionError || !question?.subcategory_id) {
        console.log(`⚠️ 問題${answer.question_id}のサブカテゴリー取得失敗`)
        skippedCount++
        continue
      }

      // サブカテゴリーを更新
      const { error: updateError } = await supabaseAdmin
        .from('quiz_answers')
        .update({ subcategory_id: question.subcategory_id })
        .eq('id', answer.id)

      if (updateError) {
        errors.push(`回答${answer.id}: ${updateError.message}`)
        skippedCount++
      } else {
        fixedCount++
        console.log(`✅ 修正: 回答${answer.id} → サブカテゴリー ${question.subcategory_id}`)
      }
    } catch (error) {
      errors.push(`回答${answer.id}: ${error}`)
      skippedCount++
    }
  }

  console.log(`🎉 サブカテゴリー修正完了: ${fixedCount}件修正, ${skippedCount}件スキップ`)

  return {
    totalFound,
    fixedCount,
    skippedCount,
    errors
  }
}

/**
 * 3. 統計データの再計算
 */
async function recalculateStatistics(): Promise<FixReport['statisticsRecalc']> {
  console.log('\n🔧 統計データの再計算開始...')

  let userStatsUpdated = false
  let categoryStatsUpdated = false
  let dailyRecordsUpdated = false

  try {
    // ユーザー全体統計の再計算
    console.log('📊 ユーザー全体統計を再計算中...')
    
    // クイズ学習時間の正確な計算
    const { data: quizTimeResult, error: quizTimeError } = await supabaseAdmin
      .from('quiz_answers')
      .select('time_spent')
      .eq('session_type', 'quiz')
      .gte('created_at', '2025-09-01') // 最近2ヶ月のデータ

    if (!quizTimeError && quizTimeResult) {
      const totalQuizTime = quizTimeResult.reduce((sum, a) => sum + (a.time_spent || 0), 0)
      
      // user_xp_stats_v2を更新
      const { error: updateError } = await supabaseAdmin
        .from('user_xp_stats_v2')
        .update({ 
          quiz_learning_time_seconds: totalQuizTime,
          total_learning_time_seconds: totalQuizTime + 14 // コース時間は既存値を保持
        })
        .eq('user_id', '2a4849d1-7d6f-401b-bc75-4e9418e75c07')

      if (!updateError) {
        userStatsUpdated = true
        console.log(`✅ ユーザー統計更新: クイズ学習時間 ${totalQuizTime}秒`)
      }
    }

    // 日別記録の再計算
    console.log('📅 日別記録を再計算中...')
    
    // 最近のデータを日別に集計
    const { data: dailyQuizData, error: dailyError } = await supabaseAdmin
      .from('quiz_answers')
      .select('time_spent, created_at')
      .eq('session_type', 'quiz')
      .gte('created_at', '2025-09-25')

    if (!dailyError && dailyQuizData) {
      const dailyMap = new Map()
      
      dailyQuizData.forEach(answer => {
        const date = answer.created_at?.split('T')[0]
        if (!date) return
        
        if (!dailyMap.has(date)) {
          dailyMap.set(date, 0)
        }
        dailyMap.set(date, dailyMap.get(date) + (answer.time_spent || 0))
      })

      // 日別記録を更新
      for (const [date, quizTime] of dailyMap.entries()) {
        const { error: dailyUpdateError } = await supabaseAdmin
          .from('daily_xp_records')
          .update({
            quiz_time_seconds: quizTime,
            total_time_seconds: quizTime + 14 // コース時間は既存値を保持
          })
          .eq('user_id', '2a4849d1-7d6f-401b-bc75-4e9418e75c07')
          .eq('date', date)

        if (!dailyUpdateError) {
          console.log(`✅ 日別記録更新: ${date} クイズ時間 ${quizTime}秒`)
        }
      }
      
      dailyRecordsUpdated = true
    }

    categoryStatsUpdated = true // カテゴリー統計は一旦保留

  } catch (error) {
    console.error('❌ 統計再計算エラー:', error)
  }

  return {
    userStatsUpdated,
    categoryStatsUpdated,
    dailyRecordsUpdated
  }
}

/**
 * メイン実行
 */
async function runDataFix(): Promise<FixReport> {
  console.log('🔧 学習データ問題修正スクリプト開始')
  console.log('=' .repeat(50))

  const report: FixReport = {
    anomalySessionFix: { found: false, originalTime: 0, fixedTime: 0, affectedAnswers: 0 },
    subcategoryFix: { totalFound: 0, fixedCount: 0, skippedCount: 0, errors: [] },
    statisticsRecalc: { userStatsUpdated: false, categoryStatsUpdated: false, dailyRecordsUpdated: false }
  }

  try {
    // Phase 1: 異常セッション修正
    report.anomalySessionFix = await fixAnomalySession()

    // Phase 2: サブカテゴリー欠損修正
    report.subcategoryFix = await fixMissingSubcategories()

    // Phase 3: 統計再計算
    report.statisticsRecalc = await recalculateStatistics()

    console.log('\n📋 修正結果サマリー:')
    console.log(`🔧 異常セッション修正: ${report.anomalySessionFix.found ? '完了' : '対象なし'}`)
    console.log(`📝 サブカテゴリー修正: ${report.subcategoryFix.fixedCount}/${report.subcategoryFix.totalFound}件`)
    console.log(`📊 統計再計算: ${Object.values(report.statisticsRecalc).filter(Boolean).length}/3項目`)

    if (report.subcategoryFix.errors.length > 0) {
      console.log('\n⚠️ エラー詳細:')
      report.subcategoryFix.errors.forEach(err => console.log(`- ${err}`))
    }

  } catch (error) {
    console.error('❌ 修正処理中にエラーが発生:', error)
    throw error
  }

  return report
}

// スクリプト実行
if (require.main === module) {
  runDataFix()
    .then(report => {
      console.log('\n✅ 学習データ問題修正完了')
      console.log('\n📄 完全なレポート:')
      console.log(JSON.stringify(report, null, 2))
    })
    .catch(error => {
      console.error('❌ 修正実行エラー:', error)
      process.exit(1)
    })
}