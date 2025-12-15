'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SimpleSelect, SimpleSelectItem } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import IndustryRadarChart from './IndustryRadarChart'
import IndustryProgressBar from './IndustryProgressBar'
import { type IndustryAnalysisData } from '@/lib/industry-xp-analytics'
import { industryCategories } from '@/lib/categories'
import { Building2, TrendingUp, Target, AlertCircle, RefreshCw } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/lib/supabase'

interface IndustryAnalysisPageProps {
  refreshTrigger?: number
}

export default function IndustryAnalysisPage({ refreshTrigger = 0 }: IndustryAnalysisPageProps) {
  const { user } = useAuth()
  const [selectedIndustry, setSelectedIndustry] = useState<string>('')
  const [selectedLevel, setSelectedLevel] = useState<'basic' | 'intermediate' | 'advanced' | 'expert'>('basic')
  const [analysisData, setAnalysisData] = useState<IndustryAnalysisData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // XPがある業界のみを選択肢として表示
  const availableIndustries = analysisData.map(data => {
    const category = industryCategories.find(cat => cat.id === data.industryId)
    return {
      id: data.industryId,
      name: data.industryName,
      icon: category?.icon || '🏢',
      totalXP: data.totalXP
    }
  })

  // データ読み込み
  const loadAnalysisData = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      console.log('📊 Loading industry analysis...', { selectedIndustry, selectedLevel })
      
      // 認証トークンを取得
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }
      
      // APIエンドポイントを呼び出し
      const params = new URLSearchParams({
        level: selectedLevel
      })
      if (selectedIndustry) {
        params.append('industry_id', selectedIndustry)
      }
      
      const response = await fetch(`/api/analytics/industry-analysis?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }
      
      const result = await response.json()
      if (!result.success) {
        throw new Error(result.details || 'Failed to fetch analysis data')
      }
      
      const data = result.data

      console.log('✅ Analysis data loaded:', data.length, 'industries')
      console.log('📊 Analysis data details:', data)
      setAnalysisData(data)

      // 初期表示は「全業界」のまま維持

    } catch (err) {
      console.error('❌ Error loading analysis data:', err)
      setError(err instanceof Error ? err.message : '分析データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }, [user, selectedIndustry, selectedLevel])

  // 初期データ読み込み
  useEffect(() => {
    loadAnalysisData()
  }, [user, selectedLevel, loadAnalysisData])

  // 業界変更時のデータ再読み込み
  useEffect(() => {
    if (selectedIndustry) {
      loadAnalysisData()
    }
  }, [selectedIndustry, loadAnalysisData])

  // 外部からの更新トリガー
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadAnalysisData()
    }
  }, [refreshTrigger, loadAnalysisData])

  // 選択された業界のデータを取得
  const currentIndustryData = analysisData.find(data => data.industryId === selectedIndustry)

  // 業界がない場合の表示
  if (!user) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">ログインが必要です</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center space-x-2">
          <Building2 className="h-6 w-6" />
          <span>業界別スキル分析</span>
        </h1>
        <p className="text-gray-600 mt-1">業界特化スキルの習得状況を分析します</p>
      </div>

      {/* コントロールパネル */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>分析設定</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 業界選択 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">業界選択</label>
              <SimpleSelect
                value={selectedIndustry}
                onValueChange={setSelectedIndustry}
                className="w-full"
              >
                <SimpleSelectItem value="">全業界</SimpleSelectItem>
                {availableIndustries.map((industry) => (
                  <SimpleSelectItem key={industry.id} value={industry.id}>
                    {industry.icon} {industry.name} (XP: {industry.totalXP})
                  </SimpleSelectItem>
                ))}
              </SimpleSelect>
              {analysisData.length > 0 && (
                <p className="text-xs text-gray-500">
                  XPデータがある業界: {analysisData.length}件
                </p>
              )}
            </div>

            {/* レベル選択 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">目標レベル</label>
              <SimpleSelect
                value={selectedLevel}
                onValueChange={(value: string) => setSelectedLevel(value as typeof selectedLevel)}
                className="w-full"
              >
                <SimpleSelectItem value="basic">🌱 Basic (基礎)</SimpleSelectItem>
                <SimpleSelectItem value="intermediate">📈 Intermediate (中級)</SimpleSelectItem>
                <SimpleSelectItem value="advanced">🎯 Advanced (上級)</SimpleSelectItem>
                <SimpleSelectItem value="expert">👑 Expert (専門家)</SimpleSelectItem>
              </SimpleSelect>
              <p className="text-xs text-gray-500">
                選択したレベルの目標XPで分析します
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* エラー表示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ローディング表示 */}
      {loading && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
              <p className="text-gray-600">分析データを読み込んでいます...</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* メインコンテンツ */}
      {!loading && (
        <>
          {/* データがない場合 */}
          {analysisData.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">業界別データがありません</h3>
                <p className="text-gray-600 mb-4">
                  業界特化カテゴリーで学習を開始すると、分析データが表示されます。<br />
                  まずは技術・IT、AI・機械学習、デジタルマーケティングなどの業界カテゴリーから始めてみましょう。
                </p>
                <div className="space-y-2">
                  <Button variant="outline" onClick={() => window.location.href = '/categories'}>
                    📚 学習カテゴリー一覧へ
                  </Button>
                  <p className="text-xs text-gray-500">
                    💡 ヒント: クイズに答えてXPを獲得すると、業界別スキル分析が利用できるようになります
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 業界別分析データ表示 */}
          {analysisData.length > 0 && (
            <>
              {/* 選択された業界の詳細分析 */}
              {currentIndustryData && (
                <Tabs defaultValue="radar" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="radar" className="flex items-center space-x-2">
                      <span>📊</span>
                      <span>レーダーチャート</span>
                    </TabsTrigger>
                    <TabsTrigger value="progress" className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>詳細進捗</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="radar" className="space-y-4">
                    <IndustryRadarChart
                      industryData={currentIndustryData}
                      selectedLevel={selectedLevel}
                      showComparison={true}
                    />
                  </TabsContent>

                  <TabsContent value="progress" className="space-y-4">
                    <IndustryProgressBar
                      industryData={currentIndustryData}
                      selectedLevel={selectedLevel}
                      onSubcategoryClick={(subcategoryId) => {
                        console.log('Subcategory clicked:', subcategoryId)
                        // TODO: サブカテゴリー詳細ページへの遷移
                      }}
                    />
                  </TabsContent>
                </Tabs>
              )}

              {/* 全業界サマリー（業界が選択されていない場合） */}
              {!selectedIndustry && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {analysisData.map((industryData) => (
                    <Card
                      key={industryData.industryId}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => setSelectedIndustry(industryData.industryId)}
                    >
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="text-lg">{industryData.industryName}</span>
                          <Badge variant="outline">
                            {industryData.overallProgressPercentage}%
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>総XP:</span>
                            <span className="font-semibold">{industryData.totalXP}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>分析項目:</span>
                            <span className="font-semibold">{industryData.subcategoryStats.length}件</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>レーダー表示:</span>
                            <span className="font-semibold">
                              {industryData.subcategoryStats.filter(s => s.displayInRadar).length}件
                            </span>
                          </div>
                          <Button variant="outline" size="sm" className="w-full mt-4">
                            詳細分析を見る →
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}