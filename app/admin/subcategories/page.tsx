'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  FolderTree,
  ArrowUpDown
} from 'lucide-react'
import { getCategories } from '@/lib/categories'
import DraggableSubcategoryList from '@/components/admin/DraggableSubcategoryList'

interface CategoryOption {
  category_id: string
  name: string
  description: string
  type: 'main' | 'industry'
  subcategoryCount?: number
}

interface SubcategoryWithStats {
  subcategory_id: string
  name: string
  description: string
  parent_category_id: string
  display_order: number
  is_active: boolean
  questionCount?: number
}

export default function AdminSubcategoriesPage() {
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [subcategories, setSubcategories] = useState<SubcategoryWithStats[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  // カテゴリー一覧を読み込み
  const loadCategories = async () => {
    setLoading(true)
    try {
      // 全カテゴリー（アクティブ・非アクティブ両方）を取得
      const allCategories = await getCategories({ activeOnly: false })
      
      // 管理者用の詳細情報を取得
      const response = await fetch('/api/admin/categories')
      if (response.ok) {
        const adminData = await response.json()
        
        // カテゴリーと管理データをマージ
        const categoriesWithStats = allCategories.map(category => {
          const adminInfo = adminData.categories?.find((admin: { category_id: string; subcategory_count?: number }) => admin.category_id === category.id)
          return {
            category_id: category.id,
            name: category.name,
            description: category.description || '',
            type: category.type,
            subcategoryCount: adminInfo?.subcategory_count ?? category.subcategories?.length ?? 0
          }
        })
        
        setCategories(categoriesWithStats.filter(cat => cat.subcategoryCount > 0))
        setMessage({ type: 'success', text: `${categoriesWithStats.length}個のカテゴリーを読み込みました` })
      } else {
        // フォールバック: DB APIが失敗した場合は基本データのみ
        const basicCategories = allCategories
          .filter(category => category.subcategories && category.subcategories.length > 0)
          .map(category => ({
            category_id: category.id,
            name: category.name,
            description: category.description || '',
            type: category.type,
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

  // 指定カテゴリーのサブカテゴリー一覧を読み込み
  const loadSubcategories = async (categoryId: string) => {
    if (!categoryId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/subcategories?parent_category_id=${categoryId}`)
      if (response.ok) {
        const data = await response.json()
        const subcategoriesData = data.subcategories || data
        
        // データを適切な形式に変換
        const formattedSubcategories = subcategoriesData.map((sub: { subcategory_id?: string; id?: string; name: string; description: string; parent_category_id?: string; display_order: number; is_active?: boolean; question_count?: number }) => ({
          subcategory_id: sub.subcategory_id || sub.id,
          name: sub.name,
          description: sub.description,
          parent_category_id: sub.parent_category_id || categoryId,
          display_order: sub.display_order,
          is_active: sub.is_active ?? true,
          questionCount: sub.question_count || 0
        }))
        
        // 並び順でソート
        formattedSubcategories.sort((a: SubcategoryWithStats, b: SubcategoryWithStats) => a.display_order - b.display_order)
        
        setSubcategories(formattedSubcategories)
        setMessage({ 
          type: 'success', 
          text: `${formattedSubcategories.length}個のサブカテゴリーを読み込みました` 
        })
      } else {
        throw new Error('API request failed')
      }
    } catch (error) {
      console.error('Error loading subcategories:', error)
      setMessage({ type: 'error', text: 'サブカテゴリーの読み込みに失敗しました' })
      setSubcategories([])
    }
    setLoading(false)
  }

  // サブカテゴリーの並び順を更新
  const handleSubcategoryReorder = async (
    reorderedSubcategories: SubcategoryWithStats[], 
    parentCategoryId: string
  ): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/subcategories/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subcategories: reorderedSubcategories.map(sub => ({
            subcategory_id: sub.subcategory_id,
            display_order: sub.display_order,
            parent_category_id: sub.parent_category_id
          })),
          parent_category_id: parentCategoryId
        })
      })

      if (response.ok) {
        // ローカル状態を更新
        setSubcategories(prev => {
          const updated = prev.map(sub => {
            const reordered = reorderedSubcategories.find(r => r.subcategory_id === sub.subcategory_id)
            return reordered ? { ...sub, display_order: reordered.display_order } : sub
          })
          return updated.sort((a, b) => a.display_order - b.display_order)
        })
        return true
      } else {
        throw new Error('Reorder API request failed')
      }
    } catch (error) {
      console.error('Error reordering subcategories:', error)
      return false
    }
  }

  // カテゴリー選択時の処理
  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId)
    setSubcategories([])
    if (categoryId) {
      loadSubcategories(categoryId)
    }
  }

  // 初期読み込み
  useEffect(() => {
    loadCategories()
  }, [])

  const selectedCategoryData = categories.find(cat => cat.category_id === selectedCategory)
  const totalSubcategories = subcategories.length
  const activeSubcategories = subcategories.filter(sub => sub.is_active).length
  const totalQuestions = subcategories.reduce((sum, sub) => sum + (sub.questionCount || 0), 0)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <span>サブカテゴリー管理</span>
            <ArrowUpDown className="h-6 w-6 text-blue-500" />
          </h1>
          <p className="text-muted-foreground">
            サブカテゴリーの並び順をドラッグ&ドロップで管理できます
          </p>
        </div>
        <Button onClick={loadCategories} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          再読み込み
        </Button>
      </div>

      {/* メッセージ表示 */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500' : message.type === 'success' ? 'border-green-500' : 'border-blue-500'}>
          {message.type === 'error' && <AlertTriangle className="h-4 w-4" />}
          {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* カテゴリー選択 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FolderTree className="h-5 w-5" />
            <span>カテゴリー選択</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="編集するカテゴリーを選択してください" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.category_id} value={category.category_id}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <span className="font-medium">{category.name}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({category.subcategoryCount}個のサブカテゴリー)
                        </span>
                      </div>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {category.type === 'main' ? 'メイン' : '業界'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedCategoryData && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800">{selectedCategoryData.name}</h3>
                <p className="text-sm text-blue-600">{selectedCategoryData.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 統計サマリー（選択時のみ表示） */}
      {selectedCategory && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2">
                <BarChart3 className="h-8 w-8 text-blue-500" />
                <div className="text-center">
                  <div className="text-2xl font-bold">{totalSubcategories}</div>
                  <div className="text-sm text-muted-foreground">総サブカテゴリー</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{activeSubcategories}</div>
                  <div className="text-sm text-muted-foreground">有効</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2">
                <AlertTriangle className="h-8 w-8 text-yellow-500" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{totalSubcategories - activeSubcategories}</div>
                  <div className="text-sm text-muted-foreground">無効</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-center space-x-2">
                <BarChart3 className="h-8 w-8 text-purple-500" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{totalQuestions}</div>
                  <div className="text-sm text-muted-foreground">総問題数</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* サブカテゴリー並び順編集 */}
      {selectedCategory && selectedCategoryData && (
        <DraggableSubcategoryList
          subcategories={subcategories}
          onReorder={handleSubcategoryReorder}
          parentCategoryId={selectedCategory}
          parentCategoryName={selectedCategoryData.name}
        />
      )}

      {/* 操作ガイド */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-800">操作ガイド</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-700">
          <ul className="space-y-2 text-sm">
            <li>• <strong>カテゴリー選択</strong>: 編集するカテゴリーをドロップダウンから選択してください</li>
            <li>• <strong>ドラッグ&ドロップ</strong>: サブカテゴリーを上下にドラッグして並び順を変更できます</li>
            <li>• <strong>保存</strong>: 変更後は必ず「保存」ボタンをクリックしてください</li>
            <li>• <strong>リセット</strong>: 変更を元に戻したい場合は「リセット」ボタンを使用してください</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}