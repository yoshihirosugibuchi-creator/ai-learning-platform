'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/auth/AuthProvider'
import { 
  Settings, 
  Save, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Trophy,
  Zap,
  Star,
  Target
} from 'lucide-react'

interface XPSetting {
  id?: number
  setting_category: string
  setting_key: string
  setting_value: number
  setting_description: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

interface OrganizedSettings {
  xp_quiz: XPSetting[]
  xp_course: XPSetting[]
  xp_bonus: XPSetting[]
  level: XPSetting[]
  skp: XPSetting[]
}

export default function XPSettingsPage() {
  const { user, loading: authLoading } = useAuth()
  const [settings, setSettings] = useState<OrganizedSettings>({
    xp_quiz: [],
    xp_course: [],
    xp_bonus: [],
    level: [],
    skp: []
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', content: string } | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Set<string>>(new Set())

  // 設定を読み込み
  const loadSettings = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      
      if (!session?.access_token) {
        setMessage({ type: 'error', content: '認証トークンが取得できません' })
        return
      }

      const response = await fetch('/api/admin/xp-settings', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to load settings')
      }

      setSettings(result.settings)
      setPendingChanges(new Set())
      setMessage({ type: 'success', content: `${result.total}件の設定を読み込みました` })
      
    } catch (error) {
      console.error('Failed to load XP settings:', error)
      setMessage({ 
        type: 'error', 
        content: `設定の読み込みに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setLoading(false)
    }
  }

  // 設定値を更新
  const updateSetting = (category: keyof OrganizedSettings, index: number, field: keyof XPSetting, value: string | number | boolean) => {
    const updatedSettings = { ...settings }
    // Setting key structure: {category}.{index}.{field}
    
    updatedSettings[category][index] = {
      ...updatedSettings[category][index],
      [field]: value
    }
    
    setSettings(updatedSettings)
    
    // 変更フラグを設定
    const changeKey = `${updatedSettings[category][index].setting_category}.${updatedSettings[category][index].setting_key}`
    setPendingChanges(new Set([...pendingChanges, changeKey]))
  }

  // 設定を保存
  const saveSettings = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      
      if (!session?.access_token) {
        setMessage({ type: 'error', content: '認証トークンが取得できません' })
        return
      }

      // 変更された設定のみを抽出
      const changedSettings: XPSetting[] = []
      Object.entries(settings).forEach(([_category, categorySettings]) => {
        categorySettings.forEach((setting: XPSetting) => {
          const changeKey = `${setting.setting_category}.${setting.setting_key}`
          if (pendingChanges.has(changeKey)) {
            changedSettings.push(setting)
          }
        })
      })

      if (changedSettings.length === 0) {
        setMessage({ type: 'success', content: '変更はありません' })
        return
      }

      const response = await fetch('/api/admin/xp-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          settings: changedSettings
        })
      })
      
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to save settings')
      }

      setPendingChanges(new Set())
      setMessage({ 
        type: 'success', 
        content: `${result.updated_count}件の設定を保存しました` 
      })
      
    } catch (error) {
      console.error('Failed to save XP settings:', error)
      setMessage({ 
        type: 'error', 
        content: `設定の保存に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setSaving(false)
    }
  }

  // コンポーネントマウント時に設定を読み込み
  useEffect(() => {
    if (user && !authLoading) {
      loadSettings()
    }
  }, [user, authLoading])

  // メッセージを自動クリア
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        setMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  if (authLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse text-center">認証状態を確認中...</div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-gray-500">管理者ツールを使用するにはログインが必要です。</p>
        </CardContent>
      </Card>
    )
  }

  const renderSettingsSection = (
    categorySettings: XPSetting[], 
    category: keyof OrganizedSettings,
    title: string,
    icon: React.ReactNode,
    description: string
  ) => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <p className="text-sm text-gray-600">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categorySettings.map((setting, index) => {
            const changeKey = `${setting.setting_category}.${setting.setting_key}`
            const hasChanges = pendingChanges.has(changeKey)
            
            return (
              <div key={`${setting.setting_category}-${setting.setting_key}`} 
                   className={`p-4 border rounded-lg ${hasChanges ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor={`${category}-${index}-key`}>設定キー</Label>
                    <Input
                      id={`${category}-${index}-key`}
                      value={setting.setting_key}
                      readOnly
                      className="bg-gray-100"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`${category}-${index}-value`}>
                      設定値
                      {hasChanges && <Badge variant="outline" className="ml-2">変更済み</Badge>}
                    </Label>
                    <Input
                      id={`${category}-${index}-value`}
                      type="number"
                      min="0"
                      value={setting.setting_value}
                      onChange={(e) => updateSetting(category, index, 'setting_value', parseInt(e.target.value) || 0)}
                      className={hasChanges ? 'border-orange-300' : ''}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <Label htmlFor={`${category}-${index}-description`}>説明</Label>
                    <Textarea
                      id={`${category}-${index}-description`}
                      value={setting.setting_description}
                      onChange={(e) => updateSetting(category, index, 'setting_description', e.target.value)}
                      rows={2}
                      className={hasChanges ? 'border-orange-300' : ''}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center">
          <Settings className="h-6 w-6 mr-2 text-blue-600" />
          XP設定管理
        </h1>
        <p className="text-gray-600">
          クイズ・コース学習・レベル・SKPに関する設定値を管理します。
        </p>
      </div>

      {/* メッセージ表示 */}
      {message && (
        <Card className={message.type === 'error' ? 'border-red-300 bg-red-50' : 'border-green-300 bg-green-50'}>
          <CardContent className="py-4">
            <div className="flex items-center gap-2">
              {message.type === 'error' ? (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              <span className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
                {message.content}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 操作ボタン */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={saveSettings}
              disabled={saving || pendingChanges.size === 0}
              className="flex items-center"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : `変更を保存 (${pendingChanges.size}件)`}
            </Button>
            
            <Button 
              onClick={loadSettings}
              disabled={loading || saving}
              variant="outline"
              className="flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? '読み込み中...' : '再読み込み'}
            </Button>

            {pendingChanges.size > 0 && (
              <Badge variant="secondary" className="px-3 py-1">
                {pendingChanges.size}件の未保存変更
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 設定タブ */}
      <Tabs defaultValue="xp_quiz" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="xp_quiz">クイズXP</TabsTrigger>
          <TabsTrigger value="xp_course">コースXP</TabsTrigger>
          <TabsTrigger value="xp_bonus">ボーナスXP</TabsTrigger>
          <TabsTrigger value="level">レベル設定</TabsTrigger>
          <TabsTrigger value="skp">SKP設定</TabsTrigger>
        </TabsList>

        <TabsContent value="xp_quiz">
          {renderSettingsSection(
            settings.xp_quiz, 
            'xp_quiz',
            'クイズXP設定',
            <Trophy className="h-5 w-5 text-yellow-600" />,
            'クイズの難易度別XP獲得量を設定します'
          )}
        </TabsContent>

        <TabsContent value="xp_course">
          {renderSettingsSection(
            settings.xp_course, 
            'xp_course',
            'コース学習XP設定',
            <Target className="h-5 w-5 text-green-600" />,
            'コース学習の難易度別XP獲得量を設定します'
          )}
        </TabsContent>

        <TabsContent value="xp_bonus">
          {renderSettingsSection(
            settings.xp_bonus, 
            'xp_bonus',
            'ボーナスXP設定',
            <Star className="h-5 w-5 text-purple-600" />,
            '精度ボーナスやコース完了ボーナスのXP量を設定します'
          )}
        </TabsContent>

        <TabsContent value="level">
          {renderSettingsSection(
            settings.level, 
            'level',
            'レベル閾値設定',
            <Trophy className="h-5 w-5 text-blue-600" />,
            'レベルアップに必要なXP量を設定します'
          )}
        </TabsContent>

        <TabsContent value="skp">
          {renderSettingsSection(
            settings.skp, 
            'skp',
            'SKP設定',
            <Zap className="h-5 w-5 text-orange-600" />,
            'スキルポイント(SKP)の獲得量を設定します'
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}