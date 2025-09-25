'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Edit, 
  Plus, 
  GripVertical,
  Save,
  AlertTriangle, 
  CheckCircle,
  Trash2
} from 'lucide-react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Subcategory {
  subcategory_id: string
  name: string
  description?: string
  parent_category_id: string
  display_order: number
  icon?: string
}

interface CategoryWithStats {
  category_id: string
  name: string
  description: string
  type: 'main' | 'industry'
  icon: string
  color: string
  display_order: number
  is_active: boolean
  is_visible: boolean
  activation_date?: string
  questionCount?: number
  subcategoryCount?: number
  lastUpdated?: string
}

interface SubcategoriesModalProps {
  isOpen: boolean
  category: CategoryWithStats | null
  onClose: () => void
  onSuccess?: () => void
}

// アイコン選択肢を定義
const iconOptions = [
  '📚', '📖', '📝', '💡', '🧠', '💬', '🎯', '💰', '📈', '👥',
  '🤖', '📋', '🔄', '🛡️', '🎩', '🖥️', '🌐', '🏦', '🏭', '💻',
  '🏥', '🛍️', '🏗️', '⚡', '🎬', '🚛', '🏛️', '📊', '🔧', '🔍',
  '🎨', '🌟', '🚀', '📱', '💼', '🎓', '🔬', '🎪', '🚩', '⭐'
]

