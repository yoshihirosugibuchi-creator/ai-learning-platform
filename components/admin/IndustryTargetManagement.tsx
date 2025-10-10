'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { SimpleSelect, SimpleSelectItem } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  updateIndustryLevelTarget, 
  type IndustryLevelTarget 
} from '@/lib/industry-xp-analytics'
import { industryCategories } from '@/lib/categories'
import { 
  Settings, 
  Save, 
  RefreshCw, 
  AlertCircle, 
  Target, 
  Building2,
  TrendingUp
} from 'lucide-react'

interface EditableTarget extends IndustryLevelTarget {
  hasChanges?: boolean
}

export default function IndustryTargetManagement() {
  // 業界選択肢を取得
  const availableIndustries = industryCategories.filter(cat => cat.isVisible !== false)
  
  const [selectedIndustry, setSelectedIndustry] = useState<string>(availableIndustries.length > 0 ? availableIndustries[0].id : '')
  const [selectedLevel, setSelectedLevel] = useState<'basic' | 'intermediate' | 'advanced' | 'expert'>('basic')
  const [targets, setTargets] = useState<EditableTarget[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // データ読み込み
  const loadTargets = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('📋 Loading targets via API...', { selectedIndustry, selectedLevel })
      
      // 認証トークン取得
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です。ログインしてください。')
      }
      
      // APIエンドポイント経由でデータ取得
      const params = new URLSearchParams()
      if (selectedIndustry) params.append('industryId', selectedIndustry)
      if (selectedLevel) params.append('level', selectedLevel)
      
      const response = await fetch(`/api/admin/industry-targets?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'API request failed')
      }

      const editableData = result.targets.map((target: IndustryLevelTarget) => ({
        ...target,
        hasChanges: false
      }))

      setTargets(editableData)
      console.log('✅ Targets loaded via API:', result.targets.length)

    } catch (err) {
      console.error('❌ Error loading targets:', err)
      setError(err instanceof Error ? err.message : '目標データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [selectedIndustry, selectedLevel])

  // 初期読み込み
  useEffect(() => {
    if (selectedIndustry && selectedLevel) {
      loadTargets()
    }
  }, [selectedIndustry, selectedLevel, loadTargets])

  // ターゲット更新
  const updateTarget = (targetId: string, field: keyof IndustryLevelTarget, value: string | number | boolean) => {
    setTargets(prev => prev.map(target => {
      if (target.id === targetId) {
        const updated = { ...target, [field]: value, hasChanges: true }
        
        // 重要度が変更された場合、目標XPを自動更新
        if (field === 'importance_weight' && typeof value === 'number') {
          const baseXP = getBaseXPForLevel(target.level)
          updated.target_xp = Math.round(baseXP * value)
        }
        
        return updated
      }
      return target
    }))
  }

  // レベル別基準XP値を取得
  const getBaseXPForLevel = (level: string): number => {
    switch (level) {
      case 'basic': return 100
      case 'intermediate': return 300
      case 'advanced': return 500
      case 'expert': return 800
      default: return 100
    }
  }

  // 編集モード切り替え（削除 - 常に編集可能にする）

  // 変更を保存
  const _saveTarget = async (target: EditableTarget) => {
    setSaving(true)
    setError(null)

    try {
      const success = await updateIndustryLevelTarget(target.id, {
        target_xp: target.target_xp,
        importance_weight: target.importance_weight,
        display_in_radar: target.display_in_radar
      })

      if (success) {
        setTargets(prev => prev.map(t => 
          t.id === target.id 
            ? { ...t, hasChanges: false }
            : t
        ))
        setSuccessMessage('目標設定を更新しました')
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        throw new Error('更新に失敗しました')
      }

    } catch (err) {
      console.error('❌ Error saving target:', err)
      setError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // 全て保存
  const saveAllChanges = async () => {
    const changedTargets = targets.filter(t => t.hasChanges)
    if (changedTargets.length === 0) return

    setSaving(true)
    setError(null)

    try {
      const promises = changedTargets.map(target => 
        updateIndustryLevelTarget(target.id, {
          target_xp: target.target_xp,
          importance_weight: target.importance_weight,
          display_in_radar: target.display_in_radar
        })
      )

      const results = await Promise.all(promises)
      const successCount = results.filter(Boolean).length

      if (successCount === changedTargets.length) {
        setTargets(prev => prev.map(t => ({ ...t, hasChanges: false })))
        setSuccessMessage(`${successCount}件の目標設定を更新しました`)
        setTimeout(() => setSuccessMessage(null), 3000)
      } else {
        throw new Error(`${successCount}/${changedTargets.length}件の更新が成功しました`)
      }

    } catch (err) {
      console.error('❌ Error saving all changes:', err)
      setError(err instanceof Error ? err.message : '一括保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  // 重要度に基づいてXPを一括再計算
  const recalculateAllXP = () => {
    setTargets(prev => prev.map(target => ({
      ...target,
      target_xp: Math.round(getBaseXPForLevel(target.level) * target.importance_weight),
      hasChanges: true
    })))
    setSuccessMessage('重要度に基づいて全ての目標XPを再計算しました')
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  // レーダーチャート表示対象の管理
  const radarDisplayCount = targets.filter(t => t.display_in_radar).length
  const canAddRadarDisplay = radarDisplayCount < 10

  // 統計情報
  const totalTargets = targets.length
  const changedCount = targets.filter(t => t.hasChanges).length
  const averageTarget = targets.length > 0 
    ? Math.round(targets.reduce((sum, t) => sum + t.target_xp, 0) / targets.length)
    : 0
  const totalTargetXP = targets.reduce((sum, t) => sum + t.target_xp, 0)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center space-x-2">
            <Settings className="h-6 w-6" />
            <span>業界目標管理</span>
          </h1>
          <p className="text-gray-600 mt-1">業界レベル別の目標XP設定を管理します</p>
        </div>

        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          {targets.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={recalculateAllXP}
              disabled={saving}
              className="bg-blue-50 hover:bg-blue-100 border-blue-200"
            >
              <Target className="h-4 w-4 mr-2" />
              XP再計算
            </Button>
          )}
          {changedCount > 0 && (
            <Button
              onClick={saveAllChanges}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              全て保存 ({changedCount})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadTargets}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            更新
          </Button>
        </div>
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>フィルター設定</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">業界選択</label>
              <SimpleSelect value={selectedIndustry} onValueChange={setSelectedIndustry} className="w-full">
                {availableIndustries.map((industry) => (
                  <SimpleSelectItem key={industry.id} value={industry.id}>
                    {industry.icon} {industry.name}
                  </SimpleSelectItem>
                ))}
              </SimpleSelect>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">レベル選択</label>
              <SimpleSelect 
                value={selectedLevel} 
                onValueChange={(value) => setSelectedLevel(value as typeof selectedLevel)} 
                className="w-full"
              >
                <SimpleSelectItem value="basic">🌱 Basic (基礎)</SimpleSelectItem>
                <SimpleSelectItem value="intermediate">📈 Intermediate (中級)</SimpleSelectItem>
                <SimpleSelectItem value="advanced">🎯 Advanced (上級)</SimpleSelectItem>
                <SimpleSelectItem value="expert">👑 Expert (専門家)</SimpleSelectItem>
              </SimpleSelect>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* メッセージ */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert>
          <TrendingUp className="h-4 w-4" />
          <AlertDescription className="text-green-700">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* 統計情報 */}
      {targets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{totalTargets}</div>
              <div className="text-sm text-gray-600">総項目数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{changedCount}</div>
              <div className="text-sm text-gray-600">未保存変更</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{radarDisplayCount}/10</div>
              <div className="text-sm text-gray-600">レーダー表示</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{averageTarget}</div>
              <div className="text-sm text-gray-600">平均目標XP</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{totalTargetXP.toLocaleString()}</div>
              <div className="text-sm text-gray-600">目標総XP</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ターゲット一覧 */}
      {loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
            <p>目標データを読み込んでいます...</p>
          </CardContent>
        </Card>
      )}

      {!loading && targets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>目標設定一覧</span>
              <Badge variant="outline">{targets.length}項目</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* レーダー表示情報 */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">レーダーチャート表示設定</span>
              </div>
              <div className="text-sm text-blue-700">
                現在の表示数: <span className="font-semibold">{targets.filter(t => t.display_in_radar).length}/10項目</span>
                <span className="ml-2 text-blue-600">(レーダーチャートの分母は最大10項目です)</span>
              </div>
            </div>

            {/* 一括編集テーブル */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                      サブカテゴリー
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                      目標XP
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-left text-sm font-medium text-gray-900">
                      重要度
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-900">
                      レーダー表示
                    </th>
                    <th className="border border-gray-200 px-4 py-3 text-center text-sm font-medium text-gray-900">
                      状態
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {targets.map((target) => (
                    <tr
                      key={target.id}
                      className={`${
                        target.hasChanges ? 'bg-orange-50' : 'bg-white'
                      } hover:bg-gray-50`}
                    >
                      <td className="border border-gray-200 px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {target.subcategory_name || target.subcategory_id}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          ID: {target.subcategory_id}
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {target.target_xp.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          基準: {getBaseXPForLevel(target.level)} × {target.importance_weight} = {target.target_xp}
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-3">
                        <Input
                          type="number"
                          value={target.importance_weight}
                          onChange={(e) => updateTarget(target.id, 'importance_weight', parseFloat(e.target.value) || 1.0)}
                          min="0.1"
                          max="5.0"
                          step="0.1"
                          className="w-20"
                        />
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center">
                        <div className="flex items-center justify-center">
                          <Switch
                            checked={target.display_in_radar}
                            onCheckedChange={(checked) => {
                              if (checked && !canAddRadarDisplay) {
                                setError('レーダーチャート表示は最大10項目までです')
                                setTimeout(() => setError(null), 3000)
                                return
                              }
                              updateTarget(target.id, 'display_in_radar', checked)
                            }}
                            disabled={(!target.display_in_radar && !canAddRadarDisplay)}
                          />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {target.display_in_radar ? '表示中' : '非表示'}
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center">
                        {target.hasChanges ? (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            未保存
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            保存済み
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && targets.length === 0 && selectedIndustry && (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">目標データがありません</h3>
            <p className="text-gray-600">
              選択した業界・レベルの目標設定データが見つかりません
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}