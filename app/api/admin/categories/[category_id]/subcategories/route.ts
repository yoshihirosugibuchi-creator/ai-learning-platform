import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * サブカテゴリー一覧取得API
 * GET /api/admin/categories/[category_id]/subcategories
 * 指定したカテゴリーに属するサブカテゴリーを取得
 */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

interface RouteParams {
  params: Promise<{ category_id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { category_id: categoryId } = await params

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: 'カテゴリーIDは必須です' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data: subcategories, error } = await supabaseAdmin
      .from('subcategories')
      .select('subcategory_id, name, description, icon, is_active')
      .eq('parent_category_id', categoryId)
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Subcategories fetch error:', error)
      return NextResponse.json(
        { success: false, error: 'サブカテゴリーの取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      subcategories: (subcategories || []).map(s => ({
        id: s.subcategory_id,
        name: s.name,
        description: s.description,
        icon: s.icon
      }))
    })
  } catch (error) {
    console.error('Subcategories API error:', error)
    return NextResponse.json(
      { success: false, error: 'サブカテゴリーの取得に失敗しました' },
      { status: 500 }
    )
  }
}
