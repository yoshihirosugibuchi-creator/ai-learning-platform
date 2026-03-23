import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { randomUUID } from 'crypto'
import { contentPromptBuilder } from '@/lib/ai-course-generation/content-prompt-builder'
import type { CourseGenerationWorkflow, CustomInstructions } from '@/lib/ai-course-generation/types'
import type { Json } from '@/lib/database-types-official'
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
    
    // URLパラメータとボディの解析
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const sessionId = url.searchParams.get('session_id')
    const themeId = url.searchParams.get('theme_id')
    const genreId = url.searchParams.get('genre_id')
    const batchMode = url.searchParams.get('batch_mode')
    
    console.log(`📝 [GenerateContent] コンテンツ生成開始: ${workflowId}`)
    console.log(`🎯 [GenerateContent] Action: ${action}, Mode: ${batchMode || 'single'}`)
    
    // リクエストボディ解析（process_response時のみ）
    let body: {
      ai_response?: string
      theme_id?: string
      genre_id?: string
      custom_instructions?: CustomInstructions
    } = {} as {
      ai_response?: string
      theme_id?: string
      genre_id?: string
      custom_instructions?: CustomInstructions
    }
    
    if (request.headers.get('content-type')?.includes('application/json')) {
      try {
        const text = await request.text()
        if (text.trim()) {
          body = JSON.parse(text)
        }
      } catch (error) {
        console.warn('❌ [GenerateContent] JSON parse failed:', error)
      }
    }
    
    const {
      ai_response,      // AIレスポンス（process_response時）
      theme_id: bodyThemeId,  // ボディからも取得可能
      genre_id: bodyGenreId,  // ボディからも取得可能
      custom_instructions: bodyCustomInstructions  // カスタム指示
    } = body

    // ワークフローデータ取得
    console.log(`🔍 [GenerateContent] Searching workflow: ${workflowId} for user: ${userId}`)
    const { data: workflow, error: fetchError } = await supabaseAdmin
      .from('ai_course_workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !workflow) {
      console.error('❌ [GenerateContent] Workflow not found:', {
        workflowId,
        userId,
        error: fetchError
      })
      
      // アクセス可能なワークフローを確認
      const { data: userWorkflows, error: _userWorkflowsError } = await supabaseAdmin
        .from('ai_course_workflows')
        .select('id, title, user_id')
        .eq('user_id', userId)
      
      console.error('🔍 [GenerateContent] User workflows:', userWorkflows?.map(w => ({ id: w.id, title: w.title })))
      
      return NextResponse.json(
        { 
          error: 'ワークフローが見つかりません',
          details: fetchError?.message || 'Unknown error',
          available_workflows: userWorkflows?.map(w => ({ id: w.id, title: w.title })) || []
        },
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
      return await handleGeneratePrompt(
        workflowData,
        sessionId || undefined,
        themeId || undefined,
        genreId || undefined,
        batchMode || undefined,
        bodyCustomInstructions
      )
    } else if (action === 'process_response') {
      return await handleProcessResponse(
        workflowData,
        sessionId || undefined,
        themeId || bodyThemeId || undefined,
        genreId || bodyGenreId || undefined,
        ai_response,
        userId,
        batchMode || undefined
      )
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
 * Step 4以降はDBのコース学習テーブルを直接参照
 */
async function handleGeneratePrompt(
  workflow: CourseGenerationWorkflow,
  sessionId?: string,
  themeId?: string,
  genreId?: string,
  batchMode?: string,
  customInstructions?: CustomInstructions
) {
  try {
    // コースが公開済みか確認（published_course_idの存在チェック）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const courseId = (workflow as any).published_course_id as string | undefined

    if (!courseId) {
      return NextResponse.json(
        { error: 'コースがまだ作成されていません。カテゴリマッピングを完了してください。' },
        { status: 400 }
      )
    }

    console.log(`📋 [GeneratePrompt] DBからデータ取得: courseId=${courseId}`)

    // カスタム指示をbuilder向けにフラット化するヘルパー
    // by_genre/by_themeの該当指示をglobalに統合し、by_sessionはそのまま渡す
    const flattenInstructions = (
      ci: CustomInstructions | undefined,
      opts: { genreId?: string; themeId?: string }
    ): CustomInstructions | undefined => {
      if (!ci) return undefined
      const globalParts: string[] = []
      if (ci.global?.trim()) globalParts.push(ci.global.trim())
      if (opts.genreId && ci.by_genre?.[opts.genreId]?.trim()) {
        globalParts.push(ci.by_genre[opts.genreId].trim())
      }
      if (opts.themeId && ci.by_theme?.[opts.themeId]?.trim()) {
        globalParts.push(ci.by_theme[opts.themeId].trim())
      }
      const hasGlobal = globalParts.length > 0
      const hasSession = ci.by_session && Object.values(ci.by_session).some(v => v?.trim())
      if (!hasGlobal && !hasSession) return undefined
      return {
        global: hasGlobal ? globalParts.join('\n\n') : undefined,
        by_session: ci.by_session
      }
    }

    // カスタム指示をworkflowに保存
    if (customInstructions) {
      const currentContentData = (workflow.content_data as Record<string, unknown>) || {}
      const updatedContentData = {
        ...currentContentData,
        custom_instructions: JSON.parse(JSON.stringify(customInstructions))
      }
      await supabaseAdmin
        .from('ai_course_workflows')
        .update({
          content_data: updatedContentData as Json,
          updated_at: new Date().toISOString()
        })
        .eq('id', workflow.id!)
    }

    // ジャンル単位生成
    if (batchMode === 'genre' && genreId) {
      const sessionRequests = await extractGenreSessionRequestsFromDB(courseId, genreId)
      if (sessionRequests.length === 0) {
        return NextResponse.json(
          { error: '指定されたジャンルにセッションが見つかりません' },
          { status: 404 }
        )
      }

      const genreInfo = await findGenreInfoFromDB(courseId, genreId)
      const flatCI = flattenInstructions(customInstructions, { genreId })
      const promptResult = contentPromptBuilder.buildGenreContentPrompt(
        workflow,
        genreInfo?.title || '',
        sessionRequests,
        flatCI
      )

      return NextResponse.json({
        success: true,
        mode: 'genre',
        genre_id: genreId,
        genre_title: genreInfo?.title || '',
        total_sessions: sessionRequests.length,
        prompt: promptResult.prompt,
        estimated_tokens: Math.ceil(promptResult.prompt.length / 4),
        instructions: `ジャンル「${genreInfo?.title}」全体のコンテンツ生成プロンプトです。Claude Web Interfaceで実行してください。`
      })
    }

    // テーマ単位生成
    else if (batchMode === 'theme' && themeId) {
      const sessionRequests = await extractThemeSessionRequestsFromDB(courseId, themeId)
      if (sessionRequests.length === 0) {
        return NextResponse.json(
          { error: '指定されたテーマにセッションが見つかりません' },
          { status: 404 }
        )
      }

      const themeInfo = await findThemeInfoFromDB(courseId, themeId)
      const flatCI = flattenInstructions(customInstructions, { themeId })
      const promptResult = contentPromptBuilder.buildThemeContentPrompt(
        workflow,
        themeInfo?.title || '',
        sessionRequests,
        flatCI
      )

      return NextResponse.json({
        success: true,
        mode: 'theme',
        theme_id: themeId,
        theme_title: themeInfo?.title || '',
        total_sessions: sessionRequests.length,
        prompt: promptResult.prompt,
        estimated_tokens: Math.ceil(promptResult.prompt.length / 4),
        instructions: `テーマ「${themeInfo?.title}」のコンテンツ生成プロンプトです。Claude Web Interfaceで実行してください。`
      })
    }

    // 単一セッション生成
    else if (sessionId) {
      const sessionRequest = await findSessionRequestFromDB(courseId, sessionId)
      if (!sessionRequest) {
        return NextResponse.json(
          { error: '指定されたセッションが見つかりません' },
          { status: 404 }
        )
      }

      const flatCI = flattenInstructions(customInstructions, {})
      const promptResult = contentPromptBuilder.buildSessionContentPrompt(
        workflow,
        sessionRequest,
        flatCI
      )

      return NextResponse.json({
        success: true,
        mode: 'single',
        session_id: sessionId,
        session_title: sessionRequest.sessionTitle,
        prompt: promptResult.prompt,
        estimated_tokens: Math.ceil(promptResult.prompt.length / 4),
        instructions: 'このプロンプトをClaude Web Interfaceで実行し、結果をprocess_responseアクションで送信してください'
      })
    }

    // パラメータ不正
    else {
      return NextResponse.json(
        { error: '生成対象が指定されていません（session_id, theme_id, genre_idのいずれかが必要）' },
        { status: 400 }
      )
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
  sessionId?: string,
  themeId?: string,
  genreId?: string,
  aiResponse?: string,
  userId?: string,
  batchMode?: string
) {
  try {
    if (!aiResponse) {
      return NextResponse.json(
        { error: 'AIレスポンスが必要です' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 401 }
      )
    }

    // AIレスポンスの生データをログ（最初の500文字）
    console.log('📥 [ProcessResponse] AIレスポンス生データ (最初の500文字):', aiResponse.substring(0, 500))
    console.log('📥 [ProcessResponse] AIレスポンス全長:', aiResponse.length)

    let parsedResponse: Record<string, unknown>
    try {
      parsedResponse = JSON.parse(aiResponse)
      console.log('📥 [ProcessResponse] JSON.parse成功、トップレベルキー:', Object.keys(parsedResponse))
    } catch (_error) {
      console.error('❌ [ProcessResponse] JSON.parseエラー:', _error)
      return NextResponse.json(
        { error: 'AIレスポンスのJSON形式が不正です' },
        { status: 400 }
      )
    }

    const sessionResults: Array<{
      sessionId: string
      sessionTitle: string
      contents: Record<string, unknown>[]
      quizzes: Record<string, unknown>[]
    }> = []

    // ジャンル単位処理
    if (batchMode === 'genre' && genreId) {
      console.log('🎯 [ProcessResponse] ジャンル単位処理:', genreId)
      
      if (!parsedResponse.themes || !Array.isArray(parsedResponse.themes)) {
        return NextResponse.json(
          { error: 'ジャンル単位のレスポンス形式が不正です（themesフィールドが必要）' },
          { status: 400 }
        )
      }

      // 各テーマのセッションを処理
      const themes = parsedResponse.themes as Array<{
        sessions?: Array<{
          session_id?: string
          session_title?: string
          session_contents?: Record<string, unknown>[]
          session_quizzes?: Record<string, unknown>[]
        }>
      }>
      
      for (const theme of themes) {
        if (theme.sessions && Array.isArray(theme.sessions)) {
          for (const session of theme.sessions) {
            sessionResults.push({
              sessionId: session.session_id || '',
              sessionTitle: session.session_title || '',
              contents: session.session_contents || [],
              quizzes: session.session_quizzes || []
            })
          }
        }
      }
    }
    
    // テーマ単位処理
    else if (batchMode === 'theme' && themeId) {
      console.log('🎯 [ProcessResponse] テーマ単位処理:', themeId)
      console.log('📦 [ProcessResponse] parsedResponseキー:', Object.keys(parsedResponse))

      if (!parsedResponse.sessions || !Array.isArray(parsedResponse.sessions)) {
        return NextResponse.json(
          { error: 'テーマ単位のレスポンス形式が不正です（sessionsフィールドが必要）' },
          { status: 400 }
        )
      }

      // 各セッションを処理
      const sessions = parsedResponse.sessions as Array<{
        session_id?: string
        session_title?: string
        session_contents?: Record<string, unknown>[]
        session_quizzes?: Record<string, unknown>[]
      }>

      console.log(`📦 [ProcessResponse] セッション数: ${sessions.length}`)

      for (const session of sessions) {
        // デバッグ: 最初のコンテンツの生データを表示
        if (session.session_contents && session.session_contents.length > 0) {
          const firstContent = session.session_contents[0]
          const contentValue = firstContent.content || firstContent.body || ''
          console.log(`📦 [ProcessResponse] Session ${session.session_id} 最初のコンテンツ:`, {
            keys: Object.keys(firstContent),
            hasContent: !!firstContent.content,
            hasBody: !!firstContent.body,
            content_preview: typeof contentValue === 'string'
              ? contentValue.substring(0, 100)
              : JSON.stringify(contentValue || '').substring(0, 100)
          })
        }

        sessionResults.push({
          sessionId: session.session_id || '',
          sessionTitle: session.session_title || '',
          contents: session.session_contents || [],
          quizzes: session.session_quizzes || []
        })
      }
    }
    
    // 単一セッション処理
    else if (sessionId || parsedResponse.session_id) {
      // JSONレスポンスからsession_idを優先的に取得（クエリパラメータはフォールバック）
      const effectiveSessionId = (parsedResponse.session_id as string) || sessionId || ''

      console.log('🎯 [ProcessResponse] 単一セッション処理:', effectiveSessionId)
      console.log('📦 [ProcessResponse] AIレスポンスキー:', Object.keys(parsedResponse))
      console.log('📦 [ProcessResponse] JSON内session_id:', parsedResponse.session_id || 'なし')
      console.log('📦 [ProcessResponse] クエリパラメータsession_id:', sessionId || 'なし')
      console.log('📦 [ProcessResponse] session_contents件数:', Array.isArray(parsedResponse.session_contents) ? parsedResponse.session_contents.length : 'なし')
      console.log('📦 [ProcessResponse] session_quizzes件数:', Array.isArray(parsedResponse.session_quizzes) ? parsedResponse.session_quizzes.length : 'なし')

      if (!effectiveSessionId) {
        return NextResponse.json(
          { error: 'セッションIDが指定されていません（JSONレスポンスまたはクエリパラメータで指定が必要）' },
          { status: 400 }
        )
      }

      sessionResults.push({
        sessionId: effectiveSessionId,
        sessionTitle: '',
        contents: (parsedResponse.session_contents as Record<string, unknown>[]) || [],
        quizzes: (parsedResponse.session_quizzes as Record<string, unknown>[]) || []
      })
    }
    
    else {
      return NextResponse.json(
        { error: '処理対象が指定されていません' },
        { status: 400 }
      )
    }

    // データベース保存準備
    const allContentInserts: Array<{
      id: string
      session_id: string
      content_type: string
      title: string
      content: string
      duration: number
      display_order: number
    }> = []
    
    const allQuizInserts: Array<{
      id: string
      session_id: string
      question: string
      options: string[]
      correct_answer: number
      explanation: string
      display_order: number
      quiz_type: string
    }> = []
    
    const processedSessionIds: string[] = []

    for (const result of sessionResults) {
      processedSessionIds.push(result.sessionId)

      // コンテンツの保存準備
      for (const content of result.contents) {
        // contentフィールドの堅牢な抽出（body, content, textなど複数のフィールド名に対応）
        let contentText = ''

        // まずトップレベルのcontent, body, textフィールドをチェック
        const rawContent = content.content || content.body || content.text
        if (typeof rawContent === 'string') {
          contentText = rawContent
        } else if (rawContent && typeof rawContent === 'object') {
          // オブジェクトの場合、textやvalueプロパティを探す
          const obj = rawContent as Record<string, unknown>
          contentText = String(obj.text || obj.value || obj.body || JSON.stringify(obj))
        }

        // display_orderまたはorderフィールドに対応
        const displayOrder = Number(content.display_order || content.order) || 0

        console.log(`📝 [ProcessResponse] Content "${content.title}": length=${contentText.length}, preview="${contentText.substring(0, 50)}..."`)

        allContentInserts.push({
          id: randomUUID(),
          session_id: result.sessionId,
          content_type: String(content.content_type || 'text'),
          title: String(content.title || ''),
          content: contentText,
          duration: Number(content.duration) || 5,
          display_order: displayOrder
        })
      }

      // クイズの保存準備
      for (const quiz of result.quizzes) {
        // optionsフィールドの堅牢な抽出
        let options: string[] = []
        if (Array.isArray(quiz.options)) {
          options = quiz.options.map(opt => {
            if (typeof opt === 'string') {
              return opt
            } else if (opt && typeof opt === 'object') {
              // オブジェクトの場合、textやlabelプロパティを探す
              const obj = opt as Record<string, unknown>
              return String(obj.text || obj.label || obj.value || obj.option || JSON.stringify(obj))
            }
            return String(opt)
          })
        }

        // questionフィールドの堅牢な抽出
        let questionText = ''
        if (typeof quiz.question === 'string') {
          questionText = quiz.question
        } else if (quiz.question && typeof quiz.question === 'object') {
          const obj = quiz.question as Record<string, unknown>
          questionText = String(obj.text || obj.value || JSON.stringify(obj))
        }

        console.log(`📝 [ProcessResponse] Quiz: question="${questionText.substring(0, 50)}...", options count=${options.length}`)

        allQuizInserts.push({
          id: randomUUID(),
          session_id: result.sessionId,
          question: questionText,
          options: options,
          correct_answer: Number(quiz.correct_answer) || 0,
          explanation: String(quiz.explanation || ''),
          display_order: Number(quiz.display_order) || 0,
          quiz_type: String(quiz.quiz_type || 'single_choice')
        })
      }
    }

    // バッチ保存実行
    console.log('💾 [ProcessResponse] 保存準備:', {
      contentsCount: allContentInserts.length,
      quizzesCount: allQuizInserts.length,
      sessionIds: processedSessionIds
    })

    let savedContents = 0
    let savedQuizzes = 0
    const errors: string[] = []

    // 既存のコンテンツとクイズを削除（重複防止）
    if (processedSessionIds.length > 0) {
      console.log('🗑️ [ProcessResponse] 既存コンテンツ削除:', processedSessionIds)

      const { error: deleteContentsError } = await supabaseAdmin
        .from('session_contents')
        .delete()
        .in('session_id', processedSessionIds)

      if (deleteContentsError) {
        console.warn('⚠️ [ProcessResponse] 既存コンテンツ削除警告:', deleteContentsError.message)
      }

      const { error: deleteQuizzesError } = await supabaseAdmin
        .from('session_quizzes')
        .delete()
        .in('session_id', processedSessionIds)

      if (deleteQuizzesError) {
        console.warn('⚠️ [ProcessResponse] 既存クイズ削除警告:', deleteQuizzesError.message)
      }
    }

    if (allContentInserts.length > 0) {
      const { error: contentError, count } = await supabaseAdmin
        .from('session_contents')
        .insert(allContentInserts)
        .select('id')
      
      if (contentError) {
        console.error('❌ [ProcessResponse] コンテンツ保存失敗:', contentError)
        errors.push('コンテンツ保存エラー: ' + contentError.message)
      } else {
        savedContents = count || allContentInserts.length
        console.log('✅ [ProcessResponse] コンテンツ保存成功:', savedContents)
      }
    }

    if (allQuizInserts.length > 0) {
      const { error: quizError, count } = await supabaseAdmin
        .from('session_quizzes')
        .insert(allQuizInserts)
        .select('id')

      if (quizError) {
        console.error('❌ [ProcessResponse] クイズ保存失敗:', quizError)
        errors.push('クイズ保存エラー: ' + quizError.message)
      } else {
        savedQuizzes = count || allQuizInserts.length
        console.log('✅ [ProcessResponse] クイズ保存成功:', savedQuizzes)
      }
    }

    // ワークフロー進捗更新
    const currentContentData = (workflow.content_data as Record<string, unknown>) || {}
    const existingGenerated = Array.isArray(currentContentData.generated_sessions) 
      ? currentContentData.generated_sessions 
      : []

    const updatedContentData = {
      ...currentContentData,
      generated_at: new Date().toISOString(),
      generated_sessions: [
        ...existingGenerated,
        ...processedSessionIds
      ].filter((id, index, arr) => arr.indexOf(id) === index) // 重複除去
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
    }

    const hasErrors = errors.length > 0
    const responseMode = batchMode === 'genre' ? 'ジャンル' : 
                        batchMode === 'theme' ? 'テーマ' : 'セッション'

    return NextResponse.json({
      success: !hasErrors,
      mode: batchMode || 'single',
      processed_sessions: processedSessionIds.length,
      saved_contents: savedContents,
      saved_quizzes: savedQuizzes,
      session_ids: processedSessionIds,
      errors: errors.length > 0 ? errors : undefined,
      message: hasErrors ? 
        `${responseMode}単位の処理で部分的にエラーが発生しましたが、可能な限り保存しました` :
        `${responseMode}単位のコンテンツが正常に保存されました（${processedSessionIds.length}セッション）`
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

// ========================================
// DBからコース学習テーブルを参照する関数群
// Step 4以降はoutline_dataではなくDBを直接参照
// ========================================

/**
 * DBからセッション情報を取得（単一セッション）
 */
async function findSessionRequestFromDB(courseId: string, sessionId: string): Promise<SessionContentRequest | null> {
  // セッション情報を取得（テーマ・ジャンル情報も含む）
  const { data: session, error } = await supabaseAdmin
    .from('learning_sessions')
    .select(`
      id,
      title,
      session_type,
      estimated_minutes,
      theme_id,
      learning_themes!inner (
        id,
        title,
        description,
        genre_id,
        learning_genres!inner (
          id,
          title,
          description,
          course_id
        )
      )
    `)
    .eq('id', sessionId)
    .single()

  if (error || !session) {
    console.error('❌ [DB] セッション取得エラー:', error?.message)
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const theme = session.learning_themes as any
  const genre = theme?.learning_genres

  // コースIDの検証
  if (genre?.course_id !== courseId) {
    console.error('❌ [DB] セッションが指定コースに属していません')
    return null
  }

  return {
    sessionId: session.id,
    sessionTitle: session.title,
    sessionDescription: '', // DBにはdescriptionがない場合がある
    sessionType: (session.session_type as 'knowledge' | 'practice' | 'case_study') || 'knowledge',
    estimatedMinutes: session.estimated_minutes || 15,
    themeTitle: theme?.title || '',
    themeDescription: theme?.description || '',
    genreTitle: genre?.title || '',
    genreDescription: genre?.description || ''
  }
}

/**
 * DBからジャンル内の全セッション情報を取得
 */
async function extractGenreSessionRequestsFromDB(courseId: string, genreId: string): Promise<SessionContentRequest[]> {
  const requests: SessionContentRequest[] = []

  // ジャンル情報を取得
  const { data: genre, error: genreError } = await supabaseAdmin
    .from('learning_genres')
    .select('id, title, description, course_id')
    .eq('id', genreId)
    .eq('course_id', courseId)
    .single()

  if (genreError || !genre) {
    console.error('❌ [DB] ジャンル取得エラー:', genreError?.message)
    return requests
  }

  // ジャンル内のテーマを取得
  const { data: themes, error: themesError } = await supabaseAdmin
    .from('learning_themes')
    .select('id, title, description')
    .eq('genre_id', genreId)
    .order('display_order')

  if (themesError || !themes) {
    console.error('❌ [DB] テーマ取得エラー:', themesError?.message)
    return requests
  }

  // 各テーマのセッションを取得
  for (const theme of themes) {
    const { data: sessions, error: sessionsError } = await supabaseAdmin
      .from('learning_sessions')
      .select('id, title, session_type, estimated_minutes')
      .eq('theme_id', theme.id)
      .order('display_order')

    if (sessionsError || !sessions) continue

    for (const session of sessions) {
      requests.push({
        sessionId: session.id,
        sessionTitle: session.title,
        sessionDescription: '',
        sessionType: (session.session_type as 'knowledge' | 'practice' | 'case_study') || 'knowledge',
        estimatedMinutes: session.estimated_minutes || 15,
        themeTitle: theme.title,
        themeDescription: theme.description || '',
        genreTitle: genre.title,
        genreDescription: genre.description || ''
      })
    }
  }

  console.log(`✅ [DB] ジャンル「${genre.title}」から${requests.length}セッション取得`)
  return requests
}

/**
 * DBからテーマ内の全セッション情報を取得
 */
async function extractThemeSessionRequestsFromDB(courseId: string, themeId: string): Promise<SessionContentRequest[]> {
  const requests: SessionContentRequest[] = []

  // テーマ情報を取得（ジャンル情報も含む）
  const { data: theme, error: themeError } = await supabaseAdmin
    .from('learning_themes')
    .select(`
      id,
      title,
      description,
      genre_id,
      learning_genres!inner (
        id,
        title,
        description,
        course_id
      )
    `)
    .eq('id', themeId)
    .single()

  if (themeError || !theme) {
    console.error('❌ [DB] テーマ取得エラー:', themeError?.message)
    return requests
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const genre = theme.learning_genres as any

  // コースIDの検証
  if (genre?.course_id !== courseId) {
    console.error('❌ [DB] テーマが指定コースに属していません')
    return requests
  }

  // テーマ内のセッションを取得
  const { data: sessions, error: sessionsError } = await supabaseAdmin
    .from('learning_sessions')
    .select('id, title, session_type, estimated_minutes')
    .eq('theme_id', themeId)
    .order('display_order')

  if (sessionsError || !sessions) {
    console.error('❌ [DB] セッション取得エラー:', sessionsError?.message)
    return requests
  }

  for (const session of sessions) {
    requests.push({
      sessionId: session.id,
      sessionTitle: session.title,
      sessionDescription: '',
      sessionType: (session.session_type as 'knowledge' | 'practice' | 'case_study') || 'knowledge',
      estimatedMinutes: session.estimated_minutes || 15,
      themeTitle: theme.title,
      themeDescription: theme.description || '',
      genreTitle: genre?.title || '',
      genreDescription: genre?.description || ''
    })
  }

  console.log(`✅ [DB] テーマ「${theme.title}」から${requests.length}セッション取得`)
  return requests
}

/**
 * DBからテーマ情報を取得
 */
async function findThemeInfoFromDB(courseId: string, themeId: string): Promise<{ title: string; description: string } | null> {
  const { data: theme, error } = await supabaseAdmin
    .from('learning_themes')
    .select(`
      id,
      title,
      description,
      learning_genres!inner (
        course_id
      )
    `)
    .eq('id', themeId)
    .single()

  if (error || !theme) {
    console.error('❌ [DB] テーマ情報取得エラー:', error?.message)
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const genre = theme.learning_genres as any
  if (genre?.course_id !== courseId) {
    return null
  }

  return {
    title: theme.title,
    description: theme.description || ''
  }
}

/**
 * DBからジャンル情報を取得
 */
async function findGenreInfoFromDB(courseId: string, genreId: string): Promise<{ title: string; description: string } | null> {
  const { data: genre, error } = await supabaseAdmin
    .from('learning_genres')
    .select('id, title, description, course_id')
    .eq('id', genreId)
    .eq('course_id', courseId)
    .single()

  if (error || !genre) {
    console.error('❌ [DB] ジャンル情報取得エラー:', error?.message)
    return null
  }

  return {
    title: genre.title,
    description: genre.description || ''
  }
}