import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUserRole, checkUserPermission } from '@/lib/auth-helpers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: 単一生成ログ取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, error: authError } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }
    const { hasPermission } = await checkUserPermission(userId, ['admin', 'system_admin'])
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const { data: log, error } = await supabaseAdmin
      .from('case_study_generation_logs')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Generation log not found' }, { status: 404 })
      }
      console.error('Generation log fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      log,
    })
  } catch (error) {
    console.error('Generation log GET API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: 生成ログ更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, error: authError } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }
    const { hasPermission } = await checkUserPermission(userId, ['admin', 'system_admin'])
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // 更新可能フィールド
    const allowedFields = [
      'category_id',
      'subcategory_id',
      'difficulty',
      'industry_id',
      'job_role_code',
      'business_phase_code',
      'scenario_type_code',
      'info_clarity_code',
      'step_count',
      'question_type',
      'custom_prompt',
      'ai_model',
      'current_step',
      'generated_prompt',
      'ai_response_text',
      'parsed_data',
      'draft_title',
      'status',
      'problem_id',
    ]

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field]
      }
    }

    // タイトル自動更新（パラメータ変更時）
    if (body.auto_update_title && (body.industry_name || body.difficulty || body.scenario_type_name)) {
      const titleParts: string[] = []
      if (body.industry_name) titleParts.push(body.industry_name)
      if (body.difficulty) {
        const difficultyNames: Record<string, string> = {
          basic: '初級',
          intermediate: '中級',
          advanced: '上級',
          expert: 'エキスパート',
        }
        titleParts.push(difficultyNames[body.difficulty] || body.difficulty)
      }
      if (body.scenario_type_name) titleParts.push(body.scenario_type_name)
      if (titleParts.length > 0) {
        updateData.draft_title = titleParts.join('×')
      }
    }

    const { data: log, error } = await supabaseAdmin
      .from('case_study_generation_logs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Generation log not found' }, { status: 404 })
      }
      console.error('Generation log update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      log,
    })
  } catch (error) {
    console.error('Generation log PUT API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: 生成ログ削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, error: authError } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }
    const { hasPermission } = await checkUserPermission(userId, ['admin', 'system_admin'])
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params

    const { error } = await supabaseAdmin
      .from('case_study_generation_logs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Generation log delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Generation log deleted',
    })
  } catch (error) {
    console.error('Generation log DELETE API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
