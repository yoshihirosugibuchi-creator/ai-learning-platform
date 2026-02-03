import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * ケーススタディ ステップ個別管理API
 * GET /api/admin/case-study/steps/[stepId] - ステップ詳細取得
 * PUT /api/admin/case-study/steps/[stepId] - ステップ更新
 * DELETE /api/admin/case-study/steps/[stepId] - ステップ削除
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

interface RouteParams {
  params: Promise<{ stepId: string }>
}

// ステップ詳細取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { stepId } = await params

    const supabaseAdmin = getSupabaseAdmin()

    const { data: step, error } = await supabaseAdmin
      .from('case_study_steps')
      .select('*')
      .eq('id', stepId)
      .single()

    if (error || !step) {
      return NextResponse.json(
        { success: false, error: 'ステップが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      step
    })
  } catch (error) {
    console.error('Step GET error:', error)
    return NextResponse.json(
      { success: false, error: 'ステップの取得に失敗しました' },
      { status: 500 }
    )
  }
}

// ステップ更新
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const { stepId } = await params
    const body = await request.json()

    const supabaseAdmin = getSupabaseAdmin()

    // ステップの存在確認
    const { data: existingStep, error: stepError } = await supabaseAdmin
      .from('case_study_steps')
      .select('id, problem_id, step_number')
      .eq('id', stepId)
      .single()

    if (stepError || !existingStep) {
      return NextResponse.json(
        { success: false, error: 'ステップが見つかりません' },
        { status: 404 }
      )
    }

    // 更新可能フィールド
    const allowedFields = [
      'step_name',
      'description',
      'category_id',
      'subcategory_id',
      'question_type',
      'options',
      'model_answer',
      'hint',
      'target_skills',
      'max_score',
      'display_order'
    ]

    const updateData: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        // バリデーション
        if (field === 'step_name' && body[field] !== null) {
          if (typeof body[field] !== 'string' || !body[field].trim()) {
            return NextResponse.json({ success: false, error: 'ステップ名は必須です' }, { status: 400 })
          }
          updateData[field] = body[field].trim()
        } else if (field === 'description' && body[field] !== null) {
          if (typeof body[field] !== 'string' || !body[field].trim()) {
            return NextResponse.json({ success: false, error: '説明は必須です' }, { status: 400 })
          }
          updateData[field] = body[field].trim()
        } else if (field === 'question_type') {
          const validTypes = ['single', 'multiple', 'ordering', 'text', 'hybrid']
          if (!validTypes.includes(body[field])) {
            return NextResponse.json({ success: false, error: '無効な質問タイプです' }, { status: 400 })
          }
          updateData[field] = body[field]
        } else if (field === 'options') {
          // 選択肢の検証
          if (body[field] !== null && !Array.isArray(body[field])) {
            return NextResponse.json({ success: false, error: '選択肢は配列である必要があります' }, { status: 400 })
          }
          updateData[field] = body[field]
        } else if (field === 'model_answer') {
          if (body[field] === null) {
            return NextResponse.json({ success: false, error: '模範解答は必須です' }, { status: 400 })
          }
          updateData[field] = body[field]
        } else if (field === 'target_skills') {
          if (!Array.isArray(body[field])) {
            return NextResponse.json({ success: false, error: 'スキル軸は配列である必要があります' }, { status: 400 })
          }
          updateData[field] = body[field]
        } else if (field === 'max_score') {
          const score = Number(body[field])
          if (isNaN(score) || score < 1 || score > 100) {
            return NextResponse.json({ success: false, error: '最大スコアは1〜100の範囲で指定してください' }, { status: 400 })
          }
          updateData[field] = score
        } else {
          updateData[field] = body[field]
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: '更新するデータがありません' }, { status: 400 })
    }

    // 更新実行
    const { data: updatedStep, error: updateError } = await supabaseAdmin
      .from('case_study_steps')
      .update(updateData)
      .eq('id', stepId)
      .select()
      .single()

    if (updateError) {
      console.error('Step update error:', updateError)
      return NextResponse.json(
        { success: false, error: 'ステップの更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      step: updatedStep
    })
  } catch (error) {
    console.error('Step PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'ステップの更新に失敗しました' },
      { status: 500 }
    )
  }
}

// ステップ削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const { stepId } = await params

    const supabaseAdmin = getSupabaseAdmin()

    // ステップの存在確認と問題IDの取得
    const { data: step, error: stepError } = await supabaseAdmin
      .from('case_study_steps')
      .select('id, problem_id, step_number')
      .eq('id', stepId)
      .single()

    if (stepError || !step) {
      return NextResponse.json(
        { success: false, error: 'ステップが見つかりません' },
        { status: 404 }
      )
    }

    // ステップに関連する回答データの存在確認
    const { count: answerCount } = await supabaseAdmin
      .from('case_study_step_details')
      .select('*', { count: 'exact', head: true })
      .eq('step_id', stepId)

    if (answerCount && answerCount > 0) {
      return NextResponse.json(
        { success: false, error: 'このステップには回答データがあるため削除できません' },
        { status: 400 }
      )
    }

    // ステップを削除
    const { error: deleteError } = await supabaseAdmin
      .from('case_study_steps')
      .delete()
      .eq('id', stepId)

    if (deleteError) {
      console.error('Step delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: 'ステップの削除に失敗しました' },
        { status: 500 }
      )
    }

    // 後続のステップ番号を詰める
    const { error: reorderError } = await supabaseAdmin
      .from('case_study_steps')
      .update({ step_number: supabaseAdmin.rpc('decrement_step_number') })
      .eq('problem_id', step.problem_id)
      .gt('step_number', step.step_number)

    // RPC関数がない場合の代替処理
    if (reorderError) {
      // 手動でステップ番号を更新
      const { data: laterSteps } = await supabaseAdmin
        .from('case_study_steps')
        .select('id, step_number')
        .eq('problem_id', step.problem_id)
        .gt('step_number', step.step_number)
        .order('step_number', { ascending: true })

      if (laterSteps && laterSteps.length > 0) {
        for (const laterStep of laterSteps) {
          await supabaseAdmin
            .from('case_study_steps')
            .update({ step_number: laterStep.step_number - 1, display_order: laterStep.step_number - 1 })
            .eq('id', laterStep.id)
        }
      }
    }

    // 問題のstep_countを更新
    const { count: newStepCount } = await supabaseAdmin
      .from('case_study_steps')
      .select('*', { count: 'exact', head: true })
      .eq('problem_id', step.problem_id)

    await supabaseAdmin
      .from('case_study_problems')
      .update({ step_count: newStepCount || 0, updated_at: new Date().toISOString() })
      .eq('id', step.problem_id)

    return NextResponse.json({
      success: true,
      message: 'ステップを削除しました'
    })
  } catch (error) {
    console.error('Step DELETE error:', error)
    return NextResponse.json(
      { success: false, error: 'ステップの削除に失敗しました' },
      { status: 500 }
    )
  }
}
