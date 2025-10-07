/**
 * quiz_answersから統計テーブルの再計算スクリプト
 * 
 * 対象テーブル:
 * - daily_xp_records
 * - user_xp_stats_v2  
 * - user_category_xp_stats_v2
 * - user_subcategory_xp_stats_v2
 * 
 * SKPは現状維持
 */

import 'dotenv/config'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface RecalcReport {
  dailyRecords: {
    totalDays: number
    updatedDays: number
    errors: string[]
  }
  userStats: {
    totalUsers: number
    updatedUsers: number
    errors: string[]
  }
  categoryStats: {
    totalRecords: number
    updatedRecords: number
    errors: string[]
  }
  subcategoryStats: {
    totalRecords: number
    updatedRecords: number
    errors: string[]
  }
}

/**
 * 1. daily_xp_records の学習時間再計算
 */
async function recalculateDailyRecords(): Promise<RecalcReport['dailyRecords']> {
  console.log('📅 daily_xp_records 学習時間再計算開始...')
  
  const result: RecalcReport['dailyRecords'] = {
    totalDays: 0,
    updatedDays: 0,
    errors: []
  }
  
  try {
    // quiz_answersから全ての日付とユーザーを取得して集計
    const { data: allQuizAnswers } = await supabaseAdmin
      .from('quiz_answers')
      .select('created_at, time_spent, session_type')
      .eq('session_type', 'quiz')
      .order('created_at')
      
    if (!allQuizAnswers || allQuizAnswers.length === 0) {
      console.log('📋 quiz_answersにクイズデータが見つかりません')
      return result
    }
    
    // 日付・ユーザー別に集計
    const dailyStats = new Map<string, { date: string, quizTime: number, quizSessions: number }>()
    
    // 全てのユーザーIDを取得（現在は特定ユーザーのみ対象）
    const TARGET_USER_ID = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'
    
    allQuizAnswers.forEach(answer => {
      const date = answer.created_at?.split('T')[0] // YYYY-MM-DD
      if (!date) return
      
      const key = `${TARGET_USER_ID}_${date}`
      const current = dailyStats.get(key) || { date, quizTime: 0, quizSessions: 0 }
      current.quizTime += answer.time_spent || 0
      dailyStats.set(key, current)
    })
    
    console.log(`📊 quiz_answersから集計された日付: ${dailyStats.size}件`)
    
    // セッション数も集計
    const { data: allQuizSessions } = await supabaseAdmin
      .from('quiz_sessions')
      .select('session_start_time')
      .eq('user_id', TARGET_USER_ID)
      .order('session_start_time')
      
    if (allQuizSessions) {
      const sessionsByDate = new Map<string, number>()
      allQuizSessions.forEach(session => {
        const date = session.session_start_time?.split('T')[0]
        if (date) {
          sessionsByDate.set(date, (sessionsByDate.get(date) || 0) + 1)
        }
      })
      
      // 既存の集計データにセッション数を追加
      dailyStats.forEach((stats, key) => {
        const date = stats.date
        stats.quizSessions = sessionsByDate.get(date) || 0
      })
    }
    
    result.totalDays = dailyStats.size
    
    // 各日付のレコードを upsert（更新または新規作成）
    for (const [key, stats] of dailyStats) {
      try {
        // 既存レコードから他の情報を取得
        const { data: existingRecord } = await supabaseAdmin
          .from('daily_xp_records')
          .select('course_time_seconds, course_sessions, total_xp_earned, quiz_xp_earned, course_xp_earned, bonus_xp_earned, study_time_minutes')
          .eq('user_id', TARGET_USER_ID)
          .eq('date', stats.date)
          .single()
          
        const courseTimeSeconds = existingRecord?.course_time_seconds || 0
        const courseSessions = existingRecord?.course_sessions || 0
        const totalTimeSeconds = stats.quizTime + courseTimeSeconds
        
        // レコードをupsert（存在すれば更新、なければ新規作成）
        const { error: upsertError } = await supabaseAdmin
          .from('daily_xp_records')
          .upsert({
            user_id: TARGET_USER_ID,
            date: stats.date,
            quiz_time_seconds: stats.quizTime,
            quiz_sessions: stats.quizSessions,
            course_time_seconds: courseTimeSeconds,
            course_sessions: courseSessions,
            total_time_seconds: totalTimeSeconds,
            total_xp_earned: existingRecord?.total_xp_earned || 0,
            quiz_xp_earned: existingRecord?.quiz_xp_earned || 0,
            course_xp_earned: existingRecord?.course_xp_earned || 0,
            bonus_xp_earned: existingRecord?.bonus_xp_earned || 0,
            study_time_minutes: Math.floor(totalTimeSeconds / 60)
          })
          
        if (upsertError) {
          result.errors.push(`${stats.date}: ${upsertError.message}`)
        } else {
          result.updatedDays++
          console.log(`✅ ${stats.date}: クイズ時間 ${stats.quizTime}秒, セッション ${stats.quizSessions}件`)
        }
        
      } catch (error) {
        result.errors.push(`${stats.date}: ${error}`)
      }
    }
    
  } catch (error) {
    result.errors.push(`全体エラー: ${error}`)
  }
  
  return result
}

