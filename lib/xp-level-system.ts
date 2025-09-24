import { supabase } from './supabase'
import { updateUserProfile, getUserProfile } from './supabase-user'
import { getCategoryProgress, updateCategoryProgress, saveSKPTransaction } from './supabase-learning'
import { mainCategories, industryCategories, getSubcategoryId } from './categories'

// 新しいXP・レベル・SKP管理システム
// 2024年要件に基づく統一実装

// ========== XP管理定数 ==========
export const XP_CONFIG = {
  // クイズ獲得XP（難易度別）
  QUIZ_XP: {
    basic: 10,      // 基礎（初級）
    intermediate: 20, // 中級  
    advanced: 30,    // 上級
    expert: 50       // エキスパート
  },
  // コース学習獲得XP
  COURSE_XP: 20,     // 確認クイズ正解1問につき
  
  // レベルアップ閾値
  LEVEL_THRESHOLDS: {
    overall: 1000,          // 全体レベル：1000XPごと
    main_category: 500,     // メインカテゴリー：500XPごと
    industry_category: 1000, // 業界カテゴリー：1000XPごと
    industry_subcategory: 500 // 業界サブカテゴリー：500XPごと
  }
} as const

// ========== 難易度マッピング ==========
export function mapDifficultyToEnglish(difficulty: string): 'basic' | 'intermediate' | 'advanced' | 'expert' {
  switch (difficulty) {
    case '基礎':
    case '初級':
      return 'basic'
    case '中級':
      return 'intermediate'
    case '上級':
      return 'advanced'
    case 'エキスパート':
      return 'expert'
    default:
      console.warn(`Unknown difficulty: ${difficulty}, defaulting to basic`)
      return 'basic'
  }
}

// ========== SKP管理定数 ==========
export const SKP_CONFIG = {
  // クイズSKP
  QUIZ_CORRECT: 10,    // 正解1問につき
  QUIZ_INCORRECT: 2,   // 不正解1問につき
  QUIZ_PERFECT_BONUS: 50, // 全問正解ボーナス
  
  // コース学習SKP
  COURSE_CORRECT: 10,   // 正解1問につき
  COURSE_INCORRECT: 2,  // 不正解1問につき
  COURSE_COMPLETE_BONUS: 50, // コース完了ボーナス
  
  // 継続学習SKP
  DAILY_STREAK_BONUS: 10,  // 毎日継続ボーナス
  TEN_DAY_STREAK_BONUS: 100 // 10日連続ボーナス
} as const

// ========== 型定義 ==========
export interface XPGainResult {
  xpGained: number
  newLevel: number
  oldLevel: number
  leveledUp: boolean
}

export interface SKPGainResult {
  skpGained: number
  breakdown: {
    base: number
    bonus: number
    description: string
  }
}

export interface LevelSystem {
  overall: { level: number; xp: number; nextLevelXP: number }
  mainCategories: Record<string, { level: number; xp: number; nextLevelXP: number }>
  industryCategories: Record<string, { level: number; xp: number; nextLevelXP: number }>
  industrySubcategories: Record<string, { level: number; xp: number; nextLevelXP: number }>
}

// ========== XP計算関数 ==========

/**
 * クイズ完了時のXP計算
 */
export function calculateQuizXP(
  correctAnswers: number,
  totalQuestions: number,
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert' = 'basic'
): number {
  return correctAnswers * XP_CONFIG.QUIZ_XP[difficulty]
}

/**
 * コース学習完了時のXP計算
 */
export function calculateCourseXP(correctAnswers: number): number {
  return correctAnswers * XP_CONFIG.COURSE_XP
}

/**
 * レベル計算（XPから）
 */
export function calculateLevel(totalXP: number, threshold: number): number {
  return Math.floor(totalXP / threshold) + 1
}

/**
 * 次のレベルまでに必要なXP計算
 */
export function calculateNextLevelXP(totalXP: number, threshold: number): number {
  const currentLevelXP = Math.floor(totalXP / threshold) * threshold
  return currentLevelXP + threshold - totalXP
}

// ========== SKP計算関数 ==========

/**
 * クイズ完了時のSKP計算
 */
