import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { randomUUID } from 'crypto'
import { contentGenerator } from '@/lib/ai-course-generation/content-generator'
import type { CourseGenerationWorkflow } from '@/lib/ai-course-generation/types'
import type { SessionContentRequest } from '@/lib/ai-course-generation/content-prompt-builder'



/**
 * POST /api/ai-course-generation/workflows/[id]/generate-content
 * セッション別コンテンツ生成プロンプト作成またはAIレスポンス処理
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
    console.log(`📝 [GenerateContent] コンテンツ生成開始: ${workflowId}`)

    // リクエストボディ解析
    const body = await request.json()
    const { 
      action,           // 'generate_prompt' | 'process_response'
      session_id,       // 対象セッションID（単一生成時）
      ai_response,      // AIレスポンス（process_response時）
      batch_mode = false // 一括生成モード
    } = body

    // ワークフローデータ取得
    const { data: workflow, error: fetchError } = await supabaseAdmin
      .from('ai_course_workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !workflow) {
      console.error('❌ [GenerateContent] Workflow not found:', fetchError)
      return NextResponse.json(
        { error: 'ワークフローが見つかりません' },
        { status: 404 }
      )
    }

    // アウトライン承認状態確認
    const outlineData = workflow.outline_data as { approved: boolean } | null
    if (!outlineData || !outlineData.approved) {
      return NextResponse.json(
        { error: 'アウトラインが承認されていません' },
        { status: 400 }
      )
    }

    // ワークフロー形式変換
    const workflowData = convertToWorkflowType(workflow)

    if (action === 'generate_prompt') {
      return await handleGeneratePrompt(workflowData, session_id, batch_mode)
    } else if (action === 'process_response') {
      return await handleProcessResponse(workflowData, session_id, ai_response, userId)
    } else {
      return NextResponse.json(
        { error: '無効なアクションです' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('❌ [GenerateContent] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'コンテンツ生成中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

/**
 * プロンプト生成処理
 */
