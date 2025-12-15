/**
 * AI生成コース作成ウィザード
 * 段階的なコース生成フローを管理
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import { SourceUploadStep } from './SourceUploadStep'
import { ManualAIStep } from './ManualAIStep'
import { CourseSetupStep } from './CourseSetupStep'
import { CategoryMappingStep } from './CategoryMappingStep'
import { OutlineReviewStep } from './OutlineReviewStep'
import { ContentReviewStep } from './ContentReviewStep'
import { ContentGenerationStep } from './ContentGenerationStep'
// import { FinalReviewStep } from './FinalReviewStep'
import { 
  CheckCircle2, 
  Clock, 
  Brain,
  FileText,
  Settings,
  Layers,
  BookOpen,
  Eye,
  Search
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

// カテゴリマッピングの型定義
interface CategoryMapping {
  genreId: string
  genreTitle: string
  selectedCategoryId?: string
  selectedSubcategoryId?: string
  aiRecommendedCategoryId?: string
  aiRecommendedSubcategoryId?: string
  confidenceScore?: number
  manualOverride: boolean
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
  // カテゴリマッピング情報
  categoryMappings?: CategoryMapping[]
  // コンテンツデータ（Phase 2で追加）
  content_data?: {
    session_contents: Array<{
      id: string
      session_id: string
      content_type: 'text' | 'image' | 'video' | 'exercise'
      content_data: Record<string, unknown>
      display_order: number
    }>
    session_quizzes: Array<{
      id: string
      session_id: string
      question: string
      options: string[]
      correct_answer: number
      explanation: string
      display_order: number
    }>
    reward_cards: Record<string, unknown>[]
    completion_badge?: Record<string, unknown>
    review_notes?: string
    approved: boolean
    generated_at?: string
  }
}

// ウィザードステップ定義
const WIZARD_STEPS = [
  {
    id: 0,
    title: 'コース概要設定',
    description: 'コースの基本情報を設定',
    icon: Settings,
    status: 'draft' as WorkflowStatus
  },
  {
    id: 1,
    title: '参考資料アップロード',
    description: 'PDF、URL、テキストを追加',
    icon: FileText,
    status: 'source_analysis' as WorkflowStatus
  },
  {
    id: 2,
    title: 'AI統合（手動モード）',
    description: 'Claude Web Interfaceでアウトライン生成',
    icon: Brain,
    status: 'outline_draft' as WorkflowStatus
  },
  {
    id: 3,
    title: 'アウトラインレビュー',
    description: 'AI生成アウトラインの確認・修正',
    icon: Search,
    status: 'outline_draft' as WorkflowStatus // レビュー完了で outline_approved になる
  },
  {
    id: 4,
    title: 'カテゴリマッピング',
    description: '分析カテゴリとの紐付け',
    icon: Layers,
    status: 'outline_approved' as WorkflowStatus
  },
  {
    id: 5,
    title: 'コンテンツ生成',
    description: '詳細コンテンツとクイズの生成',
    icon: BookOpen,
    status: 'content_draft' as WorkflowStatus
  },
  {
    id: 6,
    title: 'コンテンツレビュー',
    description: 'AI生成コンテンツの確認・修正',
    icon: Search,
    status: 'content_draft' as WorkflowStatus // レビュー完了で content_approved になる
  },
  {
    id: 7,
    title: '最終レビュー',
    description: 'コース公開前の最終確認',
    icon: Eye,
    status: 'content_approved' as WorkflowStatus
  }
]

interface CourseWizardProps {
  initialWorkflow?: Partial<CourseGenerationWorkflow>
  onComplete?: (workflow: CourseGenerationWorkflow) => void
  onSave?: (workflow: CourseGenerationWorkflow) => void
}

export function CourseWizard({ 
  initialWorkflow,
  onComplete,
  onSave 
}: CourseWizardProps) {
  const { toast } = useToast()
  
  // ワークフロー状態管理
  const [workflow, setWorkflow] = useState<CourseGenerationWorkflow>({
    title: '',
    description: '',
    status: 'draft',
    sources: [],
    currentStep: 0,
    ...initialWorkflow
  })

  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // initialWorkflow が変更された時にワークフロー状態を更新
  useEffect(() => {
    if (initialWorkflow) {
      setWorkflow(_prev => ({
        // デフォルト値
        title: '',
        description: '',
        status: 'draft',
        sources: [],
        currentStep: 0,
        difficultyId: undefined,
        estimatedDuration: undefined,
        learningObjectives: undefined,
        targetAudience: undefined,
        courseCategory: undefined,
        generationPreferences: undefined,
        categoryMappings: undefined,
        // initialWorkflowの値で上書き（既存データを保持）
        ...initialWorkflow
      }))
    }
  }, [initialWorkflow])

  // 認証ヘッダー取得ヘルパー
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('認証が必要です。ログインしてください。')
    }

    return {
      'Authorization': `Bearer ${session.access_token}`
    }
  }

  // ステップの完了状態計算
  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < workflow.currentStep) return 'completed'
    if (stepIndex === workflow.currentStep) return 'current'
    return 'pending'
  }

  // ステップ進行の計算
  const progressPercentage = Math.round((workflow.currentStep / (WIZARD_STEPS.length - 1)) * 100)

  // 次のステップに進む
  const handleNextStep = async () => {
    const currentStepInfo = WIZARD_STEPS[workflow.currentStep]
    
    // ステップ固有の検証
    if (workflow.currentStep === 0 && (!workflow.title.trim() || !workflow.description.trim() || !workflow.difficultyId || !workflow.learningObjectives?.length)) {
      toast({
        title: "必要な情報が入力されていません",
        description: "コースタイトル、概要、難易度、学習目標を設定してください",
        variant: "destructive"
      })
      return
    }

    if (workflow.currentStep === 1 && workflow.sources.length === 0) {
      toast({
        title: "参考資料が必要です",
        description: "最低1つの参考資料をアップロードしてください",
        variant: "destructive"
      })
      return
    }

    if (workflow.currentStep === 2 && !workflow.aiOutlineResponse) {
      toast({
        title: "AIレスポンスが必要です",
        description: "Claude Web Interfaceからのレスポンスを入力してください",
        variant: "destructive"
      })
      return
    }

    if (workflow.currentStep === 3 && (!workflow.aiOutlineResponse)) {
      toast({
        title: "アウトラインレビューが必要です",
        description: "アウトラインの承認が完了していません",
        variant: "destructive"
      })
      return
    }

    if (workflow.currentStep === 4 && (!workflow.categoryMappings || workflow.categoryMappings.length === 0 || !workflow.categoryMappings.every(m => m.selectedCategoryId))) {
      toast({
        title: "カテゴリマッピングが必要です",
        description: "全てのジャンルにカテゴリを設定してください",
        variant: "destructive"
      })
      return
    }

    if (workflow.currentStep === 6 && (!workflow.content_data?.approved)) {
      toast({
        title: "コンテンツレビューが必要です",
        description: "コンテンツの承認が完了していません",
        variant: "destructive"
      })
      return
    }

    // ワークフロー更新
    const updatedWorkflow = {
      ...workflow,
      currentStep: Math.min(workflow.currentStep + 1, WIZARD_STEPS.length - 1),
      status: WIZARD_STEPS[workflow.currentStep + 1]?.status || workflow.status
    }

    setWorkflow(updatedWorkflow)

    // 自動保存
    if (onSave) {
      await handleSave(updatedWorkflow)
    }

    toast({
      title: "ステップ完了",
      description: `${currentStepInfo.title}が完了しました`,
    })
  }

  // 前のステップに戻る
  const handlePreviousStep = () => {
    if (workflow.currentStep > 0) {
      const updatedWorkflow = {
        ...workflow,
        currentStep: workflow.currentStep - 1,
        status: WIZARD_STEPS[workflow.currentStep - 1]?.status || workflow.status
      }
      setWorkflow(updatedWorkflow)
    }
  }

  // ワークフロー保存（API経由）
  const handleSave = async (workflowToSave = workflow) => {
    setIsSaving(true)
    try {
      const authHeaders = await getAuthHeaders()
      
      if (workflowToSave.id) {
        // 既存ワークフローの更新
        const response = await fetch(`/api/ai-course-generation/workflows/${workflowToSave.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            title: workflowToSave.title,
            description: workflowToSave.description,
            status: workflowToSave.status,
            currentStep: workflowToSave.currentStep,
            sources: workflowToSave.sources,
            aiOutlineResponse: workflowToSave.aiOutlineResponse,
            categoryMappings: workflowToSave.categoryMappings
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'ワークフローの更新に失敗しました')
        }

        const result = await response.json()
        // 現在のステップとステータスを保持しながらサーバーレスポンスを適用
        setWorkflow(prev => ({ 
          ...prev, 
          ...result.workflow,
          currentStep: prev.currentStep, // 現在のステップを保持
          status: prev.status           // 現在のステータスを保持
        }))
        
      } else {
        // 新規ワークフロー作成
        const response = await fetch('/api/ai-course-generation/workflows', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            title: workflowToSave.title || '新しいAI生成コース',
            description: workflowToSave.description,
            sources: workflowToSave.sources,
            aiOutlineResponse: workflowToSave.aiOutlineResponse,
            categoryMappings: workflowToSave.categoryMappings
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'ワークフローの作成に失敗しました')
        }

        const result = await response.json()
        // 新規作成時は現在のステップとステータスを保持
        setWorkflow(prev => ({ 
          ...prev, 
          ...result.workflow,
          currentStep: prev.currentStep, // 現在のステップを保持
          status: prev.status           // 現在のステータスを保持
        }))
      }

      // カスタム保存ハンドラーがあれば実行
      if (onSave) {
        await onSave(workflowToSave)
      }

      setLastSaved(new Date())
      toast({
        title: "保存完了",
        description: "ワークフローが保存されました",
      })
      
    } catch (error) {
      console.error('❌ Save error:', error)
      toast({
        title: "保存エラー",
        description: error instanceof Error ? error.message : 'ワークフローの保存に失敗しました',
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  // 参考資料変更ハンドラ
  const handleSourcesChange = (sources: SourceMaterial[]) => {
    setWorkflow(prev => ({
      ...prev,
      sources
    }))
  }

  // AIレスポンス変更ハンドラ
  const handleAIResponse = (aiResponse: string) => {
    setWorkflow(prev => ({
      ...prev,
      aiOutlineResponse: aiResponse
    }))
  }

  // カテゴリマッピング変更ハンドラ
  const handleCategoryMappingChange = (updates: { categoryMappings: CategoryMapping[] }) => {
    setWorkflow(prev => ({
      ...prev,
      categoryMappings: updates.categoryMappings
    }))
  }

  // 自動保存機能
  useEffect(() => {
    const autoSave = async () => {
      // 基本情報が入力されていれば自動保存
      if (workflow.title.trim() || workflow.description.trim() || workflow.sources.length > 0 || workflow.aiOutlineResponse) {
        await handleSave()
      }
    }

    // 変更から3秒後に自動保存
    const timer = setTimeout(autoSave, 3000)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow.title, workflow.description, workflow.difficultyId, workflow.learningObjectives, workflow.sources, workflow.aiOutlineResponse, workflow.categoryMappings, workflow.currentStep])

  // 現在のステップコンポーネントをレンダリング
  const renderCurrentStep = () => {
    switch (workflow.currentStep) {
      case 0:
        return (
          <CourseSetupStep 
            workflow={workflow} 
            onChange={setWorkflow} 
            onNext={handleNextStep} 
          />
        )
      
      case 1:
        return (
          <SourceUploadStep 
            workflowId={workflow.id}
            initialSources={workflow.sources}
            onSourcesChange={handleSourcesChange}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
          />
        )
      
      case 2:
        return (
          <ManualAIStep 
            sources={workflow.sources}
            workflow={workflow}
            onAIResponse={handleAIResponse}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
          />
        )
      
      case 3:
        return (
          <OutlineReviewStep 
            workflow={workflow}
            onChange={(updates) => setWorkflow(prev => ({ ...prev, ...updates }))}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
          />
        )
      
      case 4:
        return (
          <CategoryMappingStep 
            workflow={workflow}
            onChange={handleCategoryMappingChange}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
          />
        )
      
      case 5:
        return (
          <ContentGenerationStep 
            workflow={workflow} 
            onChange={(updates) => setWorkflow(prev => ({ ...prev, ...updates }))}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
          />
        )
      
      case 6:
        return (
          <ContentReviewStep 
            workflow={workflow}
            onChange={(updates) => setWorkflow(prev => ({ ...prev, ...updates }))}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
          />
        )
      
      case 7:
        // return <FinalReviewStep workflow={workflow} onChange={setWorkflow} onComplete={onComplete} />
        return (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">最終レビュー</h3>
            <p className="text-muted-foreground mb-4">この機能は開発中です</p>
            <div className="space-x-4">
              <Button variant="outline" onClick={handlePreviousStep}>戻る</Button>
              <Button 
                onClick={() => {
                  toast({
                    title: "コース作成完了",
                    description: "AI生成コースが正常に作成されました（模擬）",
                  })
                  onComplete?.(workflow)
                }}
              >
                コース作成完了
              </Button>
            </div>
          </div>
        )
      
      default:
        return <div>Unknown step</div>
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ヘッダー */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">AI生成コース作成</h1>
        <p className="text-muted-foreground">
          参考資料を基にAIが自動でコース内容を生成します
        </p>
      </div>

      {/* プログレスヘッダー */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">
                ステップ {workflow.currentStep + 1} / {WIZARD_STEPS.length}
              </CardTitle>
              <CardDescription>
                {WIZARD_STEPS[workflow.currentStep]?.title}
              </CardDescription>
            </div>
            <Badge variant="outline" className="px-3 py-1">
              {progressPercentage}% 完了
            </Badge>
          </div>
          <Progress value={progressPercentage} className="w-full" />
        </CardHeader>
      </Card>

      {/* ステップインジケーター */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => {
              const status = getStepStatus(index)
              const Icon = step.icon

              return (
                <div key={step.id} className="flex flex-col items-center flex-1">
                  <div className="flex items-center w-full">
                    {/* ステップアイコン */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 
                      ${status === 'completed' 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : status === 'current'
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-white border-gray-300 text-gray-400'
                      }`}
                    >
                      {status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>

                    {/* 接続線 */}
                    {index < WIZARD_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-2
                        ${index < workflow.currentStep ? 'bg-green-500' : 'bg-gray-200'}
                      `} />
                    )}
                  </div>

                  {/* ステップ情報 */}
                  <div className="mt-2 text-center min-h-12 max-w-24">
                    <div className={`text-xs font-medium
                      ${status === 'current' ? 'text-blue-600' : 
                        status === 'completed' ? 'text-green-600' : 'text-gray-500'}
                    `}>
                      {step.title}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 leading-tight">
                      {step.description}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* ワークフロー統計 */}
      {workflow.sources.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="font-medium">{workflow.sources.length} 個の参考資料</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {workflow.sources.reduce((sum, s) => sum + (s.metadata?.wordCount || 0), 0).toLocaleString()} 単語
                </span>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Clock className="h-4 w-4 text-green-600" />
                <span>
                  {isSaving 
                    ? '保存中...'
                    : lastSaved 
                      ? `最終保存: ${lastSaved.toLocaleTimeString()}`
                      : workflow.updated_at 
                        ? `最終更新: ${new Date(workflow.updated_at).toLocaleString()}`
                        : '未保存'
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* メインコンテンツエリア */}
      <Card className="min-h-96">
        <CardContent className="p-6">
          {renderCurrentStep()}
        </CardContent>
      </Card>

      {/* フッターアクション */}
      <div className="flex justify-end items-center">
        <Button
          variant="outline"
          onClick={() => handleSave()}
          disabled={isSaving || !workflow.title}
          className="flex items-center gap-2"
        >
          {isSaving && <Clock className="h-4 w-4 animate-spin" />}
          下書き保存
        </Button>
      </div>
    </div>
  )
}