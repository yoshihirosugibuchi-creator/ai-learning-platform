/**
 * コース概要設定ステップ
 * コースの基本情報とAI生成パラメータを設定
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  BookOpen, 
  Target, 
  TrendingUp,
  Plus,
  X,
  ArrowRight,
  Settings,
  Lightbulb,
  Users
} from 'lucide-react'

// ワークフロー状態の型定義
export type WorkflowStatus = 
  | 'draft' 
  | 'source_analysis' 
  | 'outline_draft' 
  | 'manual_input_required'
  | 'outline_approved' 
  | 'content_draft' 
  | 'content_approved' 
  | 'published'

interface SourceMaterial {
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
}

interface CourseGenerationWorkflow {
  id?: string
  title: string
  description: string
  status: WorkflowStatus
  sources: SourceMaterial[]
  aiOutlineResponse?: string
  currentStep: number
  created_at?: string
  updated_at?: string
  // コース設定関連の新しいフィールド
  difficultyId?: string  // skill_levelsテーブルのIDを参照
  estimatedDuration?: string
  learningObjectives?: string[]
  targetAudience?: string
  courseCategory?: string
  generationPreferences?: {
    sessionLength: number
    includeQuizzes: boolean
    interactivityLevel: 'low' | 'medium' | 'high'  // コンテンツの相互作用レベル
    contentStyle: 'formal' | 'casual' | 'technical'
  }
}

interface CourseSetupStepProps {
  workflow: CourseGenerationWorkflow
  onChange: (workflow: CourseGenerationWorkflow) => void
  onNext: () => void
}

interface SkillLevel {
  id: string
  name: string
  display_name: string
  description?: string
  target_experience?: string
  display_order: number
}

const DURATION_OPTIONS = [
  { value: '30分未満', label: '30分未満' },
  { value: '30分-1時間', label: '30分-1時間' },
  { value: '1-2時間', label: '1-2時間' },
  { value: '2-4時間', label: '2-4時間' },
  { value: '4時間以上', label: '4時間以上' }
]

interface Category {
  category_id: string
  name: string
  description?: string
  type: string
  icon?: string
  color?: string
  display_order: number
  is_active: boolean
}

export function CourseSetupStep({ workflow, onChange, onNext }: CourseSetupStepProps) {
  const [learningObjective, setLearningObjective] = useState('')
  const [skillLevels, setSkillLevels] = useState<SkillLevel[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingSkillLevels, setIsLoadingSkillLevels] = useState(true)
  const [isLoadingCategories, setIsLoadingCategories] = useState(true)

  // スキルレベル取得
  useEffect(() => {
    const loadSkillLevels = async () => {
      try {
        const { ApiClient } = await import('@/lib/api-helpers')
        const data = await ApiClient.get<{ skill_levels: SkillLevel[] }>('/api/skill-levels')
        setSkillLevels(data.skill_levels || [])
      } catch (error) {
        console.error('Failed to load skill levels:', error)
      } finally {
        setIsLoadingSkillLevels(false)
      }
    }

    loadSkillLevels()
  }, [])

  // カテゴリー取得
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { ApiClient } = await import('@/lib/api-helpers')
        const data = await ApiClient.get<{ categories: Category[] }>('/api/categories')
        console.log('Categories API response:', data) // デバッグ用
        const categoryList = data.categories || []
        console.log('Active categories:', categoryList.filter((c: Category) => c.is_active)) // デバッグ用
        setCategories(categoryList)
      } catch (error) {
        console.error('Failed to load categories:', error)
      } finally {
        setIsLoadingCategories(false)
      }
    }

    loadCategories()
  }, [])

  // フォームの状態更新
  const updateWorkflow = (updates: Partial<CourseGenerationWorkflow>) => {
    onChange({ ...workflow, ...updates })
  }

  // 学習目標の追加
  const addLearningObjective = () => {
    if (learningObjective.trim()) {
      const currentObjectives = workflow.learningObjectives || []
      updateWorkflow({
        learningObjectives: [...currentObjectives, learningObjective.trim()]
      })
      setLearningObjective('')
    }
  }

  // 学習目標の削除
  const removeLearningObjective = (index: number) => {
    const currentObjectives = workflow.learningObjectives || []
    updateWorkflow({
      learningObjectives: currentObjectives.filter((_, i) => i !== index)
    })
  }

  // 生成設定の更新
  const updateGenerationPreferences = (updates: Partial<CourseGenerationWorkflow['generationPreferences']>) => {
    updateWorkflow({
      generationPreferences: {
        sessionLength: 15,
        includeQuizzes: true,
        interactivityLevel: 'medium',
        contentStyle: 'formal',
        ...workflow.generationPreferences,
        ...updates
      }
    })
  }

  // 次ステップへ進む前のバリデーション
  const handleNext = () => {
    if (!workflow.title.trim()) {
      return // エラーハンドリングは親コンポーネントで行う
    }
    onNext()
  }

  const isFormValid = workflow.title.trim().length > 0 && 
                     workflow.description.trim().length > 0 &&
                     workflow.difficultyId &&
                     (workflow.learningObjectives?.length || 0) > 0

  // デバッグ用
  console.log('Form validation debug:', {
    title: workflow.title?.trim().length > 0,
    description: workflow.description?.trim().length > 0,
    difficultyId: !!workflow.difficultyId,
    learningObjectives: (workflow.learningObjectives?.length || 0) > 0,
    isFormValid
  })

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
          <Settings className="h-6 w-6 text-blue-600" />
          コース概要設定
        </h2>
        <p className="text-muted-foreground">
          AIが最適なコースを生成するための基本情報を設定してください
        </p>
      </div>

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            基本情報
          </CardTitle>
          <CardDescription>
            コースのタイトルと概要を設定してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="courseTitle">コースタイトル *</Label>
            <Input
              id="courseTitle"
              placeholder="例: 金融基礎完全マスター講座"
              value={workflow.title}
              onChange={(e) => updateWorkflow({ title: e.target.value })}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="courseDescription">コース概要 *</Label>
            <Textarea
              id="courseDescription"
              placeholder="このコースで学べる内容や対象者について説明してください（2-3文程度）"
              value={workflow.description}
              onChange={(e) => updateWorkflow({ description: e.target.value })}
              className="mt-1 min-h-20"
            />
          </div>

          <div>
            <Label htmlFor="targetAudience">対象者</Label>
            <Input
              id="targetAudience"
              placeholder="例: 金融業界初心者、投資を始めたい方"
              value={workflow.targetAudience || ''}
              onChange={(e) => updateWorkflow({ targetAudience: e.target.value })}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* コース設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            コース設定
          </CardTitle>
          <CardDescription>
            学習者に最適な難易度と学習時間を設定してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 難易度選択 */}
          <div>
            <Label>難易度 *</Label>
            {isLoadingSkillLevels ? (
              <div className="text-sm text-muted-foreground mt-2">難易度レベルを読み込み中...</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                {skillLevels
                  .sort((a, b) => a.display_order - b.display_order)
                  .map((skillLevel) => (
                    <button
                      key={skillLevel.id}
                      type="button"
                      onClick={() => updateWorkflow({ difficultyId: skillLevel.id })}
                      className={`p-3 text-left border rounded-lg transition-colors hover:bg-muted/50 ${
                        workflow.difficultyId === skillLevel.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-border'
                      }`}
                    >
                      <div className="font-medium">{skillLevel.name}</div>
                      {skillLevel.target_experience && (
                        <div className="text-xs text-muted-foreground">
                          {skillLevel.target_experience}
                        </div>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* 推定学習時間 */}
          <div>
            <Label htmlFor="estimatedDuration">推定学習時間</Label>
            <select
              id="estimatedDuration"
              value={workflow.estimatedDuration || ''}
              onChange={(e) => updateWorkflow({ estimatedDuration: e.target.value })}
              className="mt-1 w-full p-2 border border-border rounded-md"
            >
              <option value="">選択してください</option>
              {DURATION_OPTIONS.map((option, index) => (
                <option key={`duration-${option.value}-${index}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* カテゴリ */}
          <div>
            <Label htmlFor="courseCategory">カテゴリ</Label>
            {isLoadingCategories ? (
              <div className="text-sm text-muted-foreground mt-2">カテゴリを読み込み中...</div>
            ) : (
              <select
                id="courseCategory"
                value={workflow.courseCategory || ''}
                onChange={(e) => updateWorkflow({ courseCategory: e.target.value })}
                className="mt-1 w-full p-2 border border-border rounded-md"
              >
                <option value="">選択してください</option>
                {categories
                  .filter(category => category.is_active)  // アクティブなカテゴリーのみ表示
                  .sort((a, b) => a.display_order - b.display_order)  // 表示順でソート
                  .map((category, index) => (
                    <option key={`category-${category.category_id}-${index}`} value={category.name}>
                      {category.name}
                    </option>
                  ))}
              </select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 学習目標 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            学習目標 *
          </CardTitle>
          <CardDescription>
            このコースで達成したい学習目標を設定してください（最低1つ）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 目標入力 */}
          <div className="flex gap-2">
            <Input
              placeholder="例: 基本的な財務諸表を読み取れるようになる"
              value={learningObjective}
              onChange={(e) => setLearningObjective(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addLearningObjective()
                }
              }}
            />
            <Button 
              type="button"
              onClick={addLearningObjective}
              disabled={!learningObjective.trim()}
              size="sm"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* 目標リスト */}
          {workflow.learningObjectives && workflow.learningObjectives.length > 0 && (
            <div className="space-y-2">
              {workflow.learningObjectives.map((objective, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                  <Lightbulb className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                  <span className="flex-1 text-sm">{objective}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLearningObjective(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI生成設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            AI生成設定
          </CardTitle>
          <CardDescription>
            コンテンツ生成の詳細設定（オプション）
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>セッション時間（分）</Label>
              <Input
                type="number"
                min="5"
                max="60"
                value={workflow.generationPreferences?.sessionLength || 15}
                onChange={(e) => updateGenerationPreferences({ 
                  sessionLength: parseInt(e.target.value) || 15 
                })}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label>コンテンツスタイル</Label>
              <select
                value={workflow.generationPreferences?.contentStyle || 'formal'}
                onChange={(e) => updateGenerationPreferences({ 
                  contentStyle: e.target.value as 'formal' | 'casual' | 'technical'
                })}
                className="mt-1 w-full p-2 border border-border rounded-md"
              >
                <option key="content-formal" value="formal">フォーマル</option>
                <option key="content-casual" value="casual">カジュアル</option>
                <option key="content-technical" value="technical">技術的</option>
              </select>
            </div>

            <div>
              <Label>相互作用レベル</Label>
              <select
                value={workflow.generationPreferences?.interactivityLevel || 'medium'}
                onChange={(e) => updateGenerationPreferences({ 
                  interactivityLevel: e.target.value as 'low' | 'medium' | 'high'
                })}
                className="mt-1 w-full p-2 border border-border rounded-md"
              >
                <option key="interactive-low" value="low">低（テキスト中心）</option>
                <option key="interactive-medium" value="medium">中（図表・例題含む）</option>
                <option key="interactive-high" value="high">高（演習・ワークショップ多数）</option>
              </select>
              <div className="text-xs text-muted-foreground mt-1">
                生成されるコンテンツの相互作用要素の多さを設定
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={workflow.generationPreferences?.includeQuizzes ?? true}
                onChange={(e) => updateGenerationPreferences({ 
                  includeQuizzes: e.target.checked 
                })}
              />
              <span className="text-sm">理解度確認クイズを含める</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* 次へボタン */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          {isFormValid ? (
            <span className="text-green-600">✓ 必要な情報が入力されました</span>
          ) : (
            <span>* 必須項目を入力してください</span>
          )}
        </div>
        
        <Button 
          onClick={handleNext}
          disabled={!isFormValid}
          className="flex items-center gap-2"
        >
          参考資料アップロードへ
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}