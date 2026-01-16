import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * GET /api/ai-course-generation/workflows/[id]/check-course-exists
 * ワークフローに対応するコースが既に作成済みかチェック
 */
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const params = await context.params
    const workflowId = params.id

    console.log(`🔍 [CheckCourseExists] ワークフロー ${workflowId} のコース存在チェック開始`)

    // ワークフロー取得
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from('ai_course_workflows')
      .select('course_basic_info, published_course_id')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single()

    if (workflowError || !workflow) {
      console.error('❌ [CheckCourseExists] ワークフロー取得エラー:', workflowError)
      return NextResponse.json(
        { error: 'ワークフローが見つかりません' },
        { status: 404 }
      )
    }

    // 1. published_course_id から直接チェック
    if (workflow.published_course_id) {
      const { data: publishedCourse, error: publishedError } = await supabaseAdmin
        .from('learning_courses')
        .select('id, status')
        .eq('id', workflow.published_course_id)
        .single()

      if (!publishedError && publishedCourse) {
        console.log(`✅ [CheckCourseExists] 公開済みコース発見: ${publishedCourse.id}`)
        return NextResponse.json({
          exists: true,
          course_id: publishedCourse.id,
          course_status: publishedCourse.status,
          check_method: 'published_course_id'
        })
      }
    }

    // 2. タイトルから検索（フォールバック）
    const courseBasicInfo = workflow.course_basic_info as { title?: string } || {}
    const courseTitle = courseBasicInfo.title

    if (!courseTitle) {
      return NextResponse.json({
        exists: false,
        error: 'コースタイトルが見つかりません'
      })
    }

    const { data: titleMatchCourse, error: titleError } = await supabaseAdmin
      .from('learning_courses')
      .select('id, status')
      .eq('title', courseTitle)
      .single()

    if (!titleError && titleMatchCourse) {
      console.log(`✅ [CheckCourseExists] タイトル一致コース発見: ${titleMatchCourse.id}`)
      
      // published_course_id を更新（次回の高速化）
      await supabaseAdmin
        .from('ai_course_workflows')
        .update({ published_course_id: titleMatchCourse.id })
        .eq('id', workflowId)

      return NextResponse.json({
        exists: true,
        course_id: titleMatchCourse.id,
        course_status: titleMatchCourse.status,
        check_method: 'title_match'
      })
    }

    // 3. コースが存在しない
    console.log(`📋 [CheckCourseExists] コースは未作成: ${courseTitle}`)
    return NextResponse.json({
      exists: false,
      course_title: courseTitle,
      check_method: 'not_found'
    })

  } catch (error) {
    console.error('❌ [CheckCourseExists] エラー:', error)
    return NextResponse.json(
      { error: 'コース存在チェック中にエラーが発生しました' },
      { status: 500 }
    )
  }
}