'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Search, 
  Edit3, 
  Lightbulb, 
  Save,
  RotateCcw,
  AlertTriangle,
  Shield,
  Sparkles,
  Database
} from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import type { QuizQuestion } from '@/lib/database-types-official'

interface QuestionWithHints extends QuizQuestion {
  hints?: {
    id: string
    level1_hint?: string | null
    level2_hint?: string | null
    level3_hint?: string | null
  }
}

interface HintGenerationResult {
  success: boolean
  generated_hint?: string
  error?: string
  quality_score?: number
  ai_model?: string
}

export default function QuestionMaintenancePage() {
  const { isSystemAdmin, loading: roleLoading } = useUserRole()
  const { toast } = useToast()
  
  const [questions, setQuestions] = useState<QuestionWithHints[]>([])
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionWithHints | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const [editingHints, setEditingHints] = useState({
    level1: '',
    level2: '',
    level3: ''
  })
  const [generatingHints, setGeneratingHints] = useState<Set<number>>(new Set())
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([])

  // 問題一覧の取得
  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/questions/maintenance')
      if (!response.ok) throw new Error('問題の取得に失敗しました')
      
      const data = await response.json()
      setQuestions(data.questions)
      setCategories(data.categories)
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '問題の取得に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    if (isSystemAdmin && !roleLoading) {
      fetchQuestions()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSystemAdmin, roleLoading])

  // システム管理者権限チェック
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">権限確認中...</p>
        </div>
      </div>
    )
  }

  if (!isSystemAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">アクセス権限不足</h2>
              <p className="text-muted-foreground">
                この機能を使用するにはシステム管理者権限が必要です。
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // AI ヒント生成
  const generateHint = async (questionId: number, level: 1 | 2 | 3) => {
    setGeneratingHints(prev => new Set(prev).add(questionId))
    
    try {
      const response = await fetch('/api/admin/questions/generate-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: questionId,
          level,
          current_hint: level === 1 ? editingHints.level1 : 
                       level === 2 ? editingHints.level2 : editingHints.level3
        })
      })

      if (!response.ok) throw new Error('ヒント生成に失敗しました')
      
      const result: HintGenerationResult = await response.json()
      
      if (result.success && result.generated_hint) {
        setEditingHints(prev => ({
          ...prev,
          [`level${level}`]: result.generated_hint!
        }))
        
        toast({
          title: 'ヒント生成完了',
          description: `Level ${level} ヒントを生成しました (品質スコア: ${result.quality_score || 'N/A'})`
        })
      } else {
        throw new Error(result.error || 'ヒント生成に失敗しました')
      }
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'ヒント生成に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setGeneratingHints(prev => {
        const newSet = new Set(prev)
        newSet.delete(questionId)
        return newSet
      })
    }
  }

  // ヒント保存
  const saveHints = async () => {
    if (!selectedQuestion) return

    setLoading(true)
    try {
      const response = await fetch('/api/admin/questions/save-hints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_id: selectedQuestion.id,
          level1_hint: editingHints.level1 || null,
          level2_hint: editingHints.level2 || null,
          level3_hint: editingHints.level3 || null
        })
      })

      if (!response.ok) throw new Error('ヒントの保存に失敗しました')
      
      toast({
        title: '保存完了',
        description: 'ヒントを正常に保存しました'
      })
      
      // 問題一覧を更新
      await fetchQuestions()
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'ヒントの保存に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // 問題選択時の処理
  const selectQuestion = (question: QuestionWithHints) => {
    setSelectedQuestion(question)
    setEditingHints({
      level1: question.hints?.level1_hint || '',
      level2: question.hints?.level2_hint || '',
      level3: question.hints?.level3_hint || ''
    })
  }

  // フィルタリング
  const filteredQuestions = questions.filter(q => {
    const matchesSearch = q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.id.toString().includes(searchTerm)
    const matchesCategory = filterCategory === 'all' || q.category_id === filterCategory
    const matchesDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty
    
    return matchesSearch && matchesCategory && matchesDifficulty
  })


  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Database className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">クイズ問題メンテナンス</h1>
          <p className="text-muted-foreground">クイズ問題の編集とAIヒント生成</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 問題一覧パネル */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              問題一覧
              <Badge variant="outline">{filteredQuestions.length}件</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 検索・フィルター */}
            <div className="space-y-3">
              <Input
                placeholder="問題文または問題IDで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="flex gap-2">
                <select 
                  className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="all">全カテゴリー</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <select 
                  className="flex-1 px-3 py-2 border border-input bg-background rounded-md text-sm"
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                >
                  <option value="all">全難易度</option>
                  <option value="basic">基本</option>
                  <option value="intermediate">中級</option>
                  <option value="advanced">上級</option>
                  <option value="expert">エキスパート</option>
                </select>
              </div>
            </div>

            {/* 問題リスト */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">読み込み中...</p>
                </div>
              ) : filteredQuestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p>該当する問題が見つかりません</p>
                </div>
              ) : (
                filteredQuestions.map(question => (
                  <Card 
                    key={question.id}
                    className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedQuestion?.id === question.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => selectQuestion(question)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">ID: {question.id}</Badge>
                            <Badge variant={question.difficulty === 'basic' ? 'default' : 
                                          question.difficulty === 'intermediate' ? 'secondary' :
                                          question.difficulty === 'advanced' ? 'destructive' : 'outline'}>
                              {question.difficulty}
                            </Badge>
                          </div>
                          <p className="text-sm line-clamp-2">{question.question}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {question.hints?.level1_hint && <Lightbulb className="h-4 w-4 text-yellow-500" />}
                          {question.hints?.level2_hint && <Lightbulb className="h-4 w-4 text-orange-500" />}
                          {question.hints?.level3_hint && <Lightbulb className="h-4 w-4 text-red-500" />}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* ヒント編集パネル */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5" />
              ヒント編集
              {selectedQuestion && (
                <Badge variant="outline">ID: {selectedQuestion.id}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedQuestion ? (
              <>
                {/* 問題文表示 */}
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">問題文</h3>
                  <p className="text-sm">{selectedQuestion.question}</p>
                </div>

                {/* 選択肢表示 */}
                <div className="p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2">選択肢</h3>
                  <div className="space-y-1 text-sm">
                    <div className={`p-2 rounded ${selectedQuestion.correct_answer === 1 ? 'bg-green-100 text-green-800' : ''}`}>
                      A) {selectedQuestion.option1}
                    </div>
                    <div className={`p-2 rounded ${selectedQuestion.correct_answer === 2 ? 'bg-green-100 text-green-800' : ''}`}>
                      B) {selectedQuestion.option2}
                    </div>
                    <div className={`p-2 rounded ${selectedQuestion.correct_answer === 3 ? 'bg-green-100 text-green-800' : ''}`}>
                      C) {selectedQuestion.option3}
                    </div>
                    <div className={`p-2 rounded ${selectedQuestion.correct_answer === 4 ? 'bg-green-100 text-green-800' : ''}`}>
                      D) {selectedQuestion.option4}
                    </div>
                  </div>
                </div>

                {/* ヒント編集フォーム */}
                <div className="space-y-6">
                  {/* Level 1 ヒント */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Level 1 ヒント (軽いヒント)</label>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={generatingHints.has(selectedQuestion.id)}
                        onClick={() => generateHint(selectedQuestion.id, 1)}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        AI生成
                      </Button>
                    </div>
                    <Textarea
                      placeholder="問題のテーマや方向性を示すヒント..."
                      value={editingHints.level1}
                      onChange={(e) => setEditingHints(prev => ({...prev, level1: e.target.value}))}
                      rows={3}
                    />
                  </div>

                  {/* Level 2 ヒント */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Level 2 ヒント (中程度のヒント)</label>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={generatingHints.has(selectedQuestion.id)}
                        onClick={() => generateHint(selectedQuestion.id, 2)}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        AI生成
                      </Button>
                    </div>
                    <Textarea
                      placeholder="解法のアプローチや重要なポイントを示すヒント..."
                      value={editingHints.level2}
                      onChange={(e) => setEditingHints(prev => ({...prev, level2: e.target.value}))}
                      rows={3}
                    />
                  </div>

                  {/* Level 3 ヒント */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Level 3 ヒント (決定的なヒント)</label>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={generatingHints.has(selectedQuestion.id)}
                        onClick={() => generateHint(selectedQuestion.id, 3)}
                      >
                        <Sparkles className="h-4 w-4 mr-1" />
                        AI生成
                      </Button>
                    </div>
                    <Textarea
                      placeholder="正解に導く決定的なヒント（正解は明示しない）..."
                      value={editingHints.level3}
                      onChange={(e) => setEditingHints(prev => ({...prev, level3: e.target.value}))}
                      rows={3}
                    />
                  </div>
                </div>

                {/* 保存・リセットボタン */}
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={saveHints}
                    disabled={loading}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    ヒント保存
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => selectQuestion(selectedQuestion)}
                    disabled={loading}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    リセット
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>左側から問題を選択してください</p>
                <p className="text-sm">選択した問題のヒントを編集できます</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ステータス表示 */}
      {generatingHints.size > 0 && (
        <Alert>
          <Sparkles className="h-4 w-4" />
          <AlertDescription>
            AIヒント生成中... ({generatingHints.size}件)
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}