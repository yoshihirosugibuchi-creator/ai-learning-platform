'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
// Sliderコンポーネントが存在しないため、HTML range inputを使用
import { Switch } from '@/components/ui/switch'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { validateReviewQuestionsCount } from '@/lib/user-review-settings'
import { useToast } from '@/hooks/use-toast'
import { Bell, Target, Calendar, BookOpen, TrendingUp, AlertCircle } from 'lucide-react'

interface ReviewSettings {
  notificationEnabled: boolean
  notificationIntervalDays: number
  reviewQuestionsCount: number
  streakReminderEnabled: boolean
  weeklySummaryEnabled: boolean
  createdAt: string
  updatedAt: string
}

const DEFAULT_REVIEW_SETTINGS: ReviewSettings = {
  notificationEnabled: true,
  notificationIntervalDays: 1,
  reviewQuestionsCount: 10,
  streakReminderEnabled: true,
  weeklySummaryEnabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

interface ReviewSettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function ReviewSettingsModal({ isOpen, onClose }: ReviewSettingsModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  
  const [settings, setSettings] = useState<ReviewSettings>(DEFAULT_REVIEW_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  // 設定を読み込み
  useEffect(() => {
    const loadSettings = async () => {
      if (!isOpen || !user || loading) return
      
      setLoading(true)
      setErrors([])
      
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        
        if (!token) {
          throw new Error('認証トークンが見つかりません')
        }

        const response = await fetch('/api/review/settings', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setSettings(data.settings)
          } else {
            throw new Error(data.error || '設定の取得に失敗')
          }
        } else {
          throw new Error('API呼び出しに失敗')
        }
      } catch (error) {
        console.error('❌ Failed to load review settings:', error)
        setSettings(DEFAULT_REVIEW_SETTINGS)
        toast({
          title: '設定の読み込みに失敗しました',
          description: 'デフォルト設定を使用します',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
    
    if (!isOpen) {
      setLoading(false)
      setErrors([])
    }
  }, [isOpen, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // 設定の更新
  const handleSave = async () => {
    if (!user) return

    // バリデーション
    const validationErrors: string[] = []
    
    // 問題数のバリデーション
    const validatedCount = validateReviewQuestionsCount(settings.reviewQuestionsCount)
    if (validatedCount !== settings.reviewQuestionsCount) {
      validationErrors.push(`問題数は1〜30の範囲で入力してください（現在: ${settings.reviewQuestionsCount}）`)
    }
    
    // 通知間隔のバリデーション
    if (settings.notificationIntervalDays < 1 || settings.notificationIntervalDays > 7) {
      validationErrors.push(`通知間隔は1〜7日の範囲で入力してください（現在: ${settings.notificationIntervalDays}）`)
    }
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    setErrors([])

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      
      if (!token) {
        throw new Error('認証トークンが見つかりません')
      }

      const response = await fetch('/api/review/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast({
            title: '復習設定を更新しました',
            description: '新しい設定が適用されます',
            variant: 'default'
          })
          onClose()
        } else {
          throw new Error(data.error || '設定の更新に失敗')
        }
      } else {
        throw new Error('API呼び出しに失敗')
      }
    } catch (error) {
      console.error('Failed to update review settings:', error)
      toast({
        title: '設定の更新に失敗しました',
        description: error instanceof Error ? error.message : '不明なエラーが発生しました',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // 設定値の更新
  const updateSetting = <K extends keyof ReviewSettings>(
    key: K, 
    value: ReviewSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
    // エラーをクリア
    setErrors([])
  }

  // デフォルトにリセット
  const handleReset = () => {
    setSettings(DEFAULT_REVIEW_SETTINGS)
    setErrors([])
    toast({
      title: 'デフォルト設定に戻しました',
      description: '保存ボタンを押して適用してください',
      variant: 'default'
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-orange-500" />
            <span>復習通知設定</span>
          </DialogTitle>
          <DialogDescription>
            間違えた問題や回答に困った問題の復習設定を管理できます。
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-500">設定を読み込み中...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* エラー表示 */}
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* 復習問題数設定 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-blue-500" />
                <Label className="text-base font-semibold">復習問題数設定</Label>
              </div>
              
              <div className="space-y-4 pl-7">
                <div>
                  <Label htmlFor="review-count">
                    1回の復習で出題する問題数: {settings.reviewQuestionsCount}問
                  </Label>
                  <div className="mt-2">
                    <input
                      type="range"
                      id="review-count"
                      min={1}
                      max={30}
                      step={1}
                      value={settings.reviewQuestionsCount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetting('reviewQuestionsCount', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1問</span>
                      <span>15問</span>
                      <span>30問</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    推奨: 10〜15問（約10分）
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">💡 復習問題の選定基準</h4>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• 過去に間違えた問題</li>
                    <li>• ヒントLv2以上を使用した問題</li>
                    <li>• 自信レベル1-2で回答した問題</li>
                    <li>• 回答時間が長すぎた問題（制限時間の80%以上）</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 通知設定 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5 text-orange-500" />
                <Label className="text-base font-semibold">通知設定</Label>
              </div>

              <div className="space-y-4 pl-7">
                {/* 復習推奨通知 */}
                <div className="flex items-center justify-between py-3 px-4 bg-orange-50 rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <BookOpen className="h-4 w-4 text-orange-600" />
                      <h4 className="font-medium text-orange-900">復習推奨通知</h4>
                    </div>
                    <p className="text-sm text-orange-700 mt-1">
                      回答に困った問題や間違えた問題の復習通知
                    </p>
                  </div>
                  <Switch
                    checked={settings.notificationEnabled}
                    onCheckedChange={(checked) => updateSetting('notificationEnabled', checked)}
                  />
                </div>

                {/* 通知間隔設定 */}
                {settings.notificationEnabled && (
                  <div className="ml-4 space-y-3">
                    <div>
                      <Label htmlFor="notification-interval">
                        通知間隔: {settings.notificationIntervalDays}日ごと
                      </Label>
                      <div className="mt-2">
                        <input
                          type="range"
                          id="notification-interval"
                          min={1}
                          max={7}
                          step={1}
                          value={settings.notificationIntervalDays}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSetting('notificationIntervalDays', parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>毎日</span>
                          <span>4日ごと</span>
                          <span>週1回</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-orange-100 rounded">
                      <p className="text-xs text-orange-700">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {settings.notificationIntervalDays === 1 ? '毎日' : `${settings.notificationIntervalDays}日ごと`}に復習が必要な問題があるかチェックして通知します
                      </p>
                    </div>
                  </div>
                )}

                {/* 学習継続リマインダー */}
                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border opacity-60">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-gray-500" />
                      <h4 className="font-medium text-gray-700">学習継続リマインダー</h4>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">準備中</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      連続学習記録を維持するための通知（将来実装予定）
                    </p>
                  </div>
                  <Switch
                    checked={false}
                    disabled={true}
                    onCheckedChange={() => {}}
                  />
                </div>

                {/* 週次学習サマリー */}
                <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg border opacity-60">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-gray-500" />
                      <h4 className="font-medium text-gray-700">週次学習サマリー</h4>
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">準備中</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      学習進捗と成果の週次レポート（将来実装予定）
                    </p>
                  </div>
                  <Switch
                    checked={false}
                    disabled={true}
                    onCheckedChange={() => {}}
                  />
                </div>
              </div>
            </div>

            {/* 現在の設定サマリー */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-3">現在の設定サマリー</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">復習問題数:</span>
                  <span className="ml-2 font-medium">{settings.reviewQuestionsCount}問</span>
                </div>
                <div>
                  <span className="text-gray-600">復習通知:</span>
                  <span className="ml-2 font-medium">
                    {settings.notificationEnabled ? 
                      `${settings.notificationIntervalDays}日ごと` : 
                      '無効'
                    }
                  </span>
                </div>
              </div>
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                <span className="font-medium">注意:</span> 学習継続リマインダーと週次サマリーは将来実装予定の機能です
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={loading || saving}
            className="w-full sm:w-auto"
          >
            デフォルトに戻す
          </Button>
          <div className="flex space-x-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={onClose}
              disabled={saving}
              className="flex-1 sm:flex-none"
            >
              キャンセル
            </Button>
            <Button 
              onClick={handleSave}
              disabled={loading || saving}
              className="flex-1 sm:flex-none"
            >
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}