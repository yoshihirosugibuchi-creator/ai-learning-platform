'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit, Save, X, Award } from 'lucide-react'

interface BadgeData {
  id: string
  icon: string
  color: string
  title: string
  description: string
}

interface Category {
  category_id: string
  name: string
  description: string
  type?: 'main' | 'industry'
  is_active?: boolean
}

interface Subcategory {
  subcategory_id: string
  name: string
  description: string
  parent_category_id: string
}

interface Genre {
  id: string
  course_id: string
  title: string
  description: string
  display_order: number
  estimated_days: number
  category_id?: string
  subcategory_id?: string | null
  badge_data: BadgeData | null
}

interface GenreEditModalProps {
  genre: Genre | null
  isOpen: boolean
  onClose: () => void
  onSave: (genreId: string, data: Partial<Genre>) => Promise<void>
}

const badgeIconOptions = ['🏆', '⭐', '🎯', '🚀', '💎', '🎖️', '🥇', '🏅', '👑', '🔥']

const badgeColorOptions = [
  { value: '#F59E0B', label: 'ゴールド', preview: 'bg-amber-500' },
  { value: '#EF4444', label: 'レッド', preview: 'bg-red-500' },
  { value: '#8B5CF6', label: 'パープル', preview: 'bg-violet-500' },
  { value: '#06B6D4', label: 'ブルー', preview: 'bg-cyan-500' },
  { value: '#10B981', label: 'グリーン', preview: 'bg-emerald-500' },
  { value: '#EC4899', label: 'ピンク', preview: 'bg-pink-500' }
]

