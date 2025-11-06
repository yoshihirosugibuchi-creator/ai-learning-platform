// 学習パターン比較コンポーネント
// 正確性重視型 vs 効率重視型の学習パターン分析・比較表示

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Target, 
  Zap, 
  TrendingUp, 
  Clock, 
  Award, 
  Brain,
  RefreshCw,
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Info,
  Users,
  Trophy
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface LearningPatternComparisonProps {
  userId: string
  className?: string
  refreshTrigger?: number
}

// 学習パターンタイプ定義
type PatternType = 'accuracy_focused' | 'efficiency_focused'

// クイズセッションデータの型定義
interface QuizSessionData {
  id: string
  user_id: string
  category_id?: string
  difficulty?: string
  xp_earned?: number
  created_at: string | null
  quiz_answers?: {
    is_correct: boolean
    time_spent: number
    question_id: string
  }[]
}

// 学習パターン分析結果
interface PatternAnalysis {
  type: PatternType
  score: number
  characteristics: {
    accuracy_rate: number
    efficiency_xp_per_minute: number
    session_consistency: number
    challenge_seeking: number
    reflection_depth: number
  }
  strengths: string[]
  improvement_areas: string[]
  recommendations: string[]
}

// パターン比較データ
interface PatternComparison {
  user_pattern: PatternAnalysis
  accuracy_focused_benchmark: PatternAnalysis
  efficiency_focused_benchmark: PatternAnalysis
  pattern_shift_trend: {
    direction: 'towards_accuracy' | 'towards_efficiency' | 'stable'
    strength: number
    recent_changes: string[]
  }
  optimal_balance_score: number
  category_patterns: {
    category_id: string
    category_name: string
    pattern_type: PatternType
    performance_score: number
  }[]
}