/**
 * 2. user_xp_stats_v2 の学習時間・セッション数再計算
 */
async function recalculateUserStats(): Promise<RecalcReport['userStats']> {
  console.log('\n👤 user_xp_stats_v2 再計算開始...')
  
  const result: RecalcReport['userStats'] = {
    totalUsers: 0,
    updatedUsers: 0,
    errors: []
  }
  
  try {
    // 既存のユーザー統計を取得
    const { data: existingStats } = await supabaseAdmin
      .from('user_xp_stats_v2')
      .select('user_id, course_learning_time_seconds, course_sessions_completed, total_xp, quiz_xp, course_xp, bonus_xp, total_skp, quiz_skp, course_skp, streak_skp, bonus_skp')
      
    result.totalUsers = existingStats?.length || 0
    console.log(`📊 既存ユーザー数: ${result.totalUsers}件`)
    
    if (!existingStats || existingStats.length === 0) {
      return result
    }
    
    for (const userStat of existingStats) {
      try {
        // クイズ回答時間を集計
        const { data: quizAnswers } = await supabaseAdmin
          .from('quiz_answers')
          .select('time_spent')
          .eq('session_type', 'quiz')
          
        const quizLearningTimeSeconds = quizAnswers?.reduce((sum, a) => sum + (a.time_spent || 0), 0) || 0
        
        // クイズセッション数を集計
        const { data: quizSessions } = await supabaseAdmin
          .from('quiz_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userStat.user_id)
          
        const quizSessionsCompleted = (quizSessions as unknown as number) || 0
        
        // クイズ問題数を集計
        const { data: allQuizAnswers } = await supabaseAdmin
          .from('quiz_answers')
          .select('is_correct')
          .eq('session_type', 'quiz')
          
        const quizQuestionsAnswered = allQuizAnswers?.length || 0
        const quizQuestionsCorrect = allQuizAnswers?.filter(a => a.is_correct).length || 0
        const quizAverageAccuracy = quizQuestionsAnswered > 0 ? 
          Math.round((quizQuestionsCorrect / quizQuestionsAnswered) * 100 * 100) / 100 : 0
        
        const totalLearningTimeSeconds = quizLearningTimeSeconds + (userStat.course_learning_time_seconds || 0)
        
        // user_xp_stats_v2 を更新
        const { error: updateError } = await supabaseAdmin
          .from('user_xp_stats_v2')
          .update({
            quiz_learning_time_seconds: quizLearningTimeSeconds,
            total_learning_time_seconds: totalLearningTimeSeconds,
            quiz_sessions_completed: quizSessionsCompleted,
            quiz_questions_answered: quizQuestionsAnswered,
            quiz_questions_correct: quizQuestionsCorrect,
            quiz_average_accuracy: quizAverageAccuracy,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userStat.user_id)
          
        if (updateError) {
          result.errors.push(`${userStat.user_id.substring(0, 8)}: ${updateError.message}`)
        } else {
          result.updatedUsers++
          console.log(`✅ ${userStat.user_id.substring(0, 8)}: クイズ時間 ${quizLearningTimeSeconds}秒`)
        }
        
      } catch (error) {
        result.errors.push(`${userStat.user_id.substring(0, 8)}: ${error}`)
      }
    }
    
  } catch (error) {
    result.errors.push(`全体エラー: ${error}`)
  }
  
  return result
}

/**
 * 3. user_category_xp_stats_v2 の再計算
 */
async function recalculateCategoryStats(): Promise<RecalcReport['categoryStats']> {
  console.log('\n📂 user_category_xp_stats_v2 再計算開始...')
  
  const result: RecalcReport['categoryStats'] = {
    totalRecords: 0,
    updatedRecords: 0,
    errors: []
  }
  
  try {
    // 既存のカテゴリー統計を取得
    const { data: existingStats } = await supabaseAdmin
      .from('user_category_xp_stats_v2')
      .select('user_id, category_id, course_sessions_completed, course_xp, total_xp, quiz_xp')
      
    result.totalRecords = existingStats?.length || 0
    console.log(`📊 既存カテゴリー統計: ${result.totalRecords}件`)
    
    if (!existingStats || existingStats.length === 0) {
      return result
    }
    
    for (const categoryStat of existingStats) {
      try {
        // そのカテゴリーのクイズ回答を集計
        const { data: categoryQuizAnswers } = await supabaseAdmin
          .from('quiz_answers')
          .select('is_correct, time_spent')
          .eq('session_type', 'quiz')
          .eq('user_id', categoryStat.user_id)
          .eq('category_id', categoryStat.category_id)
          
        const quizQuestionsAnswered = categoryQuizAnswers?.length || 0
        const quizQuestionsCorrect = categoryQuizAnswers?.filter(a => a.is_correct).length || 0
        const quizAverageAccuracy = quizQuestionsAnswered > 0 ? 
          Math.round((quizQuestionsCorrect / quizQuestionsAnswered) * 100 * 100) / 100 : 0
        const quizLearningTimeSeconds = categoryQuizAnswers?.reduce((sum, a) => sum + (a.time_spent || 0), 0) || 0
        
        // そのカテゴリーのクイズセッション数を集計
        const { data: categoryQuizSessions } = await supabaseAdmin
          .from('quiz_sessions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', categoryStat.user_id)
          // カテゴリー指定クイズのみを対象にする場合は追加条件が必要
          
        const quizSessionsCompleted = (categoryQuizSessions as unknown as number) || 0
        
        // user_category_xp_stats_v2 を更新
        const { error: updateError } = await supabaseAdmin
          .from('user_category_xp_stats_v2')
          .update({
            quiz_sessions_completed: quizSessionsCompleted,
            quiz_questions_answered: quizQuestionsAnswered,
            quiz_questions_correct: quizQuestionsCorrect,
            quiz_average_accuracy: quizAverageAccuracy,
            quiz_learning_time_seconds: quizLearningTimeSeconds,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', categoryStat.user_id)
          .eq('category_id', categoryStat.category_id)
          
        if (updateError) {
          result.errors.push(`${categoryStat.user_id.substring(0, 8)}/${categoryStat.category_id}: ${updateError.message}`)
        } else {
          result.updatedRecords++
          console.log(`✅ ${categoryStat.user_id.substring(0, 8)}/${categoryStat.category_id}: 問題${quizQuestionsAnswered}件`)
        }
        
      } catch (error) {
        result.errors.push(`${categoryStat.user_id.substring(0, 8)}/${categoryStat.category_id}: ${error}`)
      }
    }
    
  } catch (error) {
    result.errors.push(`全体エラー: ${error}`)
  }
  
  return result
}

/**
 * 4. user_subcategory_xp_stats_v2 の再計算
 */
async function recalculateSubcategoryStats(): Promise<RecalcReport['subcategoryStats']> {
  console.log('\n📝 user_subcategory_xp_stats_v2 再計算開始...')
  
  const result: RecalcReport['subcategoryStats'] = {
    totalRecords: 0,
    updatedRecords: 0,
    errors: []
  }
  
  try {
    // 既存のサブカテゴリー統計を取得
    const { data: existingStats } = await supabaseAdmin
      .from('user_subcategory_xp_stats_v2')
      .select('user_id, category_id, subcategory_id, course_sessions_completed, course_xp, total_xp, quiz_xp')
      
    result.totalRecords = existingStats?.length || 0
    console.log(`📊 既存サブカテゴリー統計: ${result.totalRecords}件`)
    
    if (!existingStats || existingStats.length === 0) {
      return result
    }
    
    for (const subcategoryStat of existingStats) {
      try {
        // そのサブカテゴリーのクイズ回答を集計
        const { data: subcategoryQuizAnswers } = await supabaseAdmin
          .from('quiz_answers')
          .select('is_correct, time_spent')
          .eq('session_type', 'quiz')
          .eq('user_id', subcategoryStat.user_id)
          .eq('category_id', subcategoryStat.category_id)
          .eq('subcategory_id', subcategoryStat.subcategory_id)
          
        const quizQuestionsAnswered = subcategoryQuizAnswers?.length || 0
        const quizQuestionsCorrect = subcategoryQuizAnswers?.filter(a => a.is_correct).length || 0
        const quizAverageAccuracy = quizQuestionsAnswered > 0 ? 
          Math.round((quizQuestionsCorrect / quizQuestionsAnswered) * 100 * 100) / 100 : 0
        const quizLearningTimeSeconds = subcategoryQuizAnswers?.reduce((sum, a) => sum + (a.time_spent || 0), 0) || 0
        
        // user_subcategory_xp_stats_v2 を更新
        const { error: updateError } = await supabaseAdmin
          .from('user_subcategory_xp_stats_v2')
          .update({
            quiz_questions_answered: quizQuestionsAnswered,
            quiz_questions_correct: quizQuestionsCorrect,
            quiz_average_accuracy: quizAverageAccuracy,
            quiz_learning_time_seconds: quizLearningTimeSeconds,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', subcategoryStat.user_id)
          .eq('category_id', subcategoryStat.category_id)
          .eq('subcategory_id', subcategoryStat.subcategory_id)
          
        if (updateError) {
          result.errors.push(`${subcategoryStat.user_id.substring(0, 8)}/${subcategoryStat.category_id}/${subcategoryStat.subcategory_id}: ${updateError.message}`)
        } else {
          result.updatedRecords++
          console.log(`✅ ${subcategoryStat.user_id.substring(0, 8)}/${subcategoryStat.category_id}/${subcategoryStat.subcategory_id}: 問題${quizQuestionsAnswered}件`)
        }
        
      } catch (error) {
        result.errors.push(`${subcategoryStat.user_id.substring(0, 8)}/${subcategoryStat.category_id}/${subcategoryStat.subcategory_id}: ${error}`)
      }
    }
    
  } catch (error) {
    result.errors.push(`全体エラー: ${error}`)
  }
  
  return result
}

/**
 * メイン実行
 */
async function runRecalculation(): Promise<RecalcReport> {
  console.log('🔄 quiz_answersから統計テーブル再計算開始')
  console.log('=' .repeat(60))
  console.log('⚠️ SKPデータは現状維持されます')
  console.log('')
  
  const report: RecalcReport = {
    dailyRecords: { totalDays: 0, updatedDays: 0, errors: [] },
    userStats: { totalUsers: 0, updatedUsers: 0, errors: [] },
    categoryStats: { totalRecords: 0, updatedRecords: 0, errors: [] },
    subcategoryStats: { totalRecords: 0, updatedRecords: 0, errors: [] }
  }
  
  try {
    // Phase 1: daily_xp_records
    report.dailyRecords = await recalculateDailyRecords()
    
    // Phase 2: user_xp_stats_v2
    report.userStats = await recalculateUserStats()
    
    // Phase 3: user_category_xp_stats_v2
    report.categoryStats = await recalculateCategoryStats()
    
    // Phase 4: user_subcategory_xp_stats_v2
    report.subcategoryStats = await recalculateSubcategoryStats()
    
    console.log('\n📋 再計算結果サマリー:')
    console.log(`📅 日別記録: ${report.dailyRecords.updatedDays}/${report.dailyRecords.totalDays}件`)
    console.log(`👤 ユーザー統計: ${report.userStats.updatedUsers}/${report.userStats.totalUsers}件`)
    console.log(`📂 カテゴリー統計: ${report.categoryStats.updatedRecords}/${report.categoryStats.totalRecords}件`)
    console.log(`📝 サブカテゴリー統計: ${report.subcategoryStats.updatedRecords}/${report.subcategoryStats.totalRecords}件`)
    
    const allErrors = [
      ...report.dailyRecords.errors,
      ...report.userStats.errors,
      ...report.categoryStats.errors,
      ...report.subcategoryStats.errors
    ]
    
    if (allErrors.length > 0) {
      console.log('\n⚠️ エラー詳細:')
      allErrors.forEach((err, index) => console.log(`${index + 1}. ${err}`))
    }
    
  } catch (error) {
    console.error('❌ 再計算処理中にエラーが発生:', error)
    throw error
  }
  
  return report
}

// スクリプト実行
if (require.main === module) {
  runRecalculation()
    .then(report => {
      console.log('\n✅ 統計再計算完了')
      console.log('\n📄 完全なレポート:')
      console.log(JSON.stringify(report, null, 2))
    })
    .catch(error => {
      console.error('❌ 再計算実行エラー:', error)
      process.exit(1)
    })
}