'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Edit, Save, X, HelpCircle, Plus, Minus, CheckCircle } from 'lucide-react'

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

interface QuizEditModalProps {
  quiz: Quiz | null
  isOpen: boolean
  onClose: () => void
  onSave: (quizId: string, data: Partial<Quiz>) => Promise<void>
  onDelete?: (quizId: string) => Promise<void>
}

// Phase1準拠のクイズタイプ制限
const quizTypeOptions = [
  { value: 'single_choice', label: '単一選択問題', description: '1つの正解を選ぶ選択問題', phase: 1 },
  { value: 'multiple_choice', label: '複数選択問題', description: '複数の選択肢から正解を選ぶ（Phase2で対応予定）', phase: 2, disabled: true },
  // Phase2機能（将来対応予定）
  { value: 'true_false', label: '○×問題', description: '正誤を判定する問題（Phase2予定）', phase: 2, disabled: true },
  { value: 'sorting', label: '並び替え問題', description: '順序を正しく並び替える（Phase2予定）', phase: 2, disabled: true },
  // Phase3機能（将来対応予定）
  { value: 'fill_blank', label: '穴埋め問題', description: 'AI採点による空欄埋め（Phase3予定）', phase: 3, disabled: true },
  { value: 'essay', label: '記述問題', description: 'AI採点による記述回答（Phase3予定）', phase: 3, disabled: true }
]

