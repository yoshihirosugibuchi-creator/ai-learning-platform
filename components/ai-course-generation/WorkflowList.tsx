/**
 * AI生成コースワークフロー一覧
 * 保存済みワークフローの表示・管理
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  FileText, 
  Calendar, 
  Trash2, 
  Play,
  AlertCircle,
  Plus,
  RefreshCw
} from 'lucide-react'

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

interface WorkflowListProps {
  onSelectWorkflow?: (workflow: WorkflowItem) => void
  onNewWorkflow?: () => void
}

export function WorkflowList({ onSelectWorkflow, onNewWorkflow }: WorkflowListProps) {
  const { toast } = useToast()
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)


  // ワークフロー一覧取得
  const loadWorkflows = async () => {
    setIsLoading(true)
    try {
      const { ApiClient } = await import('@/lib/api-helpers')
      
      interface APIWorkflowResponse {
        id: string
        title: string
        description: string
        status: string
        sources: SourceMaterial[]
        aiOutlineResponse?: string
        currentStep: number
        created_at: string
        updated_at: string
      }
      
      const result = await ApiClient.get<{ workflows: APIWorkflowResponse[] }>('/api/ai-course-generation/workflows')
      
      const workflows = (result.workflows || []).map((workflow) => ({
        id: workflow.id,
        title: workflow.title,
        description: workflow.description,
        status: workflow.status as WorkflowStatus,
        sources: workflow.sources || [],
        aiOutlineResponse: workflow.aiOutlineResponse,
        currentStep: workflow.currentStep,
        created_at: workflow.created_at,
        updated_at: workflow.updated_at
      }))
      setWorkflows(workflows)
      
    } catch (error) {
      console.error('❌ Load workflows error:', error)
      toast({
        title: "取得エラー",
        description: error instanceof Error ? error.message : 'ワークフローの取得に失敗しました',
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // ワークフロー削除
  const handleDelete = async (workflowId: string) => {
    if (!confirm('このワークフローを削除しますか？この操作は取り消せません。')) {
      return
    }

    setIsDeleting(workflowId)
    try {
      const { ApiClient } = await import('@/lib/api-helpers')
      
      await ApiClient.delete(`/api/ai-course-generation/workflows/${workflowId}`)

      setWorkflows(prev => prev.filter(w => w.id !== workflowId))
      toast({
        title: "削除完了",
        description: "ワークフローが削除されました",
      })
      
    } catch (error) {
      console.error('❌ Delete workflow error:', error)
      toast({
        title: "削除エラー",
        description: error instanceof Error ? error.message : 'ワークフローの削除に失敗しました',
        variant: "destructive"
      })
    } finally {
      setIsDeleting(null)
    }
  }

  // ステータス表示
  const getStatusBadge = (status: WorkflowStatus, currentStep: number) => {
    const statusMap: Record<WorkflowStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      'draft': { label: '下書き', variant: 'outline' },
      'source_analysis': { label: '資料分析中', variant: 'secondary' },
      'outline_draft': { label: 'AI生成中', variant: 'default' },
      'outline_approved': { label: 'アウトライン承認済み', variant: 'default' },
      'content_draft': { label: 'コンテンツ生成中', variant: 'default' },
      'content_approved': { label: 'コンテンツ承認済み', variant: 'default' },
      'published': { label: '公開済み', variant: 'default' },
      'manual_input_required': { label: '手動入力待ち', variant: 'secondary' }
    }

    const config = statusMap[status] || { label: '不明', variant: 'destructive' }
    
    return (
      <div className="flex items-center gap-2">
        <Badge variant={config.variant}>{config.label}</Badge>
        <span className="text-xs text-muted-foreground">ステップ {currentStep + 1}/6</span>
      </div>
    )
  }

  // 初期読み込み
  useEffect(() => {
    loadWorkflows()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">ワークフローを読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">AI生成コースワークフロー</h2>
          <p className="text-muted-foreground">
            保存済みのコース生成プロジェクトを管理できます
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadWorkflows} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            更新
          </Button>
          <Button onClick={onNewWorkflow}>
            <Plus className="h-4 w-4 mr-2" />
            新しいコース作成
          </Button>
        </div>
      </div>

      {/* ワークフロー一覧 */}
      {workflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">まだワークフローがありません</h3>
            <p className="text-muted-foreground text-center mb-4">
              新しいAI生成コースを作成して始めましょう
            </p>
            <Button onClick={onNewWorkflow}>
              <Plus className="h-4 w-4 mr-2" />
              最初のコースを作成
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((workflow) => (
            <Card key={workflow.id} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{workflow.title}</CardTitle>
                    <CardDescription className="text-sm">
                      {workflow.description || '説明なし'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {/* ステータス */}
                  {getStatusBadge(workflow.status, workflow.currentStep)}
                  
                  {/* 統計情報 */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>{Array.isArray(workflow.sources) ? workflow.sources.length : 0} 資料</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(workflow.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* アクション */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => onSelectWorkflow?.(workflow)}
                      className="flex-1"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      続行
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(workflow.id)
                      }}
                      disabled={isDeleting === workflow.id}
                    >
                      {isDeleting === workflow.id ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 注意事項 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">ワークフロー管理について</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>作業中のワークフローは自動保存されます</li>
                <li>いつでも前のステップに戻って編集できます</li>
                <li>削除されたワークフローは復元できません</li>
                <li>完成したコースは学習システムに自動統合されます</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}