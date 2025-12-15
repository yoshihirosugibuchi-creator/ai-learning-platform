/**
 * 管理者用AI生成コースシステム
 * 既存管理者ページと統一されたUI
 */

'use client'

import React, { useState } from 'react'
import { CourseWizard } from '@/components/ai-course-generation/CourseWizard'
import { WorkflowList } from '@/components/ai-course-generation/WorkflowList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useUserRole } from '@/hooks/useUserRole'
import { 
  Brain, 
  FileText, 
  Zap, 
  Target, 
  CheckCircle2,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Settings,
  BookOpen,
  Upload,
  Globe,
  Type,
  ArrowLeft
} from 'lucide-react'

// ワークフロー状態の型定義
export type WorkflowStatus = 
  | 'draft' 
  | 'source_analysis' 
  | 'outline_draft' 
  | 'manual_input_required'
  | 'outline_approved' 
  | 'content_draft' 
  | 'content_approved' 
  | 'published'

interface SourceMaterial {
  id: string
  type: 'pdf' | 'url' | 'text'
  title: string
  content: string
  originalUrl?: string
  fileSize?: number
  extractedAt: string
  metadata?: {
    pageCount?: number
    wordCount?: number
    language?: string
    author?: string
  }
}

interface CourseWorkflow {
  id?: string
  title: string
  description?: string
  status: WorkflowStatus
  sources?: SourceMaterial[]
  aiOutlineResponse?: string
  currentStep?: number
  created_at?: string
  updated_at?: string
}

