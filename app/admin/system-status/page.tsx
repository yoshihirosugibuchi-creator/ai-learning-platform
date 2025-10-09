'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/components/auth/AuthProvider'
import { AlertTriangle, CheckCircle, Clock, User, Activity, RefreshCw, Settings } from 'lucide-react'

interface SystemAlert {
  id: number
  alert_type: string
  message: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  user_id?: string
  api_endpoint?: string
  timestamp: string
  resolved: boolean
  resolved_by?: string
  resolved_at?: string
  metadata?: Record<string, unknown>
}

interface HealthCheck {
  overallStatus: 'healthy' | 'warning' | 'critical'
  timestamp: string
  healthChecks: Array<{
    component: string
    status: 'healthy' | 'warning' | 'critical'
    message: string
    error?: string
  }>
  summary: {
    total: number
    healthy: number
    warning: number
    critical: number
  }
}

export default function SystemStatusPage() {
  const { user } = useAuth()
  const [alerts, setAlerts] = useState<SystemAlert[]>([])
  const [healthStatus, setHealthStatus] = useState<HealthCheck | null>(null)
  const [xpSettingsStatus, setXpSettingsStatus] = useState<{
    source: 'database' | 'fallback'
    lastCheck: string
  }>()
  const [showResolved, setShowResolved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadSystemStatus()
      // 30秒ごとに更新
      const interval = setInterval(loadSystemStatus, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  async function loadSystemStatus() {
    try {
      setLoading(true)
      
      // システムヘルスチェック
      const healthResponse = await fetch('/api/admin/system-health')
      if (healthResponse.ok) {
        const healthData = await healthResponse.json()
        setHealthStatus(healthData)
        
        // XP設定状態をヘルスチェック結果から判定
        const xpSettingsCheck = healthData.healthChecks?.find((check: { component: string; status: string }) => 
          check.component === 'xp_settings_load'
        )
        
        setXpSettingsStatus({
          source: xpSettingsCheck?.status === 'healthy' ? 'database' : 'fallback',
          lastCheck: healthData.timestamp
        })
      } else {
        // API失敗時はフォールバック状態とする
        setXpSettingsStatus({
          source: 'fallback',
          lastCheck: new Date().toISOString()
        })
      }

      // システムアラート取得（模擬データ）
      const alertsData: SystemAlert[] = [
        {
          id: 1,
          alert_type: 'xp_settings_fallback',
          message: 'XP設定でフォールバック値を使用中です',
          severity: 'info',
          timestamp: new Date().toISOString(),
          resolved: true
        }
      ]
      setAlerts(alertsData)
    } catch (error) {
      console.error('Error loading system status:', error)
    } finally {
      setLoading(false)
    }
  }

  async function resolveAlert(alertId: number) {
    try {
      // アラート解決処理（模擬）
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, resolved: true, resolved_at: new Date().toISOString() }
          : alert
      ))
    } catch (error) {
      console.error('Error resolving alert:', error)
    }
  }

  const filteredAlerts = showResolved 
    ? alerts 
    : alerts.filter(alert => !alert.resolved)

  const severityColor = {
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
    error: 'bg-red-100 text-red-800 border-red-200',
    critical: 'bg-red-200 text-red-900 border-red-400'
  }

  const severityIcon = {
    info: <Activity className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    error: <AlertTriangle className="w-4 h-4" />,
    critical: <AlertTriangle className="w-4 h-4" />
  }

  if (loading) {
    return <div className="p-6">読み込み中...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">システム状態監視</h1>
          <p className="text-muted-foreground">リアルタイムシステム監視とアラート管理</p>
        </div>
        <Button onClick={loadSystemStatus} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          更新
        </Button>
      </div>

      {/* システム全体の状態 */}
      {healthStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              システム全体の状態
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-4 rounded-lg border-2 ${
              healthStatus?.overallStatus === 'healthy' 
                ? 'bg-green-50 border-green-200' 
                : healthStatus?.overallStatus === 'warning'
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="font-semibold text-lg">
                    ステータス: {
                      healthStatus?.overallStatus === 'healthy' ? '🟢 正常' :
                      healthStatus?.overallStatus === 'warning' ? '🟡 警告' : '🔴 異常'
                    }
                  </p>
                  <p className="text-sm text-gray-600">
                    最終チェック: {healthStatus?.timestamp ? new Date(healthStatus.timestamp).toLocaleString('ja-JP') : '---'}
                  </p>
                </div>
                {healthStatus?.overallStatus === 'healthy' ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-yellow-600" />
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">データベース</p>
                  <p className="font-semibold">
                    {healthStatus?.summary?.critical === 0 ? '✅ 正常' : '❌ 異常'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">XP設定</p>
                  <p className="font-semibold">
                    {xpSettingsStatus?.source === 'database' ? '✅ DB' : '⚠️ FB'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">健全性</p>
                  <p className="font-semibold">{healthStatus?.summary?.healthy || 0}/{healthStatus?.summary?.total || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">警告・異常</p>
                  <p className="font-semibold">{(healthStatus?.summary?.warning || 0) + (healthStatus?.summary?.critical || 0)}件</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* XP設定システム状態 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            XP設定システム
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`p-4 rounded-lg border-2 ${
            xpSettingsStatus?.source === 'fallback' 
              ? 'bg-yellow-50 border-yellow-200' 
              : 'bg-green-50 border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  データソース: {xpSettingsStatus?.source === 'database' ? 'データベース' : '⚠️ フォールバック値'}
                </p>
                <p className="text-sm text-gray-600">
                  最終確認: {xpSettingsStatus?.lastCheck ? new Date(xpSettingsStatus.lastCheck).toLocaleString('ja-JP') : '不明'}
                </p>
              </div>
              {xpSettingsStatus?.source === 'database' ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              )}
            </div>
            {xpSettingsStatus?.source === 'fallback' && (
              <div className="mt-3 p-3 bg-yellow-100 rounded border">
                <p className="text-yellow-800 text-sm">
                  ⚠️ 現在フォールバック値を使用中です。XP設定の変更は反映されません。
                  データベース接続を確認してください。
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* システムアラート一覧 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              システムアラート
              <Badge variant="outline">
                {filteredAlerts.length}件
              </Badge>
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant={showResolved ? "outline" : "default"}
                size="sm"
                onClick={() => setShowResolved(!showResolved)}
              >
                {showResolved ? '未対応のみ' : '全て表示'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>現在アラートはありません</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border-2 ${
                    alert.resolved ? 'bg-gray-50 border-gray-200' : severityColor[alert.severity]
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {severityIcon[alert.severity]}
                        <span className="font-semibold">{alert.alert_type}</span>
                        <Badge variant={alert.resolved ? "secondary" : "outline"}>
                          {alert.resolved ? '対応済み' : '未対応'}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2">{alert.message}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(alert.timestamp).toLocaleString('ja-JP')}
                        </span>
                        {alert.user_id && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            ユーザー: {alert.user_id.substring(0, 8)}...
                          </span>
                        )}
                        {alert.api_endpoint && (
                          <span>API: {alert.api_endpoint}</span>
                        )}
                      </div>
                      {alert.resolved && alert.resolved_at && (
                        <p className="text-xs text-green-600 mt-1">
                          対応済み: {new Date(alert.resolved_at).toLocaleString('ja-JP')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {!alert.resolved && (
                        <Button
                          size="sm"
                          onClick={() => resolveAlert(alert.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          対応済み
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}