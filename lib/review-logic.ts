/**
 * 復習クイズ選定システム - REVIEW_NEEDEDフラグベース
 * 
 * ⚠️ 重要: このファイルは実際の復習クイズ選定を担当
 * reviewReason分類はAI最適化機能専用で、ここでは使用しない
 * 実際の復習条件: 不正解・ヒント使用・低自信・時間超過・繰り返しミス
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { Question } from '@/lib/types'

// 復習対象問題の優先度
// ⚠️ reasonフィールドはAI最適化分類専用 - 実際の選定には使用しない
interface ReviewQuestion extends Question {
  priority: 1 | 2 | 3  // 1: 最高優先度、3: 低優先度
  reason: 'forgetting_curve' | 'weak_category' | 'repeat_mistakes' // AI最適化分類専用
  lastAttemptDate?: string
  incorrectStreak?: number
  categoryAccuracy?: number
}

// 忘却曲線計算パラメータ
interface MemoryStrengthParams {
  lastCorrectDate: Date
  daysSinceLastReview: number
  correctStreak: number
  categoryDifficulty: string
}

/**
 * エビングハウス忘却曲線ベースの記憶強度計算
 */
function calculateMemoryStrength(params: MemoryStrengthParams): boolean {
  const { daysSinceLastReview, correctStreak, categoryDifficulty } = params
  
  // 難易度別基本忘却率
  const difficultyMultiplier: Record<string, number> = {
    'basic': 0.4,        // 基礎は忘れにくい
    'intermediate': 0.5,  // 標準
    'advanced': 0.6,     // 上級は忘れやすい
    'expert': 0.7        // エキスパートは最も忘れやすい
  }
  
  const baseForgettingRate = (difficultyMultiplier[categoryDifficulty] || 0.5) 
    * Math.pow(0.7, correctStreak) // 正解連続で記憶定着
  
  const memoryStrength = Math.exp(-daysSinceLastReview * baseForgettingRate)
  
  return memoryStrength < 0.3 // 30%以下で復習推奨
}

/**
 * 忘却曲線ベースの復習対象問題取得
 */
