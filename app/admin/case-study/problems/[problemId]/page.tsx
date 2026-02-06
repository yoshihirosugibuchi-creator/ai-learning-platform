'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Briefcase,
  Save,
  ArrowLeft,
  Edit,
  Eye,
  Calendar,
  Star,
  Users,
  BarChart3,
  RefreshCw,
  Link as LinkIcon,
  Trash2,
  Plus,
  Pencil,
  Check,
  ChevronsUpDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import StepEditor from '@/components/case-study/StepEditor'

interface StepOption {
  id: string
  text: string
  is_correct: boolean
  partial_score: number
}

interface ModelAnswer {
  ideal_choices?: string[]
  acceptable_choices?: string[]
  essential_points?: string[]
  scoring_anchors?: Record<string, string>
}

interface Step {
  id?: string
  problem_id?: string
  step_number: number
  step_name: string
  description: string
  category_id: string
  subcategory_id: string
  question_type: string
  options: StepOption[] | null
  model_answer: ModelAnswer
  hint: string | null
  target_skills: string[]
  max_score: number
  display_order: number | null
}

interface Category {
  category_id: string
  name: string
  type?: string
}

interface Subcategory {
  id: string
  name: string
}

interface Problem {
  id: string
  title: string
  case_text: string
  primary_category_id: string
  primary_subcategory_id: string
  difficulty: string
  industry: string | null
  scenario_type: string | null
  estimated_minutes: number
  step_count: number
  status: string
  featured_date: string | null
  created_at: string
  updated_at: string
  created_by: string | null
  scoring_ai_provider: string | null
}

interface CourseLink {
  id: string
  problem_id: string
  course_id: string
  session_id: string | null
  link_type: string
  display_order: number
  is_required: boolean
}

interface Stats {
  total_sessions: number
  completed_sessions: number
  avg_score: number
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '下書き', color: 'bg-gray-100 text-gray-800' },
  review: { label: 'レビュー', color: 'bg-yellow-100 text-yellow-800' },
  active: { label: '公開中', color: 'bg-green-100 text-green-800' },
  archived: { label: 'アーカイブ', color: 'bg-red-100 text-red-800' },
}

const difficultyConfig: Record<string, { label: string; color: string }> = {
  basic: { label: '初級', color: 'bg-blue-100 text-blue-800' },
  intermediate: { label: '中級', color: 'bg-purple-100 text-purple-800' },
  advanced: { label: '上級', color: 'bg-orange-100 text-orange-800' },
  expert: { label: 'エキスパート', color: 'bg-red-100 text-red-800' },
}

