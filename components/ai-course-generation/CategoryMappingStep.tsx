/**
 * AI生成コース - カテゴリマッピングステップ
 * AI生成アウトラインと既存の学習分析カテゴリの紐付け
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Target,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  BookOpen,
  Layers,
  Brain,
  Info,
  Loader2
} from 'lucide-react'

// AIアウトラインの型定義（新形式対応）
interface AIGenre {
  id: string
  title: string
  description: string
  suggested_category_id?: string
  suggested_subcategory_id?: string
  estimatedDays?: number
  display_order?: number
  themes: Array<{
    id: string
    title: string
    description: string
    estimatedMinutes: number
    display_order: number
    sessions: Array<{
      id: string
      title: string
      description?: string
      session_type: string
      estimatedMinutes: number
      display_order: number
    }>
  }>
}

interface AIParsedOutline {
  course: {
    title: string
    description: string
    estimatedDays: number
    difficulty: string
    targetAudience: string
    learningObjectives: string[]
  }
  genres: AIGenre[]
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

interface Category {
  category_id: string
  name: string
  description: string
  type: string
  icon?: string
  color?: string
  is_active: boolean
}

interface Subcategory {
  subcategory_id: string
  name: string
  description: string
  parent_category_id: string  // APIから返される実際のフィールド名
  is_active: boolean
}

// コース構造の型定義
interface CourseStructure {
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

interface CategoryMappingStepProps {
  workflow: {
    id?: string
    aiOutlineResponse?: string
    sources: unknown[]
    categoryMappings?: CategoryMapping[]
    published_course_id?: string  // コースデータ存在判定用
    outline_data?: {
      approved?: boolean
    }
  }
  onChange?: (updates: {
    categoryMappings: CategoryMapping[]
    course_structure?: CourseStructure
    published_course_id?: string
    outline_data?: { approved?: boolean }
    shouldAdvanceStep?: boolean
  }) => void
  onNext?: () => void
  onPrevious?: () => void
}

export function CategoryMappingStep({ 
  workflow, 
  onChange, 
  onNext, 
  onPrevious 
}: CategoryMappingStepProps) {
  const { toast } = useToast()
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [categoryMappings, setCategoryMappings] = useState<CategoryMapping[]>([])
  const [aiOutline, setAiOutline] = useState<AIParsedOutline | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingDraft, setIsCreatingDraft] = useState(false)

  // カテゴリ・サブカテゴリデータ読み込み
  const loadCategoriesData = async () => {
    try {
      const { ApiClient } = await import('@/lib/api-helpers')
      
      // カテゴリ取得
      const categoriesResult = await ApiClient.get<{ categories: Category[] }>('/api/categories')
      setCategories(categoriesResult.categories || [])
      
      // サブカテゴリ取得（アクティブのみ）
      const subcategoriesResult = await ApiClient.get<{ subcategories: Subcategory[] }>('/api/subcategories?active_only=true')
      setSubcategories(subcategoriesResult.subcategories || [])
      
    } catch (error) {
      console.error('❌ Category data load error:', error)
      toast({
        title: "データ取得エラー",
        description: "カテゴリデータの取得に失敗しました",
        variant: "destructive"
      })
    }
  }

  // AIアウトライン解析・初期マッピング設定
  const parseAIOutlineAndSetup = async () => {
    if (!workflow.aiOutlineResponse) {
      toast({
        title: "アウトラインデータなし",
        description: "前のステップでAI生成を完了してください",
        variant: "destructive"
      })
      return
    }

    try {
      const parsedOutline: AIParsedOutline = JSON.parse(workflow.aiOutlineResponse)
      setAiOutline(parsedOutline)

      // 既存のcategoryMappingsがあれば復元、なければ初期化
      if (workflow.categoryMappings && workflow.categoryMappings.length > 0) {
        console.log('📋 [CategoryMapping] 既存のカテゴリマッピングを復元:', workflow.categoryMappings)
        // 既存のマッピングが正しいgenreIdを持っているか確認
        const validMappings = workflow.categoryMappings.filter(m => m.genreId)
        if (validMappings.length === parsedOutline.genres.length) {
          setCategoryMappings(workflow.categoryMappings)
        } else {
          // マッピングが不完全な場合は再初期化
          console.warn('⚠️ [CategoryMapping] 既存マッピングが不完全なため再初期化')
          await initializeMappings(parsedOutline)
        }
      } else {
        await initializeMappings(parsedOutline)
      }
      
    } catch (error) {
      console.error('❌ AI outline parse error:', error)
      toast({
        title: "アウトライン解析エラー",
        description: "AI生成アウトラインの解析に失敗しました",
        variant: "destructive"
      })
    }
    
    async function initializeMappings(outline: AIParsedOutline) {
      console.log('🔄 [CategoryMapping] 新規カテゴリマッピングを初期化')
      // クライアントサイドID生成ライブラリを使用
      const { generateClientId } = await import('@/lib/id-generation-client')
      
      // 各ジャンルに対してマッピング初期化
      const initialMappings: CategoryMapping[] = await Promise.all(
        outline.genres.map(async (genre, index) => {
          // genreIdはすでに存在するIDを優先使用
          let genreId = genre.id
          
          // IDが存在しない場合のみ生成
          if (!genreId) {
            genreId = await generateClientId('genre', genre.title)
          }
          
          // すでにユニークなIDがあるかチェック
          const existingIds = outline.genres
            .slice(0, index)
            .map(g => g.id)
            .filter(Boolean)
          
          // 重複している場合のみインデックスを追加
          if (existingIds.includes(genreId)) {
            genreId = `${genreId}_${index}`
          }
          
          console.log(`📋 [CategoryMapping] Genre mapping初期化: "${genre.title}" -> ID: "${genreId}"`)
          
          return {
            genreId,
            genreTitle: genre.title,
            selectedCategoryId: undefined,
            selectedSubcategoryId: undefined,
            aiRecommendedCategoryId: genre.suggested_category_id,
            aiRecommendedSubcategoryId: genre.suggested_subcategory_id,
            confidenceScore: 0.8, // デフォルト信頼度
            manualOverride: false
          }
        })
      )
      
      // IDの重複がないことを確認
      const genreIds = initialMappings.map(m => m.genreId)
      const uniqueIds = new Set(genreIds)
      if (genreIds.length !== uniqueIds.size) {
        console.error('❌ [CategoryMapping] 重複したgenreIdが検出されました:', genreIds)
      }

      setCategoryMappings(initialMappings)
    }
  }

  // categoryMappings変更時に親コンポーネントへ通知（useEffectで非同期に）
  const [shouldNotifyParent, setShouldNotifyParent] = useState(false)

  useEffect(() => {
    if (shouldNotifyParent && categoryMappings.length > 0) {
      console.log('📋 [CategoryMapping] 親コンポーネントに変更を通知')
      onChange?.({ categoryMappings })
      setShouldNotifyParent(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldNotifyParent, categoryMappings])

  // カテゴリ選択変更ハンドラ
  const handleCategoryChange = (genreId: string, categoryId: string) => {
    console.log(`📋 [CategoryMapping] カテゴリ変更: genreId="${genreId}", categoryId="${categoryId}"`)

    setCategoryMappings(prev => {
      const updated = prev.map(mapping => {
        if (mapping.genreId === genreId) {
          console.log(`✅ [CategoryMapping] マッピング更新: "${mapping.genreTitle}" (${mapping.genreId}) -> カテゴリ: ${categoryId}`)
          return {
            ...mapping,
            selectedCategoryId: categoryId,
            selectedSubcategoryId: undefined, // カテゴリ変更時はサブカテゴリリセット
            manualOverride: true
          }
        }
        return mapping
      })

      console.log('📋 [CategoryMapping] 全マッピング状態:', updated.map(m => ({
        genreId: m.genreId,
        genreTitle: m.genreTitle,
        selectedCategoryId: m.selectedCategoryId
      })))

      return updated
    })

    // 親コンポーネントへの通知をスケジュール
    setShouldNotifyParent(true)
  }

  // サブカテゴリ選択変更ハンドラ
  const handleSubcategoryChange = (genreId: string, subcategoryId: string) => {
    console.log(`📋 [CategoryMapping] サブカテゴリ変更: genreId="${genreId}", subcategoryId="${subcategoryId}"`)

    setCategoryMappings(prev => {
      const updated = prev.map(mapping => {
        if (mapping.genreId === genreId) {
          console.log(`✅ [CategoryMapping] サブカテゴリ更新: "${mapping.genreTitle}" (${mapping.genreId}) -> サブカテゴリ: ${subcategoryId}`)
          return {
            ...mapping,
            selectedSubcategoryId: subcategoryId,
            manualOverride: true
          }
        }
        return mapping
      })

      return updated
    })

    // 親コンポーネントへの通知をスケジュール
    setShouldNotifyParent(true)
  }


  // 指定カテゴリのサブカテゴリ取得
  const getSubcategoriesForCategory = (categoryId: string) => {
    return subcategories.filter(sub => sub.parent_category_id === categoryId)
  }

  // カテゴリ名取得
  const getCategoryName = (categoryId: string | undefined) => {
    if (!categoryId) return '未選択'
    const category = categories.find(c => c.category_id === categoryId)
    return category?.name || '不明なカテゴリ'
  }

  // サブカテゴリ名取得
  const getSubcategoryName = (subcategoryId: string | undefined) => {
    if (!subcategoryId) return ''
    const subcategory = subcategories.find(s => s.subcategory_id === subcategoryId)
    return subcategory?.name || '不明なサブカテゴリ'
  }

  // コースデータが存在するかどうか
  const hasCourseData = Boolean(workflow.published_course_id)

  // デバッグ: published_course_id の確認
  console.log('🔍 [CategoryMappingStep] workflow.published_course_id:', workflow.published_course_id)
  console.log('🔍 [CategoryMappingStep] hasCourseData:', hasCourseData)

  // マッピング完了チェック
  const isMappingComplete = () => {
    return categoryMappings.length > 0 && categoryMappings.every(mapping =>
      mapping.selectedCategoryId
    )
  }

  // 承認して次のステップ実行（コースデータ生成）
  const handleApprove = async () => {
    if (!isMappingComplete()) {
      toast({
        title: "マッピング未完了",
        description: "全てのジャンルにカテゴリを選択してください",
        variant: "destructive"
      })
      return
    }

    // コースデータが既に存在する場合は変更不可
    if (hasCourseData) {
      toast({
        title: "変更できません",
        description: "コースデータが既に作成されているため、カテゴリマッピングは変更できません",
        variant: "destructive"
      })
      return
    }

    // 処理中の場合も重複防止
    if (isCreatingDraft) {
      return
    }

    setIsCreatingDraft(true)

    try {
      if (!workflow.id) {
        toast({
          title: "エラー",
          description: "ワークフローIDが見つかりません",
          variant: "destructive"
        })
        return
      }

      const { ApiClient } = await import('@/lib/api-helpers')

      console.log('📋 [CategoryMapping] コースデータ生成開始...')
      console.log('📋 [CategoryMapping] カテゴリマッピング:', categoryMappings)

      // publish-outline APIを呼んでコースデータを生成
      const publishResult = await ApiClient.post<{
        success: boolean
        course_id?: string
        error?: string
      }>(`/api/ai-course-generation/workflows/${workflow.id}/publish-outline`, {
        status: 'coming_soon',
        categoryMappings: categoryMappings
      })

      if (!publishResult.success) {
        throw new Error(publishResult.error || 'コース作成に失敗しました')
      }

      // コースデータ生成後、最新のワークフローを取得して親コンポーネントに通知
      // これにより course_structure と published_course_id が更新される
      console.log('📋 [CategoryMapping] ワークフロー再取得開始...')
      const updatedWorkflow = await ApiClient.get<{
        success: boolean
        workflow: {
          course_structure?: unknown
          published_course_id?: string
          outline_data?: { approved?: boolean }
        }
      }>(`/api/ai-course-generation/workflows/${workflow.id}`)

      if (updatedWorkflow.success && updatedWorkflow.workflow) {
        // 親コンポーネントに最新データを通知し、ステップ遷移も同時に行う
        // 注意: shouldAdvanceStep=trueで親がcurrentStepを同じsetWorkflow内で更新
        onChange?.({
          categoryMappings,
          course_structure: updatedWorkflow.workflow.course_structure as CourseStructure | undefined,
          published_course_id: updatedWorkflow.workflow.published_course_id,
          outline_data: updatedWorkflow.workflow.outline_data,
          shouldAdvanceStep: true
        })
        console.log('✅ [CategoryMapping] ワークフロー更新完了:', {
          hasCourseStructure: !!updatedWorkflow.workflow.course_structure,
          publishedCourseId: updatedWorkflow.workflow.published_course_id
        })
      }

      toast({
        title: "✅ コース作成完了",
        description: `コースデータを生成しました（ID: ${publishResult.course_id}）`
      })

    } catch (error) {
      console.error('[CategoryMapping] Error in handleApprove:', error)
      toast({
        title: "エラーが発生しました",
        description: error instanceof Error ? error.message : "コースデータ生成中にエラーが発生しました",
        variant: "destructive"
      })
    } finally {
      setIsCreatingDraft(false)
    }
  }

  // 初期化
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true)
      await loadCategoriesData()
      await parseAIOutlineAndSetup()
      setIsLoading(false)
    }

    initialize()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Brain className="h-8 w-8 mx-auto mb-4 animate-pulse text-blue-500" />
          <p className="text-muted-foreground">カテゴリデータを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!aiOutline) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
        <h3 className="text-lg font-semibold mb-2">アウトラインデータが見つかりません</h3>
        <p className="text-muted-foreground mb-4">
          前のステップでAI生成を完了してから戻ってください
        </p>
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          前のステップに戻る
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
          <Target className="h-6 w-6 text-purple-600" />
          カテゴリマッピング
        </h2>
        <p className="text-muted-foreground">
          AI生成されたコースアウトラインを学習分析システムのカテゴリと紐付けします
        </p>
      </div>

      {/* コース概要 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600" />
            生成されたコース概要
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <h3 className="font-semibold text-blue-900">{aiOutline.course.title}</h3>
            <p className="text-sm text-blue-800">{aiOutline.course.description}</p>
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <Layers className="h-3 w-3" />
              <span>{aiOutline.genres.length} ジャンル構成</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* カテゴリマッピング設定 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">ジャンル別カテゴリ設定</h3>
        
        {categoryMappings.map((mapping, index) => (
          <Card key={`${mapping.genreId}-${index}`} className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base">{mapping.genreTitle}</CardTitle>
                  <CardDescription className="text-sm">
                    学習記録の分析カテゴリを選択してください
                  </CardDescription>
                </div>
                {mapping.selectedCategoryId && (
                  <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* カテゴリ選択 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>カテゴリ</Label>
                  <Select
                    value={mapping.selectedCategoryId || ''}
                    onValueChange={(value) => handleCategoryChange(mapping.genreId, value)}
                    disabled={hasCourseData}
                  >
                    <SelectTrigger className={hasCourseData ? 'opacity-50' : ''}>
                      <SelectValue placeholder="カテゴリを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.category_id} value={category.category_id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>
                    サブカテゴリ（任意）
                  </Label>
                  <Select
                    value={mapping.selectedSubcategoryId || ''}
                    onValueChange={(value) => handleSubcategoryChange(mapping.genreId, value)}
                    disabled={hasCourseData || !mapping.selectedCategoryId}
                  >
                    <SelectTrigger className={hasCourseData || !mapping.selectedCategoryId ? 'opacity-50' : ''}>
                      <SelectValue placeholder="サブカテゴリを選択" />
                    </SelectTrigger>
                    <SelectContent>
                      {mapping.selectedCategoryId && getSubcategoriesForCategory(mapping.selectedCategoryId).map((subcategory) => (
                        <SelectItem key={subcategory.subcategory_id} value={subcategory.subcategory_id}>
                          {subcategory.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* 設定状態表示 */}
              {mapping.selectedCategoryId && (
                <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
                  ✅ {getCategoryName(mapping.selectedCategoryId)}
                  {mapping.selectedSubcategoryId && 
                    ` > ${getSubcategoryName(mapping.selectedSubcategoryId)}`
                  }
                  {mapping.manualOverride && (
                    <Badge variant="outline" className="ml-2 text-xs">手動設定</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* マッピング状況サマリー */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Info className="h-5 w-5 text-green-600" />
            <div className="text-sm text-green-800">
              <span className="font-medium">
                マッピング進捗: {categoryMappings.filter(m => m.selectedCategoryId).length} / {categoryMappings.length}
              </span>
              <p className="text-xs mt-1">
                カテゴリ設定により、学習記録が適切に分析・集計されます
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* フッター */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={onPrevious}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          前のステップ
        </Button>

        <div className="flex items-center gap-4">
          {hasCourseData ? (
            <>
              <Badge variant="secondary" className="text-xs">
                コース作成済み（変更不可）
              </Badge>
              <Button
                onClick={onNext}
                className="min-w-32 flex items-center gap-2"
              >
                次のステップ
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {isMappingComplete() ? (
                  "✅ マッピング完了"
                ) : (
                  `${categoryMappings.length - categoryMappings.filter(m => m.selectedCategoryId).length} 項目未設定`
                )}
              </p>

              <Button
                onClick={handleApprove}
                disabled={!isMappingComplete() || isCreatingDraft || hasCourseData}
                className="min-w-32 flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                {isCreatingDraft ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    コース作成中...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    承認して次のステップ
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}