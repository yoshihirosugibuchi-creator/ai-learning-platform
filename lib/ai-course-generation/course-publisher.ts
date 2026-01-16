import { CourseGenerationWorkflow } from './types'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Database } from '@/lib/database-types-official'
import { enhanceAIGeneratedCourse, type CourseEnhancementResult } from './knowledge-card-enhancer'
import { generateUniqueId } from '@/lib/id-generation-helper'

type LearningCourse = Database['public']['Tables']['learning_courses']['Insert']

export interface PublishOptions {
  status: 'draft' | 'coming_soon' | 'available'
  skipExistingCheck?: boolean
  generateIds?: boolean
}

export interface PublishResult {
  success: boolean
  courseId?: string
  genreIds?: string[]
  themeIds?: string[]
  sessionIds?: string[]
  contentIds?: string[]
  quizIds?: string[]
  // アウトラインID → DB IDのマッピング
  idMappings?: {
    genres: Record<string, string>    // outline genre id → db genre id
    themes: Record<string, string>    // outline theme id → db theme id
    sessions: Record<string, string>  // outline session id → db session id
  }
  error?: string
  details?: string
}

export class CoursePublisher {
  constructor() {}

  async publishFromOutline(
    workflow: CourseGenerationWorkflow,
    options: PublishOptions = { status: 'draft' }
  ): Promise<PublishResult> {
    try {
      if (!workflow.outline_data) {
        return {
          success: false,
          error: 'アウトラインデータが見つかりません',
          details: 'workflow.outline_data is required for outline publishing'
        }
      }

      if (!workflow.category_mappings || workflow.category_mappings.length === 0) {
        return {
          success: false,
          error: 'カテゴリマッピングデータが見つかりません',
          details: 'workflow.category_mappings is required'
        }
      }

      // トランザクション内でコース作成
      return await this.createCourseWithTransaction(workflow, options, 'outline')
    } catch (error) {
      console.error('[CoursePublisher] アウトライン公開エラー:', error)
      return {
        success: false,
        error: 'アウトライン公開中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  async publishFromContent(
    workflow: CourseGenerationWorkflow,
    options: PublishOptions = { status: 'coming_soon' }
  ): Promise<PublishResult> {
    try {
      if (!workflow.content_data) {
        return {
          success: false,
          error: 'コンテンツデータが見つかりません',
          details: 'workflow.content_data is required for content publishing'
        }
      }

      if (!workflow.outline_data) {
        return {
          success: false,
          error: 'アウトラインデータが見つかりません',
          details: 'workflow.outline_data is required'
        }
      }

      // トランザクション内でコース作成
      return await this.createCourseWithTransaction(workflow, options, 'content')
    } catch (error) {
      console.error('[CoursePublisher] コンテンツ公開エラー:', error)
      return {
        success: false,
        error: 'コンテンツ公開中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  async updateCourseStatus(
    courseId: string,
    status: 'draft' | 'coming_soon' | 'available'
  ): Promise<PublishResult> {
    try {
      const { error } = await supabaseAdmin
        .from('learning_courses')
        .update({
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', courseId)

      if (error) {
        throw error
      }

      return {
        success: true,
        courseId
      }
    } catch (error) {
      console.error('[CoursePublisher] ステータス更新エラー:', error)
      return {
        success: false,
        error: 'コースステータス更新中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  private async createCourseWithTransaction(
    workflow: CourseGenerationWorkflow,
    options: PublishOptions,
    _publishType: 'outline' | 'content'
  ): Promise<PublishResult> {
    try {
      // トランザクション実行をシミュレート（実際のデータベース関数呼び出しの代替）
      const courseId = await generateUniqueId('course', workflow.course_basic_info.title)

      // IDマッピング（アウトラインID → DB ID）- 先に全ID生成
      const idMappings = {
        genres: {} as Record<string, string>,
        themes: {} as Record<string, string>,
        sessions: {} as Record<string, string>
      }

      // 先にすべてのIDを生成（強化処理とDB挿入で同じIDを使用するため）
      const preGeneratedIds: {
        genres: Array<{ outlineId: string; dbId: string; title: string; description: string }>
        themes: Array<{ outlineId: string; dbId: string; title: string; description: string; genreOutlineId: string }>
      } = { genres: [], themes: [] }

      if (workflow.outline_data) {
        for (const genre of workflow.outline_data.genres) {
          const genreDbId = await generateUniqueId('genre', genre.title)
          idMappings.genres[genre.id] = genreDbId
          preGeneratedIds.genres.push({
            outlineId: genre.id,
            dbId: genreDbId,
            title: genre.title,
            description: genre.description
          })

          for (const theme of genre.themes) {
            const themeDbId = await generateUniqueId('theme', theme.title)
            idMappings.themes[theme.id] = themeDbId
            preGeneratedIds.themes.push({
              outlineId: theme.id,
              dbId: themeDbId,
              title: theme.title,
              description: theme.description,
              genreOutlineId: genre.id
            })
          }
        }
      }

      // ナレッジカード・バッジ強化処理（事前生成したIDを使用）
      let enhancements: CourseEnhancementResult | null = null
      if (workflow.outline_data) {
        try {
          console.log('🎯 [CoursePublisher] ナレッジカード・バッジ強化開始')
          const courseData = {
            course: {
              id: courseId,
              title: workflow.course_basic_info.title,
              description: workflow.course_basic_info.description,
              estimated_days: parseInt(workflow.course_basic_info.estimated_duration || '7')
            },
            genres: preGeneratedIds.genres.map(g => ({
              id: g.dbId,  // 事前生成したIDを使用
              title: g.title,
              description: g.description,
              category_id: workflow.category_mappings?.[0]?.selected_category_id || 'general'
            })),
            themes: preGeneratedIds.themes.map(t => ({
              id: t.dbId,  // 事前生成したIDを使用
              title: t.title,
              description: t.description,
              category_id: workflow.category_mappings?.[0]?.selected_category_id || 'general'
            }))
          }

          enhancements = enhanceAIGeneratedCourse(courseData)
          console.log('✅ [CoursePublisher] ナレッジカード・バッジ強化完了', {
            enhancedGenres: enhancements.enhancedGenres.length,
            enhancedThemes: enhancements.enhancedThemes.length
          })
        } catch (enhanceError) {
          console.error('⚠️ [CoursePublisher] ナレッジカード強化エラー:', enhanceError)
          // 強化エラーは致命的でないため、処理を続行
        }
      }

      // 1. コース作成
      const courseData = await this.createCourseData(workflow, options, enhancements?.enhancedCourse.badge_data)
      courseData.id = courseId

      const { error: courseError } = await supabaseAdmin
        .from('learning_courses')
        .insert(courseData)

      if (courseError) {
        throw courseError
      }

      const genreIds: string[] = []
      const themeIds: string[] = []
      const sessionIds: string[] = []
      const contentIds: string[] = []
      const quizIds: string[] = []

      // 2. アウトライン承認済みの場合、ジャンル・テーマ作成
      if (workflow.outline_data && workflow.category_mappings) {
        const outlineData = workflow.outline_data

        // ジャンル作成
        for (let i = 0; i < outlineData.genres.length; i++) {
          const genre = outlineData.genres[i]
          const genreId = idMappings.genres[genre.id]  // 事前生成したIDを使用
          genreIds.push(genreId)

          // 対応するカテゴリマッピングを取得（複数の方法で試行）
          // 方法1: genre_id でマッチング（アウトラインIDベース）
          let categoryMapping = workflow.category_mappings.find(
            m => m.genre_id === genre.id
          )
          // 方法2: genre_title でマッチング（タイトルベース - 最も堅牢）
          if (!categoryMapping) {
            categoryMapping = workflow.category_mappings.find(
              m => m.genre_title === genre.title
            )
          }
          // 方法3: インデックスでマッチング（display_order順）
          if (!categoryMapping && i < workflow.category_mappings.length) {
            categoryMapping = workflow.category_mappings[i]
          }
          // 方法4: フォールバック（最初のマッピング）
          if (!categoryMapping) {
            categoryMapping = workflow.category_mappings[0]
          }

          console.log(`📋 [CoursePublisher] Genre "${genre.title}" category mapping:`, {
            genre_id: genre.id,
            category_id: categoryMapping?.selected_category_id,
            subcategory_id: categoryMapping?.selected_subcategory_id,
            match_method: categoryMapping?.genre_id === genre.id ? 'id' :
                          categoryMapping?.genre_title === genre.title ? 'title' : 'index/fallback'
          })

          // 強化されたジャンルバッジデータを使用（IDが一致するはず）
          const enhancedGenre = enhancements?.enhancedGenres.find(eg => eg.id === genreId)
          const genreData = {
            id: genreId,
            course_id: courseId,
            title: genre.title,
            description: genre.description,
            category_id: categoryMapping?.selected_category_id || 'general',
            subcategory_id: categoryMapping?.selected_subcategory_id || null,
            estimated_days: 1,
            display_order: i,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            badge_data: (enhancedGenre?.badge_data || { genre_type: 'ai_generated' }) as any
          }

          if (enhancedGenre) {
            console.log(`✅ [CoursePublisher] ジャンル「${genre.title}」にバッジデータ適用`)
          }

          const { error: genreError } = await supabaseAdmin
            .from('learning_genres')
            .insert(genreData)

          if (genreError) {
            throw genreError
          }

          // テーマ作成
          for (let j = 0; j < genre.themes.length; j++) {
            const theme = genre.themes[j]
            const themeId = idMappings.themes[theme.id]  // 事前生成したIDを使用
            themeIds.push(themeId)

            // 強化されたテーマナレッジカードデータを使用（IDが一致するはず）
            const enhancedTheme = enhancements?.enhancedThemes.find(et => et.id === themeId)
            const themeData = {
              id: themeId,
              genre_id: genreId,
              title: theme.title,
              description: theme.description,
              estimated_minutes: theme.estimatedMinutes || 15,
              display_order: j,
              reward_card_data: (enhancedTheme?.reward_card_data || {
                card_title: theme.title,
                card_description: theme.description,
                card_type: 'knowledge'
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
              }) as any
            }

            if (enhancedTheme) {
              console.log(`✅ [CoursePublisher] テーマ「${theme.title}」にナレッジカードデータ適用`)
            }

            const { error: themeError } = await supabaseAdmin
              .from('learning_themes')
              .insert(themeData)

            if (themeError) {
              throw themeError
            }

            // 3. セッション作成（アウトライン承認時に実行）
            for (let k = 0; k < theme.sessions.length; k++) {
              const session = theme.sessions[k]
              const sessionId = await generateUniqueId('session', session.title)
              sessionIds.push(sessionId)
              idMappings.sessions[session.id] = sessionId  // マッピング記録

              const sessionData = {
                id: sessionId,
                theme_id: themeId,
                title: session.title,
                estimated_minutes: session.estimatedMinutes || 3,
                session_type: (session.session_type as 'knowledge' | 'practice' | 'case_study') || 'knowledge',
                display_order: k
              }

              const { error: sessionError } = await supabaseAdmin
                .from('learning_sessions')
                .insert(sessionData)

              if (sessionError) {
                throw sessionError
              }

              // 4. コンテンツ承認済みの場合、セッションコンテンツ・クイズ作成
              if (_publishType === 'content' && workflow.content_data) {
                
                // セッションコンテンツ作成
                const sessionContents = workflow.content_data.session_contents.filter(
                  content => content.session_id === session.id
                )
                for (let contentIndex = 0; contentIndex < sessionContents.length; contentIndex++) {
                  const content = sessionContents[contentIndex]
                  // 本番環境パターン: sessionId_content_XX
                  const contentId = `${sessionId}_content_${(contentIndex + 1).toString().padStart(2, '0')}`
                  contentIds.push(contentId)

                  const contentData = {
                    id: contentId,
                    session_id: sessionId,
                    content_type: content.content_type,
                    title: (content.content_data && typeof content.content_data === 'object' && 'title' in content.content_data ? content.content_data.title as string : '') || '',
                    content: (content.content_data && typeof content.content_data === 'object' && 'content' in content.content_data ? content.content_data.content as string : '') || '',
                    duration: (content.content_data && typeof content.content_data === 'object' && 'duration' in content.content_data ? content.content_data.duration as number : null) || null,
                    display_order: content.display_order
                  }

                  const { error: contentError } = await supabaseAdmin
                    .from('session_contents')
                    .insert(contentData)

                  if (contentError) {
                    throw contentError
                  }
                }

                // セッションクイズ作成
                const sessionQuizzes = workflow.content_data.session_quizzes.filter(
                  quiz => quiz.session_id === session.id
                )
                for (let quizIndex = 0; quizIndex < sessionQuizzes.length; quizIndex++) {
                  const quiz = sessionQuizzes[quizIndex]
                  // 本番環境パターン: sessionId_quiz_XX
                  const quizId = `${sessionId}_quiz_${(quizIndex + 1).toString().padStart(2, '0')}`
                  quizIds.push(quizId)

                  const quizData = {
                    id: quizId,
                    session_id: sessionId,
                    question: quiz.question,
                    options: quiz.options,
                    correct_answer: quiz.correct_answer,
                    explanation: quiz.explanation,
                    quiz_type: quiz.quiz_type || 'single_choice',
                    display_order: quiz.display_order
                  }

                  const { error: quizError } = await supabaseAdmin
                    .from('session_quizzes')
                    .insert(quizData)

                  if (quizError) {
                    throw quizError
                  }
                }
              }
            }
          }
        }
      }

      return {
        success: true,
        courseId,
        genreIds,
        themeIds,
        sessionIds,
        contentIds,
        quizIds,
        idMappings
      }

    } catch (error) {
      console.error('[CoursePublisher] Transaction error:', error)
      return {
        success: false,
        error: 'コース作成中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }


  private async createCourseData(
    workflow: CourseGenerationWorkflow,
    options: PublishOptions,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enhancedBadgeData?: any
  ): Promise<LearningCourse> {
    const courseId = options.generateIds !== false 
      ? await generateUniqueId('course', workflow.course_basic_info.title)
      : workflow.course_basic_info.title.toLowerCase().replace(/\s+/g, '_')

    return {
      id: courseId,
      title: workflow.course_basic_info.title,
      description: workflow.course_basic_info.description,
      estimated_days: this.parseEstimatedDays(workflow.course_basic_info.estimated_duration),
      difficulty: workflow.course_basic_info.difficulty || 'basic',
      icon: enhancedBadgeData?.icon || this.generateIcon(workflow.course_basic_info.course_category),
      color: enhancedBadgeData?.color || this.generateColor(workflow.course_basic_info.course_category),
      display_order: await this.getNextDisplayOrder(),
      status: options.status,
      badge_data: enhancedBadgeData || this.createBadgeData(workflow.course_basic_info)
    }
  }


  private generateIcon(category?: string): string {
    const iconMapping: Record<string, string> = {
      '金融': '💰',
      'ファイナンス': '💰',
      'マーケティング': '📈',
      'マネジメント': '👥',
      'テクノロジー': '💻',
      'プログラミング': '💻',
      '営業': '🎯',
      '経営': '🏢'
    }

    if (category) {
      for (const [key, icon] of Object.entries(iconMapping)) {
        if (category.includes(key)) {
          return icon
        }
      }
    }

    return '📚' // デフォルト
  }

  private generateColor(category?: string): string {
    const colorMapping: Record<string, string> = {
      '金融': 'emerald',
      'ファイナンス': 'emerald',
      'マーケティング': 'blue',
      'マネジメント': 'purple',
      'テクノロジー': 'cyan',
      'プログラミング': 'cyan',
      '営業': 'orange',
      '経営': 'red'
    }

    if (category) {
      for (const [key, color] of Object.entries(colorMapping)) {
        if (category.includes(key)) {
          return color
        }
      }
    }

    return 'slate' // デフォルト
  }

  private async getNextDisplayOrder(): Promise<number> {
    const { data, error } = await supabaseAdmin
      .from('learning_courses')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)

    if (error || !data || data.length === 0) {
      return 0
    }

    return (data[0].display_order || 0) + 10
  }

  private parseEstimatedDays(estimatedDuration?: string): number {
    if (!estimatedDuration) return 7
    
    // 「2-4時間」「30分-1時間」などの文字列から日数を推定
    const duration = estimatedDuration.toLowerCase()
    if (duration.includes('30分未満')) return 1
    if (duration.includes('30分-1時間') || duration.includes('1-2時間')) return 1
    if (duration.includes('2-4時間')) return 2
    if (duration.includes('4時間以上')) return 3
    
    // 数字が含まれている場合はそれを抽出
    const numbers = duration.match(/\d+/)
    if (numbers) {
      const num = parseInt(numbers[0])
      if (duration.includes('日')) return num
      if (duration.includes('時間')) return Math.max(1, Math.ceil(num / 4)) // 4時間＝1日と仮定
      if (duration.includes('分')) return 1
    }
    
    return 7 // デフォルト
  }

  private createBadgeData(courseInfo: CourseGenerationWorkflow['course_basic_info']) {
    return {
      estimated_completion: courseInfo.estimated_duration || '1週間',
      target_audience: courseInfo.target_audience || '一般',
      learning_objectives: courseInfo.learning_objectives || [],
      category: courseInfo.course_category || '一般'
    }
  }

  async checkCourseExists(courseId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('learning_courses')
      .select('id')
      .eq('id', courseId)
      .single()

    return !error && !!data
  }

  async deleteCourseFull(courseId: string): Promise<PublishResult> {
    try {
      // カスケード削除により関連データも自動削除
      const { error } = await supabaseAdmin
        .from('learning_courses')
        .delete()
        .eq('id', courseId)

      if (error) {
        throw error
      }

      return {
        success: true,
        courseId
      }
    } catch (error) {
      console.error('[CoursePublisher] コース削除エラー:', error)
      return {
        success: false,
        error: 'コース削除中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * 既存コースからIDマッピングを同期
   * outline_dataのIDとDBのIDをタイトルベースでマッチングし、マッピングを返す
   */
  async syncIdsFromExistingCourse(
    courseId: string,
    outlineData: {
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
  ): Promise<{
    success: boolean
    idMappings?: {
      genres: Record<string, string>
      themes: Record<string, string>
      sessions: Record<string, string>
    }
    error?: string
  }> {
    try {
      console.log(`🔄 [CoursePublisher] syncIdsFromExistingCourse: courseId=${courseId}`)

      // DB からジャンル取得
      const { data: dbGenres, error: genreError } = await supabaseAdmin
        .from('learning_genres')
        .select('id, title, display_order')
        .eq('course_id', courseId)
        .order('display_order', { ascending: true })

      if (genreError) {
        throw genreError
      }

      if (!dbGenres || dbGenres.length === 0) {
        return {
          success: false,
          error: 'コースにジャンルが見つかりません'
        }
      }

      const idMappings = {
        genres: {} as Record<string, string>,
        themes: {} as Record<string, string>,
        sessions: {} as Record<string, string>
      }

      // ジャンルマッピング（タイトルまたは順序でマッチング）
      const outlineGenres = outlineData.genres || []
      for (let i = 0; i < outlineGenres.length; i++) {
        const outlineGenre = outlineGenres[i]
        // タイトルでマッチング、なければ順序でマッチング
        const dbGenre = dbGenres.find(g => g.title === outlineGenre.title) || dbGenres[i]
        if (dbGenre) {
          idMappings.genres[outlineGenre.id] = dbGenre.id
          console.log(`  📋 Genre: ${outlineGenre.id} -> ${dbGenre.id} (${outlineGenre.title})`)

          // テーマ取得
          const { data: dbThemes, error: themeError } = await supabaseAdmin
            .from('learning_themes')
            .select('id, title, display_order')
            .eq('genre_id', dbGenre.id)
            .order('display_order', { ascending: true })

          if (themeError) {
            throw themeError
          }

          // テーママッピング
          const outlineThemes = outlineGenre.themes || []
          for (let j = 0; j < outlineThemes.length; j++) {
            const outlineTheme = outlineThemes[j]
            const dbTheme = dbThemes?.find(t => t.title === outlineTheme.title) || dbThemes?.[j]
            if (dbTheme) {
              idMappings.themes[outlineTheme.id] = dbTheme.id
              console.log(`    📋 Theme: ${outlineTheme.id} -> ${dbTheme.id} (${outlineTheme.title})`)

              // セッション取得
              const { data: dbSessions, error: sessionError } = await supabaseAdmin
                .from('learning_sessions')
                .select('id, title, display_order')
                .eq('theme_id', dbTheme.id)
                .order('display_order', { ascending: true })

              if (sessionError) {
                throw sessionError
              }

              // セッションマッピング
              const outlineSessions = outlineTheme.sessions || []
              for (let k = 0; k < outlineSessions.length; k++) {
                const outlineSession = outlineSessions[k]
                const dbSession = dbSessions?.find(s => s.title === outlineSession.title) || dbSessions?.[k]
                if (dbSession) {
                  idMappings.sessions[outlineSession.id] = dbSession.id
                  console.log(`      📋 Session: ${outlineSession.id} -> ${dbSession.id} (${outlineSession.title})`)
                }
              }
            }
          }
        }
      }

      console.log(`✅ [CoursePublisher] ID同期完了:`, {
        genres: Object.keys(idMappings.genres).length,
        themes: Object.keys(idMappings.themes).length,
        sessions: Object.keys(idMappings.sessions).length
      })

      return {
        success: true,
        idMappings
      }
    } catch (error) {
      console.error('[CoursePublisher] ID同期エラー:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

export const coursePublisher = new CoursePublisher()