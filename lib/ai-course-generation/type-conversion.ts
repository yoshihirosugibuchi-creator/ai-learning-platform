/**
 * CourseWizard型とCoursePublisher型の変換ヘルパー
 */

import { CourseGenerationWorkflow, CategoryMapping as LibCategoryMapping, WorkflowStatus, SourceMaterial } from './types'

// CourseWizard型定義（CourseWizard.tsxで使用されている型）
export interface CourseWizardWorkflow {
  id: string
  title: string
  description: string
  status: WorkflowStatus
  sources: SourceMaterial[]
  aiOutlineResponse?: string
  currentStep: number
  created_at?: string
  updated_at?: string
  difficultyId?: string
  estimatedDuration?: string
  learningObjectives?: string[]
  targetAudience?: string
  courseCategory?: string
  generationPreferences?: {
    sessionLength: number
    includeQuizzes: boolean
    interactivityLevel: 'low' | 'medium' | 'high'
    contentStyle: 'formal' | 'casual' | 'technical'
  }
  categoryMappings?: CourseWizardCategoryMapping[]
  outline_data?: {
    course?: {
      title: string
      description: string
      estimatedDays: number
      difficulty: string
      targetAudience: string
      learningObjectives: string[]
      badge_data?: Record<string, unknown>
    }
    genres?: Array<{
      id: string
      title: string
      description: string
      suggested_category_id?: string
      suggested_subcategory_id?: string
      estimatedDays: number
      display_order: number
      themes: Array<{
        id: string
        title: string
        description: string
        estimatedMinutes: number
        display_order: number
        reward_card_data?: Record<string, unknown>
        sessions: Array<{
          id: string
          title: string
          description?: string
          session_type: 'knowledge' | 'practice' | 'case_study'
          estimatedMinutes: number
          display_order: number
        }>
      }>
    }>
    review_notes?: string
    approved?: boolean
    generated_at?: string
    ai_response_raw?: string
  }
  content_data?: {
    approved?: boolean
    [key: string]: unknown
  }
  // DBから取得したコース構造（Step 4以降はこちらを優先使用）
  course_structure?: {
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
  }
}

export interface CourseWizardCategoryMapping {
  genreId: string
  genreTitle: string
  selectedCategoryId?: string
  selectedSubcategoryId?: string
  aiRecommendedCategoryId?: string
  aiRecommendedSubcategoryId?: string
  confidenceScore?: number
  manualOverride: boolean
}

/**
 * CourseWizard型をCourseGenerationWorkflow型に変換
 */
export async function convertToPublisherWorkflow(
  wizardWorkflow: CourseWizardWorkflow
): Promise<CourseGenerationWorkflow> {
  // WorkflowStatusのマッピング
  const statusMapping: Record<string, WorkflowStatus> = {
    'draft': 'draft',
    'source_analysis': 'source_analysis', 
    'outline_draft': 'outline_draft',
    'manual_input_required': 'manual_input_required',
    'outline_approved': 'outline_approved',
    'category_mapping_completed': 'category_mapping_completed',
    'content_generated': 'content_generated',
    'content_approved': 'content_approved',
    'final_review_completed': 'final_review_completed',
    'published': 'published'
  }

  const mappedStatus = statusMapping[wizardWorkflow.status] || 'draft'

  // CategoryMappingの変換
  const categoryMappings: LibCategoryMapping[] = (wizardWorkflow.categoryMappings || []).map(mapping => ({
    genre_id: mapping.genreId,
    genre_title: mapping.genreTitle,
    selected_category_id: mapping.selectedCategoryId,
    selected_subcategory_id: mapping.selectedSubcategoryId,
    ai_recommended_category_id: mapping.aiRecommendedCategoryId,
    ai_recommended_subcategory_id: mapping.aiRecommendedSubcategoryId,
    confidence_score: mapping.confidenceScore,
    manual_override: mapping.manualOverride
  }))

  // 難易度をskill_levelsテーブルでチェック
  const validatedDifficulty = wizardWorkflow.difficultyId || 'basic'

  return {
    id: wizardWorkflow.id,
    user_id: undefined, // CourseWizardでは管理していない
    status: mappedStatus,
    course_basic_info: {
      title: wizardWorkflow.title,
      description: wizardWorkflow.description,
      difficulty: validatedDifficulty,
      target_audience: wizardWorkflow.targetAudience,
      learning_objectives: wizardWorkflow.learningObjectives || [],
      estimated_duration: wizardWorkflow.estimatedDuration,
      course_category: wizardWorkflow.courseCategory
    },
    source_materials: wizardWorkflow.sources,
    outline_data: wizardWorkflow.outline_data ? {
      course: { 
        title: wizardWorkflow.title, 
        description: wizardWorkflow.description,
        estimatedDays: parseInt(wizardWorkflow.estimatedDuration || '7'),
        difficulty: validatedDifficulty,
        targetAudience: wizardWorkflow.targetAudience || '',
        learningObjectives: wizardWorkflow.learningObjectives || []
      },
      genres: wizardWorkflow.outline_data.genres?.map((genre: {
        id: string;
        title: string;
        description?: string;
        estimatedDays?: number;
        display_order?: number;
        themes?: Array<{
          id: string;
          title: string;
          description?: string;
          estimatedMinutes?: number;
          display_order?: number;
          sessions?: Array<{
            id: string;
            title: string;
            session_type?: 'knowledge' | 'practice' | 'case_study';
            estimatedMinutes?: number;
            display_order?: number;
          }>;
        }>;
      }) => ({
        ...genre,
        description: genre.description || '',
        estimatedDays: genre.estimatedDays || 1,
        display_order: genre.display_order || 1,
        themes: genre.themes?.map((theme: {
          id: string;
          title: string;
          description?: string;
          estimatedMinutes?: number;
          display_order?: number;
          sessions?: Array<{
            id: string;
            title: string;
            session_type?: 'knowledge' | 'practice' | 'case_study';
            estimatedMinutes?: number;
            display_order?: number;
          }>;
        }) => ({
          ...theme,
          description: theme.description || '',
          estimatedMinutes: theme.estimatedMinutes || 30,
          display_order: theme.display_order || 1,
          sessions: theme.sessions?.map((session: {
            id: string;
            title: string;
            session_type?: 'knowledge' | 'practice' | 'case_study';
            estimatedMinutes?: number;
            display_order?: number;
          }) => ({
            ...session,
            session_type: session.session_type || 'knowledge',
            estimatedMinutes: session.estimatedMinutes || 15,
            display_order: session.display_order || 1
          })) || []
        })) || []
      })) || [],
      approved: wizardWorkflow.outline_data.approved || false,
      ...(wizardWorkflow.outline_data as { [key: string]: unknown })
    } : undefined,
    category_mappings: categoryMappings,
    content_data: wizardWorkflow.content_data ? {
      session_contents: [],
      session_quizzes: [],
      reward_cards: [],
      approved: wizardWorkflow.content_data.approved || false,
      ...wizardWorkflow.content_data
    } : undefined,
    generation_preferences: wizardWorkflow.generationPreferences ? {
      ai_mode: 'manual' as const,
      depth: 'standard' as const,
      style: wizardWorkflow.generationPreferences.contentStyle,
      include_quizzes: wizardWorkflow.generationPreferences.includeQuizzes,
      session_length: wizardWorkflow.generationPreferences.sessionLength,
      interactivity_level: wizardWorkflow.generationPreferences.interactivityLevel
    } : undefined
  }
}

