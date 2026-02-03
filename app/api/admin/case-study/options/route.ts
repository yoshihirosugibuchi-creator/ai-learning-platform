import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * ケーススタディ用オプションマスタAPI
 * GET  /api/admin/case-study/options - 一覧取得
 * POST /api/admin/case-study/options - 新規作成
 */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function checkAdminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (process.env.NODE_ENV === 'development') {
    const testUserId = request.headers.get('x-test-user-id')
    const testRole = request.headers.get('x-test-role')
    if (testUserId && testRole && ['admin', 'system_admin'].includes(testRole)) {
      return { userId: testUserId, role: testRole }
    }
  }

  if (!authHeader?.startsWith('Bearer ')) return null

  const supabaseAdmin = getSupabaseAdmin()
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'system_admin'].includes(userData.role)) return null
  return { userId: user.id, role: userData.role }
}

const VALID_OPTION_TYPES = ['job_role', 'business_phase', 'scenario_type', 'info_clarity', 'step_framework']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const optionType = searchParams.get('type')
    const activeOnly = searchParams.get('active_only') !== 'false' // デフォルトtrue

    const supabaseAdmin = getSupabaseAdmin()

    let query = supabaseAdmin
      .from('case_study_options')
      .select('id, option_type, code, name, name_en, description, display_order, is_active, target_skills, is_extended')
      .order('option_type')
      .order('display_order')

    // タイプフィルター
    if (optionType) {
      if (!VALID_OPTION_TYPES.includes(optionType)) {
        return NextResponse.json(
          {
            success: false,
            error: `無効なオプションタイプです。有効な値: ${VALID_OPTION_TYPES.join(', ')}`
          },
          { status: 400 }
        )
      }
      query = query.eq('option_type', optionType)
    }

    // アクティブフィルター
    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: options, error } = await query

    if (error) {
      console.error('Case study options fetch error:', error)
      return NextResponse.json(
        { success: false, error: 'オプションの取得に失敗しました' },
        { status: 500 }
      )
    }

    // タイプ別にグループ化
    const grouped: Record<string, typeof options> = {}
    for (const opt of options || []) {
      if (!grouped[opt.option_type]) {
        grouped[opt.option_type] = []
      }
      grouped[opt.option_type].push(opt)
    }

    return NextResponse.json({
      success: true,
      options: options || [],
      grouped,
      meta: {
        total: options?.length || 0,
        types: Object.keys(grouped),
        counts: Object.fromEntries(
          Object.entries(grouped).map(([type, items]) => [type, items.length])
        )
      }
    })
  } catch (error) {
    console.error('Case study options API error:', error)
    return NextResponse.json(
      { success: false, error: 'オプションの取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const body = await request.json()
    const { option_type, code, name, name_en, description, display_order, target_skills, is_extended } = body

    if (!option_type || !code || !name) {
      return NextResponse.json(
        { success: false, error: 'option_type, code, name は必須です' },
        { status: 400 }
      )
    }

    if (!VALID_OPTION_TYPES.includes(option_type)) {
      return NextResponse.json(
        { success: false, error: `無効なオプションタイプです。有効な値: ${VALID_OPTION_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from('case_study_options')
      .insert({
        option_type,
        code,
        name,
        name_en: name_en || null,
        description: description || null,
        display_order: display_order || 0,
        target_skills: target_skills || null,
        is_extended: is_extended || false,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Option create error:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: '同じoption_typeとcodeの組み合わせが既に存在します' },
          { status: 409 }
        )
      }
      return NextResponse.json({ success: false, error: '作成に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, option: data }, { status: 201 })
  } catch (error) {
    console.error('Option POST error:', error)
    return NextResponse.json({ success: false, error: 'サーバーエラー' }, { status: 500 })
  }
}
