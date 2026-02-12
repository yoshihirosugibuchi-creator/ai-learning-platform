/**
 * AI生成コースシステム - 設計書準拠型定義
 * 完全なワークフロー型定義とデータ構造
 */

// アウトラインデータの型定義
export interface OutlineData {
  course?: {
    title: string
    description?: string
    estimatedDays?: number
    difficulty?: string
    targetAudience?: string
    learningObjectives?: string[]
  }
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
  approved?: boolean
  review_notes?: string
  generated_at?: string
  ai_response_raw?: string
  [key: string]: unknown
}

// コンテンツデータの型定義
export interface ContentData {
  approved?: boolean
  review_notes?: string
  generated_at?: string
  session_contents?: unknown[]
  session_quizzes?: unknown[]
  reward_cards?: unknown[]
  [key: string]: unknown
}

// ワークフローステータス（設計書準拠）
export type WorkflowStatus = 
  | 'draft'                    // 下書き作成中
  | 'source_analysis'          // 参考資料解析中
  | 'outline_draft'            // アウトライン生成中  
  | 'manual_input_required'    // 手動AI入力待ち
  | 'outline_approved'         // アウトライン承認済み
  | 'category_mapping_completed' // カテゴリマッピング完了
  | 'content_generated'        // コンテンツ生成完了
  | 'content_approved'         // コンテンツ承認済み
  | 'final_review_completed'   // 最終レビュー完了
  | 'published'                // 公開済み

// 参考資料の型定義
export interface SourceMaterial {
  id: string
  type: 'pdf' | 'url' | 'text'
  title: string
  content: string
  originalUrl?: string
  fileSize?: number
  extractedAt: string
  metadata?: {
    pageCount?: number
    wordCount?: number
    language?: string
    author?: string
  }
  // Blob Storage オプション機能
  blobStorage?: {
    url: string
    uploadedAt: string
    publicWarningAccepted: boolean
  }
}

// AI生成アウトライン型定義
export interface CourseOutline {
  title: string
  description: string
  estimatedDays: number
  difficulty: string  // skill_levelsテーブルから動的に検証
  targetAudience: string
  learningObjectives: string[]
  badge_data?: Json // AI生成修了証バッジ
}

export interface GenreOutline {
  id: string
  title: string
  description: string
  suggested_category_id?: string
  suggested_subcategory_id?: string
  estimatedDays: number
  display_order: number
  themes: ThemeOutline[]
}

export interface ThemeOutline {
  id: string
  title: string
  description: string
  suggested_subcategory_id?: string // テーマ単位のサブカテゴリー（ジャンルに設定がない場合に使用）
  estimatedMinutes: number
  display_order: number
  reward_card_data?: Json // AI生成ナレッジカード
  sessions: SessionOutline[]
}

export interface SessionOutline {
  id: string
  title: string
  description?: string
  session_type: 'knowledge' | 'practice' | 'case_study'
  estimatedMinutes: number
  display_order: number
}

// テーマ単位のサブカテゴリーマッピング
export interface ThemeSubcategoryMapping {
  theme_id: string
  theme_title?: string
  selected_subcategory_id?: string
}

// カテゴリマッピング型定義
export interface CategoryMapping {
  genre_id: string
  genre_title: string
  selected_category_id?: string
  selected_subcategory_id?: string
  ai_recommended_category_id?: string
  ai_recommended_subcategory_id?: string
  confidence_score?: number
  manual_override: boolean
  // テーマ単位のサブカテゴリーマッピング（ジャンルにサブカテゴリーがない場合に使用）
  theme_mappings?: ThemeSubcategoryMapping[]
}

// AI提案情報
export interface AISuggestion {
  type: 'category' | 'content' | 'structure'
  target_id: string
  suggestion: string
  confidence: number
  reasoning: string
}

// コンテンツ生成型定義
export interface SessionContent {
  id: string
  session_id: string
  content_type: 'text' | 'example' | 'key_points'
  content_data: Json
  display_order: number
}

export interface SessionQuiz {
  id: string
  session_id: string
  quiz_type: 'single_choice'
  question: string
  options: string[]
  correct_answer: number
  explanation: string
  display_order: number
}

// メインワークフロー型定義（設計書準拠）
export interface CourseGenerationWorkflow {
  id?: string
  user_id?: string
  status: WorkflowStatus
  
  // Step 0-1 で入力される基本情報（設計書 course_basic_info）
  course_basic_info: {
    title: string
    description: string
    difficulty?: string
    target_audience?: string
    learning_objectives?: string[]
    estimated_duration?: string
    course_category?: string
  }
  
  // Step 1 で入力される参考資料（設計書 source_materials）
  source_materials: SourceMaterial[]
  
  // Step 2 で生成されるアウトライン（設計書 outline_data）
  outline_data?: {
    course: CourseOutline
    genres: GenreOutline[]
    ai_suggestions?: AISuggestion[]
    review_notes?: string
    approved: boolean
    generated_at?: string
    ai_response_raw?: string // 手動モード用
  }
  
  // Step 3 で設定されるカテゴリマッピング（設計書 category_mappings）
  category_mappings?: CategoryMapping[]
  