function SortableSubcategoryItem({ subcategory, onEdit, onDelete }: { 
  subcategory: Subcategory
  onEdit: (subcategory: Subcategory) => void
  onDelete: (subcategoryId: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subcategory.subcategory_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50 ${
        isDragging ? 'shadow-lg z-10' : ''
      }`}
    >
      <div className="flex items-center space-x-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-4 w-4" />
        </div>

        {/* Icon */}
        <div className="text-lg">
          {subcategory.icon || '📚'}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h4 className="font-medium text-sm">{subcategory.name}</h4>
          <p className="text-xs text-blue-600 font-mono mt-1">
            ID: {subcategory.subcategory_id}
          </p>
          {subcategory.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {subcategory.description}
            </p>
          )}
          <Badge variant="outline" className="text-xs mt-1">
            順序: {subcategory.display_order}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(subcategory)}
          className="flex items-center space-x-1"
        >
          <Edit className="h-3 w-3" />
          <span className="hidden sm:inline">編集</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete(subcategory.subcategory_id)}
          className="flex items-center space-x-1 text-red-600 hover:text-red-700"
        >
          <Trash2 className="h-3 w-3" />
          <span className="hidden sm:inline">削除</span>
        </Button>
      </div>
    </div>
  )
}

export default function SubcategoriesModal({ isOpen, category, onClose, onSuccess }: SubcategoriesModalProps) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [formData, setFormData] = useState({
    subcategory_id: '',
    name: '',
    description: '',
    icon: '📚'
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const loadSubcategories = useCallback(async () => {
    if (!category) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/subcategories?parent_category_id=${category.category_id}`)
      if (response.ok) {
        const data = await response.json()
        setSubcategories(data.subcategories || [])
      } else {
        setMessage({ type: 'error', text: 'サブカテゴリーの読み込みに失敗しました' })
      }
    } catch (error) {
      console.error('Error loading subcategories:', error)
      setMessage({ type: 'error', text: 'サブカテゴリーの読み込みに失敗しました' })
    }
    setLoading(false)
  }, [category])

  // Load subcategories when modal opens
  useEffect(() => {
    if (isOpen && category) {
      loadSubcategories()
    }
  }, [isOpen, category, loadSubcategories])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSubcategories((items) => {
        const oldIndex = items.findIndex(item => item.subcategory_id === active.id)
        const newIndex = items.findIndex(item => item.subcategory_id === over.id)
        
        const newItems = arrayMove(items, oldIndex, newIndex)
        
        // Update display_order based on new positions
        const reorderedItems = newItems.map((item, index) => ({
          ...item,
          display_order: index + 1
        }))
        
        setHasChanges(true)
        return reorderedItems
      })
    }
  }

  const handleEdit = (subcategory: Subcategory) => {
    setEditingSubcategory(subcategory)
    setFormData({
      subcategory_id: subcategory.subcategory_id,
      name: subcategory.name,
      description: subcategory.description || '',
      icon: subcategory.icon || '📚'
    })
    setShowEditForm(true)
  }

  const handleAdd = () => {
    setEditingSubcategory(null)
    setFormData({
      subcategory_id: '',
      name: '',
      description: '',
      icon: '📚'
    })
    setShowEditForm(true)
  }

  const handleSaveOrder = async () => {
    if (!category || !hasChanges) return

    try {
      const response = await fetch('/api/admin/subcategories/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subcategories: subcategories.map(sub => ({
            subcategory_id: sub.subcategory_id,
            display_order: sub.display_order
          }))
        })
      })

      if (response.ok) {
        setHasChanges(false)
        setMessage({ type: 'success', text: 'サブカテゴリーの並び順を保存しました' })
      } else {
        throw new Error('Failed to save order')
      }
    } catch (error) {
      console.error('Error saving order:', error)
      setMessage({ type: 'error', text: '並び順の保存に失敗しました' })
    }
  }

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!category) return

    try {
      const isEditing = !!editingSubcategory
      const url = isEditing 
        ? `/api/admin/subcategories/${editingSubcategory!.subcategory_id}/edit`
        : '/api/admin/subcategories/create'
      
      const method = isEditing ? 'PATCH' : 'POST'
      
      // 新規作成時のサブカテゴリーIDバリデーション
      if (!isEditing && !formData.subcategory_id.trim()) {
        setMessage({ type: 'error', text: 'サブカテゴリーIDは必須です' })
        return
      }

      if (!isEditing && !/^[a-zA-Z0-9_-]+$/.test(formData.subcategory_id)) {
        setMessage({ type: 'error', text: 'サブカテゴリーIDは英数字、アンダースコア、ハイフンのみ使用できます' })
        return
      }

      const requestBody = {
        subcategory_id: isEditing ? editingSubcategory!.subcategory_id : formData.subcategory_id,
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        parent_category_id: category.category_id,
        display_order: isEditing ? editingSubcategory!.display_order : subcategories.length + 1
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        await loadSubcategories()
        setShowEditForm(false)
        setMessage({ 
          type: 'success', 
          text: isEditing ? 'サブカテゴリーを更新しました' : 'サブカテゴリーを追加しました' 
        })
        onSuccess?.()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || '保存に失敗しました' })
      }
    } catch (error) {
      console.error('Error saving subcategory:', error)
      setMessage({ type: 'error', text: '保存に失敗しました' })
    }
  }

  const handleDelete = async (subcategoryId: string) => {
    if (!confirm('このサブカテゴリーを削除しますか？')) return

    try {
      const response = await fetch(`/api/admin/subcategories/${subcategoryId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadSubcategories()
        setMessage({ type: 'success', text: 'サブカテゴリーを削除しました' })
        onSuccess?.()
      } else {
        const error = await response.json()
        setMessage({ type: 'error', text: error.error || '削除に失敗しました' })
      }
    } catch (error) {
      console.error('Error deleting subcategory:', error)
      setMessage({ type: 'error', text: '削除に失敗しました' })
    }
  }

  const handleClose = () => {
    setMessage(null)
    setShowEditForm(false)
    setHasChanges(false)
    onClose()
  }

  if (!isOpen || !category) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">
            {category.icon} {category.name} のサブカテゴリー管理
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          {/* Actions */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-2">
              <Button
                onClick={handleAdd}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                新規追加
              </Button>
              {hasChanges && (
                <Button
                  onClick={handleSaveOrder}
                  variant="outline"
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  並び順を保存
                </Button>
              )}
            </div>
            <Badge variant="outline">
              {subcategories.length}個のサブカテゴリー
            </Badge>
          </div>

          {/* Message */}
          {message && (
            <Alert className={`mb-4 ${message.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
              {message.type === 'error' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* Edit Form */}
          {showEditForm && (
            <Card className="mb-4 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingSubcategory ? 'サブカテゴリーを編集' : '新しいサブカテゴリーを追加'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitForm} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="subcategory_id">
                        サブカテゴリーID {!editingSubcategory && '*'}
                      </Label>
                      <Input
                        id="subcategory_id"
                        value={formData.subcategory_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, subcategory_id: e.target.value }))}
                        placeholder="例: programming_basics"
                        required={!editingSubcategory}
                        disabled={!!editingSubcategory}
                        className={editingSubcategory ? "bg-gray-100 text-gray-600" : ""}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {editingSubcategory ? "編集時は変更できません" : "英数字、アンダースコア、ハイフンのみ"}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="name">名前 *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="サブカテゴリー名"
                        required
                      />
                    </div>
                    <div>
                      <Label>アイコン</Label>
                      <div className="grid grid-cols-6 gap-2 mt-2">
                        {iconOptions.map((icon) => (
                          <Button
                            key={icon}
                            type="button"
                            variant={formData.icon === icon ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFormData(prev => ({ ...prev, icon }))}
                            className="h-10 text-lg"
                          >
                            {icon}
                          </Button>
                        ))}
                      </div>
                      <div className="mt-2">
                        <Input
                          value={formData.icon}
                          onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                          placeholder="または手動入力: 📚"
                          className="text-center"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">説明</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="サブカテゴリーの説明"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <Button type="button" variant="outline" onClick={() => setShowEditForm(false)}>
                      キャンセル
                    </Button>
                    <Button type="submit">
                      {editingSubcategory ? '更新' : '追加'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Subcategories List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">読み込み中...</p>
            </div>
          ) : subcategories.length > 0 ? (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={subcategories.map(sub => sub.subcategory_id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {subcategories.map(subcategory => (
                    <SortableSubcategoryItem
                      key={subcategory.subcategory_id}
                      subcategory={subcategory}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>まだサブカテゴリーがありません</p>
              <p className="text-sm">「新規追加」ボタンから追加してください</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}