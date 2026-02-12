/**
 * AI生成コース作成ウィザード
 * 段階的なコース生成フローを管理
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
import { CoursePublishStep } from './CoursePublishStep'
import {
  CheckCircle2,
  Clock,
  Brain,
  FileText,
  Settings,
  Layers,
  BookOpen,
  Search
} from 'lucide-react'
import { type CourseWizardWorkflow } from '@/lib/ai-course-generation/type-conversion'
import type { 
  WorkflowStatus, 
  SourceMaterial
} from '@/lib/ai-course-generation/types'
import type { CourseWizardCategoryMapping } from '@/lib/ai-course-generation/type-conversion'

// CourseSetupStep の型定義をインポート
interface _CourseSetupWorkflow {
  id?: string
  title: string
  description: string
  status: WorkflowStatus
  sources: SourceMaterial[]
  currentStep?: number
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
}

// 旧型定義削除済み - type-conversion.tsの統一型を使用

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
    title: '生成完了',
    description: '生成内容の確認・完了',
    icon: CheckCircle2,
    status: 'content_approved' as WorkflowStatus
  }
]

interface CourseWizardProps {
  initialWorkflow?: Partial<CourseWizardWorkflow>
  onComplete?: (workflow: CourseWizardWorkflow) => void
  onSave?: (workflow: CourseWizardWorkflow) => void
}

export function CourseWizard({ 
  initialWorkflow,
  onComplete,
  onSave 
}: CourseWizardProps) {
  const { toast } = useToast()
  
  // ワークフロー状態管理
  const [workflow, setWorkflow] = useState<CourseWizardWorkflow>({
    id: '',
    title: '',
    description: '',
    status: 'draft' as WorkflowStatus,
    sources: [],
    ...initialWorkflow,
    // DBのcurrentStepをそのまま使用（最後に作業していたステップに戻る）
    currentStep: initialWorkflow?.currentStep ?? 0
  })

  // デバッグ: published_course_id の確認
  console.log('🔍 [CourseWizard] initialWorkflow.published_course_id:', initialWorkflow?.published_course_id)
  console.log('🔍 [CourseWizard] workflow.published_course_id:', workflow.published_course_id)

  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [_autoSaveEnabled, _setAutoSaveEnabled] = useState(true)

  // initialWorkflow が変更された時にワークフロー状態を更新
  useEffect(() => {
    if (initialWorkflow) {
      // 新規作成時（IDなし）または異なるワークフロー読み込み時
      const isNewWorkflow = !workflow.id && !initialWorkflow.id
      const isDifferentWorkflow = initialWorkflow.id && initialWorkflow.id !== workflow.id
      
      if (isNewWorkflow || isDifferentWorkflow) {
        setWorkflow({
          id: initialWorkflow.id || '',
          title: initialWorkflow.title || '',
          description: initialWorkflow.description || '',
          status: initialWorkflow.status || 'draft',
          sources: initialWorkflow.sources || [],
          ...initialWorkflow,
          // DBのcurrentStepをそのまま使用（最後に作業していたステップに戻る）
          currentStep: initialWorkflow.currentStep ?? 0
        } as CourseWizardWorkflow)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWorkflow?.id, workflow.id]) // IDの変更を確実に監視、initialWorkflow全体の依存関係は意図的に除外

  // 自動保存機能（ワークフロー変更から3秒後に実行）
  useEffect(() => {
    if (!_autoSaveEnabled || !workflow.id || !workflow.title.trim()) return

    const autoSaveTimer = setTimeout(async () => {
      console.log('🔄 [CourseWizard] 自動保存実行')
      try {
        await handleSave()
        console.log('✅ [CourseWizard] 自動保存完了')
      } catch (error) {
        console.error('❌ [CourseWizard] 自動保存エラー:', error)
      }
    }, 3000) // 3秒後に自動保存

    return () => clearTimeout(autoSaveTimer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    workflow.title,
    workflow.description,
    workflow.difficultyId,
    workflow.learningObjectives,
    workflow.aiOutlineResponse,
    workflow.categoryMappings,
    workflow.outline_data,
    workflow.sources // 🔧 sourcesの変更も自動保存対象に追加
  ])

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
    // setWorkflowのコールバック形式を使用して、常に最新の状態を参照
    setWorkflow(prev => {
      const currentStepInfo = WIZARD_STEPS[prev.currentStep]

      // ステップ固有の検証
      if (prev.currentStep === 0 && (!prev.title.trim() || !prev.description.trim() || !prev.difficultyId || !prev.learningObjectives?.length)) {
        toast({
          title: "必要な情報が入力されていません",
          description: "コースタイトル、概要、難易度、学習目標を設定してください",
          variant: "destructive"
        })
        return prev
      }

      if (prev.currentStep === 2 && !prev.aiOutlineResponse) {
        toast({
          title: "AIレスポンスが必要です",
          description: "Claude Web Interfaceからのレスポンスを入力してください",
          variant: "destructive"
        })
        return prev
      }

      if (prev.currentStep === 3 && (!prev.aiOutlineResponse)) {
        toast({
          title: "アウトラインレビューが必要です",
          description: "アウトラインの承認が完了していません",
          variant: "destructive"
        })
        return prev
      }

      // ステップ4（カテゴリマッピング）の検証はCategoryMappingStepで実行済み
      // React状態更新のタイミング問題を回避するため、ここでの重複検証をスキップ

      // ワークフロー更新（最新のprevを使用してcourse_structure等を保持）
      const updatedWorkflow = {
        ...prev,
        currentStep: Math.min(prev.currentStep + 1, WIZARD_STEPS.length - 1),
        status: WIZARD_STEPS[prev.currentStep + 1]?.status || prev.status
      }

      // 自動保存（非同期で実行）
      if (onSave && prev.id) {
        handleSave(updatedWorkflow)
      }

      toast({
        title: "ステップ完了",
        description: `${currentStepInfo.title}が完了しました`,
      })

      return updatedWorkflow
    })
  }

  // 前のステップに戻る
  const handlePreviousStep = () => {
    if (workflow.currentStep > 0) {
      const updatedWorkflow = {
        ...workflow,
        currentStep: workflow.currentStep - 1,
        // ⚠️ 承認済み状態は保持（ステータスを戻さない）
        // status: WIZARD_STEPS[workflow.currentStep - 1]?.status || workflow.status
      }
      setWorkflow(updatedWorkflow)
    }
  }

  // ワークフロー保存（API経由）
  const handleSave = useCallback(async (workflowToSave?: CourseWizardWorkflow) => {
    const saveWorkflow = workflowToSave || workflow
    console.log('💾 [CourseWizard] handleSave開始:', { 
      hasWorkflowToSave: !!workflowToSave, 
      saveTitle: saveWorkflow.title,
      saveId: saveWorkflow.id,
      categoryMappings: saveWorkflow.categoryMappings
    })
    setIsSaving(true)
    try {
      const authHeaders = await getAuthHeaders()
      
      if (saveWorkflow.id) {
        // 既存ワークフローの更新
        const response = await fetch(`/api/ai-course-generation/workflows/${saveWorkflow.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            title: saveWorkflow.title,
            description: saveWorkflow.description,
            status: saveWorkflow.status,
            currentStep: saveWorkflow.currentStep,
            sources: saveWorkflow.sources,
            aiOutlineResponse: saveWorkflow.aiOutlineResponse,
            outline_data: saveWorkflow.outline_data,
            categoryMappings: saveWorkflow.categoryMappings,
            difficultyId: saveWorkflow.difficultyId,
            estimatedDuration: saveWorkflow.estimatedDuration,
            learningObjectives: saveWorkflow.learningObjectives,
            targetAudience: saveWorkflow.targetAudience,
            generationPreferences: saveWorkflow.generationPreferences
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'ワークフローの更新に失敗しました')
        }

        const result = await response.json()
        // 保存後は入力状態を変更しない（IDのみ更新）
        if (result.workflow.id) {
          setWorkflow(prev => ({ 
            ...prev,
            id: result.workflow.id
          }))
        }
        
      } else {
        // 新規ワークフロー作成
        const response = await fetch('/api/ai-course-generation/workflows', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            title: saveWorkflow.title || '新しいAI生成コース',
            description: saveWorkflow.description,
            sources: saveWorkflow.sources,
            aiOutlineResponse: saveWorkflow.aiOutlineResponse,
            outline_data: saveWorkflow.outline_data,
            categoryMappings: saveWorkflow.categoryMappings,
            difficultyId: saveWorkflow.difficultyId,
            estimatedDuration: saveWorkflow.estimatedDuration,
            learningObjectives: saveWorkflow.learningObjectives,
            targetAudience: saveWorkflow.targetAudience,
            generationPreferences: saveWorkflow.generationPreferences
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'ワークフローの作成に失敗しました')
        }

        const result = await response.json()
        // 新規作成時もIDのみ設定、入力値は維持
        setWorkflow(prev => ({ 
          ...prev,
          id: result.workflow.id
        }))
      }

      // カスタム保存ハンドラーがあれば実行
      if (onSave) {
        await onSave(saveWorkflow)
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
  }, [workflow, toast, onSave])

  // 参考資料変更ハンドラ（即時保存付き）
  const handleSourcesChange = useCallback((sources: SourceMaterial[]) => {
    console.log('🔧 [CourseWizard] handleSourcesChange:', { count: sources.length })
    setWorkflow(prev => {
      const updated = {
        ...prev,
        sources
      }
      // ワークフローIDがある場合は即時保存（非同期）
      if (prev.id) {
        console.log('💾 [CourseWizard] Triggering immediate save for sources')
        handleSave(updated)
      }
      return updated
    })
  }, [handleSave])

  // AIレスポンス変更ハンドラ
  const handleAIResponse = async (aiResponse: string) => {
    console.log('🔧 [CourseWizard] handleAIResponse開始:', aiResponse ? aiResponse.substring(0, 200) + '...' : 'CLEAR')
    
    // 空文字列の場合はクリア処理
    if (!aiResponse.trim()) {
      console.log('🔧 [CourseWizard] AIレスポンスクリア処理')
      setWorkflow(prev => ({
        ...prev,
        aiOutlineResponse: '',
        outline_data: undefined
      }))
      console.log('✅ [CourseWizard] AIレスポンスとoutline_dataをクリア完了')
      return
    }
    
    try {
      // JSON解析を試行
      const parsed = JSON.parse(aiResponse)
      console.log('✅ [CourseWizard] JSON解析成功:', { course: !!parsed.course, genres: parsed.genres?.length })
      
      // 最低限の構造チェック
      if (!parsed.course || !parsed.genres) {
        console.warn('❌ [CourseWizard] Invalid outline structure - missing course or genres')
        setWorkflow(prev => ({
          ...prev,
          aiOutlineResponse: aiResponse
        }))
        return
      }
      
      // difficulty検証・修正（フォールバック対応）
      if (parsed.course && parsed.course.difficulty) {
        const validDifficulties = ['basic', 'intermediate', 'advanced', 'expert']
        if (!validDifficulties.includes(parsed.course.difficulty)) {
          console.log(`🔧 [CourseWizard] Difficulty corrected: ${parsed.course.difficulty} -> basic`)
          parsed.course.difficulty = 'basic'
        }
      } else {
        // difficulty未設定の場合はbasicをデフォルト
        console.log('🔧 [CourseWizard] Setting default difficulty: basic')
        parsed.course.difficulty = 'basic'
      }

      // クライアントサイドID生成ライブラリをインポート
      const { generateClientId } = await import('@/lib/id-generation-client')

      // 型定義
      interface ParsedGenre {
        id?: string
        title: string
        description: string
        suggested_category_id?: string
        suggested_subcategory_id?: string
        estimatedDays?: number
        themes?: ParsedTheme[]
        [key: string]: unknown
      }
      
      interface ParsedTheme {
        id?: string
        title: string
        description: string
        estimatedMinutes?: number
        reward_card_data?: Record<string, unknown>
        sessions?: ParsedSession[]
        [key: string]: unknown
      }
      
      interface ParsedSession {
        id?: string
        title: string
        description?: string
        session_type?: string
        estimatedMinutes?: number
        [key: string]: unknown
      }

      // ID生成処理（本番環境パターンに合わせて）
      const processedGenres = await Promise.all(
        (parsed.genres as ParsedGenre[]).map(async (genre, genreIndex: number) => {
          const genreId = genre.id || await generateClientId('genre', genre.title)
          console.log(`🔧 [CourseWizard] Genre ID生成: "${genre.title}" -> "${genreId}"`)
          
          const processedThemes = await Promise.all(
            (genre.themes || []).map(async (theme, themeIndex: number) => {
              const themeId = theme.id || await generateClientId('theme', theme.title)
              console.log(`🔧 [CourseWizard] Theme ID生成: "${theme.title}" -> "${themeId}"`)
              
              const processedSessions = await Promise.all(
                (theme.sessions || []).map(async (session, sessionIndex: number) => {
                  const sessionId = session.id || await generateClientId('session', session.title)
                  console.log(`🔧 [CourseWizard] Session ID生成: "${session.title}" -> "${sessionId}"`)
                  
                  return {
                    ...session,
                    id: sessionId,
                    title: session.title,
                    description: session.description,
                    session_type: (session.session_type as 'knowledge' | 'practice' | 'case_study') || 'knowledge',
                    estimatedMinutes: session.estimatedMinutes || 15,
                    display_order: sessionIndex
                  }
                })
              )
              
              return {
                ...theme,
                id: themeId,
                title: theme.title,
                description: theme.description,
                estimatedMinutes: theme.estimatedMinutes || 15,
                display_order: themeIndex,
                reward_card_data: theme.reward_card_data,
                sessions: processedSessions
              }
            })
          )
          
          return {
            ...genre,
            id: genreId,
            title: genre.title,
            description: genre.description,
            suggested_category_id: genre.suggested_category_id,
            suggested_subcategory_id: genre.suggested_subcategory_id,
            estimatedDays: genre.estimatedDays || 1,
            display_order: genreIndex,
            themes: processedThemes
          }
        })
      )
      
      const newOutlineData = {
        course: parsed.course,
        genres: processedGenres,
        approved: false,
        generated_at: new Date().toISOString(),
        ai_response_raw: aiResponse
      }
      
      console.log('📋 [CourseWizard] outline_data生成:', {
        courseTitle: newOutlineData.course.title,
        genresCount: newOutlineData.genres.length,
        firstGenreTitle: newOutlineData.genres[0]?.title
      })
      
      // ワークフロー更新（AIレスポンス + 解析済みoutline_data）
      setWorkflow(prev => {
        const updated = {
          ...prev,
          aiOutlineResponse: aiResponse,
          outline_data: newOutlineData
        }
        console.log('🔄 [CourseWizard] ワークフロー更新:', {
          hasAiResponse: !!updated.aiOutlineResponse,
          hasOutlineData: !!updated.outline_data,
          outlineGenresCount: updated.outline_data?.genres?.length
        })
        return updated
      })
      
      console.log('✅ [CourseWizard] AIレスポンス解析完了:', {
        courseTitle: newOutlineData.course.title,
        genresCount: newOutlineData.genres.length
      })
      
    } catch (error) {
      console.error('❌ [CourseWizard] AIレスポンス解析エラー:', error)
      // 解析エラーの場合はaiOutlineResponseのみ保存
      setWorkflow(prev => ({
        ...prev,
        aiOutlineResponse: aiResponse
      }))
    }
  }

  // カテゴリマッピング変更ハンドラ（コースデータ生成後の拡張プロパティも受け取る）
  // shouldAdvanceStep: trueの場合、同じsetWorkflow内でステップ遷移も行う（状態競合防止）
  const handleCategoryMappingChange = useCallback((updates: {
    categoryMappings: CourseWizardCategoryMapping[]
    course_structure?: CourseWizardWorkflow['course_structure']
    published_course_id?: string
    outline_data?: CourseWizardWorkflow['outline_data']
    shouldAdvanceStep?: boolean
  }) => {
    console.log('📥 [CourseWizard] カテゴリマッピング受信:', {
      mappingsCount: updates.categoryMappings?.length,
      hasCourseStructure: !!updates.course_structure,
      publishedCourseId: updates.published_course_id,
      shouldAdvanceStep: updates.shouldAdvanceStep
    })

    // 同一のsetWorkflow内で全ての状態更新を行う（競合防止）
    setWorkflow(prev => {
      const nextStep = updates.shouldAdvanceStep
        ? Math.min(prev.currentStep + 1, WIZARD_STEPS.length - 1)
        : prev.currentStep

      const updatedWorkflow = {
        ...prev,
        categoryMappings: updates.categoryMappings,
        // コースデータ生成後の拡張プロパティを反映
        ...(updates.course_structure && { course_structure: updates.course_structure }),
        ...(updates.published_course_id && { published_course_id: updates.published_course_id }),
        ...(updates.outline_data && { outline_data: updates.outline_data }),
        // ステップ遷移も同時に行う
        currentStep: nextStep,
        ...(updates.shouldAdvanceStep && { status: WIZARD_STEPS[nextStep]?.status || prev.status })
      }

      // データベースに保存（非同期で実行）
      if (prev.id) {
        handleSave(updatedWorkflow)
      }

      // ステップ遷移時はトースト表示
      if (updates.shouldAdvanceStep) {
        const currentStepInfo = WIZARD_STEPS[prev.currentStep]
        toast({
          title: "ステップ完了",
          description: `${currentStepInfo.title}が完了しました`,
        })
      }

      return updatedWorkflow
    })
  }, [handleSave, toast])


  // 現在のステップコンポーネントをレンダリング
  const renderCurrentStep = () => {
    switch (workflow.currentStep) {
      case 0: {
        // CourseWizardWorkflow用の簡易型変換
        // 🔧 Step1に戻った時にworkflow状態が正しく反映されるよう、スプレッド演算子で直接マッピング
        const courseSetupData = {
          ...workflow, // すべてのworkflow状態を引き継ぎ
          // 明示的に必要なフィールドを確認（デバッグ用）
          id: workflow.id,
          title: workflow.title,
          description: workflow.description,
          status: workflow.status,
          sources: workflow.sources,
          currentStep: workflow.currentStep,
          difficultyId: workflow.difficultyId,
          targetAudience: workflow.targetAudience,
          learningObjectives: workflow.learningObjectives,
          estimatedDuration: workflow.estimatedDuration,
          courseCategory: workflow.courseCategory,
          generationPreferences: workflow.generationPreferences,
          published_course_id: workflow.published_course_id // 編集制限用
        }
        

        return (
          <CourseSetupStep 
            workflow={courseSetupData} 
            onChange={(updatedWorkflow) => {
              const convertedWorkflow: CourseWizardWorkflow = {
                ...workflow,
                ...updatedWorkflow
              }
              setWorkflow(convertedWorkflow)
            }} 
            onNext={handleNextStep}
            onSave={async () => {
              console.log('🔧 [CourseWizard] Step1保存コール')
              console.log('💾 [CourseWizard] 現在の状態で保存:', workflow)
              await handleSave(workflow)
            }}
          />
        )
      }
      
      case 1:
        return (
          <SourceUploadStep
            workflowId={workflow.id}
            initialSources={workflow.sources}
            onSourcesChange={handleSourcesChange}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
            published_course_id={workflow.published_course_id}
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
            onSave={async () => {
              console.log('🔧 [CourseWizard] ManualAIStepからの保存コール')
              await handleSave()
            }}
          />
        )
      
      case 3: {
        // aiOutlineResponseが存在しない場合は前のステップに戻る指示を表示
        if (!workflow.aiOutlineResponse) {
          return (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">アウトラインが必要です</h3>
              <p className="text-muted-foreground mb-4">Step2でAIアウトラインを生成してください</p>
              <Button onClick={handlePreviousStep}>前のステップに戻る</Button>
            </div>
          )
        }
        
        const outlineWorkflow = {
          aiOutlineResponse: workflow.aiOutlineResponse,
          outline_data: workflow.outline_data ? workflow.outline_data as {
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
          } : undefined,
          status: workflow.status,
          published_course_id: workflow.published_course_id
        }
        return (
          <OutlineReviewStep 
            workflow={outlineWorkflow}
            onChange={async (updates: Record<string, unknown>) => {
              setWorkflow(prev => ({ ...prev, ...updates }))
              // outline_dataが含まれている場合（承認時）、データベースに保存
              const outlineData = updates.outline_data as { approved?: boolean } | undefined
              if (outlineData?.approved) {
                await handleSave({ ...workflow, ...updates })
              }
            }}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
          />
        )
      }
      
      case 4:
        return (
          <CategoryMappingStep 
            workflow={workflow}
            onChange={handleCategoryMappingChange}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
          />
        )
      
      case 5: {
        const contentWorkflow = {
          id: workflow.id || `temp_${Date.now()}`,
          title: workflow.title,
          // DBからの構造（Step 4以降で設定される）
          course_structure: workflow.course_structure,
          // コンテンツ生成済みセッション情報
          content_data: workflow.content_data,
          outline_data: {
            approved: workflow.outline_data?.approved || true,
            genres: (workflow.outline_data?.genres || []).map(genre => {
              const g = genre as { 
                id: string; 
                title: string; 
                description?: string;
                themes?: Array<{
                  id: string;
                  title: string;
                  description?: string;
                  sessions?: Array<{
                    id: string;
                    title: string;
                  }>;
                }>;
              }
              return {
                id: g.id,
                title: g.title,
                description: g.description || '',
                themes: (g.themes || []).map(theme => {
                  const t = theme as {
                    id: string;
                    title: string;
                    description?: string;
                    estimatedMinutes?: number;
                    sessions?: Array<{
                      id: string;
                      title: string;
                      description?: string;
                      session_type?: string;
                      estimatedMinutes?: number;
                    }>;
                  }
                  return {
                    id: t.id,
                    title: t.title,
                    description: t.description || '',
                    sessions: (t.sessions || []).map(session => ({
                      id: session.id,
                      title: session.title,
                      description: session.description || '',
                      session_type: (session.session_type || 'knowledge') as 'knowledge' | 'practice' | 'case_study',
                      estimatedMinutes: session.estimatedMinutes || 15
                    }))
                  }
                })
              }
            })
          },
          category_mappings: workflow.categoryMappings || [],
          // aiOutlineResponseも渡す（フォールバック用）
          aiOutlineResponse: workflow.aiOutlineResponse
        }
        return (
          <ContentGenerationStep
            workflow={contentWorkflow}
            onChange={(updates) => setWorkflow(prev => ({ ...prev, ...updates }))}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
          />
        )
      }
      
      case 6: {
        const reviewWorkflow = {
          id: workflow.id || `temp_${Date.now()}`,
          content_data: {
            session_contents: [],
            session_quizzes: [],
            reward_cards: [],
            approved: workflow.content_data?.approved || false,
            ...(workflow.content_data || {})
          },
          outline_data: workflow.outline_data ? {
            course: workflow.outline_data.course,
            genres: (workflow.outline_data.genres || []).map(genre => {
              const fullGenre = genre as { 
                id: string; 
                title: string;
                description: string;
                themes: Array<{
                  id: string;
                  title: string;
                  estimatedMinutes: number;
                  sessions: Array<{
                    id: string;
                    title: string;
                    estimatedMinutes: number;
                  }>;
                }>;
              }
              return {
                id: fullGenre.id,
                title: fullGenre.title,
                description: fullGenre.description,
                themes: fullGenre.themes.map(theme => ({
                  id: theme.id,
                  title: theme.title,
                  estimatedMinutes: theme.estimatedMinutes,
                  sessions: theme.sessions.map(session => ({
                    id: session.id,
                    title: session.title,
                    session_type: 'knowledge' as const,
                    estimatedMinutes: session.estimatedMinutes
                  }))
                }))
              }
            })
          } : undefined,
          status: workflow.status
        }
        return (
          <ContentReviewStep 
            workflow={reviewWorkflow}
            onChange={(updates) => setWorkflow(prev => ({ ...prev, ...updates }))}
            onNext={handleNextStep}
            onPrevious={handlePreviousStep}
          />
        )
      }
      
      case 7: {
        // コース公開ステップ
        const publishWorkflow = {
          id: workflow.id,
          title: workflow.title,
          description: workflow.description,
          outline_data: workflow.outline_data,
          content_data: workflow.content_data,
          category_mappings: workflow.categoryMappings
        }
        
        return (
          <CoursePublishStep 
            workflow={publishWorkflow}
            onChange={(updates) => setWorkflow(prev => ({ ...prev, ...updates }))}
            onPrevious={handlePreviousStep}
            onComplete={() => {
              toast({
                title: "✅ コース作成完了",
                description: "AI生成コースが正常に作成され、coming_soon状態で公開されました",
                duration: 5000
              })
              // ワークフローを完了状態に更新
              setWorkflow(prev => ({ 
                ...prev, 
                status: 'published' as WorkflowStatus 
              }))
              // 完了コールバック
              if (onComplete) {
                onComplete(workflow)
              }
            }}
          />
        )
      }
      
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
                  {workflow.sources.reduce((sum: number, s: SourceMaterial) => sum + (s.metadata?.wordCount || 0), 0).toLocaleString()} 単語
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


    </div>
  )
}