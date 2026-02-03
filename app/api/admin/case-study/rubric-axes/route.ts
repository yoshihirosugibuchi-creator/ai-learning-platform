import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 管理者用 ルーブリック軸API
 * GET  /api/admin/case-study/rubric-axes - 一覧取得
 * POST /api/admin/case-study/rubric-axes - 新規作成
 */

// Service Role用Supabaseクライアント
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// 認証・権限チェック
async function checkAdminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  // 開発環境でのテスト用バイパス
  if (process.env.NODE_ENV === 'development') {
    const testUserId = request.headers.get('x-test-user-id')
    const testRole = request.headers.get('x-test-role')
    if (testUserId && testRole && ['admin', 'system_admin'].includes(testRole)) {
      return { userId: testUserId, role: testRole }
    }
  }

  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const supabaseAdmin = getSupabaseAdmin()
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !user) {
    return null
  }

  // ユーザーのロールを確認
  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'system_admin'].includes(userData.role)) {
    return null
  }

  return { userId: user.id, role: userData.role }
}

interface GroupedAxis {
  group_code: string
  group_name: string
  axes: Array<{
    axis_code: string
    axis_name: string
    definition: string
  }>
}

/**
 * ルーブリック軸をプロンプト用のテキスト形式に変換
 */
function generatePromptText(groups: GroupedAxis[]): string {
  let text = '【10軸ルーブリック評価システム】\n'

  const sortedGroups = [...groups].sort((a, b) => a.group_code.localeCompare(b.group_code))
  for (const group of sortedGroups) {
    text += `\nグループ${group.group_code}: ${group.group_name}\n`

    for (const axis of group.axes) {
      text += `  - ${axis.axis_code}（${axis.axis_name}）: ${axis.definition}\n`
    }
  }

  return text
}

// GET: ルーブリック軸一覧取得
export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('include_inactive') === 'true'

    let query = supabaseAdmin
      .from('case_study_rubric_axes')
      .select('*')
      .order('display_order')

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: axes, error } = await query

    if (error) {
      console.error('Rubric axes fetch error:', error)
      return NextResponse.json(
        { success: false, error: 'ルーブリック軸の取得に失敗しました' },
        { status: 500 }
      )
    }

    // グループ別に整理
    const groupedAxes = (axes || []).reduce((acc, axis) => {
      const group = axis.rubric_group_code
      if (!acc[group]) {
        acc[group] = {
          group_code: group,
          group_name: axis.rubric_group_name,
          axes: []
        }
      }
      acc[group].axes.push(axis)
      return acc
    }, {} as Record<string, { group_code: string; group_name: string; axes: typeof axes }>)

    // プロンプト生成用のテキストを生成
    const promptText = generatePromptText(Object.values(groupedAxes))

    return NextResponse.json({
      success: true,
      axes: axes || [],
      grouped: Object.values(groupedAxes),
      promptText
    })

  } catch (error) {
    console.error('Admin rubric axes error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POST: ルーブリック軸を新規作成
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      axis_code,
      axis_name,
      rubric_group_code,
      rubric_group_name,
      definition,
      evaluation_points,
      score_anchors,
      display_order,
    } = body

    if (!axis_code || !axis_name || !rubric_group_code || !rubric_group_name || !definition || !score_anchors) {
      return NextResponse.json(
        { success: false, error: 'axis_code, axis_name, rubric_group_code, rubric_group_name, definition, score_anchors は必須です' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from('case_study_rubric_axes')
      .insert({
        axis_code,
        axis_name,
        rubric_group_code,
        rubric_group_name,
        definition,
        evaluation_points: evaluation_points || [],
        score_anchors,
        display_order: display_order || 99,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Rubric axis create error:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { success: false, error: '同じaxis_codeが既に存在します' },
          { status: 409 }
        )
      }
      return NextResponse.json(
        { success: false, error: '作成に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, axis: data }, { status: 201 })
  } catch (error) {
    console.error('Rubric axis POST error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
