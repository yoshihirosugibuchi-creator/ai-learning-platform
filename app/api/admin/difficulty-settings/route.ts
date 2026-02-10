import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/difficulty-settings
 * difficulty_distribution_settings テーブルの全レコードを取得
 */
export async function GET(request: Request) {
  try {
    // 認証チェック
    const { userId, role, error: authError } = await getCurrentUserRole(request)
    if (!userId || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限チェック
    if (role !== 'admin' && role !== 'system_admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const { data, error } = await supabaseAdmin
      .from('difficulty_distribution_settings')
      .select('*')
      .order('accuracy_range_min', { ascending: true })

    if (error) {
      console.error('Error fetching difficulty settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      count: data?.length || 0
    })
  } catch (error) {
    console.error('Error in GET difficulty-settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/difficulty-settings
 * 難易度分布設定を更新
 */
export async function PUT(request: Request) {
  try {
    // 認証チェック
    const { userId, role, error: authError } = await getCurrentUserRole(request)
    if (!userId || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限チェック
    if (role !== 'admin' && role !== 'system_admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const { id, basic_percent, intermediate_percent, advanced_percent, expert_percent, description, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
    }

    // パーセンテージ合計チェック
    const total = (basic_percent || 0) + (intermediate_percent || 0) + (advanced_percent || 0) + (expert_percent || 0)
    if (total !== 100) {
      return NextResponse.json({
        error: `Percentages must sum to 100 (current: ${total})`
      }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('difficulty_distribution_settings')
      .update({
        basic_percent,
        intermediate_percent,
        advanced_percent,
        expert_percent,
        description,
        is_active,
        updated_at: new Date().toISOString(),
        updated_by: userId
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating difficulty settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Settings updated successfully'
    })
  } catch (error) {
    console.error('Error in PUT difficulty-settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/difficulty-settings
 * 新規難易度分布設定を作成
 */
export async function POST(request: Request) {
  try {
    // 認証チェック
    const { userId, role, error: authError } = await getCurrentUserRole(request)
    if (!userId || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 管理者権限チェック
    if (role !== 'admin' && role !== 'system_admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await request.json()
    const {
      accuracy_range_min,
      accuracy_range_max,
      basic_percent,
      intermediate_percent,
      advanced_percent,
      expert_percent,
      description,
      is_active = true
    } = body

    // 必須パラメータチェック
    if (accuracy_range_min === undefined || accuracy_range_max === undefined) {
      return NextResponse.json({
        error: 'Missing required parameters: accuracy_range_min, accuracy_range_max'
      }, { status: 400 })
    }

    // 範囲チェック
    if (accuracy_range_min < 0 || accuracy_range_max > 100 || accuracy_range_min >= accuracy_range_max) {
      return NextResponse.json({
        error: 'Invalid accuracy range'
      }, { status: 400 })
    }

    // パーセンテージ合計チェック
    const total = (basic_percent || 0) + (intermediate_percent || 0) + (advanced_percent || 0) + (expert_percent || 0)
    if (total !== 100) {
      return NextResponse.json({
        error: `Percentages must sum to 100 (current: ${total})`
      }, { status: 400 })
    }

    // 重複チェック
    const { data: existing } = await supabaseAdmin
      .from('difficulty_distribution_settings')
      .select('id')
      .gte('accuracy_range_max', accuracy_range_min)
      .lte('accuracy_range_min', accuracy_range_max)

    if (existing && existing.length > 0) {
      return NextResponse.json({
        error: 'Accuracy range overlaps with existing settings'
      }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('difficulty_distribution_settings')
      .insert({
        accuracy_range_min,
        accuracy_range_max,
        basic_percent: basic_percent || 25,
        intermediate_percent: intermediate_percent || 25,
        advanced_percent: advanced_percent || 25,
        expert_percent: expert_percent || 25,
        description,
        is_active,
        created_by: userId
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating difficulty settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Settings created successfully'
    })
  } catch (error) {
    console.error('Error in POST difficulty-settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/difficulty-settings
 * 難易度分布設定を削除
 */
export async function DELETE(request: Request) {
  try {
    // 認証チェック
    const { userId, role, error: authError } = await getCurrentUserRole(request)
    if (!userId || authError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // system_admin権限チェック
    if (role !== 'system_admin') {
      return NextResponse.json({ error: 'Forbidden - System admin only' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('difficulty_distribution_settings')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting difficulty settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Settings deleted successfully'
    })
  } catch (error) {
    console.error('Error in DELETE difficulty-settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
