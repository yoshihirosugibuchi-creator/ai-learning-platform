'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Edit, Save, X, Gift, Lightbulb } from 'lucide-react'

interface RewardCardData {
  id: string
  icon: string
  color: string
  title: string
  summary: string
  keyPoints: string[]
}

interface Theme {
  id: string
  genre_id: string
  title: string
  description: string
  display_order: number
  estimated_minutes: number
  reward_card_data: RewardCardData | null
}

interface ThemeEditModalProps {
  theme: Theme | null
  isOpen: boolean
  onClose: () => void
  onSave: (themeId: string, data: Partial<Theme>) => Promise<void>
  genreId?: string // 新規作成時のgenre_id
}

const rewardIconOptions = ['🎁', '⭐', '🎯', '💡', '🔥', '💎', '🎊', '🏆', '🎉', '🌟']

const rewardColorOptions = [
  { value: '#F59E0B', label: 'ゴールド', preview: 'bg-amber-500' },
  { value: '#EF4444', label: 'レッド', preview: 'bg-red-500' },
  { value: '#8B5CF6', label: 'パープル', preview: 'bg-violet-500' },
  { value: '#06B6D4', label: 'ブルー', preview: 'bg-cyan-500' },
  { value: '#10B981', label: 'グリーン', preview: 'bg-emerald-500' },
  { value: '#EC4899', label: 'ピンク', preview: 'bg-pink-500' }
]

