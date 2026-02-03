import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 管理者用 クイズパックAPI
 * GET /api/admin/quiz-packs - 一覧取得
 * POST /api/admin/quiz-packs - 新規作成
 */

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

// GET: パック一覧取得
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
    const includeUnpublished = searchParams.get('include_unpublished') !== 'false'

    let query = supabaseAdmin
      .from('quiz_packs')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (!includeUnpublished) {
      query = query.eq('is_published', true)
    }

    const { data: packs, error } = await query

    if (error) {
      console.error('Quiz packs fetch error:', error)
      return NextResponse.json(
        { success: false, error: 'パック一覧の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      packs: packs || []
    })

  } catch (error) {
    console.error('Admin quiz packs error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POST: パック作成
export async function POST(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()

    const {
      name,
      description,
      question_count = 10,
      categories,
      subcategories,
      difficulties,
      is_published = false,
      display_order = 0,
      icon_emoji = '📝',
      color_theme = 'primary'
    } = body

    // バリデーション
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'パック名は必須です' },
        { status: 400 }
      )
    }

    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return NextResponse.json(
        { success: false, error: 'カテゴリーを1つ以上選択してください' },
        { status: 400 }
      )
    }

    if (!difficulties || !Array.isArray(difficulties) || difficulties.length === 0) {
      return NextResponse.json(
        { success: false, error: '難易度を1つ以上選択してください' },
        { status: 400 }
      )
    }

    if (question_count < 10) {
      return NextResponse.json(
        { success: false, error: '問題数は10問以上である必要があります' },
        { status: 400 }
      )
    }

    // パック作成
    const { data: pack, error: createError } = await supabaseAdmin
      .from('quiz_packs')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        question_count,
        categories,
        subcategories: subcategories && subcategories.length > 0 ? subcategories : null,
        difficulties,
        is_published,
        display_order,
        icon_emoji,
        color_theme,
        created_by: auth.userId
      })
      .select()
      .single()

    if (createError || !pack) {
      console.error('Quiz pack creation error:', createError)
      return NextResponse.json(
        { success: false, error: 'パックの作成に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      pack
    }, { status: 201 })

  } catch (error) {
    console.error('Admin quiz pack creation error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
