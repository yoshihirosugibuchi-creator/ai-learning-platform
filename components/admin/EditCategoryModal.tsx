'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { X, Edit, AlertTriangle, CheckCircle } from 'lucide-react'

type CategoryStatus = 'active' | 'coming_soon' | 'suspended'

interface CategoryData {
  category_id: string
  name: string
  description: string
  type: 'main' | 'industry'
  icon: string
  color: string
  is_active: boolean
  is_visible: boolean
  status?: CategoryStatus
}

interface EditCategoryModalProps {
  isOpen: boolean
  category: CategoryData | null
  onClose: () => void
  onSuccess: () => void
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

export default function EditCategoryModal({ isOpen, category, onClose, onSuccess }: EditCategoryModalProps) {
  const [formData, setFormData] = useState<CategoryData>({
    category_id: '',
    name: '',
    description: '',
    type: 'main',
    icon: '📚',
    color: '#6B7280',
    is_active: false,
    is_visible: true,
    status: 'coming_soon'
  })
  
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Update form data when category prop changes
  useEffect(() => {
    if (category) {
      // 現在のステータスから新しいステータスを判定
      let status: CategoryStatus = 'coming_soon'
      if (category.is_active) {
        status = 'active'
      } else if (category.is_visible === false) {
        status = 'suspended'
      }
      
      setFormData({
        category_id: category.category_id,
        name: category.name,
        description: category.description,
        type: category.type,
        icon: category.icon,
        color: category.color,
        is_active: category.is_active,
        is_visible: category.is_visible,
        status: status
      })
    }
  }, [category])

  const handleInputChange = (field: keyof CategoryData, value: string | boolean | CategoryStatus) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      
      // ステータス変更時に他のフィールドも同期
      if (field === 'status') {
        const status = value as CategoryStatus
        if (status === 'active') {
          newData.is_active = true
          newData.is_visible = true
        } else if (status === 'coming_soon') {
          newData.is_active = false
          newData.is_visible = true
        } else if (status === 'suspended') {
          newData.is_active = false
          newData.is_visible = false
        }
      }
      
      return newData
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category) return

    console.log('📝 Starting category edit:', category.category_id, formData)
    setLoading(true)
    setMessage(null)

    try {
      const requestBody = {
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        color: formData.color,
        is_active: formData.is_active,
        is_visible: formData.is_visible
      }
      
      console.log('🔄 Sending edit request:', requestBody)
      
      const response = await fetch(`/api/admin/categories/${category.category_id}/edit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()
      console.log('📥 Edit response:', result)

      if (response.ok) {
        setMessage({ type: 'success', text: 'カテゴリーが正常に更新されました' })
        
        console.log('✅ Edit successful, calling onSuccess')
        // 成功後すぐに親コンポーネントのデータを更新
        onSuccess()
        
        setTimeout(() => {
          console.log('🔄 Closing edit modal')
          onClose()
        }, 1500)
      } else {
        console.error('❌ Edit failed:', result)
        setMessage({ type: 'error', text: result.error || 'カテゴリーの更新に失敗しました' })
      }
    } catch (error) {
      console.error('カテゴリー更新エラー:', error)
      setMessage({ type: 'error', text: 'ネットワークエラーが発生しました' })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setMessage(null)
    onClose()
  }

  if (!isOpen || !category) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold flex items-center space-x-2">
            <Edit className="h-5 w-5" />
            <span>カテゴリーを編集</span>
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
                  <Label htmlFor="category_id">カテゴリーID (変更不可)</Label>
                  <Input
                    id="category_id"
                    value={formData.category_id}
                    disabled
                    className="bg-gray-100 cursor-not-allowed"
                  />
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
                <Label htmlFor="type">カテゴリータイプ (変更不可)</Label>
                <select
                  id="type"
                  value={formData.type}
                  disabled
                  className="flex h-10 w-full rounded-md border border-input bg-gray-100 px-3 py-2 text-sm cursor-not-allowed"
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
              
              <div className="space-y-2">
                <Label htmlFor="status">ステータス</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as CategoryStatus)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  required
                >
                  <option value="active">✅ 有効 - クイズやコース学習に利用可能</option>
                  <option value="coming_soon">🔶 Coming Soon - 問題作成可能、出題不可</option>
                  <option value="suspended">⛔ 停止中 - 問題作成可能、カテゴリー一覧非表示</option>
                </select>
                <div className="text-xs text-muted-foreground mt-2">
                  {formData.status === 'active' && (
                    <p>✅ ユーザーにカテゴリーが表示され、クイズをプレイできます</p>
                  )}
                  {formData.status === 'coming_soon' && (
                    <p>🔶 カテゴリー一覧にComing Soonとして薄く表示されます</p>
                  )}
                  {formData.status === 'suspended' && (
                    <p>⛔ カテゴリー一覧には表示されません。学習コースも非表示になります</p>
                  )}
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
                      <span className={`text-xs px-2 py-1 rounded ${
                        formData.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : formData.status === 'coming_soon'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {formData.status === 'active' 
                          ? '公開中' 
                          : formData.status === 'coming_soon'
                            ? 'Coming Soon'
                            : '停止中'
                        }
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
              <Button type="submit" disabled={loading || !formData.name}>
                {loading ? '更新中...' : 'カテゴリーを更新'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}