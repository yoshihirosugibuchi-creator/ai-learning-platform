/**
 * AI生成コンテンツ レビュー・編集ステップ (Step 5.5)
 * AI生成された詳細コンテンツとクイズを確認・修正・承認する
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { coursePublisher } from '@/lib/ai-course-generation/course-publisher'
import { convertToPublisherWorkflow, type CourseWizardWorkflow } from '@/lib/ai-course-generation/type-conversion'
import { 
  CheckCircle2, 
  XCircle, 
  Edit, 
  Save, 
  AlertCircle,
  BookOpen,
  HelpCircle,
  Award,
  Star,
  Target,
  Play,
  Loader2
} from 'lucide-react'

// 型定義（設計書準拠）
interface SessionContent {
  id: string
  session_id: string
  content_type: 'text' | 'image' | 'video' | 'exercise'
  content_data: Record<string, unknown>
  display_order: number
}

interface SessionQuiz {
  id: string
  session_id: string
  question: string
  options: string[]
  correct_answer: number
  explanation: string
  display_order: number
}

interface ContentData {
  session_contents: SessionContent[]
  session_quizzes: SessionQuiz[]
  reward_cards: Record<string, unknown>[]
  completion_badge?: Record<string, unknown>
  review_notes?: string
  approved: boolean
  generated_at?: string
}

interface ContentReviewStepProps {
  workflow: {
    content_data?: ContentData
    outline_data?: {
      course?: { title: string }
      genres?: Array<{
        id: string
        title: string
        themes: Array<{
          id: string
          title: string
          sessions: Array<{
            id: string
            title: string
            session_type: string
          }>
        }>
      }>
    }
    status?: string
  }
  onChange: (updates: Record<string, unknown>) => void
  onNext: () => void
  onPrevious: () => void
}

// コンテンツタイプ表示マッピング
const contentTypeLabels = {
  text: { label: 'テキスト', icon: BookOpen, color: 'bg-blue-100 text-blue-800' },
  image: { label: '画像', icon: Star, color: 'bg-green-100 text-green-800' },
  video: { label: '動画', icon: Play, color: 'bg-purple-100 text-purple-800' },
  exercise: { label: '演習', icon: Target, color: 'bg-orange-100 text-orange-800' }
}

export function ContentReviewStep({ workflow, onChange, onNext, onPrevious }: ContentReviewStepProps) {
  const { toast } = useToast()
  const [reviewNotes, setReviewNotes] = useState(workflow.content_data?.review_notes || '')
  const [editingContent, setEditingContent] = useState<string | null>(null)
  const [editingQuiz, setEditingQuiz] = useState<string | null>(null)
  const [isCreatingComingSoon, setIsCreatingComingSoon] = useState(false)

  const contentData = workflow.content_data

  // コンテンツが生成されていない場合のメッセージ
  if (!contentData || (!contentData.session_contents.length && !contentData.session_quizzes.length)) {
    return (
      <div className="space-y-6">
        <Alert variant="default">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            詳細コンテンツがまだ生成されていません。Step 5で先にコンテンツ生成を実行してください。
          </AlertDescription>
        </Alert>
        
        <div className="space-x-4">
          <Button variant="outline" onClick={onPrevious}>戻る</Button>
        </div>
      </div>
    )
  }

  // セッション別にコンテンツを整理
  const sessionMap = new Map<string, {
    sessionInfo: {
      id: string
      title: string
      session_type: string
    }
    contents: SessionContent[]
    quizzes: SessionQuiz[]
  }>()

  // セッション情報を取得
  workflow.outline_data?.genres?.forEach(genre => {
    genre.themes.forEach(theme => {
      theme.sessions.forEach(session => {
        sessionMap.set(session.id, {
          sessionInfo: session,
          contents: [],
          quizzes: []
        })
      })
    })
  })

  // コンテンツとクイズを該当セッションに配置
  contentData.session_contents.forEach(content => {
    const sessionData = sessionMap.get(content.session_id)
    if (sessionData) {
      sessionData.contents.push(content)
    }
  })

  contentData.session_quizzes.forEach(quiz => {
    const sessionData = sessionMap.get(quiz.session_id)
    if (sessionData) {
      sessionData.quizzes.push(quiz)
    }
  })

  // コンテンツ保存ハンドラ
  const handleSaveContent = (contentId: string, newData: Record<string, unknown>) => {
    const updatedContents = contentData.session_contents.map(content =>
      content.id === contentId 
        ? { ...content, content_data: { ...content.content_data, ...newData } }
        : content
    )

    onChange({
      content_data: {
        ...contentData,
        session_contents: updatedContents
      }
    })

    setEditingContent(null)
    toast({
      title: "コンテンツ保存完了",
      description: "コンテンツの編集が保存されました"
    })
  }

  // クイズ保存ハンドラ
  const handleSaveQuiz = (quizId: string, updates: Partial<SessionQuiz>) => {
    const updatedQuizzes = contentData.session_quizzes.map(quiz =>
      quiz.id === quizId ? { ...quiz, ...updates } : quiz
    )

    onChange({
      content_data: {
        ...contentData,
        session_quizzes: updatedQuizzes
      }
    })

    setEditingQuiz(null)
    toast({
      title: "クイズ保存完了",
      description: "クイズの編集が保存されました"
    })
  }

  // コンテンツ承認
  const handleApprove = async () => {
    setIsCreatingComingSoon(true)

    try {
      // ワークフロー更新
      onChange({
        content_data: {
          ...contentData,
          review_notes: reviewNotes,
          approved: true
        },
        status: 'content_approved'
      })

      // コンテンツ承認済みの場合、coming_soonコース作成  
      const wizardWorkflow = workflow as CourseWizardWorkflow
      if (wizardWorkflow.content_data?.approved || true) { // 承認処理なので常にtrue
        // 型変換: CourseWizard型 → CourseGenerationWorkflow型
        const publishWorkflow = await convertToPublisherWorkflow({
          ...wizardWorkflow,
          content_data: {
            ...contentData,
            review_notes: reviewNotes,
            approved: true
          },
          status: 'content_approved'
        })
        
        const publishResult = await coursePublisher.publishFromContent(publishWorkflow, {
          status: 'coming_soon',
          generateIds: true
        })

        if (publishResult.success) {
          toast({
            title: "コンテンツ承認完了",
            description: `Coming Soonコース「${publishResult.courseId}」を作成しました。最終レビューに進んでください。`
          })
        } else {
          console.error('[ContentReview] Coming Soon course creation failed:', publishResult.error)
          toast({
            title: "コンテンツ承認完了",
            description: "コンテンツが承認されました（Coming Soonコース作成はスキップされました）"
          })
        }
      } else {
        toast({
          title: "コンテンツ承認完了",
          description: "コンテンツが承認されました。最終レビューに進んでください。"
        })
      }

      onNext()

    } catch (error) {
      console.error('[ContentReview] Error in handleApprove:', error)
      toast({
        title: "エラーが発生しました",
        description: "コンテンツ承認処理中にエラーが発生しました",
        variant: "destructive"
      })
    } finally {
      setIsCreatingComingSoon(false)
    }
  }

  // コンテンツ差し戻し
  const handleReject = () => {
    onChange({
      content_data: {
        ...contentData,
        review_notes: reviewNotes,
        approved: false
      },
      status: 'content_draft'
    })
    
    toast({
      title: "コンテンツ差し戻し",
      description: "修正指示を記録しました。Step 5に戻って再生成してください。",
      variant: "default"
    })
    
    onPrevious()
  }

  // 統計情報計算
  const totalContents = contentData.session_contents.length
  const totalQuizzes = contentData.session_quizzes.length
  const totalRewardCards = contentData.reward_cards.length
  const hasBadge = !!contentData.completion_badge

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">コンテンツレビュー</h2>
        <p className="text-muted-foreground">
          AI生成されたコンテンツとクイズを確認し、必要に応じて編集・承認してください
        </p>
      </div>

      {/* 統計情報 */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-green-600" />
              <span className="font-medium">{totalContents} コンテンツ</span>
            </div>
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-green-600" />
              <span className="font-medium">{totalQuizzes} クイズ</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-green-600" />
              <span className="font-medium">{totalRewardCards} ナレッジカード</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-green-600" />
              <span className="font-medium">{hasBadge ? '修了証' : '修了証なし'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* メインコンテンツ */}
      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sessions">セッション別コンテンツ</TabsTrigger>
          <TabsTrigger value="rewards">ナレッジカード</TabsTrigger>
          <TabsTrigger value="badge">修了証バッジ</TabsTrigger>
        </TabsList>

        {/* セッション別コンテンツタブ */}
        <TabsContent value="sessions" className="space-y-4">
          <div className="space-y-6">
            {Array.from(sessionMap.entries()).map(([sessionId, sessionData]) => {
              if (sessionData.contents.length === 0 && sessionData.quizzes.length === 0) return null
              
              return (
                <Card key={sessionId} className="border-2">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-lg">{sessionData.sessionInfo.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {sessionData.contents.length}コンテンツ・{sessionData.quizzes.length}クイズ
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    {/* セッションコンテンツ */}
                    {sessionData.contents.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">コンテンツ</h4>
                        {sessionData.contents.map(content => {
                          const typeInfo = contentTypeLabels[content.content_type]
                          const isEditing = editingContent === content.id
                          
                          return (
                            <Card key={content.id} className="border-l-4 border-l-blue-500">
                              <CardHeader className="pb-3">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <typeInfo.icon className="h-4 w-4" />
                                    <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant={isEditing ? "secondary" : "outline"}
                                    onClick={() => setEditingContent(isEditing ? null : content.id)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    {isEditing ? 'プレビュー' : '編集'}
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent>
                                {isEditing ? (
                                  <div className="space-y-3">
                                    <div>
                                      <Label>タイトル</Label>
                                      <Input
                                        defaultValue={(content.content_data.title as string) || ''}
                                        id={`title-${content.id}`}
                                      />
                                    </div>
                                    <div>
                                      <Label>コンテンツ内容</Label>
                                      <Textarea
                                        defaultValue={(content.content_data.content as string) || ''}
                                        rows={6}
                                        id={`content-${content.id}`}
                                      />
                                    </div>
                                    <Button 
                                      onClick={() => {
                                        const titleInput = document.getElementById(`title-${content.id}`) as HTMLInputElement
                                        const contentInput = document.getElementById(`content-${content.id}`) as HTMLTextAreaElement
                                        
                                        handleSaveContent(content.id, {
                                          title: titleInput?.value || '',
                                          content: contentInput?.value || ''
                                        })
                                      }}
                                      className="flex items-center gap-2"
                                    >
                                      <Save className="h-4 w-4" />
                                      保存
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <h5 className="font-medium">{(content.content_data.title as string) || 'タイトルなし'}</h5>
                                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                      {(content.content_data.content as string) || 'コンテンツなし'}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}

                    {/* セッションクイズ */}
                    {sessionData.quizzes.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-medium text-sm">確認クイズ</h4>
                        {sessionData.quizzes.map((quiz, index) => {
                          const isEditing = editingQuiz === quiz.id
                          
                          return (
                            <Card key={quiz.id} className="border-l-4 border-l-amber-500">
                              <CardHeader className="pb-3">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <HelpCircle className="h-4 w-4" />
                                    <span className="font-medium">クイズ {index + 1}</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant={isEditing ? "secondary" : "outline"}
                                    onClick={() => setEditingQuiz(isEditing ? null : quiz.id)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    {isEditing ? 'プレビュー' : '編集'}
                                  </Button>
                                </div>
                              </CardHeader>
                              <CardContent>
                                {isEditing ? (
                                  <div className="space-y-3">
                                    <div>
                                      <Label>問題文</Label>
                                      <Textarea
                                        defaultValue={quiz.question}
                                        rows={3}
                                        id={`question-${quiz.id}`}
                                      />
                                    </div>
                                    <div>
                                      <Label>選択肢（1行につき1つ）</Label>
                                      <Textarea
                                        defaultValue={quiz.options.join('\n')}
                                        rows={4}
                                        id={`options-${quiz.id}`}
                                      />
                                    </div>
                                    <div>
                                      <Label>正答番号（1から始まる）</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        defaultValue={quiz.correct_answer + 1}
                                        id={`answer-${quiz.id}`}
                                      />
                                    </div>
                                    <div>
                                      <Label>解説</Label>
                                      <Textarea
                                        defaultValue={quiz.explanation}
                                        rows={3}
                                        id={`explanation-${quiz.id}`}
                                      />
                                    </div>
                                    <Button 
                                      onClick={() => {
                                        const questionInput = document.getElementById(`question-${quiz.id}`) as HTMLTextAreaElement
                                        const optionsInput = document.getElementById(`options-${quiz.id}`) as HTMLTextAreaElement
                                        const answerInput = document.getElementById(`answer-${quiz.id}`) as HTMLInputElement
                                        const explanationInput = document.getElementById(`explanation-${quiz.id}`) as HTMLTextAreaElement
                                        
                                        handleSaveQuiz(quiz.id, {
                                          question: questionInput?.value || '',
                                          options: optionsInput?.value.split('\n').filter(opt => opt.trim()),
                                          correct_answer: parseInt(answerInput?.value || '1') - 1,
                                          explanation: explanationInput?.value || ''
                                        })
                                      }}
                                      className="flex items-center gap-2"
                                    >
                                      <Save className="h-4 w-4" />
                                      保存
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="space-y-3">
                                    <p className="font-medium">{quiz.question}</p>
                                    <div className="space-y-1">
                                      {quiz.options.map((option, optIndex) => (
                                        <div key={optIndex} className="flex items-center gap-2">
                                          <span className={`text-sm px-2 py-1 rounded ${
                                            optIndex === quiz.correct_answer 
                                              ? 'bg-green-100 text-green-800 font-medium' 
                                              : 'bg-gray-100'
                                          }`}>
                                            {optIndex + 1}. {option}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      <strong>解説:</strong> {quiz.explanation}
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* ナレッジカードタブ */}
        <TabsContent value="rewards" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">ナレッジカード</CardTitle>
              <CardDescription>
                テーマ完了時に付与されるナレッジカード（{totalRewardCards}枚）
              </CardDescription>
            </CardHeader>
            <CardContent>
              {totalRewardCards > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contentData.reward_cards.map((card, index) => (
                    <Card key={index} className="border-2 border-dashed border-purple-300">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="h-4 w-4 text-purple-600" />
                          <span className="font-medium text-sm">ナレッジカード {index + 1}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {(card as Record<string, unknown>).title as string || 'カードタイトル'}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  ナレッジカードが生成されていません
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 修了証バッジタブ */}
        <TabsContent value="badge" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">修了証バッジ</CardTitle>
              <CardDescription>
                コース完了時に付与される修了証バッジ
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasBadge ? (
                <div className="text-center py-8">
                  <Award className="h-16 w-16 mx-auto text-yellow-600 mb-4" />
                  <p className="font-medium">
                    {(contentData.completion_badge as Record<string, unknown>)?.title as string || 'コース修了証'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {(contentData.completion_badge as Record<string, unknown>)?.description as string || '修了証の説明'}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  修了証バッジが設定されていません
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* レビューノート */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">レビューノート</CardTitle>
          <CardDescription>
            コンテンツに対するコメントや修正指示を記録してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="コンテンツの評価、修正要望、改善提案などを記入してください..."
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
            disabled={isCreatingComingSoon}
            className="min-w-40 flex items-center gap-2"
          >
            {isCreatingComingSoon ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Coming Soon作成中...
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