export function QuizEditModal({ 
  quiz, 
  isOpen, 
  onClose, 
  onSave,
  onDelete 
}: QuizEditModalProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    question: '',
    options: ['', '', '', ''],
    correct_answer: 0,
    explanation: '',
    quiz_type: 'single_choice',
    display_order: 1
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (quiz) {
      // optionsが配列であることを保証し、オブジェクト配列の場合は文字列配列に変換
      let safeOptions: string[] = []
      
      // 文字列として格納されているJSONをパース
      let parsedOptions = quiz.options
      if (typeof quiz.options === 'string') {
        try {
          parsedOptions = JSON.parse(quiz.options)
        } catch (e) {
          console.error('Failed to parse quiz options:', e)
          parsedOptions = []
        }
      }
      
      if (Array.isArray(parsedOptions)) {
        if (parsedOptions.length > 0 && typeof parsedOptions[0] === 'object' && 'text' in parsedOptions[0]) {
          // オブジェクト配列の場合（[{text: "選択肢1", isCorrect: true}, ...]）
          const objectOptions = parsedOptions as unknown as { text: string; isCorrect: boolean }[]
          safeOptions = objectOptions.map(opt => opt.text || '')
        } else if (parsedOptions.length > 0 && typeof parsedOptions[0] === 'string') {
          // 文字列配列の場合（["選択肢1", "選択肢2", ...]）
          safeOptions = parsedOptions as string[]
        } else {
          // 空の配列の場合のデフォルト
          safeOptions = ['', '', '', '']
        }
      } else {
        // optionsが配列でない場合のデフォルト
        safeOptions = ['', '', '', '']
      }
      
      // 最低4つの選択肢を保証
      while (safeOptions.length < 4) {
        safeOptions.push('')
      }
      
      setFormData({
        question: quiz.question || '',
        options: safeOptions,
        correct_answer: quiz.correct_answer || 0,
        explanation: quiz.explanation || '',
        quiz_type: quiz.quiz_type || 'single_choice',
        display_order: quiz.display_order || 1
      })
    } else {
      // 新規作成時のデフォルト値
      setFormData({
        question: '',
        options: ['', '', '', ''],
        correct_answer: 0,
        explanation: '',
        quiz_type: 'single_choice',
        display_order: 1
      })
    }
  }, [quiz])

  const handleSave = async () => {
    // バリデーション
    if (!formData.question.trim()) {
      toast({
        title: "入力エラー",
        description: "問題文を入力してください",
        variant: "destructive"
      })
      return
    }

    if (formData.quiz_type === 'single_choice' || formData.quiz_type === 'multiple_choice') {
      const validOptions = formData.options.filter(opt => opt.trim())
      if (validOptions.length < 2) {
        toast({
          title: "入力エラー",
          description: "選択肢を2つ以上入力してください",
          variant: "destructive"
        })
        return
      }
      if (!formData.options[formData.correct_answer]?.trim()) {
        toast({
          title: "入力エラー",
          description: "正解の選択肢を設定してください",
          variant: "destructive"
        })
        return
      }
    }

    if (!formData.explanation.trim()) {
      toast({
        title: "入力エラー",
        description: "解説を入力してください",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      await onSave(quiz ? quiz.id : '', {
        question: formData.question,
        options: formData.options,
        correct_answer: formData.correct_answer,
        explanation: formData.explanation,
        quiz_type: formData.quiz_type,
        display_order: formData.display_order
      })
      
      toast({
        title: "保存完了",
        description: "クイズが正常に保存されました"
      })
      
      onClose()
    } catch (error) {
      console.error('Quiz save error:', error)
      toast({
        title: "保存エラー",
        description: "クイズの保存に失敗しました",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!quiz || !onDelete) return

    const confirmResult = window.confirm('このクイズを削除してもよろしいですか？この操作は取り消せません。')
    if (!confirmResult) return

    setDeleting(true)
    try {
      await onDelete(quiz.id)
      onClose()
    } catch (error) {
      console.error('Quiz delete error:', error)
    } finally {
      setDeleting(false)
    }
  }

  const addOption = () => {
    if (formData.options.length < 6) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, '']
      }))
    }
  }

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      setFormData(prev => {
        const newOptions = prev.options.filter((_, i) => i !== index)
        let newCorrectAnswer = prev.correct_answer
        
        // 正解インデックスの調整
        if (newCorrectAnswer >= index && newCorrectAnswer > 0) {
          newCorrectAnswer--
        }
        if (newCorrectAnswer >= newOptions.length) {
          newCorrectAnswer = newOptions.length - 1
        }
        
        return {
          ...prev,
          options: newOptions,
          correct_answer: newCorrectAnswer
        }
      })
    }
  }

  const updateOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }))
  }

  const selectedQuizType = quizTypeOptions.find(opt => opt.value === formData.quiz_type)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Edit className="h-5 w-5 mr-2" />
            {quiz ? 'クイズ編集' : 'クイズ作成'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">クイズタイプ</label>
              <Select 
                value={formData.quiz_type} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  quiz_type: value,
                  // タイプ変更時に○×問題なら選択肢を2つに
                  options: value === 'true_false' ? ['正しい', '間違い'] : prev.options
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {quizTypeOptions.map(option => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value}
                      disabled={option.disabled}
                    >
                      <div className={option.disabled ? "opacity-50" : ""}>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{option.label}</div>
                          {option.phase && (
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              option.phase === 1 
                                ? 'bg-green-100 text-green-700' 
                                : option.phase === 2 
                                  ? 'bg-orange-100 text-orange-700' 
                                  : 'bg-purple-100 text-purple-700'
                            }`}>
                              Phase{option.phase}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{option.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedQuizType && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedQuizType.description}
                </p>
              )}
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
                className="w-32"
              />
            </div>
          </div>

          {/* 問題文 */}
          <div>
            <label className="text-sm font-medium mb-2 block flex items-center">
              <HelpCircle className="h-4 w-4 mr-1" />
              問題文
            </label>
            <Textarea
              value={formData.question}
              onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
              placeholder="クイズの問題文を入力..."
              rows={4}
            />
          </div>

          {/* 選択肢（選択問題の場合） */}
          {(formData.quiz_type === 'single_choice' || formData.quiz_type === 'multiple_choice' || formData.quiz_type === 'true_false') && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">選択肢</label>
                {(formData.quiz_type === 'single_choice' || formData.quiz_type === 'multiple_choice') && (
                  <Button 
                    type="button"
                    variant="outline" 
                    size="sm"
                    onClick={addOption}
                    disabled={formData.options.length >= 6}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    追加
                  </Button>
                )}
              </div>

              <div className="space-y-3">
                <RadioGroup 
                  value={formData.correct_answer.toString()} 
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    correct_answer: parseInt(value) 
                  }))}
                >
                  {(Array.isArray(formData.options) ? formData.options : []).map((option, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`選択肢 ${index + 1}`}
                        className="flex-1"
                      />
                      <Label htmlFor={`option-${index}`} className="text-xs text-muted-foreground">
                        {formData.correct_answer === index && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </Label>
                      {(formData.quiz_type === 'single_choice' || formData.quiz_type === 'multiple_choice') && formData.options.length > 2 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(index)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  正解の選択肢を選んでください
                </p>
              </div>
            </div>
          )}

          {/* 解説 */}
          <div>
            <label className="text-sm font-medium mb-2 block">解説</label>
            <Textarea
              value={formData.explanation}
              onChange={(e) => setFormData(prev => ({ ...prev, explanation: e.target.value }))}
              placeholder="問題の解説を入力..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              正解の理由や詳しい説明を記入してください
            </p>
          </div>

          {/* プレビュー */}
          {formData.question && (
            <div className="border-t pt-4">
              <label className="text-sm font-medium mb-2 block">プレビュー</label>
              <div className="p-4 border rounded-lg bg-gray-50">
                <div className="font-medium mb-3">{formData.question}</div>
                
                {(formData.quiz_type === 'single_choice' || formData.quiz_type === 'multiple_choice' || formData.quiz_type === 'true_false') && (
                  <div className="space-y-2 mb-3">
                    {(Array.isArray(formData.options) ? formData.options : []).filter(opt => opt && typeof opt === 'string' && opt.trim()).map((option, index) => (
                      <div 
                        key={index} 
                        className={`p-2 rounded text-sm ${
                          formData.correct_answer === index 
                            ? 'bg-green-100 border border-green-300' 
                            : 'bg-white border'
                        }`}
                      >
                        {index + 1}. {option}
                        {formData.correct_answer === index && (
                          <span className="ml-2 text-green-600 font-medium">✓ 正解</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {formData.explanation && (
                  <div className="text-sm text-muted-foreground">
                    <strong>解説:</strong> {formData.explanation}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {quiz && onDelete && (
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={deleting}
                  size="sm"
                >
                  {deleting ? '削除中...' : '削除'}
                </Button>
              )}
            </div>
            <div className="space-x-2">
              <Button variant="outline" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                キャンセル
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}