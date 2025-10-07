/**
 * XP統計正しいデータ修正スクリプト（最終版）
 * 
 * 修正対象:
 * 1. quiz_xpのボーナス混入問題（正解のearned_xpのみ集計）
 * 2. コース学習データ復旧（session_type='course_confirmation'から復元）
 * 3. フィールド定義をAPIロジックに完全準拠
 * 
 * APIロジック準拠:
 * - quiz_xp: session_type='quiz'の正解earned_xpの合計
 * - course_xp: session_type='course_confirmation'の正解earned_xpの合計
 * - quiz_questions_answered/correct: 両方含む（APIロジック通り）
 * - 格言・ナレッジカード数は保持
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve('.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface QuizAnswerData {
  quiz_session_id: string | null
  question_id: string
  is_correct: boolean
  earned_xp: number
  category_id: string
  subcategory_id: string | null
  session_type: string
  course_session_id?: string | null
  user_id: string
  created_at: string
}

async function fixXPStatisticsCorrectFinal() {
  console.log('🔧 XP統計正しいデータ修正スクリプト開始（最終版）')
  
  try {
    // 1. 全ユーザーの統計データ取得
    const { data: allUsers, error: usersError } = await supabase
      .from('user_xp_stats_v2')
      .select('user_id, quiz_xp, course_xp, bonus_xp, total_xp, wisdom_cards_total, knowledge_cards_total, badges_total')
    
    if (usersError) {
      throw new Error(`Users fetch error: ${usersError.message}`)
    }
    
    console.log(`📊 対象ユーザー数: ${allUsers.length}`)
    
    let fixedUsersCount = 0
    let fixedCategoryStats = 0
    let fixedSubcategoryStats = 0
    
    // 2. ユーザーごとに正しい統計を再構築
    for (const user of allUsers) {
      console.log(`\n👤 ユーザー ${user.user_id.substring(0, 8)}... 処理中`)
      
      // 2-1. quiz_answersから実際のデータを集計（session_type別の正確な分離）
      const { data: allAnswers, error: answersError } = await supabase
        .from('quiz_answers')
        .select(`
          quiz_session_id,
          question_id,
          is_correct,
          earned_xp,
          category_id,
          subcategory_id,
          session_type,
          course_session_id,
          user_id,
          created_at
        `)
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: true })
      
      if (answersError) {
        console.error(`❌ ${user.user_id}: quiz_answers取得エラー:`, answersError)
        continue
      }
      
      if (!allAnswers || allAnswers.length === 0) {
        console.log(`ℹ️ ${user.user_id}: quiz_answers データなし`)
        continue
      }
      
      const answers = allAnswers as unknown as QuizAnswerData[]
      
      // 2-2. session_typeで正確に分離集計（APIロジック準拠）
      const quizAnswers = answers.filter(a => a.session_type === 'quiz')
      const courseConfirmationAnswers = answers.filter(a => a.session_type === 'course_confirmation')
      
      console.log(`📊 データ分離結果（APIロジック準拠）:`, {
        totalAnswers: answers.length,
        quizAnswers: quizAnswers.length,
        courseConfirmationAnswers: courseConfirmationAnswers.length,
        otherTypes: answers.filter(a => !['quiz', 'course_confirmation'].includes(a.session_type)).length
      })
      
      // 2-3. 正しいXP計算（APIロジック完全準拠）
      const correctQuizXP = quizAnswers
        .filter(a => a.is_correct)
        .reduce((sum, a) => sum + (a.earned_xp || 0), 0)
      
      const correctCourseXP = courseConfirmationAnswers
        .filter(a => a.is_correct)
        .reduce((sum, a) => sum + (a.earned_xp || 0), 0)
      
      // 既存の値を保持（格言・ナレッジカード等）
      const currentBonusXP = user.bonus_xp || 0
      const currentWisdomCards = user.wisdom_cards_total || 0
      const currentKnowledgeCards = user.knowledge_cards_total || 0
      const currentBadges = user.badges_total || 0
      const correctTotalXP = correctQuizXP + correctCourseXP + currentBonusXP
      
      // APIロジック準拠：quiz_questions_answered/correctは両方含む
      const totalQuestionsAnswered = quizAnswers.length + courseConfirmationAnswers.length
      const totalQuestionsCorrect = quizAnswers.filter(a => a.is_correct).length + courseConfirmationAnswers.filter(a => a.is_correct).length
      
      console.log(`📊 正しい集計結果（APIロジック準拠）:`, {
        correctQuizXP,
        correctCourseXP,
        currentBonusXP,
        correctTotalXP,
        currentTotalXP: user.total_xp,
        totalQuestionsAnswered,
        totalQuestionsCorrect,
        保持する値: {
          wisdomCards: currentWisdomCards,
          knowledgeCards: currentKnowledgeCards,
          badges: currentBadges
        }
      })
      
      // 2-4. user_xp_stats_v2の正しい値で更新（APIロジック準拠）
      const { error: userUpdateError } = await supabase
        .from('user_xp_stats_v2')
        .update({
          quiz_xp: correctQuizXP,
          course_xp: correctCourseXP,
          total_xp: correctTotalXP,
          // APIロジック準拠：quiz_questions_*は両方含む
          quiz_questions_answered: totalQuestionsAnswered,
          quiz_questions_correct: totalQuestionsCorrect,
          quiz_average_accuracy: totalQuestionsAnswered > 0 ? 
            Math.round((totalQuestionsCorrect / totalQuestionsAnswered) * 100 * 100) / 100 : 0,
          // 既存の重要な値は保持
          wisdom_cards_total: currentWisdomCards,
          knowledge_cards_total: currentKnowledgeCards,
          badges_total: currentBadges,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.user_id)
      
      if (userUpdateError) {
        console.error(`❌ ${user.user_id}: user_xp_stats_v2更新エラー:`, userUpdateError)
        continue
      }
      
      console.log(`✅ ${user.user_id}: 全体統計修正完了`)
      fixedUsersCount++
      
      // 2-5. カテゴリー別統計の正しい再構築（APIロジック準拠）
      const categoryStats = new Map<string, {
        quizTotalQuestions: number
        quizCorrectAnswers: number
        quizEarnedXP: number
        courseTotalQuestions: number
        courseCorrectAnswers: number
        courseEarnedXP: number
        quizSessionIds: Set<string>
        courseSessionIds: Set<string>
      }>()
      
      // クイズ・コース分離集計（APIロジック準拠）
      const allAnswersForCategory = [...quizAnswers, ...courseConfirmationAnswers]
      allAnswersForCategory.forEach(answer => {
        const key = answer.category_id
        if (!categoryStats.has(key)) {
          categoryStats.set(key, { 
            quizTotalQuestions: 0, 
            quizCorrectAnswers: 0,
            quizEarnedXP: 0,
            courseTotalQuestions: 0,
            courseCorrectAnswers: 0,
            courseEarnedXP: 0,
            quizSessionIds: new Set(),
            courseSessionIds: new Set()
          })
        }
        const stats = categoryStats.get(key)!
        
        if (answer.session_type === 'quiz') {
          stats.quizTotalQuestions += 1
          if (answer.quiz_session_id) {
            stats.quizSessionIds.add(answer.quiz_session_id)
          }
          if (answer.is_correct) {
            stats.quizCorrectAnswers += 1
            stats.quizEarnedXP += (answer.earned_xp || 0)
          }
        } else if (answer.session_type === 'course_confirmation') {
          stats.courseTotalQuestions += 1
          if (answer.course_session_id) {
            stats.courseSessionIds.add(answer.course_session_id)
          }
          if (answer.is_correct) {
            stats.courseCorrectAnswers += 1
            stats.courseEarnedXP += (answer.earned_xp || 0)
          }
        }
      })
      
      // カテゴリー統計を正しく更新（APIロジック準拠）
      for (const [categoryId, stats] of categoryStats.entries()) {
        const totalXP = stats.quizEarnedXP + stats.courseEarnedXP
        // APIロジック準拠：quiz_questions_*は両方含む
        const totalQuestions = stats.quizTotalQuestions + stats.courseTotalQuestions
        const totalCorrect = stats.quizCorrectAnswers + stats.courseCorrectAnswers
        
        const accuracy = totalQuestions > 0 ? 
          Math.round((totalCorrect / totalQuestions) * 100 * 100) / 100 : 0
        
        const { error: categoryError } = await supabase
          .from('user_category_xp_stats_v2')
          .upsert({
            user_id: user.user_id,
            category_id: categoryId,
            quiz_xp: stats.quizEarnedXP,
            course_xp: stats.courseEarnedXP,
            total_xp: totalXP,
            current_level: Math.floor(totalXP / 500) + 1,
            quiz_sessions_completed: stats.quizSessionIds.size,
            course_sessions_completed: stats.courseSessionIds.size,
            // APIロジック準拠：quiz_questions_*は両方含む
            quiz_questions_answered: totalQuestions,
            quiz_questions_correct: totalCorrect,
            quiz_average_accuracy: accuracy,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,category_id' })
        
        if (categoryError) {
          console.error(`❌ ${user.user_id} カテゴリー ${categoryId} 統計エラー:`, categoryError)
        } else {
          fixedCategoryStats++
          console.log(`✅ ${user.user_id}: カテゴリー ${categoryId} 統計修正 (Q:${stats.quizTotalQuestions}, C:${stats.courseTotalQuestions}, QXP:${stats.quizEarnedXP}, CXP:${stats.courseEarnedXP})`)
        }
      }
      
      // 2-6. サブカテゴリー別統計の正しい再構築（APIロジック準拠）
      const subcategoryStats = new Map<string, {
        quizTotalQuestions: number
        quizCorrectAnswers: number
        quizEarnedXP: number
        courseTotalQuestions: number
        courseCorrectAnswers: number
        courseEarnedXP: number
        quizSessionIds: Set<string>
        courseSessionIds: Set<string>
      }>()
      
      const allAnswersForSubcategory = [...quizAnswers, ...courseConfirmationAnswers]
      allAnswersForSubcategory.forEach(answer => {
        const key = `${answer.category_id}__${answer.subcategory_id || 'general'}`
        if (!subcategoryStats.has(key)) {
          subcategoryStats.set(key, { 
            quizTotalQuestions: 0, 
            quizCorrectAnswers: 0,
            quizEarnedXP: 0,
            courseTotalQuestions: 0,
            courseCorrectAnswers: 0,
            courseEarnedXP: 0,
            quizSessionIds: new Set(),
            courseSessionIds: new Set()
          })
        }
        const stats = subcategoryStats.get(key)!
        
        if (answer.session_type === 'quiz') {
          stats.quizTotalQuestions += 1
          if (answer.quiz_session_id) {
            stats.quizSessionIds.add(answer.quiz_session_id)
          }
          if (answer.is_correct) {
            stats.quizCorrectAnswers += 1
            stats.quizEarnedXP += (answer.earned_xp || 0)
          }
        } else if (answer.session_type === 'course_confirmation') {
          stats.courseTotalQuestions += 1
          if (answer.course_session_id) {
            stats.courseSessionIds.add(answer.course_session_id)
          }
          if (answer.is_correct) {
            stats.courseCorrectAnswers += 1
            stats.courseEarnedXP += (answer.earned_xp || 0)
          }
        }
      })
      
      // サブカテゴリー統計を正しく更新（APIロジック準拠）
      for (const [key, stats] of subcategoryStats.entries()) {
        const [categoryId, subcategoryId] = key.split('__')
        const totalXP = stats.quizEarnedXP + stats.courseEarnedXP
        // APIロジック準拠：quiz_questions_*は両方含む
        const totalQuestions = stats.quizTotalQuestions + stats.courseTotalQuestions
        const totalCorrect = stats.quizCorrectAnswers + stats.courseCorrectAnswers
        
        const accuracy = totalQuestions > 0 ? 
          Math.round((totalCorrect / totalQuestions) * 100 * 100) / 100 : 0
        
        const { error: subcategoryError } = await supabase
          .from('user_subcategory_xp_stats_v2')
          .upsert({
            user_id: user.user_id,
            category_id: categoryId,
            subcategory_id: subcategoryId,
            quiz_xp: stats.quizEarnedXP,
            course_xp: stats.courseEarnedXP,
            total_xp: totalXP,
            current_level: Math.floor(totalXP / 500) + 1,
            quiz_sessions_completed: stats.quizSessionIds.size,
            course_sessions_completed: stats.courseSessionIds.size,
            // APIロジック準拠：quiz_questions_*は両方含む
            quiz_questions_answered: totalQuestions,
            quiz_questions_correct: totalCorrect,
            quiz_average_accuracy: accuracy,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,category_id,subcategory_id' })
        
        if (subcategoryError) {
          console.error(`❌ ${user.user_id} サブカテゴリー ${categoryId}/${subcategoryId} 統計エラー:`, subcategoryError)
        } else {
          fixedSubcategoryStats++
          console.log(`✅ ${user.user_id}: サブカテゴリー ${categoryId}/${subcategoryId} 統計修正`)
        }
      }
    }
    
    console.log('\n✅ XP統計正しいデータ修正スクリプト完了（最終版）')
    console.log('📊 修正結果:')
    console.log(`  - 修正ユーザー数: ${fixedUsersCount}`)
    console.log(`  - 修正カテゴリー統計: ${fixedCategoryStats}`)
    console.log(`  - 修正サブカテゴリー統計: ${fixedSubcategoryStats}`)
    console.log('\n🔍 修正内容:')
    console.log('  - quiz_xp: session_type="quiz"の正解earned_xpのみ（ボーナス除外）')
    console.log('  - course_xp: session_type="course_confirmation"の正解earned_xpのみ')
    console.log('  - quiz_questions_*: 両方含む（APIロジック準拠）')
    console.log('  - 格言・ナレッジカード・バッジ数は保持')
    console.log('  - コース学習データ完全復旧')
    
  } catch (error) {
    console.error('❌ XP統計正しいデータ修正エラー:', error)
    process.exit(1)
  }
}

// スクリプト実行
fixXPStatisticsCorrectFinal()
  .then(() => {
    console.log('🎉 正しいデータ修正スクリプト完了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 正しいデータ修正スクリプト失敗:', error)
    process.exit(1)
  })

export { fixXPStatisticsCorrectFinal }