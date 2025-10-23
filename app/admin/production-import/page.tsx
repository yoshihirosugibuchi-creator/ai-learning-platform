'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { 
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  AlertCircle,
  Database,
  RefreshCw,
  Package,
  RotateCcw
} from 'lucide-react'
import { useUserRole } from '@/hooks/useUserRole'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/hooks/use-toast'
import { ToastContainer } from '@/components/ui/toast'

// ======================================================================
// 型定義
// ======================================================================

interface ApprovedQuestion {
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
  ai_model?: string
  generated_at: string
  reviewed_at: string
  generator?: {
    display_name: string
  }
  reviewer?: {
    display_name: string
  }
  review_score?: number
}

interface SkippedQuestion {
  id: number
  question: string
}

interface ImportSummary {
  requested: number
  approved: number
  duplicates: number
  imported: number
  skipped: SkippedQuestion[]
}

interface ImportResult {
  batchId: string
  summary: ImportSummary
}

// ======================================================================
// メインコンポーネント
// ======================================================================

export default function ProductionImportPage() {
  const { isAdmin, loading: roleLoading } = useUserRole()
  const { user } = useAuth()
  const { toast, toasts, removeToast } = useToast()
  
  // State管理
  const [approvedQuestions, setApprovedQuestions] = useState<ApprovedQuestion[]>([])
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [skipDuplicateCheck, setSkipDuplicateCheck] = useState(false)
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [returningQuestions, setReturningQuestions] = useState<number[]>([])

  // ======================================================================
  // データ取得関数
  // ======================================================================

  const fetchApprovedQuestions = useCallback(async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/admin/review/import', {
        headers: {
          'Authorization': `Bearer ${(await (await import('@/lib/supabase')).supabase.auth.getSession()).data.session?.access_token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setApprovedQuestions(data.data || [])
        
        // 全て選択状態にする（デフォルト）
        setSelectedQuestions(data.data?.map((q: ApprovedQuestion) => q.id) || [])
      } else {
        console.error('Failed to fetch approved questions')
        toast({
          title: 'データ取得失敗',
          description: '承認済み問題の取得に失敗しました',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching approved questions:', error)
      toast({
        title: 'エラーが発生しました',
        description: '承認済み問題の取得中にエラーが発生しました',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]) // toastを依存配列から削除して無限ループを防ぐ

  // ======================================================================
  // 初期化・効果
  // ======================================================================

  useEffect(() => {
    if (user && isAdmin) {
      fetchApprovedQuestions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin]) // fetchApprovedQuestionsを依存配列から削除して無限ループを防ぐ

  // ======================================================================
  // ハンドラー関数
  // ======================================================================

  const handleSelectAll = () => {
    if (selectedQuestions.length === approvedQuestions.length) {
      setSelectedQuestions([])
    } else {
      setSelectedQuestions(approvedQuestions.map(q => q.id))
    }
  }

  const handleQuestionSelect = (questionId: number, checked: boolean) => {
    if (checked) {
      setSelectedQuestions(prev => [...prev, questionId])
    } else {
      setSelectedQuestions(prev => prev.filter(id => id !== questionId))
    }
  }

  const handleImportClick = () => {
    if (selectedQuestions.length === 0) {
      toast({
        title: '選択エラー',
        description: '取込対象の問題を選択してください',
        variant: 'destructive'
      })
      return
    }
    // 確認モーダルを表示
    setShowConfirmModal(true)
  }

  const handleImportConfirm = async () => {
    // モーダルを閉じる
    setShowConfirmModal(false)
    
    setImporting(true)
    try {
      const response = await fetch('/api/admin/review/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await (await import('@/lib/supabase')).supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          questionIds: selectedQuestions,
          skipDuplicateCheck
        })
      })

      const result = await response.json()

      if (response.ok) {
        setLastImportResult(result)
        toast({
          title: '本番取込完了！',
          description: `取込済み: ${result.summary.imported}問 / 重複スキップ: ${result.summary.duplicates}問 / バッチID: ${result.batchId}`
        })
        
        // 取込完了後、承認済み一覧を更新
        fetchApprovedQuestions()
        setSelectedQuestions([])
      } else {
        toast({
          title: '本番取込失敗',
          description: `取込に失敗しました: ${result.error}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'エラーが発生しました',
        description: `本番取込中にエラーが発生しました: ${error}`,
        variant: 'destructive'
      })
    } finally {
      setImporting(false)
    }
  }

  const handleReturnClick = () => {
    if (selectedQuestions.length === 0) {
      toast({
        title: '選択エラー',
        description: '差し戻し対象の問題を選択してください',
        variant: 'destructive'
      })
      return
    }
    setReturningQuestions(selectedQuestions)
    setReturnReason('')
    setShowReturnModal(true)
  }

  const handleReturnConfirm = async () => {
    if (!returnReason.trim()) {
      toast({
        title: '入力エラー',
        description: '差し戻し理由を入力してください',
        variant: 'destructive'
      })
      return
    }

    setShowReturnModal(false)
    
    try {
      const response = await fetch('/api/admin/review/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await (await import('@/lib/supabase')).supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          questionIds: returningQuestions,
          returnReason: returnReason.trim()
        })
      })

      if (response.ok) {
        await response.json()
        toast({
          title: '差し戻し完了',
          description: `${returningQuestions.length}問を差し戻しました`
        })
        
        // 差し戻し後、承認済み一覧を更新
        fetchApprovedQuestions()
        setSelectedQuestions([])
        setReturningQuestions([])
        setReturnReason('')
      } else {
        const error = await response.text()
        toast({
          title: '差し戻し失敗',
          description: `差し戻しに失敗しました: ${error}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'エラーが発生しました',
        description: `差し戻し中にエラーが発生しました: ${error}`,
        variant: 'destructive'
      })
    }
  }

  // ======================================================================
  // レンダリング関数
  // ======================================================================

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP')
  }

  const getCategoryColor = (categoryId: string) => {
    const colors = {
      'finance': 'bg-blue-100 text-blue-800',
      'strategy_management': 'bg-green-100 text-green-800',
      'marketing_sales': 'bg-purple-100 text-purple-800',
      'leadership_hr': 'bg-orange-100 text-orange-800',
      'project_operations': 'bg-cyan-100 text-cyan-800',
      'communication_presentation': 'bg-pink-100 text-pink-800'
    }
    return colors[categoryId as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getDifficultyColor = (difficulty: string) => {
    const colors = {
      '初級': 'bg-green-100 text-green-800',
      '中級': 'bg-yellow-100 text-yellow-800',
      '上級': 'bg-red-100 text-red-800'
    }
    return colors[difficulty as keyof typeof colors] || 'bg-gray-100 text-gray-800'
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
          <Upload className="mr-3 h-8 w-8 text-green-600" />
          クイズ本番取込
        </h1>
        <p className="text-muted-foreground mt-2">
          承認済みのクイズ問題を本番データベースに一括取込します
        </p>
      </div>

      {/* 統計情報 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">承認済み問題</p>
                <p className="text-2xl font-bold">{approvedQuestions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">選択中</p>
                <p className="text-2xl font-bold">{selectedQuestions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Database className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">取込準備完了</p>
                <p className="text-2xl font-bold text-purple-600">
                  {selectedQuestions.length > 0 ? 'Ready' : 'Waiting'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">最終更新</p>
                <p className="text-sm font-bold">
                  {approvedQuestions.length > 0 ? formatDate(approvedQuestions[0]?.reviewed_at).split(' ')[0] : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 取込設定 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>取込設定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="skipDuplicateCheck"
                checked={skipDuplicateCheck}
                onChange={(e) => setSkipDuplicateCheck(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="skipDuplicateCheck" className="text-sm font-medium">
                重複チェックをスキップ
              </label>
              <span className="text-xs text-muted-foreground">
                （既存の問題と重複していても強制的に取り込む）
              </span>
            </div>
            
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>注意:</strong> 本番取込は元に戻せません。慎重に確認してから実行してください。
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>

      {/* 一括操作 */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleSelectAll}
                disabled={loading}
              >
                {selectedQuestions.length === approvedQuestions.length ? '全選択解除' : '全選択'}
              </Button>
              <Button
                variant="outline"
                onClick={fetchApprovedQuestions}
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                更新
              </Button>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {selectedQuestions.length}問を選択中
              </span>
              <Button
                onClick={handleReturnClick}
                disabled={importing || selectedQuestions.length === 0}
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                差し戻し
              </Button>
              <Button
                onClick={handleImportClick}
                disabled={importing || selectedQuestions.length === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    取込中...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {selectedQuestions.length}問を本番DBに取込
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 前回の取込結果 */}
      {lastImportResult && (
        <Card className="mb-6 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-700">前回の取込結果</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">要求:</span> {lastImportResult.summary.requested}問
              </div>
              <div>
                <span className="font-medium">取込済み:</span> {lastImportResult.summary.imported}問
              </div>
              <div>
                <span className="font-medium">重複:</span> {lastImportResult.summary.duplicates}問
              </div>
              <div>
                <span className="font-medium">バッチID:</span> {lastImportResult.batchId}
              </div>
            </div>
            {lastImportResult.summary.skipped?.length > 0 && (
              <div className="mt-3">
                <details className="cursor-pointer">
                  <summary className="font-medium text-orange-700">
                    スキップされた問題 ({lastImportResult.summary.skipped.length}問)
                  </summary>
                  <div className="mt-2 space-y-1 text-sm">
                    {lastImportResult.summary.skipped.map((item: SkippedQuestion, index: number) => (
                      <div key={index} className="text-muted-foreground">
                        ID: {item.id} - {item.question}
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 問題一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>承認済み問題一覧</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : approvedQuestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              取込可能な承認済み問題はありません
            </div>
          ) : (
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {approvedQuestions.map((question) => (
                <div
                  key={question.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    selectedQuestions.includes(question.id) ? 'border-blue-300 bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.includes(question.id)}
                        onChange={(e) => handleQuestionSelect(question.id, e.target.checked)}
                        className="w-4 h-4"
                      />
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          ID: {question.id}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(question.category_id)}`}>
                          {question.category_id}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                      <div>承認: {formatDate(question.reviewed_at)}</div>
                      <div>レビュー者: {question.reviewer?.display_name || 'ID表示なし'}</div>
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
                      <div><strong>サブカテゴリー:</strong> {question.subcategory}</div>
                      <div><strong>制限時間:</strong> {question.time_limit}秒</div>
                      <div><strong>生成者:</strong> {question.generator?.display_name || 'ID表示なし'}</div>
                      <div><strong>生成日時:</strong> {formatDate(question.generated_at)}</div>
                      <div><strong>AIモデル:</strong> {question.ai_model || 'claude'}</div>
                      {question.review_score && (
                        <div><strong>レビュー評価:</strong> {question.review_score}/5</div>
                      )}
                      {question.tags && question.tags.length > 0 && (
                        <div><strong>タグ:</strong> {question.tags.join(', ')}</div>
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

      {/* 確認モーダル */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">本番データベースへの取り込み確認</h3>
              <div className="space-y-3">
                <p className="text-gray-700">
                  <span className="font-medium text-lg">{selectedQuestions.length}問</span>のクイズを本番データベースに取り込みます。
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-yellow-800">重要な注意事項:</p>
                      <ul className="list-disc list-inside mt-1 text-yellow-700 space-y-1">
                        <li>この操作は元に戻せません</li>
                        <li>取り込まれた問題は即座に本番環境に反映されます</li>
                        <li>重複チェック: {skipDuplicateCheck ? 'スキップ' : '有効'}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowConfirmModal(false)}
                disabled={importing}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleImportConfirm}
                disabled={importing}
                className="bg-green-600 hover:bg-green-700"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    取込中...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    取り込みを実行
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 差し戻し理由入力モーダル */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">問題の差し戻し</h3>
            <div className="space-y-4">
              <div>
                <p className="text-gray-700 mb-3">
                  選択された<span className="font-medium">{returningQuestions.length}問</span>を差し戻します。
                </p>
                <label className="text-sm font-medium block mb-2">差し戻し理由を入力してください *</label>
                <Textarea
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="例: 重複問題のため、問題文の修正が必要、カテゴリー分類が不適切など"
                  rows={4}
                  className="w-full"
                />
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mr-2 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-semibold text-orange-800">差し戻しについて:</p>
                    <ul className="list-disc list-inside mt-1 text-orange-700 space-y-1">
                      <li>問題のステータスが「差し戻し」に変更されます</li>
                      <li>レビュー画面で再度確認・修正が可能になります</li>
                      <li>理由は履歴として記録されます</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowReturnModal(false)
                  setReturnReason('')
                  setReturningQuestions([])
                }}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleReturnConfirm}
                disabled={!returnReason.trim()}
                className="bg-orange-600 hover:bg-orange-700"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                差し戻し実行
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