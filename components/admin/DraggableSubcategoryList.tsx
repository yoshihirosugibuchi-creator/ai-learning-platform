'use client'

import { useState, useEffect } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  GripVertical, 
  Save,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  FolderOpen
} from 'lucide-react'

interface SubcategoryWithStats {
  subcategory_id: string
  name: string
  description: string
  parent_category_id: string
  display_order: number
  is_active: boolean
  questionCount?: number
}

interface DraggableSubcategoryListProps {
  subcategories: SubcategoryWithStats[]
  onReorder: (reorderedSubcategories: SubcategoryWithStats[], parentCategoryId: string) => Promise<boolean>
  parentCategoryId: string
  parentCategoryName: string
}

function SortableSubcategoryItem({ 
  subcategory 
}: { 
  subcategory: SubcategoryWithStats
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
        
        {/* Subcategory Info */}
        <div className="flex-1">
          <h4 className="font-medium text-sm">{subcategory.name}</h4>
          <p className="text-xs text-muted-foreground">{subcategory.description}</p>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="outline" className="text-xs">順序: {subcategory.display_order}</Badge>
            {subcategory.questionCount !== undefined && (
              <Badge variant="secondary" className="text-xs">{subcategory.questionCount}問</Badge>
            )}
          </div>
        </div>
      </div>
      
      {/* Status */}
      <div className="flex items-center">
        <Badge 
          className={`text-xs ${subcategory.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
        >
          {subcategory.is_active ? '有効' : '無効'}
        </Badge>
      </div>
    </div>
  )
}

export default function DraggableSubcategoryList({
  subcategories,
  onReorder,
  parentCategoryId,
  parentCategoryName
}: DraggableSubcategoryListProps) {
  const [items, setItems] = useState(subcategories)
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

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    
    try {
      const success = await onReorder(items, parentCategoryId)
      if (success) {
        setHasChanges(false)
        setMessage({ type: 'success', text: 'サブカテゴリーの並び順を保存しました' })
        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000)
      } else {
        setMessage({ type: 'error', text: 'サブカテゴリーの並び順保存に失敗しました' })
      }
    } catch (error) {
      console.error('Error saving subcategory order:', error)
      setMessage({ type: 'error', text: 'サブカテゴリーの並び順保存中にエラーが発生しました' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setItems(subcategories)
    setHasChanges(false)
    setMessage(null)
  }

  // Update items when subcategories prop changes
  useEffect(() => {
    if (!hasChanges) {
      setItems(subcategories)
    }
  }, [subcategories, hasChanges])

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>このカテゴリーにはサブカテゴリーがありません</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <FolderOpen className="h-5 w-5" />
            <span>{parentCategoryName}のサブカテゴリー ({items.length}個)</span>
          </CardTitle>
          
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
      </CardHeader>
      
      <CardContent>
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
            💡 <strong>操作方法:</strong> サブカテゴリーを上下にドラッグして並び順を変更できます。変更後は「保存」ボタンをクリックしてください。
          </p>
        </div>

        {/* Sortable List */}
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={items.map(item => item.subcategory_id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {items.map(subcategory => (
                <SortableSubcategoryItem
                  key={subcategory.subcategory_id}
                  subcategory={subcategory}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t bg-gray-50 p-3 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">{items.length}</div>
              <div className="text-xs text-muted-foreground">総サブカテゴリー</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">{items.filter(s => s.is_active).length}</div>
              <div className="text-xs text-muted-foreground">有効</div>
            </div>
            <div>
              <div className="text-lg font-bold text-purple-600">
                {items.reduce((sum, s) => sum + (s.questionCount || 0), 0)}
              </div>
              <div className="text-xs text-muted-foreground">総問題数</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}