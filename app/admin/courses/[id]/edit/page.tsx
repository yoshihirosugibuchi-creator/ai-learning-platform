'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ChevronLeft, 
  Save, 
  RefreshCw,
  Edit,
  Palette,
  Clock,
  BarChart3,
  Award,
  BookOpen,
  FileText,
  HelpCircle,
  Layers,
  Gift,
  Sparkles,
  GripVertical,
  Trash2,
  Plus
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
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import Image from 'next/image'
import { GenreEditModal } from '@/components/admin/GenreEditModal'
import { ThemeEditModal } from '@/components/admin/ThemeEditModal'
import { SessionEditModal } from '@/components/admin/SessionEditModal'
import { ContentEditModal } from '@/components/admin/ContentEditModal'
import { QuizEditModal } from '@/components/admin/QuizEditModal'
import { SessionContentDrawer } from '@/components/admin/SessionContentDrawer'

interface Course {
  id: string
  title: string
  description: string
  difficulty: string
  status: 'draft' | 'coming_soon' | 'available' | 'archived'
  icon: string
  color: string
  display_order: number
  estimated_days: number
  badge_data: BadgeData | null
  created_at: string
  updated_at: string
  genres?: Genre[]
}

interface SkillLevel {
  id: string
  label: string
  display_order: number
}

interface BadgeData {
  id: string
  icon: string
  color: string
  title: string
  description: string
  badgeImageUrl?: string
  validityPeriodMonths?: number | null
  badgeDisplayName?: string
}

interface RewardCardData {
  id: string
  icon: string
  color: string
  title: string
  summary: string
  keyPoints: string[]
}

interface Genre {
  id: string
  course_id: string
  title: string
  description: string
  display_order: number
  estimated_days: number
  badge_data: BadgeData | null
  themes: Theme[]
}

interface Theme {
  id: string
  genre_id: string
  title: string
  description: string
  display_order: number
  estimated_minutes: number
  reward_card_data: RewardCardData | null
  sessions: Session[]
}

interface Session {
  id: string
  theme_id: string
  title: string
  session_type: string
  display_order: number
  estimated_minutes: number
  contents: Content[]
  quizzes: Quiz[]
}

interface Content {
  id: string
  session_id: string
  content_type: string
  title: string | null
  content: string
  duration: number | null
  display_order: number
}

interface Quiz {
  id: string
  session_id: string
  question: string
  options: string[]
  correct_answer: number
  explanation: string
  quiz_type: string
  display_order: number
}

interface ColorOption {
  value: string
  label: string
  preview: string
}

interface FormData {
  courseId?: string
  title: string
  description: string
  difficulty: string
  icon: string
  color: string
  estimated_days: number
  display_order: number
  badge_data: BadgeData | null
}


const colorOptions = [
  { value: '#F59E0B', label: 'アンバー', preview: 'bg-amber-500' },
  { value: '#EF4444', label: 'レッド', preview: 'bg-red-500' },
  { value: '#8B5CF6', label: 'バイオレット', preview: 'bg-violet-500' },
  { value: '#06B6D4', label: 'シアン', preview: 'bg-cyan-500' },
  { value: '#10B981', label: 'エメラルド', preview: 'bg-emerald-500' },
  { value: '#6366F1', label: 'インディゴ', preview: 'bg-indigo-500' },
  { value: '#EC4899', label: 'ピンク', preview: 'bg-pink-500' },
  { value: '#84CC16', label: 'ライム', preview: 'bg-lime-500' },
  { value: '#64748B', label: 'スレート', preview: 'bg-slate-500' },
  { value: '#7C3AED', label: 'パープル', preview: 'bg-purple-500' }
]

