'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  FileText, 
  HelpCircle, 
  Video, 
  Image, 
  Music, 
  Sparkles,
  Clock,
  ArrowUpDown,
  GripVertical
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
import { ContentEditModal } from './ContentEditModal'
import { QuizEditModal } from './QuizEditModal'

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

interface Session {
  id: string
  theme_id: string
  title: string
  session_type: string
  estimated_minutes: number | null
  display_order: number
  contents: Content[]
  quizzes: Quiz[]
}

interface SessionContentDrawerProps {
  session: Session
  onSessionUpdate: (sessionId: string, updates: Partial<Session>) => Promise<void>
  onAddContent: (sessionId: string) => Promise<void>
  onAddQuiz: (sessionId: string) => Promise<void>
  onContentSave: (contentId: string, data: Partial<Content>) => Promise<void>
  onQuizSave: (quizId: string, data: Partial<Quiz>) => Promise<void>
  onContentDelete: (contentId: string) => Promise<void>
  onQuizDelete: (quizId: string) => Promise<void>
}

const contentTypeIcons = {
  text: FileText,
  markdown: FileText,
  video: Video,
  audio: Music,
  image: Image,
  interactive: Sparkles,
}

const contentTypeLabels = {
  text: 'テキスト',
  markdown: 'マークダウン',
  video: '動画',
  audio: '音声',
  image: '画像',
  interactive: 'インタラクティブ',
}

