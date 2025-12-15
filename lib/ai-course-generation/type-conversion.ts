/**
 * CourseWizard型とCoursePublisher型の変換ヘルパー
 */

import { CourseGenerationWorkflow, CategoryMapping as LibCategoryMapping, WorkflowStatus, SourceMaterial } from './types'
import { validateDifficulty } from '@/lib/skill-levels-helper'

// CourseWizard型定義（CourseWizard.tsxで使用されている型）
export interface CourseWizardWorkflow {
  id?: string
  title: string
  description: string
  status: string
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
    approved?: boolean
    [key: string]: unknown
  }
  content_data?: {
    approved?: boolean
    [key: string]: unknown
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
  const validatedDifficulty = await validateDifficulty(wizardWorkflow.difficultyId)

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
      genres: [],
      approved: wizardWorkflow.outline_data.approved || false,
      ...wizardWorkflow.outline_data
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