export function calculateQuizSKP(
  correctAnswers: number,
  totalQuestions: number,
  isPerfect: boolean = false
): SKPGainResult {
  const incorrectAnswers = totalQuestions - correctAnswers
  const baseCorrect = correctAnswers * SKP_CONFIG.QUIZ_CORRECT
  const baseIncorrect = incorrectAnswers * SKP_CONFIG.QUIZ_INCORRECT
  const perfectBonus = isPerfect && totalQuestions >= 3 ? SKP_CONFIG.QUIZ_PERFECT_BONUS : 0
  
  const base = baseCorrect + baseIncorrect
  const bonus = perfectBonus
  const total = base + bonus
  
  return {
    skpGained: total,
    breakdown: {
      base,
      bonus,
      description: `正解${correctAnswers}問(${baseCorrect}SKP) + 不正解${incorrectAnswers}問(${baseIncorrect}SKP)${perfectBonus > 0 ? ' + 全問正解ボーナス(50SKP)' : ''}`
    }
  }
}

/**
 * コース学習完了時のSKP計算
 */
export function calculateCourseSKP(
  correctAnswers: number,
  totalQuestions: number,
  isCompleted: boolean = false,
  isReview: boolean = false
): SKPGainResult {
  // 復習時はSKP付与なし
  if (isReview) {
    return {
      skpGained: 0,
      breakdown: {
        base: 0,
        bonus: 0,
        description: '復習のためSKP付与なし'
      }
    }
  }
  
  const incorrectAnswers = totalQuestions - correctAnswers
  const baseCorrect = correctAnswers * SKP_CONFIG.COURSE_CORRECT
  const baseIncorrect = incorrectAnswers * SKP_CONFIG.COURSE_INCORRECT
  const completeBonus = isCompleted ? SKP_CONFIG.COURSE_COMPLETE_BONUS : 0
  
  const base = baseCorrect + baseIncorrect
  const bonus = completeBonus
  const total = base + bonus
  
  return {
    skpGained: total,
    breakdown: {
      base,
      bonus,
      description: `正解${correctAnswers}問(${baseCorrect}SKP) + 不正解${incorrectAnswers}問(${baseIncorrect}SKP)${completeBonus > 0 ? ' + コース完了ボーナス(50SKP)' : ''}`
    }
  }
}

// ========== 統合進捗更新関数 ==========

/**
 * チャレンジクイズ用：各問題のカテゴリー別進捗更新
 */
export async function updateProgressAfterChallengeQuiz(
  userId: string,
  questionAnswers: Array<{
    questionId: string
    category: string
    isCorrect: boolean
    difficulty?: string
  }>,
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert' = 'basic'
): Promise<{
  categoryResults: Record<string, { xpResult: XPGainResult; skpResult: SKPGainResult }>
  success: boolean
}> {
  try {
    console.log('🔄 Starting challenge quiz progress update:', { userId, totalQuestions: questionAnswers.length, difficulty })
    
    // カテゴリー別に正解・不正解を集計
    const categoryStats: Record<string, { correct: number; total: number }> = {}
    
    questionAnswers.forEach(answer => {
      if (!categoryStats[answer.category]) {
        categoryStats[answer.category] = { correct: 0, total: 0 }
      }
      categoryStats[answer.category].total += 1
      if (answer.isCorrect) {
        categoryStats[answer.category].correct += 1
      }
    })
    
    console.log('📊 Category statistics:', categoryStats)
    
    const categoryResults: Record<string, { xpResult: XPGainResult; skpResult: SKPGainResult }> = {}
    
    // 各カテゴリーごとに進捗更新
    for (const [categoryId, stats] of Object.entries(categoryStats)) {
      console.log(`🎯 Processing category: ${categoryId} (${stats.correct}/${stats.total})`)
      
      // カテゴリー別XP計算（そのカテゴリーの正解数のみ）
      const xpGained = calculateQuizXP(stats.correct, stats.total, difficulty)
      console.log(`💎 XP for ${categoryId}: ${xpGained} (${stats.correct} correct × ${XP_CONFIG.QUIZ_XP[difficulty]}XP)`)
      
      // カテゴリー別SKP計算
      const isPerfect = stats.correct === stats.total && stats.total >= 3
      const skpResult = calculateQuizSKP(stats.correct, stats.total, isPerfect)
      console.log(`⚡ SKP for ${categoryId}:`, skpResult)
      
      // カテゴリー別進捗更新
      let categoryProgress = null
      try {
        categoryProgress = await updateCategoryProgress(userId, categoryId, stats.correct, stats.total, xpGained)
        console.log(`✅ Category progress updated for ${categoryId}:`, categoryProgress?.id)
      } catch (progressError) {
        console.error(`❌ Error updating category progress for ${categoryId}:`, progressError)
        // Continue with default values if database update fails
      }
      
      // レベル変化を計算
      const threshold = XP_CONFIG.LEVEL_THRESHOLDS.main_category
      const oldLevel = categoryProgress ? Math.floor((categoryProgress.total_xp - xpGained) / threshold) + 1 : 1
      const newLevel = categoryProgress ? categoryProgress.current_level : 1
      
      categoryResults[categoryId] = {
        xpResult: {
          xpGained,
          newLevel,
          oldLevel,
          leveledUp: newLevel > oldLevel
        },
        skpResult
      }
      
      // SKP取引記録
      if (skpResult.skpGained > 0) {
        try {
          await saveSKPTransaction({
            user_id: userId,
            type: 'earned',
            amount: skpResult.skpGained,
            source: 'challenge_quiz',
            description: `${categoryId}: ${skpResult.breakdown.description}`,
            timestamp: new Date().toISOString()
          })
          console.log(`✅ SKP transaction recorded for ${categoryId}`)
        } catch (error) {
          console.error(`❌ Error recording SKP transaction for ${categoryId}:`, error)
        }
      }
    }
    
    // 全体XP更新
    console.log('🌟 Updating overall XP...')
    try {
      await updateOverallXP(userId)
      console.log('✅ Overall XP updated')
    } catch (error) {
      console.error('❌ Error updating overall XP (continuing anyway):', error)
    }
    
    console.log('🎯 Challenge quiz progress update completed successfully')
    return {
      categoryResults,
      success: true
    }
  } catch (error) {
    console.error('❌ Critical error in updateProgressAfterChallengeQuiz:', error)
    return {
      categoryResults: {},
      success: false
    }
  }
}