// ドラッグ可能なコンテンツアイテムコンポーネント
function SortableContentItem({
  content,
  onEdit,
  onDelete
}: {
  content: Content
  onEdit: (content: Content) => void
  onDelete: (contentId: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: content.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const IconComponent = contentTypeIcons[content.content_type as keyof typeof contentTypeIcons] || FileText
  const typeLabel = contentTypeLabels[content.content_type as keyof typeof contentTypeLabels] || content.content_type

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between p-3 bg-white border rounded overflow-hidden"
    >
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <IconComponent className="h-4 w-4 text-blue-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate block" style={{ maxWidth: 'calc(100% - 150px)' }}>
              {content.title || 'タイトルなし'}
            </span>
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {typeLabel}
            </Badge>
            {content.duration && (
              <span className="text-xs text-muted-foreground flex items-center flex-shrink-0">
                <Clock className="h-3 w-3 mr-1" />
                {content.duration}分
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {content.content.substring(0, 80)}...
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-1 ml-2 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(content)}
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(content.id)}
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}

export function SessionContentDrawer({
  session,
  onSessionUpdate: _onSessionUpdate,
  onAddContent: _onAddContent,
  onAddQuiz: _onAddQuiz,
  onContentSave,
  onQuizSave,
  onContentDelete,
  onQuizDelete
}: SessionContentDrawerProps) {
  const [editingContent, setEditingContent] = useState<Content | null>(null)
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)
  
  // ドラッグ&ドロップのセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleContentEdit = (content: Content) => {
    setEditingContent(content)
  }

  const handleQuizEdit = (quiz: Quiz) => {
    setEditingQuiz(quiz)
  }

  const handleContentSave = async (contentId: string, data: Partial<Content>) => {
    try {
      if (contentId === '') {
        // 新規作成時はonContentSaveを使って新規作成APIを呼ぶ
        await onContentSave('', {
          ...data,
          session_id: session.id
        })
      } else {
        // 既存更新
        await onContentSave(contentId, data)
      }
      setEditingContent(null)
    } catch (error) {
      console.error('Content save error in SessionContentDrawer:', error)
      // エラーが発生してもモーダルは開いたままにしてユーザーが再試行できるように
    }
  }

  const handleQuizSave = async (quizId: string, data: Partial<Quiz>) => {
    try {
      if (quizId === '') {
        // 新規作成時はonQuizSaveを使って新規作成APIを呼ぶ
        // onAddQuizは削除予定のため使用しない
        await onQuizSave('', {
          ...data,
          session_id: session.id
        })
      } else {
        // 既存更新
        await onQuizSave(quizId, data)
      }
      setEditingQuiz(null)
    } catch (error) {
      console.error('Quiz save error in SessionContentDrawer:', error)
      // エラーが発生してもモーダルは開いたままにしてユーザーが再試行できるように
    }
  }

  // コンテンツドラッグエンドハンドラー
  const handleContentDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (!over || active.id === over.id) return

    const oldIndex = session.contents.findIndex(content => content.id === active.id)
    const newIndex = session.contents.findIndex(content => content.id === over.id)
    
    if (oldIndex === -1 || newIndex === -1) return

    const reorderedContents = arrayMove(session.contents, oldIndex, newIndex)
    
    // display_orderを更新
    const updatedContents = reorderedContents.map((content, index) => ({
      ...content,
      display_order: index + 1
    }))

    try {
      // サーバーに並び順を送信
      // TODO: API実装 - /api/admin/sessions/{sessionId}/contents/reorder
      console.log('Reordering contents:', updatedContents.map(c => ({ id: c.id, display_order: c.display_order })))
      
      // 楽観的更新（実際のAPIではSession全体の再取得が必要）
    } catch (error) {
      console.error('Content reorder failed:', error)
    }
  }

  const totalDuration = session.contents
    .filter(content => content.duration)
    .reduce((sum, content) => sum + (content.duration || 0), 0)

  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            size="sm" 
            variant="outline"
            className="border-purple-300 text-purple-700 hover:bg-purple-100"
          >
            <Settings className="h-3 w-3 mr-1" />
            詳細管理
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[800px] max-h-[90vh] overflow-x-hidden overflow-y-auto">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-lg break-words">
              <span className="break-all">{session.title}</span> - コンテンツ・クイズ管理
            </DialogTitle>
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>{session.contents.length} コンテンツ</span>
                </div>
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  <span>{session.quizzes.length} クイズ</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>予想時間: {totalDuration}分</span>
                </div>
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 flex-shrink-0" />
                  <span className="break-words">タイプ: {session.session_type === 'knowledge' ? '知識' : session.session_type === 'practice' ? '実践' : 'ケース'}</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="mt-6 space-y-6 w-full overflow-x-hidden">
            {/* コンテンツ管理セクション */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileText className="h-5 w-5 flex-shrink-0" />
                  学習コンテンツ
                </h3>
                <Button 
                  size="sm"
                  onClick={() => setEditingContent({
                    id: '',
                    session_id: session.id,
                    content_type: 'text',
                    title: '',
                    content: '',
                    duration: null,
                    display_order: session.contents.length + 1
                  })}
                  className="bg-blue-600 hover:bg-blue-700 flex-shrink-0"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  コンテンツ追加
                </Button>
              </div>

              {session.contents.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>学習コンテンツがまだありません</p>
                      <p className="text-sm">「コンテンツ追加」ボタンから新しいコンテンツを作成してください</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleContentDragEnd}
                >
                  <SortableContext 
                    items={session.contents.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {session.contents
                        .sort((a, b) => a.display_order - b.display_order)
                        .map((content) => (
                          <SortableContentItem
                            key={content.id}
                            content={content}
                            onEdit={handleContentEdit}
                            onDelete={onContentDelete}
                          />
                        ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>

            <div className="border-t pt-6">
              {/* クイズ管理セクション */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 flex-shrink-0" />
                  確認クイズ
                </h3>
                <Button 
                  size="sm"
                  onClick={() => setEditingQuiz({
                    id: '',
                    session_id: session.id,
                    question: '',
                    options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
                    correct_answer: 0,
                    explanation: '',
                    quiz_type: 'single_choice',
                    display_order: session.quizzes.length + 1
                  })}
                  className="bg-amber-600 hover:bg-amber-700 flex-shrink-0"
                  disabled={session.quizzes.length >= 1}
                  title={session.quizzes.length >= 1 ? "Phase1制限: 1セッション1クイズまで" : ""}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  <span className="break-words">クイズ追加 {session.quizzes.length >= 1 && "(制限到達)"}</span>
                </Button>
              </div>

              {session.quizzes.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="pt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>確認クイズがまだありません</p>
                      <p className="text-sm">「クイズ追加」ボタンから新しいクイズを作成してください</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {session.quizzes
                    .sort((a, b) => a.display_order - b.display_order)
                    .map((quiz, index) => (
                      <Card key={quiz.id} className="border-l-4 border-l-amber-500 overflow-hidden">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <HelpCircle className="h-4 w-4 flex-shrink-0" />
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                {quiz.quiz_type === 'single_choice' ? '単一選択' :
                                 quiz.quiz_type === 'multiple_choice' ? '複数選択' :
                                 quiz.quiz_type === 'true_false' ? '○×問題' :
                                 quiz.quiz_type === 'fill_blank' ? '穴埋め' :
                                 quiz.quiz_type === 'essay' ? '記述' : '単一選択'}
                              </Badge>
                              <span className="text-sm font-medium">
                                クイズ {index + 1}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleQuizEdit(quiz)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onQuizDelete(quiz.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-2 break-all">
                            {quiz.question || 'クイズ問題文なし'}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* モーダル */}
      <ContentEditModal
        content={editingContent}
        isOpen={!!editingContent}
        onClose={() => setEditingContent(null)}
        onSave={handleContentSave}
        onDelete={onContentDelete}
      />
      
      <QuizEditModal
        quiz={editingQuiz}
        isOpen={!!editingQuiz}
        onClose={() => setEditingQuiz(null)}
        onSave={handleQuizSave}
        onDelete={onQuizDelete}
      />
    </>
  )
}