export default function CourseEditPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = params.id as string
  const { toast } = useToast()
  
  const [course, setCourse] = useState<Course | null>(null)
  const [courseStructure, setCourseStructure] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [skillLevels, setSkillLevels] = useState<SkillLevel[]>([])
  const [formData, setFormData] = useState<FormData>({
    courseId: '',
    title: '',
    description: '',
    difficulty: 'basic',
    icon: '📚',
    color: '#F59E0B',
    estimated_days: 7,
    display_order: 1,
    badge_data: null
  })

  // スキルレベル取得
  const fetchSkillLevels = async () => {
    try {
      // 認証トークン取得
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch('/api/admin/skill-levels', {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSkillLevels(data.skillLevels)
      }
    } catch (error) {
      console.error('Fetch skill levels error:', error)
      // フォールバック
      setSkillLevels([
        { id: 'basic', label: '初級', display_order: 1 },
        { id: 'intermediate', label: '中級', display_order: 2 },
        { id: 'advanced', label: '上級', display_order: 3 }
      ])
    }
  }

  // コース詳細取得
  const fetchCourse = async () => {
    setLoading(true)
    try {
      // 認証トークン取得
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCourse(data.course)
        // badge_dataのIDと画像URLを自動補完
        let badge_data = data.course.badge_data
        if (badge_data) {
          badge_data = {
            ...badge_data,
            id: badge_data.id || `badge_${data.course.id}`,
            badgeImageUrl: badge_data.badgeImageUrl || `/badges/${data.course.id}.svg`,
            badgeDisplayName: badge_data.badgeDisplayName || data.course.id
          }
        }

        setFormData({
          courseId: data.course.id,
          title: data.course.title,
          description: data.course.description,
          difficulty: data.course.difficulty,
          icon: data.course.icon,
          color: data.course.color,
          estimated_days: data.course.estimated_days,
          display_order: data.course.display_order,
          badge_data: badge_data
        })
      } else {
        throw new Error('コースの取得に失敗しました')
      }
    } catch (error) {
      console.error('Fetch course error:', error)
      toast({
        title: "エラー",
        description: "コースの取得に失敗しました",
        variant: "destructive"
      })
      router.push('/admin/courses')
    } finally {
      setLoading(false)
    }
  }

  // コース構造取得
  const fetchCourseStructure = async () => {
    try {
      // 認証トークン取得
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/admin/courses/${courseId}/structure`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (response.ok) {
        const data = await response.json()
        setCourseStructure(data.course)
      } else {
        console.error('Course structure fetch failed')
      }
    } catch (error) {
      console.error('Fetch course structure error:', error)
    }
  }

  // コース更新
  const handleSave = async () => {
    setSaving(true)
    try {
      // badge_dataの必須フィールドチェック（警告のみ、保存は継続）
      if (formData.badge_data) {
        const requiredFields = ['id', 'icon', 'color', 'title', 'description']
        const missingFields = []
        for (const field of requiredFields) {
          if (!formData.badge_data[field as keyof typeof formData.badge_data]) {
            missingFields.push(field)
          }
        }
        
        if (missingFields.length > 0) {
          toast({
            title: "警告",
            description: `修了証の「${missingFields.join(', ')}」が未入力です。バッジ生成時に必要になります。`,
            variant: "default"
          })
        }
      }
      
      // 認証トークン取得
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast({
          title: "保存完了",
          description: "コース情報が正常に更新されました"
        })
        await fetchCourse() // 最新データを再取得
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'コースの更新に失敗しました')
      }
    } catch (error) {
      console.error('Save course error:', error)
      toast({
        title: "エラー", 
        description: error instanceof Error ? error.message : "コースの更新に失敗しました",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  // バッジ画像生成
  const handleGenerateBadge = async () => {
    if (!formData.badge_data) {
      toast({
        title: "エラー",
        description: "修了証データが設定されていません",
        variant: "destructive"
      })
      return
    }

    // 必須フィールドチェック
    if (!formData.badge_data?.id || !formData.badge_data?.title || !formData.badge_data?.description) {
      toast({
        title: "エラー",
        description: "修了証の必須項目（ID、タイトル、説明）が未入力です",
        variant: "destructive"
      })
      return
    }

    setGenerating(true)
    try {
      // 認証トークン取得
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      // バッジデータを準備（courseIdが未設定の場合は現在のcourseIdを使用）
      const badgeData = {
        ...formData.badge_data,
        id: formData.badge_data?.id || `badge_${courseId}`,
        courseId: courseId,
        icon: '🏆' // デフォルトアイコン（実際には使用されない）
      }
      
      const response = await fetch('/api/admin/badges/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(badgeData)
      })

      if (response.ok) {
        const result = await response.json()
        toast({
          title: "生成完了",
          description: result.message
        })
        
        // バッジ画像URLを更新（キャッシュバスター付き）
        const timestamp = Date.now()
        setFormData(prev => ({
          ...prev,
          badge_data: prev.badge_data ? {
            ...prev.badge_data,
            badgeImageUrl: `${result.badgeImageUrl}?t=${timestamp}`
          } : null
        }))
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'バッジ生成に失敗しました')
      }
    } catch (error) {
      console.error('Generate badge error:', error)
      toast({
        title: "エラー", 
        description: error instanceof Error ? error.message : "バッジ生成に失敗しました",
        variant: "destructive"
      })
    } finally {
      setGenerating(false)
    }
  }

  // コンテンツ追加
  const handleAddContent = async (sessionId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      const response = await fetch('/api/admin/contents', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          session_id: sessionId,
          content_type: 'text',
          title: '新しいコンテンツ',
          content: 'コンテンツの内容をここに入力してください。'
        })
      })

      if (response.ok) {
        toast({
          title: "追加完了",
          description: "新しいコンテンツが追加されました"
        })
        await fetchCourseStructure()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'コンテンツの追加に失敗しました')
      }
    } catch (error) {
      console.error('Add content error:', error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "コンテンツの追加に失敗しました",
        variant: "destructive"
      })
    }
  }

  // クイズ追加
  const handleAddQuiz = async (sessionId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      const response = await fetch('/api/admin/quizzes', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          session_id: sessionId,
          question: '新しいクイズ問題をここに入力してください',
          options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
          correct_answer: 0,
          explanation: '正解の説明をここに入力してください',
          quiz_type: 'single_choice'
        })
      })

      if (response.ok) {
        toast({
          title: "追加完了",
          description: "新しいクイズが追加されました"
        })
        await fetchCourseStructure()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'クイズの追加に失敗しました')
      }
    } catch (error) {
      console.error('Add quiz error:', error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "クイズの追加に失敗しました",
        variant: "destructive"
      })
    }
  }

  // テーマ・セッション追加関数はContentEditTab内に移動済み

  // ジャンル削除
  const handleDeleteGenre = async (genreId: string) => {
    const genre = courseStructure?.genres?.find(g => g.id === genreId)
    if (!genre) return

    if (!confirm(`ジャンル「${genre.title}」を削除しますか？この操作は取り消せません。`)) {
      return
    }

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      const response = await fetch(`/api/admin/genres/${genreId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json' 
        }
      })

      if (response.ok) {
        toast({
          title: "削除完了",
          description: `ジャンル「${genre.title}」を削除しました`
        })
        await fetchCourseStructure()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'ジャンルの削除に失敗しました')
      }
    } catch (error) {
      console.error('Delete genre error:', error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ジャンルの削除に失敗しました",
        variant: "destructive"
      })
    }
  }

  // テーマ削除
  const handleDeleteTheme = async (themeId: string) => {
    let themeName = ''
    for (const genre of courseStructure?.genres || []) {
      const theme = genre.themes.find(t => t.id === themeId)
      if (theme) {
        themeName = theme.title
        break
      }
    }

    if (!confirm(`テーマ「${themeName}」を削除しますか？この操作は取り消せません。`)) {
      return
    }

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      const response = await fetch(`/api/admin/themes/${themeId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json' 
        }
      })

      if (response.ok) {
        toast({
          title: "削除完了",
          description: `テーマ「${themeName}」を削除しました`
        })
        await fetchCourseStructure()
      } else {
        let errorMessage = 'テーマの削除に失敗しました'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          console.warn('Failed to parse error response:', parseError)
        }
        throw new Error(errorMessage)
      }
    } catch (error) {
      console.error('Delete theme error:', error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "テーマの削除に失敗しました",
        variant: "destructive"
      })
    }
  }

  // セッション削除
  const handleDeleteSession = async (sessionId: string) => {
    let sessionName = ''
    for (const genre of courseStructure?.genres || []) {
      for (const theme of genre.themes) {
        const session = theme.sessions.find(s => s.id === sessionId)
        if (session) {
          sessionName = session.title
          break
        }
      }
    }

    if (!confirm(`セッション「${sessionName}」を削除しますか？この操作は取り消せません。`)) {
      return
    }

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      const response = await fetch(`/api/admin/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json' 
        }
      })

      if (response.ok) {
        toast({
          title: "削除完了",
          description: `セッション「${sessionName}」を削除しました`
        })
        await fetchCourseStructure()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'セッションの削除に失敗しました')
      }
    } catch (error) {
      console.error('Delete session error:', error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "セッションの削除に失敗しました",
        variant: "destructive"
      })
    }
  }

  // 初期データ取得
  useEffect(() => {
    fetchSkillLevels()
    fetchCourse()
    fetchCourseStructure()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
          読み込み中...
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8 text-muted-foreground">
          コースが見つかりません
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/admin/courses">
            <Button variant="ghost" size="sm">
              <ChevronLeft className="h-4 w-4 mr-2" />
              コース管理
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Edit className="h-6 w-6 mr-2 text-blue-600" />
              コース学習編集
            </h1>
            <p className="text-muted-foreground">コース: {course.title}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={() => {
            fetchCourse()
            fetchCourseStructure()
          }} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-6">
        <TabsList>
          <TabsTrigger value="basic">
            <BarChart3 className="h-4 w-4 mr-2" />
            基本情報
          </TabsTrigger>
          <TabsTrigger value="content">
            <Layers className="h-4 w-4 mr-2" />
            学習コンテンツ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <BasicInfoTab 
            formData={formData}
            setFormData={setFormData}
            skillLevels={skillLevels}
            colorOptions={colorOptions}
            handleGenerateBadge={handleGenerateBadge}
            generating={generating}
            courseId={courseId}
          />
        </TabsContent>

        <TabsContent value="content">
          <ContentEditTab 
            courseStructure={courseStructure}
            setCourseStructure={setCourseStructure}
            courseId={courseId}
            toast={toast}
            onAddTheme={async (_genreId) => {}} // ContentEditTab内で処理
            onAddSession={async (_themeId) => {}} // ContentEditTab内で処理
            fetchCourseStructure={fetchCourseStructure}
            handleAddContent={handleAddContent}
            handleAddQuiz={handleAddQuiz}
            handleDeleteGenre={handleDeleteGenre}
            handleDeleteTheme={handleDeleteTheme}
            handleDeleteSession={handleDeleteSession}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// 基本情報編集タブ
function BasicInfoTab({ 
  formData, 
  setFormData, 
  skillLevels, 
  colorOptions,
  handleGenerateBadge,
  generating,
  courseId 
}: {
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
  skillLevels: SkillLevel[]
  colorOptions: ColorOption[]
  handleGenerateBadge: () => void
  generating: boolean
  courseId: string
}) {
  return (

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 基本情報 */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* タイトル・説明 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Edit className="h-5 w-5 mr-2" />
                基本情報
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">コースID</label>
                <Input
                  value={formData.courseId || ''}
                  readOnly
                  className="bg-gray-50 text-gray-600"
                  placeholder="自動生成されるID"
                />
                <p className="text-xs text-gray-500 mt-1">※AIコース生成時に自動設定される一意のID（変更不可）</p>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">コース名</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="コース名を入力..."
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">説明</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="コースの説明を入力..."
                  rows={4}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">難易度</label>
                <Select 
                  value={formData.difficulty} 
                  onValueChange={(value) => 
                    setFormData(prev => ({ ...prev, difficulty: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {skillLevels.map(level => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 設定値 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                コース設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  予想学習日数
                </label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.estimated_days}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_days: parseInt(e.target.value) || 1 }))}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">表示順序</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, display_order: parseInt(e.target.value) || 1 }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* 修了証設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                コース修了証
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                コース完了時に発行される修了証の設定
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {!formData.badge_data ? (
                <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <Award className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-3">修了証が設定されていません</p>
                  <Button 
                    variant="outline" 
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      badge_data: {
                        id: `badge_${courseId}`,
                        icon: formData.icon || '🏆',
                        color: (() => {
                          // コースカラーをCSSカラーコードに変換
                          const colorMap: Record<string, string> = {
                            'slate': '#64748B',
                            'emerald': '#10B981',
                            'amber': '#F59E0B',
                            'red': '#EF4444',
                            'purple': '#8B5CF6',
                            'cyan': '#06B6D4',
                            'pink': '#EC4899'
                          }
                          return colorMap[formData.color as string] || formData.color || '#10B981'
                        })(),
                        title: `${prev.title || 'コース名'} 修了証`,
                        description: `${prev.title || 'コース名'}の基本スキルを修得`,
                        badgeImageUrl: `/badges/${courseId}.svg`,
                        validityPeriodMonths: null,
                        badgeDisplayName: courseId
                      }
                    }))}
                  >
                    修了証を作成
                  </Button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium mb-2 block">修了証ID</label>
                    <Input
                      value={formData.badge_data?.id || ''}
                      readOnly
                      className="bg-gray-50 text-gray-600"
                      placeholder="badge_course_id"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">修了証タイトル</label>
                    <Input
                      value={formData.badge_data?.title || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        badge_data: prev.badge_data ? { ...prev.badge_data, title: e.target.value } : null 
                      }))}
                      placeholder="コース名 修了証"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">バッジ表示名</label>
                    <Input
                      value={formData.badge_data?.badgeDisplayName || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        badge_data: prev.badge_data ? { ...prev.badge_data, badgeDisplayName: e.target.value } : null 
                      }))}
                      placeholder="例: AI_BASICS (アンダースコアで改行)"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      ※ バッジ画像内に表示される短縮名。XX_YYと入力すると2行表示（上段: XX、下段: YY）
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">修了証説明</label>
                    <Textarea
                      value={formData.badge_data?.description || ''}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        badge_data: prev.badge_data ? { ...prev.badge_data, description: e.target.value } : null 
                      }))}
                      placeholder="修得するスキルや知識の説明"
                      rows={3}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">テーマカラー</label>
                    <div className="grid grid-cols-6 gap-2">
                      {['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899'].map(color => (
                        <button
                          key={color}
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            badge_data: prev.badge_data ? { ...prev.badge_data, color } : null 
                          }))}
                          className={`w-8 h-8 rounded border-2 ${
                            formData.badge_data?.color === color ? 'border-gray-800' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">バッジ画像URL</label>
                      <Input
                        value={formData.badge_data?.badgeImageUrl || ''}
                        readOnly
                        className="bg-gray-50 text-gray-600"
                        placeholder="/badges/course_id.svg"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium mb-2 block">有効期限（月数）</label>
                      <Input
                        type="number"
                        min="1"
                        max="60"
                        value={formData.badge_data?.validityPeriodMonths || ''}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          badge_data: prev.badge_data ? { 
                            ...prev.badge_data, 
                            validityPeriodMonths: e.target.value ? parseInt(e.target.value) : null 
                          } : null 
                        }))}
                        placeholder="無期限"
                      />
                    </div>
                  </div>
                  
                  {/* 修了証プレビュー */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">修了証プレビュー</label>
                    {formData.badge_data?.badgeImageUrl ? (
                      <div className="text-center">
                        <div className="inline-block p-4 bg-gray-50 rounded-lg">
                          <Image 
                            key={formData.badge_data?.badgeImageUrl}
                            src={formData.badge_data?.badgeImageUrl} 
                            alt="バッジプレビュー"
                            width={96}
                            height={120}
                            className="mx-auto"
                            onError={(e) => {
                              // 画像が見つからない場合は簡易プレビューを表示
                              e.currentTarget.style.display = 'none'
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement
                              if (fallback) fallback.style.display = 'block'
                            }}
                          />
                          <div 
                            className="relative w-24 h-30 mx-auto"
                            style={{ display: 'none' }}
                          >
                            {/* SVG風プレビュー */}
                            <div className="w-24 h-30 relative">
                              {/* メインサークル */}
                              <div className="w-18 h-18 mx-auto rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 border-2 border-yellow-800 shadow-lg">
                                <div className="w-14 h-14 mx-auto mt-2 rounded-full bg-white border border-yellow-800 flex flex-col justify-center items-center">
                                  {/* テキスト表示 - アンダースコア分割対応 */}
                                  {(() => {
                                    const displayName = formData.badge_data?.badgeDisplayName || courseId
                                    if (displayName.includes('_')) {
                                      const parts = displayName.split('_')
                                      return (
                                        <>
                                          <div className="text-[8px] font-bold leading-tight" style={{ color: formData.badge_data?.color }}>
                                            {parts[0].toUpperCase()}
                                          </div>
                                          <div className="text-[7px] font-bold leading-tight" style={{ color: formData.badge_data?.color }}>
                                            {parts[1]?.toUpperCase()}
                                          </div>
                                        </>
                                      )
                                    } else {
                                      return (
                                        <div className="text-[9px] font-bold" style={{ color: formData.badge_data?.color }}>
                                          {displayName.substring(0, 10).toUpperCase()}
                                        </div>
                                      )
                                    }
                                  })()}
                                </div>
                              </div>
                              {/* リボン */}
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex">
                                <div className="w-3 h-8 transform rotate-12" style={{ backgroundColor: formData.badge_data?.color }}></div>
                                <div className="w-3 h-8 transform -rotate-12" style={{ backgroundColor: formData.badge_data?.color }}></div>
                              </div>
                              {/* 修了証テキスト */}
                              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-[6px]" style={{ color: formData.badge_data?.color }}>
                                修了証
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          <div className="font-semibold">{formData.badge_data?.title}</div>
                          <div className="text-xs">{formData.badge_data?.description}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="inline-block p-4 bg-gray-50 rounded-lg">
                          {/* SVG風プレビュー - バッジ画像がない場合 */}
                          <div className="relative w-24 h-30 mx-auto">
                            <div className="w-24 h-30 relative">
                              {/* メインサークル */}
                              <div className="w-18 h-18 mx-auto rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 border-2 border-yellow-800 shadow-lg">
                                <div className="w-14 h-14 mx-auto mt-2 rounded-full bg-white border border-yellow-800 flex flex-col justify-center items-center">
                                  {/* テキスト表示 - アンダースコア分割対応 */}
                                  {(() => {
                                    const displayName = formData.badge_data?.badgeDisplayName || formData.badge_data?.id || ''
                                    if (displayName.includes('_')) {
                                      const parts = displayName.split('_')
                                      return (
                                        <>
                                          <div className="text-[8px] font-bold leading-tight" style={{ color: formData.badge_data?.color }}>
                                            {parts[0].toUpperCase()}
                                          </div>
                                          <div className="text-[7px] font-bold leading-tight" style={{ color: formData.badge_data?.color }}>
                                            {parts[1]?.toUpperCase()}
                                          </div>
                                        </>
                                      )
                                    } else {
                                      return (
                                        <div className="text-[9px] font-bold" style={{ color: formData.badge_data?.color }}>
                                          {displayName.substring(0, 10).toUpperCase()}
                                        </div>
                                      )
                                    }
                                  })()}
                                </div>
                              </div>
                              {/* リボン */}
                              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex">
                                <div className="w-3 h-8 transform rotate-12" style={{ backgroundColor: formData.badge_data?.color }}></div>
                                <div className="w-3 h-8 transform -rotate-12" style={{ backgroundColor: formData.badge_data?.color }}></div>
                              </div>
                              {/* 修了証テキスト */}
                              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-[6px]" style={{ color: formData.badge_data?.color }}>
                                修了証
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          {formData.badge_data?.title}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formData.badge_data?.description}
                        </div>
                        {formData.badge_data?.validityPeriodMonths && (
                          <div className="text-xs text-muted-foreground mt-2">
                            有効期限: {formData.badge_data?.validityPeriodMonths}ヶ月
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setFormData(prev => ({ ...prev, badge_data: null }))}
                    className="flex-1"
                  >
                    修了証を削除
                  </Button>
                  <Button 
                    variant="default" 
                    onClick={() => handleGenerateBadge()}
                    className="flex-1"
                    disabled={generating}
                  >
                    <Sparkles className={`h-4 w-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                    {generating ? '生成中...' : '画像生成'}
                  </Button>
                </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* デザイン設定 */}
        <div className="space-y-6">
          
          {/* プレビュー */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Award className="h-5 w-5 mr-2" />
                プレビュー
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="p-4 rounded-lg border-2 text-center"
                style={{ 
                  backgroundColor: formData.color + '20', 
                  borderColor: formData.color 
                }}
              >
                <div className="font-bold text-lg" style={{ color: formData.color }}>
                  {formData.title || 'コース名'}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {skillLevels.find(d => d.id === formData.difficulty)?.label} • {formData.estimated_days}日
                </div>
                <div className="text-xs mt-2 px-2 py-1 rounded" style={{ backgroundColor: formData.color + '30' }}>
                  修了証タイトル例: {(formData.title || 'コース名').toUpperCase().replace(/\s/g, '_')}
                </div>
              </div>
            </CardContent>
          </Card>


          {/* アイコン選択 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="h-5 w-5 mr-2" />
                コースアイコン
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-8 gap-2">
                {['📚', '💼', '💰', '📈', '👥', '🚀', '🔧', '🎯', '🧠', '🤖', '📊', '🎓', '💡', '⚡', '🌟', '🏆', '🔥', '💎', '🎨', '🔬', '📱', '🌐', '⚙️', '📝', '📋', '🎪', '🎭', '🎬', '🎸', '🏋️', '⚖️', '🔍'].map(icon => (
                  <button
                    key={icon}
                    onClick={() => setFormData(prev => ({ ...prev, icon }))}
                    className={`p-3 text-2xl border-2 rounded hover:bg-gray-100 transition-colors ${
                      formData.icon === icon ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* カラー選択 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                テーマカラー
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {colorOptions.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setFormData(prev => ({ ...prev, color: color.value }))}
                    className={`p-2 rounded border-2 hover:bg-muted transition-colors flex items-center space-x-2 ${
                      formData.color === color.value ? 'border-blue-500 bg-blue-50' : 'border-border'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded ${color.preview}`}></div>
                    <span className="text-sm">{color.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
  )
}

// ソート可能ジャンルコンポーネント
function SortableGenre({ genre, onEdit, onAddTheme, onDelete, children }: { 
  genre: Genre
  onEdit: (genre: Genre) => void
  onAddTheme: (genreId: string) => Promise<void>
  onDelete: (genreId: string) => Promise<void>
  children?: React.ReactNode 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: genre.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const canDelete = genre.themes.length === 0

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`border-2 border-blue-200 bg-blue-50 rounded-lg p-4 mb-4 ${
        isDragging ? 'opacity-50 bg-blue-100' : ''
      }`}
    >
      {/* ジャンルヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div 
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-blue-100 rounded mr-2"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2 text-blue-600" />
            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded mr-2">
              ジャンル
            </span>
            <h3 className="font-semibold text-blue-800">{genre.title}</h3>
            {genre.badge_data && (
              <Award className="h-4 w-4 ml-2 text-amber-500" />
            )}
          </div>
        </div>

        {/* 統一操作パネル */}
        <div className="flex items-center space-x-1">
          <span className="text-xs text-blue-600 mr-2">
            📊 順序: {genre.display_order} | ⏱️ {genre.estimated_days}日間
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onEdit(genre)}
            className="border-blue-300 text-blue-700 hover:bg-blue-100"
          >
            <Edit className="h-3 w-3 mr-1" />
            編集
          </Button>
          {canDelete ? (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => onDelete(genre.id)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              削除
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              disabled
              title="子要素があるため削除できません"
              className="border-gray-300 text-gray-400"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              削除
            </Button>
          )}
        </div>
      </div>
      
      {/* 説明 */}
      <p className="text-sm text-blue-700 mb-3 pl-7">{genre.description}</p>
      
      {/* 子要素 */}
      {children}
      
      {/* テーマ追加ボタン（ジャンル内・下部・中央） */}
      <div className="mt-4 pt-3 border-t border-blue-200 text-center">
        <Button
          variant="outline"
          onClick={() => onAddTheme(genre.id)}
          className="text-green-600 border-green-300 hover:bg-green-50 font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          このジャンルにテーマ追加
        </Button>
      </div>
    </div>
  )
}

