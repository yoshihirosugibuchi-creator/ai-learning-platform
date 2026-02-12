'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Edit3, 
  X,
  Check,
  AlertTriangle,
  Database,
  Loader2,
  RefreshCw,
  Search,
  Filter
} from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import { supabase } from '@/lib/supabase'
import type { QuizQuestion } from '@/lib/database-types-official'

type QuestionData = QuizQuestion

interface EditingState {
  questionId: number | null
  field: string | null
  value: string
}

interface StatsData {
  total: number
  withHints: number
  hintCoverage: {
    level1: number
    level2: number
    level3: number
  }
}

const difficultyMap = {
  'basic': '基本',
  'intermediate': '中級', 
  'advanced': '上級',
  'expert': 'エキスパート'
}

export default function QuestionMaintenancePage() {
  const { userRole, loading: roleLoading } = useUserRole()
  const isAuthorized = userRole?.role === 'admin' || userRole?.role === 'system_admin'
  const { toast } = useToast()
  
  const [questions, setQuestions] = useState<QuestionData[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all')
  const [editing, setEditing] = useState<EditingState>({ questionId: null, field: null, value: '' })
  const [saving, setSaving] = useState<Set<number>>(new Set())
  const [categories, setCategories] = useState<Array<{category_id: string, name: string}>>([])
  const [stats, setStats] = useState<StatsData | null>(null)

  // 問題一覧の取得
  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    try {
      // 認証トークンを取得
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      const response = await fetch('/api/admin/questions/maintenance', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) throw new Error('問題の取得に失敗しました')
      
      const data = await response.json()
      setQuestions(data.questions || [])
      setCategories(data.categories || [])
      setStats(data.stats || null)
      
      toast({
        title: '読み込み完了',
        description: `${data.questions?.length || 0}問の問題を読み込みました`
      })
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
    if (isAuthorized && !roleLoading) {
      fetchQuestions()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthorized, roleLoading])

  // 権限チェックはadmin/layout.tsxのPermissionGuardで実施済み

  // 編集開始
  const startEdit = (questionId: number, field: string, currentValue: string | null) => {
    setEditing({ questionId, field, value: currentValue || '' })
  }

  // 編集キャンセル
  const cancelEdit = () => {
    setEditing({ questionId: null, field: null, value: '' })
  }

  // フィールド保存
  const saveField = async () => {
    if (!editing.questionId || !editing.field) return

    setSaving(prev => new Set(prev).add(editing.questionId!))
    
    try {
      // 認証トークンを取得
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      const response = await fetch('/api/admin/questions/maintenance', {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          questionId: editing.questionId,
          updates: { [editing.field]: editing.value }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'フィールドの保存に失敗しました')
      }
      
      toast({
        title: '保存完了',
        description: `${getFieldLabel(editing.field)} を正常に更新しました`
      })
      
      // ローカル状態を更新
      setQuestions(prev => prev.map(q => 
        q.id === editing.questionId 
          ? { ...q, [editing.field!]: editing.value }
          : q
      ))
      
      // 編集状態をリセット
      cancelEdit()
      
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'フィールドの保存に失敗しました',
        variant: 'destructive'
      })
    } finally {
      setSaving(prev => {
        const newSet = new Set(prev)
        newSet.delete(editing.questionId!)
        return newSet
      })
    }
  }

  // 編集可能フィールドの定義
  const editableFields = [
    'explanation',
    'level1_hint', 
    'level2_hint',
    'level3_hint',
    'source',
    'related_topics',
    'time_limit'
  ]

  // 条件付き編集可能フィールド（誤字修正のみ）
  const conditionalEditableFields = [
    'question',
    'option1',
    'option2', 
    'option3',
    'option4'
  ]

  // フィールドラベル
  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      explanation: '解説',
      level1_hint: 'ヒント1',
      level2_hint: 'ヒント2', 
      level3_hint: 'ヒント3',
      source: '出典',
      related_topics: '関連トピック',
      time_limit: '制限時間',
      question: '問題文',
      option1: '選択肢1',
      option2: '選択肢2',
      option3: '選択肢3',
      option4: '選択肢4'
    }
    return labels[field] || field
  }

  // フィールド値の取得
  const getFieldValue = (question: QuestionData, field: string): string => {
    const value = question[field as keyof QuestionData]
    if (value === null || value === undefined) return ''
    if (Array.isArray(value)) return value.join(', ')
    return String(value)
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
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">クイズ問題メンテナンス</h1>
            <p className="text-muted-foreground">解説・ヒント・出典等の編集が可能です</p>
          </div>
        </div>
        <Button onClick={fetchQuestions} disabled={loading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {loading ? '読み込み中...' : '再読み込み'}
        </Button>
      </div>

      {/* 統計情報 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-muted-foreground">総問題数</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{filteredQuestions.length}</div>
              <div className="text-sm text-muted-foreground">現在表示中</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.withHints}</div>
              <div className="text-sm text-muted-foreground">ヒント完成済み</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.total - stats.withHints}
              </div>
              <div className="text-sm text-muted-foreground">ヒント未設定</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round((stats.withHints / stats.total) * 100)}%
              </div>
              <div className="text-sm text-muted-foreground">ヒント完成率</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 検索・フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            検索・フィルター
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="問題文または問題IDで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select 
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">全カテゴリー</option>
              {categories.map(cat => (
                <option key={cat.category_id} value={cat.category_id}>{cat.name}</option>
              ))}
            </select>
            <select 
              className="px-3 py-2 border border-input bg-background rounded-md text-sm"
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
        </CardContent>
      </Card>

      {/* 注意事項 */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>編集可能項目:</strong><br />
          🟢 <strong>自由編集可能:</strong> 解説、ヒント（1-3）、出典、関連トピック、制限時間<br />
          🟡 <strong>条件付き編集可能:</strong> 問題文、選択肢（1-4）- 誤字脱字修正のみ<br />
          🔴 <strong>編集不可:</strong> 正解、難易度、カテゴリー
        </AlertDescription>
      </Alert>

      {/* 問題一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            問題一覧
            <Badge variant="outline">{filteredQuestions.length}件</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">読み込み中...</p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>該当する問題が見つかりません</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[800px] overflow-y-auto">
              {filteredQuestions.map(question => (
                <Card key={question.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    {/* 問題ヘッダー */}
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline">ID: {question.id}</Badge>
                        <Badge>{difficultyMap[question.difficulty as keyof typeof difficultyMap] || question.difficulty}</Badge>
                        <Badge variant="secondary">
                          {categories.find(c => c.category_id === question.category_id)?.name || 'カテゴリー不明'}
                        </Badge>
                        {question.subcategory && (
                          <Badge variant="outline">{question.subcategory}</Badge>
                        )}
                      </div>
                      
                      {/* 問題文 */}
                      <div className="bg-blue-50 p-4 rounded-lg mb-4">
                        <h3 className="font-semibold text-blue-900 mb-2">問題文</h3>
                        <p className="text-blue-800">{question.question}</p>
                      </div>

                      {/* 選択肢 */}
                      <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <h3 className="font-semibold text-gray-900 mb-2">選択肢</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {[question.option1, question.option2, question.option3, question.option4].map((option, index) => (
                            <div key={index} className={`p-2 rounded ${question.correct_answer === index ? 'bg-green-100 border-2 border-green-500' : 'bg-white border'}`}>
                              <span className="font-medium">{index + 1}.</span> {option}
                              {question.correct_answer === index && (
                                <span className="ml-2 text-green-600 font-bold">✓ 正解</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 基本情報 */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">制限時間:</span> {question.time_limit || '未設定'}秒
                        </div>
                        <div>
                          <span className="font-medium">出典:</span> {question.source || '未設定'}
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">関連トピック:</span> {
                            Array.isArray(question.related_topics) 
                              ? question.related_topics.join(', ')
                              : typeof question.related_topics === 'string' 
                                ? question.related_topics 
                                : '未設定'
                          }
                        </div>
                      </div>
                    </div>

                    {/* 編集可能フィールド */}
                    <div className="space-y-6">
                      {/* 条件付き編集可能フィールド（誤字修正のみ） */}
                      <div>
                        <h4 className="text-sm font-semibold text-orange-600 mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
                          条件付き編集可能（誤字修正のみ）
                        </h4>
                        <div className="grid grid-cols-1 gap-4">
                          {conditionalEditableFields.map(field => (
                            <div key={field} className="space-y-2">
                              <label className="text-sm font-medium text-orange-600">{getFieldLabel(field)}</label>
                              {editing.questionId === question.id && editing.field === field ? (
                                <div className="space-y-2">
                                  <Textarea
                                    value={editing.value}
                                    onChange={(e) => setEditing(prev => ({ ...prev, value: e.target.value }))}
                                    className="min-h-[80px] border-orange-200 focus:border-orange-400"
                                    placeholder={`${getFieldLabel(field)}の誤字を修正...`}
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={saveField}
                                      disabled={saving.has(question.id)}
                                      className="bg-orange-600 hover:bg-orange-700"
                                    >
                                      {saving.has(question.id) ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                      ) : (
                                        <Check className="h-4 w-4 mr-2" />
                                      )}
                                      保存
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={cancelEdit}
                                      disabled={saving.has(question.id)}
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      キャンセル
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div 
                                  className="min-h-[60px] p-3 border border-orange-200 rounded-md cursor-pointer hover:bg-orange-50 transition-colors"
                                  onClick={() => startEdit(question.id, field, getFieldValue(question, field))}
                                >
                                  {getFieldValue(question, field) || (
                                    <span className="text-muted-foreground italic">クリックして誤字修正</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 通常の編集可能フィールド */}
                      <div>
                        <h4 className="text-sm font-semibold text-blue-600 mb-3 flex items-center gap-2">
                          <Edit3 className="h-4 w-4" />
                          編集可能フィールド
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {editableFields.map(field => (
                            <div key={field} className="space-y-2">
                              <label className="text-sm font-medium">{getFieldLabel(field)}</label>
                              {editing.questionId === question.id && editing.field === field ? (
                            <div className="space-y-2">
                              {field.includes('hint') || field === 'explanation' ? (
                                <Textarea
                                  value={editing.value}
                                  onChange={(e) => setEditing(prev => ({ ...prev, value: e.target.value }))}
                                  className="min-h-[100px]"
                                  placeholder={`${getFieldLabel(field)}を入力...`}
                                />
                              ) : (
                                <Input
                                  value={editing.value}
                                  onChange={(e) => setEditing(prev => ({ ...prev, value: e.target.value }))}
                                  placeholder={`${getFieldLabel(field)}を入力...`}
                                />
                              )}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={saveField}
                                  disabled={saving.has(question.id)}
                                >
                                  {saving.has(question.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : (
                                    <Check className="h-4 w-4 mr-2" />
                                  )}
                                  保存
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEdit}
                                  disabled={saving.has(question.id)}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  キャンセル
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              className="min-h-[50px] p-3 border rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
                              onClick={() => startEdit(question.id, field, getFieldValue(question, field))}
                            >
                              {getFieldValue(question, field) || (
                                <span className="text-muted-foreground italic">クリックして編集</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}