/**
 * 部分的な更新用の型変換（onChange時に使用）
 */
export function mergeWorkflowUpdate(
  existingWizardWorkflow: CourseWizardWorkflow,
  updates: Partial<CourseWizardWorkflow>
): CourseWizardWorkflow {
  return {
    ...existingWizardWorkflow,
    ...updates
  }
}

// CourseWorkflow から CourseWizardWorkflow への変換
export function convertToWizardWorkflow(courseWorkflow: { 
  id?: string; 
  title?: string; 
  description?: string; 
  status?: string;
  [key: string]: unknown;
}): CourseWizardWorkflow {
  return {
    id: courseWorkflow.id || '',
    title: courseWorkflow.title || '',
    description: courseWorkflow.description || '',
    status: (courseWorkflow.status as WorkflowStatus) || 'draft',
    sources: (courseWorkflow.sources as SourceMaterial[]) || [],
    currentStep: (courseWorkflow.currentStep as number) || 0,
    created_at: courseWorkflow.created_at as string | undefined,
    updated_at: courseWorkflow.updated_at as string | undefined,
    difficultyId: courseWorkflow.difficultyId as string | undefined,
    estimatedDuration: courseWorkflow.estimatedDuration as string | undefined,
    learningObjectives: courseWorkflow.learningObjectives as string[] | undefined,
    targetAudience: courseWorkflow.targetAudience as string | undefined,
    courseCategory: courseWorkflow.courseCategory as string | undefined,
    generationPreferences: courseWorkflow.generationPreferences as CourseWizardWorkflow['generationPreferences'],
    categoryMappings: courseWorkflow.categoryMappings as CourseWizardCategoryMapping[] | undefined,
    outline_data: courseWorkflow.outline_data as CourseWizardWorkflow['outline_data'],
    content_data: courseWorkflow.content_data as CourseWizardWorkflow['content_data'],
    aiOutlineResponse: courseWorkflow.aiOutlineResponse as string | undefined
  }
}

// CourseWizardWorkflow から CourseWorkflow への変換
export function convertFromWizardWorkflow(wizardWorkflow: CourseWizardWorkflow): { [key: string]: unknown } {
  return {
    id: wizardWorkflow.id,
    title: wizardWorkflow.title,
    description: wizardWorkflow.description,
    status: wizardWorkflow.status,
    sources: wizardWorkflow.sources,
    currentStep: wizardWorkflow.currentStep,
    created_at: wizardWorkflow.created_at,
    updated_at: wizardWorkflow.updated_at,
    difficultyId: wizardWorkflow.difficultyId,
    estimatedDuration: wizardWorkflow.estimatedDuration,
    learningObjectives: wizardWorkflow.learningObjectives,
    targetAudience: wizardWorkflow.targetAudience,
    courseCategory: wizardWorkflow.courseCategory,
    generationPreferences: wizardWorkflow.generationPreferences,
    categoryMappings: wizardWorkflow.categoryMappings,
    outline_data: wizardWorkflow.outline_data,
    content_data: wizardWorkflow.content_data,
    aiOutlineResponse: wizardWorkflow.aiOutlineResponse
  }
}