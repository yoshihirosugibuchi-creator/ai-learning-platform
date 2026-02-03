'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Trophy, Star, Zap, Clock, Home, RotateCcw, CheckCircle, XCircle, History } from 'lucide-react'
import type { CaseStudyScoringResult, CaseStudyBonusDetails, CaseStudySkillAxis } from '@/lib/types/case-study'

interface StepDetail {
  step_number: number
  step_name: string
  description: string
  question_type: string
  options: Array<{ id: string; text: string }> | null
  model_answer: {
    ideal_choices?: string[]
    essential_points?: string[]
  } | null
  target_skills: CaseStudySkillAxis[]
  max_score: number
  user_answer: {
    selected_choices: string[] | null
    reasoning_text: string | null
  }
  scoring: {
    score: number
    max_score: number
    feedback: string
  } | null
}

interface RubricAxis {
  axis_code: string
  axis_name: string
  rubric_group_code: string
  rubric_group_name: string
}

interface CaseStudyResultProps {
  session: {
    id: string
    total_score: number
    max_possible_score: number
    score_percentage: number
    total_time_seconds: number
    hint_count: number
    is_retry: boolean
    xp_earned: number
    skp_earned: number
    bonus_details: CaseStudyBonusDetails | null
  }
  problem: {
    id: string
    title: string
    difficulty: string
  }
  scoringResult: CaseStudyScoringResult
  stepsWithDetails: StepDetail[]
  rubricAxes: RubricAxis[]
}

const skillAxisLabels: Record<CaseStudySkillAxis, string> = {
  problem_setting: '問題設定力',
  structuring_logic: 'ロジック構造化',
  hypothesis_thinking: '仮説思考',
  proposal_specificity: '提案具体性',
  analysis_design: '分析設計',
  feasibility: '実現可能性',
  perspective_diversity: '視点の多様性',
  impact: 'インパクト',
  expression: '表現力',
  originality: '独自性'
}

export default function CaseStudyResult({
  session,
  problem,
  scoringResult,
  stepsWithDetails,
  rubricAxes
}: CaseStudyResultProps) {
  const router = useRouter()
  const [expandedSteps, setExpandedSteps] = useState<string[]>([])

  // 総合評価を計算
  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { label: 'S', color: 'text-yellow-500' }
    if (percentage >= 80) return { label: 'A', color: 'text-green-500' }
    if (percentage >= 70) return { label: 'B', color: 'text-blue-500' }
    if (percentage >= 60) return { label: 'C', color: 'text-orange-500' }
    return { label: 'D', color: 'text-red-500' }
  }

  const grade = getGrade(session.score_percentage)

  // 時間をフォーマット
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}分${secs}秒`
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* メインスコアカード */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 text-center">
          <Trophy className="h-12 w-12 mx-auto mb-2 text-yellow-500" />
          <h1 className="text-xl font-bold mb-1">ケーススタディ完了!</h1>
          <p className="text-muted-foreground">{problem.title}</p>
        </div>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-8 mb-6">
            <div className="text-center">
              <div className={`text-5xl font-bold ${grade.color}`}>{grade.label}</div>
              <div className="text-sm text-muted-foreground">総合評価</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold">{session.score_percentage}%</div>
              <div className="text-sm text-muted-foreground">
                {session.total_score} / {session.max_possible_score}点
              </div>
            </div>
          </div>

          {/* 獲得報酬 */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              <div>
                <div className="font-medium">+{session.xp_earned} XP</div>
                {session.is_retry && (
                  <div className="text-xs text-muted-foreground">再挑戦のためXPなし</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-500" />
              <div>
                <div className="font-medium">+{session.skp_earned} SKP</div>
              </div>
            </div>
          </div>

          {/* ボーナス詳細 */}
          {session.bonus_details && Object.keys(session.bonus_details).length > 0 && (
            <div className="mt-4 space-y-1">
              {session.bonus_details.high_score && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>高スコアボーナス +{session.bonus_details.high_score} XP</span>
                </div>
              )}
              {session.bonus_details.no_hint && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>ヒント未使用ボーナス +{session.bonus_details.no_hint} XP</span>
                </div>
              )}
              {session.bonus_details.quick && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span>早期完了ボーナス +{session.bonus_details.quick} XP</span>
                </div>
              )}
            </div>
          )}

          {/* 所要時間・ヒント使用 */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{formatTime(session.total_time_seconds)}</span>
            </div>
            <div>
              ヒント使用: {session.hint_count}回
            </div>
          </div>
        </CardContent>
      </Card>

      {/* スキル別評価 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">スキル別評価</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(scoringResult.skill_scores).map(([skill, score]) => {
              const axis = rubricAxes.find(a => a.axis_code === skill)
              const label = axis?.axis_name || skillAxisLabels[skill as CaseStudySkillAxis] || skill
              const percentage = (score / 5) * 100

              return (
                <div key={skill} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{label}</span>
                    <span className="font-medium">{score}/5</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 総合フィードバック */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AIフィードバック</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap">{scoringResult.overall_feedback}</p>
        </CardContent>
      </Card>

      {/* ステップ別詳細 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">ステップ別詳細</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" value={expandedSteps} onValueChange={setExpandedSteps}>
            {stepsWithDetails.map((step) => {
              const scoring = step.scoring
              const isCorrect = scoring ? (scoring.score / scoring.max_score) >= 0.6 : false

              return (
                <AccordionItem key={step.step_number} value={`step-${step.step_number}`}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-medium">
                          Step {step.step_number}: {step.step_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {scoring ? `${scoring.score}/${scoring.max_score}点` : '未採点'}
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {/* 設問 */}
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">設問</div>
                        <p className="text-sm">{step.description}</p>
                      </div>

                      {/* あなたの回答 */}
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">あなたの回答</div>
                        {step.user_answer.selected_choices && step.user_answer.selected_choices.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {step.user_answer.selected_choices.map(choice => (
                              <Badge key={choice} variant="secondary">{choice}</Badge>
                            ))}
                          </div>
                        )}
                        {step.user_answer.reasoning_text && (
                          <p className="text-sm bg-muted p-2 rounded">{step.user_answer.reasoning_text}</p>
                        )}
                      </div>

                      {/* 模範解答 */}
                      {step.model_answer?.ideal_choices && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">模範解答</div>
                          <div className="flex flex-wrap gap-2">
                            {step.model_answer.ideal_choices.map(choice => (
                              <Badge key={choice} variant="outline">{choice}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* フィードバック */}
                      {scoring?.feedback && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground mb-1">フィードバック</div>
                          <p className="text-sm">{scoring.feedback}</p>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* アクションボタン */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.push('/case-study/history')}
        >
          <History className="h-4 w-4 mr-2" />
          履歴に戻る
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => router.push('/case-study')}
        >
          <Home className="h-4 w-4 mr-2" />
          一覧に戻る
        </Button>
        <Button
          className="flex-1"
          onClick={() => router.push(`/case-study/${problem.id}`)}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          再挑戦する
        </Button>
      </div>
    </div>
  )
}
