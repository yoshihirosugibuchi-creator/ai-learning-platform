'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Sparkles,
  Copy,
  Check,
  FileJson,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Upload,
  ChevronDown,
  ChevronUp,
  Info,
  Save,
  Pencil,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { generatePrompt, questionTypeDescriptions } from '@/lib/case-study-prompt-generators'
import type { PromptGeneratorParams, QuestionType } from '@/lib/case-study-prompt-generators'

type WizardStep = 1 | 2 | 3 | 4

// Step 4 レビュー用の型定義
interface ParsedOption {
  id: string
  text: string
  is_correct: boolean
}

interface ParsedModelAnswer {
  ideal_choices?: string[]
  essential_points?: string[]
  good_examples?: string[]
  common_mistakes?: string[]
  choice_explanations?: Record<string, string>
  scoring_anchors?: {
    excellent?: string
    good?: string
    adequate?: string
    poor?: string
  }
}

interface ParsedStep {
  step_number?: number
  step_name?: string
  description?: string
  question_type?: string
  options?: ParsedOption[]
  model_answer?: ParsedModelAnswer
  target_skills?: string[]
  hint?: string
}

interface ParsedProblemData {
  title?: string
  case_text?: string
  difficulty?: string
  industry?: string
  scenario_type?: string
  steps?: ParsedStep[]
  [key: string]: unknown
}

interface Category {
  category_id: string
  name: string
  description?: string
  is_active?: boolean
  type?: string
}

interface Subcategory {
  id: string
  name: string
  description?: string
}

interface OptionItem {
  id: string
  option_type: string
  code: string
  name: string
  name_en?: string
  description?: string
  display_order: number
  target_skills?: string[]
  is_extended?: boolean
}

interface StepFrameworkItem extends OptionItem {
  target_skills: string[]
  is_extended: boolean
}

interface RubricAxis {
  axis_code: string
  axis_name: string
  definition: string
  rubric_group_code: string
  rubric_group_name: string
}

