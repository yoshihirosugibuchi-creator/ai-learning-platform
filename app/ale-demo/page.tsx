'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Lightbulb, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'

// ケース本文（PDFから）
const CASE_TEXT = `
あなたは、地方にある中堅製造業B社（従業員250名）の若手コンサルタントとしてプロジェクトに参加しています。

B社は自動車部品（金属加工）を製造しており、以下の課題を抱えています：

■ クライアントの状況
• 主力製品Xの歩留まり（良品率）が92% → 87%に低下
• 原因が分かっていない
• 現場の作業員から「設備の老朽化」や「材料品質のばらつき」の声はあるが、データは未整理
• 経営層からは「競争力の低下が懸念されており、早期改善を希望」

あなたは、以下の5ステップに沿って状況を整理し、改善アプローチを考えてください。
`

const STEPS = [
  { 
    id: 'step1', 
    name: 'Step1: 状況把握', 
    description: '特に確認すべき"状況情報"はどれですか？（複数選択可）',
    type: 'multiple',
    options: [
      { id: 'A', text: '不良が増えた時期・ライン・工程', correct: true },
      { id: 'B', text: '設備更新に必要な概算費用', correct: false },
      { id: 'C', text: '材料ロットごとの品質結果', correct: true },
      { id: 'D', text: '競合他社の製造方法', correct: false },
      { id: 'E', text: '作業員の入れ替わりや教育状況', correct: true }
    ],
    followUp: 'このケースで"まず確認すべき点"を1～2行で書いてください。'
  },
  { 
    id: 'step2', 
    name: 'Step2: 問題設定', 
    description: '問題設定として最も適切に近いものは？',
    type: 'single',
    options: [
      { id: 'A', text: '歩留まりが低下していることが問題である', correct: false },
      { id: 'B', text: '歩留まり低下により収益性が悪化し、原因を特定できていないことが問題である', correct: true },
      { id: 'C', text: '設備が古くなっていることが問題である', correct: false },
      { id: 'D', text: '競合が強くなっていることが問題である', correct: false }
    ],
    followUp: 'この問題による"影響"を1行で書いてください。'
  },
  { 
    id: 'step3', 
    name: 'Step3: 仮説立案', 
    description: '次の要因を「優先的に検証すべき順番」に並べてください。',
    type: 'ordering',
    options: [
      { id: 'A', text: '設備の老朽化', order: 2 },
      { id: 'B', text: '材料ロットの品質バラつき', order: 1 },
      { id: 'C', text: '作業員手順のばらつき', order: 3 },
      { id: 'D', text: '生産計画（増産）に伴う段取り不備', order: 4 }
    ],
    followUp: '最初に検証すべき要因を選んだ理由を1行で書いてください。'
  },
  { 
    id: 'step4', 
    name: 'Step4: 分析プラン', 
    description: '次のうち"分析として不十分なもの"はどれですか？（複数選択可）',
    type: 'multiple',
    options: [
      { id: 'A', text: '設備不良の頻度を確認する', insufficient: true },
      { id: 'B', text: '材料ロットごとの不良率を比較する', insufficient: false },
      { id: 'C', text: '作業員の熟練度を確認する', insufficient: true },
      { id: 'D', text: '工程別・時間帯別に不良率を集計する', insufficient: false },
      { id: 'E', text: '現場の作業を観察する', insufficient: true }
    ],
    followUp: '具体的に"どのデータをどう比較するか"を1行で書いてください。'
  },
  { 
    id: 'step5', 
    name: 'Step5: 提言・次アクション', 
    description: '「短期施策」として最も妥当なものは？',
    type: 'multiple',
    options: [
      { id: 'A', text: 'すべての設備を更新する', correct: false },
      { id: 'B', text: '不良が集中する設備のみ重点保全する', correct: true },
      { id: 'C', text: '材料をすべて別のサプライヤーに変更する', correct: false },
      { id: 'D', text: '作業員を総入れ替えする', correct: false },
      { id: 'E', text: '標準作業手順の確認と教育を行う', correct: true }
    ],
    followUp: '短期で"確実にできるアクション"を1つ書いてください。'
  }
]