export function GenreEditModal({ genre, isOpen, onClose, onSave }: GenreEditModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    estimated_days: 1,
    display_order: 1,
    category_id: '',
    subcategory_id: '',
    badge_data: {
      id: '',
      icon: '🏆',
      color: '#F59E0B',
      title: '',
      description: ''
    }
  })
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([])

  // カテゴリー・サブカテゴリーデータ取得
  useEffect(() => {
    const loadCategoryData = async () => {
      try {
        const categoriesResponse = await fetch('/api/categories')
        if (categoriesResponse.ok) {
          const categoriesData = await categoriesResponse.json()
          setCategories(categoriesData.categories || [])
        }

        const subcategoriesResponse = await fetch('/api/subcategories')
        if (subcategoriesResponse.ok) {
          const subcategoriesData = await subcategoriesResponse.json()
          setSubcategories(subcategoriesData.subcategories || [])
        }
      } catch (error) {
        console.error('カテゴリーデータ取得エラー:', error)
      }
    }
    
    if (isOpen) {
      loadCategoryData()
    }
  }, [isOpen])

  // カテゴリー選択時のサブカテゴリーフィルタリング
  useEffect(() => {
    if (formData.category_id) {
      const filtered = subcategories.filter(sub => sub.parent_category_id === formData.category_id)
      setFilteredSubcategories(filtered)
    } else {
      setFilteredSubcategories([])
    }
  }, [formData.category_id, subcategories])

  useEffect(() => {
    if (genre) {
      setFormData({
        title: genre.title,
        description: genre.description,
        estimated_days: genre.estimated_days,
        display_order: genre.display_order,
        category_id: genre.category_id || '',
        subcategory_id: genre.subcategory_id || '',
        badge_data: genre.badge_data || {
          id: `badge_${Date.now()}`,
          icon: '🏆',
          color: '#F59E0B',
          title: `${genre.title}バッジ`,
          description: `${genre.title}を完了したユーザーに授与されるバッジです。`
        }
      })
    }
  }, [genre])

  const handleSave = async () => {
    if (!genre) return

    setSaving(true)
    try {
      // badge_dataの各フィールドにデフォルト値を確実に設定（空文字もカバー）
      const safeBadgeData = {
        id: formData.badge_data?.id || `badge_${genre.id}`,
        icon: formData.badge_data?.icon || '🏆',
        color: formData.badge_data?.color || '#F59E0B',
        title: formData.badge_data?.title || `${formData.title}マスター`,
        description: formData.badge_data?.description || `${formData.title}の学習を完了`
      }

      await onSave(genre.id, {
        title: formData.title,
        description: formData.description,
        estimated_days: formData.estimated_days,
        display_order: formData.display_order,
        category_id: formData.category_id || undefined,
        subcategory_id: formData.subcategory_id || null,
        badge_data: safeBadgeData
      })
      onClose()
    } catch (error) {
      console.error('Genre save error:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!genre) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="h-5 w-5 mr-2" />
            ジャンル編集: {genre.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">ジャンルID</label>
              <Input
                value={genre.id}
                readOnly
                placeholder="自動生成されます"
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                新規作成時は自動生成されます
              </p>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">カテゴリー <span className="text-red-500">*</span></label>
              <Select 
                value={formData.category_id} 
                onValueChange={(value) => {
                  setFormData(prev => ({ 
                    ...prev, 
                    category_id: value,
                    subcategory_id: '' // カテゴリー変更時にサブカテゴリーをリセット
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="カテゴリーを選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.category_id} value={category.category_id}>
                      {category.name} ({category.type === 'main' ? 'メイン' : '業界'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">サブカテゴリー</label>
              <Select 
                value={formData.subcategory_id} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, subcategory_id: value }))}
                disabled={!formData.category_id}
              >
                <SelectTrigger className={!formData.category_id ? 'opacity-50' : ''}>
                  <SelectValue placeholder={!formData.category_id ? 'まずカテゴリーを選択してください' : 'サブカテゴリーを選択（任意）'} />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubcategories.map((subcategory) => (
                    <SelectItem key={subcategory.subcategory_id} value={subcategory.subcategory_id}>
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">ジャンル名</label>
              <Input
                value={formData.title}
                onChange={(e) => {
                  const newTitle = e.target.value
                  setFormData(prev => ({ 
                    ...prev, 
                    title: newTitle,
                    badge_data: {
                      ...prev.badge_data,
                      title: prev.badge_data?.title || `${newTitle}マスター`,
                      description: prev.badge_data?.description || `${newTitle}の学習を完了`
                    }
                  }))
                }}
                placeholder="ジャンル名を入力..."
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">説明</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="ジャンルの説明を入力..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">予想日数</label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.estimated_days}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    estimated_days: parseInt(e.target.value) || 1 
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

          {/* バッジデータ編集 */}
          <div className="border-t pt-6">
            <h3 className="font-medium mb-4 flex items-center">
              <Award className="h-4 w-4 mr-2" />
              完了バッジ設定
            </h3>

            <div className="space-y-4">
              {/* バッジプレビュー */}
              <div className="p-3 bg-gray-50 rounded-lg text-center">
                <div
                  className="inline-flex items-center px-3 py-1 rounded-full text-white font-medium"
                  style={{ backgroundColor: formData.badge_data?.color || '#F59E0B' }}
                >
                  <span className="mr-1">{formData.badge_data?.icon || '🏆'}</span>
                  {formData.badge_data?.title || 'バッジ'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.badge_data?.description || '説明未設定'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">バッジタイトル</label>
                <Input
                  value={formData.badge_data?.title || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    badge_data: {
                      id: prev.badge_data?.id || `badge_${Date.now()}`,
                      icon: prev.badge_data?.icon || '🏆',
                      color: prev.badge_data?.color || '#F59E0B',
                      title: e.target.value,
                      description: prev.badge_data?.description || ''
                    }
                  }))}
                  placeholder="バッジタイトル..."
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">バッジ説明</label>
                <Textarea
                  value={formData.badge_data?.description || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    badge_data: {
                      id: prev.badge_data?.id || `badge_${Date.now()}`,
                      icon: prev.badge_data?.icon || '🏆',
                      color: prev.badge_data?.color || '#F59E0B',
                      title: prev.badge_data?.title || '',
                      description: e.target.value
                    }
                  }))}
                  placeholder="バッジの説明..."
                  rows={2}
                />
              </div>

              {/* アイコン選択 */}
              <div>
                <label className="text-sm font-medium mb-2 block">バッジアイコン</label>
                <div className="grid grid-cols-5 gap-2">
                  {badgeIconOptions.map(icon => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        badge_data: {
                          id: prev.badge_data?.id || `badge_${Date.now()}`,
                          icon: icon,
                          color: prev.badge_data?.color || '#F59E0B',
                          title: prev.badge_data?.title || '',
                          description: prev.badge_data?.description || ''
                        }
                      }))}
                      className={`p-2 text-lg rounded border-2 hover:bg-muted transition-colors ${
                        (formData.badge_data?.icon || '🏆') === icon
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
                <label className="text-sm font-medium mb-2 block">バッジカラー</label>
                <div className="grid grid-cols-3 gap-2">
                  {badgeColorOptions.map(color => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        badge_data: {
                          id: prev.badge_data?.id || `badge_${Date.now()}`,
                          icon: prev.badge_data?.icon || '🏆',
                          color: color.value,
                          title: prev.badge_data?.title || '',
                          description: prev.badge_data?.description || ''
                        }
                      }))}
                      className={`p-2 rounded border-2 hover:bg-muted transition-colors flex items-center space-x-2 ${
                        (formData.badge_data?.color || '#F59E0B') === color.value
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