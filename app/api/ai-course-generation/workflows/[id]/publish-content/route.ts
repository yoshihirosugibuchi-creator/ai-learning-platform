import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { coursePublisher } from '@/lib/ai-course-generation/course-publisher'
import type { CourseGenerationWorkflow, Json } from '@/lib/ai-course-generation/types'

// COURSE_LEARNING_CONTENT_ARCHITECTURE.md準拠の型定義
interface ContentData {
  approved: boolean
  session_contents: Array<{
    id?: string
    session_id: string
    content_type: 'text' | 'example' | 'key_points'
    content_data: { 
      title?: string
      content?: string  
      duration?: number
      [key: string]: Json | undefined
    }
    display_order: number
  }>
  session_quizzes: Array<{
    id?: string
    session_id: string
    question: string
    options: string[]
    correct_answer: number
    explanation?: string
    display_order: number
    quiz_type?: string
  }>
  ai_response_raw?: string
  generated_at?: string
}

/**
 * POST /api/ai-course-generation/workflows/[id]/publish-content
 * コンテンツ承認時のsession_contents/session_quizzesテーブル投入
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { id: workflowId } = await context.params
    console.log(`📋 [PublishContent] Starting content publication: ${workflowId}`)

    // リクエストボディ解析
    const body = await request.json()
    const {
      status = 'coming_soon',
      generateIds = true,
      approveNow = true  // このAPIを呼ぶ時点で承認アクションなのでデフォルトtrue
    } = body

    // ワークフローデータ取得
    const { data: workflow, error: fetchError } = await supabaseAdmin
      .from('ai_course_workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !workflow) {
      console.error('❌ [PublishContent] Workflow not found:', fetchError)
      return NextResponse.json(
        { error: 'ワークフローが見つかりません' },
        { status: 404 }
      )
    }

    // コンテンツ承認状態確認
    if (!workflow.content_data) {
      return NextResponse.json(
        { error: 'コンテンツデータが見つかりません' },
        { status: 400 }
      )
    }

    if (!workflow.outline_data) {
      return NextResponse.json(
        { error: 'アウトラインデータが必要です' },
        { status: 400 }
      )
    }

    // コンテンツデータ解析（型安全）
    const contentData = (() => {
      if (typeof workflow.content_data === 'object' && workflow.content_data !== null) {
        return workflow.content_data as unknown as ContentData
      }
      return null
    })()

    // approveNow=trueの場合はこのAPI呼び出し自体が承認アクションなのでチェックをスキップ
    // approveNow=falseの場合のみDB状態を確認
    if (!approveNow && !contentData?.approved) {
      return NextResponse.json(
        { error: 'コンテンツが承認されていません' },
        { status: 400 }
      )
    }

    console.log(`📋 [PublishContent] Workflow validated, publishing content...`)

    // 既存コースが存在する場合（アウトライン承認済み）
    // generate-contentで既にDBにコンテンツ・クイズは保存済みなので、ステータス更新のみ
    if (workflow.published_course_id) {
      console.log(`📋 [PublishContent] Existing course found: ${workflow.published_course_id}, updating status only`)

      // コースステータスを更新
      const { error: statusError } = await supabaseAdmin
        .from('learning_courses')
        .update({
          status: status,
          updated_at: new Date().toISOString()
        })
        .eq('id', workflow.published_course_id)

      if (statusError) {
        console.error('⚠️ [PublishContent] Status update failed:', statusError)
        return NextResponse.json(
          { error: 'コースステータス更新に失敗しました', details: statusError.message },
          { status: 500 }
        )
      }

      // ワークフローのステータス更新
      await supabaseAdmin
        .from('ai_course_workflows')
        .update({
          status: 'content_approved',
          content_data: {
            ...(workflow.content_data as object || {}),
            approved: true
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId)
        .eq('user_id', userId)

      console.log(`✅ [PublishContent] Course status updated to '${status}'`)

      return NextResponse.json({
        success: true,
        message: `コースステータスが「${status}」に更新されました`,
        courseId: workflow.published_course_id
      })
    }

    // 既存コースがない場合は新規作成（従来の動作）
    console.log(`📋 [PublishContent] No existing course, creating new course...`)

    // 型安全なJSON変換ヘルパー
    const parseJsonField = <T>(field: unknown, fallback: T): T => {
      if (typeof field === 'object' && field !== null) {
        return field as T
      }
      return fallback
    }

    // ワークフロー形式をCourseGenerationWorkflow型に変換
    const courseBasicInfo = parseJsonField(workflow.course_basic_info, {
      title: workflow.title || 'AI生成コース',
      description: workflow.description || '',
      difficulty: 'basic',
      target_audience: '',
      learning_objectives: [],
      estimated_duration: '7',
      course_category: '一般'
    })

    const sourceMaterials = parseJsonField(workflow.source_materials, [])
    const categoryMappings = parseJsonField(workflow.category_mappings, [])
    const _outlineData = parseJsonField(workflow.outline_data, {
      course: {
        title: (workflow.course_basic_info as { title?: string })?.title || '',
        description: (workflow.course_basic_info as { description?: string })?.description || '',
        estimatedDays: 7,
        difficulty: 'basic',
        targetAudience: '',
        learningObjectives: []
      },
      genres: [],
      approved: false
    })
    const generationPreferences = parseJsonField(workflow.generation_preferences, {
      ai_mode: 'manual' as const,
      depth: 'standard' as const,
      style: 'practical' as const,
      include_quizzes: true,
      session_length: 60,
      interactivity_level: 'medium' as const
    })

    const workflowForPublisher: CourseGenerationWorkflow = {
      id: workflow.id,
      user_id: workflow.user_id,
      status: workflow.status as CourseGenerationWorkflow['status'],
      course_basic_info: courseBasicInfo,
      source_materials: sourceMaterials,
      outline_data: _outlineData, // course-publisherでsession.idマッピングに必須
      category_mappings: categoryMappings,
      content_data: {
        approved: approveNow || Boolean(contentData?.approved),
        session_contents: (contentData?.session_contents || []).map((content, index) => ({
          id: content.id || `content_${Date.now()}_${index}`,
          session_id: content.session_id,
          content_type: content.content_type,
          content_data: content.content_data,
          display_order: content.display_order
        })),
        session_quizzes: (contentData?.session_quizzes || []).map((quiz, index) => ({
          id: quiz.id || `quiz_${Date.now()}_${index}`,
          session_id: quiz.session_id,
          quiz_type: 'single_choice' as const,
          question: quiz.question,
          options: quiz.options,
          correct_answer: quiz.correct_answer,
          explanation: quiz.explanation || '',
          display_order: quiz.display_order
        })),
        ai_response_raw: String(contentData?.ai_response_raw || ''),
        generated_at: String(contentData?.generated_at || new Date().toISOString()),
        reward_cards: []
      },
      generation_preferences: generationPreferences,
      current_step: String(workflow.current_step || '0'),
      created_at: workflow.created_at || '',
      updated_at: workflow.updated_at || ''
    }

    // CoursePublisher でsession_contents/session_quizzesテーブルに投入
    const publishResult = await coursePublisher.publishFromContent(
      workflowForPublisher,
      { 
        status: status as 'draft' | 'coming_soon' | 'available',
        generateIds
      }
    )

    if (!publishResult.success) {
      console.error('❌ [PublishContent] Publish failed:', publishResult.error)
      return NextResponse.json(
        { 
          error: publishResult.error || 'コンテンツ公開に失敗しました',
          details: publishResult.details 
        },
        { status: 500 }
      )
    }

    console.log(`✅ [PublishContent] Content published successfully: ${publishResult.courseId}`)

    // ワークフローのステータス更新
    const { error: updateError } = await supabaseAdmin
      .from('ai_course_workflows')
      .update({
        status: 'content_approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('⚠️ [PublishContent] Workflow update failed:', updateError)
      // エラーログのみ、コンテンツ作成は成功しているため継続
    }

    return NextResponse.json({
      success: true,
      message: 'コンテンツからコースが正常に更新されました',
      course_id: publishResult.courseId,
      content_ids: publishResult.contentIds || [],
      quiz_ids: publishResult.quizIds || [],
      publish_result: publishResult
    })

  } catch (error) {
    console.error('❌ [PublishContent] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'コンテンツ公開中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}