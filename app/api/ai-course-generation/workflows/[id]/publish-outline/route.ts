import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { coursePublisher } from '@/lib/ai-course-generation/course-publisher'
import type { CourseGenerationWorkflow } from '@/lib/ai-course-generation/types'

interface OutlineData {
  approved: boolean
  course?: {
    title: string
    description: string
    estimatedDays: number
    difficulty: string
    targetAudience: string
    learningObjectives: string[]
  }
  genres?: Array<{
    id: string
    title: string
    description: string
    estimatedDays?: number
    display_order?: number
    themes: Array<{
      id: string
      title: string
      description: string
      estimatedMinutes?: number
      display_order?: number
      sessions: Array<{
        id: string
        title: string
        session_type?: string
        estimatedMinutes?: number
        display_order?: number
      }>
    }>
  }>
  ai_response_raw?: string
  generated_at?: string
}

/**
 * POST /api/ai-course-generation/workflows/[id]/publish-outline
 * アウトライン承認時のlearning_coursesテーブル投入
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
    console.log(`📋 [PublishOutline] Starting outline publication: ${workflowId}`)

    // リクエストボディ解析
    const body = await request.json()
    const { 
      status = 'draft',
      skipExistingCheck = false 
    } = body

    // ワークフローデータ取得
    const { data: workflow, error: fetchError } = await supabaseAdmin
      .from('ai_course_workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !workflow) {
      console.error('❌ [PublishOutline] Workflow not found:', fetchError)
      return NextResponse.json(
        { error: 'ワークフローが見つかりません' },
        { status: 404 }
      )
    }

    // アウトライン承認状態確認
    if (!workflow.outline_data) {
      return NextResponse.json(
        { error: 'アウトラインデータが見つかりません' },
        { status: 400 }
      )
    }

    if (!workflow.category_mappings || !Array.isArray(workflow.category_mappings) || workflow.category_mappings.length === 0) {
      return NextResponse.json(
        { error: 'カテゴリマッピングが完了していません' },
        { status: 400 }
      )
    }

    // アウトライン承認フラグ確認（型安全）
    const outlineData = (() => {
      if (typeof workflow.outline_data === 'object' && workflow.outline_data !== null) {
        return workflow.outline_data as unknown as OutlineData
      }
      return null
    })()
    
    if (!outlineData?.approved) {
      return NextResponse.json(
        { error: 'アウトラインが承認されていません' },
        { status: 400 }
      )
    }

    console.log(`📋 [PublishOutline] Workflow validated, publishing course...`)

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
      outline_data: {
        approved: Boolean(outlineData.approved),
        course: outlineData.course || {
          title: workflow.title || 'AI生成コース',
          description: workflow.description || '',
          estimatedDays: 7,
          difficulty: 'basic',
          targetAudience: '',
          learningObjectives: []
        },
        genres: (outlineData.genres || []).map(genre => ({
          ...genre,
          estimatedDays: genre.estimatedDays || 1,
          display_order: genre.display_order || 0,
          themes: genre.themes.map(theme => ({
            ...theme,
            estimatedMinutes: theme.estimatedMinutes || 15,
            display_order: theme.display_order || 0,
            sessions: theme.sessions.map(session => ({
              ...session,
              session_type: (session.session_type as 'content' | 'quiz' | 'exercise') || 'content',
              estimatedMinutes: session.estimatedMinutes || 3,
              display_order: session.display_order || 0
            }))
          }))
        })),
        ai_response_raw: String(outlineData.ai_response_raw || ''),
        generated_at: String(outlineData.generated_at || new Date().toISOString())
      },
      category_mappings: categoryMappings,
      content_data: undefined,
      generation_preferences: generationPreferences,
      current_step: String(workflow.current_step || '0'),
      created_at: workflow.created_at || '',
      updated_at: workflow.updated_at || ''
    }

    // CoursePublisher でlearning_coursesテーブルに投入
    const publishResult = await coursePublisher.publishFromOutline(
      workflowForPublisher,
      { 
        status: status as 'draft' | 'coming_soon' | 'available',
        skipExistingCheck 
      }
    )

    if (!publishResult.success) {
      console.error('❌ [PublishOutline] Publish failed:', publishResult.error)
      return NextResponse.json(
        { 
          error: publishResult.error || 'コース公開に失敗しました',
          details: publishResult.details 
        },
        { status: 500 }
      )
    }

    console.log(`✅ [PublishOutline] Course published successfully: ${publishResult.courseId}`)

    // ワークフローのステータスとpublished_course_id更新
    const { error: updateError } = await supabaseAdmin
      .from('ai_course_workflows')
      .update({
        published_course_id: publishResult.courseId,
        status: 'outline_approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('⚠️ [PublishOutline] Workflow update failed:', updateError)
      // エラーログのみ、コース作成は成功しているため継続
    }

    return NextResponse.json({
      success: true,
      message: 'アウトラインからコースが正常に作成されました',
      course_id: publishResult.courseId,
      genre_ids: publishResult.genreIds || [],
      theme_ids: publishResult.themeIds || [],
      publish_result: publishResult
    })

  } catch (error) {
    console.error('❌ [PublishOutline] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'アウトライン公開中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}