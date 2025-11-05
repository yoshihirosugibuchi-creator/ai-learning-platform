import { supabaseAdmin } from '@/lib/supabase-admin'

interface AccuracyAnalysis {
  period: '1week' | '1month' | 'all'
  accuracy: number
  confidence: 'high' | 'medium' | 'low'
  sampleSize: number
  hasData: boolean
  correctAnswers: number
  totalAnswers: number
}


/**
 * 期間限定正答率分析
 * 1週間 → 1ヶ月 → 全期間の優先順位で分析
 */
export async function calculateRecentAccuracy(
  userId: string,
  preferredPeriod: '1week' | '1month' = '1week'
): Promise<AccuracyAnalysis> {
  console.log(`📊 Calculating recent accuracy for user ${userId.substring(0, 8)}...`, {
    preferredPeriod
  })

  try {
    // 1週間の分析を試行
    if (preferredPeriod === '1week') {
      const weeklyAnalysis = await analyzeAccuracyForPeriod(userId, '1week')
      if (weeklyAnalysis.hasData && weeklyAnalysis.confidence !== 'low') {
        console.log('✅ Using 1week accuracy data:', weeklyAnalysis)
        return weeklyAnalysis
      }
    }

    // 1ヶ月の分析を試行
    const monthlyAnalysis = await analyzeAccuracyForPeriod(userId, '1month')
    if (monthlyAnalysis.hasData && monthlyAnalysis.confidence !== 'low') {
      console.log('✅ Using 1month accuracy data (1week insufficient):', monthlyAnalysis)
      return monthlyAnalysis
    }

    // 全期間の分析（最終フォールバック）
    const allTimeAnalysis = await analyzeAccuracyForPeriod(userId, 'all')
    console.log('✅ Using all-time accuracy data (recent data insufficient):', allTimeAnalysis)
    return allTimeAnalysis

  } catch (error) {
    console.error('❌ Error in calculateRecentAccuracy:', error)
    
    // エラー時のデフォルト値
    return {
      period: 'all',
      accuracy: 0.7, // デフォルト70%
      confidence: 'low',
      sampleSize: 0,
      hasData: false,
      correctAnswers: 0,
      totalAnswers: 0
    }
  }
}

/**
 * 指定期間の正答率分析
 */
async function analyzeAccuracyForPeriod(
  userId: string,
  period: '1week' | '1month' | 'all'
): Promise<AccuracyAnalysis> {
  
  // 期間の計算
  let startDate: string | null = null
  const now = new Date()
  
  if (period === '1week') {
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    startDate = oneWeekAgo.toISOString()
  } else if (period === '1month') {
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    startDate = oneMonthAgo.toISOString()
  }
  // period === 'all' の場合は startDate = null（全期間）

  console.log(`🔍 Analyzing accuracy for period: ${period}`, {
    startDate: startDate ? startDate.substring(0, 10) : 'all-time',
    userId: userId.substring(0, 8) + '...'
  })

  try {
    // クイズ回答データを取得
    let query = supabaseAdmin
      .from('quiz_answers')
      .select('is_correct, created_at')
      .eq('user_id', userId)

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    const { data: answers, error } = await query
      .order('created_at', { ascending: false })
      .limit(1000) // 最大1000問まで

    if (error) {
      console.error(`❌ Error fetching answers for ${period}:`, error)
      throw error
    }

    if (!answers || answers.length === 0) {
      console.log(`ℹ️ No data found for period: ${period}`)
      return {
        period,
        accuracy: 0.7, // デフォルト70%
        confidence: 'low',
        sampleSize: 0,
        hasData: false,
        correctAnswers: 0,
        totalAnswers: 0
      }
    }

    // 正答率計算
    const totalAnswers = answers.length
    const correctAnswers = answers.filter(answer => answer.is_correct).length
    const accuracy = correctAnswers / totalAnswers

    // 信頼度判定
    let confidence: 'high' | 'medium' | 'low'
    
    if (period === '1week') {
      if (totalAnswers >= 20) {
        confidence = 'high'
      } else if (totalAnswers >= 10) {
        confidence = 'medium'
      } else {
        confidence = 'low'
      }
    } else if (period === '1month') {
      if (totalAnswers >= 50) {
        confidence = 'high'
      } else if (totalAnswers >= 20) {
        confidence = 'medium'
      } else {
        confidence = 'low'
      }
    } else { // all
      if (totalAnswers >= 100) {
        confidence = 'high'
      } else if (totalAnswers >= 30) {
        confidence = 'medium'
      } else {
        confidence = 'low'
      }
    }

    const result = {
      period,
      accuracy,
      confidence,
      sampleSize: totalAnswers,
      hasData: true,
      correctAnswers,
      totalAnswers
    }

    console.log(`📈 Period analysis result (${period}):`, {
      accuracy: `${(accuracy * 100).toFixed(1)}%`,
      confidence,
      sampleSize: totalAnswers,
      correctAnswers
    })

    return result

  } catch (error) {
    console.error(`❌ Error in period analysis (${period}):`, error)
    throw error
  }
}

/**
 * 複数カテゴリーの期間限定正答率分析
 * セルフパーソナライズクイズ用
 */
