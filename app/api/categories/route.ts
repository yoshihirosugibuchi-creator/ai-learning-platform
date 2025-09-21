import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'main', 'industry', or null (all)
    const activeOnly = searchParams.get('active_only') === 'true'

    // クエリ構築
    let query = supabase
      .from('categories')
      .select(`
        category_id,
        name,
        description,
        type,
        icon,
        color,
        display_order,
        is_active,
        is_visible,
        activation_date
      `)
      .eq('is_visible', true)
      .order('type')
      .order('display_order')

    // タイプフィルター
    if (type) {
      query = query.eq('type', type)
    }

    // アクティブフィルター (デフォルトはアクティブのみ)
    if (activeOnly !== false) {
      query = query.eq('is_active', true)
    }

    const { data: categories, error } = await query

    if (error) {
      console.error('Error fetching categories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    // レスポンス形式を整形
    const response = {
      categories: categories || [],
      meta: {
        total: categories?.length || 0,
        main_count: categories?.filter(cat => cat.type === 'main').length || 0,
        industry_count: categories?.filter(cat => cat.type === 'industry').length || 0,
        active_count: categories?.filter(cat => cat.is_active).length || 0,
        inactive_count: categories?.filter(cat => !cat.is_active).length || 0
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