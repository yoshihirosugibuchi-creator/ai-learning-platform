'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useXPStats } from '@/hooks/useXPStats'
import XPStatsCard from '@/components/xp/XPStatsCard'
import { useAuth } from '@/components/auth/AuthProvider'
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Activity,
  Database,
  Shield,
  TrendingUp
} from 'lucide-react'

// XP検証データの詳細型定義
interface CategoryBreakdown {
  category_id: string
  category_name: string
  raw_xp_total: number
  stats_xp_total: number
  is_consistent: boolean
  quiz_answers_count: number
  course_answers_count: number
}

interface SubcategoryBreakdown {
  subcategory_id: string
  subcategory_name: string
  category_id: string
  raw_xp_total: number
  stats_xp_total: number
  is_consistent: boolean
  quiz_answers_count: number
  course_answers_count: number
}

interface QuizSessionRecord {
  id: string
  total_xp: number
  bonus_xp: number
  status: string
  created_at: string
}

interface CourseSessionRecord {
  id: string
  session_id: string
  earned_xp: number
  is_first_completion: boolean
  created_at: string
}

interface AnswerRecord {
  id: string
  session_type: string
  quiz_session_id?: string
  course_session_id?: string
  earned_xp: number
  is_correct: boolean
  category_id: string
  subcategory_id: string
  created_at: string
}

interface AdminXPVerification {
  quiz_sessions_count: number
  course_completions_count: number
  unified_answers_count: number
  quiz_answers_count: number
  course_confirmation_count: number
  raw_xp_total: number
  stats_xp_total: number
  xp_consistency_check: boolean
  raw_quiz_sessions: number
  stats_quiz_sessions: number
  raw_course_sessions: number
  stats_course_sessions: number
  sessions_consistency_check: boolean
  raw_total_answers: number
  stats_total_answers: number
  raw_correct_answers: number
  stats_correct_answers: number
  answers_consistency_check: boolean
  category_breakdown: CategoryBreakdown[]
  category_consistency_issues: number
  subcategory_breakdown: SubcategoryBreakdown[]
  subcategory_consistency_issues: number
  overall_health_score: number
  critical_issues: string[]
  warnings: string[]
  recent_quiz_sessions: QuizSessionRecord[]
  recent_course_sessions: CourseSessionRecord[]
  recent_answers: AnswerRecord[]
}