export async function getForgettingQuestions(userId: string, limit: number = 50): Promise<ReviewQuestion[]> {
  try {
    console.log(`🧠 Analyzing forgetting curve for user: ${userId}`)

    // 正解問題データベースレスポンス型定義
    interface CorrectAnswerData {
      question_id: string
      created_at: string | null
      difficulty: string
      quiz_questions: {
        id: number
        question: string
        option1: string
        option2: string
        option3: string
        option4: string
        correct_answer: number
        category_id: string
        subcategory_id: string | null
        difficulty: string | null
        time_limit: number | null
        explanation: string | null
        source: string | null
      }
    }

    // 過去の正解問題を取得（最新100問）
    const { data: correctAnswers, error } = await supabaseAdmin
      .from('quiz_answers')
      .select(`
        question_id,
        created_at,
        difficulty
      `)
      .eq('user_id', userId)
      .eq('is_correct', true)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('❌ Error fetching correct answers:', error)
      return []
    }

    const forgettingQuestions: ReviewQuestion[] = []
    const now = new Date()

    for (const answer of (correctAnswers as unknown as CorrectAnswerData[]) || []) {
      if (!answer.created_at) continue
      const lastCorrectDate = new Date(answer.created_at)
      const daysSinceReview = Math.floor((now.getTime() - lastCorrectDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // 最低3日以上経過した問題のみ対象
      if (daysSinceReview < 3) continue

      // 正解連続回数を取得
      const correctStreak = await getCorrectStreak(userId, answer.question_id)
      
      // 記憶強度計算
      const shouldReview = calculateMemoryStrength({
        lastCorrectDate,
        daysSinceLastReview: daysSinceReview,
        correctStreak,
        categoryDifficulty: answer.difficulty
      })

      if (shouldReview) {
        // 問題詳細を別途取得
        const { data: questionData, error: questionError } = await supabaseAdmin
          .from('quiz_questions')
          .select('id, question, option1, option2, option3, option4, correct_answer, category_id, subcategory_id, difficulty, time_limit, explanation, source')
          .eq('id', parseInt(answer.question_id))
          .single()

        if (questionError || !questionData) {
          console.warn(`⚠️ Failed to fetch question ${answer.question_id}:`, questionError)
          continue
        }

        forgettingQuestions.push({
          id: questionData.id,
          question: questionData.question || '',
          options: [questionData.option1, questionData.option2, questionData.option3, questionData.option4].filter(Boolean),
          correct: questionData.correct_answer || 0,
          category: questionData.category_id || '',
          subcategory: questionData.subcategory_id || '',
          subcategory_id: questionData.subcategory_id || undefined,
          difficulty: questionData.difficulty || 'intermediate',
          timeLimit: questionData.time_limit || 60,
          explanation: questionData.explanation || '',
          source: questionData.source || '',
          relatedTopics: [],
          priority: 1,
          reason: 'forgetting_curve',
          lastAttemptDate: answer.created_at
        })
      }
    }

    console.log(`✅ Found ${forgettingQuestions.length} forgetting questions`)
    return forgettingQuestions.slice(0, limit)

  } catch (error) {
    console.error('❌ Error in getForgettingQuestions:', error)
    return []
  }
}

/**
 * カテゴリー別苦手分野の復習対象問題取得
 */
export async function getWeakCategoryQuestions(userId: string, limit: number = 30): Promise<ReviewQuestion[]> {
  try {
    console.log(`📊 Analyzing weak categories for user: ${userId}`)

    // 直近50問での正解率分析
    const { data: recentAnswers, error } = await supabaseAdmin
      .from('quiz_answers')
      .select('subcategory_id, is_correct, created_at, question_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('❌ Error fetching recent answers:', error)
      return []
    }

    // サブカテゴリー別集計
    const categoryStats: Record<string, { correct: number; total: number; questionIds: string[] }> = {}
    
    for (const answer of recentAnswers || []) {
      const subcat = answer.subcategory_id || 'category_level'
      if (!categoryStats[subcat]) {
        categoryStats[subcat] = { correct: 0, total: 0, questionIds: [] }
      }
      categoryStats[subcat].total++
      categoryStats[subcat].questionIds.push(answer.question_id)
      if (answer.is_correct) {
        categoryStats[subcat].correct++
      }
    }

    // 正解率60%未満かつ5問以上で苦手判定
    const weakSubcategories = Object.entries(categoryStats)
      .filter(([_, stats]) => {
        const accuracy = stats.correct / stats.total
        return accuracy < 0.6 && stats.total >= 5
      })
      .map(([subcategory, stats]) => ({
        subcategory,
        accuracy: stats.correct / stats.total,
        questionIds: stats.questionIds
      }))

    console.log(`🎯 Found ${weakSubcategories.length} weak subcategories:`, 
      weakSubcategories.map(w => `${w.subcategory}: ${Math.round(w.accuracy * 100)}%`))

    // 苦手サブカテゴリーから問題を選択
    const weakQuestions: ReviewQuestion[] = []
    
    for (const weak of weakSubcategories) {
      // 該当サブカテゴリーの問題をランダムに取得
      const { data: questions, error: questionsError } = await supabaseAdmin
        .from('quiz_questions')
        .select('*')
        .eq('subcategory_id', weak.subcategory)
        .eq('is_deleted', false)
        .limit(10)

      if (questionsError) {
        console.error(`❌ Error fetching questions for ${weak.subcategory}:`, questionsError)
        continue
      }

      for (const question of questions || []) {
        // quiz_questions型からQuestion型に変換
        const reviewQuestion: ReviewQuestion = {
          id: question.id,
          question: question.question || '',
          options: [question.option1 || '', question.option2 || '', question.option3 || '', question.option4 || ''].filter(Boolean),
          correct: question.correct_answer || 0,
          category: question.category_id || '',
          subcategory: question.subcategory_id || '',
          difficulty: question.difficulty || 'intermediate',
          timeLimit: question.time_limit || 60,
          explanation: question.explanation || '',
          source: question.source || '',
          relatedTopics: [],
          priority: 2,
          reason: 'weak_category',
          categoryAccuracy: weak.accuracy
        }
        weakQuestions.push(reviewQuestion)
      }
    }

    console.log(`✅ Found ${weakQuestions.length} weak category questions`)
    return weakQuestions.slice(0, limit)

  } catch (error) {
    console.error('❌ Error in getWeakCategoryQuestions:', error)
    return []
  }
}

/**
 * 繰り返しミス問題の復習対象問題取得
 */
export async function getRepeatMistakeQuestions(userId: string, limit: number = 20): Promise<ReviewQuestion[]> {
  try {
    console.log(`🔄 Analyzing repeat mistakes for user: ${userId}`)

    // 直近の不正解問題を取得
    const { data: incorrectAnswers, error } = await supabaseAdmin
      .from('quiz_answers')
      .select(`
        question_id,
        subcategory_id,
        difficulty,
        created_at
      `)
      .eq('user_id', userId)
      .eq('is_correct', false)
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) {
      console.error('❌ Error fetching incorrect answers:', error)
      return []
    }

    const repeatMistakeQuestions: ReviewQuestion[] = []

    // データベースレスポンス型定義
    interface IncorrectAnswerData {
      question_id: string
      created_at: string | null
      subcategory_id: string
      difficulty: string
      quiz_questions: {
        id: number
        question: string
        option1: string
        option2: string
        option3: string
        option4: string
        correct_answer: number
        category_id: string
        subcategory_id: string | null
        difficulty: string | null
        time_limit: number | null
        explanation: string | null
        source: string | null
      }
    }

    // サブカテゴリー・難易度別にグループ化
    const groupedMistakes: Record<string, IncorrectAnswerData[]> = {}
    
    for (const answer of (incorrectAnswers as unknown as IncorrectAnswerData[]) || []) {
      if (!answer.created_at) continue // null created_at をスキップ
      const key = `${answer.subcategory_id}_${answer.difficulty}`
      if (!groupedMistakes[key]) {
        groupedMistakes[key] = []
      }
      groupedMistakes[key].push(answer)
    }

    // 同一グループで2回以上ミスがある場合は繰り返しミス判定
    for (const [key, mistakes] of Object.entries(groupedMistakes)) {
      if (mistakes.length >= 2) {
        console.log(`🎯 Repeat mistakes detected for ${key}: ${mistakes.length} times`)
        
        for (const mistake of mistakes.slice(0, 3)) { // 最大3問まで
          if (!mistake.created_at) continue
          
          // 問題詳細を別途取得
          const { data: questionData, error: questionError } = await supabaseAdmin
            .from('quiz_questions')
            .select('id, question, option1, option2, option3, option4, correct_answer, category_id, subcategory_id, difficulty, time_limit, explanation, source')
            .eq('id', parseInt(mistake.question_id))
            .single()

          if (questionError || !questionData) {
            console.warn(`⚠️ Failed to fetch question ${mistake.question_id}:`, questionError)
            continue
          }

          repeatMistakeQuestions.push({
            id: questionData.id,
            question: questionData.question || '',
            options: [questionData.option1, questionData.option2, questionData.option3, questionData.option4].filter(Boolean),
            correct: questionData.correct_answer || 0,
            category: questionData.category_id || '',
            subcategory: questionData.subcategory_id || '',
            subcategory_id: questionData.subcategory_id || undefined,
            difficulty: questionData.difficulty || 'intermediate',
            timeLimit: questionData.time_limit || 60,
            explanation: questionData.explanation || '',
            source: questionData.source || '',
            relatedTopics: [],
            priority: 3,
            reason: 'repeat_mistakes',
            incorrectStreak: mistakes.length,
            lastAttemptDate: mistake.created_at
          })
        }
      }
    }

    console.log(`✅ Found ${repeatMistakeQuestions.length} repeat mistake questions`)
    return repeatMistakeQuestions.slice(0, limit)

  } catch (error) {
    console.error('❌ Error in getRepeatMistakeQuestions:', error)
    return []
  }
}

