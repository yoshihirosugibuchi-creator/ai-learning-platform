import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// 実際のselect結果に合わせたインターフェース
interface CategoryData {
  category_id: string
  name: string
  description: string | null
  type: string
  icon: string | null
  color: string | null
  display_order: number
  is_active: boolean
  is_visible: boolean
  activation_date: string | null
  created_at: string | null
  updated_at: string | null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'main', 'industry', or null (all)
    const activeOnly = searchParams.get('active_only') === 'true'
    // const includeInactive = searchParams.get('include_inactive') === 'true' // 未実装

    // 管理者向けのクエリ（全カテゴリー、統計情報付き）
    let query = supabaseAdmin
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
        activation_date,
        created_at,
        updated_at
      `)
      .order('type')
      .order('display_order')

    // タイプフィルター
    if (type) {
      query = query.eq('type', type)
    }

    // アクティブフィルター
    if (activeOnly) {
      query = query.eq('is_active', true)
    }
    // 管理者APIは常にすべてのカテゴリー（有効・無効両方）を返す

    const { data: categories, error } = await query

    if (error) {
      console.error('Error fetching admin categories:', error)
      return NextResponse.json(
        { error: 'Failed to fetch categories' },
        { status: 500 }
      )
    }

    // 各カテゴリーの統計情報を取得  
    type CategoryWithStats = {
      category_id: string;
      name: string;
      description: string | null;
      type: string;
      icon: string | null;
      color: string | null;
      display_order: number;
      is_active: boolean;
      is_visible: boolean;
      activation_date: string | null;
      created_at: string | null;
      updated_at: string | null;
      subcategory_count: number;
      question_count: number;
      last_updated: string | null;
    }
    const categoriesWithStats: CategoryWithStats[] = await Promise.all(
      (categories || []).map(async (category: CategoryData) => {
        // サブカテゴリー数を取得
        const { count: subcategoriesCount, error: subError } = await supabaseAdmin
          .from('subcategories')
          .select('*', { count: 'exact', head: true })
          .eq('parent_category_id', category.category_id)
          .eq('is_visible', true)

        if (subError) {
          console.warn('Warning: Failed to count subcategories for category', category.category_id, subError.message)
        }

        // クイズ数を取得（サブカテゴリー経由）
        const { count: quizCount, error: quizError } = await supabaseAdmin
          .from('quiz_questions')
          .select('*', { count: 'exact', head: true })
          .eq('category_id', category.category_id)
          .neq('is_deleted', true)

        if (quizError) {
          console.warn('Warning: Failed to count quiz questions for category', category.category_id, quizError.message)
        }

        return {
          ...category,
          subcategory_count: subcategoriesCount || 0,
          question_count: quizCount || 0,
          last_updated: category.updated_at
        } satisfies CategoryWithStats
      })
    )

    // レスポンス形式を整形
    const response = {
      categories: categoriesWithStats,
      meta: {
        total: categoriesWithStats.length,
        main_count: categoriesWithStats.filter((cat: CategoryWithStats) => cat.type === 'main').length,
        industry_count: categoriesWithStats.filter((cat: CategoryWithStats) => cat.type === 'industry').length,
        active_count: categoriesWithStats.filter((cat: CategoryWithStats) => cat.is_active).length,
        inactive_count: categoriesWithStats.filter((cat: CategoryWithStats) => !cat.is_active).length,
        total_subcategories: categoriesWithStats.reduce((sum: number, cat: CategoryWithStats) => sum + cat.subcategory_count, 0),
        total_quizzes: categoriesWithStats.reduce((sum: number, cat: CategoryWithStats) => sum + cat.question_count, 0)
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Admin Categories API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { category_id, updates } = body

    if (!category_id || !updates) {
      return NextResponse.json(
        { error: 'Missing category_id or updates' },
        { status: 400 }
      )
    }

    // 許可された更新フィールドのみ
    const allowedFields = [
      'name',
      'description',
      'icon',
      'color',
      'display_order',
      'is_active',
      'activation_date'
    ]

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowedFields.includes(key))
    )

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // updated_atを自動設定
    filteredUpdates.updated_at = new Date().toISOString()

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update(filteredUpdates)
      .eq('category_id', category_id)
      .select()

    if (error) {
      console.error('Error updating category:', error)
      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      category: data[0],
      message: 'Category updated successfully'
    })

  } catch (error) {
    console.error('Admin Categories PATCH Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      category_id,
      name,
      description,
      type,
      icon,
      color,
      display_order,
      is_active = false
    } = body

    // 必須フィールドのバリデーション
    if (!category_id || !name || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: category_id, name, type' },
        { status: 400 }
      )
    }

    // typeのバリデーション
    if (!['main', 'industry'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be "main" or "industry"' },
        { status: 400 }
      )
    }

    const newCategory = {
      category_id,
      name,
      description: description || '',
      type,
      icon: icon || '📂',
      color: color || '#6B7280',
      display_order: display_order || 999,
      is_active,
      is_visible: true,
      activation_date: is_active ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert([newCategory])
      .select()

    if (error) {
      console.error('Error creating category:', error)
      return NextResponse.json(
        { error: 'Failed to create category' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      category: data[0],
      message: 'Category created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Admin Categories POST Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}