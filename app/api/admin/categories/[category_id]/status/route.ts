import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Database } from '@/lib/database-types-official'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ category_id: string }> }
) {
  try {
    const { category_id } = await params
    const body = await request.json()
    const { is_active, activation_date } = body

    if (typeof is_active !== 'boolean') {
      return NextResponse.json(
        { error: 'is_active must be a boolean value' },
        { status: 400 }
      )
    }

    // カテゴリーの存在確認
    const { data: existingCategory, error: fetchError } = await supabaseAdmin
      .from('categories')
      .select('category_id, name, type, is_active')
      .eq('category_id', category_id)
      .single()

    if (fetchError || !existingCategory) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // 更新データの準備
    const updates: Database['public']['Tables']['categories']['Update'] = {
      is_active,
      updated_at: new Date().toISOString()
    }

    // アクティブ化の場合はactivation_dateを設定
    if (is_active) {
      updates.activation_date = activation_date || new Date().toISOString()
    } else {
      // 非アクティブ化の場合はactivation_dateをクリア
      updates.activation_date = null
    }

    // カテゴリー状態を更新
    const updateResult = await supabaseAdmin
      .from('categories')
      .update(updates)
      .eq('category_id', category_id)
      .select(`
        category_id,
        name,
        type,
        is_active,
        activation_date,
        updated_at
      `)
      .single()
    
    const { data: updatedCategory, error: updateError } = updateResult

    if (updateError) {
      console.error('Error updating category status:', updateError)
      return NextResponse.json(
        { error: 'Failed to update category status' },
        { status: 500 }
      )
    }

    // サブカテゴリーの状態も同期更新（オプション）
    // メインカテゴリーが無効化された場合、サブカテゴリーも無効化
    if (!is_active && existingCategory.type === 'main') {
      const subUpdateData: Database['public']['Tables']['subcategories']['Update'] = {
        is_active: false,
        updated_at: new Date().toISOString()
      }
      const subUpdateResult = await supabaseAdmin
        .from('subcategories')
        .update(subUpdateData)
        .eq('parent_category_id', category_id)
      
      const { error: subUpdateError } = subUpdateResult

      if (subUpdateError) {
        console.warn('Warning: Failed to update subcategories status:', subUpdateError)
      }
    }

    // レスポンス
    const statusText = is_active ? 'activated' : 'deactivated'
    const response = {
      category: updatedCategory,
      message: `Category ${statusText} successfully`,
      previous_status: existingCategory.is_active,
      new_status: is_active,
      activation_date: updatedCategory.activation_date
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Category Status Update Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ category_id: string }> }
) {
  try {
    const { category_id } = await params

    // カテゴリーの現在の状態を取得
    const { data: category, error } = await supabaseAdmin
      .from('categories')
      .select(`
        category_id,
        name,
        type,
        is_active,
        activation_date,
        created_at,
        updated_at
      `)
      .eq('category_id', category_id)
      .single()

    if (error || !category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      )
    }

    // 関連するサブカテゴリーの状態も取得
    const { data: subcategories, error: subError } = await supabaseAdmin
      .from('subcategories')
      .select(`
        subcategory_id,
        name,
        is_active
      `)
      .eq('parent_category_id', category_id)
      .eq('is_visible', true)

    if (subError) {
      console.warn('Warning: Failed to fetch subcategories:', subError.message)
    }

    const response = {
      category,
      subcategories: subcategories || [],
      meta: {
        subcategory_count: subcategories?.length || 0,
        active_subcategory_count: subcategories?.filter(sub => sub.is_active).length || 0,
        status_history: {
          created_at: category.created_at,
          last_updated: category.updated_at,
          activation_date: category.activation_date
        }
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Category Status Get Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}