/**
 * ユーザーの復習対象問題を選定（REVIEW_NEEDEDフラグベース - 要件準拠版）
 */
export async function selectReviewQuestions(
  userId: string, 
  requestedCount: number = 10
): Promise<Question[]> {
  try {
    console.log(`🎯 Selecting REVIEW_NEEDED flagged questions for user ${userId}, count: ${requestedCount}`)

    // REVIEW_NEEDED=true かつ未復習（reviewed_at=null）の問題のみ取得
    const { data: reviewNeededAnswers, error } = await supabaseAdmin
      .from('quiz_answers')
      .select(`
        question_id,
        created_at,
        difficulty,
        subcategory_id,
        category_id,
        confidence_level,
        max_hint_level,
        time_spent
      `)
      .eq('user_id', userId)
      .eq('review_needed', true)        // REVIEW_NEEDEDフラグ = true
      .is('reviewed_at', null)          // 未復習
      .order('created_at', { ascending: false })
      .limit(requestedCount * 2) // 余裕をもって取得（問題詳細が取得できない場合に備えて）

    if (error) {
      console.error('❌ Error fetching REVIEW_NEEDED questions:', error)
      return []
    }

    if (!reviewNeededAnswers || reviewNeededAnswers.length === 0) {
      console.log('ℹ️ No REVIEW_NEEDED questions found')
      return []
    }

    // 3日以上経過チェック
    const now = Date.now()
    const eligibleAnswers = reviewNeededAnswers.filter(answer => {
      if (!answer.created_at) return false
      const daysSinceCreated = Math.floor(
        (now - new Date(answer.created_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      return daysSinceCreated >= 3 // 各問題の出題から3日以上経過
    })

    console.log(`📅 Filtered by 3+ days: ${eligibleAnswers.length} / ${reviewNeededAnswers.length} questions`)

    if (eligibleAnswers.length === 0) {
      console.log('ℹ️ No questions have passed the 3-day threshold')
      return []
    }

    const reviewQuestions: Question[] = []

    // 問題詳細を取得
    for (const answer of eligibleAnswers.slice(0, requestedCount)) {
      const { data: questionData, error: questionError } = await supabaseAdmin
        .from('quiz_questions')
        .select('id, question, option1, option2, option3, option4, correct_answer, category_id, subcategory_id, difficulty, time_limit, explanation, source')
        .eq('id', parseInt(answer.question_id))
        .eq('is_deleted', false)
        .single()

      if (questionError || !questionData) {
        console.warn(`⚠️ Failed to fetch question ${answer.question_id}:`, questionError)
        continue
      }

      reviewQuestions.push({
        id: questionData.id,
        question: questionData.question || '',
        options: [questionData.option1, questionData.option2, questionData.option3, questionData.option4].filter(Boolean),
        correct: questionData.correct_answer || 0,
        category: questionData.category_id || '',
        subcategory: questionData.subcategory_id || '',
        subcategory_id: questionData.subcategory_id || undefined,
        difficulty: questionData.difficulty || 'intermediate',
        timeLimit: questionData.time_limit || 60,
        explanation: questionData.explanation || '',
        source: questionData.source || '',
        relatedTopics: []
      })
    }

    console.log(`✅ Selected ${reviewQuestions.length} REVIEW_NEEDED questions`)

    return reviewQuestions

  } catch (error) {
    console.error('❌ Error in selectReviewQuestions:', error)
    return []
  }
}

/**
 * ユーザーの復習対象問題数を取得
 */
export async function getTotalReviewQuestionsCount(userId: string): Promise<number> {
  try {
    const reviewQuestions = await selectReviewQuestions(userId, 100) // 最大100問で計算
    return reviewQuestions.length
  } catch (error) {
    console.error('❌ Error getting review questions count:', error)
    return 0
  }
}

/**
 * 指定問題の正解連続回数を取得
 */
async function getCorrectStreak(userId: string, questionId: string): Promise<number> {
  try {
    const { data: answers, error } = await supabaseAdmin
      .from('quiz_answers')
      .select('is_correct, created_at')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error || !answers) {
      return 0
    }

    let streak = 0
    for (const answer of answers) {
      if (answer.is_correct) {
        streak++
      } else {
        break
      }
    }

    return streak

  } catch (error) {
    console.error('❌ Error getting correct streak:', error)
    return 0
  }
}

/**
 * 復習判定：問題回答時に復習が必要かどうかを判定
 * ヒント使用と自信レベルに対応
 */
export async function determineReviewNeed(
  userId: string,
  questionId: string,
  isCorrect: boolean,
  responseTime: number,
  difficulty: string,
  timeLimit: number,
  maxHintLevel?: number,      // 使用した最大ヒントレベル (0-3)
  confidenceLevel?: number    // 自信レベル (1-5)
): Promise<boolean> {
  try {
    console.log(`🔍 Review need analysis for question ${questionId}:`, {
      isCorrect,
      responseTime,
      timeLimit,
      maxHintLevel,
      confidenceLevel,
      userId: userId.substring(0, 8) + '...'
    })

    // 条件1: 即座に復習推奨（不正解）
    if (!isCorrect) {
      console.log('📌 Review needed: Incorrect answer')
      return true
    }
    
    // 条件2: ヒントLv2以上使用で復習推奨
    if (maxHintLevel && maxHintLevel >= 2) {
      console.log(`📌 Review needed: High hint level used (${maxHintLevel})`)
      return true
    }
    
    // 条件3: 自信レベル1-2で復習推奨
    if (confidenceLevel && confidenceLevel <= 2) {
      console.log(`📌 Review needed: Low confidence level (${confidenceLevel})`)
      return true
    }
    
    // 条件4: 制限時間の80%以上使用で復習推奨
    if (responseTime > (timeLimit * 0.8)) {
      console.log(`📌 Review needed: Long response time (${responseTime}s > ${timeLimit * 0.8}s)`)
      return true
    }
    
    // 条件5: 繰り返しミス判定
    const hasRepeatMistakes = await checkRepeatMistakes(userId, questionId, difficulty)
    if (hasRepeatMistakes) {
      console.log('📌 Review needed: Repeat mistakes detected')
      return true
    }
    
    console.log('✅ No review needed for this question')
    return false

  } catch (error) {
    console.error('❌ Error in determineReviewNeed:', error)
    return false
  }
}

/**
 * 繰り返しミス判定
 */
async function checkRepeatMistakes(
  userId: string,
  questionId: string,
  difficulty: string
): Promise<boolean> {
  try {
    const questionIdNum = parseInt(questionId)
    if (isNaN(questionIdNum)) return false
    
    // 問題のサブカテゴリーを取得
    const { data: question, error: questionError } = await supabaseAdmin
      .from('quiz_questions')
      .select('subcategory_id')
      .eq('id', questionIdNum)
      .single()

    if (questionError || !question) {
      return false
    }

    // 同一サブカテゴリー・難易度での直近5問を分析
    const { data: recentAnswers, error } = await supabaseAdmin
      .from('quiz_answers')
      .select('is_correct, created_at')
      .eq('user_id', userId)
      .eq('subcategory_id', question.subcategory_id || 'category_level')
      .eq('difficulty', difficulty)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error || !recentAnswers || recentAnswers.length < 3) {
      return false
    }

    // 直近3問中2問以上不正解で繰り返しミス判定
    const recent3 = recentAnswers.slice(0, 3)
    const incorrectCount = recent3.filter(a => !a.is_correct).length
    
    return incorrectCount >= 2

  } catch (error) {
    console.error('❌ Error in checkRepeatMistakes:', error)
    return false
  }
}