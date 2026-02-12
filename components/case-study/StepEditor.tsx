'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { X, Plus, Trash2, GripVertical } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { getStepTemplate } from '@/lib/case-study-templates'

interface StepOption {
  id: string
  text: string
  is_correct: boolean
  partial_score: number
}

interface ModelAnswer {
  ideal_choices?: string[]
  acceptable_choices?: string[]
  essential_points?: string[]
  scoring_anchors?: Record<string, string>
}

interface Step {
  id?: string
  problem_id?: string
  step_number: number
  step_name: string
  description: string
  category_id: string
  subcategory_id: string
  question_type: string
  options: StepOption[] | null
  model_answer: ModelAnswer
  hint: string | null
  target_skills: string[]
  max_score: number
  display_order: number | null
}

interface Category {
  category_id: string
  name: string
}

interface Subcategory {
  id: string
  name: string
}

interface StepEditorProps {
  step: Step | null
  stepNumber: number
  isOpen: boolean
  onClose: () => void
  onSave: (step: Step) => Promise<void>
  categories: Category[]
  loadSubcategories: (categoryId: string) => Promise<Subcategory[]>
  /** テンプレートID（例: 'consulting', 'code_review'）。ステップ名候補とデフォルト値の決定に使用 */
  stepTemplate?: string
}

const QUESTION_TYPES = [
  { id: 'single', name: '単一選択' },
  { id: 'multiple', name: '複数選択' },
  { id: 'ordering', name: '順序並べ替え' },
  { id: 'text', name: '記述式' },
  { id: 'hybrid', name: 'ハイブリッド (選択+記述)' },
]

const SKILL_AXES = [
  // グループA-E: 既存10軸
  { id: 'problem_setting', name: '問題設定力' },
  { id: 'structuring_logic', name: 'ロジック構造化' },
  { id: 'hypothesis_thinking', name: '仮説思考' },
  { id: 'analysis_design', name: '分析設計' },
  { id: 'proposal_specificity', name: '提案具体性' },
  { id: 'perspective_diversity', name: '視点の多様性' },
  { id: 'feasibility', name: '実現可能性' },
  { id: 'impact', name: 'インパクト' },
  { id: 'expression', name: '表現力' },
  { id: 'originality', name: '独自性' },
  // グループF: 技術実務
  { id: 'technical_accuracy', name: '技術的正確性' },
  { id: 'security_awareness', name: 'セキュリティ考慮' },
  { id: 'test_coverage', name: 'テスト網羅性' },
  { id: 'code_quality', name: 'コード品質' },
  // グループG: ビジネススキル
  { id: 'documentation_quality', name: 'ドキュメント品質' },
  { id: 'cost_estimation', name: '見積もり妥当性' },
  // グループH: AI活用スキル
  { id: 'prompt_effectiveness', name: 'プロンプト設計力' },
  { id: 'ai_output_validation', name: 'AI出力の検証力' },
]

