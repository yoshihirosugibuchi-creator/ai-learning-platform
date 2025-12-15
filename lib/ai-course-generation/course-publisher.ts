import { CourseGenerationWorkflow } from './types'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Database } from '@/lib/database-types-official'
import { enhanceAIGeneratedCourse, type CourseEnhancementResult } from './knowledge-card-enhancer'

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
      const courseId = this.generateCourseId(workflow.course_basic_info.title)
      
      // ナレッジカード・バッジ強化処理
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
            genres: workflow.outline_data.genres.map(genre => ({
              id: this.generateId('genre', genre.title),
              title: genre.title,
              description: genre.description,
              category_id: workflow.category_mappings?.[0]?.selected_category_id || 'general'
            })),
            themes: workflow.outline_data.genres.flatMap(genre =>
              genre.themes.map(theme => ({
                id: this.generateId('theme', theme.title),
                title: theme.title,
                description: theme.description,
                category_id: workflow.category_mappings?.[0]?.selected_category_id || 'general'
              }))
            )
          }
          
          enhancements = enhanceAIGeneratedCourse(courseData)
          console.log('✅ [CoursePublisher] ナレッジカード・バッジ強化完了')
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
        const categoryMapping = workflow.category_mappings[0]

        // ジャンル作成
        for (let i = 0; i < outlineData.genres.length; i++) {
          const genre = outlineData.genres[i]
          const genreId = this.generateId('genre', genre.title)
          genreIds.push(genreId)

          // 強化されたジャンルバッジデータを使用
          const enhancedGenre = enhancements?.enhancedGenres.find(eg => eg.id === genreId)
          const genreData = {
            id: genreId,
            course_id: courseId,
            title: genre.title,
            description: genre.description,
            category_id: categoryMapping.selected_category_id || 'general',
            subcategory_id: categoryMapping.selected_subcategory_id,
            estimated_days: 1,
            display_order: i,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            badge_data: (enhancedGenre?.badge_data || { genre_type: 'ai_generated' }) as any
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
            const themeId = this.generateId('theme', theme.title)
            themeIds.push(themeId)

            // 強化されたテーマナレッジカードデータを使用
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

            const { error: themeError } = await supabaseAdmin
              .from('learning_themes')
              .insert(themeData)

            if (themeError) {
              throw themeError
            }

            // 3. セッション作成（アウトライン承認時に実行）
            for (let k = 0; k < theme.sessions.length; k++) {
              const session = theme.sessions[k]
              const sessionId = this.generateId('session', session.title)
              sessionIds.push(sessionId)

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
                for (const content of sessionContents) {
                  const contentId = this.generateId('content', sessionId)
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
                for (const quiz of sessionQuizzes) {
                  const quizId = this.generateId('quiz', sessionId)
                  quizIds.push(quizId)

                  const quizData = {
                    id: quizId,
                    session_id: sessionId,
                    question: quiz.question,
                    options: quiz.options,
                    correct_answer: quiz.correct_answer,
                    explanation: quiz.explanation,
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
        quizIds
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

  private generateCourseId(title: string): string {
    // English-only course ID generation
    const sanitized = title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50)
    
    const timestamp = Date.now().toString(36)
    return `${sanitized}_${timestamp}`
  }

  private generateId(prefix: string, title: string): string {
    // English-only ID generation
    const sanitized = title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 30)
    
    const timestamp = Date.now().toString(36)
    return `${prefix}_${sanitized}_${timestamp}`
  }

  private async createCourseData(
    workflow: CourseGenerationWorkflow,
    options: PublishOptions,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    enhancedBadgeData?: any
  ): Promise<LearningCourse> {
    const courseId = options.generateIds !== false 
      ? this.generateCourseId(workflow.course_basic_info.title)
      : workflow.course_basic_info.title.toLowerCase().replace(/\s+/g, '_')

    return {
      id: courseId,
      title: workflow.course_basic_info.title,
      description: workflow.course_basic_info.description,
      estimated_days: parseInt(workflow.course_basic_info.estimated_duration || '7'),
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
}

export const coursePublisher = new CoursePublisher()