'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { X, Plus, AlertTriangle, CheckCircle } from 'lucide-react'

interface AddCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface CategoryFormData {
  category_id: string
  name: string
  description: string
  type: 'main' | 'industry'
  icon: string
  color: string
  is_active: boolean
  is_visible: boolean
}

const colorOptions = [
  { value: '#8B5CF6', label: '紫', preview: '#8B5CF6' },
  { value: '#3B82F6', label: '青', preview: '#3B82F6' },
  { value: '#10B981', label: '緑', preview: '#10B981' },
  { value: '#F59E0B', label: '橙', preview: '#F59E0B' },
  { value: '#EF4444', label: '赤', preview: '#EF4444' },
  { value: '#06B6D4', label: '水色', preview: '#06B6D4' },
  { value: '#84CC16', label: '黄緑', preview: '#84CC16' },
  { value: '#F97316', label: '濃橙', preview: '#F97316' },
  { value: '#DC2626', label: '濃赤', preview: '#DC2626' },
  { value: '#6B7280', label: 'グレー', preview: '#6B7280' }
]

const iconOptions = [
  '🧠', '💬', '🎯', '💰', '📈', '👥', '🤖', '📋', '🔄', '🛡️',
  '🎩', '🖥️', '🌐', '🏦', '🏭', '💻', '🏥', '🛍️', '🏗️', '⚡',
  '📚', '🎬', '🚛', '🏛️', '📊', '🔧', '🔍', '🎨', '🌟', '🚀'
]

export default function AddCategoryModal({ isOpen, onClose, onSuccess }: AddCategoryModalProps) {
  const [formData, setFormData] = useState<CategoryFormData>({
    category_id: '',
    name: '',
    description: '',
    type: 'main',
    icon: '📚',
    color: '#6B7280',
    is_active: false,
    is_visible: true
  })
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleInputChange = (field: keyof CategoryFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // category_idを自動生成
    if (field === 'name' && typeof value === 'string') {
      const autoId = value
        .toLowerCase()
        .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '')
        .replace(/\s+/g, '_')
        .replace(/[^\w]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
      
      setFormData(prev => ({
        ...prev,
        category_id: autoId
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/categories/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'カテゴリーが正常に作成されました' })
        setTimeout(() => {
          onSuccess()
          onClose()
          resetForm()
        }, 1500)
      } else {
        setMessage({ type: 'error', text: result.error || 'カテゴリーの作成に失敗しました' })
      }
    } catch (error) {
      console.error('カテゴリー作成エラー:', error)
      setMessage({ type: 'error', text: 'ネットワークエラーが発生しました' })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      category_id: '',
      name: '',
      description: '',
      type: 'main',
      icon: '📚',
      color: '#6B7280',
      is_active: false,
      is_visible: true
    })
    setMessage(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold flex items-center space-x-2">
            <Plus className="h-5 w-5" />
            <span>新しいカテゴリーを追加</span>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本情報 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">基本情報</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">カテゴリー名 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="例: データサイエンス"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category_id">カテゴリーID *</Label>
                  <Input
                    id="category_id"
                    value={formData.category_id}
                    onChange={(e) => handleInputChange('category_id', e.target.value)}
                    placeholder="例: data_science"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    英数字とアンダースコアのみ使用可能
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="このカテゴリーについての説明を入力してください"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">カテゴリータイプ *</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value as 'main' | 'industry')}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  required
                >
                  <option value="main">📊 メインカテゴリー</option>
                  <option value="industry">🏭 業界カテゴリー</option>
                </select>
              </div>
            </div>

            {/* 外観設定 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">外観設定</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>アイコン</Label>
                  <div className="grid grid-cols-6 gap-2">
                    {iconOptions.map((icon) => (
                      <Button
                        key={icon}
                        type="button"
                        variant={formData.icon === icon ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleInputChange('icon', icon)}
                        className="h-10 text-lg"
                      >
                        {icon}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>カラー</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {colorOptions.map((color) => (
                      <Button
                        key={color.value}
                        type="button"
                        variant={formData.color === color.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleInputChange('color', color.value)}
                        className="flex items-center space-x-2"
                      >
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: color.preview }}
                        />
                        <span>{color.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 表示設定 */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">表示設定</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>即座に有効化</Label>
                    <p className="text-sm text-muted-foreground">
                      有効にするとユーザーにすぐに表示されます
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>可視性</Label>
                    <p className="text-sm text-muted-foreground">
                      無効にすると管理者にも表示されません
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_visible}
                    onCheckedChange={(checked) => handleInputChange('is_visible', checked)}
                  />
                </div>
              </div>
            </div>

            {/* プレビュー */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">プレビュー</h3>
              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="text-2xl p-3 rounded-xl"
                    style={{ 
                      backgroundColor: `${formData.color}20`,
                      border: `1px solid ${formData.color}30`
                    }}
                  >
                    {formData.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold">{formData.name || 'カテゴリー名'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {formData.description || 'カテゴリーの説明が表示されます'}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {formData.type === 'main' ? '基本スキル' : '業界特化'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formData.is_active ? '有効' : '無効'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* メッセージ表示 */}
            {message && (
              <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
                {message.type === 'error' ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}

            {/* アクションボタン */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose}>
                キャンセル
              </Button>
              <Button type="submit" disabled={loading || !formData.name || !formData.category_id}>
                {loading ? '作成中...' : 'カテゴリーを作成'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}