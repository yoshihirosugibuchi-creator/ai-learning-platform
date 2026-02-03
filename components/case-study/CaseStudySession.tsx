'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, ChevronUp, ChevronLeft, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type {
  CaseStudyProblemRow,
  CaseStudyStepRow,
  CaseStudyStepOption
} from '@/lib/types/case-study'

interface StepResponse {
  step_number: number
  selected_choices: string[]
  reasoning_text: string
  hint_used: boolean
}

interface CaseStudySessionProps {
  sessionId: string
  problem: CaseStudyProblemRow
  steps: CaseStudyStepRow[]
  initialStep: number
  token: string
  initialResponses?: StepResponse[]
}

export default function CaseStudySession({
  sessionId,
  problem,
  steps,
  initialStep,
  token,
  initialResponses
}: CaseStudySessionProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [currentStepIndex, setCurrentStepIndex] = useState(initialStep - 1)
  const [selectedChoices, setSelectedChoices] = useState<string[]>([])
  const [reasoningText, setReasoningText] = useState('')
  const [hintUsed, setHintUsed] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [showHint, setShowHint] = useState(false)
  const [caseTextOpen, setCaseTextOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [scoringError, setScoringError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)
  const [stepStartTime, setStepStartTime] = useState<Date>(new Date())
  const [activeStepIndex, setActiveStepIndex] = useState(initialStep - 1)
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<number, { selectedChoices: string[], reasoningText: string, hintUsed: boolean }>>(() => {
    const answers: Record<number, { selectedChoices: string[], reasoningText: string, hintUsed: boolean }> = {}
    if (initialResponses) {
      initialResponses.forEach(r => {
        const stepIndex = r.step_number - 1
        answers[stepIndex] = {
          selectedChoices: r.selected_choices,
          reasoningText: r.reasoning_text,
          hintUsed: r.hint_used
        }
      })
    }
    return answers
  })

  const [activeStepDraft, setActiveStepDraft] = useState<{ selectedChoices: string[], reasoningText: string, hintUsed: boolean } | null>(null)

  const currentStep = steps[currentStepIndex]
  const progress = ((activeStepIndex + 1) / steps.length) * 100
  const isLastStep = activeStepIndex === steps.length - 1
  const isPreviousStep = currentStepIndex < activeStepIndex

  // ステップ開始時刻をリセット（新しいステップに進んだときのみ）
  useEffect(() => {
    setStepStartTime(new Date())
  }, [activeStepIndex])

  const handleChoiceToggle = useCallback((choiceId: string) => {
    const questionType = currentStep?.question_type

    if (questionType === 'single') {
      setSelectedChoices([choiceId])
    } else if (questionType === 'multiple' || questionType === 'hybrid') {
      setSelectedChoices(prev =>
        prev.includes(choiceId)
          ? prev.filter(id => id !== choiceId)
          : [...prev, choiceId]
      )
    }
  }, [currentStep?.question_type])

  const handleRequestHint = async () => {
    if (hintUsed) return

    try {
      const response = await fetch(
        `/api/case-study/sessions/${sessionId}/hint?step_number=${currentStep.step_number}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setHint(data.hint)
          setHintUsed(true)
          setShowHint(true)
        }
      } else {
        toast({
          title: 'ヒントを取得できませんでした',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Hint fetch error:', error)
      toast({
        title: 'ヒントの取得に失敗しました',
        variant: 'destructive'
      })
    }
  }

  const handleSubmitAnswer = async () => {
    // バリデーション
    const hasSelection = selectedChoices.length > 0
    const hasReasoning = reasoningText.trim().length > 0
    const questionType = currentStep.question_type

    if (questionType === 'single' || questionType === 'multiple') {
      if (!hasSelection) {
        toast({
          title: '選択肢を選んでください',
          variant: 'destructive'
        })
        return
      }
    } else if (questionType === 'text') {
      if (!hasReasoning) {
        toast({
          title: '回答を入力してください',
          variant: 'destructive'
        })
        return
      }
    } else if (questionType === 'hybrid') {
      if (!hasSelection) {
        toast({
          title: '選択肢を選んでください',
          variant: 'destructive'
        })
        return
      }
    }

    setSubmitting(true)

    try {
      const timeSpentMs = new Date().getTime() - stepStartTime.getTime()

      const response = await fetch(`/api/case-study/sessions/${sessionId}/answer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          step_id: currentStep.id,
          step_number: currentStep.step_number,
          selected_choices: selectedChoices,
          reasoning_text: reasoningText,
          hint_used: hintUsed,
          time_spent_ms: timeSpentMs,
          step_started_at: stepStartTime.toISOString()
        })
      })

      if (response.ok) {
        const data = await response.json()

        // 回答を保存（振り返り・編集用）
        setSubmittedAnswers(prev => ({
          ...prev,
          [currentStepIndex]: {
            selectedChoices: [...selectedChoices],
            reasoningText,
            hintUsed
          }
        }))

        if (data.is_update) {
          // 過去ステップの回答更新完了 → アクティブステップへ戻る
          toast({
            title: '回答を更新しました'
          })
          handleNavigateStep(activeStepIndex)
          return
        }

        if (data.is_last_step) {
          // 最終ステップ - 完了処理
          await handleComplete()
        } else {
          // 次のステップへ
          setActiveStepIndex(prev => prev + 1)
          setCurrentStepIndex(prev => prev + 1)
          setSelectedChoices([])
          setReasoningText('')
          setHintUsed(false)
          setHint(null)
          setShowHint(false)

          toast({
            title: `ステップ ${currentStep.step_number} 完了`,
            description: '次のステップに進みます'
          })
        }
      } else {
        toast({
          title: '回答の送信に失敗しました',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Submit error:', error)
      toast({
        title: '回答の送信に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleComplete = async () => {
    setScoringError(null)
    setRetrying(true)

    try {
      const response = await fetch(`/api/case-study/sessions/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast({
          title: 'ケーススタディ完了!',
          description: `スコア: ${data.scoring_result.score_percentage}%`
        })
        router.push(`/case-study/result/${sessionId}`)
        return
      }

      // AI採点が利用不可の場合 — ユーザーにリトライ可能であることを伝える
      if (data.scoring_unavailable) {
        setScoringError(data.error || 'AI採点に失敗しました。しばらくしてから再度お試しください。')
        return
      }

      // その他のエラー
      toast({
        title: data.error || '完了処理に失敗しました',
        variant: 'destructive'
      })
    } catch (error) {
      console.error('Complete error:', error)
      toast({
        title: '通信エラーが発生しました',
        variant: 'destructive'
      })
    } finally {
      setRetrying(false)
    }
  }

  const handlePause = () => {
    toast({
      title: '一時中断しました',
      description: '後から続きを再開できます'
    })
    router.push('/case-study')
  }

  const handleNavigateStep = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex > activeStepIndex || targetIndex === currentStepIndex) return

    // 現在アクティブステップにいる場合、入力中の内容を退避
    if (currentStepIndex === activeStepIndex) {
      setActiveStepDraft({
        selectedChoices: [...selectedChoices],
        reasoningText,
        hintUsed
      })
    }

    // 移動先のフォーム状態を復元
    if (targetIndex === activeStepIndex) {
      // アクティブステップに戻る → 退避した入力を復元
      if (activeStepDraft) {
        setSelectedChoices(activeStepDraft.selectedChoices)
        setReasoningText(activeStepDraft.reasoningText)
        setHintUsed(activeStepDraft.hintUsed)
        setActiveStepDraft(null)
      }
    } else if (submittedAnswers[targetIndex]) {
      // 過去ステップ → 保存済み回答を復元
      setSelectedChoices(submittedAnswers[targetIndex].selectedChoices)
      setReasoningText(submittedAnswers[targetIndex].reasoningText)
      setHintUsed(submittedAnswers[targetIndex].hintUsed)
    } else {
      // データなし（通常起こらない）
      setSelectedChoices([])
      setReasoningText('')
      setHintUsed(false)
    }

    setHint(null)
    setShowHint(false)
    setCurrentStepIndex(targetIndex)
  }

  if (!currentStep) {
    return <div>ステップ情報が見つかりません</div>
  }

  // AI採点エラー時：リトライUI表示
  if (scoringError) {
    return (
      <div className="max-w-lg mx-auto mt-12 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              AI採点を実行できませんでした
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">{scoringError}</p>
            <p className="text-muted-foreground text-xs">
              回答は保存されています。採点を再実行しても回答内容は変わりません。
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleComplete}
                disabled={retrying}
                className="flex-1"
              >
                {retrying ? '採点実行中...' : '採点を再実行'}
              </Button>
              <Button variant="outline" onClick={handlePause}>
                後で再開
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const options = (currentStep.options as CaseStudyStepOption[] | null) || []

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* ヘッダー・進捗 */}
      <div className="sticky top-0 bg-background z-10 pb-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Step {currentStepIndex + 1} / {steps.length}
          </span>
          <Button variant="ghost" size="sm" onClick={handlePause}>
            一時中断
          </Button>
        </div>
        <Progress value={progress} className="h-2" />
        {/* ステップナビゲーション */}
        <div className="flex gap-1.5 mt-3 flex-wrap">
          {steps.map((_, idx) => {
            const isCompleted = idx < activeStepIndex
            const isViewing = idx === currentStepIndex
            const isAccessible = idx <= activeStepIndex

            return (
              <button
                key={idx}
                onClick={() => handleNavigateStep(idx)}
                disabled={!isAccessible}
                className={`w-8 h-8 rounded-full text-xs font-medium transition-colors flex items-center justify-center ${
                  isViewing
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                    ? 'bg-primary/20 text-primary hover:bg-primary/30'
                    : isAccessible
                    ? 'bg-muted text-foreground hover:bg-muted/80'
                    : 'bg-muted/40 text-muted-foreground/50 cursor-not-allowed'
                }`}
              >
                {isCompleted ? '✓' : idx + 1}
              </button>
            )
          })}
        </div>
      </div>

      {/* ケース本文（折りたたみ） */}
      <Collapsible open={caseTextOpen} onOpenChange={setCaseTextOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">ケース情報</CardTitle>
                {caseTextOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm">{problem.case_text}</div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* ステップ内容 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">Step {currentStep.step_number}</Badge>
            <span className="font-medium">{currentStep.step_name}</span>
            {isPreviousStep && (
              <Badge variant="outline" className="text-green-600 border-green-300">
                回答済み
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">{currentStep.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 選択肢 */}
          {options.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                選択肢
                {(currentStep.question_type === 'multiple' || currentStep.question_type === 'hybrid')
                  ? '（複数選択可）'
                  : ''
                }
              </label>
              <div className="space-y-2">
                {options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleChoiceToggle(option.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedChoices.includes(option.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedChoices.includes(option.id)
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                      }`}>
                        {selectedChoices.includes(option.id) && (
                          <CheckCircle className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <span>{option.id}. {option.text}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 記述欄 */}
          {(currentStep.question_type === 'text' || currentStep.question_type === 'hybrid') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                あなたの考え
                {currentStep.question_type === 'hybrid' && '（任意）'}
              </label>
              <Textarea
                placeholder="選んだ理由や考えを記述してください..."
                value={reasoningText}
                onChange={(e) => setReasoningText(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <div className="text-xs text-muted-foreground text-right">
                {reasoningText.length} / 500文字
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* アクションボタン */}
      <div className="flex gap-2">
        {currentStepIndex > 0 && (
          <Button
            variant="outline"
            onClick={() => handleNavigateStep(currentStepIndex - 1)}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            前のステップ
          </Button>
        )}

        {isPreviousStep ? (
          <>
            <Button
              variant="ghost"
              onClick={() => handleNavigateStep(activeStepIndex)}
              disabled={submitting}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmitAnswer}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? '送信中...' : '回答を更新'}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              onClick={handleRequestHint}
              disabled={hintUsed || submitting}
              className="flex items-center gap-2"
            >
              <Lightbulb className="h-4 w-4" />
              ヒント
              {hintUsed && <span className="text-xs">(使用済み)</span>}
            </Button>
            <Button
              onClick={handleSubmitAnswer}
              disabled={submitting}
              className="flex-1"
            >
              {submitting
                ? '送信中...'
                : isLastStep
                ? '完了して結果を見る'
                : '次のステップへ'
              }
            </Button>
          </>
        )}
      </div>

      {/* ヒントモーダル */}
      <Dialog open={showHint} onOpenChange={setShowHint}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              ヒント
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3 pt-2">
                <p className="whitespace-pre-wrap">{hint}</p>
                <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>ヒント使用によりXPボーナスが減少します</span>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <Button onClick={() => setShowHint(false)}>閉じる</Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
