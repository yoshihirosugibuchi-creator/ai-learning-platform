'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Save, X, HelpCircle, CheckCircle } from 'lucide-react'

interface Quiz {
  id: string
  session_id: string
  question: string
  options: string[]
  correct_answer: number
  explanation: string
  quiz_type: 'single_choice'
  display_order: number
}

interface Phase1QuizEditModalProps {
  quiz: Quiz | null
  isOpen: boolean
  onClose: () => void
  onSave: (quizData: {
    session_id: string
    quiz_type: 'single_choice'
    question: string
    options: string[]
    correct_answer: number
    explanation: string
  }) => Promise<void>
  sessionId?: string
}

export function Phase1QuizEditModal({
  quiz,
  isOpen,
  onClose,
  onSave,
  sessionId
}: Phase1QuizEditModalProps) {
  const [formData, setFormData] = useState({
    question: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    explanation: ''
  })
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    if (quiz) {
      // optionsが配列であることを確認
      let optionsArray: string[] = ['', '', '', '']
      if (Array.isArray(quiz.options)) {
        optionsArray = quiz.options.map(opt => String(opt))
        // 4つの選択肢を保証
        while (optionsArray.length < 4) {
          optionsArray.push('')
        }
      }
      
      setFormData({
        question: quiz.question,
        options: optionsArray,
        correct_answer: quiz.correct_answer,
        explanation: quiz.explanation
      })
    } else {
      // 新規作成モードの場合は初期化
      setFormData({
        question: '',
        options: ['', '', '', ''],
        correct_answer: 0,
        explanation: ''
      })
    }
    setHasUnsavedChanges(false)
  }, [quiz])

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      const shouldClose = window.confirm('編集中の内容が失われます。モーダルを閉じますか？')
      if (!shouldClose) return
    }
    setHasUnsavedChanges(false)
    onClose()
  }, [hasUnsavedChanges, onClose])

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options]
    newOptions[index] = value
    setFormData(prev => ({ ...prev, options: newOptions }))
    setHasUnsavedChanges(true)
  }

  const handleSave = async () => {
    if (!sessionId && !quiz?.session_id) return

    setSaving(true)
    try {
      await onSave({
        session_id: sessionId || quiz!.session_id,
        quiz_type: 'single_choice',
        question: formData.question,
        options: formData.options,
        correct_answer: formData.correct_answer,
        explanation: formData.explanation
      })
      setHasUnsavedChanges(false)
      onClose()
    } catch (error) {
      console.error('Quiz save error:', error)
    } finally {
      setSaving(false)
    }
  }

  const isValid = formData.question.trim() && 
                  formData.options.every(opt => typeof opt === 'string' && opt.trim()) && 
                  formData.explanation.trim()

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <HelpCircle className="h-5 w-5 text-purple-600" />
            <span>
              {quiz ? 'クイズ編集' : 'クイズ新規作成'} (Phase1仕様)
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Phase制約と拡張予定 */}
          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="text-sm font-semibold text-purple-800 mb-3">クイズタイプ制限・拡張予定</h4>
            
            <div className="space-y-2 text-xs">
              {/* Phase 1 現在の制限 */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="font-medium text-purple-800">Phase 1（現在）:</span>
                <span className="text-purple-700">single_choice のみ・1セッション1問まで</span>
              </div>
              
              {/* Phase 2 拡張予定 */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="font-medium text-green-800">Phase 2（予定）:</span>
                <span className="text-green-700">+ true_false, sorting・複数問対応・制約解除</span>
              </div>
              
              {/* Phase 3 拡張予定 */}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                <span className="font-medium text-orange-800">Phase 3（将来）:</span>
                <span className="text-orange-700">+ fill_blank, essay・AI採点・記述問題</span>
              </div>
            </div>
            
            <div className="mt-3 p-2 bg-white rounded border border-purple-200">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                <span className="font-medium text-purple-800">現在選択: single_choice (単一選択)</span>
              </div>
              <p className="text-xs text-purple-700 mt-1">
                4つの選択肢から1つの正解を選ぶ形式です。
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="question" className="text-sm font-medium">
              問題文 *
            </Label>
            <Textarea
              id="question"
              value={formData.question}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, question: e.target.value }))
                setHasUnsavedChanges(true)
              }}
              placeholder="クイズの問題文を入力してください..."
              rows={3}
              className="resize-none"
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-3 block">
              選択肢 * (4つ全て入力必須)
            </Label>
            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={formData.correct_answer === index}
                      onChange={() => {
                        setFormData(prev => ({ ...prev, correct_answer: index }))
                        setHasUnsavedChanges(true)
                      }}
                      className="h-4 w-4 text-purple-600"
                    />
                    <label className="text-sm font-medium min-w-[60px]">
                      選択肢 {index + 1}
                    </label>
                  </div>
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`選択肢${index + 1}を入力...`}
                    className={formData.correct_answer === index ? 'border-purple-300 bg-purple-50' : ''}
                  />
                  {formData.correct_answer === index && (
                    <CheckCircle className="h-4 w-4 text-purple-600 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              ラジオボタンをクリックして正解を選択してください
            </p>
          </div>

          <div>
            <Label htmlFor="explanation" className="text-sm font-medium">
              解説 *
            </Label>
            <Textarea
              id="explanation"
              value={formData.explanation}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, explanation: e.target.value }))
                setHasUnsavedChanges(true)
              }}
              placeholder="正解の理由や詳しい説明を入力してください..."
              rows={4}
              className="resize-none"
            />
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={saving || !isValid}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}