import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUserRole, checkUserPermission } from '@/lib/auth-helpers'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: 生成ログ一覧取得
export async function GET(request: NextRequest) {
  try {
    const { userId, error: authError } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }
    const { hasPermission } = await checkUserPermission(userId, ['admin', 'system_admin'])
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'draft'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    let query = supabaseAdmin
      .from('case_study_generation_logs')
      .select(`
        id,
        draft_title,
        category_id,
        subcategory_id,
        difficulty,
        industry_id,
        ai_model,
        current_step,
        status,
        problem_id,
        created_at,
        updated_at
      `)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('Generation logs fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // カテゴリー名を取得
    const categoryIds = [...new Set(logs?.map(l => l.category_id).filter(Boolean))]
    const industryIds = [...new Set(logs?.map(l => l.industry_id).filter(Boolean))]
    const allCategoryIds = [...new Set([...categoryIds, ...industryIds])]

    let categoriesMap: Record<string, string> = {}
    if (allCategoryIds.length > 0) {
      const { data: categories } = await supabaseAdmin
        .from('categories')
        .select('category_id, name')
        .in('category_id', allCategoryIds)

      if (categories) {
        categoriesMap = Object.fromEntries(categories.map(c => [c.category_id, c.name]))
      }
    }

    // ログにカテゴリー名を追加
    const logsWithNames = logs?.map(log => ({
      ...log,
      category_name: log.category_id ? categoriesMap[log.category_id] : null,
      industry_name: log.industry_id ? categoriesMap[log.industry_id] : null,
    }))

    return NextResponse.json({
      success: true,
      logs: logsWithNames || [],
    })
  } catch (error) {
    console.error('Generation logs API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: 新規生成ログ作成
export async function POST(request: NextRequest) {
  try {
    const { userId, error: authError } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }
    const { hasPermission } = await checkUserPermission(userId, ['admin', 'system_admin'])
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // 自動タイトル生成
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

    const draftTitle = titleParts.length > 0
      ? titleParts.join('×')
      : `下書き ${new Date().toLocaleString('ja-JP')}`

    const insertData = {
      category_id: body.category_id || null,
      subcategory_id: body.subcategory_id || null,
      difficulty: body.difficulty || null,
      industry_id: body.industry_id || null,
      job_role_code: body.job_role_code || null,
      business_phase_code: body.business_phase_code || null,
      scenario_type_code: body.scenario_type_code || null,
      info_clarity_code: body.info_clarity_code || null,
      step_count: body.step_count || 5,
      question_type: body.question_type || 'hybrid',
      custom_prompt: body.custom_prompt || null,
      ai_model: body.ai_model || 'chatgpt',
      current_step: body.current_step || 1,
      generated_prompt: body.generated_prompt || null,
      ai_response_text: body.ai_response_text || null,
      parsed_data: body.parsed_data || null,
      draft_title: draftTitle,
      status: 'draft',
      created_by: userId,
    }

    const { data: log, error } = await supabaseAdmin
      .from('case_study_generation_logs')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Generation log create error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      log,
    })
  } catch (error) {
    console.error('Generation log create API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
