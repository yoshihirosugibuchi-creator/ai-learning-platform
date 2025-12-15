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
import { coursePublisher } from '@/lib/ai-course-generation/course-publisher'
import { convertToPublisherWorkflow, type CourseWizardWorkflow } from '@/lib/ai-course-generation/type-conversion'
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

// AIアウトラインの型定義（JSON解析用）
interface AIGenre {
  id?: string
  genreTitle: string
  genreDescription: string
  suggested_category_id?: string
  suggested_subcategory_id?: string
  themes: Array<{
    themeTitle: string
    themeDescription: string
    sessions: Array<{
      sessionTitle: string
      sessionDescription: string
      estimatedMinutes: number
    }>
  }>
}

interface AIParsedOutline {
  courseTitle: string
  courseDescription: string
  genres: AIGenre[]
  categoryMapping?: {
    recommendedCategoryId: number
    recommendedSubcategoryId?: number
    reason: string
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
  category_id: string
  is_active: boolean
}

interface CategoryMappingStepProps {
  workflow: {
    id?: string
    aiOutlineResponse?: string
    sources: unknown[]
  }
  onChange?: (updates: { categoryMappings: CategoryMapping[] }) => void
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
      
      // カテゴリのみ取得（現在サブカテゴリAPIは未実装のため）
      const categoriesResult = await ApiClient.get<{ categories: Category[] }>('/api/categories')
      
      setCategories(categoriesResult.categories || [])
      // サブカテゴリは現在空配列（将来実装予定）
      setSubcategories([])
      
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
  const parseAIOutlineAndSetup = () => {
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

      // 各ジャンルに対してマッピング初期化
      const initialMappings: CategoryMapping[] = parsedOutline.genres.map((genre, index) => ({
        genreId: genre.id || `genre_${index}`,
        genreTitle: genre.genreTitle,
        selectedCategoryId: undefined,
        selectedSubcategoryId: undefined,
        aiRecommendedCategoryId: genre.suggested_category_id,
        aiRecommendedSubcategoryId: genre.suggested_subcategory_id,
        confidenceScore: 0.8, // デフォルト信頼度
        manualOverride: false
      }))

      setCategoryMappings(initialMappings)
      
    } catch (error) {
      console.error('❌ AI outline parse error:', error)
      toast({
        title: "アウトライン解析エラー",
        description: "AI生成アウトラインの解析に失敗しました",
        variant: "destructive"
      })
    }
  }

  // カテゴリ選択変更ハンドラ
  const handleCategoryChange = (genreId: string, categoryId: string) => {
    setCategoryMappings(prev => 
      prev.map(mapping => {
        if (mapping.genreId === genreId) {
          return {
            ...mapping,
            selectedCategoryId: categoryId,
            selectedSubcategoryId: undefined, // カテゴリ変更時はサブカテゴリリセット
            manualOverride: true
          }
        }
        return mapping
      })
    )
  }

  // サブカテゴリ選択変更ハンドラ
  const handleSubcategoryChange = (genreId: string, subcategoryId: string) => {
    setCategoryMappings(prev => 
      prev.map(mapping => {
        if (mapping.genreId === genreId) {
          return {
            ...mapping,
            selectedSubcategoryId: subcategoryId,
            manualOverride: true
          }
        }
        return mapping
      })
    )
  }

  // AI推奨カテゴリ適用
  const applyAIRecommendation = (genreId: string) => {
    setCategoryMappings(prev => 
      prev.map(mapping => {
        if (mapping.genreId === genreId) {
          return {
            ...mapping,
            selectedCategoryId: mapping.aiRecommendedCategoryId,
            selectedSubcategoryId: mapping.aiRecommendedSubcategoryId,
            manualOverride: false
          }
        }
        return mapping
      })
    )
  }

