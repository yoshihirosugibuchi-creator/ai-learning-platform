import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/ai-course-generation/workflows/[id]/contents
 * ワークフローの生成済みコンテンツとクイズを取得
 */
export async function GET(
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
    
    console.log(`📋 [WorkflowContents] Fetching contents for workflow: ${workflowId}`)

    // ワークフローの存在確認（outline_dataも取得）
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from('ai_course_workflows')
      .select('id, content_data, outline_data')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single()

    if (workflowError || !workflow) {
      console.error('❌ [WorkflowContents] Workflow not found:', workflowError)
      return NextResponse.json(
        { error: 'ワークフローが見つかりません' },
        { status: 404 }
      )
    }

    // outline_dataからセッションIDを抽出（DB IDを使用）
    const outlineData = workflow.outline_data as {
      genres?: Array<{
        themes: Array<{
          sessions: Array<{ id: string }>
        }>
      }>
    } | null

    const outlineSessionIds: string[] = []
    if (outlineData?.genres) {
      for (const genre of outlineData.genres) {
        for (const theme of genre.themes) {
          for (const session of theme.sessions) {
            outlineSessionIds.push(session.id)
          }
        }
      }
    }

    // generated_sessionsからも取得（後方互換性）
    const contentData = workflow.content_data as { generated_sessions?: string[] } | null
    const generatedSessionIds = contentData?.generated_sessions || []

    // 両方のIDリストをマージ（重複除去）
    const allSessionIds = [...new Set([...outlineSessionIds, ...generatedSessionIds])]

    if (allSessionIds.length === 0) {
      console.log('📋 [WorkflowContents] No sessions found')
      return NextResponse.json({
        success: true,
        contents: {},
        total_sessions: 0
      })
    }

    console.log(`📋 [WorkflowContents] Searching for ${allSessionIds.length} sessions`)
    console.log(`📋 [WorkflowContents] Session IDs: ${allSessionIds.join(', ')}`)

    // 生成済みセッションのコンテンツを取得
    const { data: contents, error: contentsError } = await supabaseAdmin
      .from('session_contents')
      .select('session_id, content_type, title, content, duration, display_order')
      .in('session_id', allSessionIds)
      .order('session_id')
      .order('display_order')

    if (contentsError) {
      console.error('❌ [WorkflowContents] Contents fetch error:', contentsError)
      return NextResponse.json(
        { error: 'コンテンツの取得に失敗しました' },
        { status: 500 }
      )
    }

    // 生成済みセッションのクイズを取得
    const { data: quizzes, error: quizzesError } = await supabaseAdmin
      .from('session_quizzes')
      .select('session_id, question, options, correct_answer, explanation, display_order, quiz_type')
      .in('session_id', allSessionIds)
      .order('session_id')
      .order('display_order')

    if (quizzesError) {
      console.error('❌ [WorkflowContents] Quizzes fetch error:', quizzesError)
      return NextResponse.json(
        { error: 'クイズの取得に失敗しました' },
        { status: 500 }
      )
    }

    // セッションIDごとにグループ化
    const sessionContents: Record<string, {
      contents: typeof contents
      quizzes: typeof quizzes
    }> = {}

    allSessionIds.forEach(sessionId => {
      sessionContents[sessionId] = {
        contents: contents?.filter(c => c.session_id === sessionId) || [],
        quizzes: quizzes?.filter(q => q.session_id === sessionId) || []
      }
    })

    // 実際にコンテンツがあるセッション数をカウント
    const sessionsWithContent = Object.values(sessionContents).filter(s => s.contents.length > 0 || s.quizzes.length > 0).length

    console.log(`✅ [WorkflowContents] Retrieved contents for ${sessionsWithContent} sessions (total checked: ${allSessionIds.length})`)

    // ナレッジカード（テーマのreward_card_data）と修了証（コースのbadge_data）を取得
    let rewardCards: Array<Record<string, unknown>> = []
    let completionBadge: Record<string, unknown> | null = null

    // published_course_idがある場合、DBから取得
    const { data: workflowWithCourse } = await supabaseAdmin
      .from('ai_course_workflows')
      .select('published_course_id')
      .eq('id', workflowId)
      .single()

    if (workflowWithCourse?.published_course_id) {
      const courseId = workflowWithCourse.published_course_id

      // コースのbadge_data（修了証）を取得
      const { data: courseData } = await supabaseAdmin
        .from('learning_courses')
        .select('badge_data')
        .eq('id', courseId)
        .single()

      if (courseData?.badge_data) {
        completionBadge = courseData.badge_data as Record<string, unknown>
        console.log(`✅ [WorkflowContents] Completion badge loaded for course: ${courseId}`)
      }

      // テーマのreward_card_data（ナレッジカード）を取得
      const { data: themes } = await supabaseAdmin
        .from('learning_themes')
        .select(`
          id,
          title,
          reward_card_data,
          learning_genres!inner(course_id)
        `)
        .eq('learning_genres.course_id', courseId)

      if (themes) {
        rewardCards = themes
          .filter(t => t.reward_card_data)
          .map(t => ({
            theme_id: t.id,
            title: t.title,
            ...(t.reward_card_data as Record<string, unknown>)
          }))
        console.log(`✅ [WorkflowContents] ${rewardCards.length} reward cards loaded`)
      }
    }

    return NextResponse.json({
      success: true,
      contents: sessionContents,
      total_sessions: allSessionIds.length,
      sessions_with_content: sessionsWithContent,
      total_contents: contents?.length || 0,
      total_quizzes: quizzes?.length || 0,
      reward_cards: rewardCards,
      completion_badge: completionBadge
    })

  } catch (error) {
    console.error('❌ [WorkflowContents] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'コンテンツ取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}