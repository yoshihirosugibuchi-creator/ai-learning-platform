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
// Note: skill-levels-helper functions are server-side only
import {
  Edit,
  Save,
  AlertCircle,
  BookOpen,
  Clock,
  Target,
  Users,
  Star,
  ArrowLeft,
  ArrowRight
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
  session_type: 'knowledge' | 'practice' | 'case_study'
  estimatedMinutes: number
  display_order: number
}

interface OutlineReviewStepProps {
  workflow: {
    aiOutlineResponse?: string
    outline_data?: {
      course?: CourseOutline
      genres?: GenreOutline[]
      approved?: boolean
      generated_at?: string
      ai_response_raw?: string
    }
    status?: string
    published_course_id?: string  // コースデータ存在判定用
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
  const [editedOutline, setEditedOutline] = useState<CourseOutline | null>(null)
  const [editedGenres, setEditedGenres] = useState<GenreOutline[]>([])
  const [_validSkillLevels, setValidSkillLevels] = useState<string[]>(['basic', 'intermediate', 'advanced', 'expert'])
  
  // アウトライン解析（AI生成されたJSONから構造化）
  const [parsedOutline, setParsedOutline] = useState<{
    course: CourseOutline
    genres: GenreOutline[]
  } | null>(null)
  
  const [parseError, setParseError] = useState<string | null>(null)

  // skill_levels API経由取得
  useEffect(() => {
    const loadSkillLevels = async () => {
      try {
        const { ApiClient } = await import('@/lib/api-helpers')
        const skillLevelsResult = await ApiClient.get<{ skill_levels: Array<{ id: string; name: string }> }>('/api/skill-levels')
        const skillLevelIds = skillLevelsResult.skill_levels?.map(level => level.id) || []
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
      // 既存のoutline_dataを優先して使用（編集済みデータ）
      if (workflow.outline_data && workflow.outline_data.course && workflow.outline_data.genres) {
        console.log('📋 [OutlineReview] 既存のoutline_dataを使用')
        setParsedOutline({
          course: workflow.outline_data.course,
          genres: workflow.outline_data.genres
        })
        setEditedOutline(workflow.outline_data.course)
        setEditedGenres(workflow.outline_data.genres)
        setParseError(null)
        return
      }
      
      // outline_dataがない場合はaiOutlineResponseから解析
      if (workflow.aiOutlineResponse) {
        try {
          console.log('🔄 [OutlineReview] AIレスポンスを解析')
          // JSON解析を試行
          const parsed = JSON.parse(workflow.aiOutlineResponse)
          
          // 最低限の構造チェック
          if (!parsed.course || !parsed.genres) {
            throw new Error('Invalid outline structure')
          }
          
          // difficulty検証・修正（フォールバック対応）
          if (parsed.course && parsed.course.difficulty) {
            const validDifficulties = ['basic', 'intermediate', 'advanced', 'expert']
            if (!validDifficulties.includes(parsed.course.difficulty)) {
              console.log(`🔧 [OutlineReview] Difficulty corrected: ${parsed.course.difficulty} -> basic`)
              parsed.course.difficulty = 'basic'
            }
          } else {
            // difficulty未設定の場合はbasicをデフォルト
            parsed.course.difficulty = 'basic'
          }
          
          setParsedOutline(parsed)
          setEditedOutline(parsed.course)
          setEditedGenres(parsed.genres)
          setParseError(null)
          
        } catch (error) {
          console.error('❌ Outline parsing error:', error)
          setParseError('AI生成レスポンスの解析に失敗しました。JSON形式が正しくない可能性があります。')
          setParsedOutline(null)
        }
      }
    }
    
    parseOutline()
  }, [workflow.aiOutlineResponse, workflow.outline_data])

  // ジャンルタイトル編集
  const handleGenreEdit = (genreIndex: number, field: string, value: string) => {
    setEditedGenres(prev => {
      const newGenres = [...prev]
      newGenres[genreIndex] = {
        ...newGenres[genreIndex],
        [field]: value
      }
      return newGenres
    })
  }

  // テーマ編集
  const handleThemeEdit = (genreIndex: number, themeIndex: number, field: string, value: string | number) => {
    setEditedGenres(prev => {
      const newGenres = [...prev]
      const newThemes = [...newGenres[genreIndex].themes]
      newThemes[themeIndex] = {
        ...newThemes[themeIndex],
        [field]: value
      }
      newGenres[genreIndex] = {
        ...newGenres[genreIndex],
        themes: newThemes
      }
      return newGenres
    })
  }

  // セッション編集
  const handleSessionEdit = (genreIndex: number, themeIndex: number, sessionIndex: number, field: string, value: string | number) => {
    setEditedGenres(prev => {
      const newGenres = [...prev]
      const newThemes = [...newGenres[genreIndex].themes]
      const newSessions = [...newThemes[themeIndex].sessions]
      newSessions[sessionIndex] = {
        ...newSessions[sessionIndex],
        [field]: value
      }
      newThemes[themeIndex] = {
        ...newThemes[themeIndex],
        sessions: newSessions
      }
      newGenres[genreIndex] = {
        ...newGenres[genreIndex],
        themes: newThemes
      }
      return newGenres
    })
  }

  // アウトライン編集保存
  const handleSaveEdits = () => {
    if (!editedOutline || !editedGenres) return

    const updatedOutline = {
      course: editedOutline,
      genres: editedGenres
    }
    
    onChange({
      outline_data: {
        course: editedOutline,
        genres: editedGenres,
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

  // コースデータが存在するかどうか
  const hasCourseData = Boolean(workflow.published_course_id)

  // 次のステップへ進む
  const handleNext = () => {
    if (!parsedOutline) return

    // ワークフロー更新（アウトライン確定状態）
    const updatedWorkflow = {
      ...workflow,
      outline_data: {
        course: editedOutline || parsedOutline.course,
        genres: editedGenres.length > 0 ? editedGenres : parsedOutline.genres,
        approved: true,
        generated_at: workflow.outline_data?.generated_at || new Date().toISOString(),
        ai_response_raw: workflow.aiOutlineResponse
      },
      status: 'outline_approved'
    }

    onChange(updatedWorkflow)

    toast({
      title: "アウトライン確定",
      description: "次のステップでカテゴリマッピングを行い、コースデータを生成します。"
    })

    onNext()
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
              {hasCourseData ? (
                <Badge variant="secondary" className="text-xs">
                  コース作成済み（編集不可）
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant={isEditing ? "secondary" : "outline"}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  {isEditing ? 'プレビュー' : '編集'}
                </Button>
              )}
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
        {parsedOutline && parsedOutline.genres && parsedOutline.genres.length > 0 ? (
          (isEditing ? editedGenres : parsedOutline.genres).map((genre, genreIndex) => (
          <Card key={genre.id} className="border-l-4 border-l-blue-500">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-2">
                      <Input
                        value={genre.title}
                        onChange={(e) => handleGenreEdit(genreIndex, 'title', e.target.value)}
                        placeholder="ジャンルタイトル"
                        className="font-medium"
                      />
                      <Textarea
                        value={genre.description}
                        onChange={(e) => handleGenreEdit(genreIndex, 'description', e.target.value)}
                        placeholder="ジャンルの説明"
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-base">
                        ジャンル {genreIndex + 1}: {genre.title}
                      </CardTitle>
                      <CardDescription>{genre.description}</CardDescription>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {genre.themes.map((theme, themeIndex) => (
                  <div key={theme.id} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      {isEditing ? (
                        <div className="flex-1 space-y-2 mr-3">
                          <Input
                            value={theme.title}
                            onChange={(e) => handleThemeEdit(genreIndex, themeIndex, 'title', e.target.value)}
                            placeholder="テーマタイトル"
                            className="text-sm font-medium"
                          />
                          <Textarea
                            value={theme.description}
                            onChange={(e) => handleThemeEdit(genreIndex, themeIndex, 'description', e.target.value)}
                            placeholder="テーマの説明"
                            rows={2}
                            className="text-xs"
                          />
                        </div>
                      ) : (
                        <h5 className="font-medium text-sm">
                          テーマ {themeIndex + 1}: {theme.title}
                        </h5>
                      )}
                      <div className="flex flex-col gap-1">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={theme.estimatedMinutes}
                            onChange={(e) => handleThemeEdit(genreIndex, themeIndex, 'estimatedMinutes', parseInt(e.target.value))}
                            className="w-20 text-xs"
                            min="1"
                          />
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            {theme.estimatedMinutes}分
                          </Badge>
                        )}
                      </div>
                    </div>
                    {!isEditing && (
                      <p className="text-xs text-muted-foreground mb-2">{theme.description}</p>
                    )}
                    
                    {/* セッション一覧 */}
                    <div className="space-y-1">
                      {theme.sessions.map((session, sessionIndex) => (
                        <div key={session.id} className="flex items-center justify-between text-xs bg-white rounded p-2">
                          {isEditing ? (
                            <div className="flex-1 flex gap-2 items-center">
                              <Input
                                value={session.title}
                                onChange={(e) => handleSessionEdit(genreIndex, themeIndex, sessionIndex, 'title', e.target.value)}
                                placeholder="セッションタイトル"
                                className="text-xs flex-1"
                              />
                              <select
                                value={session.session_type}
                                onChange={(e) => handleSessionEdit(genreIndex, themeIndex, sessionIndex, 'session_type', e.target.value)}
                                className="text-xs border rounded px-2 py-1"
                              >
                                <option value="knowledge">知識学習</option>
                                <option value="practice">実践演習</option>
                                <option value="case_study">ケーススタディ</option>
                              </select>
                              <Input
                                type="number"
                                value={session.estimatedMinutes}
                                onChange={(e) => handleSessionEdit(genreIndex, themeIndex, sessionIndex, 'estimatedMinutes', parseInt(e.target.value))}
                                className="w-16 text-xs"
                                min="1"
                              />
                            </div>
                          ) : (
                            <>
                              <span>
                                {sessionIndex + 1}. {session.title}
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {session.session_type === 'knowledge' ? '知識学習' : 
                                   session.session_type === 'practice' ? '実践演習' : 'ケーススタディ'}
                                </Badge>
                              </span>
                              <span className="text-muted-foreground">{session.estimatedMinutes}分</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          ))
        ) : parsedOutline ? (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>コース構成が空です。</strong><br />
              Step 3でAIレスポンスを再入力してコース構成を生成してください。
            </AlertDescription>
          </Alert>
        ) : null}
      </div>


      {/* アクションボタン */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={onPrevious}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          前のステップ
        </Button>

        <div className="flex gap-3">
          {isEditing && (
            <>
              <Button
                onClick={() => {
                  // キャンセル: 編集内容を破棄して元に戻す
                  if (parsedOutline) {
                    setEditedOutline(parsedOutline.course)
                    setEditedGenres(parsedOutline.genres)
                  }
                  setIsEditing(false)
                }}
                variant="outline"
                className="flex items-center gap-2"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSaveEdits}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                編集を保存
              </Button>
            </>
          )}

          {!isEditing && (
            <Button
              onClick={handleNext}
              className="flex items-center gap-2"
            >
              次のステップ
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}