/**
 * カテゴリー指定クイズ用：統合進捗更新
 */
export async function updateProgressAfterQuiz(
  userId: string,
  categoryId: string,
  correctAnswers: number,
  totalQuestions: number,
  difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert' = 'basic'
): Promise<{
  xpResult: XPGainResult
  skpResult: SKPGainResult
  success: boolean
}> {
  try {
    console.log('🔄 Starting quiz progress update:', { userId, categoryId, correctAnswers, totalQuestions, difficulty })
    
    // XP計算
    const xpGained = calculateQuizXP(correctAnswers, totalQuestions, difficulty)
    console.log('💎 XP calculated:', xpGained)
    
    // SKP計算
    const isPerfect = correctAnswers === totalQuestions
    const skpResult = calculateQuizSKP(correctAnswers, totalQuestions, isPerfect)
    console.log('⚡ SKP calculated:', skpResult)
    
    // カテゴリー別進捗更新
    console.log('📊 Updating category progress...')
    const categoryProgress = await updateCategoryProgress(userId, categoryId, correctAnswers, totalQuestions, xpGained)
    console.log('✅ Category progress updated:', categoryProgress?.id)
    
    // 全体XP更新
    console.log('🌟 Updating overall XP...')
    try {
      await updateOverallXP(userId)
      console.log('✅ Overall XP updated')
    } catch (error) {
      console.error('❌ Error updating overall XP (continuing anyway):', error)
    }
    
    // SKP取引記録
    if (skpResult.skpGained > 0) {
      console.log('💰 Recording SKP transaction...')
      try {
        await saveSKPTransaction({
          user_id: userId,
          type: 'earned',
          amount: skpResult.skpGained,
          source: 'quiz_completion',
          description: skpResult.breakdown.description,
          timestamp: new Date().toISOString()
        })
        console.log('✅ SKP transaction recorded')
      } catch (error) {
        console.error('❌ Error recording SKP transaction (continuing anyway):', error)
      }
    }
    
    // レベル変化を計算
    const threshold = XP_CONFIG.LEVEL_THRESHOLDS.main_category
    const oldLevel = categoryProgress ? Math.floor((categoryProgress.total_xp - xpGained) / threshold) + 1 : 1
    const newLevel = categoryProgress ? categoryProgress.current_level : 1
    
    const xpResult: XPGainResult = {
      xpGained,
      newLevel,
      oldLevel,
      leveledUp: newLevel > oldLevel
    }
    
    console.log('🎯 Quiz progress update completed successfully')
    return {
      xpResult,
      skpResult,
      success: true
    }
  } catch (error) {
    console.error('❌ Critical error in updateProgressAfterQuiz:', error)
    return {
      xpResult: { xpGained: 0, newLevel: 1, oldLevel: 1, leveledUp: false },
      skpResult: { skpGained: 0, breakdown: { base: 0, bonus: 0, description: 'エラーが発生しました' } },
      success: false
    }
  }
}

