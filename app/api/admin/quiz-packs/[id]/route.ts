import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 管理者用 クイズパック個別API
 * GET /api/admin/quiz-packs/[id] - 詳細取得
 * PUT /api/admin/quiz-packs/[id] - 更新
 * DELETE /api/admin/quiz-packs/[id] - 削除
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

// GET: パック詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()

    const { data: pack, error } = await supabaseAdmin
      .from('quiz_packs')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !pack) {
      return NextResponse.json(
        { success: false, error: 'パックが見つかりません' },
        { status: 404 }
      )
    }

    // 対象問題数を取得
    let questionCountQuery = supabaseAdmin
      .from('quiz_questions')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)

    if (pack.categories && pack.categories.length > 0) {
      questionCountQuery = questionCountQuery.in('category_id', pack.categories)
    }

    if (pack.subcategories && pack.subcategories.length > 0) {
      questionCountQuery = questionCountQuery.in('subcategory_id', pack.subcategories)
    }

    if (pack.difficulties && pack.difficulties.length > 0) {
      questionCountQuery = questionCountQuery.in('difficulty', pack.difficulties)
    }

    const { count: availableQuestions } = await questionCountQuery

    return NextResponse.json({
      success: true,
      pack,
      available_questions: availableQuestions || 0
    })

  } catch (error) {
    console.error('Quiz pack fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PUT: パック更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()

    // 許可されたフィールドのみ更新
    const allowedFields = [
      'name', 'description', 'question_count', 'categories',
      'subcategories', 'difficulties', 'is_published', 'display_order',
      'icon_emoji', 'color_theme'
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (field in body) {
        if (field === 'name' && body[field]) {
          updateData[field] = body[field].trim()
        } else if (field === 'description') {
          updateData[field] = body[field]?.trim() || null
        } else if (field === 'subcategories') {
          updateData[field] = body[field] && body[field].length > 0 ? body[field] : null
        } else {
          updateData[field] = body[field]
        }
      }
    }

    // バリデーション
    if ('name' in updateData && !updateData.name) {
      return NextResponse.json(
        { success: false, error: 'パック名は必須です' },
        { status: 400 }
      )
    }

    if ('categories' in updateData) {
      const cats = updateData.categories as string[]
      if (!cats || cats.length === 0) {
        return NextResponse.json(
          { success: false, error: 'カテゴリーを1つ以上選択してください' },
          { status: 400 }
        )
      }
    }

    if ('difficulties' in updateData) {
      const diffs = updateData.difficulties as string[]
      if (!diffs || diffs.length === 0) {
        return NextResponse.json(
          { success: false, error: '難易度を1つ以上選択してください' },
          { status: 400 }
        )
      }
    }

    if ('question_count' in updateData && (updateData.question_count as number) < 10) {
      return NextResponse.json(
        { success: false, error: '問題数は10問以上である必要があります' },
        { status: 400 }
      )
    }

    const { data: pack, error } = await supabaseAdmin
      .from('quiz_packs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error || !pack) {
      console.error('Quiz pack update error:', error)
      return NextResponse.json(
        { success: false, error: 'パックの更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      pack
    })

  } catch (error) {
    console.error('Quiz pack update error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// DELETE: パック削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '管理者権限が必要です' },
        { status: 403 }
      )
    }

    const { id } = await params
    const supabaseAdmin = getSupabaseAdmin()

    // 使用中のセッションがあるか確認
    const { count: sessionCount } = await supabaseAdmin
      .from('quiz_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('pack_id', id)

    if (sessionCount && sessionCount > 0) {
      // セッションがある場合は非公開にするのみ
      const { error } = await supabaseAdmin
        .from('quiz_packs')
        .update({ is_published: false })
        .eq('id', id)

      if (error) {
        return NextResponse.json(
          { success: false, error: 'パックの非公開化に失敗しました' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: '使用履歴があるため非公開に変更しました'
      })
    }

    // セッションがなければ削除
    const { error } = await supabaseAdmin
      .from('quiz_packs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Quiz pack delete error:', error)
      return NextResponse.json(
        { success: false, error: 'パックの削除に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'パックを削除しました'
    })

  } catch (error) {
    console.error('Quiz pack delete error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
