'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/hooks/use-toast'
import PermissionGuard from '@/components/auth/PermissionGuard'
import {
  Settings,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Percent
} from 'lucide-react'

interface DifficultyDistribution {
  id: string
  accuracy_range_min: number
  accuracy_range_max: number
  basic_percent: number
  intermediate_percent: number
  advanced_percent: number
  expert_percent: number
  description: string | null
  is_active: boolean | null
  updated_at: string | null
}

export default function DifficultySettingsPage() {
  return (
    <PermissionGuard requiredRole="admin">
      <DifficultySettingsContent />
    </PermissionGuard>
  )
}

function DifficultySettingsContent() {
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()
  const [settings, setSettings] = useState<DifficultyDistribution[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [editedIds, setEditedIds] = useState<Set<string>>(new Set())

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()

      if (!session?.access_token) {
        toast({
          title: 'Error',
          description: '認証トークンが取得できません',
          variant: 'destructive'
        })
        return
      }

      const response = await fetch('/api/admin/difficulty-settings', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load settings')
      }

      setSettings(result.data || [])
      setEditedIds(new Set())
      toast({
        title: 'Success',
        description: `${result.count}件の設定を読み込みました`
      })
    } catch (error) {
      console.error('Failed to load settings:', error)
      toast({
        title: 'Error',
        description: `設定の読み込みに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const updateSetting = (id: string, field: keyof DifficultyDistribution, value: number | boolean | string) => {
    setSettings(prev => prev.map(s => {
      if (s.id === id) {
        return { ...s, [field]: value }
      }
      return s
    }))
    setEditedIds(prev => new Set([...prev, id]))
  }

  const saveSetting = async (setting: DifficultyDistribution) => {
    setSaving(setting.id)
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()

      if (!session?.access_token) {
        toast({
          title: 'Error',
          description: '認証トークンが取得できません',
          variant: 'destructive'
        })
        return
      }

      // パーセンテージ合計チェック
      const total = setting.basic_percent + setting.intermediate_percent +
        setting.advanced_percent + setting.expert_percent
      if (total !== 100) {
        toast({
          title: 'Error',
          description: `パーセンテージの合計が100になる必要があります（現在: ${total}%）`,
          variant: 'destructive'
        })
        return
      }

      const response = await fetch('/api/admin/difficulty-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id: setting.id,
          basic_percent: setting.basic_percent,
          intermediate_percent: setting.intermediate_percent,
          advanced_percent: setting.advanced_percent,
          expert_percent: setting.expert_percent,
          description: setting.description,
          is_active: setting.is_active
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save settings')
      }

      setEditedIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(setting.id)
        return newSet
      })

      toast({
        title: 'Success',
        description: `正答率 ${setting.accuracy_range_min}%-${setting.accuracy_range_max}% の設定を保存しました`
      })
    } catch (error) {
      console.error('Failed to save setting:', error)
      toast({
        title: 'Error',
        description: `設定の保存に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      })
    } finally {
      setSaving(null)
    }
  }

  useEffect(() => {
    if (user && !authLoading) {
      loadSettings()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading])

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

  const getPercentTotal = (s: DifficultyDistribution) =>
    s.basic_percent + s.intermediate_percent + s.advanced_percent + s.expert_percent

  return (
    <div className="space-y-6 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center">
          <BarChart3 className="h-6 w-6 mr-2 text-blue-600" />
          難易度分布設定
        </h1>
        <p className="text-gray-600">
          ユーザーの正答率に応じた問題難易度の出題比率を管理します。
          各行のパーセンテージの合計は100%になる必要があります。
        </p>
      </div>

      {/* 操作ボタン */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Button
              onClick={loadSettings}
              disabled={loading}
              variant="outline"
              className="flex items-center"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? '読み込み中...' : '再読み込み'}
            </Button>

            {editedIds.size > 0 && (
              <Badge variant="secondary" className="px-3 py-1">
                {editedIds.size}件の未保存変更
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 設定一覧 */}
      <div className="space-y-4">
        {settings.map((setting) => {
          const isEdited = editedIds.has(setting.id)
          const total = getPercentTotal(setting)
          const isValid = total === 100

          return (
            <Card
              key={setting.id}
              className={`${isEdited ? 'border-orange-300 bg-orange-50' : ''} ${!setting.is_active ? 'opacity-60' : ''}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-lg">
                  <div className="flex items-center gap-3">
                    <Percent className="h-5 w-5 text-blue-600" />
                    <span>正答率 {setting.accuracy_range_min}% - {setting.accuracy_range_max}%</span>
                    {isEdited && <Badge variant="outline" className="bg-orange-100">変更済み</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-sm font-normal">
                      有効
                    </Label>
                    <Switch
                      checked={setting.is_active || false}
                      onCheckedChange={(checked) => updateSetting(setting.id, 'is_active', checked)}
                    />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div>
                    <Label htmlFor={`basic-${setting.id}`} className="text-sm">
                      初級 (Basic)
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id={`basic-${setting.id}`}
                        type="number"
                        min="0"
                        max="100"
                        value={setting.basic_percent}
                        onChange={(e) => updateSetting(setting.id, 'basic_percent', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                      <span className="text-gray-500">%</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`intermediate-${setting.id}`} className="text-sm">
                      中級 (Intermediate)
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id={`intermediate-${setting.id}`}
                        type="number"
                        min="0"
                        max="100"
                        value={setting.intermediate_percent}
                        onChange={(e) => updateSetting(setting.id, 'intermediate_percent', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                      <span className="text-gray-500">%</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`advanced-${setting.id}`} className="text-sm">
                      上級 (Advanced)
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id={`advanced-${setting.id}`}
                        type="number"
                        min="0"
                        max="100"
                        value={setting.advanced_percent}
                        onChange={(e) => updateSetting(setting.id, 'advanced_percent', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                      <span className="text-gray-500">%</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`expert-${setting.id}`} className="text-sm">
                      エキスパート (Expert)
                    </Label>
                    <div className="flex items-center gap-1">
                      <Input
                        id={`expert-${setting.id}`}
                        type="number"
                        min="0"
                        max="100"
                        value={setting.expert_percent}
                        onChange={(e) => updateSetting(setting.id, 'expert_percent', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                      <span className="text-gray-500">%</span>
                    </div>
                  </div>

                  <div className="flex items-end">
                    <div className={`text-sm font-medium ${isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {isValid ? (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          合計: {total}%
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" />
                          合計: {total}% (要100%)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 分布バー */}
                <div className="h-6 w-full rounded-full overflow-hidden flex mb-4">
                  <div
                    className="bg-green-400 flex items-center justify-center text-xs text-white font-medium"
                    style={{ width: `${setting.basic_percent}%` }}
                  >
                    {setting.basic_percent > 10 && `${setting.basic_percent}%`}
                  </div>
                  <div
                    className="bg-blue-400 flex items-center justify-center text-xs text-white font-medium"
                    style={{ width: `${setting.intermediate_percent}%` }}
                  >
                    {setting.intermediate_percent > 10 && `${setting.intermediate_percent}%`}
                  </div>
                  <div
                    className="bg-orange-400 flex items-center justify-center text-xs text-white font-medium"
                    style={{ width: `${setting.advanced_percent}%` }}
                  >
                    {setting.advanced_percent > 10 && `${setting.advanced_percent}%`}
                  </div>
                  <div
                    className="bg-red-400 flex items-center justify-center text-xs text-white font-medium"
                    style={{ width: `${setting.expert_percent}%` }}
                  >
                    {setting.expert_percent > 10 && `${setting.expert_percent}%`}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-green-400" /> 初級
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-blue-400" /> 中級
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-orange-400" /> 上級
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded bg-red-400" /> エキスパート
                    </span>
                  </div>

                  <Button
                    onClick={() => saveSetting(setting)}
                    disabled={!isEdited || !isValid || saving === setting.id}
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    <Save className="h-4 w-4" />
                    {saving === setting.id ? '保存中...' : '保存'}
                  </Button>
                </div>

                {setting.updated_at && (
                  <p className="text-xs text-gray-400 mt-2">
                    最終更新: {new Date(setting.updated_at).toLocaleString('ja-JP')}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}

        {settings.length === 0 && !loading && (
          <Card>
            <CardContent className="py-8 text-center">
              <Settings className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">設定データがありません</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
