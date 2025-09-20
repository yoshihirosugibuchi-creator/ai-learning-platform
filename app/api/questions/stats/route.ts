import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface DifficultyStats {
  [difficulty: string]: number
}

interface SubcategoryStats {
  [subcategory: string]: number
}

// 統計API - 軽量なメタデータ取得用
export async function GET() {
  try {
    console.log('📊 Questions Stats API Request')
    
    // 1. 全体統計
    const { count: totalCount, error: totalError } = await supabase
      .from('quiz_questions')
      .select('*', { count: 'exact', head: true })
      .eq('is_deleted', false)
    
    if (totalError) {
      throw new Error(`Total count error: ${totalError.message}`)
    }
    
    // 2. カテゴリー別統計
    const { data: categoryData, error: categoryError } = await supabase
      .from('quiz_questions')
      .select('category_id')
      .eq('is_deleted', false)
    
    if (categoryError) {
      throw new Error(`Category stats error: ${categoryError.message}`)
    }
    
    // カテゴリー別集計
    const categoryStats: Record<string, number> = {}
    categoryData?.forEach(row => {
      const category = row.category_id
      categoryStats[category] = (categoryStats[category] || 0) + 1
    })
    
    // 3. 難易度別統計
    const { data: difficultyData, error: difficultyError } = await supabase
      .from('quiz_questions')
      .select('difficulty')
      .eq('is_deleted', false)
    
    if (difficultyError) {
      throw new Error(`Difficulty stats error: ${difficultyError.message}`)
    }
    
    const difficultyStats: DifficultyStats = {}
    difficultyData?.forEach(row => {
      const difficulty = row.difficulty || '中級'
      difficultyStats[difficulty] = (difficultyStats[difficulty] || 0) + 1
    })
    
    // 4. サブカテゴリー別統計（上位10位）
    const { data: subcategoryData, error: subcategoryError } = await supabase
      .from('quiz_questions')
      .select('subcategory_id')
      .eq('is_deleted', false)
      .not('subcategory_id', 'is', null)
    
    if (subcategoryError) {
      throw new Error(`Subcategory stats error: ${subcategoryError.message}`)
    }
    
    const subcategoryStats: SubcategoryStats = {}
    subcategoryData?.forEach(row => {
      if (row.subcategory_id) {
        subcategoryStats[row.subcategory_id] = (subcategoryStats[row.subcategory_id] || 0) + 1
      }
    })
    
    // 上位10位のサブカテゴリー
    const topSubcategories = Object.entries(subcategoryStats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [key, value]) => {
        obj[key] = value
        return obj
      }, {} as SubcategoryStats)
    
    console.log(`✅ Stats API Success: ${totalCount} total questions`)
    
    return NextResponse.json({
      total: totalCount || 0,
      categories: categoryStats,
      difficulties: difficultyStats,
      topSubcategories,
      generatedAt: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('❌ Stats API Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch statistics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}