export function ThemeEditModal({ theme, isOpen, onClose, onSave, genreId }: ThemeEditModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    estimated_minutes: 30,
    display_order: 1,
    reward_card_data: {
      id: '',
      icon: '🎁',
      color: '#F59E0B',
      title: '',
      summary: '',
      keyPoints: ['', '', '']
    }
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (theme) {
      setFormData({
        title: theme.title,
        description: theme.description,
        estimated_minutes: theme.estimated_minutes,
        display_order: theme.display_order,
        reward_card_data: theme.reward_card_data || {
          id: `reward_${Date.now()}`,
          icon: '🎁',
          color: '#F59E0B',
          title: `${theme.title}カード`,
          summary: `${theme.title}の学習内容をまとめたナレッジカードです。`,
          keyPoints: [
            '重要なポイント1',
            '重要なポイント2', 
            '重要なポイント3'
          ]
        }
      })
    }
  }, [theme])

  const handleSave = async () => {
    // 新規作成の場合はthemeがnullの可能性があるので、genreIdをチェック
    const isNewTheme = !theme || !theme.id || theme.id === ''
    
    if (isNewTheme && !genreId) {
      console.error('新規テーマ作成にはgenreIdが必要です')
      return
    }

    setSaving(true)
    try {
      // 空のキーポイントを除外
      const validKeyPoints = formData.reward_card_data.keyPoints.filter(point => point.trim())
      
      const saveData = {
        title: formData.title,
        description: formData.description,
        estimated_minutes: formData.estimated_minutes,
        display_order: formData.display_order,
        reward_card_data: {
          ...formData.reward_card_data,
          keyPoints: validKeyPoints
        },
        // 新規作成時はgenre_idを含める
        ...(isNewTheme && genreId ? { genre_id: genreId } : {})
      }
      
      await onSave(theme?.id || '', saveData)
      onClose()
    } catch (error) {
      console.error('Theme save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateKeyPoint = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      reward_card_data: {
        ...prev.reward_card_data,
        keyPoints: prev.reward_card_data.keyPoints.map((point, i) => 
          i === index ? value : point
        )
      }
    }))
  }

  const addKeyPoint = () => {
    if (formData.reward_card_data.keyPoints.length < 5) {
      setFormData(prev => ({
        ...prev,
        reward_card_data: {
          ...prev.reward_card_data,
          keyPoints: [...prev.reward_card_data.keyPoints, '']
        }
      }))
    }
  }

  const removeKeyPoint = (index: number) => {
    if (formData.reward_card_data.keyPoints.length > 1) {
      setFormData(prev => ({
        ...prev,
        reward_card_data: {
          ...prev.reward_card_data,
          keyPoints: prev.reward_card_data.keyPoints.filter((_, i) => i !== index)
        }
      }))
    }
  }

  // 新規作成の場合はthemeがnullでも表示する
  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="h-5 w-5 mr-2" />
            {theme ? `テーマ編集: ${theme.title}` : 'テーマ新規作成'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">テーマ名</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="テーマ名を入力..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">説明</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="テーマの説明を入力..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">予想時間（分）</label>
                <Input
                  type="number"
                  min="5"
                  max="180"
                  value={formData.estimated_minutes}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    estimated_minutes: parseInt(e.target.value) || 30 
                  }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">表示順序</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    display_order: parseInt(e.target.value) || 1 
                  }))}
                />
              </div>
            </div>
          </div>

          {/* ナレッジカード編集 */}
          <div className="border-t pt-6">
            <h3 className="font-medium mb-4 flex items-center">
              <Gift className="h-4 w-4 mr-2" />
              ナレッジカード設定
            </h3>

            <div className="space-y-4">
              {/* カードプレビュー */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div 
                  className="p-3 rounded-lg text-white"
                  style={{ backgroundColor: formData.reward_card_data.color }}
                >
                  <div className="flex items-center mb-2">
                    <span className="text-xl mr-2">{formData.reward_card_data.icon}</span>
                    <h4 className="font-bold">{formData.reward_card_data.title}</h4>
                  </div>
                  <p className="text-sm opacity-90 mb-2">{formData.reward_card_data.summary}</p>
                  {formData.reward_card_data.keyPoints.filter(p => p.trim()).length > 0 && (
                    <ul className="text-xs space-y-1">
                      {formData.reward_card_data.keyPoints
                        .filter(point => point.trim())
                        .map((point, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-1">•</span>
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">カードタイトル</label>
                <Input
                  value={formData.reward_card_data.title}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    reward_card_data: { ...prev.reward_card_data, title: e.target.value }
                  }))}
                  placeholder="カードタイトル..."
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">概要</label>
                <Textarea
                  value={formData.reward_card_data.summary}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    reward_card_data: { ...prev.reward_card_data, summary: e.target.value }
                  }))}
                  placeholder="カードの概要..."
                  rows={2}
                />
              </div>

              {/* キーポイント */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">キーポイント</label>
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={addKeyPoint}
                    disabled={formData.reward_card_data.keyPoints.length >= 5}
                  >
                    <Lightbulb className="h-3 w-3 mr-1" />
                    追加
                  </Button>
                </div>
                
                <div className="space-y-2">
                  {formData.reward_card_data.keyPoints.map((point, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={point}
                        onChange={(e) => updateKeyPoint(index, e.target.value)}
                        placeholder={`キーポイント ${index + 1}`}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeKeyPoint(index)}
                        disabled={formData.reward_card_data.keyPoints.length <= 1}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* アイコン選択 */}
              <div>
                <label className="text-sm font-medium mb-2 block">カードアイコン</label>
                <div className="grid grid-cols-5 gap-2">
                  {rewardIconOptions.map(icon => (
                    <button
                      key={icon}
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        reward_card_data: { ...prev.reward_card_data, icon }
                      }))}
                      className={`p-2 text-lg rounded border-2 hover:bg-muted transition-colors ${
                        formData.reward_card_data.icon === icon 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-border'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              {/* カラー選択 */}
              <div>
                <label className="text-sm font-medium mb-2 block">カードカラー</label>
                <div className="grid grid-cols-3 gap-2">
                  {rewardColorOptions.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        reward_card_data: { ...prev.reward_card_data, color: color.value }
                      }))}
                      className={`p-2 rounded border-2 hover:bg-muted transition-colors flex items-center space-x-2 ${
                        formData.reward_card_data.color === color.value 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-border'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded ${color.preview}`}></div>
                      <span className="text-xs">{color.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}