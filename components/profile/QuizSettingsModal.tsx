'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ArrowLeft, ArrowRight, Check, Settings, RotateCcw } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/hooks/use-toast'
import { ToastContainer } from '@/components/ui/toast'
import { 
  getUserQuizSettings, 
  saveUserQuizSettings, 
  getDefaultQuizSettings,
  type QuizPersonalizationSettings 
} from '@/lib/user-quiz-settings'
import { getSubcategories } from '@/lib/categories'

interface QuizSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

interface CategoryItem {
  id: string
  name: string
  type: 'basic' | 'industry'
}

interface SubcategoryItem {
  id: string
  name: string
  categoryId: string
}

interface ApiCategoryResponse {
  category_id: string
  name: string
  type: 'main' | 'industry'
  display_order: number
  description?: string
  icon?: string
  color?: string
  is_active?: boolean
  is_visible?: boolean
}

interface ConvertedCategoryData {
  id: string
  name: string
  type: 'main' | 'industry'
  displayOrder: number
}

interface LearningLevelItem {
  id: string
  name: string
  display_name: string
  description: string
  target_experience: string
  display_order: number
  color?: string
  quiz_count?: number
}

export default function QuizSettingsModal({ isOpen, onClose }: QuizSettingsModalProps) {
  const { user } = useAuth()
  const { toast, toasts, removeToast } = useToast()
  const [currentStep, setCurrentStep] = useState(1)
  const [_settings, setSettings] = useState<QuizPersonalizationSettings | null>(null)
  const [tempSettings, setTempSettings] = useState<Partial<QuizPersonalizationSettings>>({})
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [_subcategories, setSubcategories] = useState<SubcategoryItem[]>([])
  const [learningLevels, setLearningLevels] = useState<LearningLevelItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showResetDialog, setShowResetDialog] = useState(false)

  const loadSettings = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const [userSettings, levelsResponse] = await Promise.all([
        getUserQuizSettings(user.id),
        fetch('/api/skill-levels')
      ])

      // カテゴリーデータを直接APIから取得（アクティブのみ）
      const categoriesResponse = await fetch('/api/categories?active_only=true')
      const categoriesApiData = await categoriesResponse.json()
      const rawCategories = categoriesApiData.categories || []

      console.log('🔍 Raw API categories:', rawCategories.length, 'categories')
      console.log('🔍 Category types:', rawCategories.map((c: ApiCategoryResponse) => c.type))

      // APIレスポンスをローカル形式に変換
      const categoriesData: ConvertedCategoryData[] = rawCategories.map((cat: ApiCategoryResponse) => ({
        id: cat.category_id,
        name: cat.name,
        type: cat.type,
        displayOrder: cat.display_order
      }))

      console.log('🔍 Converted categoriesData:', categoriesData.length, 'categories')
      console.log('🔍 First converted category:', categoriesData[0])

      // カテゴリーデータを基本/業界に分類
      const basicCategories = categoriesData
        .filter(cat => cat.type === 'main')
        .map(cat => ({ id: cat.id, name: cat.name, type: 'basic' as const }))
      
      const industryCategories = categoriesData
        .filter(cat => cat.type === 'industry')
        .map(cat => ({ id: cat.id, name: cat.name, type: 'industry' as const }))
      
      // スキルレベルデータを処理
      const levelsData = await levelsResponse.json()
      const skillLevels = levelsData.skill_levels || []
      setLearningLevels(skillLevels)

      console.log('📊 Data loaded:', { 
        categories: categoriesData.length, 
        basic: basicCategories.length, 
        industry: industryCategories.length,
        learningLevels: skillLevels.length,
        basicIds: basicCategories.map(c => c.id),
        userBasicCategories: userSettings.basicCategories
      })

      setCategories([...basicCategories, ...industryCategories])

      // スキルレベルから「basic」IDを探す、なければ最初のレベルを選択
      const defaultLearningLevel = skillLevels.find((level: LearningLevelItem) => level.id === 'basic')?.id || 
                                  (skillLevels.length > 0 ? skillLevels[0].id : 'basic')
      
      console.log('🎯 Learning level initialization:', {
        userLevel: userSettings.learningLevel,
        defaultLevel: defaultLearningLevel,
        availableLevels: skillLevels.map((l: LearningLevelItem) => ({ id: l.id, name: l.name }))
      })
      
      // 設定の初期化：未設定または空の場合はデフォルト値を設定
      const finalSettings = {
        ...userSettings,
        learningLevel: userSettings.learningLevel && userSettings.learningLevel.trim() ? 
                      userSettings.learningLevel : defaultLearningLevel,
        basicCategories: userSettings.basicCategories.length === 0 
          ? basicCategories.map(cat => cat.id) 
          : userSettings.basicCategories
      }

      console.log('📋 Final settings before setState:', finalSettings)
      setSettings(finalSettings)
      setTempSettings({ ...finalSettings })
      
      // 追加の初期化保証：learningLevelsが設定された後に再度チェック
      setTimeout(() => {
        setTempSettings(prev => {
          const needsLearningLevel = !prev.learningLevel
          const needsBasicCategories = !prev.basicCategories || prev.basicCategories.length === 0
          
          if (needsLearningLevel || needsBasicCategories) {
            console.log('🔧 Secondary initialization needed:', { needsLearningLevel, needsBasicCategories })
            return {
              ...prev,
              learningLevel: needsLearningLevel ? defaultLearningLevel : prev.learningLevel,
              basicCategories: needsBasicCategories ? basicCategories.map(cat => cat.id) : prev.basicCategories
            }
          }
          return prev
        })
      }, 100)
      
      console.log('✅ Settings and tempSettings updated')

      // サブカテゴリーデータの取得
      const subcategoriesData = await getSubcategories()
      const mappedSubcategories = subcategoriesData
        .map(sub => ({ 
          id: sub.id, 
          name: sub.name, 
          categoryId: sub.parentId 
        }))
      setSubcategories(mappedSubcategories)

    } catch (error) {
      console.error('設定データの読み込みに失敗:', error)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // user依存関係除去（無限ループ防止・ロジック保持）

  // モーダルが開かれた時の初期化
  useEffect(() => {
    if (isOpen && user) {
      setCurrentStep(1) // 必ず Step 1 から開始
      loadSettings()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, user]) // loadSettings依存関係除去（無限ループ防止）

  // tempSettingsに学習レベルが設定されていない場合の保険処理
  useEffect(() => {
    if (learningLevels.length > 0 && tempSettings && !tempSettings.learningLevel) {
      const defaultLevel = learningLevels.find((level: LearningLevelItem) => level.id === 'basic')?.id || 
                          learningLevels[0].id
      console.log('🔧 Fallback: Setting default learning level:', defaultLevel)
      setTempSettings(prev => ({ ...prev, learningLevel: defaultLevel as 'basic' | 'intermediate' | 'advanced' | 'expert' }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learningLevels]) // tempSettings依存関係除去（無限ループ防止・デフォルト値設定は一度のみ実行）

  const handleNext = () => {
    if (currentStep < 5) {
      // Step 3で業界を選択しなかった場合、Step 4をスキップ
      if (currentStep === 3 && (!tempSettings.industryCategories || tempSettings.industryCategories.length === 0)) {
        setCurrentStep(5)
      } else {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      // Step 5から戻る時、業界選択がなければStep 3に戻る
      if (currentStep === 5 && (!tempSettings.industryCategories || tempSettings.industryCategories.length === 0)) {
        setCurrentStep(3)
      } else {
        setCurrentStep(currentStep - 1)
      }
    }
  }

  const handleStepClick = (step: number) => {
    // Step 4は業界選択がある場合のみアクセス可能
    if (step === 4 && (!tempSettings.industryCategories || tempSettings.industryCategories.length === 0)) {
      return
    }
    setCurrentStep(step)
  }

  const handleSave = async () => {
    if (!user || !tempSettings) return

    setSaving(true)
    try {
      const settingsToSave = {
        learningLevel: tempSettings.learningLevel || 'basic',
        basicCategories: tempSettings.basicCategories || [],
        industryCategories: tempSettings.industryCategories || [],
        industrySubcategories: tempSettings.industrySubcategories || []
      }

      const result = await saveUserQuizSettings(user.id, settingsToSave)
      if (result.success) {
        setSettings({ ...settingsToSave, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        // 保存完了後にセッションストレージをクリア
        sessionStorage.removeItem('quiz-settings-modal-open')
        onClose()
        toast({
          title: '設定を保存しました',
          description: 'クイズパーソナライズ設定が正常に更新されました。'
        })
      } else {
        toast({
          title: '設定の保存に失敗しました',
          description: result.error,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('設定保存エラー:', error)
      toast({
        title: '設定の保存中にエラーが発生しました',
        description: 'しばらく時間をおいて再度お試しください。',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setShowResetDialog(true)
  }

  const confirmReset = () => {
    const defaultSettings = {
      ...getDefaultQuizSettings(),
      basicCategories: basicCategoriesData.map(cat => cat.id) // 全基本カテゴリーを選択
    }
    setTempSettings({ ...defaultSettings })
    setCurrentStep(1)
    setShowResetDialog(false)
    toast({
      title: '設定をリセットしました',
      description: 'デフォルト設定に戻りました。設定確認後に保存してください。'
    })
  }

  const basicCategoriesData = categories.filter(cat => cat.type === 'basic')
  const industryCategoriesData = categories.filter(cat => cat.type === 'industry')
  
  // デバッグログ（無限ループ防止のため削除）
  // console.log('🐛 Categories debug:', {
  //   totalCategories: categories.length,
  //   basicCount: basicCategoriesData.length,
  //   industryCount: industryCategoriesData.length,
  //   sampleCategory: categories[0],
  //   allTypes: categories.map(cat => cat.type),
  //   currentStep,
  //   tempBasicCategoriesLength: tempSettings.basicCategories?.length,
  //   tempBasicCategories: tempSettings.basicCategories
  // })

  // Step 1: 学習レベル選択
  const renderStep1 = () => {
    // console.log('🎯 Step1 render - current tempSettings:', tempSettings)
    // console.log('📊 Available learning levels:', learningLevels.length, learningLevels.map(l => ({ id: l.id, name: l.name })))
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">学習レベル選択</h3>
          <p className="text-sm text-muted-foreground" id="quiz-settings-description">
            自分の学習したいレベルを選択してください
          </p>
          {!tempSettings.learningLevel && (
            <p className="text-sm text-orange-600 mt-1">
              ※ 学習レベルの選択が必要です
            </p>
          )}
          {tempSettings.learningLevel && (
            <p className="text-sm text-green-600 mt-1">
              選択中: {learningLevels.find(l => l.id === tempSettings.learningLevel)?.name}
            </p>
          )}
        </div>
      
      <div className="space-y-3">
        {learningLevels.map(level => (
          <Card 
            key={level.id} 
            className={`cursor-pointer transition-all ${
              tempSettings.learningLevel === level.id 
                ? 'border-primary bg-primary/5' 
                : 'hover:border-gray-300'
            }`}
            onClick={() => setTempSettings({ ...tempSettings, learningLevel: level.id as 'basic' | 'intermediate' | 'advanced' | 'expert' })}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{level.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {level.description} {level.quiz_count ? `(${level.quiz_count}問)` : ''}
                  </div>
                </div>
                {tempSettings.learningLevel === level.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        </div>
      </div>
    )
  }

  // Step 2: 基本カテゴリー選択
  const renderStep2 = () => {
    console.log('📝 Step2 render - basic categories:', {
      totalCategories: categories.length,
      basicCategories: basicCategoriesData.length,
      basicCategoryList: basicCategoriesData.map(c => ({ id: c.id, name: c.name })),
      selectedBasicCategories: tempSettings.basicCategories?.length || 0
    })
    
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">基本カテゴリー選択</h3>
          <p className="text-sm text-muted-foreground">学習したい基本ビジネススキルを選択してください</p>
          {basicCategoriesData.length === 0 && (
            <p className="text-sm text-red-600 mt-1">
              ⚠️ カテゴリーが読み込まれていません
            </p>
          )}
        </div>

      <div className="flex gap-2 mb-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setTempSettings({ 
            ...tempSettings, 
            basicCategories: basicCategoriesData.map(cat => cat.id) 
          })}
        >
          全選択
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setTempSettings({ ...tempSettings, basicCategories: [] })}
        >
          全解除
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {basicCategoriesData.map(category => (
          <Card 
            key={category.id}
            className={`cursor-pointer transition-all ${
              tempSettings.basicCategories?.includes(category.id)
                ? 'border-primary bg-primary/5' 
                : 'hover:border-gray-300'
            }`}
            onClick={() => {
              const current = tempSettings.basicCategories || []
              const updated = current.includes(category.id)
                ? current.filter(id => id !== category.id)
                : [...current, category.id]
              setTempSettings({ ...tempSettings, basicCategories: updated })
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{category.name}</span>
                {tempSettings.basicCategories?.includes(category.id) && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="text-center">
        <Badge variant="secondary">
          {tempSettings.basicCategories?.length || 0}個選択中
        </Badge>
        </div>
      </div>
    )
  }

  // Step 3: 業界選択
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">業界選択</h3>
        <p className="text-sm text-muted-foreground">学習したい業界を選択してください（オプション）</p>
      </div>

      <div className="flex gap-2 mb-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setTempSettings({ 
            ...tempSettings, 
            industryCategories: industryCategoriesData.map(cat => cat.id) 
          })}
        >
          全選択
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setTempSettings({ 
            ...tempSettings, 
            industryCategories: [],
            industrySubcategories: [] // 業界全解除時はサブカテゴリーもクリア
          })}
        >
          全解除
        </Button>
      </div>

      {industryCategoriesData.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-3">
            {industryCategoriesData.map(category => (
              <Card 
                key={category.id}
                className={`cursor-pointer transition-all ${
                  tempSettings.industryCategories?.includes(category.id)
                    ? 'border-primary bg-primary/5' 
                    : 'hover:border-gray-300'
                }`}
                onClick={() => {
                  const current = tempSettings.industryCategories || []
                  const isSelected = current.includes(category.id)
                  
                  if (isSelected) {
                    // 業界のチェックを外す場合、該当する業界のサブカテゴリーも除外
                    const updatedIndustries = current.filter(id => id !== category.id)
                    const currentSubcategories = tempSettings.industrySubcategories || []
                    const removedSubcategories = currentSubcategories.filter(subId => {
                      const subcategory = _subcategories.find(sub => sub.id === subId)
                      return subcategory && subcategory.categoryId === category.id
                    })
                    const updatedSubcategories = currentSubcategories.filter(subId => {
                      const subcategory = _subcategories.find(sub => sub.id === subId)
                      return subcategory && subcategory.categoryId !== category.id
                    })
                    
                    console.log(`🗑️ Industry ${category.name} removed, also removing ${removedSubcategories.length} subcategories`, {
                      removedIndustry: category.id,
                      removedSubcategories,
                      remainingIndustries: updatedIndustries.length,
                      remainingSubcategories: updatedSubcategories.length
                    })
                    
                    setTempSettings({ 
                      ...tempSettings, 
                      industryCategories: updatedIndustries,
                      industrySubcategories: updatedSubcategories
                    })
                  } else {
                    // 業界を追加する場合
                    const updatedIndustries = [...current, category.id]
                    console.log(`✅ Industry ${category.name} added`, {
                      addedIndustry: category.id,
                      totalIndustries: updatedIndustries.length
                    })
                    setTempSettings({ ...tempSettings, industryCategories: updatedIndustries })
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{category.name}</span>
                    {tempSettings.industryCategories?.includes(category.id) && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Badge variant="secondary">
              {tempSettings.industryCategories?.length || 0}個選択中
            </Badge>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">業界カテゴリーは現在準備中です</p>
        </div>
      )}
    </div>
  )

  // Step 4: 業界サブカテゴリー選択
  const renderStep4 = () => {
    const selectedIndustries = tempSettings.industryCategories || []
    const availableSubcategories = _subcategories.filter(sub => 
      selectedIndustries.includes(sub.categoryId)
    )

    // 業界毎にサブカテゴリーをグループ化
    const subcategoriesByIndustry = selectedIndustries.reduce((groups, industryId) => {
      const industry = industryCategoriesData.find(ind => ind.id === industryId)
      const subcategoriesForIndustry = availableSubcategories.filter(sub => sub.categoryId === industryId)
      
      if (industry && subcategoriesForIndustry.length > 0) {
        groups[industryId] = {
          industryName: industry.name,
          subcategories: subcategoriesForIndustry
        }
      }
      
      return groups
    }, {} as Record<string, { industryName: string; subcategories: SubcategoryItem[] }>)

    const allAvailableSubcategories = Object.values(subcategoriesByIndustry)
      .flatMap(group => group.subcategories)

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">業界サブカテゴリー選択</h3>
          <p className="text-sm text-muted-foreground">選択した業界の詳細分野を選択してください</p>
        </div>

        {Object.keys(subcategoriesByIndustry).length > 0 ? (
          <>
            <div className="flex gap-2 mb-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setTempSettings({ 
                  ...tempSettings, 
                  industrySubcategories: allAvailableSubcategories.map(sub => sub.id) 
                })}
              >
                全選択
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setTempSettings({ ...tempSettings, industrySubcategories: [] })}
              >
                全解除
              </Button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-6">
              {Object.entries(subcategoriesByIndustry).map(([industryId, group]) => (
                <div key={industryId} className="space-y-3">
                  {/* 業界名のヘッダー */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px bg-border flex-1"></div>
                    <h4 className="text-sm font-medium text-muted-foreground px-3">
                      {group.industryName}
                    </h4>
                    <div className="h-px bg-border flex-1"></div>
                  </div>

                  {/* 業界内のサブカテゴリー */}
                  <div className="grid grid-cols-1 gap-2 pl-2">
                    {group.subcategories.map(subcategory => (
                      <Card 
                        key={subcategory.id}
                        className={`cursor-pointer transition-all ${
                          tempSettings.industrySubcategories?.includes(subcategory.id)
                            ? 'border-primary bg-primary/5' 
                            : 'hover:border-gray-300'
                        }`}
                        onClick={() => {
                          const current = tempSettings.industrySubcategories || []
                          const updated = current.includes(subcategory.id)
                            ? current.filter(id => id !== subcategory.id)
                            : [...current, subcategory.id]
                          setTempSettings({ ...tempSettings, industrySubcategories: updated })
                        }}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{subcategory.name}</span>
                            {tempSettings.industrySubcategories?.includes(subcategory.id) && (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Badge variant="secondary">
                {tempSettings.industrySubcategories?.length || 0}個選択中
              </Badge>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              選択された業界にサブカテゴリーがありません
            </p>
            <Badge variant="secondary" className="mt-2">
              選択した業界: {selectedIndustries.length}個
            </Badge>
          </div>
        )}
      </div>
    )
  }

  // Step 5: 設定確認
  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">設定確認</h3>
        <p className="text-sm text-muted-foreground">以下の設定で保存します</p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-medium">学習レベル</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {learningLevels.find(l => l.id === tempSettings.learningLevel)?.name || '未設定'}
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium">基本カテゴリー</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {tempSettings.basicCategories?.length || 0}個選択
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">業界カテゴリー</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {tempSettings.industryCategories?.length || 0}個選択
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">業界サブカテゴリー</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {tempSettings.industrySubcategories?.length || 0}個選択
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving ? '保存中...' : '設定を保存'}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      case 4: return renderStep4()
      case 5: return renderStep5()
      default: return null
    }
  }

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>設定を読み込んでいます...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={true}>
      <DialogContent className="max-w-md mx-auto max-h-[80vh] overflow-y-auto" onEscapeKeyDown={onClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            クイズ設定
          </DialogTitle>
        </DialogHeader>

        {/* ステップバー */}
        <div className="flex items-center justify-between mb-6">
          {[1, 2, 3, 4, 5].map(step => (
            <button
              key={step}
              onClick={() => handleStepClick(step)}
              disabled={step === 4 && (!tempSettings.industryCategories || tempSettings.industryCategories.length === 0)}
              className={`w-8 h-8 rounded-full text-sm font-medium transition-all ${
                step === currentStep
                  ? 'bg-primary text-primary-foreground'
                  : step < currentStep
                  ? 'bg-primary/20 text-primary hover:bg-primary/30'
                  : step === 4 && (!tempSettings.industryCategories || tempSettings.industryCategories.length === 0)
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {step}
            </button>
          ))}
        </div>

        {/* ステップコンテンツ */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* ナビゲーションボタン */}
        {currentStep < 5 && (
          <div className="flex justify-between pt-4">
            <Button 
              variant="outline" 
              onClick={handlePrev} 
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
            <Button 
              onClick={handleNext}
              disabled={
                (currentStep === 1 && !tempSettings.learningLevel) ||
                (currentStep === 2 && (!tempSettings.basicCategories || tempSettings.basicCategories.length === 0))
              }
            >
              次へ
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>

      {/* リセット確認ダイアログ */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>設定をリセットしますか？</DialogTitle>
            <DialogDescription>
              現在の設定内容がすべてデフォルト値に戻ります。この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowResetDialog(false)}
            >
              キャンセル
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmReset}
            >
              リセット実行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* トースト表示 */}
      <ToastContainer 
        toasts={toasts} 
        onRemoveToast={removeToast} 
      />
    </Dialog>
  )
}