import { supabaseAdmin } from './supabase-admin'

export interface IndustryAnalysisData {
  industryId: string
  industryName: string
  currentLevel: 'basic' | 'intermediate' | 'advanced' | 'expert'
  subcategoryStats: {
    subcategoryId: string
    subcategoryName: string
    currentXP: number
    targetXP: number
    level: string
    progressPercentage: number
    importance_weight: number
    displayInRadar: boolean
  }[]
  totalXP: number
  overallProgressPercentage: number
}

export interface IndustryLevelTarget {
  id: string
  industry_category_id: string
  subcategory_id: string
  subcategory_name?: string  // サブカテゴリー名（日本語）
  level: 'basic' | 'intermediate' | 'advanced' | 'expert'
  target_xp: number
  importance_weight: number
  display_in_radar: boolean
}

// Supabaseクエリ結果の型定義
interface SupabaseIndustryTarget {
  id: string
  industry_category_id: string
  subcategory_id: string
  level: string
  target_xp: number
  importance_weight: number | null
  display_in_radar: boolean | null
  subcategories?: {
    name: string
  } | null
}

interface SupabaseCategoryXP {
  category_id: string
  total_xp: number
}

interface SupabaseSubcategoryXP {
  subcategory_id: string
  category_id: string
  total_xp: number
}

interface SupabaseCategory {
  category_id: string
  name: string
}

interface SupabaseSubcategory {
  subcategory_id: string
  name: string
  parent_category_id: string
}

/**
 * ユーザーの業界別分析データを取得（重複除去あり）
 * @param userId ユーザーID
 * @param industryId 業界カテゴリーID（オプション）
 * @param selectedLevel 選択されたレベル（オプション）
 */
