import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * 個別ワークフロー管理API
 * GET /api/ai-course-generation/workflows/[id] - ワークフロー詳細取得
 * PUT /api/ai-course-generation/workflows/[id] - ワークフロー更新
 * DELETE /api/ai-course-generation/workflows/[id] - ワークフロー削除
 */

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

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
    console.log(`📋 [Workflow] Fetching workflow: ${workflowId} for user: ${userId}`)

    const { data: workflow, error } = await supabaseAdmin
      .from('ai_course_workflows')
      .select('*')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single()

    if (error) {
      console.error('❌ [Workflow] Database error:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'ワークフローが見つかりません' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'ワークフローの取得に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [Workflow] Found workflow: ${((workflow.course_basic_info as { title?: string }) || {}).title || workflow.title}`)

    // published_course_idがある場合、DBのコース学習テーブルからデータ取得
    // Step 4以降はoutline_dataではなくDBを正とする
    let courseStructure: {
      genres: Array<{
        id: string
        title: string
        description: string
        themes: Array<{
          id: string
          title: string
          description: string
          sessions: Array<{
            id: string
            title: string
            session_type: string
            estimated_minutes: number
          }>
        }>
      }>
    } | null = null

    if (workflow.published_course_id) {
      console.log(`📋 [Workflow] Fetching course structure from DB: ${workflow.published_course_id}`)

      // ジャンル取得
      const { data: genres } = await supabaseAdmin
        .from('learning_genres')
        .select('id, title, description, display_order')
        .eq('course_id', workflow.published_course_id)
        .order('display_order')

      if (genres && genres.length > 0) {
        const genresWithThemes = await Promise.all(
          genres.map(async (genre) => {
            // テーマ取得
            const { data: themes } = await supabaseAdmin
              .from('learning_themes')
              .select('id, title, description, display_order')
              .eq('genre_id', genre.id)
              .order('display_order')

            const themesWithSessions = await Promise.all(
              (themes || []).map(async (theme) => {
                // セッション取得
                const { data: sessions } = await supabaseAdmin
                  .from('learning_sessions')
                  .select('id, title, session_type, estimated_minutes, display_order')
                  .eq('theme_id', theme.id)
                  .order('display_order')

                return {
                  id: theme.id,
                  title: theme.title,
                  description: theme.description || '',
                  sessions: (sessions || []).map(s => ({
                    id: s.id,
                    title: s.title,
                    session_type: s.session_type || 'knowledge',
                    estimated_minutes: s.estimated_minutes || 15
                  }))
                }
              })
            )

            return {
              id: genre.id,
              title: genre.title,
              description: genre.description || '',
              themes: themesWithSessions
            }
          })
        )

        courseStructure = { genres: genresWithThemes }
        console.log(`✅ [Workflow] Course structure loaded: ${genres.length} genres`)
      }
    }

    // 設計書準拠の完全なデータ構造で返却
    const responseData = {
      id: workflow.id,
      status: workflow.status,
      
      // course_basic_info から基本情報を抽出
      course_basic_info: workflow.course_basic_info || {
        title: workflow.title || '',
        description: workflow.description || '',
        difficulty: '',
        target_audience: '',
        learning_objectives: [],
        estimated_duration: '',
        course_category: ''
      },
      
      // source_materials
      source_materials: workflow.source_materials || [],
      
      // outline_data（course_structureがある場合はDBのIDで上書き）
      outline_data: courseStructure ? {
        ...(workflow.outline_data as Record<string, unknown> || {}),
        genres: courseStructure.genres.map(genre => ({
          ...genre,
          themes: genre.themes.map(theme => ({
            ...theme,
            sessions: theme.sessions.map(session => ({
              id: session.id,
              title: session.title,
              description: '',
              session_type: session.session_type as 'knowledge' | 'practice' | 'case_study',
              estimatedMinutes: session.estimated_minutes,
              display_order: 0
            })),
            estimatedMinutes: theme.sessions.reduce((sum, s) => sum + s.estimated_minutes, 0),
            display_order: 0,
            reward_card_data: {}
          })),
          estimatedDays: 1,
          display_order: 0
        }))
      } : workflow.outline_data || null,
      
      // category_mappings  
      category_mappings: workflow.category_mappings || [],
      
      // content_data
      content_data: workflow.content_data || null,
      
      // generation_preferences
      generation_preferences: workflow.generation_preferences || {
        ai_mode: 'manual',
        depth: 'standard',
        style: 'practical',
        include_quizzes: true,
        session_length: 60,
        interactivity_level: 'medium'
      },
      
      // 手動AI入力用
      current_prompt: workflow.current_prompt,
      current_step: workflow.current_step || '0',
      prompt_id: workflow.prompt_id,
      
      // レビュー情報
      outline_review_notes: workflow.outline_review_notes,
      content_review_notes: workflow.content_review_notes,
      
      // 公開情報
      published_course_id: workflow.published_course_id,

      // DBのコース学習テーブルから取得した構造（Step 4以降はこちらを使用）
      course_structure: courseStructure,

      // タイムスタンプ
      created_at: workflow.created_at,
      updated_at: workflow.updated_at,

      // 下位互換用のレガシーフィールド
      title: ((workflow.course_basic_info as { title?: string }) || {}).title || workflow.title || '',
      description: ((workflow.course_basic_info as { description?: string }) || {}).description || workflow.description || '',
      sources: workflow.source_materials || [],
      aiOutlineResponse: (workflow.outline_data as { ai_response_raw?: string } | null)?.ai_response_raw || null,
      // DBのcurrent_stepをそのまま使用（最後に作業していたステップに戻る）
      currentStep: parseInt(workflow.current_step || '0'),
      
      // Step1で使用するフィールド（course_basic_infoから抽出）
      difficultyId: ((workflow.course_basic_info as { difficulty?: string }) || {}).difficulty || '',
      estimatedDuration: ((workflow.course_basic_info as { estimated_duration?: string }) || {}).estimated_duration || '',
      learningObjectives: ((workflow.course_basic_info as { learning_objectives?: string[] }) || {}).learning_objectives || [],
      targetAudience: ((workflow.course_basic_info as { target_audience?: string }) || {}).target_audience || '',
      courseCategory: ((workflow.course_basic_info as { course_category?: string }) || {}).course_category || '',
      generationPreferences: ((workflow.course_basic_info as { generation_preferences?: Record<string, unknown> }) || {}).generation_preferences || workflow.generation_preferences || {
        sessionLength: 15,
        includeQuizzes: true,
        interactivityLevel: 'medium',
        contentStyle: 'formal'
      }
    }

    return NextResponse.json({
      success: true,
      workflow: responseData
    })

  } catch (error) {
    console.error('❌ [Workflow] Error:', error)
    return NextResponse.json(
      { error: 'ワークフローの取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest, context: RouteParams) {
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
    const body = await request.json()
    
    console.log(`📋 [Workflow] Updating workflow: ${workflowId} for user: ${userId}`)

    // 設計書準拠のフィールドマッピング
    const updateData: Record<string, unknown> = {}
    
    // 新しい構造のフィールド（course_basic_info）
    if (body.course_basic_info !== undefined) {
      updateData.course_basic_info = body.course_basic_info
    } else {
      // レガシー互換性およびStep1個別フィールドのマッピング
      // 既存のワークフローデータを取得して、マージする必要がある
      const { data: existingWorkflow } = await supabaseAdmin
        .from('ai_course_workflows')
        .select('course_basic_info')
        .eq('id', workflowId)
        .eq('user_id', userId)
        .single()
      
      const existingBasicInfo = (existingWorkflow?.course_basic_info as Record<string, unknown>) || {}
      const basicInfo: Record<string, unknown> = {
        ...existingBasicInfo  // 既存データを維持
      }
      
      // Step1から送られてくるフィールドをcourse_basic_infoに統合
      if (body.title !== undefined) basicInfo.title = body.title
      if (body.description !== undefined) basicInfo.description = body.description
      if (body.difficultyId !== undefined) basicInfo.difficulty = body.difficultyId
      if (body.estimatedDuration !== undefined) basicInfo.estimated_duration = body.estimatedDuration
      if (body.learningObjectives !== undefined) basicInfo.learning_objectives = body.learningObjectives
      if (body.targetAudience !== undefined) basicInfo.target_audience = body.targetAudience
      if (body.courseCategory !== undefined) basicInfo.course_category = body.courseCategory
      if (body.generationPreferences !== undefined) {
        // 🔧 course_basic_info内とワークフロー直下の両方に保存
        basicInfo.generation_preferences = body.generationPreferences
        updateData.generation_preferences = body.generationPreferences
      }
      
      // 既存データと異なる場合は保存
      const hasChanges = Object.keys(basicInfo).some(key => 
        JSON.stringify(basicInfo[key]) !== JSON.stringify(existingBasicInfo[key])
      )
      if (hasChanges || Object.keys(basicInfo).length > Object.keys(existingBasicInfo).length) {
        updateData.course_basic_info = basicInfo
      }
    }

    // source_materials
    if (body.source_materials !== undefined) {
      updateData.source_materials = body.source_materials
    } else if (body.sources !== undefined) {
      // レガシー互換性: sources -> source_materials
      updateData.source_materials = body.sources
    }

    // outline_data
    if (body.outline_data !== undefined) {
      updateData.outline_data = body.outline_data
    } else if (body.aiOutlineResponse !== undefined) {
      // レガシー互換性: aiOutlineResponse -> outline_data
      updateData.outline_data = body.aiOutlineResponse ? 
        { 
          ai_response_raw: body.aiOutlineResponse, 
          approved: false,
          generated_at: new Date().toISOString(),
          course: { title: '', description: '', estimatedDays: 7, difficulty: 'intermediate', targetAudience: '', learningObjectives: [] },
          genres: []
        } : 
        null
    }

    // category_mappings
    if (body.category_mappings !== undefined) {
      updateData.category_mappings = body.category_mappings
    } else if (body.categoryMappings !== undefined) {
      // レガシー互換性: categoryMappings -> category_mappings
      updateData.category_mappings = body.categoryMappings
    }

    // content_data
    if (body.content_data !== undefined) {
      updateData.content_data = body.content_data
    }

    // generation_preferences
    if (body.generation_preferences !== undefined) {
      updateData.generation_preferences = body.generation_preferences
    } else if (body.generationPreferences !== undefined) {
      // レガシー互換性: generationPreferences -> generation_preferences
      updateData.generation_preferences = body.generationPreferences
    }

    // ワークフロー制御フィールド
    if (body.status !== undefined) {
      updateData.status = body.status
    }

    if (body.current_step !== undefined) {
      updateData.current_step = body.current_step.toString()
    } else if (body.currentStep !== undefined) {
      // レガシー互換性
      updateData.current_step = body.currentStep.toString()
    }

    // 手動AI入力用
    if (body.current_prompt !== undefined) {
      updateData.current_prompt = body.current_prompt
    }

    if (body.prompt_id !== undefined) {
      updateData.prompt_id = body.prompt_id
    }

    // レビュー用
    if (body.outline_review_notes !== undefined) {
      updateData.outline_review_notes = body.outline_review_notes
    }

    if (body.content_review_notes !== undefined) {
      updateData.content_review_notes = body.content_review_notes
    }

    // 更新実行
    const { data: workflow, error } = await supabaseAdmin
      .from('ai_course_workflows')
      .update(updateData)
      .eq('id', workflowId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('❌ [Workflow] Update error:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'ワークフローが見つかりません' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: 'ワークフローの更新に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [Workflow] Updated workflow: ${((workflow.course_basic_info as { title?: string }) || {}).title || workflow.title}`)

    // レスポンスデータを統一フォーマットで返却
    const responseData = {
      id: workflow.id,
      status: workflow.status,
      course_basic_info: workflow.course_basic_info || { title: '', description: '' },
      source_materials: workflow.source_materials || [],
      outline_data: workflow.outline_data || null,
      category_mappings: workflow.category_mappings || [],
      content_data: workflow.content_data || null,
      generation_preferences: workflow.generation_preferences || {},
      current_step: workflow.current_step || '0',
      created_at: workflow.created_at,
      updated_at: workflow.updated_at,

      // 下位互換用
      title: ((workflow.course_basic_info as { title?: string }) || {}).title || workflow.title || '',
      description: ((workflow.course_basic_info as { description?: string }) || {}).description || workflow.description || '',
      sources: workflow.source_materials || [],
      aiOutlineResponse: (workflow.outline_data as { ai_response_raw?: string } | null)?.ai_response_raw || null,
      // DBのcurrent_stepをそのまま使用（最後に作業していたステップに戻る）
      currentStep: parseInt(workflow.current_step || '0')
    }

    return NextResponse.json({
      success: true,
      workflow: responseData
    })

  } catch (error) {
    console.error('❌ [Workflow] Error:', error)
    return NextResponse.json(
      { error: 'ワークフローの更新中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PATCHメソッドをPUTメソッドと同じロジックで処理
export const PATCH = PUT

export async function DELETE(request: NextRequest, context: RouteParams) {
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
    console.log(`📋 [Workflow] Deleting workflow: ${workflowId} for user: ${userId}`)

    const { error } = await supabaseAdmin
      .from('ai_course_workflows')
      .delete()
      .eq('id', workflowId)
      .eq('user_id', userId)

    if (error) {
      console.error('❌ [Workflow] Delete error:', error)
      return NextResponse.json(
        { error: 'ワークフローの削除に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [Workflow] Deleted workflow: ${workflowId}`)

    return NextResponse.json({
      success: true,
      message: 'ワークフローが削除されました'
    })

  } catch (error) {
    console.error('❌ [Workflow] Error:', error)
    return NextResponse.json(
      { error: 'ワークフローの削除中にエラーが発生しました' },
      { status: 500 }
    )
  }
}