/**
 * 全体XPの更新（カテゴリー別XPを集計）
 */
export async function updateOverallXP(userId: string): Promise<void> {
  try {
    const categoryProgress = await getCategoryProgress(userId)
    const totalXP = categoryProgress.reduce((sum, cat) => sum + cat.total_xp, 0)
    const currentLevel = calculateLevel(totalXP, XP_CONFIG.LEVEL_THRESHOLDS.overall)
    
    await updateUserProfile(userId, {
      total_xp: totalXP,
      current_level: currentLevel
    })
    
    console.log(`✅ Updated overall XP for user ${userId}: ${totalXP}XP, Level ${currentLevel}`)
  } catch (error) {
    console.error('Error updating overall XP:', error)
  }
}

/**
 * 業界カテゴリーのレベル計算（サブカテゴリーXPを集計）
 */
export function calculateIndustryCategoryLevel(
  industryId: string,
  categoryProgress: Array<{ category_id: string; total_xp: number }>
): { level: number; totalXP: number; nextLevelXP: number } {
  try {
    const industry = industryCategories.find(cat => cat.id === industryId)
    if (!industry) {
      console.warn(`⚠️ Industry category not found: ${industryId}`)
      return { level: 1, totalXP: 0, nextLevelXP: XP_CONFIG.LEVEL_THRESHOLDS.industry_category }
    }
    
    // 業界内のサブカテゴリーのXPを合計（正しいIDマッピングを使用）
    const subcategoryIds: string[] = []
    let totalXP = 0
    
    console.log(`🔍 Calculating industry ${industryId} level:`)
    console.log('- Subcategories:', industry.subcategories)
    
    // 業界内のサブカテゴリーを正しくIDに変換
    ;(industry.subcategories || []).forEach(subName => {
      const subcategoryId = getSubcategoryId(subName)
      if (subcategoryId) {
        subcategoryIds.push(subcategoryId)
        const subProgress = categoryProgress.find(p => p.category_id === subcategoryId)
        if (subProgress) {
          totalXP += subProgress.total_xp
          console.log(`📊 Added industry subcategory ${subcategoryId} XP: ${subProgress.total_xp} to ${industryId}`)
        }
      } else {
        console.warn(`⚠️ Could not find subcategory ID for: "${subName}"`)
      }
    })
    
    console.log(`- Mapped subcategory IDs:`, subcategoryIds)
    console.log(`- Available progress:`, categoryProgress.map(p => `${p.category_id}: ${p.total_xp}XP`))
    console.log(`- Total XP: ${totalXP}`)
    
    const level = calculateLevel(totalXP, XP_CONFIG.LEVEL_THRESHOLDS.industry_category)
    const nextLevelXP = calculateNextLevelXP(totalXP, XP_CONFIG.LEVEL_THRESHOLDS.industry_category)
    
    console.log(`- Calculated level: ${level}, Next level XP: ${nextLevelXP}`)
    
    return { level, totalXP, nextLevelXP }
  } catch (error) {
    console.error(`❌ Error calculating industry category level for ${industryId}:`, error)
    return { level: 1, totalXP: 0, nextLevelXP: XP_CONFIG.LEVEL_THRESHOLDS.industry_category }
  }
}

/**
 * ユーザーの全レベルシステム情報を取得
 */