  // Step 4 で生成される詳細コンテンツ（設計書 content_data）
  content_data?: {
    session_contents: SessionContent[]
    session_quizzes: SessionQuiz[]
    reward_cards?: Json[]
    completion_badge?: Json
    review_notes?: string
    approved: boolean
    generated_at?: string
    ai_response_raw?: string
    generated_sessions?: string[] // 生成済みセッションID一覧
  }
  
  // Step 5 公開時に設定（設計書 published_course_id）
  published_course_id?: string
  
  // AI生成設定
  generation_preferences?: {
    ai_mode: 'manual' | 'api'
    depth: 'minimal' | 'standard' | 'detailed'
    style: 'formal' | 'casual' | 'technical' | 'practical'
    include_quizzes: boolean
    session_length: number
    interactivity_level: 'low' | 'medium' | 'high'
    diagram_style?: 'mermaid' | 'ascii' | 'none'  // 図表形式（デフォルト: mermaid）
  }
  
  // 手動AI入力用（現在の手動プロンプト情報）
  current_prompt?: string
  current_step?: string
  prompt_id?: string
  
  // レビュー情報
  outline_review_notes?: string
  content_review_notes?: string
  
  // タイムスタンプ
  created_at?: string
  updated_at?: string
}

// 下位互換用（現在のコンポーネントとの互換性）
export interface LegacyWorkflowData {
  id?: string
  title: string
  description: string
  status: WorkflowStatus
  sources: SourceMaterial[]
  aiOutlineResponse?: string
  currentStep: number
  difficultyId?: string
  estimatedDuration?: string
  learningObjectives?: string[]
  targetAudience?: string
  courseCategory?: string
  generationPreferences?: {
    sessionLength: number
    includeQuizzes: boolean
    interactivityLevel: 'low' | 'medium' | 'high'
    contentStyle: 'formal' | 'casual' | 'technical' | 'practical'
  }
  categoryMappings?: CategoryMapping[]
  created_at?: string
  updated_at?: string
}

// 型変換ヘルパー
export function convertToStandardWorkflow(legacy: LegacyWorkflowData): CourseGenerationWorkflow {
  return {
    id: legacy.id,
    status: legacy.status,
    course_basic_info: {
      title: legacy.title,
      description: legacy.description,
      difficulty: legacy.difficultyId,
      target_audience: legacy.targetAudience,
      learning_objectives: legacy.learningObjectives,
      estimated_duration: legacy.estimatedDuration,
      course_category: legacy.courseCategory
    },
    source_materials: legacy.sources,
    outline_data: legacy.aiOutlineResponse ? {
      course: {
        title: legacy.title,
        description: legacy.description,
        estimatedDays: 7, // デフォルト値
        difficulty: legacy.difficultyId || 'basic',
        targetAudience: legacy.targetAudience || '',
        learningObjectives: legacy.learningObjectives || []
      },
      genres: [], // AI解析結果から抽出する必要がある
      approved: false,
      ai_response_raw: legacy.aiOutlineResponse
    } : undefined,
    category_mappings: legacy.categoryMappings,
    generation_preferences: legacy.generationPreferences ? {
      ai_mode: 'manual',
      depth: 'standard',
      style: legacy.generationPreferences.contentStyle || 'practical',
      include_quizzes: legacy.generationPreferences.includeQuizzes,
      session_length: legacy.generationPreferences.sessionLength,
      interactivity_level: legacy.generationPreferences.interactivityLevel
    } : undefined,
    created_at: legacy.created_at,
    updated_at: legacy.updated_at
  }
}

export function convertToLegacyWorkflow(standard: CourseGenerationWorkflow): LegacyWorkflowData {
  return {
    id: standard.id,
    title: standard.course_basic_info.title,
    description: standard.course_basic_info.description,
    status: standard.status,
    sources: standard.source_materials,
    aiOutlineResponse: standard.outline_data?.ai_response_raw,
    currentStep: getStepFromStatus(standard.status),
    difficultyId: standard.course_basic_info.difficulty,
    estimatedDuration: standard.course_basic_info.estimated_duration,
    learningObjectives: standard.course_basic_info.learning_objectives,
    targetAudience: standard.course_basic_info.target_audience,
    courseCategory: standard.course_basic_info.course_category,
    generationPreferences: standard.generation_preferences ? {
      sessionLength: standard.generation_preferences.session_length,
      includeQuizzes: standard.generation_preferences.include_quizzes,
      interactivityLevel: standard.generation_preferences.interactivity_level,
      contentStyle: standard.generation_preferences.style
    } : undefined,
    categoryMappings: standard.category_mappings,
    created_at: standard.created_at,
    updated_at: standard.updated_at
  }
}

// ステータスからステップ番号への変換
function getStepFromStatus(status: WorkflowStatus): number {
  switch (status) {
    case 'draft': return 0
    case 'source_analysis': return 1
    case 'outline_draft':
    case 'manual_input_required': return 2
    case 'outline_approved': return 3
    case 'content_generated': return 4
    case 'content_approved': return 5
    case 'published': return 6
    default: return 0
  }
}

// Json型定義（Supabase準拠）
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]