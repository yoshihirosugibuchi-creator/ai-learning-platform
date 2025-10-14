import { Question } from './types'
import { QuizPersonalizationSettings } from './user-quiz-settings'

/**
 * セルフパーソナライズクイズ用の問題フィルタリング
 */
export function filterQuestionsForPersonalizedQuiz(
  questions: Question[],
  settings: QuizPersonalizationSettings
): Question[] {
  console.log('🔍 Filtering questions for personalized quiz:', {
    totalQuestions: questions.length,
    settings: {
      learningLevel: settings.learningLevel,
      basicCategories: settings.basicCategories.length,
      industryCategories: settings.industryCategories.length
    }
  })

  // Step 1: 学習レベル以上の問題でフィルタリング
  const levelOrder = ['basic', 'intermediate', 'advanced', 'expert']
  const minLevelIndex = levelOrder.indexOf(settings.learningLevel)
  
  let filteredQuestions = questions.filter(question => {
    if (!question.difficulty || question.difficulty === 'mixed') return true
    const questionLevelIndex = levelOrder.indexOf(question.difficulty as string)
    return questionLevelIndex >= minLevelIndex
  })
  
  console.log('✅ After difficulty filtering:', {
    remaining: filteredQuestions.length,
    minLevel: settings.learningLevel
  })

  // Step 2: カテゴリーでフィルタリング
  const selectedCategories = [...settings.basicCategories, ...settings.industryCategories]
  
  if (selectedCategories.length > 0) {
    filteredQuestions = filteredQuestions.filter(question => {
      // カテゴリーが選択されたものに含まれるかをチェック
      return selectedCategories.includes(question.category as string)
    })
    
    console.log('✅ After category filtering:', {
      remaining: filteredQuestions.length,
      selectedCategories: selectedCategories.length
    })
  }

  // Step 3: 問題が少なすぎる場合の対処
  if (filteredQuestions.length < 10) {
    console.warn('⚠️ Too few questions after filtering, falling back to basic categories only')
    
    // 基本カテゴリーのみでフィルタリングし直し
    filteredQuestions = questions.filter(question => {
      const matchesLevel = !question.difficulty || 
                          question.difficulty === 'mixed' ||
                          levelOrder.indexOf(question.difficulty as string) >= minLevelIndex
      
      const matchesBasicCategory = settings.basicCategories.length === 0 || 
                                  settings.basicCategories.includes(question.category as string)
      
      return matchesLevel && matchesBasicCategory
    })
    
    console.log('✅ Fallback filtering result:', filteredQuestions.length)
  }

  // Step 4: 最低限の問題数を保証
  if (filteredQuestions.length < 5) {
    console.warn('⚠️ Still too few questions, using all questions as fallback')
    filteredQuestions = questions
  }

  console.log('🎯 Final filtering result:', {
    original: questions.length,
    filtered: filteredQuestions.length,
    success: filteredQuestions.length >= 10
  })

  return filteredQuestions
}

/**
 * 問題の難易度配分を調整
 * ユーザーの正答率に基づいて適切な難易度バランスを提供
 */
export function adjustDifficultyDistribution(
  questions: Question[],
  userAccuracy: number,
  targetCount: number = 10
): Question[] {
  const levelOrder = ['basic', 'intermediate', 'advanced', 'expert']
  
  // 正答率に基づく難易度配分
  let difficultyRatio: Record<string, number>
  
  if (userAccuracy >= 90) {
    // 正答率90%以上：上級・エキスパート中心
    difficultyRatio = { basic: 0.1, intermediate: 0.3, advanced: 0.4, expert: 0.2 }
  } else if (userAccuracy >= 75) {
    // 正答率75-89%：中級・上級中心
    difficultyRatio = { basic: 0.2, intermediate: 0.4, advanced: 0.3, expert: 0.1 }
  } else if (userAccuracy >= 60) {
    // 正答率60-74%：初級・中級中心
    difficultyRatio = { basic: 0.3, intermediate: 0.4, advanced: 0.2, expert: 0.1 }
  } else {
    // 正答率60%未満：初級中心
    difficultyRatio = { basic: 0.5, intermediate: 0.3, advanced: 0.2, expert: 0.0 }
  }

  console.log('🎯 Adjusting difficulty distribution:', {
    userAccuracy: `${userAccuracy}%`,
    targetCount,
    ratio: difficultyRatio
  })

  // 難易度別に問題を分類
  const questionsByDifficulty: Record<string, Question[]> = {
    basic: [],
    intermediate: [],
    advanced: [],
    expert: [],
    mixed: []
  }

  questions.forEach(question => {
    const difficulty = question.difficulty || 'mixed'
    if (questionsByDifficulty[difficulty as string]) {
      questionsByDifficulty[difficulty as string].push(question)
    } else {
      questionsByDifficulty.mixed.push(question)
    }
  })

  // 配分に従って問題を選択
  const selectedQuestions: Question[] = []
  
  for (const [difficulty, ratio] of Object.entries(difficultyRatio)) {
    const targetForThisDifficulty = Math.round(targetCount * ratio)
    const availableQuestions = questionsByDifficulty[difficulty] || []
    
    // ランダムに選択
    const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, targetForThisDifficulty)
    
    selectedQuestions.push(...selected)
    
    console.log(`📊 ${difficulty}: ${selected.length}/${targetForThisDifficulty} questions (available: ${availableQuestions.length})`)
  }

  // 目標数に足りない場合は、mixed問題や残りの問題から補完
  if (selectedQuestions.length < targetCount) {
    const remainingCount = targetCount - selectedQuestions.length
    const usedIds = new Set(selectedQuestions.map(q => q.id))
    const unusedQuestions = questions.filter(q => !usedIds.has(q.id))
    
    const shuffledUnused = [...unusedQuestions].sort(() => Math.random() - 0.5)
    const additional = shuffledUnused.slice(0, remainingCount)
    
    selectedQuestions.push(...additional)
    
    console.log(`📊 Added ${additional.length} additional questions to reach target`)
  }

  // 最終的にシャッフルして順序をランダム化
  const finalQuestions = [...selectedQuestions].sort(() => Math.random() - 0.5)
  
  console.log('✅ Final difficulty distribution:', {
    total: finalQuestions.length,
    byDifficulty: levelOrder.reduce((acc, level) => {
      acc[level] = finalQuestions.filter(q => q.difficulty === level).length
      return acc
    }, {} as Record<string, number>)
  })

  return finalQuestions.slice(0, targetCount)
}

/**
 * ユーザーの過去の正答率を取得（簡易版）
 * 将来的には統計データベースから取得
 */
export function estimateUserAccuracy(userStats?: { totalQuestions: number; correctAnswers: number }): number {
  if (!userStats) return 70 // デフォルト値

  const { totalQuestions, correctAnswers } = userStats
  if (totalQuestions > 0) {
    return Math.round((correctAnswers / totalQuestions) * 100)
  }
  
  return 70 // デフォルト値
}