async function handleGeneratePrompt(
  workflow: CourseGenerationWorkflow,
  sessionId?: string,
  batchMode: boolean = false
) {
  try {
    if (batchMode) {
      // 一括生成：全セッションのプロンプト生成
      const sessionRequests = extractAllSessionRequests(workflow)
      
      const batchResult = await contentGenerator.generateBatchContent(
        workflow,
        sessionRequests,
        { mode: 'manual', includeQuizzes: true, contentDepth: 'standard', languageStyle: 'formal' }
      )

      return NextResponse.json({
        success: true,
        mode: 'batch',
        total_sessions: sessionRequests.length,
        combined_prompt: batchResult.totalPrompts?.join('\n\n=== 次のセッション ===\n\n') || '',
        session_results: batchResult.results.map(r => ({
          session_id: r.sessionId,
          session_title: r.sessionTitle,
          success: r.success
        }))
      })
    } else {
      // 単一セッション生成
      if (!sessionId) {
        return NextResponse.json(
          { error: 'セッションIDが指定されていません' },
          { status: 400 }
        )
      }

      const sessionRequest = findSessionRequest(workflow, sessionId)
      if (!sessionRequest) {
        return NextResponse.json(
          { error: '指定されたセッションが見つかりません' },
          { status: 404 }
        )
      }

      const result = await contentGenerator.generateSessionContent(
        workflow,
        sessionRequest,
        { mode: 'manual', includeQuizzes: true, contentDepth: 'standard', languageStyle: 'formal' }
      )

      if (!result.success || !result.prompt) {
        return NextResponse.json(
          { error: result.error || 'プロンプト生成に失敗しました' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        mode: 'single',
        session_id: sessionId,
        session_title: sessionRequest.sessionTitle,
        prompt: result.prompt,
        estimated_tokens: Math.ceil(result.prompt.length / 4), // 概算トークン数
        instructions: 'このプロンプトをClaude Web Interfaceで実行し、結果をprocess_responseアクションで送信してください'
      })
    }

  } catch (error) {
    console.error('❌ [GenerateContent] Prompt generation error:', error)
    return NextResponse.json(
      { error: 'プロンプト生成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * AIレスポンス処理・データベース保存
 */
async function handleProcessResponse(
  workflow: CourseGenerationWorkflow,
  sessionId: string,
  aiResponse: string,
  userId: string
) {
  try {
    if (!sessionId || !aiResponse) {
      return NextResponse.json(
        { error: 'セッションIDとAIレスポンスが必要です' },
        { status: 400 }
      )
    }

    const sessionRequest = findSessionRequest(workflow, sessionId)
    if (!sessionRequest) {
      return NextResponse.json(
        { error: '指定されたセッションが見つかりません' },
        { status: 404 }
      )
    }

    // AIレスポンス処理
    const processResult = await contentGenerator.processManualAIResponse(sessionRequest, aiResponse)
    
    if (!processResult.success || !processResult.result) {
      return NextResponse.json(
        { error: processResult.error || 'AIレスポンス処理に失敗しました' },
        { status: 400 }
      )
    }

    const contentResult = processResult.result

    // session_contentsテーブルに保存
    const contentInsertPromises = contentResult.session_contents.map(content => 
      supabaseAdmin
        .from('session_contents')
        .insert({
          id: randomUUID(),
          session_id: content.session_id,
          content_type: content.content_type,
          title: content.title,
          content: typeof content.content === 'string' ? content.content : JSON.stringify(content.content),
          duration: content.duration,
          display_order: content.display_order
        })
    )

    // session_quizzesテーブルに保存
    const quizInsertPromises = contentResult.session_quizzes.map(quiz => 
      supabaseAdmin
        .from('session_quizzes')
        .insert({
          id: randomUUID(),
          session_id: quiz.session_id,
          question: quiz.question,
          options: quiz.options,
          correct_answer: quiz.correct_answer,
          explanation: quiz.explanation,
          display_order: quiz.display_order
        })
    )

    // 一括保存実行
    const [contentResults, quizResults] = await Promise.allSettled([
      Promise.all(contentInsertPromises),
      Promise.all(quizInsertPromises)
    ])

    // エラーチェック
    let hasErrors = false
    const errors: string[] = []

    if (contentResults.status === 'rejected') {
      hasErrors = true
      errors.push('コンテンツ保存エラー: ' + contentResults.reason)
    }

    if (quizResults.status === 'rejected') {
      hasErrors = true
      errors.push('クイズ保存エラー: ' + quizResults.reason)
    }

    // ワークフロー進捗更新（JSON型対応）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentContentData = workflow.content_data as any || {}
    const existingSessions = Array.isArray(currentContentData.session_contents) 
      ? currentContentData.session_contents 
      : []
    const existingQuizzes = Array.isArray(currentContentData.session_quizzes) 
      ? currentContentData.session_quizzes 
      : []
    const existingGenerated = Array.isArray(currentContentData.generated_sessions) 
      ? currentContentData.generated_sessions 
      : []

    const updatedContentData = {
      ...currentContentData,
      session_contents: [
        ...existingSessions,
        ...contentResult.session_contents.map(content => ({
          id: randomUUID(),
          session_id: content.session_id,
          content_type: content.content_type,
          content: typeof content.content === 'string' ? content.content : JSON.stringify(content.content),
          duration: content.duration,
          display_order: content.display_order,
          title: content.title,
          created_at: new Date().toISOString()
        }))
      ],
      session_quizzes: [
        ...existingQuizzes,
        ...contentResult.session_quizzes.map(quiz => ({
          id: randomUUID(),
          session_id: quiz.session_id,
          question: quiz.question,
          options: Array.isArray(quiz.options) ? quiz.options : [],
          correct_answer: quiz.correct_answer,
          explanation: quiz.explanation,
          display_order: quiz.display_order,
          quiz_type: 'single_choice',
          created_at: new Date().toISOString()
        }))
      ],
      reward_cards: [],
      completion_badge: undefined,
      review_notes: undefined,
      approved: false,
      generated_at: new Date().toISOString(),
      generated_sessions: [
        ...existingGenerated,
        sessionId
      ]
    }

    const { error: workflowUpdateError } = await supabaseAdmin
      .from('ai_course_workflows')
      .update({
        content_data: updatedContentData,
        current_step: '5', // コンテンツ生成ステップ
        updated_at: new Date().toISOString()
      })
      .eq('id', workflow.id!)
      .eq('user_id', userId)

    if (workflowUpdateError) {
      errors.push('ワークフロー更新エラー: ' + workflowUpdateError.message)
      hasErrors = true
    }

    return NextResponse.json({
      success: !hasErrors,
      session_id: sessionId,
      session_title: sessionRequest.sessionTitle,
      saved_contents: contentResult.session_contents.length,
      saved_quizzes: contentResult.session_quizzes.length,
      key_learning_points: contentResult.key_learning_points,
      recommended_next_actions: contentResult.recommended_next_actions,
      errors: errors.length > 0 ? errors : undefined,
      message: hasErrors ? 
        '部分的にエラーが発生しましたが、可能な限り保存しました' :
        'セッションコンテンツが正常に保存されました'
    })

  } catch (error) {
    console.error('❌ [GenerateContent] Response processing error:', error)
    return NextResponse.json(
      { error: 'AIレスポンス処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

// ヘルパー関数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function convertToWorkflowType(dbWorkflow: any): CourseGenerationWorkflow {
  return dbWorkflow as CourseGenerationWorkflow
}

function extractAllSessionRequests(workflow: CourseGenerationWorkflow): SessionContentRequest[] {
  const requests: SessionContentRequest[] = []
  
  if (!workflow.outline_data?.genres) return requests

  for (const genre of workflow.outline_data.genres) {
    for (const theme of genre.themes) {
      for (const session of theme.sessions) {
        requests.push({
          sessionId: session.id,
          sessionTitle: session.title,
          sessionDescription: session.description,
          sessionType: session.session_type || 'content',
          estimatedMinutes: session.estimatedMinutes || 15,
          themeTitle: theme.title,
          themeDescription: theme.description,
          genreTitle: genre.title,
          genreDescription: genre.description
        })
      }
    }
  }

  return requests
}

function findSessionRequest(workflow: CourseGenerationWorkflow, sessionId: string): SessionContentRequest | null {
  if (!workflow.outline_data?.genres) return null

  for (const genre of workflow.outline_data.genres) {
    for (const theme of genre.themes) {
      for (const session of theme.sessions) {
        if (session.id === sessionId) {
          return {
            sessionId: session.id,
            sessionTitle: session.title,
            sessionDescription: session.description,
            sessionType: session.session_type || 'content',
            estimatedMinutes: session.estimatedMinutes || 15,
            themeTitle: theme.title,
            themeDescription: theme.description,
            genreTitle: genre.title,
            genreDescription: genre.description
          }
        }
      }
    }
  }

  return null
}