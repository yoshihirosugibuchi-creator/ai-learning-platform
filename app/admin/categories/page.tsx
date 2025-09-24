'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Shuffle,
  Eye,
  EyeOff,
  Plus
} from 'lucide-react'
import { getCategories } from '@/lib/categories'
import DraggableCategoryList from '@/components/admin/DraggableCategoryList'
import AddCategoryModal from '@/components/admin/AddCategoryModal'
import EditCategoryModal from '@/components/admin/EditCategoryModal'
import SubcategoriesModal from '@/components/admin/SubcategoriesModal'

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

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithStats[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithStats | null>(null)
  const [showSubcategoriesModal, setShowSubcategoriesModal] = useState(false)
  const [selectedCategoryForSubcategories, setSelectedCategoryForSubcategories] = useState<CategoryWithStats | null>(null)

  // カテゴリー一覧を読み込み
  const loadCategories = async () => {
    setLoading(true)
    try {
      // 管理者用API（全カテゴリー：有効・無効両方）を直接取得
      // キャッシュを無効にするためにタイムスタンプを追加
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/admin/categories?include_inactive=true&_t=${timestamp}`)
      if (response.ok) {
        const adminData = await response.json()
        
        // 管理者データを直接使用
        const categoriesWithStats = (adminData.categories || []).map((category: Record<string, unknown>) => ({
          category_id: category.category_id,
          name: category.name,
          description: category.description || '',
          type: category.type,
          icon: category.icon,
          color: category.color,
          display_order: category.display_order,
          is_active: category.is_active ?? false,
          is_visible: category.is_visible ?? true,
          activation_date: category.activation_date,
          lastUpdated: category.updated_at,
          questionCount: category.question_count ?? 0,
          subcategoryCount: category.subcategory_count ?? 0
        }))
        
        setCategories(categoriesWithStats)
        setMessage({ type: 'success', text: `${categoriesWithStats.length}個のカテゴリーを読み込みました（有効: ${categoriesWithStats.filter((c: CategoryWithStats) => c.is_active).length}個、無効: ${categoriesWithStats.filter((c: CategoryWithStats) => !c.is_active).length}個）` })
      } else {
        // フォールバック: 基本カテゴリー取得
        const allCategories = await getCategories({ activeOnly: false })
        const basicCategories = allCategories.map(category => ({
          category_id: category.id,
          name: category.name,
          description: category.description || '',
          type: category.type,
          icon: category.icon || '📚',
          color: category.color || '#6B7280',
          display_order: category.displayOrder,
          is_active: true, // デフォルトはアクティブ
          is_visible: true,
          questionCount: 0,
          subcategoryCount: category.subcategories?.length ?? 0
        }))
        setCategories(basicCategories)
        setMessage({ type: 'info', text: 'カテゴリーの基本情報を読み込みました（統計情報は利用できません）' })
      }
    } catch (error) {
      console.error('Error loading categories:', error)
      setMessage({ type: 'error', text: 'カテゴリーの読み込みに失敗しました' })
    }
    setLoading(false)
  }

  // カテゴリーの有効/無効を切り替え
  const toggleCategoryStatus = async (categoryId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/categories/${categoryId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active: !currentStatus,
          activation_date: !currentStatus ? new Date().toISOString() : null
        })
      })

      if (response.ok) {
        // データベースから最新の状態を再読み込み
        await loadCategories()
        
        const newStatus = !currentStatus ? '有効' : '無効'
        const categoryName = categories.find(c => c.category_id === categoryId)?.name || 'カテゴリー'
        setMessage({ 
          type: 'success', 
          text: `「${categoryName}」を${newStatus}にしました` 
        })
      } else {
        throw new Error('API request failed')
      }
    } catch (error) {
      console.error('Error toggling category status:', error)
      setMessage({ type: 'error', text: 'カテゴリー状態の更新に失敗しました' })
    }
  }

  // カテゴリーの並び順を更新
  const handleReorder = async (reorderedCategories: CategoryWithStats[]): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/categories/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          categories: reorderedCategories.map(cat => ({
            category_id: cat.category_id,
            display_order: cat.display_order
          }))
        })
      })

      if (response.ok) {
        // ローカル状態を更新
        setCategories(prev => {
          const updated = prev.map(cat => {
            const reordered = reorderedCategories.find(r => r.category_id === cat.category_id)
            return reordered ? { ...cat, display_order: reordered.display_order } : cat
          })
          return updated.sort((a, b) => a.display_order - b.display_order)
        })
        setMessage({ type: 'success', text: 'カテゴリーの並び順を更新しました' })
        return true
      } else {
        throw new Error('Reorder API request failed')
      }
    } catch (error) {
      console.error('Error reordering categories:', error)
      setMessage({ type: 'error', text: 'カテゴリーの並び順更新に失敗しました' })
      return false
    }
  }

  // カテゴリー編集
  const handleEditCategory = (category: CategoryWithStats) => {
    setEditingCategory(category)
    setShowEditModal(true)
  }

  // サブカテゴリー管理
  const handleSubcategoriesManagement = (category: CategoryWithStats) => {
    setSelectedCategoryForSubcategories(category)
    setShowSubcategoriesModal(true)
  }

  // 初期読み込み
  useEffect(() => {
    loadCategories()
  }, [])

  // カテゴリーをタイプ別に分類（並び順でソート）
  const mainCategories = categories
    .filter(cat => cat.type === 'main')
    .sort((a, b) => a.display_order - b.display_order)
  const industryCategories = categories
    .filter(cat => cat.type === 'industry')
    .sort((a, b) => a.display_order - b.display_order)
  const activeCount = categories.filter(cat => cat.is_active).length
  const inactiveCount = categories.filter(cat => !cat.is_active).length

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <span>カテゴリー管理</span>
            <Shuffle className="h-6 w-6 text-blue-500" />
          </h1>
          <p className="text-muted-foreground">
            カテゴリーの有効/無効状態を管理し、ドラッグ&ドロップで並び順を変更できます
          </p>
        </div>
        <div className="flex space-x-3">
          <Button 
            onClick={() => setShowAddModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            新しいカテゴリーを追加
          </Button>
          <Button onClick={loadCategories} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            再読み込み
          </Button>
        </div>
      </div>

      {/* メッセージ表示 */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500' : message.type === 'success' ? 'border-green-500' : 'border-blue-500'}>
          {message.type === 'error' && <AlertTriangle className="h-4 w-4" />}
          {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* 統計サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div className="text-center">
                <div className="text-2xl font-bold">{categories.length}</div>
                <div className="text-sm text-muted-foreground">総カテゴリー数</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <Eye className="h-8 w-8 text-green-500" />
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{activeCount}</div>
                <div className="text-sm text-muted-foreground">有効カテゴリー</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center space-x-2">
              <EyeOff className="h-8 w-8 text-yellow-500" />
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{inactiveCount}</div>
                <div className="text-sm text-muted-foreground">Coming Soon</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* メインカテゴリー */}
      <DraggableCategoryList
        categories={mainCategories}
        onReorder={handleReorder}
        onStatusToggle={toggleCategoryStatus}
        onEdit={handleEditCategory}
        onSubcategories={handleSubcategoriesManagement}
        title="📊 メインカテゴリー"
        type="main"
      />

      {/* 業界カテゴリー */}
      <DraggableCategoryList
        categories={industryCategories}
        onReorder={handleReorder}
        onStatusToggle={toggleCategoryStatus}
        onEdit={handleEditCategory}
        onSubcategories={handleSubcategoriesManagement}
        title="🏭 業界カテゴリー"
        type="industry"
      />

      {/* 操作ガイド */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">操作ガイド</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <ul className="space-y-2 text-sm">
            <li>• <strong>有効（公開中）</strong>: ユーザーにカテゴリーが表示され、クイズをプレイできます</li>
            <li>• <strong>Coming Soon</strong>: 問題作成は可能、カテゴリー一覧に薄く表示、出題は不可</li>
            <li>• <strong>停止中</strong>: 問題作成は可能、カテゴリー一覧と学習コースは非表示</li>
            <li>• <strong>編集機能</strong>: 各カテゴリーの「編集」ボタンからステータス変更が可能です</li>
            <li>• <strong>段階的公開</strong>: 停止中→Coming Soon→有効で段階的に公開できます</li>
          </ul>
        </CardContent>
      </Card>

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadCategories}
      />

      {/* Edit Category Modal */}
      <EditCategoryModal
        isOpen={showEditModal}
        category={editingCategory}
        onClose={() => {
          setShowEditModal(false)
          setEditingCategory(null)
          setMessage(null) // メッセージもクリア
        }}
        onSuccess={() => {
          console.log('🔄 Edit success callback triggered, reloading categories')
          // 編集成功時に即座にデータをリロード
          loadCategories()
          setMessage({ type: 'success', text: 'カテゴリーが更新されました' })
        }}
      />

      {/* Subcategories Modal */}
      <SubcategoriesModal
        isOpen={showSubcategoriesModal}
        category={selectedCategoryForSubcategories}
        onClose={() => {
          setShowSubcategoriesModal(false)
          setSelectedCategoryForSubcategories(null)
          setMessage(null)
        }}
        onSuccess={() => {
          // サブカテゴリー変更時にカテゴリー統計をリロード
          loadCategories()
        }}
      />
    </div>
  )
}