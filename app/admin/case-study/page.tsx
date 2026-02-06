'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Briefcase,
  Plus,
  Search,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Star,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Link as LinkIcon,
  Bot,
  ScrollText,
  Sparkles,
  Settings,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// 型定義
interface CaseStudyProblem {
  id: string
  title: string
  difficulty: string
  status: string
  industry: string | null
  scenario_type: string | null
  estimated_minutes: number
  step_count: number
  featured_date: string | null
  created_at: string
  updated_at: string
  case_study_steps: { count: number }[] | null
}

interface Pagination {
  page: number
  limit: number
  total: number
  total_pages: number
}

interface AISettingsData {
  default_provider: string
  providers: Array<{ name: string; available: boolean }>
}

interface ThinkingLog {
  id: string
  session_id: string
  step_number: number
  action_type: string
  action_data: Record<string, unknown> | null
  timestamp: string
  time_since_step_start_ms: number | null
}

interface GenerationLog {
  id: string
  draft_title: string | null
  category_id: string | null
  category_name: string | null
  subcategory_id: string | null
  difficulty: string | null
  industry_id: string | null
  industry_name: string | null
  ai_model: string | null
  current_step: number
  status: string
  problem_id: string | null
  created_at: string
  updated_at: string
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: '下書き', color: 'bg-gray-100 text-gray-800' },
  review: { label: 'レビュー済', color: 'bg-yellow-100 text-yellow-800' },
  active: { label: '公開中', color: 'bg-green-100 text-green-800' },
  archived: { label: 'アーカイブ', color: 'bg-red-100 text-red-800' },
}

// ステータス遷移ルール（APIと同期）
const allowedTransitions: Record<string, string[]> = {
  draft: ['review', 'archived'],
  review: ['draft', 'active', 'archived'],
  active: ['archived'],
  archived: ['draft'],
}

const difficultyConfig: Record<string, { label: string; color: string }> = {
  basic: { label: '初級', color: 'bg-blue-100 text-blue-800' },
  intermediate: { label: '中級', color: 'bg-purple-100 text-purple-800' },
  advanced: { label: '上級', color: 'bg-orange-100 text-orange-800' },
  expert: { label: 'エキスパート', color: 'bg-red-100 text-red-800' },
}

