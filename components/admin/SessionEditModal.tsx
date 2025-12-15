'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit, Save, X, Clock, HelpCircle, FileText, Plus } from 'lucide-react'

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
  display_order: number
  estimated_minutes: number
  contents: Content[]
  quizzes: Quiz[]
}

interface SessionEditModalProps {
  session: Session | null
  isOpen: boolean
  onClose: () => void
  onSave: (sessionId: string, data: Partial<Session>) => Promise<void>
  onEditContent: (content: Content) => void
  onEditQuiz: (quiz: Quiz) => void
  onAddContent: (sessionId: string) => void
  onAddQuiz: (sessionId: string) => void
}

const sessionTypeOptions = [
  { value: 'lesson', label: '学習レッスン' },
  { value: 'practice', label: '練習問題' },
  { value: 'quiz', label: 'クイズ' },
  { value: 'review', label: '復習' },
  { value: 'assessment', label: '理解度チェック' }
]

const contentTypeOptions = [
  { value: 'text', label: 'テキスト' },
  { value: 'markdown', label: 'マークダウン' },
  { value: 'video', label: '動画' },
  { value: 'audio', label: '音声' },
  { value: 'image', label: '画像' },
  { value: 'interactive', label: 'インタラクティブ' }
]

export function SessionEditModal({ 
  session, 
  isOpen, 
  onClose, 
  onSave,
  onEditContent,
  onEditQuiz,
  onAddContent,
  onAddQuiz
}: SessionEditModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    session_type: 'lesson',
    estimated_minutes: 15,
    display_order: 1
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (session) {
      setFormData({
        title: session.title,
        session_type: session.session_type,
        estimated_minutes: session.estimated_minutes,
        display_order: session.display_order
      })
    }
  }, [session])

  const handleSave = async () => {
    if (!session) return

    setSaving(true)
    try {
      await onSave(session.id, formData)
      onClose()
    } catch (error) {
      console.error('Session save error:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!session) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="h-5 w-5 mr-2" />
            セッション編集: {session.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">セッション名</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="セッション名を入力..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">セッションタイプ</label>
                <Select 
                  value={formData.session_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, session_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionTypeOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">予想時間（分）</label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={formData.estimated_minutes}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    estimated_minutes: parseInt(e.target.value) || 15 
                  }))}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">表示順序</label>
                <Input
                  type="number"
                  min="1"
                  value={formData.display_order}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    display_order: parseInt(e.target.value) || 1 
                  }))}
                />
              </div>
            </div>
          </div>

          {/* コンテンツ一覧 */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                学習コンテンツ ({session.contents.length}件)
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onAddContent(session.id)}
              >
                <Plus className="h-4 w-4 mr-1" />
                追加
              </Button>
            </div>

            <div className="space-y-2">
              {session.contents.map((content) => (
                <div key={content.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="text-sm font-medium">
                        {content.title || 'タイトルなし'}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground bg-white px-2 py-1 rounded">
                        {contentTypeOptions.find(opt => opt.value === content.content_type)?.label || content.content_type}
                      </span>
                      {content.duration && (
                        <span className="ml-2 text-xs text-muted-foreground flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {content.duration}分
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {content.content.substring(0, 100)}...
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditContent(content)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {session.contents.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  コンテンツがありません
                </p>
              )}
            </div>
          </div>

          {/* クイズ一覧 */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium flex items-center">
                <HelpCircle className="h-4 w-4 mr-2" />
                クイズ問題 ({session.quizzes.length}件)
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onAddQuiz(session.id)}
              >
                <Plus className="h-4 w-4 mr-1" />
                追加
              </Button>
            </div>

            <div className="space-y-2">
              {session.quizzes.map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="text-sm font-medium">
                        問題 {quiz.display_order}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground bg-white px-2 py-1 rounded">
                        {quiz.quiz_type}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {quiz.question}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditQuiz(quiz)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              ))}

              {session.quizzes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  クイズがありません
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}