export async function getUserIndustryAnalysis(
  userId: string,
  industryId?: string,
  selectedLevel: 'basic' | 'intermediate' | 'advanced' | 'expert' = 'basic'
): Promise<IndustryAnalysisData[]> {
  try {
    console.log('🔍 Getting industry analysis for user:', userId.substring(0, 8))

    // 1. ユーザーのXP統計を取得（既存のAPIを使用）
    // カテゴリー別XP統計を取得
    const categoryResult = await supabaseAdmin
      .from('user_category_xp_stats_v2')
      .select('category_id, total_xp')
      .eq('user_id', userId)

    const categoryXP: SupabaseCategoryXP[] = categoryResult.data || []
    console.log('📊 Category XP data:', categoryXP.length, 'records')

    // サブカテゴリー別XP統計を取得（テーブルが存在しない場合はスキップ）
    let subcategoryXP: SupabaseSubcategoryXP[] = []
    try {
      const subcategoryResult = await supabaseAdmin
        .from('user_subcategory_xp_stats_v2')
        .select('subcategory_id, category_id, total_xp')
        .eq('user_id', userId)
      
      if (!subcategoryResult.error) {
        subcategoryXP = (subcategoryResult.data as SupabaseSubcategoryXP[]) || []
        console.log('📊 Subcategory XP data:', subcategoryXP.length, 'records')
        console.log('📊 Subcategory XP sample:', subcategoryXP.slice(0, 5))
      } else {
        console.warn('⚠️ Subcategory XP query error:', subcategoryResult.error.message)
      }
    } catch (subError) {
      console.warn('⚠️ Subcategory XP table access failed:', subError)
    }

    console.log('📊 Found XP data:', {
      categories: categoryXP.length,
      subcategories: subcategoryXP.length,
      categoryXPSample: categoryXP.slice(0, 3),
      subcategoryXPSample: subcategoryXP.slice(0, 3)
    })

    // 2. XPがあるカテゴリーの業界レベル目標を取得
    const hasXPCategoryIds = [...new Set([
      ...categoryXP.filter(c => c.total_xp > 0).map(c => c.category_id),
      ...subcategoryXP.filter(s => s.total_xp > 0).map(s => s.category_id)
    ])]

    if (hasXPCategoryIds.length === 0) {
      console.log('⚠️ No XP found for any industry categories for user:', userId.substring(0, 8))
      console.log('💡 This is normal for new users. Start learning to accumulate XP!')
      return []
    }

    console.log('🎯 Categories with XP:', hasXPCategoryIds.length)

    // 3. 業界レベル目標データを取得
    const targetsQuery = supabaseAdmin
      .from('industry_level_targets')
      .select(`
        id,
        industry_category_id,
        subcategory_id,
        level,
        target_xp,
        importance_weight,
        display_in_radar
      `)
      .in('industry_category_id', hasXPCategoryIds)
      .eq('level', selectedLevel)

    const { data: targets, error: targetsError } = await targetsQuery

    if (targetsError) {
      console.error('Error fetching industry targets:', targetsError)
      return []
    }

    if (!targets || targets.length === 0) {
      console.log('⚠️ No industry level targets found')
      return []
    }

    const typedTargets = targets as SupabaseIndustryTarget[]

    console.log('🎯 Found targets:', targets.length)

    // 4. 業界カテゴリー名とサブカテゴリー名を取得（type='industry'のみ）
    const [categoriesResult, subcategoriesResult] = await Promise.all([
      supabaseAdmin
        .from('categories')
        .select('category_id, name')
        .in('category_id', hasXPCategoryIds)
        .eq('type', 'industry'),
      
      supabaseAdmin
        .from('subcategories')
        .select('subcategory_id, name, parent_category_id')
        .in('parent_category_id', hasXPCategoryIds)
    ])

    const categories: SupabaseCategory[] = (categoriesResult.data as SupabaseCategory[]) || []
    const subcategories: SupabaseSubcategory[] = (subcategoriesResult.data as SupabaseSubcategory[]) || []

    console.log('📚 Found metadata:', {
      categories: categories.length,
      subcategories: subcategories.length,
      categorySample: categories.slice(0, 3),
      subcategorySample: subcategories.slice(0, 3)
    })

    // 5. 業界ごとにデータを集約
    const industryMap: Record<string, IndustryAnalysisData> = {}

    for (const category of categories) {
      if (!industryMap[category.category_id]) {
        // カテゴリー直接のXPを取得
        const categoryDirectXP = categoryXP.find(c => c.category_id === category.category_id)?.total_xp || 0
        
        industryMap[category.category_id] = {
          industryId: category.category_id,
          industryName: category.name,
          currentLevel: selectedLevel,
          subcategoryStats: [],
          totalXP: categoryDirectXP,
          overallProgressPercentage: 0
        }
      }
    }

    // 6. サブカテゴリー統計を計算（重複除去）
    const processedSubcategories = new Set<string>()

    for (const target of typedTargets) {
      // 重複チェック
      const key = `${target.industry_category_id}-${target.subcategory_id}`
      if (processedSubcategories.has(key)) {
        continue
      }
      processedSubcategories.add(key)

      const industry = industryMap[target.industry_category_id]
      if (!industry) continue

      const subcategoryInfo = subcategories.find(s => s.subcategory_id === target.subcategory_id)
      if (!subcategoryInfo) continue

      // サブカテゴリーのXPを取得
      const subcatXP = subcategoryXP.find(
        s => s.subcategory_id === target.subcategory_id && 
             s.category_id === target.industry_category_id
      )?.total_xp || 0

      console.log(`🔍 Subcategory XP lookup:`, {
        targetSubcategoryId: target.subcategory_id,
        targetIndustryId: target.industry_category_id,
        foundXP: subcatXP,
        allSubcategoryXPForIndustry: subcategoryXP.filter(s => s.category_id === target.industry_category_id)
      })

      const progressPercentage = target.target_xp > 0 
        ? Math.min(100, Math.round((subcatXP / target.target_xp) * 100))
        : 0

      industry.subcategoryStats.push({
        subcategoryId: target.subcategory_id,
        subcategoryName: subcategoryInfo.name,
        currentXP: subcatXP,
        targetXP: target.target_xp,
        level: target.level,
        progressPercentage,
        importance_weight: target.importance_weight || 1.0,
        displayInRadar: target.display_in_radar || false
      })

      // 注意: カテゴリーXPはサブカテゴリーXPの合計なので、重複を避けるため加算しない
    }

    // 7. 全体の進捗率を計算
    for (const industry of Object.values(industryMap)) {
      if (industry.subcategoryStats.length > 0) {
        const totalTarget = industry.subcategoryStats.reduce((sum, stat) => sum + stat.targetXP, 0)
        const totalCurrent = industry.subcategoryStats.reduce((sum, stat) => sum + stat.currentXP, 0)
        
        industry.overallProgressPercentage = totalTarget > 0 
          ? Math.min(100, Math.round((totalCurrent / totalTarget) * 100))
          : 0
      }

      // レーダーチャート表示用にソート（重要度順、XP順）
      industry.subcategoryStats.sort((a, b) => {
        // まず重要度で降順ソート
        if (a.importance_weight !== b.importance_weight) {
          return b.importance_weight - a.importance_weight
        }
        // 重要度が同じならXPで降順ソート
        return b.currentXP - a.currentXP
      })
    }

    const result = Object.values(industryMap).filter(industry => 
      industry.totalXP > 0 || industry.subcategoryStats.length > 0
    )

    console.log('✅ Industry analysis completed:', {
      industries: result.length,
      totalSubcategories: result.reduce((sum, ind) => sum + ind.subcategoryStats.length, 0)
    })

    return result

  } catch (error) {
    console.error('❌ Error in getUserIndustryAnalysis:', error)
    return []
  }
}

