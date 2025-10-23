'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  ClipboardCheck,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  AlertTriangle,
  CheckSquare,
  Square
} from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/hooks/use-toast'
import { ToastContainer } from '@/components/ui/toast'
import type { Json } from '@/lib/database-types-official'

// ======================================================================
// 型定義
// ======================================================================

interface ReviewQuestion {
  id: number
  question: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: number
  explanation: string
  category_id: string
  subcategory: string
  subcategory_id: string
  difficulty: string
  time_limit: number
  tags: string[]
  source: string
  status: 'pending' | 'approved' | 'rejected' | 'editing'
  priority: number
  ai_prompt: string
  ai_model: string
  generation_params: Json | null
  generated_at: string
  generated_by: string
  reviewed_at?: string
  reviewed_by?: string
  review_notes?: string
  review_score?: number
  imported_at?: string
  generator?: {
    id: string
    display_name: string
    username: string
  }
  reviewer?: {
    id: string
    display_name: string
    username: string
  }
}

interface Filters {
  status: string
  category: string
  difficulty: string
  search: string
  dateFrom: string
  dateTo: string
}

// ======================================================================
// メインコンポーネント
// ======================================================================

export default function ReviewManagementPage() {
  const { isAdmin, isSystemAdmin, loading: roleLoading } = useUserRole()
  const { user } = useAuth()
  const { toast, toasts, removeToast } = useToast()
  
  // State管理
  const [questions, setQuestions] = useState<ReviewQuestion[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([])
  const [editingQuestion, setEditingQuestion] = useState<ReviewQuestion | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingQuestionId, setDeletingQuestionId] = useState<number | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    status: '',
    category: '',
    difficulty: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [categories, setCategories] = useState<{category_id: string, name: string}[]>([])
  const [skillLevels, setSkillLevels] = useState<{id: string, name: string}[]>([])

  // ======================================================================
  // データ取得関数
  // ======================================================================

  const fetchQuestions = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const queryParams = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.status && { status: filters.status }),
        ...(filters.category && { category: filters.category }),
        ...(filters.difficulty && { difficulty: filters.difficulty })
      })

      const response = await fetch(`/api/admin/review?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${(await (await import('@/lib/supabase')).supabase.auth.getSession()).data.session?.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setQuestions(data.data || [])
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: data.pagination?.totalPages || 0
        }))
      } else {
        const errorText = await response.text()
        console.error('Failed to fetch questions:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        })
      }
    } catch (error) {
      console.error('Error fetching questions:', error)
    } finally {
      setLoading(false)
    }
  }, [user, pagination.page, pagination.limit, filters])

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (error) {
      console.error('Error fetching categories:', error)
    }
  }, [])

  const fetchSkillLevels = useCallback(async () => {
    try {
      const response = await fetch('/api/skill-levels')
      if (response.ok) {
        const data = await response.json()
        setSkillLevels(data.skill_levels || [])
      }
    } catch (error) {
      console.error('Error fetching skill levels:', error)
    }
  }, [])

  // ======================================================================
  // 初期化・効果
  // ======================================================================

  useEffect(() => {
    if (user && isAdmin) {
      fetchCategories()
      fetchSkillLevels()
    }
  }, [user, isAdmin, fetchCategories, fetchSkillLevels])

  // fetchQuestions は pagination と filters の変更で実行
  useEffect(() => {
    if (user && isAdmin) {
      fetchQuestions()
    }
  }, [user, isAdmin, fetchQuestions])

  // ======================================================================
  // ハンドラー関数
  // ======================================================================

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // ページリセット
  }

  const handleBulkStatusChange = async (status: 'approved' | 'rejected', reviewNotes?: string) => {
    if (selectedQuestions.length === 0) return

    try {
      const response = await fetch('/api/admin/review/bulk-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await (await import('@/lib/supabase')).supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          questionIds: selectedQuestions,
          status,
          reviewNotes
        })
      })

      if (response.ok) {
        toast({
          title: '一括操作完了',
          description: `${selectedQuestions.length}問を${status === 'approved' ? '承認' : '却下'}しました`
        })
        setSelectedQuestions([])
        fetchQuestions()
      } else {
        const error = await response.text()
        toast({
          title: '一括操作失敗',
          description: `操作に失敗しました: ${error}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'エラーが発生しました',
        description: `一括操作中にエラーが発生しました: ${error}`,
        variant: 'destructive'
      })
    }
  }

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) return

    try {
      const response = await fetch('/api/admin/review/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await (await import('@/lib/supabase')).supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          questionIds: selectedQuestions
        })
      })

      if (response.ok) {
        toast({
          title: '一括削除完了',
          description: `${selectedQuestions.length}問を削除しました`
        })
        setSelectedQuestions([])
        fetchQuestions()
      } else {
        const error = await response.text()
        toast({
          title: '削除失敗',
          description: `削除に失敗しました: ${error}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'エラーが発生しました',
        description: `削除中にエラーが発生しました: ${error}`,
        variant: 'destructive'
      })
    }
  }

  const handleEditQuestion = (question: ReviewQuestion) => {
    setEditingQuestion({ ...question })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!editingQuestion) return

    try {
      const response = await fetch('/api/admin/review', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await (await import('@/lib/supabase')).supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          id: editingQuestion.id,
          question: editingQuestion.question,
          option_a: editingQuestion.option_a,
          option_b: editingQuestion.option_b,
          option_c: editingQuestion.option_c,
          option_d: editingQuestion.option_d,
          correct_answer: editingQuestion.correct_answer,
          explanation: editingQuestion.explanation,
          difficulty: editingQuestion.difficulty,
          time_limit: editingQuestion.time_limit,
          ai_model: editingQuestion.ai_model,
          review_notes: editingQuestion.review_notes,
          status: 'editing' // 編集時は自動的に「編集中」ステータスに変更
        })
      })

      if (response.ok) {
        toast({
          title: '問題更新完了',
          description: '問題を更新しました（ステータス: 編集中）'
        })
        setShowEditModal(false)
        setEditingQuestion(null)
        fetchQuestions()
      } else {
        const error = await response.text()
        toast({
          title: '更新失敗',
          description: `更新に失敗しました: ${error}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'エラーが発生しました',
        description: `問題更新中にエラーが発生しました: ${error}`,
        variant: 'destructive'
      })
    }
  }

  const handleDeleteClick = (questionId: number) => {
    setDeletingQuestionId(questionId)
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingQuestionId) return
    
    setShowDeleteConfirm(false)
    
    try {
      const response = await fetch(`/api/admin/review?id=${deletingQuestionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(await (await import('@/lib/supabase')).supabase.auth.getSession()).data.session?.access_token}`
        }
      })

      if (response.ok) {
        toast({
          title: '問題削除完了',
          description: '問題を削除しました'
        })
        fetchQuestions()
      } else {
        const error = await response.text()
        toast({
          title: '削除失敗',
          description: `削除に失敗しました: ${error}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'エラーが発生しました',
        description: `問題削除中にエラーが発生しました: ${error}`,
        variant: 'destructive'
      })
    } finally {
      setDeletingQuestionId(null)
    }
  }

  const handleRejectConfirm = () => {
    const finalReason = rejectReason.trim() || '一括却下処理'
    setShowRejectModal(false)
    handleBulkStatusChange('rejected', finalReason)
  }

  // 全選択・全選択解除関数
  const selectAllQuestions = () => {
    setSelectedQuestions(questions.map(q => q.id))
  }

  const deselectAllQuestions = () => {
    setSelectedQuestions([])
  }

  // ======================================================================
  // レンダリング関数
  // ======================================================================

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      editing: 'bg-blue-100 text-blue-800 border-blue-200'
    }
    const labels = {
      pending: 'レビュー待ち',
      approved: '承認済み',
      rejected: '却下',
      editing: '編集中'
    }
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP')
  }

  // ======================================================================
  // 認証・権限チェック
  // ======================================================================

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            この機能は管理者のみ利用可能です。
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // ======================================================================
  // メインレンダリング
  // ======================================================================

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* ヘッダー */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center">
          <ClipboardCheck className="mr-3 h-8 w-8 text-blue-600" />
          クイズレビュー管理
        </h1>
        <p className="text-muted-foreground mt-2">
          AI生成されたクイズ問題のレビュー・承認・編集を行います
        </p>
      </div>

      {/* フィルター */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            フィルター・検索
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">ステータス</label>
              <select
                className="w-full p-2 border rounded"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">すべて</option>
                <option value="pending">レビュー待ち</option>
                <option value="editing">編集中</option>
                <option value="approved">承認済み</option>
                <option value="rejected">却下</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">カテゴリー</label>
              <select
                className="w-full p-2 border rounded"
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">すべて</option>
                {categories.map(cat => (
                  <option key={cat.category_id} value={cat.category_id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">難易度</label>
              <select
                className="w-full p-2 border rounded"
                value={filters.difficulty}
                onChange={(e) => handleFilterChange('difficulty', e.target.value)}
              >
                <option value="">すべて</option>
                {skillLevels.map(level => (
                  <option key={level.id} value={level.id}>
                    {level.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">検索</label>
              <Input
                placeholder="問題文で検索..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={fetchQuestions} disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              検索
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  status: '',
                  category: '',
                  difficulty: '',
                  search: '',
                  dateFrom: '',
                  dateTo: ''
                })
                setPagination(prev => ({ ...prev, page: 1 }))
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              リセット
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 一括操作 */}
      {selectedQuestions.length > 0 && (
        <Card className="mb-6 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {selectedQuestions.length}問を選択中
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleBulkStatusChange('approved')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  一括承認
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setRejectReason('')
                    setShowRejectModal(true)
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  一括却下
                </Button>
                {isSystemAdmin && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    className="bg-red-700 hover:bg-red-800"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    一括削除
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedQuestions([])}
                >
                  選択解除
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 問題一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>問題一覧 ({pagination.total}件)</span>
            <div className="flex items-center gap-2">
              {questions.length > 0 && (
                <div className="flex items-center gap-2 mr-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={selectAllQuestions}
                    disabled={questions.length === 0 || selectedQuestions.length === questions.length}
                  >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    全選択
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={deselectAllQuestions}
                    disabled={selectedQuestions.length === 0}
                  >
                    <Square className="h-4 w-4 mr-1" />
                    全解除
                  </Button>
                </div>
              )}
              <span className="text-sm text-muted-foreground">
                ページ {pagination.page} / {pagination.totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                >
                  前
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                >
                  次
                </Button>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              問題が見つかりませんでした
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((question) => (
                <div key={question.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.includes(question.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedQuestions(prev => [...prev, question.id])
                          } else {
                            setSelectedQuestions(prev => prev.filter(id => id !== question.id))
                          }
                        }}
                        className="w-4 h-4"
                      />
                      <span className="font-medium text-sm text-muted-foreground">
                        ID: {question.id}
                      </span>
                      {getStatusBadge(question.status)}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditQuestion(question)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {question.status === 'rejected' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteClick(question.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">{question.question}</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center">
                          <span className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center mr-2 ${question.correct_answer === 0 ? 'bg-green-600' : 'bg-gray-400'}`}>
                            A
                          </span>
                          {question.option_a}
                        </div>
                        <div className="flex items-center">
                          <span className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center mr-2 ${question.correct_answer === 1 ? 'bg-green-600' : 'bg-gray-400'}`}>
                            B
                          </span>
                          {question.option_b}
                        </div>
                        <div className="flex items-center">
                          <span className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center mr-2 ${question.correct_answer === 2 ? 'bg-green-600' : 'bg-gray-400'}`}>
                            C
                          </span>
                          {question.option_c}
                        </div>
                        <div className="flex items-center">
                          <span className={`w-6 h-6 rounded-full text-white text-xs flex items-center justify-center mr-2 ${question.correct_answer === 3 ? 'bg-green-600' : 'bg-gray-400'}`}>
                            D
                          </span>
                          {question.option_d}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div><strong>カテゴリー:</strong> {question.category_id}</div>
                      <div><strong>サブカテゴリー:</strong> {question.subcategory}</div>
                      <div><strong>難易度:</strong> {question.difficulty}</div>
                      <div><strong>制限時間:</strong> {question.time_limit}秒</div>
                      <div><strong>生成者:</strong> {question.generator?.display_name || question.generator?.username || question.generated_by}</div>
                      <div><strong>生成日時:</strong> {formatDate(question.generated_at)}</div>
                      <div><strong>AIモデル:</strong> {question.ai_model || 'claude'}</div>
                      {question.reviewer && (
                        <div><strong>レビュー者:</strong> {question.reviewer.display_name || question.reviewer.username || question.reviewed_by}</div>
                      )}
                      {question.review_notes && (
                        <div><strong>レビューメモ:</strong> {question.review_notes}</div>
                      )}
                    </div>
                  </div>

                  {question.explanation && (
                    <div className="mt-3 p-3 bg-gray-50 rounded">
                      <strong className="text-sm">解説:</strong>
                      <p className="text-sm mt-1">{question.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 編集モーダル */}
      {showEditModal && editingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">問題編集</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">問題文</label>
                <Textarea
                  value={editingQuestion.question}
                  onChange={(e) => setEditingQuestion(prev => prev ? { ...prev, question: e.target.value } : null)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm font-medium block mb-1">選択肢A</label>
                  <Input
                    value={editingQuestion.option_a}
                    onChange={(e) => setEditingQuestion(prev => prev ? { ...prev, option_a: e.target.value } : null)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">選択肢B</label>
                  <Input
                    value={editingQuestion.option_b}
                    onChange={(e) => setEditingQuestion(prev => prev ? { ...prev, option_b: e.target.value } : null)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">選択肢C</label>
                  <Input
                    value={editingQuestion.option_c}
                    onChange={(e) => setEditingQuestion(prev => prev ? { ...prev, option_c: e.target.value } : null)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">選択肢D</label>
                  <Input
                    value={editingQuestion.option_d}
                    onChange={(e) => setEditingQuestion(prev => prev ? { ...prev, option_d: e.target.value } : null)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">正解（0:A, 1:B, 2:C, 3:D）</label>
                <select
                  className="w-full p-2 border rounded"
                  value={editingQuestion.correct_answer}
                  onChange={(e) => setEditingQuestion(prev => prev ? { ...prev, correct_answer: parseInt(e.target.value) } : null)}
                >
                  <option value={0}>A</option>
                  <option value={1}>B</option>
                  <option value={2}>C</option>
                  <option value={3}>D</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">解説</label>
                <Textarea
                  value={editingQuestion.explanation}
                  onChange={(e) => setEditingQuestion(prev => prev ? { ...prev, explanation: e.target.value } : null)}
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">AIモデル</label>
                <select
                  className="w-full p-2 border rounded"
                  value={editingQuestion.ai_model || 'claude'}
                  onChange={(e) => setEditingQuestion(prev => prev ? { ...prev, ai_model: e.target.value } : null)}
                >
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="chatgpt">ChatGPT (OpenAI)</option>
                  <option value="gemini">Gemini (Google)</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">レビューメモ</label>
                <Textarea
                  value={editingQuestion.review_notes || ''}
                  onChange={(e) => setEditingQuestion(prev => prev ? { ...prev, review_notes: e.target.value } : null)}
                  rows={2}
                  placeholder="編集内容や注意点など..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditModal(false)
                  setEditingQuestion(null)
                }}
              >
                キャンセル
              </Button>
              <Button onClick={handleSaveEdit}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 削除確認モーダル */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">問題の削除</h3>
            <div className="space-y-3">
              <p className="text-gray-700">
                この問題を削除しますか？
              </p>
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-red-800">注意:</p>
                    <p className="text-red-700">この操作は元に戻せません。</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeletingQuestionId(null)
                }}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
              >
                削除する
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 却下理由入力モーダル */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">一括却下理由</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">却下理由を入力してください</label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="却下理由（空白の場合は「一括却下処理」が設定されます）"
                  rows={3}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                選択中の{selectedQuestions.length}問がすべて却下されます。
              </p>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                }}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={handleRejectConfirm}
              >
                却下する
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 一括削除確認モーダル */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">一括削除の確認</h3>
            <div className="space-y-3">
              <p className="text-gray-700">
                選択された{selectedQuestions.length}問を完全に削除しますか？
              </p>
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-red-800">警告:</p>
                    <p className="text-red-700">この操作は元に戻せません。</p>
                    <p className="text-red-700">システム管理者のみ実行可能です。</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowBulkDeleteConfirm(false)}
              >
                キャンセル
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setShowBulkDeleteConfirm(false)
                  handleBulkDelete()
                }}
              >
                削除する
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* トースト表示 */}
      <ToastContainer 
        toasts={toasts} 
        onRemoveToast={removeToast} 
      />
    </div>
  )
}