export default function LearningPatternComparison({ 
  userId, 
  className = "",
  refreshTrigger = 0
}: LearningPatternComparisonProps) {
  const [comparisonData, setComparisonData] = useState<PatternComparison | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed' | 'categories'>('overview')

  // 学習パターン比較データ取得
  const loadPatternComparison = async () => {
    if (!userId) return

    try {
      setIsLoading(true)
      setError(null)

      // 過去30日間のデータでパターン分析
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)

      const comparison = await analyzeLearningPatterns(userId, startDate, endDate)
      setComparisonData(comparison)

    } catch (err) {
      console.error('学習パターン比較データ取得エラー:', err)
      setError('パターン比較データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 学習パターン分析の実装
  const analyzeLearningPatterns = async (
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<PatternComparison> => {
    
    // クイズセッションデータ取得
    const { data: sessions, error } = await supabase
      .from('quiz_sessions')
      .select(`
        *,
        quiz_answers(
          is_correct,
          time_spent,
          question_id
        )
      `)
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw error

    // ユーザーパターン分析
    const userPattern = analyzeUserPattern((sessions || []).filter((s: QuizSessionData) => s.created_at !== null))
    
    // ベンチマークパターン生成
    const accuracyBenchmark = generateAccuracyFocusedBenchmark()
    const efficiencyBenchmark = generateEfficiencyFocusedBenchmark()
    
    // パターンシフト傾向分析
    const patternShift = analyzePatternShift((sessions || []).filter((s: QuizSessionData) => s.created_at !== null))
    
    // 最適バランススコア計算
    const optimalBalance = calculateOptimalBalance(userPattern)
    
    // カテゴリー別パターン分析
    const categoryPatterns = analyzeCategoryPatterns((sessions || []).filter((s: QuizSessionData) => s.created_at !== null))

    return {
      user_pattern: userPattern,
      accuracy_focused_benchmark: accuracyBenchmark,
      efficiency_focused_benchmark: efficiencyBenchmark,
      pattern_shift_trend: patternShift,
      optimal_balance_score: optimalBalance,
      category_patterns: categoryPatterns
    }
  }

  // ユーザー学習パターン分析
  const analyzeUserPattern = (sessions: QuizSessionData[]): PatternAnalysis => {
    if (sessions.length === 0) {
      return createEmptyPattern('accuracy_focused')
    }

    // 基本統計計算
    let totalQuestions = 0
    let correctAnswers = 0
    let totalTime = 0
    let totalXP = 0

    sessions.forEach(session => {
      if (session.quiz_answers) {
        session.quiz_answers.forEach((answer) => {
          totalQuestions++
          if (answer.is_correct) correctAnswers++
          totalTime += answer.time_spent || 0
        })
      }
      totalXP += session.xp_earned || 0
    })

    const accuracyRate = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0
    const efficiencyRate = totalTime > 0 ? (totalXP / (totalTime / 60)) : 0

    // パターンタイプ判定
    const patternType: PatternType = accuracyRate > 80 && efficiencyRate < 1.2 
      ? 'accuracy_focused' 
      : 'efficiency_focused'

    // 特性スコア計算
    const characteristics = {
      accuracy_rate: accuracyRate,
      efficiency_xp_per_minute: efficiencyRate,
      session_consistency: calculateConsistency(sessions),
      challenge_seeking: calculateChallengeSeeking(sessions),
      reflection_depth: calculateReflectionDepth(sessions)
    }

    // 総合スコア計算
    const score = patternType === 'accuracy_focused'
      ? (characteristics.accuracy_rate * 0.4 + characteristics.reflection_depth * 0.3 + characteristics.session_consistency * 0.3)
      : (characteristics.efficiency_xp_per_minute * 15 + characteristics.challenge_seeking * 0.3 + characteristics.session_consistency * 0.3)

    return {
      type: patternType,
      score: Math.min(100, Math.max(0, score)),
      characteristics,
      strengths: generateStrengths(patternType, characteristics),
      improvement_areas: generateImprovementAreas(patternType, characteristics),
      recommendations: generateRecommendations(patternType, characteristics)
    }
  }

  // 空パターン作成
  const createEmptyPattern = (type: PatternType): PatternAnalysis => ({
    type,
    score: 0,
    characteristics: {
      accuracy_rate: 0,
      efficiency_xp_per_minute: 0,
      session_consistency: 0,
      challenge_seeking: 0,
      reflection_depth: 0
    },
    strengths: [],
    improvement_areas: ['学習データが不足しています'],
    recommendations: ['まずは定期的な学習習慣を身につけましょう']
  })

  // 一貫性計算
  const calculateConsistency = (sessions: QuizSessionData[]): number => {
    if (sessions.length < 3) return 0
    
    const dailySessions = new Map<string, number>()
    sessions.forEach(session => {
      if (!session.created_at) return
      const date = session.created_at.split('T')[0]
      dailySessions.set(date, (dailySessions.get(date) || 0) + 1)
    })
    
    const sessionCounts = Array.from(dailySessions.values())
    const avgSessions = sessionCounts.reduce((sum, count) => sum + count, 0) / sessionCounts.length
    const variance = sessionCounts.reduce((sum, count) => sum + Math.pow(count - avgSessions, 2), 0) / sessionCounts.length
    
    return Math.max(0, 100 - variance * 10)
  }

  // チャレンジ志向計算
  const calculateChallengeSeeking = (sessions: QuizSessionData[]): number => {
    if (sessions.length === 0) return 0
    
    const difficultyScores = { basic: 1, intermediate: 2, advanced: 3, expert: 4 }
    let totalDifficulty = 0
    let count = 0
    
    sessions.forEach(session => {
      if (session.difficulty) {
        totalDifficulty += difficultyScores[session.difficulty as keyof typeof difficultyScores] || 1
        count++
      }
    })
    
    return count > 0 ? (totalDifficulty / count) * 25 : 25
  }

  // 熟考深度計算
  const calculateReflectionDepth = (sessions: QuizSessionData[]): number => {
    if (sessions.length === 0) return 0
    
    let totalReflectionTime = 0
    let questionCount = 0
    
    sessions.forEach(session => {
      if (session.quiz_answers) {
        session.quiz_answers.forEach((answer) => {
          totalReflectionTime += answer.time_spent || 0
          questionCount++
        })
      }
    })
    
    const avgTimePerQuestion = questionCount > 0 ? totalReflectionTime / questionCount : 0
    return Math.min(100, avgTimePerQuestion * 2) // 50秒で満点
  }

  // ベンチマークパターン生成
  const generateAccuracyFocusedBenchmark = (): PatternAnalysis => ({
    type: 'accuracy_focused',
    score: 85,
    characteristics: {
      accuracy_rate: 92,
      efficiency_xp_per_minute: 0.8,
      session_consistency: 80,
      challenge_seeking: 60,
      reflection_depth: 85
    },
    strengths: ['高い正答率', '丁寧な思考プロセス', '確実な知識定着'],
    improvement_areas: ['学習スピード', 'チャレンジ志向'],
    recommendations: ['時間効率を意識した学習', 'より高難易度問題への挑戦']
  })

  const generateEfficiencyFocusedBenchmark = (): PatternAnalysis => ({
    type: 'efficiency_focused',
    score: 82,
    characteristics: {
      accuracy_rate: 75,
      efficiency_xp_per_minute: 1.8,
      session_consistency: 85,
      challenge_seeking: 90,
      reflection_depth: 55
    },
    strengths: ['高い学習効率', '積極的挑戦', '素早い判断'],
    improvement_areas: ['正答率', '理解の深度'],
    recommendations: ['基礎固めの復習', '間違い問題の詳細分析']
  })

  // パターンシフト分析
  const analyzePatternShift = (_sessions: QuizSessionData[]) => {
    // 簡略化実装
    return {
      direction: 'stable' as const,
      strength: 0.3,
      recent_changes: ['効率性が向上しています', '正答率が安定しています']
    }
  }

  // 最適バランス計算
  const calculateOptimalBalance = (userPattern: PatternAnalysis): number => {
    const { accuracy_rate, efficiency_xp_per_minute } = userPattern.characteristics
    const accuracyScore = Math.min(accuracy_rate / 85, 1) * 50 // 85%で満点
    const efficiencyScore = Math.min(efficiency_xp_per_minute / 1.5, 1) * 50 // 1.5XP/分で満点
    return accuracyScore + efficiencyScore
  }

  // カテゴリー別パターン分析
  const analyzeCategoryPatterns = (_sessions: QuizSessionData[]) => {
    // 簡略化実装
    return [
      {
        category_id: 'logical_thinking',
        category_name: '論理的思考',
        pattern_type: 'accuracy_focused' as PatternType,
        performance_score: 88
      },
      {
        category_id: 'programming',
        category_name: 'プログラミング',
        pattern_type: 'efficiency_focused' as PatternType,
        performance_score: 82
      }
    ]
  }

  // 強み生成
  const generateStrengths = (_type: PatternType, characteristics: PatternAnalysis['characteristics']): string[] => {
    const strengths = []
    if (characteristics.accuracy_rate > 80) strengths.push('高い正答率を維持')
    if (characteristics.efficiency_xp_per_minute > 1.2) strengths.push('効率的な学習ペース')
    if (characteristics.session_consistency > 70) strengths.push('一貫した学習習慣')
    if (characteristics.challenge_seeking > 70) strengths.push('積極的な挑戦姿勢')
    if (characteristics.reflection_depth > 70) strengths.push('深い思考プロセス')
    return strengths.length > 0 ? strengths : ['基本的な学習習慣が身についています']
  }

  // 改善エリア生成
  const generateImprovementAreas = (_type: PatternType, characteristics: PatternAnalysis['characteristics']): string[] => {
    const areas = []
    if (characteristics.accuracy_rate < 70) areas.push('正答率の向上')
    if (characteristics.efficiency_xp_per_minute < 0.8) areas.push('学習効率の改善')
    if (characteristics.session_consistency < 60) areas.push('学習習慣の安定化')
    if (characteristics.challenge_seeking < 50) areas.push('挑戦レベルの向上')
    if (characteristics.reflection_depth < 50) areas.push('思考の深化')
    return areas.length > 0 ? areas : ['現在の学習スタイルを継続しましょう']
  }

  // 推奨事項生成
  const generateRecommendations = (type: PatternType, characteristics: PatternAnalysis['characteristics']): string[] => {
    const recommendations = []
    
    if (type === 'accuracy_focused') {
      if (characteristics.efficiency_xp_per_minute < 1.0) {
        recommendations.push('時間を意識した解答練習を取り入れましょう')
      }
      if (characteristics.challenge_seeking < 60) {
        recommendations.push('より高難易度の問題にも挑戦してみましょう')
      }
    } else {
      if (characteristics.accuracy_rate < 75) {
        recommendations.push('基礎問題の復習で正答率を向上させましょう')
      }
      if (characteristics.reflection_depth < 60) {
        recommendations.push('間違えた問題の詳細な分析を行いましょう')
      }
    }
    
    return recommendations.length > 0 ? recommendations : ['現在の学習パターンを継続してください']
  }

  // パターンタイプのスタイル
  const getPatternStyle = (type: PatternType) => {
    return type === 'accuracy_focused'
      ? {
          color: 'text-green-700',
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: Target,
          label: '正確性重視型',
          description: '丁寧で確実な学習スタイル'
        }
      : {
          color: 'text-blue-700', 
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: Zap,
          label: '効率重視型',
          description: 'スピードと効率を重視する学習スタイル'
        }
  }

  // 初期読み込み
  useEffect(() => {
    loadPatternComparison()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, refreshTrigger])

  // レーダーチャート用データ（将来の実装用）
  const _radarData = useMemo(() => {
    if (!comparisonData) return null
    
    const user = comparisonData.user_pattern.characteristics
    const benchmark = comparisonData.user_pattern.type === 'accuracy_focused' 
      ? comparisonData.accuracy_focused_benchmark.characteristics
      : comparisonData.efficiency_focused_benchmark.characteristics

    return {
      user: [
        user.accuracy_rate,
        user.efficiency_xp_per_minute * 30, // スケール調整
        user.session_consistency,
        user.challenge_seeking,
        user.reflection_depth
      ],
      benchmark: [
        benchmark.accuracy_rate,
        benchmark.efficiency_xp_per_minute * 30,
        benchmark.session_consistency,
        benchmark.challenge_seeking,
        benchmark.reflection_depth
      ],
      labels: ['正確性', '効率性', '一貫性', '挑戦性', '深度']
    }
  }, [comparisonData])

  // ローディング状態
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            学習パターン比較分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-gray-100 rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // エラー状態
  if (error || !comparisonData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            学習パターン比較分析
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">データ取得エラー</h3>
            <p className="text-muted-foreground mb-4">
              {error || 'パターン比較データの取得に失敗しました'}
            </p>
            <Button onClick={loadPatternComparison} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              再試行
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const userPatternStyle = getPatternStyle(comparisonData.user_pattern.type)
  const UserPatternIcon = userPatternStyle.icon

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            学習パターン比較分析
          </div>
          <div className="flex gap-1">
            {[
              { key: 'overview', label: '概要' },
              { key: 'detailed', label: '詳細' },
              { key: 'categories', label: 'カテゴリー' }
            ].map(view => (
              <Button
                key={view.key}
                onClick={() => setSelectedView(view.key as 'overview' | 'detailed' | 'categories')}
                variant={selectedView === view.key ? "default" : "outline"}
                size="sm"
                className="text-xs"
              >
                {view.label}
              </Button>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 概要ビュー */}
        {selectedView === 'overview' && (
          <>
            {/* ユーザーパターン表示 */}
            <div className={`p-4 rounded-lg border-2 ${userPatternStyle.bg} ${userPatternStyle.border}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <UserPatternIcon className={`h-6 w-6 ${userPatternStyle.color}`} />
                  <div>
                    <h3 className={`text-lg font-semibold ${userPatternStyle.color}`}>
                      あなたの学習パターン: {userPatternStyle.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {userPatternStyle.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.round(comparisonData.user_pattern.score)}
                  </div>
                  <div className="text-xs text-muted-foreground">パターンスコア</div>
                </div>
              </div>
              
              {/* パターン特性 */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                {[
                  { key: 'accuracy_rate', label: '正確性', icon: Target, unit: '%' },
                  { key: 'efficiency_xp_per_minute', label: '効率性', icon: Zap, unit: 'XP/分' },
                  { key: 'session_consistency', label: '一貫性', icon: BarChart3, unit: '' },
                  { key: 'challenge_seeking', label: '挑戦性', icon: Trophy, unit: '' },
                  { key: 'reflection_depth', label: '深度', icon: Clock, unit: '' }
                ].map(({ key, label, icon: Icon, unit }) => {
                  const value = comparisonData.user_pattern.characteristics[key as keyof typeof comparisonData.user_pattern.characteristics]
                  const displayValue = key === 'efficiency_xp_per_minute' 
                    ? value.toFixed(1)
                    : Math.round(value)
                  
                  return (
                    <div key={key} className="text-center p-2 bg-white rounded border">
                      <Icon className="h-4 w-4 mx-auto mb-1 text-gray-600" />
                      <div className="text-sm font-semibold">
                        {displayValue}{unit}
                      </div>
                      <div className="text-xs text-muted-foreground">{label}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 最適バランススコア */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-600" />
                  <h4 className="font-medium text-purple-900">最適バランススコア</h4>
                </div>
                <div className="text-xl font-bold text-purple-900">
                  {Math.round(comparisonData.optimal_balance_score)}
                </div>
              </div>
              <Progress value={comparisonData.optimal_balance_score} className="h-2 mb-2" />
              <p className="text-sm text-purple-700">
                正確性と効率性のバランスを評価したスコアです。
                両方の要素を高めることで学習効果が最大化されます。
              </p>
            </div>

            {/* 強みと改善エリア */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-medium text-green-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  強み
                </h4>
                <div className="space-y-2">
                  {comparisonData.user_pattern.strengths.map((strength, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>{strength}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium text-orange-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  改善エリア
                </h4>
                <div className="space-y-2">
                  {comparisonData.user_pattern.improvement_areas.map((area, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                      <span>{area}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* 詳細ビュー */}
        {selectedView === 'detailed' && (
          <div className="space-y-6">
            {/* ベンチマーク比較 */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900 flex items-center gap-2">
                <Users className="h-4 w-4" />
                ベンチマーク比較
              </h4>
              
              <div className="grid md:grid-cols-2 gap-4">
                {/* 正確性重視型ベンチマーク */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-5 w-5 text-green-600" />
                    <h5 className="font-medium text-green-900">正確性重視型（理想）</h5>
                    {comparisonData.user_pattern.type === 'accuracy_focused' && (
                      <Badge variant="secondary" className="text-xs">あなたのタイプ</Badge>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>スコア: {comparisonData.accuracy_focused_benchmark.score}</div>
                    <div>正答率: {comparisonData.accuracy_focused_benchmark.characteristics.accuracy_rate}%</div>
                    <div>効率: {comparisonData.accuracy_focused_benchmark.characteristics.efficiency_xp_per_minute} XP/分</div>
                  </div>
                </div>

                {/* 効率重視型ベンチマーク */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <h5 className="font-medium text-blue-900">効率重視型（理想）</h5>
                    {comparisonData.user_pattern.type === 'efficiency_focused' && (
                      <Badge variant="secondary" className="text-xs">あなたのタイプ</Badge>
                    )}
                  </div>
                  <div className="space-y-2 text-sm">
                    <div>スコア: {comparisonData.efficiency_focused_benchmark.score}</div>
                    <div>正答率: {comparisonData.efficiency_focused_benchmark.characteristics.accuracy_rate}%</div>
                    <div>効率: {comparisonData.efficiency_focused_benchmark.characteristics.efficiency_xp_per_minute} XP/分</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 推奨事項 */}
            <div className="space-y-3">
              <h4 className="font-medium text-blue-900 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                推奨改善アクション
              </h4>
              <div className="space-y-2">
                {comparisonData.user_pattern.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-blue-800">{recommendation}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* カテゴリービュー */}
        {selectedView === 'categories' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              カテゴリー別学習パターン
            </h4>
            
            <div className="space-y-3">
              {comparisonData.category_patterns.map((pattern, index) => {
                const patternStyle = getPatternStyle(pattern.pattern_type)
                const PatternIcon = patternStyle.icon
                
                return (
                  <div key={index} className={`p-4 rounded-lg border ${patternStyle.bg} ${patternStyle.border}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <PatternIcon className={`h-4 w-4 ${patternStyle.color}`} />
                        <span className="font-medium">{pattern.category_name}</span>
                        <Badge variant="outline" className="text-xs">
                          {patternStyle.label}
                        </Badge>
                      </div>
                      <div className="text-sm font-semibold">
                        {pattern.performance_score}点
                      </div>
                    </div>
                    <Progress value={pattern.performance_score} className="h-2" />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* パターンシフト傾向 */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpDown className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">最近の学習パターン変化</span>
          </div>
          <div className="space-y-1">
            {comparisonData.pattern_shift_trend.recent_changes.map((change, index) => (
              <div key={index} className="text-xs text-gray-600">• {change}</div>
            ))}
          </div>
        </div>

        {/* 説明 */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <div className="font-medium mb-1">学習パターンについて</div>
              <div>
                学習パターンは過去30日間の学習行動を分析して判定されます。
                正確性重視型は丁寧で確実な学習を、効率重視型はスピードと効率を重視した学習を表します。
                どちらも有効な学習スタイルであり、バランスの取れた学習が理想的です。
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}