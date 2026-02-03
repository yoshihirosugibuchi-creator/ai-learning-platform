import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 管理者用 ケーススタディ問題一覧API
 * GET /api/admin/case-study/problems
 * POST /api/admin/case-study/problems (新規作成)
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

// GET: 問題一覧取得
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

    // クエリパラメータ
    const status = searchParams.get('status') // draft, review, active, archived
    const difficulty = searchParams.get('difficulty')
    const categoryId = searchParams.get('category_id')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // クエリ構築
    let query = supabaseAdmin
      .from('case_study_problems')
      .select('*, case_study_steps(count)', { count: 'exact' })

    if (status) {
      query = query.eq('status', status)
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty)
    }
    if (categoryId) {
      query = query.eq('primary_category_id', categoryId)
    }
    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: problems, error, count } = await query

    if (error) {
      console.error('Problems fetch error:', error)
      return NextResponse.json(
        { success: false, error: '問題一覧の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      problems: problems || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Admin problems list error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POST: 新規問題作成
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
      title,
      case_text,
      primary_category_id,
      primary_subcategory_id,
      difficulty = 'intermediate',
      industry,
      scenario_type,
      estimated_minutes = 30,
      step_count = 5,
      status = 'draft',
      steps = []
    } = body

    // バリデーション
    if (!title || !case_text || !primary_category_id || !primary_subcategory_id) {
      return NextResponse.json(
        { success: false, error: '必須フィールドが不足しています' },
        { status: 400 }
      )
    }

    // 問題作成
    const { data: problem, error: problemError } = await supabaseAdmin
      .from('case_study_problems')
      .insert({
        title,
        case_text,
        primary_category_id,
        primary_subcategory_id,
        difficulty,
        industry,
        scenario_type,
        estimated_minutes,
        step_count,
        status,
        created_by: auth.userId
      })
      .select()
      .single()

    if (problemError || !problem) {
      console.error('Problem creation error:', problemError)
      return NextResponse.json(
        { success: false, error: '問題の作成に失敗しました' },
        { status: 500 }
      )
    }

    // ステップがあれば作成
    if (steps.length > 0) {
      const stepsData = steps.map((step: Record<string, unknown>, index: number) => ({
        problem_id: problem.id,
        step_number: index + 1,
        step_name: step.step_name || `ステップ ${index + 1}`,
        description: step.description || '',
        category_id: step.category_id || primary_category_id,
        subcategory_id: step.subcategory_id || primary_subcategory_id,
        question_type: step.question_type || 'text',
        options: step.options || null,
        model_answer: step.model_answer || {},
        hint: step.hint || null,
        target_skills: step.target_skills || [],
        max_score: step.max_score || 5,
        display_order: index + 1
      }))

      const { error: stepsError } = await supabaseAdmin
        .from('case_study_steps')
        .insert(stepsData)

      if (stepsError) {
        console.error('Steps creation error:', stepsError)
        // ステップ作成に失敗しても問題は作成されているので警告のみ
      }
    }

    return NextResponse.json({
      success: true,
      problem
    }, { status: 201 })

  } catch (error) {
    console.error('Admin problem creation error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
