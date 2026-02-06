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
      skipExistingCheck = false,
      categoryMappings: requestCategoryMappings  // リクエストから直接渡されたカテゴリマッピング
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

    // カテゴリマッピング: リクエストから渡された場合はそれを使用、なければDBから取得
    const effectiveCategoryMappings = (requestCategoryMappings && Array.isArray(requestCategoryMappings) && requestCategoryMappings.length > 0)
      ? requestCategoryMappings
      : workflow.category_mappings

    if (!effectiveCategoryMappings || !Array.isArray(effectiveCategoryMappings) || effectiveCategoryMappings.length === 0) {
      return NextResponse.json(
        { error: 'カテゴリマッピングが完了していません' },
        { status: 400 }
      )
    }

    console.log(`📋 [PublishOutline] Using category mappings from: ${requestCategoryMappings ? 'request body' : 'database'}, count: ${effectiveCategoryMappings.length}`)

    // アウトラインデータ取得（型安全）
    // 注: 新フローではカテゴリマッピング完了時点で承認とみなすため、approved フラグのチェックは行わない
    const outlineData = (() => {
      if (typeof workflow.outline_data === 'object' && workflow.outline_data !== null) {
        return workflow.outline_data as unknown as OutlineData
      }
      return null
    })()

    if (!outlineData) {
      return NextResponse.json(
        { error: 'アウトラインデータが見つかりません' },
        { status: 400 }
      )
    }

    // カテゴリマッピングをsnake_caseに変換（この処理は既存コース更新にも必要なので先に実行）
    const rawCategoryMappingsForSync = effectiveCategoryMappings as Array<{
      genreId?: string
      genre_id?: string
      selectedCategoryId?: string
      selected_category_id?: string
      selectedSubcategoryId?: string
      selected_subcategory_id?: string
    }> || []

    const categoryMappingsForSync = rawCategoryMappingsForSync.map(m => ({
      genre_id: m.genre_id || m.genreId || '',
      selected_category_id: m.selected_category_id || m.selectedCategoryId,
      selected_subcategory_id: m.selected_subcategory_id || m.selectedSubcategoryId
    }))

    // 既存コースチェック - published_course_idが既に存在する場合はID同期とカテゴリマッピング更新
    if (workflow.published_course_id && !skipExistingCheck) {
      console.log(`⚠️ [PublishOutline] Course already exists: ${workflow.published_course_id}, syncing IDs and updating category mappings`)

      // 既存コースからID同期を取得
      const syncResult = await coursePublisher.syncIdsFromExistingCourse(
        workflow.published_course_id,
        outlineData as {
          genres?: Array<{
            id: string
            title: string
            themes: Array<{
              id: string
              title: string
              sessions: Array<{
                id: string
                title: string
              }>
            }>
          }>
        }
      )

      if (syncResult.success && syncResult.idMappings) {
        const { genres: genreMap, themes: themeMap, sessions: sessionMap } = syncResult.idMappings

        // outline_dataのIDを更新
        const syncedOutlineData = {
          ...outlineData,
          genres: outlineData.genres?.map(genre => ({
            ...genre,
            id: genreMap[genre.id] || genre.id,
            themes: genre.themes.map(theme => ({
              ...theme,
              id: themeMap[theme.id] || theme.id,
              sessions: theme.sessions.map(session => ({
                ...session,
                id: sessionMap[session.id] || session.id
              }))
            }))
          })) || []
        }

        // ワークフローのoutline_dataを更新
        const { error: updateError } = await supabaseAdmin
          .from('ai_course_workflows')
          .update({
            outline_data: JSON.parse(JSON.stringify(syncedOutlineData)),
            updated_at: new Date().toISOString()
          })
          .eq('id', workflowId)
          .eq('user_id', userId)

        if (updateError) {
          console.error('⚠️ [PublishOutline] Workflow ID sync update failed:', updateError)
        } else {
          console.log(`✅ [PublishOutline] ID sync completed for existing course: ${workflow.published_course_id}`)
        }

        // カテゴリマッピングをlearning_genresテーブルに反映
        console.log(`📋 [PublishOutline] Updating category mappings for existing course...`)
        let categoryUpdateCount = 0
        for (const mapping of categoryMappingsForSync) {
          if (!mapping.genre_id) continue

          // outline_dataのジャンルIDからDBのジャンルIDを取得
          const dbGenreId = genreMap[mapping.genre_id] || mapping.genre_id

          const { error: categoryUpdateError } = await supabaseAdmin
            .from('learning_genres')
            .update({
              category_id: mapping.selected_category_id || 'general',
              subcategory_id: mapping.selected_subcategory_id || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', dbGenreId)

          if (categoryUpdateError) {
            console.error(`⚠️ [PublishOutline] Category update failed for genre ${dbGenreId}:`, categoryUpdateError)
          } else {
            categoryUpdateCount++
            console.log(`✅ [PublishOutline] Category updated for genre ${dbGenreId}: ${mapping.selected_category_id}`)
          }
        }
        console.log(`✅ [PublishOutline] Category mappings updated: ${categoryUpdateCount}/${categoryMappingsForSync.length}`)

        return NextResponse.json({
          success: true,
          message: 'コースIDを同期し、カテゴリマッピングを更新しました',
          course_id: workflow.published_course_id,
          already_exists: true,
          id_sync_applied: true,
          category_mappings_updated: categoryUpdateCount,
          id_mappings: syncResult.idMappings
        })
      }

      // ID同期失敗時はエラーを返すが、コースは存在するので警告レベル
      console.warn(`⚠️ [PublishOutline] ID sync failed: ${syncResult.error}`)
      return NextResponse.json({
        success: true,
        message: 'コースは既に作成されていますが、ID同期に失敗しました',
        course_id: workflow.published_course_id,
        already_exists: true,
        id_sync_failed: true,
        id_sync_error: syncResult.error
      })
    }

    // 重複コース作成防止: 同じタイトルのコースが既に存在するかチェック
    const courseTitle = outlineData.course?.title || workflow.title || 'AI生成コース'
    const { data: existingCourse } = await supabaseAdmin
      .from('learning_courses')
      .select('id, title')
      .eq('title', courseTitle)
      .maybeSingle()

    if (existingCourse) {
      console.log(`⚠️ [PublishOutline] Course already exists with title "${courseTitle}": ${existingCourse.id}`)

      // ワークフローのpublished_course_idを更新（不整合修正）
      await supabaseAdmin
        .from('ai_course_workflows')
        .update({
          published_course_id: existingCourse.id,
          status: 'outline_approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', workflowId)
        .eq('user_id', userId)

      return NextResponse.json({
        success: true,
        message: 'コースは既に作成されています',
        course_id: existingCourse.id,
        already_exists: true
      })
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

    // カテゴリマッピングをsnake_caseに変換（フロントエンドはcamelCaseで保存）
    // effectiveCategoryMappingsを使用（リクエストボディから渡された場合はそれを優先）
    const rawCategoryMappings = (effectiveCategoryMappings as Array<{
      genreId?: string
      genre_id?: string
      genreTitle?: string
      genre_title?: string
      selectedCategoryId?: string
      selected_category_id?: string
      selectedSubcategoryId?: string
      selected_subcategory_id?: string
      aiRecommendedCategoryId?: string
      ai_recommended_category_id?: string
      aiRecommendedSubcategoryId?: string
      ai_recommended_subcategory_id?: string
      confidenceScore?: number
      confidence_score?: number
      manualOverride?: boolean
      manual_override?: boolean
    }>) || []

    const categoryMappings = rawCategoryMappings.map(m => ({
      genre_id: m.genre_id || m.genreId || '',
      genre_title: m.genre_title || m.genreTitle || '',
      selected_category_id: m.selected_category_id || m.selectedCategoryId,
      selected_subcategory_id: m.selected_subcategory_id || m.selectedSubcategoryId,
      ai_recommended_category_id: m.ai_recommended_category_id || m.aiRecommendedCategoryId,
      ai_recommended_subcategory_id: m.ai_recommended_subcategory_id || m.aiRecommendedSubcategoryId,
      confidence_score: m.confidence_score ?? m.confidenceScore,
      manual_override: m.manual_override ?? m.manualOverride ?? false
    }))
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
              session_type: (session.session_type as 'knowledge' | 'practice' | 'case_study') || 'knowledge',
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

    // outline_dataのIDをDB IDに更新
    let updatedOutlineData = outlineData

    console.log('📋 [PublishOutline] idMappings received:', {
      hasIdMappings: !!publishResult.idMappings,
      genreCount: publishResult.idMappings ? Object.keys(publishResult.idMappings.genres).length : 0,
      themeCount: publishResult.idMappings ? Object.keys(publishResult.idMappings.themes).length : 0,
      sessionCount: publishResult.idMappings ? Object.keys(publishResult.idMappings.sessions).length : 0
    })

    if (publishResult.idMappings) {
      const { genres: genreMap, themes: themeMap, sessions: sessionMap } = publishResult.idMappings

      // デバッグ: マッピング内容を出力
      console.log('📋 [PublishOutline] Genre mappings:', genreMap)
      console.log('📋 [PublishOutline] Theme mappings (first 3):', Object.entries(themeMap).slice(0, 3))
      console.log('📋 [PublishOutline] Session mappings (first 3):', Object.entries(sessionMap).slice(0, 3))

      updatedOutlineData = {
        ...outlineData,
        genres: outlineData.genres?.map(genre => {
          const newGenreId = genreMap[genre.id] || genre.id
          console.log(`📋 [PublishOutline] Genre: ${genre.id} -> ${newGenreId}`)
          return {
            ...genre,
            id: newGenreId,
            themes: genre.themes.map(theme => {
              const newThemeId = themeMap[theme.id] || theme.id
              return {
                ...theme,
                id: newThemeId,
                sessions: theme.sessions.map(session => {
                  const newSessionId = sessionMap[session.id] || session.id
                  return {
                    ...session,
                    id: newSessionId
                  }
                })
              }
            })
          }
        }) || []
      }

      console.log('📋 [PublishOutline] ID mappings applied:', {
        genres: Object.keys(genreMap).length,
        themes: Object.keys(themeMap).length,
        sessions: Object.keys(sessionMap).length
      })

      // 更新後のID確認
      const firstGenre = updatedOutlineData.genres?.[0]
      console.log('📋 [PublishOutline] Updated first genre ID:', firstGenre?.id)
      console.log('📋 [PublishOutline] Updated first theme ID:', firstGenre?.themes?.[0]?.id)
      console.log('📋 [PublishOutline] Updated first session ID:', firstGenre?.themes?.[0]?.sessions?.[0]?.id)
    }

    // ワークフローのステータス、published_course_id、更新されたoutline_dataを更新
    const { error: updateError } = await supabaseAdmin
      .from('ai_course_workflows')
      .update({
        published_course_id: publishResult.courseId,
        // JSON型に変換
        outline_data: JSON.parse(JSON.stringify(updatedOutlineData)),
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