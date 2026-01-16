/**
 * コース生成完了ステップ (Step 7)
 * 生成されたコンテンツの最終確認と完了処理
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  CheckCircle2,
  Loader2,
  Package,
  BookOpen,
  FileText,
  ArrowLeft,
  PartyPopper,
  Eye,
  Calendar,
  Users
} from 'lucide-react'

interface CoursePublishStepProps {
  workflow: {
    id?: string
    title?: string
    description?: string
    published_course_id?: string
    outline_data?: {
      course?: {
        title: string
        description: string
        difficulty: string
        targetAudience: string
        learningObjectives: string[]
        estimatedDays: number
      }
      genres?: Array<{
        id: string
        title: string
        description: string
        themes: Array<{
          id: string
          title: string
          description: string
          sessions: Array<{
            id: string
            title: string
            session_type: 'knowledge' | 'practice' | 'case_study'
            estimatedMinutes: number
          }>
        }>
      }>
      approved?: boolean
    }
    content_data?: {
      generated_sessions?: string[]
      approved?: boolean
    }
    category_mappings?: Array<{
      genreId: string
      genreTitle?: string
      selectedCategoryId?: string
      selectedSubcategoryId?: string
      aiRecommendedCategoryId?: string
      aiRecommendedSubcategoryId?: string
      confidenceScore?: number
      manualOverride?: boolean
    }>
  }
  onChange: (updates: Record<string, unknown>) => void
  onPrevious: () => void
  onComplete: () => void
}

export function CoursePublishStep({
  workflow,
  onChange,
  onPrevious,
  onComplete
}: CoursePublishStepProps) {
  const { toast } = useToast()
  const [isCompleting, setIsCompleting] = useState(false)
  const [courseStats, setCourseStats] = useState({
    totalGenres: 0,
    totalThemes: 0,
    totalSessions: 0,
    totalDuration: 0,
    generatedSessions: 0
  })

  // コース統計情報の計算
  useEffect(() => {
    if (!workflow.outline_data?.genres) return

    let totalThemes = 0
    let totalSessions = 0
    let totalDuration = 0

    workflow.outline_data.genres.forEach(genre => {
      totalThemes += genre.themes.length
      genre.themes.forEach(theme => {
        totalSessions += theme.sessions.length
        theme.sessions.forEach(session => {
          totalDuration += session.estimatedMinutes
        })
      })
    })

    setCourseStats({
      totalGenres: workflow.outline_data.genres.length,
      totalThemes,
      totalSessions,
      totalDuration,
      generatedSessions: workflow.content_data?.generated_sessions?.length || 0
    })
  }, [workflow])


  // 生成完了処理
  const handleComplete = async () => {
    setIsCompleting(true)

    try {
      // ワークフローステータスを完了に更新
      onChange({
        status: 'published',
        completed_at: new Date().toISOString()
      })

      toast({
        title: "🎉 コース生成完了",
        description: "AIコースの生成が完了しました。管理画面からコースを確認できます。",
        duration: 5000
      })

      // 完了コールバック
      setTimeout(() => {
        onComplete()
      }, 1500)

    } catch (error) {
      console.error('[CoursePublishStep] 完了処理エラー:', error)
      toast({
        title: "エラー",
        description: "完了処理中にエラーが発生しました",
        variant: "destructive"
      })
    } finally {
      setIsCompleting(false)
    }
  }

  // 時間フォーマット
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}時間${mins}分` : `${mins}分`
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <PartyPopper className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-semibold mb-2">コース生成完了</h2>
        <p className="text-muted-foreground">
          AIによるコース生成が完了しました。以下の内容をご確認ください。
        </p>
      </div>

      {/* 公開済みコースID */}
      {workflow.published_course_id && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>コースID:</strong> {workflow.published_course_id}<br />
            コースは「coming_soon」状態で作成されています。管理画面から「公開」に変更できます。
          </AlertDescription>
        </Alert>
      )}

      {/* コース概要 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            コース概要
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{workflow.outline_data?.course?.title || workflow.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {workflow.outline_data?.course?.description || workflow.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm">対象: {workflow.outline_data?.course?.targetAudience || '未設定'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm">期間: {workflow.outline_data?.course?.estimatedDays || 0}日</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">難易度: {workflow.outline_data?.course?.difficulty || 'basic'}</Badge>
            <Badge variant="secondary">カテゴリマッピング: {workflow.category_mappings?.length || 0}個</Badge>
          </div>
        </CardContent>
      </Card>

      {/* コンテンツ統計 */}
      <Card>
        <CardHeader>
          <CardTitle>コンテンツ統計</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Package className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <div className="text-2xl font-bold">{courseStats.totalGenres}</div>
              <div className="text-xs text-muted-foreground">ジャンル</div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <BookOpen className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{courseStats.totalThemes}</div>
              <div className="text-xs text-muted-foreground">テーマ</div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{courseStats.totalSessions}</div>
              <div className="text-xs text-muted-foreground">セッション</div>
            </div>

            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold">{formatDuration(courseStats.totalDuration)}</div>
              <div className="text-xs text-muted-foreground">総学習時間</div>
            </div>
          </div>
        </CardContent>
      </Card>


      {/* 完了チェックリスト */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">生成完了チェック</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-green-700">アウトライン承認済み</span>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-green-700">コンテンツ生成完了</span>
          </div>

          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <span className="text-green-700">コース作成済み（coming_soon状態）</span>
          </div>
        </CardContent>
      </Card>

      {/* アクションボタン */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          前のステップ
        </Button>

        <Button
          onClick={handleComplete}
          disabled={isCompleting}
          className="min-w-[150px] bg-green-600 hover:bg-green-700"
        >
          {isCompleting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              処理中...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              生成完了
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
