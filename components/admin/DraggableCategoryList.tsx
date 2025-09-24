'use client'

import React, { useState, useEffect } from 'react'
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
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  GripVertical, 
  Eye, 
  EyeOff, 
  Calendar,
  Save,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Edit,
  List
} from 'lucide-react'

type CategoryStatus = 'active' | 'coming_soon' | 'suspended'

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
  status?: CategoryStatus
  activation_date?: string
  questionCount?: number
  subcategoryCount?: number
}

interface DraggableCategoryListProps {
  categories: CategoryWithStats[]
  onReorder: (reorderedCategories: CategoryWithStats[]) => Promise<boolean>
  onStatusToggle: (categoryId: string, currentStatus: boolean) => Promise<void>
  onEdit?: (category: CategoryWithStats) => void
  onSubcategories?: (category: CategoryWithStats) => void
  title: string
  type: 'main' | 'industry'
}

function SortableItem({ 
  category, 
  onStatusToggle: _onStatusToggle,
  onEdit,
  onSubcategories
}: { 
  category: CategoryWithStats
  onStatusToggle: (categoryId: string, currentStatus: boolean) => Promise<void>
  onEdit?: (category: CategoryWithStats) => void
  onSubcategories?: (category: CategoryWithStats) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.category_id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${
        category.is_active 
          ? 'bg-white hover:bg-gray-50 border-gray-200' 
          : category.is_visible !== false
            ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100'
            : 'bg-red-50 border-red-200 hover:bg-red-100'
      } ${isDragging ? 'shadow-lg z-10' : ''}`}
    >
      <div className="flex items-center space-x-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        
        {/* Category Icon */}
        <div className="text-2xl">{category.icon}</div>
        
        {/* Category Info */}
        <div className="flex-1">
          <h3 className={`font-semibold ${
            category.is_active 
              ? '' 
              : category.is_visible !== false 
                ? 'text-yellow-700' 
                : 'text-red-600'
          }`}>
            {category.name}
            {!category.is_active && (
              <span className={`ml-2 text-xs font-normal ${
                category.is_visible !== false ? 'text-yellow-600' : 'text-red-500'
              }`}>
                {category.is_visible !== false ? '（準備中）' : '（停止中）'}
              </span>
            )}
          </h3>
          <p className={`text-sm ${
            category.is_active 
              ? 'text-muted-foreground' 
              : category.is_visible !== false 
                ? 'text-yellow-600' 
                : 'text-red-500'
          }`}>
            {category.description}
          </p>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="outline">順序: {category.display_order}</Badge>
            <Badge variant="secondary">{category.subcategoryCount}個のサブカテゴリー</Badge>
            {category.activation_date && (
              <Badge variant="outline" className="text-xs">
                <Calendar className="h-3 w-3 mr-1" />
                {new Date(category.activation_date).toLocaleDateString('ja-JP')}
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      {/* Status Controls */}
      <div className="flex items-center space-x-4">
        {onSubcategories && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSubcategories(category)}
            className="flex items-center space-x-1 bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
          >
            <List className="h-3 w-3" />
            <span>サブカテゴリー</span>
          </Button>
        )}
        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(category)}
            className="flex items-center space-x-1"
          >
            <Edit className="h-3 w-3" />
            <span>編集</span>
          </Button>
        )}
        
        {/* Status Display */}
        {(() => {
          // ステータス判定（将来的にstatusフィールドを使用予定）
          if (category.is_active) {
            return (
              <Badge className="bg-green-100 text-green-800">
                <Eye className="h-3 w-3 mr-1" />
                公開中
              </Badge>
            )
          } else if (category.is_visible !== false) {
            return (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                <EyeOff className="h-3 w-3 mr-1" />
                Coming Soon
              </Badge>
            )
          } else {
            return (
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                <EyeOff className="h-3 w-3 mr-1" />
                停止中
              </Badge>
            )
          }
        })()}
      </div>
    </div>
  )
}

export default function DraggableCategoryList({
  categories,
  onReorder,
  onStatusToggle,
  onEdit,
  onSubcategories,
  title,
  type: _type
}: DraggableCategoryListProps) {
  const [items, setItems] = useState<CategoryWithStats[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex(item => item.category_id === active.id)
        const newIndex = items.findIndex(item => item.category_id === over.id)
        
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

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    
    try {
      const success = await onReorder(items)
      if (success) {
        setHasChanges(false)
        setMessage({ type: 'success', text: '並び順を保存しました' })
        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: '並び順の保存に失敗しました' })
      }
    } catch (error) {
      console.error('Error saving order:', error)
      setMessage({ type: 'error', text: '並び順の保存中にエラーが発生しました' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setItems(categories)
    setHasChanges(false)
    setMessage(null)
  }

  // Update items when categories prop changes using useEffect
  useEffect(() => {
    if (!hasChanges) {
      setItems(categories)
    }
  }, [categories, hasChanges])

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title} ({items.length}個)</h3>
          
          {hasChanges && (
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                リセット
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-1" />
                {isSaving ? '保存中...' : '保存'}
              </Button>
            </div>
          )}
        </div>

        {/* Message Display */}
        {message && (
          <Alert className={`mb-4 ${message.type === 'error' ? 'border-red-500' : 'border-green-500'}`}>
            {message.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Drag & Drop Instructions */}
        <div className="bg-blue-50 p-3 rounded-lg mb-4">
          <p className="text-sm text-blue-700">
            💡 <strong>操作方法:</strong> カテゴリーを上下にドラッグして並び順を変更できます。変更後は「保存」ボタンをクリックしてください。
          </p>
        </div>

        {/* Sortable List */}
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={items.map(item => item.category_id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {items.map(category => (
                <SortableItem
                  key={category.category_id}
                  category={category}
                  onStatusToggle={onStatusToggle}
                  onEdit={onEdit}
                  onSubcategories={onSubcategories}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t bg-gray-50 p-3 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">{items.length}</div>
              <div className="text-xs text-muted-foreground">総カテゴリー</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">{items.filter(c => c.is_active).length}</div>
              <div className="text-xs text-muted-foreground">有効</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-600">{items.filter(c => !c.is_active).length}</div>
              <div className="text-xs text-muted-foreground">Coming Soon</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">
                {items.reduce((sum, c) => sum + (c.subcategoryCount || 0), 0)}
              </div>
              <div className="text-xs text-muted-foreground">サブカテゴリー</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}