// Step 4: レビュー・編集コンポーネント
function Step4ReviewEdit({
  parsedData,
  setParsedData,
  importing,
  onBack,
  onImport,
}: {
  parsedData: ParsedProblemData
  setParsedData: (data: ParsedProblemData | null) => void
  importing: boolean
  onBack: () => void
  onImport: (status: 'draft' | 'review') => Promise<void>
}) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]))

  // 基本情報の更新
  const updateField = (field: keyof ParsedProblemData, value: unknown) => {
    setParsedData({ ...parsedData, [field]: value })
  }

  // ステップの更新
  const updateStep = (stepIndex: number, field: keyof ParsedStep, value: unknown) => {
    const newSteps = [...(parsedData.steps || [])]
    newSteps[stepIndex] = { ...newSteps[stepIndex], [field]: value }
    setParsedData({ ...parsedData, steps: newSteps })
  }

  // 選択肢の更新
  const updateOption = (stepIndex: number, optionIndex: number, field: keyof ParsedOption, value: unknown) => {
    const newSteps = [...(parsedData.steps || [])]
    const newOptions = [...(newSteps[stepIndex].options || [])]
    newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value }
    newSteps[stepIndex] = { ...newSteps[stepIndex], options: newOptions }
    setParsedData({ ...parsedData, steps: newSteps })
  }

  // model_answerの更新
  const updateModelAnswer = (stepIndex: number, field: keyof ParsedModelAnswer, value: unknown) => {
    const newSteps = [...(parsedData.steps || [])]
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      model_answer: { ...newSteps[stepIndex].model_answer, [field]: value }
    }
    setParsedData({ ...parsedData, steps: newSteps })
  }

  // choice_explanationsの更新
  const updateChoiceExplanation = (stepIndex: number, optionId: string, value: string) => {
    const newSteps = [...(parsedData.steps || [])]
    const currentExplanations = newSteps[stepIndex].model_answer?.choice_explanations || {}
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      model_answer: {
        ...newSteps[stepIndex].model_answer,
        choice_explanations: { ...currentExplanations, [optionId]: value }
      }
    }
    setParsedData({ ...parsedData, steps: newSteps })
  }

  // scoring_anchorsの更新
  const updateScoringAnchor = (stepIndex: number, level: string, value: string) => {
    const newSteps = [...(parsedData.steps || [])]
    const currentAnchors = newSteps[stepIndex].model_answer?.scoring_anchors || {}
    newSteps[stepIndex] = {
      ...newSteps[stepIndex],
      model_answer: {
        ...newSteps[stepIndex].model_answer,
        scoring_anchors: { ...currentAnchors, [level]: value }
      }
    }
    setParsedData({ ...parsedData, steps: newSteps })
  }

  const toggleStep = (index: number) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedSteps(newExpanded)
  }

  const expandAll = () => {
    setExpandedSteps(new Set((parsedData.steps || []).map((_, i) => i)))
  }

  const collapseAll = () => {
    setExpandedSteps(new Set())
  }

  return (
    <div className="space-y-4">
      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Pencil className="h-5 w-5 mr-2" />
            レビュー・編集
          </CardTitle>
          <CardDescription>
            内容を確認し、必要に応じて編集してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>タイトル</Label>
            <Input
              value={parsedData.title || ''}
              onChange={(e) => updateField('title', e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>ケーステキスト（問題文）</Label>
            <Textarea
              value={parsedData.case_text || ''}
              onChange={(e) => updateField('case_text', e.target.value)}
              rows={8}
              className="mt-1"
            />
          </div>
          <div className="flex items-center space-x-4 text-sm flex-wrap gap-2">
            <Badge variant="outline">難易度: {parsedData.difficulty}</Badge>
            <Badge variant="outline">業界: {parsedData.industry || '未設定'}</Badge>
            <Badge variant="outline">{parsedData.steps?.length || 0}ステップ</Badge>
            {parsedData.scenario_type && <Badge variant="outline">タイプ: {parsedData.scenario_type}</Badge>}
          </div>
        </CardContent>
      </Card>

      {/* ステップ一覧 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>ステップ詳細</CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={expandAll}>
                <ChevronDown className="h-4 w-4 mr-1" />
                すべて展開
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll}>
                <ChevronUp className="h-4 w-4 mr-1" />
                すべて折りたたむ
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {parsedData.steps?.map((step, stepIndex) => (
            <Collapsible
              key={stepIndex}
              open={expandedSteps.has(stepIndex)}
              onOpenChange={() => toggleStep(stepIndex)}
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold">
                        {step.step_number || stepIndex + 1}
                      </div>
                      <div>
                        <span className="font-medium">{step.step_name}</span>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            選択肢: {step.options?.length || 0}個
                          </Badge>
                          {step.question_type && (
                            <Badge variant="secondary" className="text-xs">{step.question_type}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {expandedSteps.has(stepIndex) ? (
                      <ChevronUp className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-4 border-t">
                    {/* ステップ名と説明 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-4">
                      <div>
                        <Label className="text-sm font-medium">ステップ名</Label>
                        <Input
                          value={step.step_name || ''}
                          onChange={(e) => updateStep(stepIndex, 'step_name', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium">対象スキル</Label>
                        <Input
                          value={step.target_skills?.join(', ') || ''}
                          onChange={(e) => updateStep(stepIndex, 'target_skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                          placeholder="カンマ区切りで入力"
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">ステップの説明（設問）</Label>
                      <Textarea
                        value={step.description || ''}
                        onChange={(e) => updateStep(stepIndex, 'description', e.target.value)}
                        rows={5}
                        className="mt-1 min-h-[120px]"
                      />
                    </div>

                    {/* 選択肢 */}
                    {step.options && step.options.length > 0 && (
                      <div>
                        <Label className="text-sm font-medium">選択肢</Label>
                        <div className="space-y-3 mt-2">
                          {step.options.map((option, optIndex) => (
                            <div key={option.id} className="p-4 bg-muted/30 rounded-lg border">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <Badge variant="outline" className="text-xs font-mono">{option.id}</Badge>
                                  <div className="flex items-center space-x-2">
                                    <Switch
                                      checked={option.is_correct}
                                      onCheckedChange={(checked) => updateOption(stepIndex, optIndex, 'is_correct', checked)}
                                    />
                                    <span className={`text-sm ${option.is_correct ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                                      {option.is_correct ? '正解' : '不正解'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">選択肢テキスト</Label>
                                  <Textarea
                                    value={option.text}
                                    onChange={(e) => updateOption(stepIndex, optIndex, 'text', e.target.value)}
                                    rows={3}
                                    className="text-sm min-h-[80px]"
                                  />
                                </div>
                                {/* 選択肢の解説 */}
                                <div>
                                  <Label className="text-xs text-muted-foreground mb-1 block">この選択肢の解説</Label>
                                  <Textarea
                                    value={step.model_answer?.choice_explanations?.[option.id] || ''}
                                    onChange={(e) => updateChoiceExplanation(stepIndex, option.id, e.target.value)}
                                    rows={3}
                                    placeholder="なぜこの選択肢が正解/不正解なのか..."
                                    className="text-sm min-h-[80px]"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 模範解答 */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium">模範解答・採点基準</Label>

                      {/* essential_points */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">必須ポイント（essential_points）</Label>
                        <Textarea
                          value={step.model_answer?.essential_points?.join('\n') || ''}
                          onChange={(e) => updateModelAnswer(stepIndex, 'essential_points', e.target.value.split('\n').filter(Boolean))}
                          rows={4}
                          placeholder="1行1ポイントで入力"
                          className="text-sm min-h-[100px]"
                        />
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* good_examples */}
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">良い回答例（good_examples）</Label>
                          <Textarea
                            value={step.model_answer?.good_examples?.join('\n') || ''}
                            onChange={(e) => updateModelAnswer(stepIndex, 'good_examples', e.target.value.split('\n').filter(Boolean))}
                            rows={4}
                            placeholder="1行1例で入力"
                            className="text-sm min-h-[100px]"
                          />
                        </div>

                        {/* common_mistakes */}
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">よくある間違い（common_mistakes）</Label>
                          <Textarea
                            value={step.model_answer?.common_mistakes?.join('\n') || ''}
                            onChange={(e) => updateModelAnswer(stepIndex, 'common_mistakes', e.target.value.split('\n').filter(Boolean))}
                            rows={4}
                            placeholder="1行1例で入力"
                            className="text-sm min-h-[100px]"
                          />
                        </div>
                      </div>

                      {/* scoring_anchors */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-2 block">採点アンカー（scoring_anchors）</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                          {['excellent', 'good', 'adequate', 'poor'].map((level) => (
                            <div key={level} className="space-y-1">
                              <Label className="text-xs capitalize font-medium">{level}</Label>
                              <Textarea
                                value={step.model_answer?.scoring_anchors?.[level as keyof typeof step.model_answer.scoring_anchors] || ''}
                                onChange={(e) => updateScoringAnchor(stepIndex, level, e.target.value)}
                                rows={3}
                                className="text-sm min-h-[80px]"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* ヒント */}
                    <div>
                      <Label className="text-sm font-medium">ヒント</Label>
                      <Textarea
                        value={step.hint || ''}
                        onChange={(e) => updateStep(stepIndex, 'hint', e.target.value)}
                        rows={3}
                        placeholder="学習者向けのヒント..."
                        className="mt-1 min-h-[80px]"
                      />
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </CardContent>
      </Card>

      {/* ナビゲーション */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          戻る
        </Button>
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onImport('draft')}
            disabled={importing}
          >
            <Upload className="h-4 w-4 mr-1" />
            下書きで登録
          </Button>
          <Button
            type="button"
            onClick={() => onImport('review')}
            disabled={importing}
          >
            <Check className="h-4 w-4 mr-1" />
            レビュー済として登録
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function CaseStudyGeneratePage() {
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const draftIdParam = searchParams.get('id')

  const [currentStep, setCurrentStep] = useState<WizardStep>(1)
  const [copied, setCopied] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showFramework, setShowFramework] = useState(false)

  // 下書きID（DB保存時に取得）
  const [draftId, setDraftId] = useState<string | null>(draftIdParam)
  const [saving, setSaving] = useState(false)
  const [loadingDraft, setLoadingDraft] = useState(!!draftIdParam)

  // API取得データ
  const [categories, setCategories] = useState<Category[]>([])
  const [industryCategories, setIndustryCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [options, setOptions] = useState<{
    job_role: OptionItem[]
    business_phase: OptionItem[]
    scenario_type: OptionItem[]
    info_clarity: OptionItem[]
  }>({
    job_role: [],
    business_phase: [],
    scenario_type: [],
    info_clarity: [],
  })
  const [stepFramework, setStepFramework] = useState<StepFrameworkItem[]>([])
  const [_rubricAxes, setRubricAxes] = useState<RubricAxis[]>([])
  const [rubricPromptText, setRubricPromptText] = useState('')
  const [loadingCategories, setLoadingCategories] = useState(true)
  const [loadingSubcategories, setLoadingSubcategories] = useState(false)
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [loadingStepFramework, setLoadingStepFramework] = useState(true)
  const [loadingRubric, setLoadingRubric] = useState(true)

  // Step 1: パラメータ
  const [params, setParams] = useState({
    categoryId: '',
    subcategoryId: '',
    difficulty: 'intermediate',
    industryId: '',
    jobRoleCode: '',
    businessPhaseCode: '',
    scenarioTypeCode: '',
    infoClarityCode: '',
    stepCount: 5,
    questionType: 'hybrid' as QuestionType,
    diagramStyle: 'mermaid' as 'mermaid' | 'ascii' | 'none',
    customPrompt: '',
    aiModel: 'chatgpt' as 'claude' | 'chatgpt' | 'gemini',
  })

  // Step 2: プロンプト
  const [generatedPrompt, setGeneratedPrompt] = useState('')

  // Step 3: AI応答
  const [aiResponseText, setAiResponseText] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<Record<string, unknown> | null>(null)

  // API認証ヘッダー取得
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { 'Authorization': `Bearer ${session.access_token}` }
    }
    if (process.env.NODE_ENV === 'development') {
      return {
        'x-test-user-id': '82413077-a06d-4d9c-82bb-6fdb6a6b8e13',
        'x-test-role': 'admin'
      }
    }
    return {}
  }, [])

  // 下書き保存（DB）
  const saveDraft = useCallback(async () => {
    setSaving(true)
    try {
      const authHeaders = await getAuthHeaders()
      const industryObj = industryCategories.find(c => c.category_id === params.industryId)
      const scenarioObj = options.scenario_type.find(o => o.code === params.scenarioTypeCode)

      const draftData = {
        category_id: params.categoryId || null,
        subcategory_id: params.subcategoryId || null,
        difficulty: params.difficulty,
        industry_id: params.industryId || null,
        industry_name: industryObj?.name,
        job_role_code: params.jobRoleCode || null,
        business_phase_code: params.businessPhaseCode || null,
        scenario_type_code: params.scenarioTypeCode || null,
        scenario_type_name: scenarioObj?.name,
        info_clarity_code: params.infoClarityCode || null,
        step_count: params.stepCount,
        question_type: params.questionType,
        custom_prompt: params.customPrompt || null,
        ai_model: params.aiModel,
        current_step: currentStep,
        generated_prompt: generatedPrompt || null,
        ai_response_text: aiResponseText || null,
        parsed_data: parsedData || null,
        auto_update_title: true,
      }

      let res: Response
      if (draftId) {
        // 既存の下書きを更新
        res = await fetch(`/api/admin/case-study/generation-logs/${draftId}`, {
          method: 'PUT',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(draftData),
        })
      } else {
        // 新規作成
        res = await fetch('/api/admin/case-study/generation-logs', {
          method: 'POST',
          headers: { ...authHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify(draftData),
        })
      }

      const result = await res.json()
      if (result.success) {
        if (!draftId && result.log?.id) {
          setDraftId(result.log.id)
          // URLを更新（履歴に残さない）
          router.replace(`/admin/case-study/generate?id=${result.log.id}`, { scroll: false })
        }
        toast({ title: '下書きを保存しました', description: `ステップ ${currentStep} の状態を保存しました` })
      } else {
        throw new Error(result.error || '保存に失敗しました')
      }
    } catch (error) {
      console.error('Failed to save draft:', error)
      toast({ title: 'エラー', description: '下書きの保存に失敗しました', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, params, generatedPrompt, aiResponseText, parsedData, draftId, industryCategories, options.scenario_type])

  // URL パラメータから下書きを読み込み
  useEffect(() => {
    if (!draftIdParam) {
      setLoadingDraft(false)
      return
    }

    const loadDraftFromDb = async () => {
      try {
        const authHeaders = await getAuthHeaders()
        const res = await fetch(`/api/admin/case-study/generation-logs/${draftIdParam}`, {
          headers: authHeaders,
        })
        const result = await res.json()

        if (result.success && result.log) {
          const log = result.log
          setParams({
            categoryId: log.category_id || '',
            subcategoryId: log.subcategory_id || '',
            difficulty: log.difficulty || 'intermediate',
            industryId: log.industry_id || '',
            jobRoleCode: log.job_role_code || '',
            businessPhaseCode: log.business_phase_code || '',
            scenarioTypeCode: log.scenario_type_code || '',
            infoClarityCode: log.info_clarity_code || '',
            stepCount: log.step_count || 5,
            questionType: log.question_type || 'hybrid',
            diagramStyle: log.diagram_style || 'mermaid',
            customPrompt: log.custom_prompt || '',
            aiModel: log.ai_model || 'chatgpt',
          })
          setCurrentStep(log.current_step || 1)
          setGeneratedPrompt(log.generated_prompt || '')
          setAiResponseText(log.ai_response_text || '')
          if (log.parsed_data) {
            setParsedData(log.parsed_data)
          }
          setDraftId(log.id)
          toast({ title: '下書きを読み込みました' })
        } else {
          toast({ title: 'エラー', description: '下書きが見つかりません', variant: 'destructive' })
          router.replace('/admin/case-study/generate')
        }
      } catch (error) {
        console.error('Failed to load draft:', error)
        toast({ title: 'エラー', description: '下書きの読み込みに失敗しました', variant: 'destructive' })
      } finally {
        setLoadingDraft(false)
      }
    }

    loadDraftFromDb()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftIdParam])

  // カテゴリー一覧取得（メインカテゴリーと業界カテゴリー）
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch('/api/categories')
        const data = await res.json()
        if (data.categories) {
          const allCategories = data.categories.filter(
            (cat: Category) => cat.is_active !== false
          )
          // カテゴリー: メイン＋業界両方から選択可能
          // 業界: 業界カテゴリーのみ
          setCategories(allCategories) // main + industry 両方
          setIndustryCategories(allCategories.filter((c: Category) => c.type === 'industry'))

          // デフォルト設定
          const mainCats = allCategories.filter((c: Category) => c.type === 'main')
          if (mainCats.length > 0 && !params.categoryId) {
            const defaultCat = mainCats.find(
              (c: Category) => c.category_id === 'logical_thinking_problem_solving'
            ) || mainCats[0]
            setParams(p => ({ ...p, categoryId: defaultCat.category_id }))
          }

          // 業界デフォルト
          const industryCats = allCategories.filter((c: Category) => c.type === 'industry')
          if (industryCats.length > 0 && !params.industryId) {
            setParams(p => ({ ...p, industryId: industryCats[0].category_id }))
          }
        }
      } catch (error) {
        console.error('Categories fetch error:', error)
      } finally {
        setLoadingCategories(false)
      }
    }
    fetchCategories()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // オプションマスタ取得
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await fetch('/api/admin/case-study/options')
        const data = await res.json()
        if (data.success && data.grouped) {
          setOptions({
            job_role: data.grouped.job_role || [],
            business_phase: data.grouped.business_phase || [],
            scenario_type: data.grouped.scenario_type || [],
            info_clarity: data.grouped.info_clarity || [],
          })

          // デフォルト設定
          if (data.grouped.job_role?.length > 0) {
            setParams(p => ({ ...p, jobRoleCode: data.grouped.job_role[0].code }))
          }
          if (data.grouped.business_phase?.length > 0) {
            setParams(p => ({ ...p, businessPhaseCode: data.grouped.business_phase[0].code }))
          }
          if (data.grouped.scenario_type?.length > 0) {
            setParams(p => ({ ...p, scenarioTypeCode: data.grouped.scenario_type[0].code }))
          }
        }
      } catch (error) {
        console.error('Options fetch error:', error)
      } finally {
        setLoadingOptions(false)
      }
    }
    fetchOptions()
  }, [])

  // ステップフレームワーク取得
  useEffect(() => {
    const fetchStepFramework = async () => {
      try {
        const res = await fetch('/api/admin/case-study/options?type=step_framework')
        const data = await res.json()
        if (data.success && data.options) {
          setStepFramework(data.options as StepFrameworkItem[])
        }
      } catch (error) {
        console.error('Step framework fetch error:', error)
      } finally {
        setLoadingStepFramework(false)
      }
    }
    fetchStepFramework()
  }, [])

  // ルーブリック軸取得
  useEffect(() => {
    const fetchRubricAxes = async () => {
      try {
        const authHeaders = await getAuthHeaders()
        const res = await fetch('/api/admin/case-study/rubric-axes', {
          headers: authHeaders,
        })
        const data = await res.json()
        if (data.success) {
          setRubricAxes(data.axes || [])
          setRubricPromptText(data.promptText || '')
        }
      } catch (error) {
        console.error('Rubric axes fetch error:', error)
      } finally {
        setLoadingRubric(false)
      }
    }
    fetchRubricAxes()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // サブカテゴリー一覧取得（カテゴリー選択時）
  useEffect(() => {
    if (!params.categoryId) {
      setSubcategories([])
      return
    }

    const fetchSubcategories = async () => {
      setLoadingSubcategories(true)
      try {
        const res = await fetch(`/api/admin/categories/${params.categoryId}/subcategories`)
        const data = await res.json()
        if (data.subcategories) {
          setSubcategories(data.subcategories)
          if (data.subcategories.length > 0) {
            setParams(p => ({ ...p, subcategoryId: data.subcategories[0].id }))
          } else {
            setParams(p => ({ ...p, subcategoryId: '' }))
          }
        }
      } catch (error) {
        console.error('Subcategories fetch error:', error)
      } finally {
        setLoadingSubcategories(false)
      }
    }
    fetchSubcategories()
  }, [params.categoryId])

  // ステップフレームワークテキストを生成（DBデータから）
  const buildStepFrameworkText = useCallback((): string => {
    if (stepFramework.length === 0) return ''

    const standardSteps = stepFramework.filter(s => !s.is_extended).sort((a, b) => a.display_order - b.display_order)
    const extendedSteps = stepFramework.filter(s => s.is_extended).sort((a, b) => a.display_order - b.display_order)

    let text = '【5ステップ標準フレームワーク】\n'

    for (const step of standardSteps) {
      const stepNum = step.code.replace('step_', '')
      const skills = step.target_skills?.join(', ') || ''
      text += `Step ${stepNum}: ${step.name} - ${step.description}\n`
      text += `  → 主要評価軸: ${skills}\n`
    }

    if (extendedSteps.length > 0) {
      text += '\n【拡張ステップ（6〜8ステップの場合）】\n'
      for (const step of extendedSteps) {
        const stepNum = step.code.replace('step_', '')
        const skills = step.target_skills?.join(', ') || ''
        text += `Step ${stepNum}: ${step.name} - ${step.description}\n`
        text += `  → 主要評価軸: ${skills}\n`
      }
    }

    return text
  }, [stepFramework])

  // Step 1 → 2: プロンプト生成
  const handleGeneratePrompt = () => {
    const categoryObj = categories.find(c => c.category_id === params.categoryId)
    const subcatObj = subcategories.find(s => s.id === params.subcategoryId)
    const industryObj = industryCategories.find(c => c.category_id === params.industryId)
    const jobRoleObj = options.job_role.find(o => o.code === params.jobRoleCode)
    const phaseObj = options.business_phase.find(o => o.code === params.businessPhaseCode)
    const scenarioObj = options.scenario_type.find(o => o.code === params.scenarioTypeCode)
    const clarityObj = options.info_clarity.find(o => o.code === params.infoClarityCode)

    // DB駆動型：マスタデータからテキスト生成
    const stepFrameworkText = buildStepFrameworkText()

    const promptParams: PromptGeneratorParams = {
      categoryId: params.categoryId,
      categoryName: categoryObj?.name || params.categoryId,
      subcategoryId: params.subcategoryId,
      subcategoryName: subcatObj?.name || params.subcategoryId,
      difficulty: params.difficulty,
      industry: industryObj?.name || '一般',
      industryCode: params.industryId,
      jobRole: jobRoleObj?.name || '一般',
      jobRoleCode: params.jobRoleCode,
      businessPhase: phaseObj?.name || '成長期',
      businessPhaseCode: params.businessPhaseCode,
      scenarioType: scenarioObj?.name || '問題解決',
      scenarioTypeCode: params.scenarioTypeCode,
      infoClarity: params.infoClarityCode || undefined,
      infoClarityName: clarityObj?.name,
      stepCount: params.stepCount,
      questionType: params.questionType,
      diagramStyle: params.diagramStyle,
      customPrompt: params.customPrompt || undefined,
      aiModel: params.aiModel,
      // DB駆動型マスタデータ
      stepFrameworkText: stepFrameworkText || undefined,
      rubricAxesText: rubricPromptText || undefined,
    }

    const prompt = generatePrompt(promptParams)
    setGeneratedPrompt(prompt)
    setCurrentStep(2)
  }

  // コピー
  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedPrompt)
    setCopied(true)
    toast({ title: 'コピーしました' })
    setTimeout(() => setCopied(false), 2000)
  }

  // Step 3: バリデーション
  const handleValidate = () => {
    setValidationError(null)
    setParsedData(null)

    let text = aiResponseText.trim()

    // ```json ... ``` を除去
    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/)
    if (jsonBlockMatch) {
      text = jsonBlockMatch[1].trim()
    }

    try {
      const data = JSON.parse(text)

      // 必須フィールドチェック
      if (!data.title) throw new Error('title が必要です')
      if (!data.case_text) throw new Error('case_text が必要です')
      if (!data.steps || !Array.isArray(data.steps) || data.steps.length === 0) {
        throw new Error('steps が1つ以上必要です')
      }

      // 各ステップのバリデーション
      for (let i = 0; i < data.steps.length; i++) {
        const step = data.steps[i]
        const stepQuestionType = step.question_type || params.questionType

        if (!step.step_name) throw new Error(`steps[${i}].step_name が必要です`)
        if (!step.description) throw new Error(`steps[${i}].description が必要です`)

        // 選択肢のバリデーション（記述式以外 = single, multiple, hybrid）
        if (stepQuestionType !== 'text') {
          if (!step.options || step.options.length < 2) {
            throw new Error(`steps[${i}].options は2つ以上必要です（問題形式: ${stepQuestionType}）`)
          }
        }

        // model_answer検証
        if (!step.model_answer) {
          throw new Error(`steps[${i}].model_answer が必要です`)
        }
        if (!step.model_answer.scoring_anchors) {
          throw new Error(`steps[${i}].model_answer.scoring_anchors が必要です`)
        }

        // 記述式・ハイブリッドの場合はessential_pointsが必要
        if (stepQuestionType === 'text' || stepQuestionType === 'hybrid') {
          if (!step.model_answer.essential_points || step.model_answer.essential_points.length === 0) {
            throw new Error(`steps[${i}].model_answer.essential_points が必要です（問題形式: ${stepQuestionType}）`)
          }
        }

        // 選択式・ハイブリッドの場合はchoice_explanationsが必要（single, multiple, hybrid）
        if (stepQuestionType !== 'text') {
          if (!step.model_answer.choice_explanations || Object.keys(step.model_answer.choice_explanations).length === 0) {
            console.warn(`steps[${i}].model_answer.choice_explanations がありません（推奨）`)
          }
        }

        // good_examples, common_mistakesは警告のみ
        if (!step.model_answer.good_examples) {
          console.warn(`steps[${i}].model_answer.good_examples がありません`)
        }
        if (!step.model_answer.common_mistakes) {
          console.warn(`steps[${i}].model_answer.common_mistakes がありません`)
        }
      }

      setParsedData(data)
      setCurrentStep(4)
    } catch (e) {
      setValidationError(e instanceof Error ? e.message : 'JSONの解析に失敗しました')
    }
  }

  // Step 4: インポート
  // status: 'draft' = レビュー前の下書き, 'review' = レビュー済（公開可能）
  const handleImport = async (targetStatus: 'draft' | 'review') => {
    if (!parsedData) {
      toast({ title: 'エラー', description: 'パースされたデータがありません', variant: 'destructive' })
      return
    }

    setImporting(true)
    try {
      const authHeaders = await getAuthHeaders()

      const importData = {
        ...parsedData,
        primary_category_id: params.categoryId || 'logical_thinking_problem_solving',
        primary_subcategory_id: params.subcategoryId || 'structured_thinking_mece',
        industry: params.industryId || null,
        difficulty: (parsedData as Record<string, unknown>).difficulty || params.difficulty || 'intermediate',
        generation_model: params.aiModel,
        generation_prompt: generatedPrompt.substring(0, 2000),
      }

      const res = await fetch('/api/admin/case-study/import', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify(importData),
      })

      const result = await res.json()

      if (result.success) {
        let finalStatus = 'draft'

        // レビュー済の場合はステータスを更新
        if (targetStatus === 'review') {
          const statusRes = await fetch(`/api/admin/case-study/problems/${result.problem.id}/status`, {
            method: 'PUT',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'review' }),
          })
          const statusResult = await statusRes.json()
          if (statusResult.success) {
            finalStatus = 'review'
          } else {
            console.error('Status update failed:', statusResult.error)
            toast({
              title: '警告',
              description: `問題は作成されましたが、ステータス更新に失敗しました: ${statusResult.error}`,
              variant: 'destructive'
            })
          }
        }

        // 生成ログを更新（問題IDを紐付け、ステータスをimportedに）
        if (draftId) {
          await fetch(`/api/admin/case-study/generation-logs/${draftId}`, {
            method: 'PUT',
            headers: { ...authHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              problem_id: result.problem.id,
              status: 'imported',
              current_step: 4,
              parsed_data: parsedData,
            }),
          })
        }

        const statusLabel = finalStatus === 'draft' ? '下書き' : 'レビュー済'
        toast({ title: '成功', description: `問題「${result.problem.title}」を${statusLabel}として登録しました` })
        router.push(`/admin/case-study/problems/${result.problem.id}`)
      } else {
        toast({ title: 'エラー', description: result.error || 'インポートに失敗しました', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Import error:', error)
      toast({ title: 'エラー', description: `インポートに失敗しました: ${error instanceof Error ? error.message : String(error)}`, variant: 'destructive' })
    } finally {
      setImporting(false)
    }
  }

  const isLoading = loadingCategories || loadingOptions || loadingStepFramework || loadingRubric

  // 下書き読み込み中
  if (loadingDraft) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto" />
          <p className="text-muted-foreground">下書きを読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/admin/case-study')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            戻る
          </Button>
          <h1 className="text-xl font-bold flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
            ケーススタディ問題生成
          </h1>
        </div>
        <div className="flex items-center space-x-2">
          {draftId && (
            <Badge variant="outline" className="text-xs">
              ID: {draftId.slice(0, 8)}...
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={saveDraft} disabled={saving}>
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-1" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {saving ? '保存中...' : '下書き保存'}
          </Button>
        </div>
      </div>

      {/* ステッププログレス */}
      <div className="flex items-center space-x-2">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= step ? 'bg-purple-600 text-white' : 'bg-muted text-muted-foreground'
            }`}>
              {step}
            </div>
            {step < 4 && (
              <div className={`w-12 h-0.5 ${currentStep > step ? 'bg-purple-600' : 'bg-muted'}`} />
            )}
          </div>
        ))}
        <span className="text-sm text-muted-foreground ml-2">
          {currentStep === 1 && 'パラメータ設定'}
          {currentStep === 2 && 'プロンプト生成'}
          {currentStep === 3 && 'AI応答貼り付け'}
          {currentStep === 4 && 'レビュー・保存'}
        </span>
      </div>

      {/* Step 1: パラメータ設定 */}
      {currentStep === 1 && (
        <div className="space-y-4">
          {/* 基本設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">基本設定</CardTitle>
              <CardDescription>問題のカテゴリーと難易度を設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>カテゴリー</Label>
                  <Select
                    value={params.categoryId}
                    onValueChange={(v) => setParams(p => ({ ...p, categoryId: v, subcategoryId: '' }))}
                    disabled={isLoading}
                  >
                    <SelectTrigger><SelectValue placeholder={isLoading ? '読み込み中...' : '選択...'} /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.category_id} value={c.category_id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>サブカテゴリー</Label>
                  <Select
                    value={params.subcategoryId}
                    onValueChange={(v) => setParams(p => ({ ...p, subcategoryId: v }))}
                    disabled={loadingSubcategories || !params.categoryId}
                  >
                    <SelectTrigger><SelectValue placeholder={loadingSubcategories ? '読み込み中...' : '選択...'} /></SelectTrigger>
                    <SelectContent>
                      {subcategories.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>難易度</Label>
                  <Select
                    value={params.difficulty}
                    onValueChange={(v) => setParams(p => ({ ...p, difficulty: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">初級（基本的な概念の理解と適用）</SelectItem>
                      <SelectItem value="intermediate">中級（複数視点からの分析が必要）</SelectItem>
                      <SelectItem value="advanced">上級（複雑な状況判断が必要）</SelectItem>
                      <SelectItem value="expert">エキスパート（戦略的な意思決定が必要）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>AIモデル</Label>
                  <Select
                    value={params.aiModel}
                    onValueChange={(v) => setParams(p => ({ ...p, aiModel: v as 'claude' | 'chatgpt' | 'gemini' }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chatgpt">ChatGPT</SelectItem>
                      <SelectItem value="claude">Claude</SelectItem>
                      <SelectItem value="gemini">Gemini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* シナリオ設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">シナリオ設定</CardTitle>
              <CardDescription>業界×職種×フェーズでケースの文脈を設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>業界</Label>
                  <Select
                    value={params.industryId}
                    onValueChange={(v) => setParams(p => ({ ...p, industryId: v }))}
                    disabled={isLoading}
                  >
                    <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                    <SelectContent>
                      {industryCategories.map(c => (
                        <SelectItem key={c.category_id} value={c.category_id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>職種</Label>
                  <Select
                    value={params.jobRoleCode}
                    onValueChange={(v) => setParams(p => ({ ...p, jobRoleCode: v }))}
                    disabled={isLoading}
                  >
                    <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                    <SelectContent>
                      {options.job_role.map(o => (
                        <SelectItem key={o.code} value={o.code}>
                          {o.name}
                          {o.description && <span className="text-muted-foreground ml-2 text-xs">- {o.description}</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>フェーズ</Label>
                  <Select
                    value={params.businessPhaseCode}
                    onValueChange={(v) => setParams(p => ({ ...p, businessPhaseCode: v }))}
                    disabled={isLoading}
                  >
                    <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                    <SelectContent>
                      {options.business_phase.map(o => (
                        <SelectItem key={o.code} value={o.code}>
                          {o.name}
                          {o.description && <span className="text-muted-foreground ml-2 text-xs">- {o.description}</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>シナリオタイプ</Label>
                  <Select
                    value={params.scenarioTypeCode}
                    onValueChange={(v) => setParams(p => ({ ...p, scenarioTypeCode: v }))}
                    disabled={isLoading}
                  >
                    <SelectTrigger><SelectValue placeholder="選択..." /></SelectTrigger>
                    <SelectContent>
                      {options.scenario_type.map(o => (
                        <SelectItem key={o.code} value={o.code}>
                          {o.name}
                          {o.description && <span className="text-muted-foreground ml-2 text-xs">- {o.description}</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>情報の明確さ（オプション）</Label>
                  <Select
                    value={params.infoClarityCode || '_none'}
                    onValueChange={(v) => setParams(p => ({ ...p, infoClarityCode: v === '_none' ? '' : v }))}
                    disabled={isLoading}
                  >
                    <SelectTrigger><SelectValue placeholder="指定なし" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">指定なし</SelectItem>
                      {options.info_clarity.map(o => (
                        <SelectItem key={o.code} value={o.code}>
                          {o.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Level 1: 明確 → Level 3: 複雑（情報過多、トレードオフあり）
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 構成設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">構成設定</CardTitle>
              <CardDescription>問題形式、ステップ数、追加指示を設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>問題形式</Label>
                  <Select
                    value={params.questionType}
                    onValueChange={(v) => setParams(p => ({ ...p, questionType: v as QuestionType }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(questionTypeDescriptions) as [QuestionType, string][]).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                          {key === 'hybrid' && ' （推奨）'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {params.questionType === 'single' && '4択から1つだけ選ぶ形式（記述なし）'}
                    {params.questionType === 'multiple' && '4択から1〜4つ選べる形式（記述なし）'}
                    {params.questionType === 'text' && '選択肢なし、記述のみで回答する形式'}
                    {params.questionType === 'hybrid' && '4択から1〜4つ選んだ上で理由を記述する形式'}
                  </p>
                </div>

                <div>
                  <Label>ステップ数</Label>
                  <Select
                    value={params.stepCount.toString()}
                    onValueChange={(v) => setParams(p => ({ ...p, stepCount: parseInt(v) }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[5, 6, 7, 8].map(n => (
                        <SelectItem key={n} value={n.toString()}>
                          {n}ステップ
                          {n === 5 && ' （標準）'}
                          {n > 5 && ' （拡張）'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>図表形式</Label>
                  <Select
                    value={params.diagramStyle}
                    onValueChange={(v) => setParams(p => ({ ...p, diagramStyle: v as 'mermaid' | 'ascii' | 'none' }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mermaid">Mermaid図表（ビジュアル重視）</SelectItem>
                      <SelectItem value="ascii">テキスト図表（シンプル）</SelectItem>
                      <SelectItem value="none">図表なし（テキストのみ）</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    ケース本文で使用する図表の形式
                  </p>
                </div>
              </div>

              {/* ステップフレームワーク説明 */}
              <Collapsible open={showFramework} onOpenChange={setShowFramework}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center text-sm">
                      <Info className="h-4 w-4 mr-2" />
                      ステップフレームワークを表示
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showFramework ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
                    <p className="font-medium mb-3">選択したステップ数に応じて、以下のフレームワークで問題が生成されます：</p>
                    {loadingStepFramework ? (
                      <p className="text-muted-foreground">読み込み中...</p>
                    ) : (
                      Array.from({ length: params.stepCount }, (_, i) => i + 1).map(num => {
                        const stepItem = stepFramework.find(s => s.code === `step_${num}`)
                        const skills = stepItem?.target_skills?.join(', ') || ''
                        return (
                          <div key={num} className="flex items-start space-x-2 p-2 rounded bg-background">
                            <Badge variant={num <= 5 ? 'default' : 'secondary'} className="mt-0.5">
                              Step {num}
                            </Badge>
                            <div>
                              <span className="font-medium">{stepItem?.name || `ステップ${num}`}</span>
                              <span className="text-muted-foreground ml-2">- {stepItem?.description || ''}</span>
                              {skills && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  評価軸: {skills}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <div>
                <Label>追加指示（オプション）</Label>
                <Textarea
                  value={params.customPrompt}
                  onChange={(e) => setParams(p => ({ ...p, customPrompt: e.target.value }))}
                  placeholder="AIへの追加指示があれば入力してください..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  特定の状況設定や制約条件など、追加で指示したい内容があれば記入してください
                </p>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleGeneratePrompt} disabled={!params.categoryId || !params.subcategoryId}>
                  プロンプト生成
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: プロンプト生成 */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>生成プロンプト</span>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{params.aiModel}</Badge>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                  {copied ? 'コピー済み' : 'コピー'}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={generatedPrompt}
              onChange={(e) => setGeneratedPrompt(e.target.value)}
              rows={20}
              className="font-mono text-sm"
            />
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                戻る
              </Button>
              <Button onClick={() => setCurrentStep(3)}>
                AI応答を貼り付け
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: AI応答貼り付け */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileJson className="h-5 w-5 mr-2" />
              AI応答の貼り付け
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              AIの応答（JSON）をここに貼り付けてください。{' '}
              <code>```json ... ```</code> で囲まれていても自動的に処理します。
            </p>
            <Textarea
              value={aiResponseText}
              onChange={(e) => { setAiResponseText(e.target.value); setValidationError(null) }}
              rows={20}
              className="font-mono text-sm"
              placeholder="AIの応答JSONをここに貼り付けてください..."
            />

            {validationError && (
              <div className="flex items-start space-x-2 p-3 bg-red-50 rounded-lg text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                戻る
              </Button>
              <Button onClick={handleValidate} disabled={!aiResponseText.trim()}>
                <Check className="h-4 w-4 mr-1" />
                バリデーション & 次へ
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: レビュー・編集・保存 */}
      {currentStep === 4 && parsedData && (
        <Step4ReviewEdit
          parsedData={parsedData as ParsedProblemData}
          setParsedData={setParsedData}
          importing={importing}
          onBack={() => setCurrentStep(3)}
          onImport={handleImport}
        />
      )}
    </div>
  )
}