export async function getUserLevelSystem(userId: string): Promise<LevelSystem> {
  try {
    const [profile, categoryProgress] = await Promise.all([
      getUserProfile(userId),
      getCategoryProgress(userId)
    ])
    
    console.log('🔍 getUserLevelSystem Debug:')
    console.log('Profile total_xp:', profile?.total_xp)
    console.log('CategoryProgress data:', categoryProgress.map(p => ({ 
      category_id: p.category_id, 
      total_xp: p.total_xp, 
      current_level: p.current_level 
    })))
    
    console.log('Expected main category IDs:', mainCategories.map(c => c.id))
    
    // 全体レベル
    const overallXP = profile?.total_xp || 0
    const overallLevel = profile?.current_level || 1
    const overallNextLevelXP = calculateNextLevelXP(overallXP, XP_CONFIG.LEVEL_THRESHOLDS.overall)
    
    // メインカテゴリー別レベル（サブカテゴリーのXPを集計）
    const mainCategoryLevels: Record<string, { level: number; xp: number; nextLevelXP: number }> = {}
    mainCategories.forEach(category => {
      try {
        // 1. メインカテゴリー自体のXP（存在する場合）
        const mainProgress = categoryProgress.find(p => p.category_id === category.id)
        let totalXP = mainProgress?.total_xp || 0
        
        // 2. サブカテゴリーのXPを集計
        if (category.subcategories && category.subcategories.length > 0) {
          category.subcategories.forEach(subName => {
            // サブカテゴリー名からIDに変換
            const subcategoryId = getSubcategoryId(subName)
            if (subcategoryId) {
              const subProgress = categoryProgress.find(p => p.category_id === subcategoryId)
              if (subProgress) {
                totalXP += subProgress.total_xp
                console.log(`📊 Added subcategory ${subcategoryId} XP: ${subProgress.total_xp} to ${category.id}`)
              }
            }
          })
        }
        
        const level = calculateLevel(totalXP, XP_CONFIG.LEVEL_THRESHOLDS.main_category)
        const nextLevelXP = calculateNextLevelXP(totalXP, XP_CONFIG.LEVEL_THRESHOLDS.main_category)
        
        console.log(`Category ${category.id}: totalXP=${totalXP}, level=${level} (main: ${mainProgress?.total_xp || 0}, subs: ${totalXP - (mainProgress?.total_xp || 0)})`)
        
        mainCategoryLevels[category.id] = { level, xp: totalXP, nextLevelXP }
      } catch (error) {
        console.error(`Error processing main category ${category.id}:`, error)
        mainCategoryLevels[category.id] = { level: 1, xp: 0, nextLevelXP: XP_CONFIG.LEVEL_THRESHOLDS.main_category }
      }
    })
    
    // 業界カテゴリー別レベル
    const industryCategoryLevels: Record<string, { level: number; xp: number; nextLevelXP: number }> = {}
    industryCategories.forEach(industry => {
      try {
        const { level, totalXP, nextLevelXP } = calculateIndustryCategoryLevel(industry.id, categoryProgress)
        industryCategoryLevels[industry.id] = { level, xp: totalXP, nextLevelXP }
      } catch (error) {
        console.error(`Error processing industry category ${industry.id}:`, error)
        industryCategoryLevels[industry.id] = { level: 1, xp: 0, nextLevelXP: XP_CONFIG.LEVEL_THRESHOLDS.industry_category }
      }
    })
    
    // 業界サブカテゴリー別レベル
    const industrySubcategoryLevels: Record<string, { level: number; xp: number; nextLevelXP: number }> = {}
    industryCategories.forEach(industry => {
      try {
        (industry.subcategories || []).forEach(subName => {
          try {
            const subId = subName.toLowerCase().replace(/[・・]/g, '_').replace(/\s+/g, '_')
            const progress = categoryProgress.find(p => p.category_id === subId)
            const xp = progress?.total_xp || 0
            const level = progress?.current_level || 1
            const nextLevelXP = calculateNextLevelXP(xp, XP_CONFIG.LEVEL_THRESHOLDS.industry_subcategory)
            
            industrySubcategoryLevels[subId] = { level, xp, nextLevelXP }
          } catch (error) {
            console.error(`Error processing subcategory ${subName}:`, error)
          }
        })
      } catch (error) {
        console.error(`Error processing industry ${industry.id} subcategories:`, error)
      }
    })
    
    return {
      overall: { level: overallLevel, xp: overallXP, nextLevelXP: overallNextLevelXP },
      mainCategories: mainCategoryLevels,
      industryCategories: industryCategoryLevels,
      industrySubcategories: industrySubcategoryLevels
    }
  } catch (error) {
    console.error('Error getting user level system:', error)
    return {
      overall: { level: 1, xp: 0, nextLevelXP: 1000 },
      mainCategories: {},
      industryCategories: {},
      industrySubcategories: {}
    }
  }
}

// ========== XP/SKP計算とDB更新の分離 ==========

/**
 * チャレンジクイズのXP/SKP計算（即座実行、DB更新なし）
 */