export default function CaseStudyAdminPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState('problems')

  // 問題一覧state
  const [problems, setProblems] = useState<CaseStudyProblem[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, total_pages: 0 })
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all')

  // AI設定state
  const [aiSettings, setAiSettings] = useState<AISettingsData | null>(null)
  const [aiSettingsLoading, setAiSettingsLoading] = useState(false)
  const [aiSaving, setAiSaving] = useState(false)

  // 思考ログstate
  const [thinkingLogs, setThinkingLogs] = useState<ThinkingLog[]>([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsPagination, setLogsPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, total_pages: 0 })
  const [logsSessionFilter, setLogsSessionFilter] = useState('')

  // 生成下書きstate
  const [generationLogs, setGenerationLogs] = useState<GenerationLog[]>([])
  const [generationLogsLoading, setGenerationLogsLoading] = useState(false)

  // API認証ヘッダー取得
  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      return { 'Authorization': `Bearer ${session.access_token}` }
    }
    // 開発環境フォールバック
    if (process.env.NODE_ENV === 'development') {
      return {
        'x-test-user-id': '82413077-a06d-4d9c-82bb-6fdb6a6b8e13',
        'x-test-role': 'admin'
      }
    }
    return {}
  }, [])

  // 問題一覧取得
  const fetchProblems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', pagination.page.toString())
      params.set('limit', '20')
      if (searchQuery) params.set('search', searchQuery)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (difficultyFilter !== 'all') params.set('difficulty', difficultyFilter)

      const authHeaders = await getAuthHeaders()
      const res = await fetch(`/api/admin/case-study/problems?${params.toString()}`, {
        headers: authHeaders
      })
      const data = await res.json()

      if (data.success) {
        setProblems(data.problems)
        setPagination(data.pagination)
      } else {
        toast({ title: 'エラー', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'エラー', description: '問題一覧の取得に失敗しました', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [pagination.page, searchQuery, statusFilter, difficultyFilter, getAuthHeaders, toast])

  // AI設定取得
  const fetchAISettings = useCallback(async () => {
    setAiSettingsLoading(true)
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/admin/case-study/ai-settings', { headers: authHeaders })
      const data = await res.json()
      if (data.success) {
        setAiSettings(data)
      }
    } catch {
      toast({ title: 'エラー', description: 'AI設定の取得に失敗しました', variant: 'destructive' })
    } finally {
      setAiSettingsLoading(false)
    }
  }, [getAuthHeaders, toast])

  // AI設定保存
  const saveAIProvider = async (providerName: string) => {
    setAiSaving(true)
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/admin/case-study/ai-settings', {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_provider: providerName })
      })
      const data = await res.json()
      if (data.success) {
        setAiSettings(prev => prev ? { ...prev, default_provider: providerName } : null)
        toast({ title: '成功', description: `デフォルトプロバイダーを${providerName}に変更しました` })
      } else {
        toast({ title: 'エラー', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'エラー', description: '設定の保存に失敗しました', variant: 'destructive' })
    } finally {
      setAiSaving(false)
    }
  }

  // 思考ログ取得
  const fetchThinkingLogs = useCallback(async () => {
    setLogsLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', logsPagination.page.toString())
      params.set('limit', '50')
      if (logsSessionFilter) params.set('session_id', logsSessionFilter)

      const authHeaders = await getAuthHeaders()
      const res = await fetch(`/api/admin/case-study/thinking-logs?${params.toString()}`, { headers: authHeaders })
      const data = await res.json()
      if (data.success) {
        setThinkingLogs(data.logs)
        setLogsPagination(data.pagination)
      }
    } catch {
      toast({ title: 'エラー', description: '思考ログの取得に失敗しました', variant: 'destructive' })
    } finally {
      setLogsLoading(false)
    }
  }, [logsPagination.page, logsSessionFilter, getAuthHeaders, toast])

  // 生成下書き取得
  const fetchGenerationLogs = useCallback(async () => {
    setGenerationLogsLoading(true)
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/admin/case-study/generation-logs?status=draft', { headers: authHeaders })
      const data = await res.json()
      if (data.success) {
        setGenerationLogs(data.logs)
      }
    } catch {
      toast({ title: 'エラー', description: '生成下書きの取得に失敗しました', variant: 'destructive' })
    } finally {
      setGenerationLogsLoading(false)
    }
  }, [getAuthHeaders, toast])

  // 生成下書き削除
  const deleteGenerationLog = async (logId: string) => {
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch(`/api/admin/case-study/generation-logs/${logId}`, {
        method: 'DELETE',
        headers: authHeaders
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: '成功', description: '下書きを削除しました' })
        fetchGenerationLogs()
      } else {
        toast({ title: 'エラー', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'エラー', description: '削除に失敗しました', variant: 'destructive' })
    }
  }

  // 初回読み込み
  useEffect(() => {
    fetchProblems()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, statusFilter, difficultyFilter])

  // タブ切り替え時にデータ取得
  useEffect(() => {
    if (activeTab === 'ai-settings' && !aiSettings) {
      fetchAISettings()
    }
    if (activeTab === 'thinking-logs' && thinkingLogs.length === 0) {
      fetchThinkingLogs()
    }
    if (activeTab === 'generation-drafts' && generationLogs.length === 0) {
      fetchGenerationLogs()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  // 検索実行
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchProblems()
  }

  // ステータス変更
  const handleStatusChange = async (problemId: string, newStatus: string) => {
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch(`/api/admin/case-study/problems/${problemId}/status`, {
        method: 'PUT',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      const data = await res.json()

      if (data.success) {
        toast({ title: '成功', description: `ステータスを${statusConfig[newStatus]?.label || newStatus}に変更しました` })
        fetchProblems()
      } else {
        toast({ title: 'エラー', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'エラー', description: 'ステータスの変更に失敗しました', variant: 'destructive' })
    }
  }

  // 問題削除
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null)

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const problemId = deleteTarget.id
    setDeleteTarget(null)

    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch(`/api/admin/case-study/problems/${problemId}`, {
        method: 'DELETE',
        headers: authHeaders
      })
      const data = await res.json()

      if (data.success) {
        toast({
          title: '成功',
          description: data.archived ? 'アーカイブしました' : '削除しました'
        })
        fetchProblems()
      } else {
        toast({ title: 'エラー', description: data.error, variant: 'destructive' })
      }
    } catch {
      toast({ title: 'エラー', description: '削除に失敗しました', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Briefcase className="h-6 w-6 mr-2 text-teal-600" />
            ケーススタディ管理
          </h1>
          <p className="text-muted-foreground">問題の作成・管理・AI設定</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => {
            if (activeTab === 'problems') fetchProblems()
            else if (activeTab === 'ai-settings') fetchAISettings()
            else if (activeTab === 'thinking-logs') fetchThinkingLogs()
            else if (activeTab === 'generation-drafts') fetchGenerationLogs()
          }}>
            <RefreshCw className="h-4 w-4 mr-1" />
            更新
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/case-study/masters">
              <Settings className="h-4 w-4 mr-1" />
              マスタ管理
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/case-study/generate">
              <Sparkles className="h-4 w-4 mr-1" />
              AI問題生成
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/case-study/problems/new">
              <Plus className="h-4 w-4 mr-1" />
              新規問題作成
            </Link>
          </Button>
        </div>
      </div>

      {/* 統計サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold">{pagination.total}</div>
            <div className="text-sm text-muted-foreground">総問題数</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-green-600">
              {problems.filter(p => p.status === 'active').length}
            </div>
            <div className="text-sm text-muted-foreground">公開中</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-yellow-600">
              {problems.filter(p => p.status === 'review').length}
            </div>
            <div className="text-sm text-muted-foreground">レビュー済</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="text-2xl font-bold text-gray-600">
              {problems.filter(p => p.status === 'draft').length}
            </div>
            <div className="text-sm text-muted-foreground">下書き</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="problems" className="flex items-center">
            <Briefcase className="h-4 w-4 mr-1" />
            問題一覧
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex items-center">
            <BarChart3 className="h-4 w-4 mr-1" />
            統計
          </TabsTrigger>
          <TabsTrigger value="ai-settings" className="flex items-center">
            <Bot className="h-4 w-4 mr-1" />
            AI設定
          </TabsTrigger>
          <TabsTrigger value="thinking-logs" className="flex items-center">
            <ScrollText className="h-4 w-4 mr-1" />
            思考ログ
          </TabsTrigger>
          <TabsTrigger value="generation-drafts" className="flex items-center">
            <Edit className="h-4 w-4 mr-1" />
            生成下書き
          </TabsTrigger>
        </TabsList>

        {/* 問題一覧タブ */}
        <TabsContent value="problems" className="space-y-4">
          {/* フィルター */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="問題タイトルで検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button variant="outline" size="icon" onClick={handleSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPagination(prev => ({...prev, page: 1})) }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="ステータス" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全ステータス</SelectItem>
                    <SelectItem value="draft">下書き</SelectItem>
                    <SelectItem value="review">レビュー済</SelectItem>
                    <SelectItem value="active">公開中</SelectItem>
                    <SelectItem value="archived">アーカイブ</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={difficultyFilter} onValueChange={(v) => { setDifficultyFilter(v); setPagination(prev => ({...prev, page: 1})) }}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="難易度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全難易度</SelectItem>
                    <SelectItem value="basic">初級</SelectItem>
                    <SelectItem value="intermediate">中級</SelectItem>
                    <SelectItem value="advanced">上級</SelectItem>
                    <SelectItem value="expert">エキスパート</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 問題テーブル */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">読み込み中...</span>
                </div>
              ) : problems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>問題が見つかりません</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link href="/admin/case-study/problems/new">
                      <Plus className="h-4 w-4 mr-1" />
                      最初の問題を作成
                    </Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[300px]">タイトル</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>難易度</TableHead>
                      <TableHead>ステップ数</TableHead>
                      <TableHead>注目日</TableHead>
                      <TableHead>作成日</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {problems.map((problem) => (
                      <TableRow key={problem.id}>
                        <TableCell>
                          <div className="font-medium">{problem.title}</div>
                          {problem.industry && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {problem.industry} / {problem.scenario_type || '-'}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={problem.status}
                            onValueChange={(v) => handleStatusChange(problem.id, v)}
                          >
                            <SelectTrigger className="w-[130px] h-8">
                              <Badge className={`${statusConfig[problem.status]?.color || 'bg-gray-100'} text-xs`}>
                                {statusConfig[problem.status]?.label || problem.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              {/* 現在のステータス */}
                              <SelectItem value={problem.status} disabled>
                                {statusConfig[problem.status]?.label || problem.status}（現在）
                              </SelectItem>
                              {/* 許可された遷移先 */}
                              {(allowedTransitions[problem.status] || []).map((status) => (
                                <SelectItem key={status} value={status}>
                                  → {statusConfig[status]?.label || status}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${difficultyConfig[problem.difficulty]?.color || 'bg-gray-100'} text-xs`}>
                            {difficultyConfig[problem.difficulty]?.label || problem.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {problem.step_count}ステップ
                        </TableCell>
                        <TableCell>
                          {problem.featured_date ? (
                            <div className="flex items-center text-sm">
                              <Star className="h-3 w-3 text-yellow-500 mr-1" />
                              {problem.featured_date}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(problem.created_at).toLocaleDateString('ja-JP')}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/admin/case-study/problems/${problem.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/admin/case-study/problems/${problem.id}?edit=true`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => setDeleteTarget({ id: problem.id, title: problem.title })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* ページネーション */}
              {pagination.total_pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    {pagination.total}件中 {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)}件
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      {pagination.page} / {pagination.total_pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.total_pages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 統計タブ */}
        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                ケーススタディ統計
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-3xl font-bold">{pagination.total}</div>
                  <div className="text-sm text-muted-foreground mt-1">登録問題数</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-3xl font-bold">
                    {problems.filter(p => p.status === 'active').length}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">公開問題数</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-3xl font-bold">
                    {problems.filter(p => p.status === 'draft' || p.status === 'review').length}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">レビュー待ち</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium flex items-center mb-2">
                  <LinkIcon className="h-4 w-4 mr-1" />
                  コース連動
                </h3>
                <p className="text-sm text-muted-foreground">
                  コース連動の設定は各問題の詳細画面から行えます。
                  問題一覧の操作ボタンから詳細画面を開いてください。
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI設定タブ */}
        <TabsContent value="ai-settings" className="space-y-4">
          {aiSettingsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">読み込み中...</span>
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Bot className="h-5 w-5 mr-2 text-purple-600" />
                    デフォルト採点プロバイダー
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    ケーススタディの採点に使用するデフォルトのAIプロバイダーを選択してください。
                    問題個別に異なるプロバイダーを設定することも可能です。
                  </p>
                  <Select
                    value={aiSettings?.default_provider || 'huggingface'}
                    onValueChange={saveAIProvider}
                    disabled={aiSaving}
                  >
                    <SelectTrigger className="w-[240px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="huggingface">HuggingFace (Qwen2.5-72B)</SelectItem>
                      <SelectItem value="openai" disabled>OpenAI (準備中)</SelectItem>
                      <SelectItem value="anthropic" disabled>Claude (準備中)</SelectItem>
                      <SelectItem value="gemini" disabled>Gemini (準備中)</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(aiSettings?.providers || []).map((provider) => (
                  <Card key={provider.name} className={provider.available ? 'border-green-200' : 'opacity-60'}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">{provider.name}</span>
                        <Badge className={provider.available ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {provider.available ? '利用可能' : '準備中'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {provider.name === 'huggingface' && 'Qwen2.5-72B-Instruct (OpenAI互換API)'}
                        {provider.name === 'openai' && 'GPT-4 / GPT-3.5'}
                        {provider.name === 'anthropic' && 'Claude 3.5 Sonnet'}
                        {provider.name === 'gemini' && 'Gemini 1.5 Pro'}
                      </p>
                      {aiSettings?.default_provider === provider.name && (
                        <Badge variant="outline" className="mt-2 text-xs">デフォルト</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* 思考ログタブ */}
        <TabsContent value="thinking-logs" className="space-y-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <Input
                  placeholder="セッションIDでフィルタ..."
                  value={logsSessionFilter}
                  onChange={(e) => setLogsSessionFilter(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setLogsPagination(prev => ({ ...prev, page: 1 }))
                      fetchThinkingLogs()
                    }
                  }}
                  className="max-w-md"
                />
                <Button variant="outline" size="sm" onClick={() => {
                  setLogsPagination(prev => ({ ...prev, page: 1 }))
                  fetchThinkingLogs()
                }}>
                  <Search className="h-4 w-4 mr-1" />
                  検索
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {logsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">読み込み中...</span>
                </div>
              ) : thinkingLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ScrollText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>思考ログがありません</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>セッションID</TableHead>
                      <TableHead>ステップ</TableHead>
                      <TableHead>アクション</TableHead>
                      <TableHead>タイムスタンプ</TableHead>
                      <TableHead>経過時間</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {thinkingLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">
                          {log.session_id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>Step {log.step_number}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.action_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString('ja-JP')}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.time_since_step_start_ms != null
                            ? `${(log.time_since_step_start_ms / 1000).toFixed(1)}s`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {logsPagination.total_pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    {logsPagination.total}件中 {(logsPagination.page - 1) * logsPagination.limit + 1}-{Math.min(logsPagination.page * logsPagination.limit, logsPagination.total)}件
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" disabled={logsPagination.page <= 1}
                      onClick={() => { setLogsPagination(prev => ({ ...prev, page: prev.page - 1 })); fetchThinkingLogs() }}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">{logsPagination.page} / {logsPagination.total_pages}</span>
                    <Button variant="outline" size="sm" disabled={logsPagination.page >= logsPagination.total_pages}
                      onClick={() => { setLogsPagination(prev => ({ ...prev, page: prev.page + 1 })); fetchThinkingLogs() }}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 生成下書きタブ */}
        <TabsContent value="generation-drafts" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {generationLogsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">読み込み中...</span>
                </div>
              ) : generationLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Edit className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>生成下書きがありません</p>
                  <p className="text-sm mt-2">「AI問題生成」から新しい問題を作成できます</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>タイトル</TableHead>
                      <TableHead>カテゴリー</TableHead>
                      <TableHead>難易度</TableHead>
                      <TableHead>AIモデル</TableHead>
                      <TableHead>進捗</TableHead>
                      <TableHead>更新日時</TableHead>
                      <TableHead className="w-[100px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generationLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {log.draft_title || '無題の下書き'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {log.category_name || '-'}
                        </TableCell>
                        <TableCell>
                          {log.difficulty && difficultyConfig[log.difficulty] ? (
                            <Badge className={difficultyConfig[log.difficulty].color}>
                              {difficultyConfig[log.difficulty].label}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {log.ai_model || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.current_step >= 3 ? 'default' : 'secondary'} className="text-xs">
                            Step {log.current_step}/4
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(log.updated_at).toLocaleString('ja-JP')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/admin/case-study/generate?id=${log.id}`}>
                                <Edit className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => deleteGenerationLog(log.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 削除確認ダイアログ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-background rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">問題の削除</h3>
            <p className="text-sm text-muted-foreground mb-4">
              「{deleteTarget.title}」を削除しますか？<br />
              学習履歴がある場合はアーカイブされます。
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                キャンセル
              </Button>
              <Button variant="destructive" size="sm" onClick={confirmDelete}>
                削除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
