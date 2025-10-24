'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useUserRole } from '@/hooks/useUserRole'

interface FallbackFile {
  name: string
  path: string
  exists: boolean
  lastModified: string | null
  generatedAt: string | null
  sizeKB: number
  status: 'ok' | 'missing'
  error?: string
}

interface SyncResult {
  success: boolean
  dataType: string
  recordCount: number
  filePath: string
  error?: string
  timestamp: string
  breakdown?: Record<string, number>
}

interface SyncSummary {
  totalSynced: number
  successful: number
  failed: number
  results: SyncResult[]
  executionTime: number
}

export default function FallbackSyncPage() {
  const { user, profile: _profile, loading: authLoading } = useAuth()
  const { userRole, loading: roleLoading } = useUserRole()
  const [fallbackStatus, setFallbackStatus] = useState<FallbackFile[]>([])
  const [_loading, _setLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState<string | null>(null)
  const [lastSyncResult, setLastSyncResult] = useState<SyncSummary | SyncResult | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 権限チェック - useUserRole()のキャッシュされた権限を使用
  const isSystemAdmin = userRole?.role === 'system_admin'

  // デバッグログ削除済み（パフォーマンス改善）
  
  // 詳細デバッグ: 削除済み（認証重複回避）

  // 直接認証APIリクエスト（AuthProvider回避版）
  const directAuthenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!user?.id) {
      throw new Error('ユーザー認証が必要です')
    }

    // AuthProviderのセッション情報を直接使用（getSessionを呼ばない）
    // これによりuseAuth経由で既に取得済みの認証情報を再利用
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    // 新しいクライアントインスタンスを作成してセッション取得
    const { createClient } = await import('@supabase/supabase-js')
    const freshClient = createClient(supabaseUrl, anonKey)
    
    try {
      // ブラウザのローカルストレージから直接セッション取得
      const { data: sessionData } = await freshClient.auth.getSession()
      const token = sessionData.session?.access_token
      
      if (!token) {
        throw new Error('認証トークンが見つかりません')
      }

      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
    } finally {
      // クライアントのクリーンアップは不要（GCに任せる）
    }
  }, [user?.id])

  // フォールバック状況を取得
  const fetchFallbackStatus = useCallback(async () => {
    setStatusLoading(true)
    setAuthError(null)
    
    try {
      const response = await directAuthenticatedFetch('/api/admin/fallback-sync?action=status')
      
      if (!response.ok) {
        const text = await response.text()
        console.error('❌ Status API failed:', response.status, text)
        throw new Error(`API呼び出しに失敗しました (${response.status})`)
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        const text = await response.text()
        console.error('❌ Status API returned non-JSON:', contentType, text.substring(0, 200))
        throw new Error('APIがJSONを返しませんでした')
      }
      
      const data = await response.json()
      
      if (data.success) {
        setFallbackStatus(data.fallbackStatus)
      } else {
        throw new Error(data.error || '状況取得に失敗しました')
      }
    } catch (error) {
      console.error('状況取得エラー:', error)
      setAuthError(error instanceof Error ? error.message : '状況取得に失敗しました')
    } finally {
      setStatusLoading(false)
    }
  }, [directAuthenticatedFetch])

  // 同期実行
  const handleSync = async (type: 'all' | 'xp' | 'quiz' | 'hints' | 'courses' | 'wisdom' | 'static') => {
    console.log(`==========================================`)
    console.log(`🚀 SYNC STARTED - Type: ${type}`)
    console.log(`🕐 Timestamp: ${new Date().toISOString()}`)
    console.log(`🧭 Current URL: ${window.location.href}`)
    console.log(`==========================================`)
    setSyncLoading(type)
    setAuthError(null)
    
    try {
      console.log(`📡 API呼び出し開始: /api/admin/fallback-sync?type=${type}`)
      
      const response = await directAuthenticatedFetch(`/api/admin/fallback-sync?type=${type}`, {
        method: 'POST'
      })
      
      console.log(`📊 レスポンス状態: ${response.status}`)
      console.log(`📊 レスポンスヘッダー:`, Object.fromEntries(response.headers.entries()))
      
      if (!response.ok) {
        const text = await response.text()
        console.error(`❌ API失敗: ${response.status} - ${text.substring(0, 200)}`)
        setAuthError(`同期エラー: ${response.status} - ${text.includes('<!DOCTYPE') ? 'HTMLページが返されました' : text}`)
        return
      }
      
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        const text = await response.text()
        console.error('❌ 同期APIがJSONを返しませんでした:', contentType, text.substring(0, 200))
        setAuthError(`同期エラー: APIがJSONを返しませんでした`)
        return
      }
      
      const result = await response.json()
      console.log(`📋 API結果:`, result)
      
      if (result.success && result.data) {
        console.log(`✅ 同期結果をstate設定:`, result.data)
        setLastSyncResult(result.data)
        setAuthError(null)
        
        // 成功メッセージを表示
        const summary = 'successful' in result.data 
          ? `同期完了！ ${result.data.successful}/${result.data.totalSynced}件成功 (${result.data.executionTime}ms)`
          : `${result.data.dataType} 同期完了！ ${result.data.recordCount}件`
        
        setSuccessMessage(summary)
        setTimeout(() => setSuccessMessage(null), 5000) // 5秒後に消去
        
        // 同期完了後、Fast Refreshによるリロードを検知して結果を保持
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('fallback-sync-result', JSON.stringify({
            result: result.data,
            timestamp: Date.now(),
            type: type
          }))
        }
      } else {
        setAuthError(`同期に失敗しました: ${result.error || '不明なエラー'}`)
      }
    } catch (error) {
      console.error('❌ 同期処理エラー:', error)
      console.error('❌ エラースタック:', error instanceof Error ? error.stack : 'No stack')
      setAuthError(error instanceof Error ? error.message : '同期に失敗しました')
    } finally {
      setSyncLoading(null)
      console.log(`🏁 同期処理完了: ${type}`)
    }
  }

  useEffect(() => {
    if (!authLoading && !roleLoading && isSystemAdmin) {
      fetchFallbackStatus()
    }
  }, [authLoading, roleLoading, isSystemAdmin, fetchFallbackStatus])

  // ページロード時にsessionStorageから同期結果を復元
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedResult = sessionStorage.getItem('fallback-sync-result')
      if (savedResult) {
        try {
          const { result, timestamp, type } = JSON.parse(savedResult)
          // 5分以内の結果のみ復元
          if (Date.now() - timestamp < 5 * 60 * 1000) {
            console.log(`🔄 前回の同期結果を復元: ${type}`, result)
            setLastSyncResult(result)
          } else {
            sessionStorage.removeItem('fallback-sync-result')
          }
        } catch (error) {
          console.error('同期結果の復元エラー:', error)
          sessionStorage.removeItem('fallback-sync-result')
        }
      }
    }
  }, [])

  // ローディング中
  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証情報を確認中...</p>
        </div>
      </div>
    )
  }

  // 未認証
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">認証が必要です</h1>
          <p className="text-gray-600">このページにアクセスするにはログインしてください。</p>
        </div>
      </div>
    )
  }

  // 権限不足
  if (!isSystemAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">アクセス権限がありません</h1>
          <p className="text-gray-600">このページにはシステム管理者権限が必要です。</p>
          <p className="text-sm text-gray-500 mt-2">現在の権限: {userRole?.role || 'unknown'}</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '不明'
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Tokyo'
    }).format(date)
  }

  const getStatusColor = (file: FallbackFile) => {
    if (!file.exists) return 'text-red-600 bg-red-50'
    
    if (file.generatedAt) {
      const hoursAgo = Math.floor(
        (new Date().getTime() - new Date(file.generatedAt).getTime()) / (1000 * 60 * 60)
      )
      if (hoursAgo > 168) return 'text-orange-600 bg-orange-50' // 1週間以上
    }
    
    return 'text-green-600 bg-green-50'
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {/* ヘッダー */}
          <div className="border-b border-gray-200 pb-4 mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              フォールバックデータ同期管理
            </h1>
            <p className="text-gray-600 mt-2">
              データベースからフォールバック用ファイルを更新します
            </p>
            <p className="text-sm text-gray-500 mt-1">
              アクセス権限: システム管理者 | ユーザー: {user?.email}
            </p>
          </div>

          {/* 成功メッセージ表示 */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">✅ {successMessage}</p>
            </div>
          )}

          {/* エラー表示 */}
          {authError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">エラー</p>
              <p className="text-red-700 text-sm mt-1">{authError}</p>
            </div>
          )}

          {/* 一括同期ボタン */}
          <div className="mb-6">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                e.nativeEvent.preventDefault()
                console.log('============================================')
                console.log('🔘 一括同期ボタンがクリックされました!!!')
                console.log('============================================')
                console.log('🔘 同期ボタンが押されました - アラートなし版')
                
                // 直接API呼び出し（アラートなし版）
                console.log('🚀 直接同期開始...')
                
                const executeSync = async () => {
                  try {
                    setSyncLoading('all')
                    setAuthError(null)
                    
                    console.log('📡 直接API呼び出し開始...')
                    const response = await directAuthenticatedFetch('/api/admin/fallback-sync?type=all', {
                      method: 'POST'
                    })

                    if (!response.ok) {
                      const text = await response.text()
                      console.error(`❌ 一括同期API失敗: ${response.status} - ${text.substring(0, 200)}`)
                      setAuthError(`同期エラー: ${response.status} - ${text.includes('<!DOCTYPE') ? 'HTMLページが返されました' : text}`)
                      return
                    }
                    
                    const contentType = response.headers.get('content-type')
                    if (!contentType?.includes('application/json')) {
                      const text = await response.text()
                      console.error('❌ 一括同期APIがJSONを返しませんでした:', contentType, text.substring(0, 200))
                      setAuthError(`同期エラー: APIがJSONを返しませんでした`)
                      return
                    }

                    const result = await response.json()
                    console.log('📊 同期結果:', result)

                    if (result.success) {
                      console.log('✅ 同期完了！')
                      setLastSyncResult(result.data)
                      setAuthError(null)
                      
                      // 成功メッセージを表示
                      const summary = `一括同期完了！ ${result.data.successful}/${result.data.totalSynced}件成功 (${result.data.executionTime}ms)`
                      setSuccessMessage(summary)
                      setTimeout(() => setSuccessMessage(null), 5000) // 5秒後に消去
                      
                      // sessionStorageに結果を保存（Fast Refresh対策）
                      if (typeof window !== 'undefined') {
                        sessionStorage.setItem('fallback-sync-result', JSON.stringify({
                          result: result.data,
                          timestamp: Date.now(),
                          type: 'all'
                        }))
                      }
                      
                      console.log('📋 詳細結果:')
                      if (result.data.results) {
                        result.data.results.forEach((item: SyncResult, index: number) => {
                          console.log(`  ${index + 1}. ${item.dataType}: ${item.recordCount}件`)
                          if (item.breakdown) {
                            console.log(`     内訳: ${JSON.stringify(item.breakdown)}`)
                          }
                        })
                      }
                      console.log(`⏱️ 実行時間: ${result.data.executionTime}ms`)
                    } else {
                      console.error('❌ 同期エラー:', result.error)
                      setAuthError(`同期エラー: ${result.error}`)
                    }

                  } catch (error) {
                    console.error('❌ 同期処理エラー:', error)
                    setAuthError(error instanceof Error ? error.message : '同期に失敗しました')
                  } finally {
                    setSyncLoading(null)
                  }
                }
                
                executeSync()
                
                return false
              }}
              disabled={syncLoading === 'all'}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors"
            >
              {syncLoading === 'all' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>全データ同期中...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>全データ一括同期</span>
                </>
              )}
            </button>
          </div>

          {/* フォールバック状況一覧 */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              フォールバックファイル状況
              {statusLoading && (
                <span className="ml-2 text-sm text-gray-500">読み込み中...</span>
              )}
            </h2>
            
            <div className="grid gap-4">
              {fallbackStatus.map((file, index) => (
                <div key={index} className={`border rounded-lg p-4 ${getStatusColor(file)}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-semibold">{file.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          file.exists ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {file.exists ? '存在' : '未作成'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{file.path}</p>
                      {file.exists && (
                        <div className="text-sm mt-2 space-y-1">
                          <p>📅 最終更新: {formatDate(file.generatedAt || file.lastModified)}</p>
                          <p>📦 ファイルサイズ: {file.sizeKB}KB</p>
                          <p>📂 パス: <span className="font-mono text-xs text-gray-500">{file.path}</span></p>
                        </div>
                      )}
                      {file.error && (
                        <p className="text-red-600 text-sm mt-2">エラー: {file.error}</p>
                      )}
                    </div>
                    
                    {/* 個別同期ボタン */}
                    <div className="ml-4">
                      {file.name.includes('XP/SKP') && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            console.log('🔘 XP/SKP個別同期ボタンがクリックされました')
                            try {
                              await handleSync('xp')
                            } catch (error) {
                              console.error('XP同期エラー:', error)
                            }
                          }}
                          disabled={!!syncLoading}
                          className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          {syncLoading === 'xp' ? '同期中...' : '同期'}
                        </button>
                      )}
                      {file.name.includes('クイズ問題') && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            try {
                              await handleSync('quiz')
                            } catch (error) {
                              console.error('クイズ同期エラー:', error)
                            }
                          }}
                          disabled={!!syncLoading}
                          className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          {syncLoading === 'quiz' ? '同期中...' : '同期'}
                        </button>
                      )}
                      {file.name.includes('クイズヒント') && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            try {
                              await handleSync('hints')
                            } catch (error) {
                              console.error('ヒント同期エラー:', error)
                            }
                          }}
                          disabled={!!syncLoading}
                          className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          {syncLoading === 'hints' ? '同期中...' : '同期'}
                        </button>
                      )}
                      {file.name.includes('コース') && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            try {
                              await handleSync('courses')
                            } catch (error) {
                              console.error('コース同期エラー:', error)
                            }
                          }}
                          disabled={!!syncLoading}
                          className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          {syncLoading === 'courses' ? '同期中...' : '同期'}
                        </button>
                      )}
                      {file.name.includes('格言カード') && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            try {
                              await handleSync('wisdom')
                            } catch (error) {
                              console.error('格言カード同期エラー:', error)
                            }
                          }}
                          disabled={!!syncLoading}
                          className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          {syncLoading === 'wisdom' ? '同期中...' : '同期'}
                        </button>
                      )}
                      {file.name.includes('カテゴリー') && (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            try {
                              await handleSync('static')
                            } catch (error) {
                              console.error('カテゴリー同期エラー:', error)
                            }
                          }}
                          disabled={!!syncLoading}
                          className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-300 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          {syncLoading === 'static' ? '同期中...' : '同期'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 最新同期結果 */}
          {lastSyncResult && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">最新同期結果</h2>
              
              {/* 全体同期の場合 */}
              {'successful' in lastSyncResult ? (
                <div>
                  <div className="flex items-center space-x-4 mb-4">
                    <p className="text-sm text-green-600">✅ 同期が正常に完了しました</p>
                    <span className="text-sm text-gray-600">
                      成功: {lastSyncResult.successful}/{lastSyncResult.totalSynced}件 
                      ({lastSyncResult.executionTime}ms)
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium text-gray-800">詳細結果:</h3>
                    {lastSyncResult.results.map((result, index) => (
                      <div key={index} className="bg-white rounded p-3 border">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
                              result.success ? 'bg-green-500' : 'bg-red-500'
                            }`}></span>
                            <span className="font-medium">{result.dataType}</span>
                            <span className="text-gray-600 ml-2">({result.recordCount}件)</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(result.timestamp)}
                          </span>
                        </div>
                        
                        {result.breakdown && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">内訳: </span>
                            {Object.entries(result.breakdown).map(([key, value], idx) => (
                              <span key={idx} className="mr-3">
                                {key}: {value}件
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {result.error && (
                          <p className="text-red-600 text-sm mt-1">エラー: {result.error}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                // 個別同期の場合
                <div>
                  <div className="flex items-center space-x-4 mb-2">
                    <p className={`text-sm ${lastSyncResult.success ? 'text-green-600' : 'text-red-600'}`}>
                      {lastSyncResult.success ? '✅' : '❌'} {lastSyncResult.dataType}
                    </p>
                    <span className="text-sm text-gray-600">
                      {lastSyncResult.recordCount}件 | {formatDate(lastSyncResult.timestamp)}
                    </span>
                  </div>
                  
                  {lastSyncResult.breakdown && (
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">内訳: </span>
                      {Object.entries(lastSyncResult.breakdown).map(([key, value], idx) => (
                        <span key={idx} className="mr-3">
                          {key}: {value}件
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500">
                    📁 ファイル: {lastSyncResult.filePath.replace(process.cwd?.() || '', '').replace(/^\//, '')}
                  </p>
                  
                  {lastSyncResult.error && (
                    <p className="text-red-600 text-sm mt-2">エラー: {lastSyncResult.error}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 使用方法 */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">使用方法</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• データベース設定を変更した後、該当する同期ボタンを押してください</li>
              <li>• 通常は「全データ一括同期」で全ての情報を一度に更新できます</li>
              <li>• フォールバックファイルはデータベースエラー時の代替データとして使用されます</li>
              <li>• 定期的な同期により、最新のデータベース状態を保持できます</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}