export function calculateChallengeQuizRewards(
  questionAnswers: { questionId: string; category: string; isCorrect: boolean; difficulty: string }[],
  difficulty: 'basic' | 'intermediate' | 'advanced' = 'basic'
): { 
  categoryResults: Record<string, { xpResult: XPGainResult; skpResult: SKPGainResult; stats: { correct: number; total: number } }>; 
  totalXP: number; 
  totalSKP: number 
} {
  console.log('💎 Calculating challenge quiz rewards (no DB access)...')
  
  // カテゴリー別統計を集計
  const categoryStats: Record<string, { correct: number; total: number }> = {}
  
  questionAnswers.forEach(answer => {
    if (!categoryStats[answer.category]) {
      categoryStats[answer.category] = { correct: 0, total: 0 }
    }
    categoryStats[answer.category].total += 1
    if (answer.isCorrect) {
      categoryStats[answer.category].correct += 1
    }
  })
  
  const categoryResults: Record<string, { xpResult: XPGainResult; skpResult: SKPGainResult; stats: { correct: number; total: number } }> = {}
  let totalXP = 0
  let totalSKP = 0
  
  // 各カテゴリーごとにXP/SKP計算
  for (const [categoryId, stats] of Object.entries(categoryStats)) {
    const xpGained = calculateQuizXP(stats.correct, stats.total, difficulty)
    const isPerfect = stats.correct === stats.total && stats.total >= 3
    const skpResult = calculateQuizSKP(stats.correct, stats.total, isPerfect)
    
    categoryResults[categoryId] = {
      xpResult: {
        xpGained,
        newLevel: 1, // DB更新後に正確な値が設定される
        oldLevel: 1,
        leveledUp: false
      },
      skpResult,
      stats: { correct: stats.correct, total: stats.total }
    }
    
    totalXP += xpGained
    totalSKP += skpResult.skpGained
  }
  
  console.log('✅ Challenge quiz rewards calculated:', { totalXP, totalSKP, categories: Object.keys(categoryResults).length })
  
  return { categoryResults, totalXP, totalSKP }
}

/**
 * チャレンジクイズのDB更新（バックグラウンド処理用）
 */
export async function saveChallengeQuizProgressToDatabase(
  userId: string,
  categoryResults: Record<string, { xpResult: XPGainResult; skpResult: SKPGainResult; stats: { correct: number; total: number } }>
): Promise<{ success: boolean; errors: string[]; updatedCategories: string[] }> {
  console.log('💾 Starting background database updates...')
  
  const errors: string[] = []
  const updatedCategories: string[] = []
  
  try {
    // 各カテゴリーの進捗更新（正確な統計を使用）
    for (const [categoryId, result] of Object.entries(categoryResults)) {
      try {
        await updateCategoryProgress(
          userId, 
          categoryId, 
          result.stats.correct,
          result.stats.total,
          result.xpResult.xpGained
        )
        updatedCategories.push(categoryId)
        console.log(`✅ DB updated for category: ${categoryId} (${result.stats.correct}/${result.stats.total}, +${result.xpResult.xpGained}XP)`)
      } catch (error) {
        const errorMsg = `Category ${categoryId}: ${error instanceof Error ? error.message : String(error)}`
        errors.push(errorMsg)
        console.error(`❌ DB update failed for ${categoryId}:`, error)
      }
      
      // SKP取引記録
      if (result.skpResult.skpGained > 0) {
        try {
          await saveSKPTransaction({
            user_id: userId,
            type: 'earned',
            amount: result.skpResult.skpGained,
            source: 'challenge_quiz',
            description: `${categoryId}: ${result.skpResult.breakdown.description}`,
            timestamp: new Date().toISOString()
          })
          console.log(`✅ SKP transaction saved for ${categoryId}`)
        } catch (error) {
          const errorMsg = `SKP transaction for ${categoryId}: ${error instanceof Error ? error.message : String(error)}`
          errors.push(errorMsg)
          console.error(`❌ SKP transaction failed for ${categoryId}:`, error)
        }
      }
    }
    
    // 全体XP更新
    try {
      await updateOverallXP(userId)
      console.log('✅ Overall XP updated in background')
    } catch (error) {
      errors.push(`Overall XP update: ${error instanceof Error ? error.message : String(error)}`)
      console.error('❌ Overall XP update failed:', error)
    }
    
    const success = errors.length === 0
    console.log(`🎯 Background DB updates completed. Success: ${success}, Errors: ${errors.length}`)
    
    return { success, errors, updatedCategories }
  } catch (error) {
    console.error('❌ Critical error in background DB updates:', error)
    return { success: false, errors: [`Critical error: ${error instanceof Error ? error.message : String(error)}`], updatedCategories }
  }
}