export default function AdminXPVerificationPage() {
  const { user, loading: authLoading } = useAuth()
  const { stats, loading, error, refetch, saveQuizSession, saveCourseSession } = useXPStats()
  const [testResults, setTestResults] = useState<string[]>([])
  const [verificationData, setVerificationData] = useState<AdminXPVerification | null>(null)
  const [verificationLoading, setVerificationLoading] = useState(false)

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${result}`])
  }

  const handleVerificationScan = async () => {
    setVerificationLoading(true)
    addTestResult('🔍 包括的XPシステム検証開始...')
    
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      
      if (!session?.access_token) {
        addTestResult('❌ 認証トークンが取得できません')
        return
      }

      const response = await fetch('/api/admin/xp-verification', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      const result = await response.json()
      
      if (result.error) {
        addTestResult(`❌ 検証エラー: ${result.error}`)
        return
      }
      
      setVerificationData(result)
      addTestResult(`✅ 包括的検証完了 - 健全性スコア: ${result.overall_health_score}%`)
      
      if (result.critical_issues.length > 0) {
        result.critical_issues.forEach((issue: string) => {
          addTestResult(`🚨 重要な問題: ${issue}`)
        })
      }
      
      if (result.warnings.length > 0) {
        result.warnings.forEach((warning: string) => {
          addTestResult(`⚠️  警告: ${warning}`)
        })
      }
      
    } catch (error) {
      addTestResult(`❌ 検証エラー: ${error}`)
    }
    
    setVerificationLoading(false)
  }

  const handleTestQuizSession = async () => {
    addTestResult('🎯 テストクイズセッション開始...')
    
    const testQuizData = {
      user_id: user?.id || 'test-user',
      category_id: 'thinking',
      subcategory_id: 'logical_thinking',
      session_start_time: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      session_end_time: new Date().toISOString(),
      total_questions: 3,
      correct_answers: 2,
      accuracy_rate: 66.67,
      answers: [
        {
          question_id: 'test_q1_' + Date.now(),
          user_answer: 1,
          is_correct: true,
          time_spent: 30,
          is_timeout: false,
          category_id: 'thinking',
          subcategory_id: 'logical_thinking',
          difficulty: 'intermediate'
        },
        {
          question_id: 'test_q2_' + Date.now(),
          user_answer: 2,
          is_correct: false,
          time_spent: 45,
          is_timeout: false,
          category_id: 'thinking',
          subcategory_id: 'logical_thinking',
          difficulty: 'basic'
        },
        {
          question_id: 'test_q3_' + Date.now(),
          user_answer: 3,
          is_correct: true,
          time_spent: 25,
          is_timeout: false,
          category_id: 'thinking',
          subcategory_id: 'creative_thinking',
          difficulty: 'advanced'
        }
      ]
    }

    try {
      const result = await saveQuizSession(testQuizData)
      if (result.success) {
        addTestResult(`✅ クイズセッション保存成功: ${result.total_xp}XP獲得, ボーナス: ${result.bonus_xp}XP`)
      } else {
        addTestResult(`❌ クイズセッション保存失敗: ${result.error}`)
      }
    } catch (error) {
      addTestResult(`❌ クイズセッション保存エラー: ${error}`)
    }
  }

  const handleTestCourseSession = async () => {
    addTestResult('📚 テストコース学習セッション開始...')
    
    const testCourseData = {
      session_id: 'test_session_' + Date.now(),
      course_id: 'test_course',
      theme_id: 'test_theme',
      genre_id: 'test_genre',
      category_id: 'thinking',
      subcategory_id: 'logical_thinking',
      session_quiz_correct: true,
      is_first_completion: true
    }

    try {
      const result = await saveCourseSession(testCourseData)
      if (result.success) {
        addTestResult(`✅ コース学習セッション保存成功: ${result.earned_xp}XP獲得`)
      } else {
        addTestResult(`❌ コース学習セッション保存失敗: ${result.error}`)
      }
    } catch (error) {
      addTestResult(`❌ コース学習セッション保存エラー: ${error}`)
    }
  }

  if (authLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="animate-pulse text-center">認証状態を確認中...</div>
        </CardContent>
      </Card>
    )
  }

  const getHealthBadgeVariant = (score: number) => {
    if (score >= 90) return "default"
    if (score >= 70) return "secondary" 
    if (score >= 50) return "destructive"
    return "destructive"
  }

  const getConsistencyIcon = (isConsistent: boolean) => {
    return isConsistent ? 
      <CheckCircle className="h-4 w-4 text-green-600" /> : 
      <XCircle className="h-4 w-4 text-red-600" />
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center">
          <Shield className="h-6 w-6 mr-2 text-blue-600" />
          XPシステム検証
        </h1>
        <p className="text-gray-600">
          統合XPシステムの包括的な検証とデータ整合性チェックを実行します。
          {!user && '（ログインが必要です）'}
        </p>
      </div>

        {!user ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500">管理者ツールを使用するにはログインが必要です。</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="verification" className="space-y-6">
            <TabsList>
              <TabsTrigger value="verification">システム検証</TabsTrigger>
              <TabsTrigger value="stats">統計表示</TabsTrigger>
              <TabsTrigger value="test">動作テスト</TabsTrigger>
              <TabsTrigger value="debug">デバッグ情報</TabsTrigger>
            </TabsList>

            <TabsContent value="verification" className="space-y-6">
              {/* 検証コントロールパネル */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    システム検証コントロール
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Button 
                      onClick={handleVerificationScan}
                      disabled={verificationLoading}
                      className="flex items-center"
                    >
                      <Database className="h-4 w-4 mr-2" />
                      {verificationLoading ? '検証中...' : '包括的システム検証'}
                    </Button>
                    <Button onClick={() => refetch()} variant="outline">
                      🔄 統計更新
                    </Button>
                    <Button 
                      onClick={() => setTestResults([])} 
                      variant="outline"
                      size="sm"
                    >
                      🧹 ログクリア
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* 検証結果サマリー */}
              {verificationData && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">システム健全性</p>
                          <p className="text-2xl font-bold">{verificationData.overall_health_score}%</p>
                        </div>
                        <Badge variant={getHealthBadgeVariant(verificationData.overall_health_score)}>
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {verificationData.overall_health_score >= 90 ? '良好' : 
                           verificationData.overall_health_score >= 70 ? '注意' : '要対応'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">重要な問題</p>
                          <p className="text-2xl font-bold text-red-600">{verificationData.critical_issues.length}</p>
                        </div>
                        <XCircle className="h-6 w-6 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">警告</p>
                          <p className="text-2xl font-bold text-yellow-600">{verificationData.warnings.length}</p>
                        </div>
                        <AlertTriangle className="h-6 w-6 text-yellow-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">統一回答ログ</p>
                          <p className="text-2xl font-bold">{verificationData.unified_answers_count}</p>
                        </div>
                        <Database className="h-6 w-6 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 詳細検証結果 */}
              {verificationData && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* データ整合性チェック */}
                  <Card>
                    <CardHeader>
                      <CardTitle>データ整合性チェック</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>XP合計</span>
                        <div className="flex items-center gap-2">
                          {getConsistencyIcon(verificationData.xp_consistency_check)}
                          <span className="text-sm">
                            生データ: {verificationData.raw_xp_total} | 統計: {verificationData.stats_xp_total}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>セッション数</span>
                        <div className="flex items-center gap-2">
                          {getConsistencyIcon(verificationData.sessions_consistency_check)}
                          <span className="text-sm">
                            Q: {verificationData.raw_quiz_sessions}/{verificationData.stats_quiz_sessions} | 
                            C: {verificationData.raw_course_sessions}/{verificationData.stats_course_sessions}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>回答数</span>
                        <div className="flex items-center gap-2">
                          {getConsistencyIcon(verificationData.answers_consistency_check)}
                          <span className="text-sm">
                            総数: {verificationData.raw_total_answers}/{verificationData.stats_total_answers} | 
                            正答: {verificationData.raw_correct_answers}/{verificationData.stats_correct_answers}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* セッション種別内訳 */}
                  <Card>
                    <CardHeader>
                      <CardTitle>セッション種別内訳</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>クイズセッション</span>
                        <Badge variant="outline">{verificationData.quiz_sessions_count}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>コース学習セッション</span>
                        <Badge variant="outline">{verificationData.course_completions_count}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>クイズ回答ログ</span>
                        <Badge variant="outline">{verificationData.quiz_answers_count}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>コース確認クイズログ</span>
                        <Badge variant="outline">{verificationData.course_confirmation_count}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* 問題・警告一覧 */}
              {verificationData && (verificationData.critical_issues.length > 0 || verificationData.warnings.length > 0) && (
                <div className="space-y-4">
                  {verificationData.critical_issues.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-red-600 flex items-center">
                          <XCircle className="h-5 w-5 mr-2" />
                          重要な問題 ({verificationData.critical_issues.length}件)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {verificationData.critical_issues.map((issue, index) => (
                            <li key={index} className="flex items-start gap-2 text-red-700">
                              <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {verificationData.warnings.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-yellow-600 flex items-center">
                          <AlertTriangle className="h-5 w-5 mr-2" />
                          警告 ({verificationData.warnings.length}件)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {verificationData.warnings.map((warning, index) => (
                            <li key={index} className="flex items-start gap-2 text-yellow-700">
                              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span>{warning}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* 実行ログ */}
              {testResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>実行ログ</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={testResults.join('\n')}
                      readOnly
                      className="h-32 font-mono text-sm"
                      placeholder="検証結果がここに表示されます..."
                    />
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="stats" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <XPStatsCard showDetailedStats={false} deferLoading={false} />
                <XPStatsCard showDetailedStats={true} deferLoading={false} />
              </div>
            </TabsContent>

            <TabsContent value="test" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>API機能テスト</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleTestQuizSession}>
                      🎯 テストクイズ実行
                    </Button>
                    <Button onClick={handleTestCourseSession}>
                      📚 テストコース学習実行
                    </Button>
                    <Button onClick={() => refetch()} variant="outline">
                      🔄 統計更新
                    </Button>
                  </div>
                  
                  {testResults.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-2">テスト実行ログ:</h4>
                      <Textarea
                        value={testResults.join('\n')}
                        readOnly
                        className="h-32 font-mono text-sm"
                        placeholder="テスト実行結果がここに表示されます..."
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="debug" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>デバッグ情報</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Badge variant={user ? "default" : "destructive"}>
                        認証: {user ? "ログイン済み" : "未ログイン"}
                      </Badge>
                    </div>
                    <div>
                      <Badge variant={loading ? "secondary" : "default"}>
                        読み込み: {loading ? "中" : "完了"}
                      </Badge>
                    </div>
                    <div>
                      <Badge variant={error ? "destructive" : "default"}>
                        エラー: {error ? "あり" : "なし"}
                      </Badge>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <strong>エラー詳細:</strong>
                      <pre className="text-sm mt-1">{error}</pre>
                    </div>
                  )}

                  {stats && (
                    <div className="bg-gray-50 rounded p-3">
                      <strong>統計データ概要:</strong>
                      <pre className="text-sm mt-1 overflow-x-auto">
                        {JSON.stringify({
                          totalXP: stats.user.total_xp,
                          quizXP: stats.user.quiz_xp,
                          courseXP: stats.user.course_xp,
                          categoriesCount: Object.keys(stats.categories).length,
                          subcategoriesCount: Object.keys(stats.subcategories).length,
                          recentActivityDays: stats.recent_activity.length
                        }, null, 2)}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
    </div>
  )
}