// ソート可能テーマコンポーネント
function SortableTheme({ theme, onEdit, onAddSession: _onAddSession, onDelete, children }: { 
  theme: Theme
  onEdit: (theme: Theme, genreId: string) => void
  onAddSession: (themeId: string) => Promise<void>
  onDelete: (themeId: string) => Promise<void>
  children?: React.ReactNode 
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: theme.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const canDelete = theme.sessions.length === 0

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`ml-6 border-2 border-green-200 bg-green-50 rounded-lg p-3 mb-3 ${
        isDragging ? 'opacity-50 bg-green-100' : ''
      }`}
    >
      {/* テーマヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div 
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-green-100 rounded mr-2"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3 w-3 text-green-400" />
          </div>
          <div className="flex items-center">
            <FileText className="h-4 w-4 mr-2 text-green-600" />
            <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded mr-2">
              テーマ
            </span>
            <h4 className="font-medium text-green-800">{theme.title}</h4>
            {theme.reward_card_data && (
              <Gift className="h-4 w-4 ml-2 text-green-500" />
            )}
          </div>
        </div>

        {/* 統一操作パネル */}
        <div className="flex items-center space-x-1">
          <span className="text-xs text-green-600 mr-2">
            📊 順序: {theme.display_order} | ⏱️ {theme.estimated_minutes}分
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onEdit(theme, theme.genre_id)}
            className="border-green-300 text-green-700 hover:bg-green-100"
          >
            <Edit className="h-3 w-3 mr-1" />
            編集
          </Button>
          {canDelete ? (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => onDelete(theme.id)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              削除
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              disabled
              title="子要素があるため削除できません"
              className="border-gray-300 text-gray-400"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              削除
            </Button>
          )}
        </div>
      </div>
      
      {/* 説明 */}
      <p className="text-sm text-green-700 mb-2 pl-5">{theme.description}</p>
      
      {/* 子要素 */}
      {children}
    </div>
  )
}

