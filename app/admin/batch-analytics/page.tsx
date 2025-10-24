// 日次分析バッチ管理画面
// バッチ履歴表示・手動実行・リアルタイム監視

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/hooks/use-toast'
import { 
  requestBatchExecution,
  BATCH_PROCESS_TYPES,
  BATCH_STATUS,
  type BatchProcessType,
  type BatchStatus
} from '@/lib/batch-management'
import type { DailyAnalyticsBatchLog } from '@/lib/database-types-official'

// 日付選択用のユーティリティ
function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getPreviousDateJST(): string {
  const now = new Date()
  const jstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  jstNow.setDate(jstNow.getDate() - 1)
  return formatDateForInput(jstNow)
}

export default function BatchAnalyticsPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  // 状態管理
  const [batchLogs, setBatchLogs] = useState<DailyAnalyticsBatchLog[]>([])
  const [statistics, setStatistics] = useState<{
    total_executions: number
    successful_executions: number
    failed_executions: number
    success_rate: number
    avg_processing_time_seconds: number
    avg_processed_users: number
    process_type_breakdown: Record<string, number>
    recent_errors: string[]
  } | null>(null)
  const [healthStatus, setHealthStatus] = useState<{
    status: 'healthy' | 'warning' | 'critical'
    message: string
    details: {
      stuck_processes: number
      recent_failures: number
      last_successful_run?: string
    }
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)

  // 手動実行用の状態
  const [selectedDate, setSelectedDate] = useState(getPreviousDateJST())
  const [selectedProcessType, setSelectedProcessType] = useState<BatchProcessType>(BATCH_PROCESS_TYPES.ALL)
  const [forceReprocess, setForceReprocess] = useState(false)

  // フィルター状態
  const [filterProcessType, setFilterProcessType] = useState<BatchProcessType | ''>('')
  const [filterStatus, setFilterStatus] = useState<BatchStatus | ''>('')
  const [filterDays, setFilterDays] = useState<number>(7)

  // 認証トークン取得
  const getAuthToken = useCallback(async () => {
    if (!user?.id) return null

    // 既存のSupabaseクライアントを使用（新しいクライアント作成を避ける）
    const { supabase } = await import('@/lib/supabase')
    
    const { data: sessionData } = await supabase.auth.getSession()
    return sessionData.session?.access_token || null
  }, [user?.id])

  // データ読み込み
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)

      const authToken = await getAuthToken()
      if (!authToken) {
        throw new Error('認証トークンの取得に失敗しました')
      }

      // 並行してデータ取得（API経由）
      const [historyResponse, statsResponse, healthResponse] = await Promise.all([
        fetch(`/api/admin/batch/history?process_type=${filterProcessType || ''}&status=${filterStatus || ''}&days=${filterDays}&limit=50`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch(`/api/admin/batch/statistics?days=30`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }),
        fetch('/api/admin/batch/health', {
          headers: { 'Authorization': `Bearer ${authToken}` }
        })
      ])

      // バッチ履歴処理
      if (historyResponse.ok) {
        const historyResult = await historyResponse.json()
        if (historyResult.success) {
          setBatchLogs(historyResult.logs)
        } else {
          toast({
            title: 'データ取得エラー',
            description: historyResult.error_message,
            variant: 'destructive'
          })
        }
      }

      // バッチ統計処理
      if (statsResponse.ok) {
        const statsResult = await statsResponse.json()
        if (statsResult.success && statsResult.statistics) {
          setStatistics(statsResult.statistics)
        }
      }

      // ヘルス監視処理
      if (healthResponse.ok) {
        const healthResult = await healthResponse.json()
        if (healthResult.success) {
          setHealthStatus(healthResult.health)
        }
      }

    } catch (error) {
      console.error('データ読み込みエラー:', error)
      toast({
        title: 'データ読み込み失敗',
        description: '管理画面データの読み込みに失敗しました',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }, [filterProcessType, filterStatus, filterDays, toast, getAuthToken])

  // 手動バッチ実行
  const handleManualExecution = async () => {
    if (!user?.id) {
      toast({
        title: 'エラー',
        description: 'ユーザー認証が必要です',
        variant: 'destructive'
      })
      return
    }

    try {
      setIsExecuting(true)
      
      const authToken = await getAuthToken()
      if (!authToken) {
        throw new Error('認証トークンの取得に失敗しました')
      }

      const result = await requestBatchExecution({
        process_type: selectedProcessType,
        target_date: selectedDate,
        analysis_period: 30,
        auto_retry: false
      }, authToken)

      if (result.success) {
        toast({
          title: 'バッチ実行開始',
          description: `${selectedDate} の処理を開始しました（ID: ${result.batch_log_id}）`
        })
        
        // データ再読み込み
        setTimeout(() => loadData(), 2000)
      } else {
        toast({
          title: 'バッチ実行失敗',
          description: result.error_message || '不明なエラー',
          variant: 'destructive'
        })
      }

    } catch (error) {
      console.error('手動バッチ実行エラー:', error)
      toast({
        title: '実行エラー',
        description: error instanceof Error ? error.message : '予期しないエラー',
        variant: 'destructive'
      })
    } finally {
      setIsExecuting(false)
    }
  }

  // 初期データ読み込み
  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // フィルター変更時の再読み込み
  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterProcessType, filterStatus, filterDays])

  // 5分間隔でデータ更新
  useEffect(() => {
    const interval = setInterval(() => {
      loadData()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ローディング状態
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">バッチ管理データを読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          日次分析バッチ管理
        </h1>
        <p className="text-gray-600">
          学習品質スコア・ピーク時間・思考時間の自動計算システム管理
        </p>
      </div>

      {/* システム健康状態 */}
      {healthStatus && (
        <div className="mb-8">
          <div className={`p-4 rounded-lg border-l-4 ${
            healthStatus.status === 'healthy' 
              ? 'bg-green-50 border-green-400' 
              : healthStatus.status === 'warning'
              ? 'bg-yellow-50 border-yellow-400'
              : 'bg-red-50 border-red-400'
          }`}>
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-900">
                  システム状態: {
                    healthStatus.status === 'healthy' ? '🟢 正常' :
                    healthStatus.status === 'warning' ? '🟡 注意' : '🔴 異常'
                  }
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  {healthStatus.message}
                </p>
                {healthStatus.details && (
                  <div className="mt-2 text-xs text-gray-500">
                    停止プロセス: {healthStatus.details.stuck_processes}件 | 
                    直近失敗: {healthStatus.details.recent_failures}件
                    {healthStatus.details.last_successful_run && (
                      <> | 最終成功: {new Date(healthStatus.details.last_successful_run).toLocaleString('ja-JP')}</>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 統計サマリー */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">総実行回数</h3>
            <p className="text-2xl font-bold text-gray-900">{statistics.total_executions}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">成功率</h3>
            <p className="text-2xl font-bold text-green-600">{statistics.success_rate}%</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">平均処理時間</h3>
            <p className="text-2xl font-bold text-blue-600">{statistics.avg_processing_time_seconds}秒</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500 mb-2">平均処理ユーザー数</h3>
            <p className="text-2xl font-bold text-purple-600">{statistics.avg_processed_users}人</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 手動実行パネル */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              手動バッチ実行
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  処理対象日
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isExecuting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  処理タイプ
                </label>
                <select
                  value={selectedProcessType}
                  onChange={(e) => setSelectedProcessType(e.target.value as BatchProcessType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isExecuting}
                >
                  <option value={BATCH_PROCESS_TYPES.ALL}>全て（推奨）</option>
                  <option value={BATCH_PROCESS_TYPES.QUALITY_SCORE}>品質スコアのみ</option>
                  <option value={BATCH_PROCESS_TYPES.PEAK_HOUR}>ピーク時間のみ</option>
                  <option value={BATCH_PROCESS_TYPES.STUDY_TIME}>思考時間のみ</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  id="force-reprocess"
                  type="checkbox"
                  checked={forceReprocess}
                  onChange={(e) => setForceReprocess(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={isExecuting}
                />
                <label htmlFor="force-reprocess" className="ml-2 text-sm text-gray-700">
                  強制再処理（既存データを上書き）
                </label>
              </div>

              <button
                onClick={handleManualExecution}
                disabled={isExecuting || !selectedDate}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isExecuting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    実行中...
                  </>
                ) : (
                  'バッチ実行'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* バッチ履歴 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                バッチ実行履歴
              </h2>
              
              {/* フィルター */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <select
                  value={filterProcessType}
                  onChange={(e) => setFilterProcessType(e.target.value as BatchProcessType | '')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全ての処理タイプ</option>
                  <option value={BATCH_PROCESS_TYPES.ALL}>全て</option>
                  <option value={BATCH_PROCESS_TYPES.QUALITY_SCORE}>品質スコア</option>
                  <option value={BATCH_PROCESS_TYPES.PEAK_HOUR}>ピーク時間</option>
                  <option value={BATCH_PROCESS_TYPES.STUDY_TIME}>思考時間</option>
                  <option value="cron_auto_all">Cron自動実行</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as BatchStatus | '')}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全てのステータス</option>
                  <option value={BATCH_STATUS.COMPLETED}>完了</option>
                  <option value={BATCH_STATUS.RUNNING}>実行中</option>
                  <option value={BATCH_STATUS.FAILED}>失敗</option>
                </select>

                <select
                  value={filterDays}
                  onChange={(e) => setFilterDays(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={7}>直近7日</option>
                  <option value={30}>直近30日</option>
                  <option value={90}>直近90日</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      処理日
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      タイプ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      処理ユーザー数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      実行時間
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      完了時刻
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {batchLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.process_date}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          log.process_type === 'cron_auto_all' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {log.process_type === 'cron_auto_all' ? '自動実行' : log.process_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          log.status === BATCH_STATUS.COMPLETED 
                            ? 'bg-green-100 text-green-800'
                            : log.status === BATCH_STATUS.RUNNING
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status === BATCH_STATUS.COMPLETED ? '✅ 完了' :
                           log.status === BATCH_STATUS.RUNNING ? '⏳ 実行中' : '❌ 失敗'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.processed_users || 0}人
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {log.started_at && log.completed_at 
                          ? `${Math.round((new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000)}秒`
                          : '-'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.completed_at 
                          ? new Date(log.completed_at).toLocaleString('ja-JP')
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {batchLogs.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  バッチ実行履歴がありません
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* リフレッシュボタン */}
      <div className="mt-8 text-center">
        <button
          onClick={loadData}
          disabled={isLoading}
          className="bg-gray-600 text-white py-2 px-6 rounded-md hover:bg-gray-700 disabled:bg-gray-400"
        >
          {isLoading ? '読み込み中...' : 'データ更新'}
        </button>
        <p className="mt-2 text-sm text-gray-500">
          自動更新: 5分間隔 | 最終更新: {new Date().toLocaleString('ja-JP')}
        </p>
      </div>
    </div>
  )
}