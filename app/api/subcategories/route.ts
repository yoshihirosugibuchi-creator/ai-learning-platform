import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const parentCategoryId = searchParams.get('parent_category_id')
    const activeOnly = searchParams.get('active_only') === 'true'

    // クエリ構築
    let query = supabase
      .from('subcategories')
      .select(`
        subcategory_id,
        name,
        description,
        parent_category_id,
        icon,
        display_order,
        is_active,
        is_visible,
        activation_date
      `)
      .eq('is_visible', true)
      .order('parent_category_id')
      .order('display_order')

    // 親カテゴリーフィルター
    if (parentCategoryId) {
      query = query.eq('parent_category_id', parentCategoryId)
    }

    // アクティブフィルター
    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: subcategories, error } = await query

    if (error) {
      console.error('Error fetching subcategories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subcategories' },
        { status: 500 }
      )
    }

    // 親カテゴリー別にグループ化
    const groupedSubcategories: Record<string, typeof subcategories> = {}
    subcategories?.forEach(sub => {
      if (!groupedSubcategories[sub.parent_category_id]) {
        groupedSubcategories[sub.parent_category_id] = []
      }
      groupedSubcategories[sub.parent_category_id].push(sub)
    })

    // レスポンス形式を整形
    const response = {
      subcategories: subcategories || [],
      grouped_subcategories: groupedSubcategories,
      meta: {
        total: subcategories?.length || 0,
        active_count: subcategories?.filter(sub => sub.is_active).length || 0,
        inactive_count: subcategories?.filter(sub => !sub.is_active).length || 0,
        parent_categories: Object.keys(groupedSubcategories).length
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}