export async function calculateMultiCategoryRecentAccuracy(
  userId: string,
  selectedCategories: string[],
  preferredPeriod: '1week' | '1month' = '1week'
): Promise<AccuracyAnalysis> {
  console.log(`📊 Calculating multi-category recent accuracy for user ${userId.substring(0, 8)}...`, {
    selectedCategories: selectedCategories.length,
    preferredPeriod
  })

  if (selectedCategories.length === 0) {
    return {
      period: preferredPeriod,
      accuracy: 0.7,
      confidence: 'low',
      sampleSize: 0,
      hasData: false,
      correctAnswers: 0,
      totalAnswers: 0
    }
  }

  try {
    // 1週間の分析を試行
    if (preferredPeriod === '1week') {
      const weeklyAnalysis = await analyzeMultiCategoryAccuracyForPeriod(userId, selectedCategories, '1week')
      if (weeklyAnalysis.hasData && weeklyAnalysis.confidence !== 'low') {
        console.log('✅ Using 1week multi-category accuracy:', weeklyAnalysis)
        return weeklyAnalysis
      }
    }

    // 1ヶ月の分析を試行
    const monthlyAnalysis = await analyzeMultiCategoryAccuracyForPeriod(userId, selectedCategories, '1month')
    if (monthlyAnalysis.hasData && monthlyAnalysis.confidence !== 'low') {
      console.log('✅ Using 1month multi-category accuracy (1week insufficient):', monthlyAnalysis)
      return monthlyAnalysis
    }

    // 全期間の分析（最終フォールバック）
    const allTimeAnalysis = await analyzeMultiCategoryAccuracyForPeriod(userId, selectedCategories, 'all')
    console.log('✅ Using all-time multi-category accuracy (recent data insufficient):', allTimeAnalysis)
    return allTimeAnalysis

  } catch (error) {
    console.error('❌ Error in calculateMultiCategoryRecentAccuracy:', error)
    
    return {
      period: 'all',
      accuracy: 0.7,
      confidence: 'low',
      sampleSize: 0,
      hasData: false,
      correctAnswers: 0,
      totalAnswers: 0
    }
  }
}

/**
 * 複数カテゴリーの指定期間正答率分析
 */
async function analyzeMultiCategoryAccuracyForPeriod(
  userId: string,
  selectedCategories: string[],
  period: '1week' | '1month' | 'all'
): Promise<AccuracyAnalysis> {
  
  // 期間の計算
  let startDate: string | null = null
  const now = new Date()
  
  if (period === '1week') {
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    startDate = oneWeekAgo.toISOString()
  } else if (period === '1month') {
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    startDate = oneMonthAgo.toISOString()
  }

  console.log(`🔍 Analyzing multi-category accuracy for period: ${period}`, {
    startDate: startDate ? startDate.substring(0, 10) : 'all-time',
    categories: selectedCategories.length
  })

  try {
    // 選択されたカテゴリーのクイズ回答データを取得
    let query = supabaseAdmin
      .from('quiz_answers')
      .select('is_correct, category_id, created_at')
      .eq('user_id', userId)
      .in('category_id', selectedCategories)

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    const { data: answers, error } = await query
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error(`❌ Error fetching multi-category answers for ${period}:`, error)
      throw error
    }

    if (!answers || answers.length === 0) {
      console.log(`ℹ️ No multi-category data found for period: ${period}`)
      return {
        period,
        accuracy: 0.7,
        confidence: 'low',
        sampleSize: 0,
        hasData: false,
        correctAnswers: 0,
        totalAnswers: 0
      }
    }

    // 正答率計算
    const totalAnswers = answers.length
    const correctAnswers = answers.filter(answer => answer.is_correct).length
    const accuracy = correctAnswers / totalAnswers

    // カテゴリー別分布確認
    const categoryDistribution = selectedCategories.reduce((acc, category) => {
      acc[category] = answers.filter(a => a.category_id === category).length
      return acc
    }, {} as Record<string, number>)

    // 信頼度判定（マルチカテゴリーは少し厳しめ）
    let confidence: 'high' | 'medium' | 'low'
    const categoriesWithData = Object.values(categoryDistribution).filter(count => count > 0).length
    const minCategoriesForHighConfidence = Math.min(selectedCategories.length, 3)
    
    if (period === '1week') {
      if (totalAnswers >= 30 && categoriesWithData >= minCategoriesForHighConfidence) {
        confidence = 'high'
      } else if (totalAnswers >= 15 && categoriesWithData >= 1) {
        confidence = 'medium'
      } else {
        confidence = 'low'
      }
    } else if (period === '1month') {
      if (totalAnswers >= 60 && categoriesWithData >= minCategoriesForHighConfidence) {
        confidence = 'high'
      } else if (totalAnswers >= 30 && categoriesWithData >= 1) {
        confidence = 'medium'
      } else {
        confidence = 'low'
      }
    } else { // all
      if (totalAnswers >= 100 && categoriesWithData >= minCategoriesForHighConfidence) {
        confidence = 'high'
      } else if (totalAnswers >= 50 && categoriesWithData >= 1) {
        confidence = 'medium'
      } else {
        confidence = 'low'
      }
    }

    const result = {
      period,
      accuracy,
      confidence,
      sampleSize: totalAnswers,
      hasData: true,
      correctAnswers,
      totalAnswers
    }

    console.log(`📈 Multi-category period analysis result (${period}):`, {
      accuracy: `${(accuracy * 100).toFixed(1)}%`,
      confidence,
      sampleSize: totalAnswers,
      categoriesWithData,
      categoryDistribution
    })

    return result

  } catch (error) {
    console.error(`❌ Error in multi-category period analysis (${period}):`, error)
    throw error
  }
}