/**
 * 業界レベル目標を取得・管理（サブカテゴリー名を含む）
 */
export async function getIndustryLevelTargets(
  industryId?: string,
  level?: string
): Promise<IndustryLevelTarget[]> {
  try {
    let query = supabaseAdmin
      .from('industry_level_targets')
      .select(`
        id,
        industry_category_id,
        subcategory_id,
        level,
        target_xp,
        importance_weight,
        display_in_radar,
        subcategories!inner(name)
      `)

    if (industryId) {
      query = query.eq('industry_category_id', industryId)
    }

    if (level) {
      query = query.eq('level', level)
    }

    const { data, error } = await query.order('importance_weight', { ascending: false })

    if (error) {
      console.error('Error fetching industry level targets:', error)
      return []
    }

    // サブカテゴリー名を平坦化
    const flattenedData: IndustryLevelTarget[] = (data as SupabaseIndustryTarget[] || []).map(target => ({
      id: target.id,
      industry_category_id: target.industry_category_id,
      subcategory_id: target.subcategory_id,
      subcategory_name: target.subcategories?.name || target.subcategory_id,
      level: target.level as 'basic' | 'intermediate' | 'advanced' | 'expert',
      target_xp: target.target_xp,
      importance_weight: target.importance_weight || 1.0,
      display_in_radar: target.display_in_radar || false
    }))

    return flattenedData
  } catch (error) {
    console.error('Error in getIndustryLevelTargets:', error)
    return []
  }
}

/**
 * 業界レベル目標を更新
 */
export async function updateIndustryLevelTarget(
  targetId: string,
  updates: Partial<Omit<IndustryLevelTarget, 'id'>>
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('industry_level_targets')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', targetId)

    if (error) {
      console.error('Error updating industry level target:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in updateIndustryLevelTarget:', error)
    return false
  }
}

/**
 * レーダーチャート用データ生成（最大10項目）
 */
export function generateRadarChartData(industryData: IndustryAnalysisData) {
  const radarItems = industryData.subcategoryStats
    .filter(stat => stat.displayInRadar)
    .slice(0, 10) // 最大10項目

  return {
    labels: radarItems.map(item => item.subcategoryName),
    datasets: [
      {
        label: '現在のXP',
        data: radarItems.map(item => item.currentXP),
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(59, 130, 246)',
      },
      {
        label: '目標XP',
        data: radarItems.map(item => item.targetXP),
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(239, 68, 68)',
      }
    ]
  }
}