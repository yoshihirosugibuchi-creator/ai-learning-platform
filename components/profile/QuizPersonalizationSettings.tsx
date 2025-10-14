'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Settings, Save, RotateCcw } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { 
  getUserQuizSettings, 
  saveUserQuizSettings, 
  getDefaultQuizSettings,
  type QuizPersonalizationSettings 
} from '@/lib/user-quiz-settings'
import { getCategories } from '@/lib/categories'

const learningLevels = [
  { value: 'basic', label: '初級（基本レベル）' },
  { value: 'intermediate', label: '中級（実践レベル）' },
  { value: 'advanced', label: '上級（応用レベル）' },
  { value: 'expert', label: 'エキスパート（専門レベル）' }
] as const

export default function QuizPersonalizationSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<QuizPersonalizationSettings | null>(null)
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: 'basic' | 'industry' }>>([])
  const [_subcategories, setSubcategories] = useState<Array<{ id: string; name: string; categoryId: string }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      if (!user) return

      try {
        // 設定とカテゴリーデータを並行取得
        const [userSettings, categoriesData] = await Promise.all([
          getUserQuizSettings(user.id),
          getCategories()
        ])

        setSettings(userSettings)
        
        // カテゴリーデータを基本/業界に分類
        // MainCategoryは基本、IndustryCategoryは業界として扱う
        const basicCategories = categoriesData
          .filter(cat => 'type' in cat && cat.type === 'main')
          .map(cat => ({ id: cat.id, name: cat.name, type: 'basic' as const }))
        
        const industryCategories = categoriesData
          .filter(cat => 'type' in cat && cat.type === 'industry')
          .map(cat => ({ id: cat.id, name: cat.name, type: 'industry' as const }))

        setCategories([...basicCategories, ...industryCategories])

        // サブカテゴリーデータを準備（将来の実装用）
        // TODO: サブカテゴリーAPIが実装されたら更新
        setSubcategories([])

      } catch (error) {
        console.error('設定データの読み込みに失敗:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user])

  const handleLearningLevelChange = (value: string) => {
    if (!settings) return
    setSettings({
      ...settings,
      learningLevel: value as QuizPersonalizationSettings['learningLevel']
    })
  }

  const handleBasicCategoryToggle = (categoryId: string, checked: boolean) => {
    if (!settings) return
    
    const newCategories = checked
      ? [...settings.basicCategories, categoryId]
      : settings.basicCategories.filter(id => id !== categoryId)
    
    setSettings({
      ...settings,
      basicCategories: newCategories
    })
  }

  const handleIndustryCategoryToggle = (categoryId: string, checked: boolean) => {
    if (!settings) return
    
    const newCategories = checked
      ? [...settings.industryCategories, categoryId]
      : settings.industryCategories.filter(id => id !== categoryId)
    
    setSettings({
      ...settings,
      industryCategories: newCategories
    })
  }

  const handleSave = async () => {
    if (!user || !settings) return

    setSaving(true)
    try {
      const result = await saveUserQuizSettings(user.id, settings)
      if (result.success) {
        alert('設定を保存しました。')
      } else {
        alert('設定の保存に失敗しました: ' + result.error)
      }
    } catch (error) {
      console.error('設定保存エラー:', error)
      alert('設定の保存中にエラーが発生しました。')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (confirm('設定をデフォルトに戻しますか？')) {
      setSettings(getDefaultQuizSettings())
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            クイズパーソナライズ設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            設定を読み込んでいます...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            クイズパーソナライズ設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            設定の読み込みに失敗しました。
          </div>
        </CardContent>
      </Card>
    )
  }

  const basicCategoriesData = categories.filter(cat => cat.type === 'basic')
  const industryCategoriesData = categories.filter(cat => cat.type === 'industry')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          セルフパーソナライズクイズ設定
        </CardTitle>
        <CardDescription>
          お好みの学習レベルとカテゴリーを選択して、パーソナライズされたクイズ体験をお楽しみください。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 学習レベル選択 */}
        <div className="space-y-2">
          <Label htmlFor="learning-level">学習レベル</Label>
          <Select value={settings.learningLevel} onValueChange={handleLearningLevelChange}>
            <SelectTrigger>
              <SelectValue placeholder="学習レベルを選択" />
            </SelectTrigger>
            <SelectContent>
              {learningLevels.map(level => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            選択したレベル以上の難易度の問題が出題されます。
          </p>
        </div>

        {/* 基本カテゴリー選択 */}
        <div className="space-y-3">
          <Label>基本ビジネススキルカテゴリー</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {basicCategoriesData.map(category => (
              <div key={category.id} className="flex items-center space-x-2">
                <Switch
                  checked={settings.basicCategories.includes(category.id)}
                  onCheckedChange={(checked: boolean) => 
                    handleBasicCategoryToggle(category.id, checked)
                  }
                />
                <Label 
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  onClick={() => handleBasicCategoryToggle(category.id, !settings.basicCategories.includes(category.id))}
                >
                  {category.name}
                </Label>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">選択中:</span>
            <Badge variant="secondary">{settings.basicCategories.length}カテゴリー</Badge>
          </div>
        </div>

        {/* 業界カテゴリー選択 */}
        <div className="space-y-3">
          <Label>業界専門カテゴリー（オプション）</Label>
          {industryCategoriesData.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {industryCategoriesData.map(category => (
                  <div key={category.id} className="flex items-center space-x-2">
                    <Switch
                      checked={settings.industryCategories.includes(category.id)}
                      onCheckedChange={(checked: boolean) => 
                        handleIndustryCategoryToggle(category.id, checked)
                      }
                    />
                    <Label 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      onClick={() => handleIndustryCategoryToggle(category.id, !settings.industryCategories.includes(category.id))}
                    >
                      {category.name}
                    </Label>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">選択中:</span>
                <Badge variant="secondary">{settings.industryCategories.length}カテゴリー</Badge>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              業界専門カテゴリーは現在準備中です。
            </p>
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? '保存中...' : '設定を保存'}
          </Button>
          <Button 
            variant="outline" 
            onClick={handleReset}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            デフォルトに戻す
          </Button>
        </div>

        {/* 設定確認 */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">現在の設定</h4>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>学習レベル: {learningLevels.find(l => l.value === settings.learningLevel)?.label}</p>
            <p>基本カテゴリー: {settings.basicCategories.length}個選択</p>
            <p>業界カテゴリー: {settings.industryCategories.length}個選択</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}