export default function CaseStudyProblemDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const problemId = params.problemId as string
  const isNew = problemId === 'new'
  const initialEditMode = isNew || searchParams.get('edit') === 'true'

  const [editMode, setEditMode] = useState(initialEditMode)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)

  const [problem, setProblem] = useState<Problem | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [stats, setStats] = useState<Stats>({ total_sessions: 0, completed_sessions: 0, avg_score: 0 })
  const [courseLinks, setCourseLinks] = useState<CourseLink[]>([])

  // ステップ編集用state
  const [categories, setCategories] = useState<Category[]>([])
  const [industryCategories, setIndustryCategories] = useState<Category[]>([])
  const [stepEditorOpen, setStepEditorOpen] = useState(false)
  const [editingStep, setEditingStep] = useState<Step | null>(null)
  const [newStepNumber, setNewStepNumber] = useState(1)

  // コース連動用state（1つのみ）
  const [availableCourses, setAvailableCourses] = useState<{ id: string; title: string }[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [courseComboOpen, setCourseComboOpen] = useState(false)

  // AI採点デフォルトプロバイダー
  const [defaultAiProvider, setDefaultAiProvider] = useState('huggingface')

  // ステップフレームワークマスタ
  const [stepFrameworkOptions, setStepFrameworkOptions] = useState<{
    id: string
    code: string
    name: string
    description: string
    display_order: number
    target_skills: string[] | null
    is_extended: boolean
  }[]>([])

  // 問題カテゴリー選択用state
  const [problemSubcategories, setProblemSubcategories] = useState<Subcategory[]>([])
  const [loadingProblemSub, setLoadingProblemSub] = useState(false)

  // 編集用form state
  const [formData, setFormData] = useState({
    title: '',
    case_text: '',
    primary_category_id: '',
    primary_subcategory_id: '',
    difficulty: 'intermediate',
    industry: '',
    scenario_type: '',
    estimated_minutes: 30,
    step_count: 5,
    status: 'draft',
    featured_date: '',
    scoring_ai_provider: '',
  })

  // API認証ヘッダー取得
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { 'Authorization': `Bearer ${session.access_token}` }
    }
    if (process.env.NODE_ENV === 'development') {
      return {
        'x-test-user-id': '82413077-a06d-4d9c-82bb-6fdb6a6b8e13',
        'x-test-role': 'admin'
      }
    }
    return {}
  }, [])

  // カテゴリー取得
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories')
      const data = await res.json()
      if (data.categories) {
        const activeCategories = data.categories.filter((c: Category & { is_active?: boolean; type?: string }) => c.is_active !== false)
        // カテゴリー: main + industry 両方から選択可能
        setCategories(activeCategories)
        // 業界: industryタイプのみ
        setIndustryCategories(activeCategories.filter((c: Category & { type?: string }) => c.type === 'industry'))
      }
    } catch (error) {
      console.error('Categories fetch error:', error)
    }
  }, [])

  // サブカテゴリー取得
  const loadSubcategories = useCallback(async (categoryId: string): Promise<Subcategory[]> => {
    try {
      const res = await fetch(`/api/admin/categories/${categoryId}/subcategories`)
      const data = await res.json()
      return data.subcategories || []
    } catch (error) {
      console.error('Subcategories fetch error:', error)
      return []
    }
  }, [])

  // AI採点デフォルトプロバイダー取得
  const fetchAiSettings = useCallback(async () => {
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/admin/case-study/ai-settings', { headers: authHeaders })
      if (!res.ok) {
        console.error('AI settings fetch failed:', res.status)
        return
      }
      const data = await res.json()
      if (data.success && data.default_provider) {
        setDefaultAiProvider(data.default_provider)
      }
    } catch (error) {
      console.error('AI settings fetch error:', error)
    }
  }, [getAuthHeaders])

  // コース一覧取得
  const fetchCourses = useCallback(async () => {
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/admin/courses', { headers: authHeaders })
      if (!res.ok) {
        console.error('Courses fetch failed:', res.status)
        return
      }
      const data = await res.json()
      if (data.courses) {
        setAvailableCourses(data.courses.map((c: { id: string; title: string }) => ({ id: c.id, title: c.title })))
      }
    } catch (error) {
      console.error('Courses fetch error:', error)
    }
  }, [getAuthHeaders])

  // ステップフレームワークマスタ取得
  const fetchStepFrameworkOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/case-study/options?type=step_framework')
      if (!res.ok) {
        console.error('Step framework fetch failed:', res.status)
        return
      }
      const data = await res.json()
      if (data.success && data.options) {
        setStepFrameworkOptions(data.options)
      }
    } catch (error) {
      console.error('Step framework fetch error:', error)
    }
  }, [])

  // ステップ追加
  const handleAddStep = () => {
    setEditingStep(null)
    setNewStepNumber(steps.length + 1)
    setStepEditorOpen(true)
  }

  // ステップ編集
  const handleEditStep = (step: Step) => {
    setEditingStep(step)
    setNewStepNumber(step.step_number)
    setStepEditorOpen(true)
  }

  // ステップ保存
  const handleSaveStep = useCallback(async (stepData: Step) => {
    const authHeaders = await getAuthHeaders()

    if (editingStep?.id) {
      // 更新
      const res = await fetch(`/api/admin/case-study/steps/${editingStep.id}`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(stepData)
      })
      const data = await res.json()

      if (data.success) {
        setSteps(prev => prev.map(s => s.id === editingStep.id ? data.step : s))
        toast({ title: '成功', description: 'ステップを更新しました' })
      } else {
        toast({ title: 'エラー', description: data.error, variant: 'destructive' })
        throw new Error(data.error)
      }
    } else {
      // 新規作成
      const res = await fetch(`/api/admin/case-study/problems/${problemId}/steps`, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...stepData,
          problem_id: problemId,
        })
      })
      const data = await res.json()

      if (data.success) {
        setSteps(prev => [...prev, data.step])
        toast({ title: '成功', description: 'ステップを追加しました' })
      } else {
        toast({ title: 'エラー', description: data.error, variant: 'destructive' })
        throw new Error(data.error)
      }
    }
  }, [editingStep, problemId, getAuthHeaders, toast])

  // ステップ削除
  const handleDeleteStep = useCallback(async (stepId: string | undefined) => {
    if (!stepId) return
    if (!confirm('このステップを削除しますか？')) return

    const authHeaders = await getAuthHeaders()
    const res = await fetch(`/api/admin/case-study/steps/${stepId}`, {
      method: 'DELETE',
      headers: authHeaders
    })
    const data = await res.json()

    if (data.success) {
      setSteps(prev => prev.filter(s => s.id !== stepId))
      toast({ title: '成功', description: 'ステップを削除しました' })
    } else {
      toast({ title: 'エラー', description: data.error, variant: 'destructive' })
    }
  }, [getAuthHeaders, toast])

  // 問題詳細取得
  const fetchProblem = useCallback(async () => {
    if (isNew) return
    setLoading(true)
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch(`/api/admin/case-study/problems/${problemId}`, {
        headers: authHeaders
      })
      const data = await res.json()

      if (data.success) {
        setProblem(data.problem)
        setSteps(data.steps || [])
        setStats(data.stats || { total_sessions: 0, completed_sessions: 0, avg_score: 0 })
        setCourseLinks(data.course_links || [])
        // コース連動が1つあればselectedCourseIdに設定、なければリセット
        if (data.course_links && data.course_links.length > 0) {
          setSelectedCourseId(data.course_links[0].course_id)
        } else {
          setSelectedCourseId('')
        }

        // formDataに反映
        setFormData({
          title: data.problem.title || '',
          case_text: data.problem.case_text || '',
          primary_category_id: data.problem.primary_category_id || '',
          primary_subcategory_id: data.problem.primary_subcategory_id || '',
          difficulty: data.problem.difficulty || 'intermediate',
          industry: data.problem.industry || '',
          scenario_type: data.problem.scenario_type || '',
          estimated_minutes: data.problem.estimated_minutes || 30,
          step_count: data.problem.step_count || 5,
          status: data.problem.status || 'draft',
          featured_date: data.problem.featured_date || '',
          scoring_ai_provider: data.problem.scoring_ai_provider || '',
        })
      } else {
        toast({ title: 'エラー', description: data.error, variant: 'destructive' })
        router.push('/admin/case-study')
      }
    } catch {
      toast({ title: 'エラー', description: '問題の取得に失敗しました', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [problemId, isNew, getAuthHeaders, toast, router])

  useEffect(() => {
    fetchProblem()
    fetchCategories()
    fetchAiSettings()
    fetchCourses()
    fetchStepFrameworkOptions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId])

  // 問題カテゴリー変更時にサブカテゴリー取得
  useEffect(() => {
    if (!formData.primary_category_id) {
      setProblemSubcategories([])
      return
    }
    setLoadingProblemSub(true)
    loadSubcategories(formData.primary_category_id)
      .then((subs) => {
        setProblemSubcategories(subs)
      })
      .finally(() => setLoadingProblemSub(false))
  }, [formData.primary_category_id, loadSubcategories])

  // 保存（問題情報 + コース連動を一括保存）
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({ title: 'エラー', description: 'タイトルは必須です', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const authHeaders = await getAuthHeaders()

      // 1. 問題情報を保存
      const url = isNew
        ? '/api/admin/case-study/problems'
        : `/api/admin/case-study/problems/${problemId}`
      const method = isNew ? 'POST' : 'PUT'

      // step_countは除外（ステップ追加・削除で自動更新される）
      const { step_count: _unusedStepCount, ...formDataWithoutStepCount } = formData
      const body = {
        ...formDataWithoutStepCount,
        industry: formData.industry || null,
        scenario_type: formData.scenario_type || null,
        featured_date: formData.featured_date || null,
        scoring_ai_provider: formData.scoring_ai_provider || null,
      }

      const res = await fetch(url, {
        method,
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()

      if (!data.success) {
        toast({ title: 'エラー', description: data.error, variant: 'destructive' })
        return
      }

      // 2. コース連動を保存（既存と変更があれば）
      let courseLinkSaved = true
      if (!isNew) {
        const currentLinkCourseId = courseLinks[0]?.course_id || ''
        if (selectedCourseId !== currentLinkCourseId) {
          // 既存のリンクを削除
          for (const link of courseLinks) {
            const deleteRes = await fetch(`/api/admin/case-study/course-links/${link.id}`, {
              method: 'DELETE',
              headers: authHeaders
            })
            if (!deleteRes.ok) {
              console.error('Failed to delete course link:', link.id)
            }
          }
          // 新しいリンクを作成
          if (selectedCourseId) {
            const linkRes = await fetch('/api/admin/case-study/course-links', {
              method: 'POST',
              headers: { ...authHeaders, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                problem_id: problemId,
                course_id: selectedCourseId,
              })
            })
            const linkData = await linkRes.json()
            if (linkData.success && linkData.link) {
              setCourseLinks([linkData.link])
            } else {
              courseLinkSaved = false
              toast({ title: '警告', description: 'コース連動の保存に失敗しました: ' + (linkData.error || ''), variant: 'destructive' })
            }
          } else {
            // コース連動を解除
            setCourseLinks([])
          }
        }
      }

      if (courseLinkSaved) {
        toast({ title: '成功', description: isNew ? '問題を作成しました' : '問題を更新しました' })
      }
      if (isNew) {
        router.push(`/admin/case-study/problems/${data.problem.id}`)
      } else {
        // 問題情報のstateを更新
        setProblem(data.problem)
        setEditMode(false)
      }
    } catch {
      toast({ title: 'エラー', description: '保存に失敗しました', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/case-study')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            一覧に戻る
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <h1 className="text-xl font-bold">
            {isNew ? '新規問題作成' : editMode ? '問題編集' : '問題詳細'}
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          {!isNew && !editMode && (
            <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
              <Edit className="h-4 w-4 mr-1" />
              編集
            </Button>
          )}
          {editMode && !isNew && (
            <Button variant="outline" size="sm" onClick={() => { setEditMode(false); fetchProblem() }}>
              キャンセル
            </Button>
          )}
          {editMode && (
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              {isNew ? '作成' : '保存'}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* メインコンテンツ */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本情報 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Briefcase className="h-5 w-5 mr-2 text-teal-600" />
                基本情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>タイトル</Label>
                {editMode ? (
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="問題タイトルを入力"
                  />
                ) : (
                  <p className="text-lg font-medium mt-1">{problem?.title}</p>
                )}
              </div>

              <div>
                <Label>ケーステキスト</Label>
                {editMode ? (
                  <Textarea
                    value={formData.case_text}
                    onChange={(e) => setFormData(prev => ({ ...prev, case_text: e.target.value }))}
                    placeholder="ケーステキストを入力"
                    rows={8}
                  />
                ) : (
                  <div className="mt-1 p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                    {problem?.case_text || '(未設定)'}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>カテゴリー</Label>
                  {editMode ? (
                    <Select
                      value={formData.primary_category_id}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, primary_category_id: v, primary_subcategory_id: '' }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="カテゴリーを選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.category_id} value={cat.category_id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm mt-1">
                      {categories.find(c => c.category_id === problem?.primary_category_id)?.name || problem?.primary_category_id || '-'}
                    </p>
                  )}
                </div>
                <div>
                  <Label>サブカテゴリー</Label>
                  {editMode ? (
                    <Select
                      value={formData.primary_subcategory_id}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, primary_subcategory_id: v }))}
                      disabled={loadingProblemSub || problemSubcategories.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={loadingProblemSub ? '読み込み中...' : 'サブカテゴリーを選択'} />
                      </SelectTrigger>
                      <SelectContent>
                        {problemSubcategories.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm mt-1">
                      {problemSubcategories.find(s => s.id === problem?.primary_subcategory_id)?.name || problem?.primary_subcategory_id || '-'}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>業界</Label>
                  {editMode ? (
                    <Select
                      value={formData.industry}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, industry: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="業界を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {industryCategories.map((cat) => (
                          <SelectItem key={cat.category_id} value={cat.category_id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm mt-1">
                      {industryCategories.find(c => c.category_id === problem?.industry)?.name || problem?.industry || '-'}
                    </p>
                  )}
                </div>
                <div>
                  <Label>シナリオタイプ</Label>
                  {editMode ? (
                    <Input
                      value={formData.scenario_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, scenario_type: e.target.value }))}
                      placeholder="例: 経営判断, 問題解決"
                    />
                  ) : (
                    <p className="text-sm mt-1">{problem?.scenario_type || '-'}</p>
                  )}
                </div>
                <div>
                  <Label>想定時間（分）</Label>
                  {editMode ? (
                    <Input
                      type="number"
                      value={formData.estimated_minutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimated_minutes: parseInt(e.target.value) || 30 }))}
                      min={5}
                      max={120}
                    />
                  ) : (
                    <p className="text-sm mt-1">{problem?.estimated_minutes || 30}分</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ステップ一覧 */}
          {!isNew && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>ステップ一覧</span>
                  <Button size="sm" variant="outline" onClick={handleAddStep}>
                    <Plus className="h-4 w-4 mr-1" />
                    ステップ追加
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {steps.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground text-sm mb-4">
                      ステップが未設定です
                    </p>
                    <Button variant="outline" onClick={handleAddStep}>
                      <Plus className="h-4 w-4 mr-1" />
                      最初のステップを追加
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {steps.map((step) => (
                      <div key={step.id} className="flex items-start space-x-3 p-3 bg-muted/50 rounded-lg group">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-teal-100 text-teal-700 text-sm font-bold shrink-0">
                          {step.step_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{step.step_name}</div>
                          <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {step.description || '(説明なし)'}
                          </div>
                          <div className="flex items-center space-x-2 mt-2">
                            <Badge variant="outline" className="text-xs">{step.question_type}</Badge>
                            <Badge variant="outline" className="text-xs">最大{step.max_score}点</Badge>
                            {step.target_skills?.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                スキル: {step.target_skills.length}軸
                              </Badge>
                            )}
                            {step.hint && (
                              <Badge variant="secondary" className="text-xs">ヒントあり</Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => handleEditStep(step)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            編集
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-600"
                            onClick={() => handleDeleteStep(step.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* コース連動 */}
          {!isNew && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <LinkIcon className="h-5 w-5 mr-2 text-blue-600" />
                  コース連動
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>連動コース（任意）</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    この問題に関連するコース学習を1つ選択できます
                  </p>
                  <Popover open={courseComboOpen} onOpenChange={setCourseComboOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={courseComboOpen}
                        className="w-full justify-between font-normal"
                        disabled={!editMode}
                      >
                        {selectedCourseId
                          ? availableCourses.find((c) => c.id === selectedCourseId)?.title || '選択中...'
                          : '連動なし'}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="コースを検索..." />
                        <CommandList>
                          <CommandEmpty>コースが見つかりません</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value=""
                              onSelect={() => {
                                setSelectedCourseId('')
                                setCourseComboOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  !selectedCourseId ? "opacity-100" : "opacity-0"
                                )}
                              />
                              連動なし
                            </CommandItem>
                            {availableCourses.map((course) => (
                              <CommandItem
                                key={course.id}
                                value={course.title}
                                onSelect={() => {
                                  setSelectedCourseId(course.id)
                                  setCourseComboOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedCourseId === course.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {course.title}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* サイドバー */}
        <div className="space-y-6">
          {/* ステータス・設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>ステータス</Label>
                {editMode ? (
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">下書き</SelectItem>
                      <SelectItem value="review">レビュー</SelectItem>
                      <SelectItem value="active">公開中</SelectItem>
                      <SelectItem value="archived">アーカイブ</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1">
                    <Badge className={statusConfig[problem?.status || 'draft']?.color}>
                      {statusConfig[problem?.status || 'draft']?.label}
                    </Badge>
                  </div>
                )}
              </div>

              <div>
                <Label>難易度</Label>
                {editMode ? (
                  <Select
                    value={formData.difficulty}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, difficulty: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">初級</SelectItem>
                      <SelectItem value="intermediate">中級</SelectItem>
                      <SelectItem value="advanced">上級</SelectItem>
                      <SelectItem value="expert">エキスパート</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1">
                    <Badge className={difficultyConfig[problem?.difficulty || 'intermediate']?.color}>
                      {difficultyConfig[problem?.difficulty || 'intermediate']?.label}
                    </Badge>
                  </div>
                )}
              </div>

              <div>
                <Label>ステップ数</Label>
                <p className="text-sm mt-1">
                  {isNew ? '0' : steps.length}ステップ
                  {!isNew && steps.length !== (problem?.step_count || 0) && (
                    <span className="text-xs text-muted-foreground ml-2">(DB: {problem?.step_count || 0})</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ※ステップ一覧から追加・削除で変更
                </p>
              </div>

              <div>
                <Label>注目日</Label>
                {editMode ? (
                  <Input
                    type="date"
                    value={formData.featured_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, featured_date: e.target.value }))}
                  />
                ) : (
                  <p className="text-sm mt-1 flex items-center">
                    {problem?.featured_date ? (
                      <>
                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                        {problem.featured_date}
                      </>
                    ) : (
                      <span className="text-muted-foreground">未設定</span>
                    )}
                  </p>
                )}
              </div>

              <Separator />

              <div>
                <Label>採点AIプロバイダー</Label>
                {editMode ? (
                  <Select
                    value={formData.scoring_ai_provider || 'default'}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, scoring_ai_provider: v === 'default' ? '' : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">
                        システムデフォルト ({defaultAiProvider === 'huggingface' ? 'HuggingFace' : defaultAiProvider})
                      </SelectItem>
                      <SelectItem value="huggingface">HuggingFace</SelectItem>
                      <SelectItem value="openai" disabled>OpenAI (準備中)</SelectItem>
                      <SelectItem value="anthropic" disabled>Claude (準備中)</SelectItem>
                      <SelectItem value="gemini" disabled>Gemini (準備中)</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm mt-1">
                    {problem?.scoring_ai_provider
                      ? (problem.scoring_ai_provider === 'huggingface' ? 'HuggingFace' : problem.scoring_ai_provider)
                      : `システムデフォルト (${defaultAiProvider === 'huggingface' ? 'HuggingFace' : defaultAiProvider})`
                    }
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 統計 */}
          {!isNew && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                  統計
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm">
                    <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                    総セッション数
                  </div>
                  <span className="font-medium">{stats.total_sessions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm">
                    <Eye className="h-4 w-4 mr-1 text-muted-foreground" />
                    完了数
                  </div>
                  <span className="font-medium">{stats.completed_sessions}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm">
                    <BarChart3 className="h-4 w-4 mr-1 text-muted-foreground" />
                    平均スコア
                  </div>
                  <span className="font-medium">{stats.avg_score.toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* メタ情報 */}
          {!isNew && problem && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">メタ情報</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">作成日</span>
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(problem.created_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">更新日</span>
                  <span className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(problem.updated_at).toLocaleDateString('ja-JP')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">問題ID</span>
                  <span className="font-mono text-xs">{problem.id.substring(0, 8)}...</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ステップ編集モーダル */}
      <StepEditor
        step={editingStep}
        stepNumber={newStepNumber}
        isOpen={stepEditorOpen}
        onClose={() => {
          setStepEditorOpen(false)
          setEditingStep(null)
        }}
        onSave={handleSaveStep}
        categories={categories}
        loadSubcategories={loadSubcategories}
        stepFrameworkOptions={stepFrameworkOptions}
      />

    </div>
  )
}