const SKILL_LABELS = {
  problem_setting: '問題設定力',
  structuring_logic: '構造化・論理性',
  critical_thinking: '批判的思考',
  hypothesis_thinking: '仮説思考',
  creativity: '創造性',
  analysis_design: '分析設計力',
  risk_assumption_awareness: 'リスク・前提認識',
  practicality_client_view: '実行可能性・クライアント志向',
  practical_application: '実務適用能力',
  clarity_expression: '表現の明瞭さ'
}

export default function ALEDemo() {
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState({
    step1: { choices: [] as string[], reasoning: '' },
    step2: { choices: [] as string[], reasoning: '' },
    step3: { choices: [] as string[], reasoning: '' },
    step4: { choices: [] as string[], reasoning: '' },
    step5: { choices: [] as string[], reasoning: '' }
  })
  const [hints, setHints] = useState<string[]>([])
  const [showHints, setShowHints] = useState(false)
  const [hintCount, setHintCount] = useState(0)
  const [isLoadingHints, setIsLoadingHints] = useState(false)
  const [hintError, setHintError] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [scoringResult, setScoringResult] = useState<{
    total_score: number
    overall_comment: string
    dimension_scores: Record<string, { score: number; reason: string }>
  } | null>(null)
  const [feedback, setFeedback] = useState<{
    good_points: string[]
    improvement_points: string[]
    next_tip: string
  } | null>(null)

  const handleChoiceChange = (step: string, choiceId: string, isMultiple: boolean = false) => {
    setAnswers(prev => {
      const stepAnswer = prev[step as keyof typeof answers]
      if (isMultiple) {
        const currentChoices = stepAnswer.choices || []
        const newChoices = currentChoices.includes(choiceId) 
          ? currentChoices.filter(id => id !== choiceId)
          : [...currentChoices, choiceId]
        return { ...prev, [step]: { ...stepAnswer, choices: newChoices } }
      } else {
        return { ...prev, [step]: { ...stepAnswer, choices: [choiceId] } }
      }
    })
  }

  const handleReasoningChange = (step: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [step]: { ...prev[step as keyof typeof answers], reasoning: value }
    }))
  }

  const handleOrderChange = (step: string, choiceId: string, newOrder: number) => {
    setAnswers(prev => {
      const stepAnswer = prev[step as keyof typeof answers]
      const currentChoices = stepAnswer.choices || []
      const updatedChoices = [...currentChoices]
      const existingIndex = updatedChoices.findIndex(choice => choice.startsWith(choiceId + ':'))
      
      if (existingIndex >= 0) {
        updatedChoices[existingIndex] = `${choiceId}:${newOrder}`
      } else {
        updatedChoices.push(`${choiceId}:${newOrder}`)
      }
      
      return { ...prev, [step]: { ...stepAnswer, choices: updatedChoices } }
    })
  }

  const renderStepChoices = (stepIndex: number) => {
    const step = STEPS[stepIndex]
    const stepKey = `step${stepIndex + 1}`
    const currentAnswers = answers[stepKey as keyof typeof answers]

    if (step.type === 'single') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {step.description}
          </label>
          <RadioGroup
            value={currentAnswers.choices[0] || ''}
            onValueChange={(value) => handleChoiceChange(stepKey, value)}
          >
            {step.options?.map(option => (
              <div key={option.id} className="flex items-center space-x-2">
                <RadioGroupItem value={option.id} id={`${stepKey}-${option.id}`} />
                <Label htmlFor={`${stepKey}-${option.id}`} className="text-sm">
                  {option.id}. {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      )
    }

    if (step.type === 'multiple') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {step.description}
          </label>
          <div className="space-y-2">
            {step.options?.map(option => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`${stepKey}-${option.id}`}
                  checked={currentAnswers.choices.includes(option.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleChoiceChange(stepKey, option.id, true)
                    } else {
                      handleChoiceChange(stepKey, option.id, true)
                    }
                  }}
                />
                <Label htmlFor={`${stepKey}-${option.id}`} className="text-sm">
                  {option.id}. {option.text}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (step.type === 'ordering') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {step.description}
          </label>
          <div className="space-y-3">
            {step.options?.map(option => {
              const orderMatch = currentAnswers.choices.find(choice => choice.startsWith(option.id + ':'))
              const currentOrder = orderMatch ? parseInt(orderMatch.split(':')[1]) : 0
              
              return (
                <div key={option.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <span className="font-medium">{option.id}.</span>
                  <span className="flex-1">{option.text}</span>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor={`order-${stepKey}-${option.id}`} className="text-sm">順番:</Label>
                    <select
                      id={`order-${stepKey}-${option.id}`}
                      value={currentOrder || ''}
                      onChange={(e) => handleOrderChange(stepKey, option.id, parseInt(e.target.value))}
                      className="border rounded px-2 py-1 text-sm"
                    >
                      <option value="">選択</option>
                      <option value="1">1位</option>
                      <option value="2">2位</option>
                      <option value="3">3位</option>
                      <option value="4">4位</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    return null
  }

  const fetchHints = async () => {
    setIsLoadingHints(true)
    setHintError('')
    
    try {
      const response = await fetch('/api/ale-case-study/hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_text: CASE_TEXT,
          current_step: {
            name: STEPS[currentStep].name,
            description: STEPS[currentStep].description,
            type: STEPS[currentStep].type,
            options: STEPS[currentStep].options?.map(opt => ({
              id: opt.id,
              text: opt.text.slice(0, 50), // 文字数制限
              correct: ('correct' in opt ? opt.correct : null) || 
                       ('insufficient' in opt ? opt.insufficient : null) || 
                       ('order' in opt ? opt.order : null) || false
            }))
          },
          user_answer: {
            choices: answers[`step${currentStep + 1}` as keyof typeof answers].choices,
            reasoning: answers[`step${currentStep + 1}` as keyof typeof answers].reasoning.slice(0, 100) // 文字数制限
          }
        })
      })

      const result = await response.json()
      if (result.success) {
        setHints(result.data.hints)
        setShowHints(true)
        setHintCount(prev => prev + 1)
        setHintError('')
      } else {
        setHintError(result.error || 'ヒントの取得に失敗しました')
        console.error('Hint API error:', result)
      }
    } catch (error) {
      console.error('Error fetching hints:', error)
      setHintError('ヒントの取得中にエラーが発生しました')
    } finally {
      setIsLoadingHints(false)
    }
  }

  const formatAnswerForAPI = (stepAnswer: { choices: string[], reasoning: string }) => {
    const choicesText = stepAnswer.choices.length > 0 ? `選択: ${stepAnswer.choices.join(', ')}` : ''
    const reasoningText = stepAnswer.reasoning ? `理由: ${stepAnswer.reasoning}` : ''
    return [choicesText, reasoningText].filter(Boolean).join('\n')
  }

  const submitForAnalysis = async () => {
    const hasChoices = Object.values(answers).every(answer => answer.choices && answer.choices.length > 0)
    if (!hasChoices) {
      alert('すべてのステップで選択肢を選んでください。')
      return
    }

    setIsAnalyzing(true)
    
    try {
      // スコアリング
      const scoringResponse = await fetch('/api/ale-case-study/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_text: CASE_TEXT,
          answer_step1: formatAnswerForAPI(answers.step1),
          answer_step2: formatAnswerForAPI(answers.step2),
          answer_step3: formatAnswerForAPI(answers.step3),
          answer_step4: formatAnswerForAPI(answers.step4),
          answer_step5: formatAnswerForAPI(answers.step5),
          hint_count: hintCount,
          step_times_json: '{}'
        })
      })

      const scoringResult = await scoringResponse.json()
      
      if (scoringResult.success) {
        setScoringResult(scoringResult.data)

        // フィードバック
        const feedbackResponse = await fetch('/api/ale-case-study/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            score_json: scoringResult.data,
            answer_step1: formatAnswerForAPI(answers.step1),
            answer_step2: formatAnswerForAPI(answers.step2),
            answer_step3: formatAnswerForAPI(answers.step3),
            answer_step4: formatAnswerForAPI(answers.step4),
            answer_step5: formatAnswerForAPI(answers.step5)
          })
        })

        const feedbackResult = await feedbackResponse.json()
        if (feedbackResult.success) {
          setFeedback(feedbackResult.data)
        }
      }
    } catch (error) {
      console.error('Error submitting for analysis:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600'
    if (score >= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ALE ケーススタディ デモ
          </h1>
          <p className="text-gray-600">
            AI時代のコンサルタント思考プロセス特訓
          </p>
        </div>

        {/* ケース本文 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 ケーススタディ: 地方製造工場の歩留まり改善プロジェクト
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="whitespace-pre-line text-gray-700">
                {CASE_TEXT}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 結果表示 */}
        {scoringResult && (
          <div className="mb-6 space-y-6">
            {/* 総合スコア */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  総合結果
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {scoringResult.total_score}/50
                  </div>
                  <div className="text-gray-600">総合スコア</div>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{scoringResult.overall_comment}</p>
                </div>
              </CardContent>
            </Card>

            {/* 10軸スコア */}
            <Card>
              <CardHeader>
                <CardTitle>10軸スキル評価</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(scoringResult.dimension_scores).map(([key, scoreData]) => (
                    <div key={key} className="border rounded-lg p-3">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-sm">
                          {SKILL_LABELS[key as keyof typeof SKILL_LABELS]}
                        </span>
                        <span className={`font-bold ${getScoreColor(scoreData.score)}`}>
                          {scoreData.score}/5
                        </span>
                      </div>
                      <Progress value={scoreData.score * 20} className="h-2 mb-2" />
                      <p className="text-xs text-gray-600">{scoreData.reason}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ベターアンサー */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ✨ ベターアンサー（参考回答例）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold mb-1">Step1: 状況把握</h4>
                    <p className="text-gray-700">選択: A, C, E</p>
                    <p className="text-gray-600 italic">「時期・ライン・工程別の不良データを時系列で整理し、材料ロットとの相関を確認。同時に人員変更の有無も調査します。」</p>
                  </div>
                  
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold mb-1">Step2: 問題設定</h4>
                    <p className="text-gray-700">選択: B</p>
                    <p className="text-gray-600 italic">「歩留まり5%低下により月間200万円の機会損失。競争力低下前に原因特定と改善が必要。」</p>
                  </div>
                  
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold mb-1">Step3: 仮説立案</h4>
                    <p className="text-gray-700">優先順位: B→A→C→D</p>
                    <p className="text-gray-600 italic">「材料品質は外部要因で短期検証可能。設備は内部要因で投資判断に直結するため次に重要。」</p>
                  </div>
                  
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold mb-1">Step4: 分析プラン</h4>
                    <p className="text-gray-700">不十分: A, C, E（定量化不足）</p>
                    <p className="text-gray-600 italic">「材料ロット別・工程別・時間帯別の不良率を統計的に比較。有意差のある要因を特定。」</p>
                  </div>
                  
                  <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-semibold mb-1">Step5: 提言・次アクション</h4>
                    <p className="text-gray-700">選択: B, E</p>
                    <p className="text-gray-600 italic">「不良集中設備の重点保全を即実施。並行して標準作業手順書を更新し全員研修を実施。」</p>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600">
                    ※これらは理想的な回答例です。実際のコンサルティングでは、クライアントの状況や制約に応じて柔軟に対応することが重要です。
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* フィードバック */}
            {feedback && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    💡 フィードバック
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        良い点
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {feedback.good_points.map((point: string, index: number) => (
                          <li key={index}>{point}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-orange-700 mb-2 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        改善点
                      </h4>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                        {feedback.improvement_points.map((point: string, index: number) => (
                          <li key={index}>{point}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <h4 className="font-semibold text-blue-700 mb-1">次回へのアドバイス</h4>
                      <p className="text-sm text-blue-900">{feedback.next_tip}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ステップ入力 */}
        {!scoringResult && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>{STEPS[currentStep].name}</CardTitle>
                  <Badge variant="outline">
                    {currentStep + 1} / {STEPS.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* 選択肢セクション */}
                  <div>
                    {renderStepChoices(currentStep)}
                  </div>

                  {/* 理由記述セクション */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {STEPS[currentStep].followUp}
                    </label>
                    <Textarea
                      placeholder="あなたの考えや理由をこちらに記述してください...（任意）"
                      value={answers[`step${currentStep + 1}` as keyof typeof answers].reasoning}
                      onChange={(e) => handleReasoningChange(`step${currentStep + 1}`, e.target.value)}
                      rows={3}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchHints}
                        disabled={isLoadingHints}
                        className="flex items-center gap-1"
                      >
                        {isLoadingHints ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                            ヒント取得中...
                          </>
                        ) : (
                          <>
                            <Lightbulb className="w-4 h-4" />
                            ヒントを見る ({hintCount})
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                      >
                        前へ
                      </Button>
                      <Button
                        onClick={() => setCurrentStep(Math.min(STEPS.length - 1, currentStep + 1))}
                        disabled={currentStep === STEPS.length - 1}
                      >
                        次へ
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ヒント表示 */}
            {showHints && hints.length > 0 && (
              <Card className="mb-6 border-yellow-200">
                <CardHeader>
                  <CardTitle className="text-yellow-800 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    思考のヒント
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-2 text-yellow-900">
                    {hints.map((hint, index) => (
                      <li key={index}>{hint}</li>
                    ))}
                  </ul>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowHints(false)}
                    className="mt-3"
                  >
                    閉じる
                  </Button>
                </CardContent>
              </Card>
            )}
            
            {/* エラー表示 */}
            {hintError && (
              <Card className="mb-6 border-red-200 bg-red-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{hintError}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setHintError('')}
                      className="ml-auto text-red-600 hover:text-red-800"
                    >
                      ×
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ステップナビゲーション */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-600">進捗</span>
                  <span className="text-sm text-gray-600">{currentStep + 1} / {STEPS.length}</span>
                </div>
                <Progress value={((currentStep + 1) / STEPS.length) * 100} className="mb-4" />
                
                <div className="flex flex-wrap gap-2">
                  {STEPS.map((step, index) => (
                    <Button
                      key={step.id}
                      variant={index === currentStep ? "default" : (answers[`step${index + 1}` as keyof typeof answers].choices.length > 0) ? "outline" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentStep(index)}
                      className="flex items-center gap-1"
                    >
                      {(answers[`step${index + 1}` as keyof typeof answers].choices.length > 0) && index !== currentStep && (
                        <CheckCircle className="w-3 h-3" />
                      )}
                      Step{index + 1}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 分析実行ボタン */}
            <div className="text-center">
              <Button
                onClick={submitForAnalysis}
                disabled={isAnalyzing || Object.values(answers).some(answer => answer.choices.length === 0)}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    AI分析中...
                  </>
                ) : (
                  'AI分析を実行'
                )}
              </Button>
              <p className="text-sm text-gray-500 mt-2">
                全5ステップの選択完了後、AI分析が可能になります
              </p>
            </div>
          </>
        )}

        {/* リセットボタン */}
        {scoringResult && (
          <div className="text-center mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setScoringResult(null)
                setFeedback(null)
                setAnswers({
                  step1: { choices: [] as string[], reasoning: '' },
                  step2: { choices: [] as string[], reasoning: '' },
                  step3: { choices: [] as string[], reasoning: '' },
                  step4: { choices: [] as string[], reasoning: '' },
                  step5: { choices: [] as string[], reasoning: '' }
                })
                setCurrentStep(0)
                setHintCount(0)
                setShowHints(false)
                setHints([])
                setHintError('')
                setIsLoadingHints(false)
              }}
            >
              新しいケースを始める
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}