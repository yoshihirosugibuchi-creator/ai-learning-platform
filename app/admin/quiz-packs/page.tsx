'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Package,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Loader2,
  Users,
  BarChart,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

interface Subcategory {
  subcategory_id: string
  name: string
  parent_category_id: string
}

interface Category {
  category_id: string
  name: string
  type: string
}

interface QuizPack {
  id: string
  name: string
  description: string | null
  question_count: number
  categories: string[]
  subcategories: string[] | null
  difficulties: string[]
  is_published: boolean
  display_order: number
  icon_emoji: string
  color_theme: string
  total_attempts: number
  average_score: number | null
  created_at: string
}

// 難易度オプションはskill_levelsテーブルから動的に取得
interface SkillLevel {
  id: string
  name: string
  display_name: string
  display_order: number
}

const colorThemes = [
  { value: 'primary', label: 'プライマリー' },
  { value: 'blue', label: 'ブルー' },
  { value: 'green', label: 'グリーン' },
  { value: 'orange', label: 'オレンジ' },
  { value: 'purple', label: 'パープル' },
  { value: 'red', label: 'レッド' },
]

const emojiOptions = ['📝', '🎯', '💡', '🚀', '⭐', '🔥', '💪', '🏆', '📚', '🧠']

export default function QuizPacksAdminPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [packs, setPacks] = useState<QuizPack[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [skillLevels, setSkillLevels] = useState<SkillLevel[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPack, setEditingPack] = useState<QuizPack | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])

  // フォーム状態
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    question_count: 10,
    categories: [] as string[],
    subcategories: [] as string[],
    difficulties: [] as string[],
    is_published: false,
    icon_emoji: '📝',
    color_theme: 'primary',
  })

  const fetchData = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) return

      // パック一覧、カテゴリー、サブカテゴリー、難易度を並行取得
      const [packsRes, categoriesRes, subcategoriesRes, skillLevelsData] = await Promise.all([
        fetch('/api/admin/quiz-packs', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/categories?active_only=true', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/subcategories?active_only=true', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        // skill_levelsテーブルから難易度を直接取得
        supabase.from('skill_levels').select('id, name, display_name, display_order').order('display_order')
      ])

      if (packsRes.ok) {
        const data = await packsRes.json()
        if (data.success) {
          setPacks(data.packs)
        }
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json()
        if (data.categories) {
          setCategories(data.categories)
        }
      }

      if (subcategoriesRes.ok) {
        const data = await subcategoriesRes.json()
        if (data.subcategories) {
          setSubcategories(data.subcategories)
        }
      }

      // skill_levelsの設定
      if (skillLevelsData.data) {
        setSkillLevels(skillLevelsData.data)
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast({ title: 'データの取得に失敗しました', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (user) {
      fetchData()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      question_count: 10,
      categories: [],
      subcategories: [],
      difficulties: [],
      is_published: false,
      icon_emoji: '📝',
      color_theme: 'primary',
    })
    setEditingPack(null)
    setExpandedCategories([])
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (pack: QuizPack) => {
    setEditingPack(pack)
    setFormData({
      name: pack.name,
      description: pack.description || '',
      question_count: pack.question_count,
      categories: pack.categories || [],
      subcategories: pack.subcategories || [],
      difficulties: pack.difficulties || [],
      is_published: pack.is_published,
      icon_emoji: pack.icon_emoji || '📝',
      color_theme: pack.color_theme || 'primary',
    })
    // 選択済みカテゴリーを展開
    setExpandedCategories(pack.categories || [])
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'パック名を入力してください', variant: 'destructive' })
      return
    }
    if (formData.categories.length === 0) {
      toast({ title: 'カテゴリーを選択してください', variant: 'destructive' })
      return
    }
    if (formData.difficulties.length === 0) {
      toast({ title: '難易度を選択してください', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) return

      const url = editingPack
        ? `/api/admin/quiz-packs/${editingPack.id}`
        : '/api/admin/quiz-packs'

      const method = editingPack ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (data.success) {
        toast({ title: editingPack ? 'パックを更新しました' : 'パックを作成しました' })
        setIsDialogOpen(false)
        resetForm()
        fetchData()
      } else {
        toast({ title: data.error || '保存に失敗しました', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Save error:', error)
      toast({ title: '保存に失敗しました', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (pack: QuizPack) => {
    if (!confirm(`「${pack.name}」を削除しますか？`)) return

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) return

      const response = await fetch(`/api/admin/quiz-packs/${pack.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        toast({ title: data.message || 'パックを削除しました' })
        fetchData()
      } else {
        toast({ title: data.error || '削除に失敗しました', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({ title: '削除に失敗しました', variant: 'destructive' })
    }
  }

  const handleTogglePublish = async (pack: QuizPack) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) return

      const response = await fetch(`/api/admin/quiz-packs/${pack.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_published: !pack.is_published })
      })

      const data = await response.json()

      if (data.success) {
        toast({ title: pack.is_published ? '非公開にしました' : '公開しました' })
        fetchData()
      } else {
        toast({ title: data.error || '更新に失敗しました', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Toggle publish error:', error)
      toast({ title: '更新に失敗しました', variant: 'destructive' })
    }
  }

  // カテゴリーのトグル
  const toggleCategory = (categoryId: string) => {
    setFormData(prev => {
      const isSelected = prev.categories.includes(categoryId)
      if (isSelected) {
        // カテゴリーを解除する場合、そのカテゴリーのサブカテゴリーも解除
        const subsToRemove = subcategories
          .filter(s => s.parent_category_id === categoryId)
          .map(s => s.subcategory_id)
        return {
          ...prev,
          categories: prev.categories.filter(id => id !== categoryId),
          subcategories: prev.subcategories.filter(id => !subsToRemove.includes(id))
        }
      } else {
        // カテゴリーを選択（サブカテゴリーは未選択のまま = 全て対象）
        return {
          ...prev,
          categories: [...prev.categories, categoryId]
        }
      }
    })
  }

  // サブカテゴリーのトグル
  const toggleSubcategory = (subcategoryId: string) => {
    setFormData(prev => ({
      ...prev,
      subcategories: prev.subcategories.includes(subcategoryId)
        ? prev.subcategories.filter(id => id !== subcategoryId)
        : [...prev.subcategories, subcategoryId]
    }))
  }

  // カテゴリーの展開トグル
  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  // 難易度のトグル
  const toggleDifficulty = (difficulty: string) => {
    setFormData(prev => ({
      ...prev,
      difficulties: prev.difficulties.includes(difficulty)
        ? prev.difficulties.filter(d => d !== difficulty)
        : [...prev.difficulties, difficulty]
    }))
  }

  // カテゴリー名の取得
  const getCategoryNames = (categoryIds: string[]) => {
    return categoryIds
      .map(id => categories.find(c => c.category_id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  // 難易度ラベルの取得
  const getDifficultyLabels = (difficulties: string[]) => {
    return difficulties
      .map(d => skillLevels.find(s => s.id === d)?.display_name)
      .filter(Boolean)
      .join(', ')
  }

  // カテゴリー配下のサブカテゴリーを取得
  const getSubcategoriesForCategory = (categoryId: string) => {
    return subcategories.filter(s => s.parent_category_id === categoryId)
  }

  // 選択済みサブカテゴリー数を取得
  const getSelectedSubcategoryCount = (categoryId: string) => {
    const subs = getSubcategoriesForCategory(categoryId)
    return formData.subcategories.filter(id =>
      subs.some(s => s.subcategory_id === id)
    ).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            クイズパック管理
          </h1>
          <p className="text-muted-foreground">
            カテゴリー・難易度を条件設定したクイズパックを作成・管理します
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </div>

      {/* パック一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>パック一覧（{packs.length}件）</CardTitle>
        </CardHeader>
        <CardContent>
          {packs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              クイズパックがありません
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>パック名</TableHead>
                  <TableHead>カテゴリー</TableHead>
                  <TableHead>難易度</TableHead>
                  <TableHead className="text-center">問題数</TableHead>
                  <TableHead className="text-center">受験数</TableHead>
                  <TableHead className="text-center">平均点</TableHead>
                  <TableHead className="text-center">公開</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packs.map((pack) => (
                  <TableRow key={pack.id}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{pack.icon_emoji}</span>
                        <span className="font-medium">{pack.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {getCategoryNames(pack.categories)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {getDifficultyLabels(pack.difficulties)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">{pack.question_count}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {pack.total_attempts}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {pack.average_score !== null ? (
                        <div className="flex items-center justify-center gap-1">
                          <BarChart className="h-3 w-3 text-muted-foreground" />
                          {pack.average_score.toFixed(1)}%
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTogglePublish(pack)}
                      >
                        {pack.is_published ? (
                          <Eye className="h-4 w-4 text-green-600" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(pack)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(pack)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* 作成・編集ダイアログ */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) { setIsDialogOpen(false); resetForm() } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPack ? 'クイズパック編集' : '新規クイズパック作成'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* 基本情報 */}
            <div className="space-y-4">
              <div className="grid grid-cols-[auto_1fr] gap-4">
                <div>
                  <Label>アイコン</Label>
                  <Select
                    value={formData.icon_emoji}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, icon_emoji: value }))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {emojiOptions.map(emoji => (
                        <SelectItem key={emoji} value={emoji}>{emoji}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="name">パック名 *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="例: AI検定合格マスタークイズ"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="パックの説明（任意）"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="question_count">問題数</Label>
                  <Input
                    id="question_count"
                    type="number"
                    min={10}
                    value={formData.question_count}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      question_count: Math.max(10, parseInt(e.target.value) || 10)
                    }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">最低10問</p>
                </div>
                <div>
                  <Label>カラーテーマ</Label>
                  <Select
                    value={formData.color_theme}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, color_theme: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorThemes.map(theme => (
                        <SelectItem key={theme.value} value={theme.value}>{theme.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* カテゴリー・サブカテゴリー選択 */}
            <div>
              <Label className="mb-2 block">カテゴリー・サブカテゴリー選択 *</Label>
              <p className="text-xs text-muted-foreground mb-2">
                カテゴリーを選択後、必要に応じてサブカテゴリーを絞り込めます（未選択=全て対象）
              </p>
              <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                {categories.map(category => {
                  const isSelected = formData.categories.includes(category.category_id)
                  const isExpanded = expandedCategories.includes(category.category_id)
                  const subs = getSubcategoriesForCategory(category.category_id)
                  const selectedSubCount = getSelectedSubcategoryCount(category.category_id)

                  return (
                    <div key={category.category_id} className="border rounded-md">
                      <div className="flex items-center p-2 hover:bg-muted/50">
                        <Checkbox
                          id={`cat-${category.category_id}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleCategory(category.category_id)}
                        />
                        <label
                          htmlFor={`cat-${category.category_id}`}
                          className="flex-1 ml-2 text-sm font-medium cursor-pointer"
                        >
                          {category.name}
                        </label>
                        {isSelected && subs.length > 0 && (
                          <>
                            <span className="text-xs text-muted-foreground mr-2">
                              {selectedSubCount > 0
                                ? `${selectedSubCount}/${subs.length}選択`
                                : '全て対象'}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpand(category.category_id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>

                      {isSelected && isExpanded && subs.length > 0 && (
                        <div className="border-t bg-muted/30 p-2 pl-8 space-y-1">
                          {subs.map(sub => (
                            <div key={sub.subcategory_id} className="flex items-center">
                              <Checkbox
                                id={`sub-${sub.subcategory_id}`}
                                checked={formData.subcategories.includes(sub.subcategory_id)}
                                onCheckedChange={() => toggleSubcategory(sub.subcategory_id)}
                              />
                              <label
                                htmlFor={`sub-${sub.subcategory_id}`}
                                className="ml-2 text-xs cursor-pointer"
                              >
                                {sub.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 難易度選択 */}
            <div>
              <Label className="mb-2 block">難易度 *</Label>
              <div className="flex flex-wrap gap-2">
                {skillLevels.map(level => (
                  <Badge
                    key={level.id}
                    variant={formData.difficulties.includes(level.id) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleDifficulty(level.id)}
                  >
                    {level.display_name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 公開設定 */}
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
              />
              <Label>公開する</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm() }}>
              キャンセル
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingPack ? '更新' : '作成'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
