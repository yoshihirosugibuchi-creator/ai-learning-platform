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
    'user_challenge_selections',
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
        <div className="px-4 py-8">
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
      <div style={{ maxWidth: '100vw', overflow: 'hidden' }}>
        <div className="px-4 py-6 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2">
                <Database className="h-5 w-5" />
                同期診断
              </h1>
              <p className="text-xs text-muted-foreground">
                ローカルDB状態・同期エラー確認
              </p>
            </div>
          </div>

          {/* Overview */}
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span>テーブル: <strong>{tables.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Server className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span>レコード: <strong>{totalLocal.toLocaleString()}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  {errorTables.length > 0 ? (
                    <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  )}
                  <span>エラー: <strong className={errorTables.length > 0 ? 'text-red-500' : ''}>{errorTables.length}</strong></span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                  <span>空: <strong>{emptyTables.length}</strong></span>
                </div>
              </div>

              {/* 最終同期 */}
              {diagnostic && (
                <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground space-y-0.5">
                  <div className="flex justify-between">
                    <span>最終同期</span>
                    <span>{new Date(diagnostic.completedAt).toLocaleString('ja-JP')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pull/Push</span>
                    <span>{(diagnostic.pullDuration / 1000).toFixed(1)}s / {(diagnostic.pushDuration / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>状態</span>
                    <Badge
                      variant={diagnostic.overallStatus === 'success' ? 'default' : diagnostic.overallStatus === 'partial' ? 'secondary' : 'destructive'}
                      className="text-[10px] px-1.5 py-0"
                    >
                      {diagnostic.overallStatus === 'success' ? '成功' : diagnostic.overallStatus === 'partial' ? '一部エラー' : 'エラー'}
                    </Badge>
                  </div>
                </div>
              )}

              {/* エラー詳細 */}
              {(lastSyncError || diagnostic?.errorMessage) && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-[10px] text-red-700">
                  <div className="font-medium">エラー:</div>
                  <div className="leading-tight mt-0.5" style={{ whiteSpace: 'normal', overflowWrap: 'break-word', wordWrap: 'break-word' }}>
                    {(lastSyncError || diagnostic?.errorMessage || '').slice(0, 200)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={handleFullSync}
              disabled={syncing}
              className="flex-1 text-xs h-9"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? '同期中...' : '全テーブル同期'}
            </Button>
            <Button variant="outline" onClick={loadData} disabled={loading} className="h-9 w-9 p-0">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetDB}
              disabled={resetting || syncing}
              className="h-9 w-9 p-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Master Tables */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">マスタ ({masterTables.length})</CardTitle>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">読み取り専用</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {masterTables.map(t => (
                <TableRow
                  key={t.table}
                  info={t}
                  onSync={() => handleSyncTable(t.table)}
                  isSyncing={syncingTable === t.table}
                />
              ))}
            </CardContent>
          </Card>

          {/* User Tables */}
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">ユーザー ({userTables.length})</CardTitle>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">双方向同期</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {userTables.map(t => (
                <TableRow
                  key={t.table}
                  info={t}
                  onSync={() => handleSyncTable(t.table)}
                  isSyncing={syncingTable === t.table}
                />
              ))}
            </CardContent>
          </Card>

          {/* Debug Info */}
          <div className="text-[10px] text-muted-foreground px-1" style={{ whiteSpace: 'normal', overflowWrap: 'break-word', wordWrap: 'break-word' }}>
            UID: {user?.id || 'N/A'} | Native: {isNative ? 'Y' : 'N'} | DB: {database ? 'OK' : '-'} | Online: {typeof navigator !== 'undefined' ? (navigator.onLine ? 'Y' : 'N') : '-'}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function TableRow({ info, onSync, isSyncing }: { info: TableInfo; onSync: () => void; isSyncing: boolean }) {
  const { displayName, localCount, syncStatus } = info
  const isError = syncStatus?.status === 'error'
  const isEmpty = localCount === 0
  const hasChanges = syncStatus && (syncStatus.pullCreated > 0 || syncStatus.pullUpdated > 0 || syncStatus.pullDeleted > 0)

  return (
    <div
      className={`border-t first:border-t-0 px-3 py-2 ${isError ? 'bg-red-50' : ''}`}
      style={{ overflow: 'hidden' }}
    >
      <div className="flex items-center gap-1.5">
        {/* Icon */}
        {isError ? (
          <XCircle className="h-3 w-3 text-red-500 shrink-0" />
        ) : isEmpty ? (
          <AlertTriangle className="h-3 w-3 text-yellow-500 shrink-0" />
        ) : (
          <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
        )}

        {/* Name + count */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-medium" style={{ overflowWrap: 'break-word', wordWrap: 'break-word' }}>{displayName}</span>
            <span className={`text-[10px] font-bold shrink-0 ${isEmpty ? 'text-yellow-600' : 'text-blue-600'}`}>
              {localCount >= 0 ? localCount.toLocaleString() : 'ERR'}
            </span>
            {hasChanges && (
              <span className="text-[10px] text-green-600 shrink-0">
                +{syncStatus.pullCreated}/{syncStatus.pullUpdated}/{syncStatus.pullDeleted}
              </span>
            )}
          </div>
        </div>

        {/* Sync button */}
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="shrink-0 p-1 rounded hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 text-muted-foreground ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error message */}
      {isError && syncStatus?.error && (
        <div
          className="text-[10px] text-red-600 mt-0.5 pl-4 leading-tight"
          style={{ whiteSpace: 'normal', overflowWrap: 'break-word', wordWrap: 'break-word' }}
        >
          {syncStatus.error.slice(0, 120)}
        </div>
      )}
    </div>
  )
}