// ソート可能セッションコンポーネント
function SortableSession({ session, onEdit, onDelete, handleAddContent, handleAddQuiz, onContentSave, onQuizSave, onContentDelete, onQuizDelete }: { 
  session: Session
  onEdit: (session: Session) => void
  onDelete: (sessionId: string) => Promise<void>
  handleAddContent: (sessionId: string) => Promise<void>
  handleAddQuiz: (sessionId: string) => Promise<void>
  onContentSave: (contentId: string, data: Partial<Content>) => Promise<void>
  onQuizSave: (quizId: string, data: Partial<Quiz>) => Promise<void>
  onContentDelete: (contentId: string) => Promise<void>
  onQuizDelete: (quizId: string) => Promise<void>
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: session.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const canDelete = session.contents.length === 0 && session.quizzes.length === 0
  
  const getSessionTypeLabel = (type: string) => {
    switch (type) {
      case 'knowledge': return '知識'
      case 'practice': return '実践'
      case 'case_study': return 'ケーススタディ'
      default: return type
    }
  }

  const getSessionTypeIcon = (type: string) => {
    switch (type) {
      case 'knowledge': return '📖'
      case 'practice': return '🛠️'
      case 'case_study': return '📊'
      default: return '🎯'
    }
  }

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`ml-8 border-2 border-purple-200 bg-purple-50 rounded-lg p-3 mb-2 ${
        isDragging ? 'opacity-50 bg-purple-100' : ''
      }`}
    >
      {/* セッションヘッダー */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div 
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-purple-100 rounded mr-2"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-3 w-3 text-purple-400" />
          </div>
          <div className="flex items-center">
            <HelpCircle className="h-4 w-4 mr-2 text-purple-600" />
            <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded mr-2">
              セッション
            </span>
            <span className="text-lg mr-2">{getSessionTypeIcon(session.session_type)}</span>
            <span className="font-medium text-purple-800">{session.title}</span>
          </div>
        </div>

        {/* 統一操作パネル */}
        <div className="flex items-center space-x-1">
          <span className="text-xs text-purple-600 mr-2">
            📊 順序: {session.display_order} | 
            {getSessionTypeLabel(session.session_type)} | 
            ⏱️ {session.estimated_minutes}分
          </span>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onEdit(session)}
            className="border-purple-300 text-purple-700 hover:bg-purple-100"
          >
            <Edit className="h-3 w-3 mr-1" />
            編集
          </Button>
          <SessionContentDrawer
            session={session}
            onSessionUpdate={async () => {}} // セッション更新は別で処理
            onAddContent={handleAddContent}
            onAddQuiz={handleAddQuiz}
            onContentSave={onContentSave}
            onQuizSave={onQuizSave}
            onContentDelete={onContentDelete}
            onQuizDelete={onQuizDelete}
          />
          {canDelete ? (
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => onDelete(session.id)}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              削除
            </Button>
          ) : (
            <Button 
              variant="outline" 
              size="sm"
              disabled
              title="コンテンツまたはクイズがあるため削除できません"
              className="border-gray-300 text-gray-400"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              削除
            </Button>
          )}
        </div>
      </div>
      
      {/* コンテンツ・クイズ数表示 */}
      <div className="text-xs text-purple-700 pl-5">
        📄 コンテンツ: {session.contents.length}個 | ❓ クイズ: {session.quizzes.length}個
      </div>
    </div>
  )
}

