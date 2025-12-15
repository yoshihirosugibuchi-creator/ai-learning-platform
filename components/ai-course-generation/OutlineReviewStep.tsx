/**
 * AI生成アウトライン レビュー・編集ステップ (Step 2.5)
 * AI生成されたコースアウトラインを確認・修正・承認する
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { type CourseWizardWorkflow } from '@/lib/ai-course-generation/type-conversion'
import { getSkillLevelIds, validateDifficulty } from '@/lib/skill-levels-helper'
import { 
  CheckCircle2, 
  XCircle, 
  Edit, 
  Save, 
  AlertCircle,
  BookOpen,
  Clock,
  Target,
  Users,
  Star,
  Loader2
} from 'lucide-react'

// 型定義（skill_levelsベース）
interface CourseOutline {
  title: string
  description: string
  estimatedDays: number
  difficulty: string  // skill_levels.idから動的に取得
  targetAudience: string
  learningObjectives: string[]
  badge_data?: Record<string, unknown>
}

interface GenreOutline {
  id: string
  title: string
  description: string
  suggested_category_id?: string
  suggested_subcategory_id?: string
  estimatedDays: number
  display_order: number
  themes: ThemeOutline[]
}

interface ThemeOutline {
  id: string
  title: string
  description: string
  estimatedMinutes: number
  display_order: number
  reward_card_data?: Record<string, unknown>
  sessions: SessionOutline[]
}

interface SessionOutline {
  id: string
  title: string
  description?: string
  session_type: 'content' | 'quiz' | 'exercise'
  estimatedMinutes: number
  display_order: number
}

interface OutlineReviewStepProps {
  workflow: {
    aiOutlineResponse?: string
    outline_data?: {
      course?: CourseOutline
      genres?: GenreOutline[]
      review_notes?: string
      approved?: boolean
      generated_at?: string
      ai_response_raw?: string
    }
    status?: string
  }
  onChange: (updates: Record<string, unknown>) => void
  onNext: () => void
  onPrevious: () => void
}

// 難易度表示マッピング（フォールバック用）
const fallbackDifficultyLabels = {
  basic: { label: '基礎', color: 'bg-blue-100 text-blue-800' },
  intermediate: { label: '中級', color: 'bg-yellow-100 text-yellow-800' },
  advanced: { label: '上級', color: 'bg-orange-100 text-orange-800' },
  expert: { label: 'エキスパート', color: 'bg-red-100 text-red-800' }
}

// skill_levelsから動的に取得する難易度情報
interface DifficultyInfo {
  label: string
  color: string
}

const getDifficultyInfo = (difficulty: string): DifficultyInfo => {
  return fallbackDifficultyLabels[difficulty as keyof typeof fallbackDifficultyLabels] || {
    label: difficulty,
    color: 'bg-gray-100 text-gray-800'
  }
}

export function OutlineReviewStep({ workflow, onChange, onNext, onPrevious }: OutlineReviewStepProps) {
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')
  const [editedOutline, setEditedOutline] = useState<CourseOutline | null>(null)
  const [isCreatingDraft, setIsCreatingDraft] = useState(false)
  const [_validSkillLevels, setValidSkillLevels] = useState<string[]>(['basic', 'intermediate', 'advanced', 'expert'])
  
  // アウトライン解析（AI生成されたJSONから構造化）
  const [parsedOutline, setParsedOutline] = useState<{
    course: CourseOutline
    genres: GenreOutline[]
  } | null>(null)
  
  const [parseError, setParseError] = useState<string | null>(null)

  // skill_levels動的取得
  useEffect(() => {
    const loadSkillLevels = async () => {
      try {
        const skillLevelIds = await getSkillLevelIds()
        setValidSkillLevels(skillLevelIds)
        console.log('📋 [OutlineReview] Loaded skill levels:', skillLevelIds)
      } catch (error) {
        console.error('❌ [OutlineReview] Failed to load skill levels:', error)
        // フォールバック値をそのまま使用
      }
    }
    loadSkillLevels()
  }, [])

  // AI生成レスポンスからアウトライン解析
  useEffect(() => {
    const parseOutline = async () => {
      if (workflow.aiOutlineResponse) {
        try {
          // JSON解析を試行
          const parsed = JSON.parse(workflow.aiOutlineResponse)
          
          // 最低限の構造チェック
          if (!parsed.course || !parsed.genres) {
            throw new Error('Invalid outline structure')
          }
          
          // difficulty検証・修正
          if (parsed.course && parsed.course.difficulty) {
            const validatedDifficulty = await validateDifficulty(parsed.course.difficulty)
            if (validatedDifficulty !== parsed.course.difficulty) {
              console.log(`🔧 [OutlineReview] Difficulty corrected: ${parsed.course.difficulty} -> ${validatedDifficulty}`)
              parsed.course.difficulty = validatedDifficulty
            }
          } else {
            // difficulty未設定の場合はbasicをデフォルト
            parsed.course.difficulty = 'basic'
          }
          
          setParsedOutline(parsed)
          setEditedOutline(parsed.course)
          setParseError(null)
          
          // workflow.outline_dataに保存された情報も確認
          if (workflow.outline_data) {
            setReviewNotes(workflow.outline_data.review_notes || '')
          }
          
        } catch (error) {
          console.error('❌ Outline parsing error:', error)
          setParseError('AI生成レスポンスの解析に失敗しました。JSON形式が正しくない可能性があります。')
          setParsedOutline(null)
        }
      }
    }
    
    parseOutline()
  }, [workflow.aiOutlineResponse, workflow.outline_data])

  // アウトライン編集保存
  const handleSaveEdits = () => {
    if (!parsedOutline || !editedOutline) return

    const updatedOutline = {
      ...parsedOutline,
      course: editedOutline
    }
    
    onChange({
      outline_data: {
        course: editedOutline,
        genres: parsedOutline.genres,
        review_notes: reviewNotes,
        approved: false,
        generated_at: workflow.outline_data?.generated_at || new Date().toISOString(),
        ai_response_raw: workflow.aiOutlineResponse
      }
    })
    
    setParsedOutline(updatedOutline)
    setIsEditing(false)
    
    toast({
      title: "編集保存完了",
      description: "アウトラインの編集が保存されました"
    })
  }

  // アウトライン承認
  const handleApprove = async () => {
    if (!parsedOutline) return

    setIsCreatingDraft(true)

    try {
      // 1. ワークフロー更新（承認状態）
      const updatedWorkflow = {
        ...workflow,
        outline_data: {
          course: editedOutline || parsedOutline.course,
          genres: parsedOutline.genres,
          review_notes: reviewNotes,
          approved: true,
          generated_at: workflow.outline_data?.generated_at || new Date().toISOString(),
          ai_response_raw: workflow.aiOutlineResponse
        },
        status: 'outline_approved'
      }

      onChange(updatedWorkflow)

      // 2. サーバー側でlearning_coursesテーブル投入（APIコール）
      const wizardWorkflow = workflow as CourseWizardWorkflow
      
      // ワークフローIDが存在し、カテゴリマッピングが完了している場合のみAPI呼び出し
      if (wizardWorkflow.id && wizardWorkflow.categoryMappings && wizardWorkflow.categoryMappings.length > 0) {
        console.log('📋 [OutlineReview] Calling publish outline API...')
        
        // 認証ヘッダー取得
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.access_token) {
          throw new Error('認証が必要です')
        }

        // 新しいAPIエンドポイント呼び出し
        const response = await fetch(`/api/ai-course-generation/workflows/${wizardWorkflow.id}/publish-outline`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            status: 'draft',
            skipExistingCheck: false
          })
        })

        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'アウトライン公開APIエラー')
        }

        if (result.success) {
          toast({
            title: "✅ アウトライン承認・コース作成完了",
            description: `ドラフトコース「${result.course_id}」を learning_courses テーブルに作成しました。`
          })
        } else {
          throw new Error(result.error || 'コース作成に失敗しました')
        }
      } else {
        // カテゴリマッピング未完了の場合
        toast({
          title: "アウトライン承認完了", 
          description: "アウトラインが承認されました。カテゴリマッピング完了後にドラフトコースが作成されます。"
        })
      }
      
      onNext()

    } catch (error) {
      console.error('[OutlineReview] Approval error:', error)
      toast({
        title: "エラーが発生しました",
        description: "アウトライン承認中にエラーが発生しました",
        variant: "destructive"
      })
    } finally {
      setIsCreatingDraft(false)
    }
  }

  // アウトライン差し戻し
  const handleReject = () => {
    onChange({
      outline_data: {
        course: editedOutline || parsedOutline?.course,
        genres: parsedOutline?.genres || [],
        review_notes: reviewNotes,
        approved: false,
        generated_at: workflow.outline_data?.generated_at || new Date().toISOString(),
        ai_response_raw: workflow.aiOutlineResponse
      },
      status: 'outline_draft'
    })
    
    toast({
      title: "アウトライン差し戻し",
      description: "修正指示を記録しました。Step 2に戻って再生成してください。",
      variant: "default"
    })
    
    onPrevious()
  }

  // 総学習時間計算
  const calculateTotalMinutes = () => {
    if (!parsedOutline) return 0
    return parsedOutline.genres.reduce((total, genre) => 
      total + genre.themes.reduce((themeTotal, theme) => 
        themeTotal + theme.sessions.reduce((sessionTotal, session) => 
          sessionTotal + session.estimatedMinutes, 0), 0), 0)
  }

  // 総セッション数計算
  const calculateTotalSessions = () => {
    if (!parsedOutline) return 0
    return parsedOutline.genres.reduce((total, genre) => 
      total + genre.themes.reduce((themeTotal, theme) => 
        themeTotal + theme.sessions.length, 0), 0)
  }

  if (parseError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {parseError}
          </AlertDescription>
        </Alert>
        
        <div className="space-x-4">
          <Button variant="outline" onClick={onPrevious}>戻る</Button>
          <Button onClick={() => window.location.reload()}>再読み込み</Button>
        </div>
      </div>
    )
  }

  if (!parsedOutline) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">アウトライン読み込み中</h3>
        <p className="text-muted-foreground">AI生成アウトラインを解析しています...</p>
      </div>
    )
  }

  const course = editedOutline || parsedOutline.course
  const totalMinutes = calculateTotalMinutes()
  const totalSessions = calculateTotalSessions()

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">アウトラインレビュー</h2>
        <p className="text-muted-foreground">
          AI生成されたコースアウトラインを確認し、必要に応じて編集・承認してください
        </p>
      </div>

      {/* 統計情報 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{parsedOutline.genres.length} ジャンル</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{totalSessions} セッション</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{Math.round(totalMinutes / 60)} 時間</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{course.estimatedDays} 日間コース</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* コース基本情報 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">{course.title}</CardTitle>
              <CardDescription className="mt-2">{course.description}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge className={getDifficultyInfo(course.difficulty).color}>
                {getDifficultyInfo(course.difficulty).label}
              </Badge>
              <Button
                size="sm"
                variant={isEditing ? "secondary" : "outline"}
                onClick={() => setIsEditing(!isEditing)}
              >
                <Edit className="h-4 w-4 mr-1" />
                {isEditing ? 'プレビュー' : '編集'}
              </Button>
            </div>
          </div>
        </CardHeader>

        {isEditing ? (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-title">コースタイトル</Label>
                <Input
                  id="edit-title"
                  value={course.title}
                  onChange={(e) => setEditedOutline(prev => prev ? {...prev, title: e.target.value} : null)}
                />
              </div>
              <div>
                <Label htmlFor="edit-audience">対象者</Label>
                <Input
                  id="edit-audience"
                  value={course.targetAudience}
                  onChange={(e) => setEditedOutline(prev => prev ? {...prev, targetAudience: e.target.value} : null)}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="edit-description">コース説明</Label>
              <Textarea
                id="edit-description"
                value={course.description}
                onChange={(e) => setEditedOutline(prev => prev ? {...prev, description: e.target.value} : null)}
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-objectives">学習目標</Label>
              <Textarea
                id="edit-objectives"
                value={course.learningObjectives.join('\n')}
                onChange={(e) => setEditedOutline(prev => prev ? {
                  ...prev, 
                  learningObjectives: e.target.value.split('\n').filter(obj => obj.trim())
                } : null)}
                rows={4}
                placeholder="各行に1つずつ学習目標を入力してください"
              />
            </div>
            
            <Button onClick={handleSaveEdits} className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              編集保存
            </Button>
          </CardContent>
        ) : (
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">対象者:</span>
                <span>{course.targetAudience}</span>
              </div>
              
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  学習目標
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {course.learningObjectives.map((objective, index) => (
                    <li key={index}>{objective}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* ジャンル・テーマ構成 */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">コース構成</h3>
        {parsedOutline.genres.map((genre, genreIndex) => (
          <Card key={genre.id} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="text-base">
                ジャンル {genreIndex + 1}: {genre.title}
              </CardTitle>
              <CardDescription>{genre.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {genre.themes.map((theme, themeIndex) => (
                  <div key={theme.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h5 className="font-medium text-sm">
                        テーマ {themeIndex + 1}: {theme.title}
                      </h5>
                      <Badge variant="secondary" className="text-xs">
                        {theme.estimatedMinutes}分
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{theme.description}</p>
                    
                    {/* セッション一覧 */}
                    <div className="space-y-1">
                      {theme.sessions.map((session, sessionIndex) => (
                        <div key={session.id} className="flex items-center justify-between text-xs bg-white rounded p-2">
                          <span>
                            {sessionIndex + 1}. {session.title}
                            <Badge variant="outline" className="ml-2 text-xs">
                              {session.session_type === 'content' ? '講義' : 
                               session.session_type === 'quiz' ? 'クイズ' : '演習'}
                            </Badge>
                          </span>
                          <span className="text-muted-foreground">{session.estimatedMinutes}分</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* レビューノート */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">レビューノート</CardTitle>
          <CardDescription>
            アウトラインに対するコメントや修正指示を記録してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="アウトラインの評価、修正要望、改善提案などを記入してください..."
            rows={4}
          />
        </CardContent>
      </Card>

      {/* アクション */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          前のステップ
        </Button>
        
        <div className="space-x-3">
          <Button 
            variant="destructive" 
            onClick={handleReject}
            className="flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" />
            修正要求
          </Button>
          
          <Button 
            onClick={handleApprove}
            disabled={isCreatingDraft}
            className="flex items-center gap-2"
          >
            {isCreatingDraft ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                ドラフトコース作成中...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                承認・次のステップ
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}