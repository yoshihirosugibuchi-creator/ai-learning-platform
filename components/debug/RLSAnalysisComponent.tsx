'use client'

import React, { useState, useCallback } from 'react'
import { useAuth } from '@/components/auth/AuthProvider'

interface TableInfo {
  table_name: string
  rls_enabled: boolean | null
  rls_status: string
  exists?: boolean
}

interface PolicyInfo {
  schemaname: string
  tablename: string
  policyname: string
  permissive: string
  roles: string[]
  cmd: string
  qual: string
  with_check: string
}

interface ColumnInfo {
  table_name: string
  column_name: string
  data_type: string
  is_nullable: string
}

interface RLSAnalysisData {
  tables: TableInfo[]
  policies: PolicyInfo[]
  columns: ColumnInfo[]
  note?: string
  error?: string
}

export default function RLSAnalysisComponent() {
  const { user } = useAuth()
  const [data, setData] = useState<RLSAnalysisData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const directAuthenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!user?.id) {
      throw new Error('ユーザー認証が必要です')
    }

    // Supabaseセッションからアクセストークン取得
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const freshClient = createClient(supabaseUrl, anonKey)
    
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
  }, [user?.id])

  const analyzeRLS = async () => {
    if (!user?.id) {
      setError('ユーザー認証が必要です')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await directAuthenticatedFetch('/api/debug/rls-analysis')
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
      } else {
        throw new Error(result.error || 'データ取得に失敗しました')
      }
    } catch (err) {
      console.error('RLS分析エラー:', err)
      setError(`エラー: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const getRiskLevel = (table: TableInfo, columns: ColumnInfo[]) => {
    const hasUserId = columns.some(col => col.table_name === table.table_name && col.column_name === 'user_id')
    const isUserTable = table.table_name.startsWith('user_') || table.table_name === 'users'
    const isTransactionTable = ['quiz_sessions', 'quiz_answers', 'daily_xp_records', 'skp_transactions', 'course_session_completions'].includes(table.table_name)
    
    if (hasUserId || isUserTable || isTransactionTable) {
      if (table.rls_enabled === false || table.rls_status === 'Disabled') {
        return 'HIGH'
      } else if (table.rls_enabled === null || table.rls_status === 'Unknown') {
        return 'MEDIUM'
      } else {
        return 'LOW'
      }
    } else {
      // マスタデータテーブル
      if (table.rls_enabled === true || table.rls_status === 'Enabled') {
        return 'MEDIUM' // マスタデータはRLS不要の場合が多い
      } else {
        return 'LOW'
      }
    }
  }

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'HIGH': return 'text-red-600 bg-red-50'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50'
      case 'LOW': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          RLS (Row Level Security) 設定分析
        </h1>
        <p className="text-gray-600">
          Supabaseデータベースの全テーブルのRLS設定状況を調査します
        </p>
      </div>

      <div className="mb-6">
        <button
          onClick={analyzeRLS}
          disabled={loading || !user?.id}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '分析中...' : 'RLS分析実行'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 font-medium">エラー</p>
          <p className="text-red-500 mt-1">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-8">
          {data.note && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-700 font-medium">注意</p>
              <p className="text-yellow-600 mt-1">{data.note}</p>
            </div>
          )}

          {/* テーブル一覧とRLS設定状況 */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              テーブル一覧とRLS設定状況 ({data.tables.length}件)
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      テーブル名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RLS設定
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      user_id列
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      リスクレベル
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      テーブル分類
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.tables.map((table, index) => {
                    const hasUserId = data.columns.some(col => col.table_name === table.table_name && col.column_name === 'user_id')
                    const riskLevel = getRiskLevel(table, data.columns)
                    const isUserTable = table.table_name.startsWith('user_') || table.table_name === 'users'
                    const isTransactionTable = ['quiz_sessions', 'quiz_answers', 'daily_xp_records', 'skp_transactions', 'course_session_completions'].includes(table.table_name)
                    
                    let tableType = 'マスタデータ'
                    if (isUserTable || isTransactionTable || hasUserId) {
                      tableType = 'ユーザーデータ'
                    }

                    return (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {table.table_name}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            table.rls_status === 'Enabled' ? 'text-green-800 bg-green-100' :
                            table.rls_status === 'Disabled' ? 'text-red-800 bg-red-100' :
                            'text-gray-800 bg-gray-100'
                          }`}>
                            {table.rls_status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {hasUserId ? '✓' : '✗'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(riskLevel)}`}>
                            {riskLevel}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tableType}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* RLSポリシー一覧 */}
          {data.policies && data.policies.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                RLSポリシー一覧 ({data.policies.length}件)
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        テーブル名
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ポリシー名
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        条件
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.policies.map((policy, index) => (
                      <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {policy.tablename}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {policy.policyname}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {policy.cmd}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-500 max-w-md truncate">
                          {policy.qual}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 問題のあるテーブルの特定 */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              問題のあるテーブル
            </h2>
            <div className="space-y-4">
              {data.tables.filter(table => getRiskLevel(table, data.columns) === 'HIGH').map((table, index) => (
                <div key={index} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-red-800 bg-red-100">
                        HIGH RISK
                      </span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-red-800">
                        {table.table_name}
                      </h3>
                      <p className="text-red-600 mt-1">
                        ユーザーデータテーブルでRLSが無効です。データの権限制御が適切に行われていない可能性があります。
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {data.tables.filter(table => getRiskLevel(table, data.columns) === 'MEDIUM').map((table, index) => (
                <div key={index} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-yellow-800 bg-yellow-100">
                        MEDIUM RISK
                      </span>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-yellow-800">
                        {table.table_name}
                      </h3>
                      <p className="text-yellow-600 mt-1">
                        RLS設定状況を確認が必要です。
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {data.tables.filter(table => ['HIGH', 'MEDIUM'].includes(getRiskLevel(table, data.columns))).length === 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-green-800 bg-green-100">
                        安全
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="text-green-600">
                        明らかな問題のあるテーブルは検出されませんでした。
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}