// コンテンツ編集タブ
function ContentEditTab({ 
  courseStructure, 
  setCourseStructure, 
  courseId, 
  toast,
  onAddTheme: _onAddTheme,
  onAddSession: _onAddSession,
  fetchCourseStructure,
  handleAddContent,
  handleAddQuiz,
  handleDeleteGenre,
  handleDeleteTheme,
  handleDeleteSession
}: {
  courseStructure: Course | null
  setCourseStructure: React.Dispatch<React.SetStateAction<Course | null>>
  courseId: string
  toast: (options: { title: string; description: string; variant?: 'destructive' }) => void
  onAddTheme: (genreId: string) => Promise<void>
  onAddSession: (themeId: string) => Promise<void>
  fetchCourseStructure: () => Promise<void>
  handleAddContent: (sessionId: string) => Promise<void>
  handleAddQuiz: (sessionId: string) => Promise<void>
  handleDeleteGenre: (genreId: string) => Promise<void>
  handleDeleteTheme: (themeId: string) => Promise<void>
  handleDeleteSession: (sessionId: string) => Promise<void>
}) {
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null)
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null)
  const [editingThemeGenreId, setEditingThemeGenreId] = useState<string>('') // テーマ編集時のgenre_id
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [editingContent, setEditingContent] = useState<Content | null>(null)
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)

  // ドラッグアンドドロップ用センサー
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // テーマ追加（モーダル表示）
  const handleAddTheme = async (genreId: string) => {
    // 現在のテーマ数から次の表示順序を計算
    const genre = courseStructure?.genres?.find(g => g.id === genreId)
    const nextDisplayOrder = genre ? genre.themes.length + 1 : 1
    
    // モーダルを開く（新規作成モード）
    setEditingTheme({
      id: '',
      genre_id: genreId,
      title: '',
      description: '',
      display_order: nextDisplayOrder,
      estimated_minutes: 15,
      reward_card_data: null,
      sessions: []
    })
    setEditingThemeGenreId(genreId)
  }

  // セッション追加（モーダル表示）
  const handleAddSession = async (themeId: string) => {
    // 現在のセッション数から次の表示順序を計算
    const theme = courseStructure?.genres?.flatMap(g => g.themes).find(t => t.id === themeId)
    const nextDisplayOrder = theme ? theme.sessions.length + 1 : 1
    
    // モーダルを開く（新規作成モード）
    setEditingSession({
      id: '',
      theme_id: themeId,
      title: '',
      session_type: 'knowledge',
      display_order: nextDisplayOrder,
      estimated_minutes: 5,
      contents: [],
      quizzes: []
    })
  }

  // ジャンル並び替えハンドラー
  const handleGenreDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !courseStructure?.genres) return

    const oldIndex = courseStructure.genres.findIndex((genre) => genre.id === active.id)
    const newIndex = courseStructure.genres.findIndex((genre) => genre.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // 楽観的更新
    const reorderedGenres = arrayMove(courseStructure.genres, oldIndex, newIndex)
    setCourseStructure(prev => prev ? { ...prev, genres: reorderedGenres } : null)

    // display_orderを更新
    const updatedGenres = reorderedGenres.map((genre, index) => ({
      ...genre,
      display_order: index + 1
    }))

    try {
      // 🔐 CLAUDE.md準拠：認証ヘッダー追加
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      // APIで順序更新
      const updatePromises = updatedGenres.map((genre) =>
        fetch(`/api/admin/genres/${genre.id}/order`, {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ display_order: genre.display_order })
        })
      )

      await Promise.all(updatePromises)

      // ローカル状態を最終更新
      setCourseStructure(prev => prev ? { ...prev, genres: updatedGenres } : null)

      toast({
        title: '並び順を更新しました',
        description: 'ジャンルの表示順序が正常に更新されました。',
      })
    } catch (_error) {
      // エラー時はロールバック
      setCourseStructure(prev => prev ? { ...prev, genres: courseStructure.genres } : null)
      toast({
        title: '並び順の更新に失敗しました',
        description: 'エラーが発生しました。再度お試しください。',
        variant: 'destructive'
      })
    }
  }

  // テーマ並び替えハンドラー（ジャンル内）
  const handleThemeDragEnd = async (event: DragEndEvent, genreId: string) => {
    const { active, over } = event
    if (!over || active.id === over.id || !courseStructure?.genres) return

    const genre = courseStructure.genres.find(g => g.id === genreId)
    if (!genre) return

    const oldIndex = genre.themes.findIndex((theme) => theme.id === active.id)
    const newIndex = genre.themes.findIndex((theme) => theme.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // 楽観的更新
    const reorderedThemes = arrayMove(genre.themes, oldIndex, newIndex)
    setCourseStructure(prev => {
      if (!prev?.genres) return prev
      return {
        ...prev,
        genres: prev.genres.map(g => 
          g.id === genreId ? { ...g, themes: reorderedThemes } : g
        )
      }
    })

    // display_orderを更新
    const updatedThemes = reorderedThemes.map((theme, index) => ({
      ...theme,
      display_order: index + 1
    }))

    try {
      // 🔐 CLAUDE.md準拠：認証ヘッダー追加
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      // APIで順序更新
      const updatePromises = updatedThemes.map((theme) =>
        fetch(`/api/admin/themes/${theme.id}/order`, {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ display_order: theme.display_order })
        })
      )

      await Promise.all(updatePromises)

      toast({
        title: '並び順を更新しました',
        description: 'テーマの表示順序が正常に更新されました。',
      })
    } catch (_error) {
      // エラー時はロールバック
      setCourseStructure(prev => {
        if (!prev?.genres) return prev
        return {
          ...prev,
          genres: prev.genres.map(g => 
            g.id === genreId ? { ...g, themes: genre.themes } : g
          )
        }
      })
      toast({
        title: '並び順の更新に失敗しました',
        description: 'エラーが発生しました。再度お試しください。',
        variant: 'destructive'
      })
    }
  }

  // セッション並び替えハンドラー（テーマ内）
  const handleSessionDragEnd = async (event: DragEndEvent, themeId: string) => {
    const { active, over } = event
    if (!over || active.id === over.id || !courseStructure?.genres) return

    let theme: Theme | undefined
    for (const genre of courseStructure.genres) {
      theme = genre.themes.find(t => t.id === themeId)
      if (theme) break
    }
    if (!theme) return

    const oldIndex = theme.sessions.findIndex((session) => session.id === active.id)
    const newIndex = theme.sessions.findIndex((session) => session.id === over.id)

    if (oldIndex === -1 || newIndex === -1) return

    // 楽観的更新
    const reorderedSessions = arrayMove(theme.sessions, oldIndex, newIndex)
    setCourseStructure(prev => {
      if (!prev?.genres) return prev
      return {
        ...prev,
        genres: prev.genres.map(g => ({
          ...g,
          themes: g.themes.map(t => 
            t.id === themeId ? { ...t, sessions: reorderedSessions } : t
          )
        }))
      }
    })

    // display_orderを更新
    const updatedSessions = reorderedSessions.map((session, index) => ({
      ...session,
      display_order: index + 1
    }))

    try {
      // 🔐 CLAUDE.md準拠：認証ヘッダー追加
      const { supabase } = await import('@/lib/supabase')
      const { data: { session: authSession } } = await supabase.auth.getSession()
      
      if (!authSession?.access_token) {
        throw new Error('認証が必要です')
      }

      // APIで順序更新
      const updatePromises = updatedSessions.map((session) =>
        fetch(`/api/admin/sessions/${session.id}/order`, {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ display_order: session.display_order })
        })
      )

      await Promise.all(updatePromises)

      toast({
        title: '並び順を更新しました',
        description: 'セッションの表示順序が正常に更新されました。',
      })
    } catch (_error) {
      // エラー時はロールバック
      setCourseStructure(prev => {
        if (!prev?.genres) return prev
        return {
          ...prev,
          genres: prev.genres.map(g => ({
            ...g,
            themes: g.themes.map(t => 
              t.id === themeId ? { ...t, sessions: theme!.sessions } : t
            )
          }))
        }
      })
      toast({
        title: '並び順の更新に失敗しました',
        description: 'エラーが発生しました。再度お試しください。',
        variant: 'destructive'
      })
    }
  }

  const handleGenreSave = async (genreId: string, data: Partial<Genre>) => {
    try {
      console.log('🔍 [GenreSave] Starting save with genreId:', genreId, 'data:', data)
      
      // 🔐 CLAUDE.md準拠：クライアントサイドでsupabaseを使用して認証ヘッダー取得
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      let response: Response
      
      // 新規作成か更新かを判定
      if (!genreId || genreId === '') {
        console.log('🔍 [GenreSave] Creating new genre')
        // 新規作成
        response = await fetch('/api/admin/genres', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ ...data, course_id: courseId })
        })
      } else {
        console.log('🔍 [GenreSave] Updating existing genre:', genreId)
        // 既存ジャンル更新
        response = await fetch(`/api/admin/genres/${genreId}`, {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(data)
        })
      }

      if (response.ok) {
        const _result = await response.json()
        
        toast({
          title: "保存完了",
          description: (!genreId || genreId === '') 
            ? "新しいジャンルが作成されました" 
            : "ジャンル情報が正常に更新されました"
        })
        
        // 新規作成の場合は構造を再取得、更新の場合はローカル状態を更新
        if (!genreId || genreId === '') {
          // 構造を再取得して画面を更新
          const structureResponse = await fetch(`/api/admin/courses/${courseId}/structure`, {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          
          if (structureResponse.ok) {
            const structureData = await structureResponse.json()
            setCourseStructure(structureData.course)
          }
        } else {
          // ローカル状態を更新
          setCourseStructure(prev => {
            if (!prev || !prev.genres) return prev
            return {
              ...prev,
              genres: prev.genres.map(genre => 
                genre.id === genreId ? { ...genre, ...data } : genre
              )
            }
          })
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'ジャンルの更新に失敗しました')
      }
    } catch (error) {
      console.error('Genre save error:', error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "ジャンルの更新に失敗しました",
        variant: "destructive"
      })
    }
  }

  const handleThemeSave = async (themeId: string, data: Partial<Theme>) => {
    try {
      // 🔐 CLAUDE.md準拠：クライアントサイドでsupabaseを使用して認証ヘッダー取得
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      // 新規作成かどうか判別（idが空文字列または'new'）
      const isNewTheme = !themeId || themeId === '' || themeId === 'new'
      
      let response
      if (isNewTheme) {
        // 新規作成の場合はPOST
        response = await fetch('/api/admin/themes', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(data)
        })
      } else {
        // 既存テーマの更新の場合はPATCH
        response = await fetch('/api/admin/themes', {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({ id: themeId, ...data })
        })
      }

      if (response.ok) {
        toast({
          title: "保存完了",
          description: isNewTheme ? "新しいテーマが作成されました" : "テーマ情報が正常に更新されました"
        })
        
        // 構造を再取得して更新
        // fetchCourseStructure が参照できない場合があるため、直接呼び出し
        try {
          const { supabase } = await import('@/lib/supabase')
          const { data: { session: refreshSession } } = await supabase.auth.getSession()
          
          const refreshResponse = await fetch(`/api/admin/courses/${courseId}/structure`, {
            headers: {
              'Authorization': `Bearer ${refreshSession?.access_token}`,
              'Content-Type': 'application/json'
            }
          })
          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json()
            setCourseStructure(refreshData.course)
          }
        } catch (refreshError) {
          console.error('Refresh course structure error:', refreshError)
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'テーマの保存に失敗しました')
      }
    } catch (error) {
      console.error('Theme save error:', error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "テーマの保存に失敗しました",
        variant: "destructive"
      })
    }
  }

  const handleSessionSave = async (sessionId: string, data: Partial<Session>) => {
    try {
      // 🔐 CLAUDE.md準拠：クライアントサイドでsupabaseを使用して認証ヘッダー取得
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      // 新規作成か既存編集かを判定
      const isNewSession = !sessionId || sessionId === ''
      
      if (isNewSession) {
        // 新規作成（POST）
        const response = await fetch('/api/admin/sessions', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(data)
        })

        if (response.ok) {
          const _result = await response.json()
          toast({
            title: "追加完了",
            description: "新しいセッションが追加されました"
          })
          
          // 画面を再読み込みして最新データを表示
          await fetchCourseStructure()
        } else {
          let errorMessage = 'セッションの追加に失敗しました'
          try {
            const errorData = await response.json()
            errorMessage = errorData.error || errorMessage
          } catch (parseError) {
            console.warn('Failed to parse error response:', parseError)
          }
          throw new Error(errorMessage)
        }
      } else {
        // 既存編集（PATCH）
        const response = await fetch(`/api/admin/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(data)
        })

        if (response.ok) {
          toast({
            title: "保存完了",
            description: "セッション情報が正常に更新されました"
          })
          
          // ローカル状態を更新
          setCourseStructure(prev => {
            if (!prev || !prev.genres) return prev
            return {
              ...prev,
              genres: prev.genres.map(genre => ({
                ...genre,
                themes: genre.themes.map(theme => ({
                  ...theme,
                  sessions: theme.sessions.map(session => 
                    session.id === sessionId ? { ...session, ...data } : session
                  )
                }))
              }))
            }
          })
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'セッションの更新に失敗しました')
        }
      }
    } catch (error) {
      console.error('Session save error:', error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "セッションの保存に失敗しました",
        variant: "destructive"
      })
    }
  }

  const handleContentSave = async (contentId: string, data: Partial<Content>) => {
    try {
      // 🔐 CLAUDE.md準拠：クライアントサイドでsupabaseを使用して認証ヘッダー取得
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      if (contentId === '') {
        // 新規作成
        const response = await fetch('/api/admin/contents', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(data)
        })

        if (response.ok) {
          toast({
            title: "作成完了",
            description: "新しいコンテンツが作成されました"
          })
          // 構造データを再取得
          await fetchCourseStructure()
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'コンテンツの作成に失敗しました')
        }
      } else {
        // 既存更新
        const response = await fetch(`/api/admin/contents/${contentId}`, {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(data)
        })

        if (response.ok) {
          toast({
            title: "保存完了",
            description: "コンテンツ情報が正常に更新されました"
          })
          
          // ローカル状態を更新
          setCourseStructure(prev => {
            if (!prev || !prev.genres) return prev
            return {
              ...prev,
              genres: prev.genres.map(genre => ({
                ...genre,
                themes: genre.themes.map(theme => ({
                  ...theme,
                  sessions: theme.sessions.map(session => ({
                    ...session,
                    contents: session.contents.map(content =>
                      content.id === contentId ? { ...content, ...data } : content
                    )
                  }))
                }))
              }))
            }
          })
        } else {
          const errorData = await response.json()
          throw new Error(errorData.error || 'コンテンツの更新に失敗しました')
        }
      }
    } catch (error) {
      console.error('Content save error:', error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "コンテンツの更新に失敗しました",
        variant: "destructive"
      })
    }
  }

  const handleQuizSave = async (quizId: string, data: Partial<Quiz>) => {
    try {
      // 🔐 CLAUDE.md準拠：クライアントサイドでsupabaseを使用して認証ヘッダー取得
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      if (quizId === '') {
        // 新規作成
        console.log('Creating new quiz with data:', data)
        const response = await fetch('/api/admin/quizzes', {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(data)
        })

        if (response.ok) {
          toast({
            title: "作成完了",
            description: "新しいクイズが作成されました"
          })
          // 構造データを再取得
          await fetchCourseStructure()
        } else {
          const errorData = await response.json()
          console.error('Quiz creation error:', errorData)
          throw new Error(errorData.error || 'クイズの作成に失敗しました')
        }
      } else {
        // 既存更新
        console.log('Updating quiz with id:', quizId, 'data:', data)
        const response = await fetch(`/api/admin/quizzes/${quizId}`, {
          method: 'PATCH',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(data)
        })

        console.log('Update response status:', response.status, 'statusText:', response.statusText)
        
        if (response.ok) {
          toast({
            title: "保存完了",
            description: "クイズ情報が正常に更新されました"
          })
          
          // ローカル状態を更新
          setCourseStructure(prev => {
            if (!prev || !prev.genres) return prev
            return {
              ...prev,
              genres: prev.genres.map(genre => ({
                ...genre,
                themes: genre.themes.map(theme => ({
                  ...theme,
                  sessions: theme.sessions.map(session => ({
                    ...session,
                    quizzes: session.quizzes.map(quiz =>
                      quiz.id === quizId ? { ...quiz, ...data } : quiz
                    )
                  }))
                }))
              }))
            }
          })
        } else {
          let errorData
          try {
            const responseText = await response.text()
            console.log('Raw response:', responseText)
            errorData = responseText ? JSON.parse(responseText) : { error: 'Empty response' }
          } catch (e) {
            console.error('Failed to parse error response:', e)
            errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
          }
          console.error('Quiz update error:', errorData)
          throw new Error(errorData.error || 'クイズの更新に失敗しました')
        }
      }
    } catch (error) {
      console.error('Quiz save error:', error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "クイズの保存に失敗しました",
        variant: "destructive"
      })
    }
  }

  // コンテンツ削除
  const handleContentDelete = async (contentId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      const response = await fetch(`/api/admin/contents/${contentId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json' 
        }
      })

      if (response.ok) {
        toast({
          title: "削除完了",
          description: "コンテンツが正常に削除されました"
        })
        
        // ローカル状態を更新
        setCourseStructure(prev => {
          if (!prev || !prev.genres) return prev
          return {
            ...prev,
            genres: prev.genres.map(genre => ({
              ...genre,
              themes: genre.themes.map(theme => ({
                ...theme,
                sessions: theme.sessions.map(session => ({
                  ...session,
                  contents: session.contents.filter(content => content.id !== contentId)
                }))
              }))
            }))
          }
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'コンテンツの削除に失敗しました')
      }
    } catch (error) {
      console.error('Content delete error:', error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "コンテンツの削除に失敗しました",
        variant: "destructive"
      })
    }
  }

  // クイズ削除
  const handleQuizDelete = async (quizId: string) => {
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      const response = await fetch(`/api/admin/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json' 
        }
      })

      if (response.ok) {
        toast({
          title: "削除完了",
          description: "クイズが正常に削除されました"
        })
        
        // ローカル状態を更新
        setCourseStructure(prev => {
          if (!prev || !prev.genres) return prev
          return {
            ...prev,
            genres: prev.genres.map(genre => ({
              ...genre,
              themes: genre.themes.map(theme => ({
                ...theme,
                sessions: theme.sessions.map(session => ({
                  ...session,
                  quizzes: session.quizzes.filter(quiz => quiz.id !== quizId)
                }))
              }))
            }))
          }
        })
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'クイズの削除に失敗しました')
      }
    } catch (error) {
      console.error('Quiz delete error:', error)
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "クイズの削除に失敗しました",
        variant: "destructive"
      })
    }
  }

  if (!courseStructure || !courseStructure.genres) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            コンテンツ構造を読み込み中...
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Layers className="h-5 w-5 mr-2" />
              学習コンテンツ構造
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {courseStructure.genres.length === 0 ? (
                <div className="text-center py-8">
                  <Layers className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">
                    まだジャンルが作成されていません
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    最初のジャンルを作成して、コースの学習コンテンツ構造を構築しましょう
                  </p>
                  <Button 
                    onClick={() => {
                    const nextDisplayOrder = courseStructure?.genres?.length ? courseStructure.genres.length + 1 : 1
                    setEditingGenre({ 
                      id: '', 
                      course_id: courseId, 
                      title: '', 
                      description: '', 
                      display_order: nextDisplayOrder, 
                      estimated_days: 7, 
                      badge_data: {
                        id: '',
                        icon: '🏆',
                        color: '#F59E0B',
                        title: '',
                        description: ''
                      }, 
                      themes: [] 
                    })
                  }}
                    className="flex items-center"
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    最初のジャンルを作成
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleGenreDragEnd}
                >
                  <SortableContext
                    items={courseStructure.genres.map(genre => genre.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {courseStructure.genres.map((genre) => (
                      <SortableGenre 
                        key={genre.id} 
                        genre={genre} 
                        onEdit={setEditingGenre} 
                        onAddTheme={handleAddTheme}
                        onDelete={(genreId) => handleDeleteGenre(genreId)}
                      >
                        {/* テーマ一覧 */}
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={(event) => handleThemeDragEnd(event, genre.id)}
                        >
                          <SortableContext
                            items={genre.themes.map(theme => theme.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-3">
                              {genre.themes.map((theme) => (
                                <SortableTheme 
                                  key={theme.id} 
                                  theme={theme} 
                                  onEdit={(theme, genreId) => {
                                    setEditingTheme(theme)
                                    setEditingThemeGenreId(genreId)
                                  }}
                                  onAddSession={handleAddSession}
                                  onDelete={(themeId) => handleDeleteTheme(themeId)}
                                >
                                  {/* セッション一覧 */}
                                  <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={(event) => handleSessionDragEnd(event, theme.id)}
                                  >
                                    <SortableContext
                                      items={theme.sessions.map(session => session.id)}
                                      strategy={verticalListSortingStrategy}
                                    >
                                      <div className="space-y-2">
                                        {theme.sessions.map((session) => (
                                          <SortableSession
                                            key={session.id}
                                            session={session}
                                            onEdit={setEditingSession}
                                            onDelete={(sessionId) => handleDeleteSession(sessionId)}
                                            handleAddContent={handleAddContent}
                                            handleAddQuiz={handleAddQuiz}
                                            onContentSave={handleContentSave}
                                            onQuizSave={handleQuizSave}
                                            onContentDelete={handleContentDelete}
                                            onQuizDelete={handleQuizDelete}
                                          />
                                        ))}
                                      </div>
                                    </SortableContext>
                                  </DndContext>
                                  
                                  {/* セッション追加ボタン（テーマ内・下部・中央） */}
                                  <div className="mt-4 pt-3 border-t border-purple-200 text-center">
                                    <Button
                                      variant="outline"
                                      onClick={() => handleAddSession(theme.id)}
                                      className="text-purple-600 border-purple-300 hover:bg-purple-50 font-medium"
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      このテーマにセッション追加
                                    </Button>
                                  </div>
                                </SortableTheme>
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                      </SortableGenre>
                    ))}
                  </SortableContext>
                </DndContext>
              )}
              
              {/* ジャンル追加ボタン */}
              <div className="mt-6 text-center">
                <Button 
                  onClick={() => {
                    const nextDisplayOrder = courseStructure?.genres?.length ? courseStructure.genres.length + 1 : 1
                    setEditingGenre({ 
                      id: '', 
                      course_id: courseId, 
                      title: '', 
                      description: '', 
                      display_order: nextDisplayOrder, 
                      estimated_days: 7, 
                      badge_data: null, 
                      themes: [] 
                    })
                  }}
                  variant="outline"
                  className="text-blue-600 border-blue-300 hover:bg-blue-50 font-medium"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  新しいジャンルを追加
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Modals */}
      <GenreEditModal
        genre={editingGenre}
        isOpen={!!editingGenre}
        onClose={() => setEditingGenre(null)}
        onSave={handleGenreSave}
      />

      <ThemeEditModal
        theme={editingTheme}
        isOpen={!!editingTheme}
        onClose={() => {
          setEditingTheme(null)
          setEditingThemeGenreId('')
        }}
        onSave={handleThemeSave}
        genreId={editingThemeGenreId}
      />

      <SessionEditModal
        session={editingSession}
        isOpen={!!editingSession}
        onClose={() => setEditingSession(null)}
        onSave={handleSessionSave}
      />

      <ContentEditModal
        content={editingContent}
        isOpen={!!editingContent}
        onClose={() => setEditingContent(null)}
        onSave={handleContentSave}
      />

      <QuizEditModal
        quiz={editingQuiz}
        isOpen={!!editingQuiz}
        onClose={() => setEditingQuiz(null)}
        onSave={handleQuizSave}
      />
    </>
  )
}