export default function StepEditor({
  step,
  stepNumber,
  isOpen,
  onClose,
  onSave,
  categories,
  loadSubcategories,
  stepTemplate,
}: StepEditorProps) {
  // テンプレートからステップ候補を取得
  const template = getStepTemplate(stepTemplate || null)
  const templateSteps = template.steps
  const isNew = !step?.id

  const [formData, setFormData] = useState<Step>({
    step_number: stepNumber,
    step_name: '',
    description: '',
    category_id: '',
    subcategory_id: '',
    question_type: 'hybrid',
    options: [
      { id: '1a', text: '', is_correct: true, partial_score: 4 },
      { id: '1b', text: '', is_correct: true, partial_score: 3 },
      { id: '1c', text: '', is_correct: true, partial_score: 2 },
      { id: '1d', text: '', is_correct: false, partial_score: 0 },
    ],
    model_answer: {
      ideal_choices: [],
      essential_points: [],
      scoring_anchors: { '1': '', '2': '', '3': '', '4': '', '5': '' },
    },
    hint: '',
    target_skills: [],
    max_score: 20,
    display_order: null,
  })

  const { toast } = useToast()
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [loadingSub, setLoadingSub] = useState(false)
  const [saving, setSaving] = useState(false)

  // 編集モード: 既存stepのデータをセット
  useEffect(() => {
    if (step) {
      setFormData({
        ...step,
        options: step.options || [
          { id: '1a', text: '', is_correct: true, partial_score: 4 },
          { id: '1b', text: '', is_correct: true, partial_score: 3 },
          { id: '1c', text: '', is_correct: true, partial_score: 2 },
          { id: '1d', text: '', is_correct: false, partial_score: 0 },
        ],
        model_answer: step.model_answer || {
          ideal_choices: [],
          essential_points: [],
          scoring_anchors: { '1': '', '2': '', '3': '', '4': '', '5': '' },
        },
        hint: step.hint || '',
        target_skills: step.target_skills || [],
        display_order: step.display_order ?? null,
      })
    } else {
      // 新規ステップ: テンプレートからステップ番号に応じたデフォルト値を設定
      const defaultStep = templateSteps.find(s => s.stepNumber === stepNumber) || templateSteps[0]
      setFormData({
        step_number: stepNumber,
        step_name: defaultStep?.stepName || '',
        description: defaultStep?.description || '',
        category_id: categories[0]?.category_id || '',
        subcategory_id: '',
        question_type: 'hybrid',
        options: [
          { id: `${stepNumber}a`, text: '', is_correct: true, partial_score: 4 },
          { id: `${stepNumber}b`, text: '', is_correct: true, partial_score: 3 },
          { id: `${stepNumber}c`, text: '', is_correct: true, partial_score: 2 },
          { id: `${stepNumber}d`, text: '', is_correct: false, partial_score: 0 },
        ],
        model_answer: {
          ideal_choices: [],
          essential_points: [],
          scoring_anchors: { '1': '', '2': '', '3': '', '4': '', '5': '' },
        },
        hint: '',
        target_skills: defaultStep?.targetSkills || [],
        max_score: 20,
        display_order: null,
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, stepNumber, categories, stepTemplate])

  // カテゴリー変更時にサブカテゴリー取得
  useEffect(() => {
    if (!formData.category_id) {
      setSubcategories([])
      return
    }
    setLoadingSub(true)
    loadSubcategories(formData.category_id)
      .then((subs) => {
        setSubcategories(subs)
        if (subs.length > 0 && !subs.find((s) => s.id === formData.subcategory_id)) {
          setFormData((prev) => ({ ...prev, subcategory_id: subs[0].id }))
        }
      })
      .finally(() => setLoadingSub(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.category_id])

  const handleOptionChange = (index: number, field: keyof StepOption, value: string | boolean | number) => {
    const newOptions = [...(formData.options || [])]
    newOptions[index] = { ...newOptions[index], [field]: value }
    setFormData((prev) => ({ ...prev, options: newOptions }))
  }

  const addOption = () => {
    const newId = `${formData.step_number}${String.fromCharCode(97 + (formData.options?.length || 0))}`
    setFormData((prev) => ({
      ...prev,
      options: [...(prev.options || []), { id: newId, text: '', is_correct: false, partial_score: 0 }],
    }))
  }

  const removeOption = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      options: (prev.options || []).filter((_, i) => i !== index),
    }))
  }

  const toggleSkill = (skillId: string) => {
    setFormData((prev) => ({
      ...prev,
      target_skills: prev.target_skills.includes(skillId)
        ? prev.target_skills.filter((s) => s !== skillId)
        : [...prev.target_skills, skillId],
    }))
  }

  const handleSave = async () => {
    if (!formData.step_name.trim()) {
      toast({ title: 'ステップ名は必須です', variant: 'destructive' })
      return
    }
    if (!formData.description.trim()) {
      toast({ title: '説明は必須です', variant: 'destructive' })
      return
    }

    // ideal_choicesを選択肢から自動計算
    let optionsToSave = formData.options || []
    let idealChoices: string[]

    if (formData.question_type === 'ordering') {
      // ordering: 全選択肢をis_correct:trueに設定、ideal_choicesは表示順
      optionsToSave = optionsToSave.map((opt, idx) => ({
        ...opt,
        is_correct: true,
        partial_score: optionsToSave.length - idx,
      }))
      idealChoices = optionsToSave.map((opt) => opt.id)
    } else {
      idealChoices = optionsToSave
        .filter((opt) => opt.is_correct)
        .map((opt) => opt.id)
    }

    const dataToSave: Step = {
      ...formData,
      options: optionsToSave,
      model_answer: {
        ...formData.model_answer,
        ideal_choices: idealChoices,
      },
    }

    setSaving(true)
    try {
      await onSave(dataToSave)
      onClose()
    } catch (error) {
      console.error('Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        className="!max-w-none w-[calc(100vw-2rem)] h-[calc(100vh-2rem)] max-h-none overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>
            {isNew ? `ステップ${stepNumber}を追加` : `ステップ${formData.step_number}を編集`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 基本情報 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>ステップ名 <span className="text-red-500">*</span></Label>
              <Select
                value={formData.step_name}
                onValueChange={(v) => {
                  const selectedStep = templateSteps.find(s => s.stepName === v)
                  setFormData((prev) => ({
                    ...prev,
                    step_name: v,
                    // 説明が空の場合のみ自動入力
                    description: prev.description || selectedStep?.description || '',
                    // 主要評価軸も自動設定
                    target_skills: selectedStep?.targetSkills || prev.target_skills,
                  }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ステップを選択..." />
                </SelectTrigger>
                <SelectContent>
                  {templateSteps.map((ts) => (
                    <SelectItem key={ts.stepNumber} value={ts.stepName}>
                      Step {ts.stepNumber}: {ts.stepName}
                      {ts.isExtended && ' (拡張)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                テンプレート: {template.name}（{template.steps.filter(s => !s.isExtended).length}ステップ＋拡張{template.steps.filter(s => s.isExtended).length}）
              </p>
            </div>

            <div className="col-span-2">
              <Label>設問文 <span className="text-red-500">*</span></Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="このステップで学習者に求める具体的な設問を記述してください（100〜200文字推奨）"
                rows={5}
                className="min-h-[120px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                標準説明: {templateSteps.find(s => s.stepName === formData.step_name)?.description || '(ステップを選択してください)'}
              </p>
            </div>

            <div>
              <Label>カテゴリー</Label>
              <Select
                value={formData.category_id}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, category_id: v, subcategory_id: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.category_id} value={cat.category_id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>サブカテゴリー</Label>
              <Select
                value={formData.subcategory_id}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, subcategory_id: v }))}
                disabled={loadingSub || subcategories.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingSub ? '読み込み中...' : '選択...'} />
                </SelectTrigger>
                <SelectContent>
                  {subcategories.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>質問タイプ</Label>
              <Select
                value={formData.question_type}
                onValueChange={(v) => setFormData((prev) => ({ ...prev, question_type: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QUESTION_TYPES.map((qt) => (
                    <SelectItem key={qt.id} value={qt.id}>
                      {qt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>最大スコア</Label>
              <Input
                type="number"
                value={formData.max_score}
                onChange={(e) => setFormData((prev) => ({ ...prev, max_score: parseInt(e.target.value) || 20 }))}
                min={1}
                max={100}
              />
            </div>
          </div>

          {/* 選択肢 */}
          {['single', 'multiple', 'hybrid', 'ordering'].includes(formData.question_type) && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>選択肢</Label>
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="h-4 w-4 mr-1" />
                  追加
                </Button>
              </div>
              {formData.question_type === 'ordering' && (
                <p className="text-xs text-muted-foreground mb-2">
                  順序並べ替え問題: 選択肢を正しい順序で並べてください。上から順に正解順として保存されます。
                </p>
              )}
              <div className="space-y-2">
                {(formData.options || []).map((option, index) => (
                  <div
                    key={option.id}
                    className={`flex items-start gap-2 p-3 rounded-lg border ${
                      option.is_correct ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                    }`}
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground mt-2 cursor-move" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-sm w-8 mt-2">{option.id}</span>
                        <Textarea
                          value={option.text}
                          onChange={(e) => handleOptionChange(index, 'text', e.target.value)}
                          placeholder="選択肢のテキスト"
                          className="flex-1 min-h-[60px]"
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={option.is_correct}
                            onChange={(e) => handleOptionChange(index, 'is_correct', e.target.checked)}
                            className="rounded"
                          />
                          正解
                        </label>
                        <div className="flex items-center gap-2 text-sm">
                          <span>部分点:</span>
                          <Input
                            type="number"
                            value={option.partial_score}
                            onChange={(e) => handleOptionChange(index, 'partial_score', parseInt(e.target.value) || 0)}
                            className="w-16"
                            min={0}
                            max={10}
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600"
                      onClick={() => removeOption(index)}
                      disabled={(formData.options?.length || 0) <= 2}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ヒント */}
          <div>
            <Label>ヒント</Label>
            <Textarea
              value={formData.hint || ''}
              onChange={(e) => setFormData((prev) => ({ ...prev, hint: e.target.value }))}
              placeholder="学習者がつまづいた時に表示するヒント"
              rows={2}
            />
          </div>

          {/* 模範解答 - 重要ポイント */}
          <div>
            <Label>模範解答 - 重要ポイント</Label>
            <Textarea
              value={formData.model_answer.essential_points?.join('\n') || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  model_answer: {
                    ...prev.model_answer,
                    essential_points: e.target.value.split('\n').filter((s) => s.trim()),
                  },
                }))
              }
              placeholder="各行に1つずつ重要ポイントを入力"
              rows={3}
            />
          </div>

          {/* 採点基準 */}
          <div>
            <Label>採点基準 (1-5点)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 mt-2">
              {[1, 2, 3, 4, 5].map((score) => (
                <div key={score} className="space-y-1">
                  <span className="text-sm font-medium">{score}点</span>
                  <Textarea
                    value={formData.model_answer.scoring_anchors?.[String(score)] || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        model_answer: {
                          ...prev.model_answer,
                          scoring_anchors: {
                            ...prev.model_answer.scoring_anchors,
                            [String(score)]: e.target.value,
                          },
                        },
                      }))
                    }
                    placeholder={`${score}点の基準`}
                    rows={3}
                    className="text-sm min-h-[80px]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 対象スキル軸 */}
          <div>
            <Label>対象スキル軸</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SKILL_AXES.map((skill) => (
                <Badge
                  key={skill.id}
                  variant={formData.target_skills.includes(skill.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => toggleSkill(skill.id)}
                >
                  {skill.name}
                  {formData.target_skills.includes(skill.id) && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
