'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  RefreshCw,
  Database,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  Server,
  HardDrive
} from 'lucide-react'
import { useOfflineDB } from '@/lib/offline/provider'
import { useAuth } from '@/components/auth/AuthProvider'
import {
  getLastDiagnostic,
  getLocalTableCounts,
  getTableDisplayName,
  getTableType,
  type SyncDiagnosticResult,
  type TableSyncStatus,
} from '@/lib/offline/sync-diagnostics'

interface TableInfo {
  table: string
  displayName: string
  type: 'master' | 'user'
  localCount: number
  syncStatus?: TableSyncStatus
}

export default function SyncDebugPage() {
  const router = useRouter()
  const { database, syncing, lastSyncError, triggerSync, isNative } = useOfflineDB()
  const { user } = useAuth()
  const [tables, setTables] = useState<TableInfo[]>([])
  const [diagnostic, setDiagnostic] = useState<SyncDiagnosticResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState(false)
  const [syncingTable, setSyncingTable] = useState<string | null>(null)

  const ALL_TABLES = [
    // Master
    'quiz_questions', 'quiz_packs', 'session_quizzes',
    'case_study_problems', 'case_study_steps', 'case_study_rubric_axes',
    'case_study_options', 'case_study_course_links',
    'learning_courses', 'learning_genres', 'learning_themes',
    'learning_sessions', 'session_contents',
    'skill_levels', 'categories', 'subcategories',
    'xp_level_skp_settings', 'wisdom_cards',
    // User
    'quiz_sessions', 'quiz_answers', 'precomputed_quiz_sets',
    'case_study_sessions', 'case_study_step_details', 'case_study_thinking_logs',
    'wisdom_card_collection', 'user_knowledge_collection_v2',
    'user_xp_stats_v2', 'course_session_completions', 'daily_xp_records',
  ]

  const loadData = useCallback(async () => {
    if (!database) {
      setLoading(false)
      return
    }

    try {
      const counts = await getLocalTableCounts(database)
      const diag = getLastDiagnostic()
      setDiagnostic(diag)

      const tableInfos: TableInfo[] = ALL_TABLES.map(table => {
        const syncStatus = diag?.tables.find(t => t.table === table)
        return {
          table,
          displayName: getTableDisplayName(table),
          type: getTableType(table),
          localCount: counts[table] ?? 0,
          syncStatus,
        }
      })

      setTables(tableInfos)
    } catch (e) {
      console.error('Failed to load table data:', e)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [database])

  useEffect(() => {
    loadData()
  }, [loadData])

  // 同期完了後にデータをリロード
  useEffect(() => {
    if (!syncing && database) {
      const timer = setTimeout(loadData, 500)
      return () => clearTimeout(timer)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncing])

  const handleFullSync = async () => {
    await triggerSync()
    // loadDataは syncingのuseEffectで自動呼び出し
  }

  const handleSyncTable = async (table: string) => {
    if (!database) return
    setSyncingTable(table)
    try {
      const { syncTables } = await import('@/lib/offline/sync')
      const result = await syncTables([table])
      if (!result.success) {
        console.error(`Table sync failed: ${table}`, result.error)
      }
      await loadData()
    } catch (e) {
      console.error(`Table sync error: ${table}`, e)
    } finally {
      setSyncingTable(null)
    }
  }

  const handleResetDB = async () => {
    if (!database) return
    if (!window.confirm('ローカルDBを完全リセットしますか？\n次回同期時に全データを再取得します。')) return

    setResetting(true)
    try {
      const { resetDatabase } = await import('@/lib/offline/database')
      await resetDatabase()
      await loadData()
    } catch (e) {
      console.error('DB reset error:', e)
    } finally {
      setResetting(false)
    }
  }

  if (!isNative) {
    return (
      <AppShell>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Database className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">PC版では利用できません</h2>
            <p className="text-muted-foreground">
              同期診断はネイティブアプリ（iOS）でのみ利用可能です
            </p>
            <Button variant="outline" className="mt-4" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
          </div>
        </div>
      </AppShell>
    )
  }

  const masterTables = tables.filter(t => t.type === 'master')
  const userTables = tables.filter(t => t.type === 'user')
  const totalLocal = tables.reduce((sum, t) => sum + Math.max(0, t.localCount), 0)
  const errorTables = tables.filter(t => t.syncStatus?.status === 'error')
  const emptyTables = tables.filter(t => t.localCount === 0)

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6 space-y-6 max-w-2xl overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Database className="h-5 w-5" />
              同期診断
            </h1>
            <p className="text-sm text-muted-foreground">
              ローカルDB テーブル状態・同期エラー確認
            </p>
          </div>
        </div>

        {/* Overview Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">概要</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-blue-500" />
                <span>テーブル数: <strong>{tables.length}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-green-500" />
                <span>総レコード: <strong>{totalLocal.toLocaleString()}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                {errorTables.length > 0 ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <span>エラー: <strong className={errorTables.length > 0 ? 'text-red-500' : ''}>{errorTables.length}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span>空テーブル: <strong>{emptyTables.length}</strong></span>
              </div>
            </div>

            {/* 最終同期情報 */}
            {diagnostic && (
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>最終同期:</span>
                  <span>{new Date(diagnostic.completedAt).toLocaleString('ja-JP')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pull所要時間:</span>
                  <span>{(diagnostic.pullDuration / 1000).toFixed(1)}秒</span>
                </div>
                <div className="flex justify-between">
                  <span>Push所要時間:</span>
                  <span>{(diagnostic.pushDuration / 1000).toFixed(1)}秒</span>
                </div>
                <div className="flex justify-between">
                  <span>ステータス:</span>
                  <Badge
                    variant={diagnostic.overallStatus === 'success' ? 'default' : diagnostic.overallStatus === 'partial' ? 'secondary' : 'destructive'}
                    className="text-xs"
                  >
                    {diagnostic.overallStatus === 'success' ? '成功' : diagnostic.overallStatus === 'partial' ? '一部エラー' : 'エラー'}
                  </Badge>
                </div>
              </div>
            )}

            {/* 同期エラー */}
            {(lastSyncError || diagnostic?.errorMessage) && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 overflow-hidden">
                <div className="font-medium mb-1">同期エラー詳細:</div>
                <div className="break-all font-mono text-[10px] line-clamp-4">{lastSyncError || diagnostic?.errorMessage}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleFullSync}
            disabled={syncing}
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '同期中...' : '全テーブル同期'}
          </Button>
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={handleResetDB}
            disabled={resetting || syncing}
            title="DBリセット"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Master Tables */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>マスタテーブル ({masterTables.length})</span>
              <Badge variant="secondary" className="text-xs">読み取り専用</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden">
            <div className="divide-y">
              {masterTables.map(t => (
                <TableRow
                  key={t.table}
                  info={t}
                  onSync={() => handleSyncTable(t.table)}
                  isSyncing={syncingTable === t.table}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* User Tables */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>ユーザーテーブル ({userTables.length})</span>
              <Badge variant="outline" className="text-xs">双方向同期</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-hidden">
            <div className="divide-y">
              {userTables.map(t => (
                <TableRow
                  key={t.table}
                  info={t}
                  onSync={() => handleSyncTable(t.table)}
                  isSyncing={syncingTable === t.table}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ユーザー情報 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">デバッグ情報</CardTitle>
          </CardHeader>
          <CardContent className="text-[10px] text-muted-foreground space-y-1 font-mono overflow-hidden">
            <div className="truncate">UID: {user?.id || 'N/A'}</div>
            <div>Native: {isNative ? 'Yes' : 'No'} | DB: {database ? 'OK' : 'null'} | Online: {typeof navigator !== 'undefined' ? (navigator.onLine ? 'Yes' : 'No') : 'N/A'}</div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}

function TableRow({ info, onSync, isSyncing }: { info: TableInfo; onSync: () => void; isSyncing: boolean }) {
  const { table, displayName, localCount, syncStatus } = info
  const isError = syncStatus?.status === 'error'
  const isEmpty = localCount === 0
  const hasChanges = syncStatus && (syncStatus.pullCreated > 0 || syncStatus.pullUpdated > 0 || syncStatus.pullDeleted > 0)

  return (
    <div className={`px-3 py-2.5 ${isError ? 'bg-red-50' : ''}`}>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1.5">
            {isError ? (
              <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
            ) : isEmpty ? (
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" />
            ) : (
              <CheckCircle className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
            )}
            <span className="text-sm font-medium truncate">{displayName}</span>
            <span className={`text-xs font-bold flex-shrink-0 ${isEmpty ? 'text-yellow-600' : 'text-blue-600'}`}>
              {localCount >= 0 ? localCount.toLocaleString() : 'ERR'}件
            </span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 ml-5 flex items-center gap-2 overflow-hidden">
            <span className="font-mono truncate">{table}</span>
            {hasChanges && (
              <span className="text-green-600 flex-shrink-0">
                +{syncStatus.pullCreated}c/{syncStatus.pullUpdated}u/{syncStatus.pullDeleted}d
              </span>
            )}
          </div>
          {isError && syncStatus?.error && (
            <div className="text-[10px] text-red-600 mt-1 ml-5 break-all line-clamp-2">
              {syncStatus.error}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 flex-shrink-0"
          onClick={onSync}
          disabled={isSyncing}
        >
          <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  )
}