export default function AdminAICourseGenerationPage() {
  const { toast } = useToast()
  const { isAdmin, isSystemAdmin } = useUserRole()
  const [showWizard, setShowWizard] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<CourseWorkflow | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 権限チェック
  if (!isAdmin && !isSystemAdmin) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              アクセス権限がありません
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              この機能は管理者のみ利用可能です。
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleStartCreation = () => {
    setSelectedWorkflow(null)
    setShowWizard(true)
  }

  interface WorkflowItem {
    id: string
    title: string
    description: string
    status: WorkflowStatus
    sources: SourceMaterial[]
    aiOutlineResponse?: string
    currentStep: number
    created_at: string
    updated_at: string
  }

  const handleSelectWorkflow = (workflowItem: WorkflowItem) => {
    const workflow: CourseWorkflow = {
      id: workflowItem.id,
      title: workflowItem.title,
      description: workflowItem.description,
      status: workflowItem.status,
      sources: workflowItem.sources,
      aiOutlineResponse: workflowItem.aiOutlineResponse,
      currentStep: workflowItem.currentStep,
      created_at: workflowItem.created_at,
      updated_at: workflowItem.updated_at
    }
    setSelectedWorkflow(workflow)
    setShowWizard(true)
  }

  const handleWizardComplete = (workflow: CourseWorkflow) => {
    toast({
      title: "コース作成完了！",
      description: `"${workflow.title}" が正常に作成されました`,
    })
    setShowWizard(false)
  }

  const handleWizardSave = async (workflow: CourseWorkflow) => {
    setIsLoading(true)
    try {
      // TODO: ワークフロー保存API実装
      console.log('Saving workflow:', workflow)
      
      // 模擬保存
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      toast({
        title: "ワークフロー保存完了",
        description: "下書きが保存されました",
      })
    } catch (_error) {
      toast({
        title: "保存エラー",
        description: "ワークフローの保存に失敗しました",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoBack = () => {
    setShowWizard(false)
    setSelectedWorkflow(null)
  }

  // ウィザード表示中
  if (showWizard) {
    return (
      <div className="space-y-6">
        {/* ヘッダーバー */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">AI生成コース作成</h1>
            <p className="text-muted-foreground">管理者向けコース生成ツール</p>
          </div>
          <Button variant="outline" onClick={handleGoBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            ワークフロー一覧に戻る
          </Button>
        </div>

        {/* ウィザード */}
        <CourseWizard 
          initialWorkflow={selectedWorkflow || undefined}
          onComplete={handleWizardComplete}
          onSave={handleWizardSave}
        />
      </div>
    )
  }

  // メインページ表示
  return (
    <div className="space-y-6">
      {/* ワークフロー一覧 */}
      <WorkflowList 
        onSelectWorkflow={handleSelectWorkflow}
        onNewWorkflow={handleStartCreation}
      />

      {/* 機能概要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-4 w-4 text-blue-600" />
              参考資料解析
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-3 w-3 text-gray-500" />
              <span>PDFファイル解析</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Globe className="h-3 w-3 text-gray-500" />
              <span>WebページHTML解析</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Type className="h-3 w-3 text-gray-500" />
              <span>テキスト直接入力</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Brain className="h-4 w-4 text-green-600" />
              AI自動生成
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <BookOpen className="h-3 w-3 text-gray-500" />
              <span>構造化コースアウトライン</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Settings className="h-3 w-3 text-gray-500" />
              <span>詳細学習コンテンツ</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-3 w-3 text-gray-500" />
              <span>理解度確認クイズ</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4 text-purple-600" />
              システム統合
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Zap className="h-3 w-3 text-gray-500" />
              <span>カテゴリ別学習分析</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-3 w-3 text-gray-500" />
              <span>XP・SKP自動計算</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Settings className="h-3 w-3 text-gray-500" />
              <span>学習履歴追跡</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 実装状況 */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-600" />
            実装状況 - Sprint 1: 基盤構築
          </CardTitle>
          <CardDescription>
            現在開発中の機能とテスト可能な範囲
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm">データベーススキーマ設計・作成</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm">ファイルアップロード機能（PDF、URL、テキスト）</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm">コンテンツパーサー（pdf-parse、cheerio）</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span className="text-sm">参考資料アップロードUI（ドラッグ&ドロップ）</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
                <span className="text-sm">AI統合基盤（手動・API両対応）</span>
                <Badge variant="secondary" className="ml-auto">開発中</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 bg-gray-300 rounded-full flex-shrink-0" />
                <span className="text-sm">アウトラインレビューUI</span>
                <Badge variant="outline" className="ml-auto">予定</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 bg-gray-300 rounded-full flex-shrink-0" />
                <span className="text-sm">コンテンツ生成エンジン</span>
                <Badge variant="outline" className="ml-auto">予定</Badge>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 bg-gray-300 rounded-full flex-shrink-0" />
                <span className="text-sm">既存システム統合</span>
                <Badge variant="outline" className="ml-auto">予定</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 生成フロー説明 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            AI生成フロー（6ステップ）
          </CardTitle>
          <CardDescription>
            段階的にコース全体を構築します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-blue-600 font-semibold text-sm">1</span>
              </div>
              <div className="text-xs font-medium">コース概要</div>
              <div className="text-xs text-muted-foreground">基本情報設定</div>
            </div>

            <div className="text-center">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-green-600 font-semibold text-sm">2</span>
              </div>
              <div className="text-xs font-medium">資料アップロード</div>
              <div className="text-xs text-muted-foreground">PDF・URL・テキスト</div>
            </div>

            <div className="text-center">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-purple-600 font-semibold text-sm">3</span>
              </div>
              <div className="text-xs font-medium">AIアウトライン</div>
              <div className="text-xs text-muted-foreground">構成レビュー</div>
            </div>

            <div className="text-center">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-orange-600 font-semibold text-sm">4</span>
              </div>
              <div className="text-xs font-medium">カテゴリ設定</div>
              <div className="text-xs text-muted-foreground">分析カテゴリ紐付</div>
            </div>

            <div className="text-center">
              <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-pink-600 font-semibold text-sm">5</span>
              </div>
              <div className="text-xs font-medium">コンテンツ生成</div>
              <div className="text-xs text-muted-foreground">詳細内容・クイズ</div>
            </div>

            <div className="text-center">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-emerald-600 font-semibold text-sm">6</span>
              </div>
              <div className="text-xs font-medium">公開</div>
              <div className="text-xs text-muted-foreground">コース完成</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 注意事項 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">管理者向け機能について</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>現在は手動AIモード（Claude Web Interface）でのテストが可能です</li>
                <li>参考資料アップロード機能は完全に動作します</li>
                <li>生成されたコースは既存の学習システムと完全統合されます</li>
                <li>Claude API契約後は自動生成モードに切り替え可能です</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アクション */}
      <div className="text-center">
        <Button 
          onClick={handleStartCreation}
          size="lg" 
          className="px-8 py-3"
          disabled={isLoading}
        >
          <Brain className="h-5 w-5 mr-2" />
          新しいコースの作成を開始
          <ArrowRight className="h-5 w-5 ml-2" />
        </Button>
        
        <p className="text-sm text-muted-foreground mt-2">
          現在は参考資料アップロード・AI統合基盤をテストできます
        </p>
      </div>
    </div>
  )
}