  // 指定カテゴリのサブカテゴリ取得
  const getSubcategoriesForCategory = (categoryId: string) => {
    return subcategories.filter(sub => sub.category_id === categoryId)
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

  // マッピング完了チェック
  const isMappingComplete = () => {
    return categoryMappings.length > 0 && categoryMappings.every(mapping => 
      mapping.selectedCategoryId
    )
  }

  // 次のステップ実行
  const handleNext = async () => {
    if (!isMappingComplete()) {
      toast({
        title: "マッピング未完了",
        description: "全てのジャンルにカテゴリを選択してください",
        variant: "destructive"
      })
      return
    }

    setIsCreatingDraft(true)

    try {
      // ワークフロー更新
      onChange?.({ categoryMappings })

      // アウトライン承認済みの場合、draftコース作成  
      const wizardWorkflow = workflow as CourseWizardWorkflow
      if (wizardWorkflow.outline_data?.approved) {
        // 型変換: CourseWizard型 → CourseGenerationWorkflow型
        const publishWorkflow = await convertToPublisherWorkflow({
          ...wizardWorkflow,
          categoryMappings: categoryMappings,
          status: 'category_mapping_completed'
        })
        
        const publishResult = await coursePublisher.publishFromOutline(publishWorkflow, {
          status: 'draft',
          generateIds: true
        })

        if (publishResult.success) {
          toast({
            title: "カテゴリマッピング完了",
            description: `ドラフトコース「${publishResult.courseId}」を作成しました。次のステップに進んでください。`
          })
        } else {
          console.error('[CategoryMapping] Draft course creation failed:', publishResult.error)
          toast({
            title: "カテゴリマッピング完了",
            description: "学習分析カテゴリとの紐付けが完了しました（ドラフトコース作成はスキップされました）"
          })
        }
      } else {
        toast({
          title: "カテゴリマッピング完了",
          description: "学習分析カテゴリとの紐付けが完了しました"
        })
      }

      onNext?.()

    } catch (error) {
      console.error('[CategoryMapping] Error in handleNext:', error)
      toast({
        title: "エラーが発生しました",
        description: "カテゴリマッピング処理中にエラーが発生しました",
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
      parseAIOutlineAndSetup()
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
            <h3 className="font-semibold text-blue-900">{aiOutline.courseTitle}</h3>
            <p className="text-sm text-blue-800">{aiOutline.courseDescription}</p>
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
        
        {categoryMappings.map((mapping) => (
          <Card key={mapping.genreId} className="border-gray-200">
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
              {/* AI推奨カテゴリ表示 */}
              {mapping.aiRecommendedCategoryId && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">AI推奨カテゴリ</span>
                    <Badge variant="outline" className="text-xs">
                      信頼度: {Math.round((mapping.confidenceScore || 0) * 100)}%
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-purple-700 mb-2">
                    {getCategoryName(mapping.aiRecommendedCategoryId)}
                    {mapping.aiRecommendedSubcategoryId && 
                      ` > ${getSubcategoryName(mapping.aiRecommendedSubcategoryId)}`
                    }
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => applyAIRecommendation(mapping.genreId)}
                    className="text-xs"
                  >
                    この推奨を適用
                  </Button>
                </div>
              )}
              
              {/* カテゴリ選択 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>カテゴリ</Label>
                  <Select
                    value={mapping.selectedCategoryId || ''}
                    onValueChange={(value) => handleCategoryChange(mapping.genreId, value)}
                  >
                    <SelectTrigger>
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
                  >
                    <SelectTrigger className={!mapping.selectedCategoryId ? 'opacity-50' : ''}>
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
          <p className="text-sm text-muted-foreground">
            {isMappingComplete() ? (
              "✅ マッピング完了"
            ) : (
              `${categoryMappings.length - categoryMappings.filter(m => m.selectedCategoryId).length} 項目未設定`
            )}
          </p>
          
          <Button 
            onClick={handleNext}
            disabled={!isMappingComplete() || isCreatingDraft}
            className="min-w-32 flex items-center gap-2"
          >
            {isCreatingDraft ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                ドラフト作成中...
              </>
            ) : (
              <>
                次のステップ
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}