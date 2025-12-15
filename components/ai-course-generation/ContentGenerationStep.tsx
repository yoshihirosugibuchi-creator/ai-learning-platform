/**
 * AIコンテンツ生成ステップ (Step 5)
 * アウトライン承認後の詳細コンテンツ・クイズ生成UI
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { 
  Brain,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PlayCircle,
  Download,
  FileText,
  MessageSquare,
  Clock,
  Target,
  Sparkles,
  ArrowRight,
  ArrowLeft
} from 'lucide-react'

interface SessionData {
  id: string
  title: string
  description?: string
  session_type: 'content' | 'quiz' | 'exercise'
  estimatedMinutes: number
  themeTitle: string
  themeDescription: string
  genreTitle: string
  completed?: boolean
}

interface ContentGenerationStepProps {
  workflow: {
    id?: string
    title: string
    outline_data?: {
      approved: boolean
      genres: Array<{
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
            description?: string
            session_type: 'content' | 'quiz' | 'exercise'
            estimatedMinutes: number
          }>
        }>
      }>
    }
    content_data?: {
      session_contents?: Array<{
        id: string
        session_id: string
        content_type: 'text' | 'image' | 'video' | 'exercise'
        content_data: Record<string, unknown>
        display_order: number
      }>
      session_quizzes?: Array<{
        id: string
        session_id: string
        question: string
        options: string[]
        correct_answer: number
        explanation: string
        display_order: number
      }>
      reward_cards?: Record<string, unknown>[]
      completion_badge?: Record<string, unknown>
      review_notes?: string
      approved?: boolean
      generated_at?: string
      generated_sessions?: string[]
    }
  }
  onChange: (updates: Record<string, unknown>) => void
  onNext: () => void
  onPrevious: () => void
}

export function ContentGenerationStep({ 
  workflow, 
  onChange, 
  onNext, 
  onPrevious 
}: ContentGenerationStepProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentPrompt, setCurrentPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [selectedSession, setSelectedSession] = useState<SessionData | null>(null)
  const [sessionsList, setSessionsList] = useState<SessionData[]>([])
  const [generationMode, setGenerationMode] = useState<'single' | 'batch'>('single')

  // セッション一覧抽出
  useEffect(() => {
    const sessions: SessionData[] = []
    const generatedSessions = workflow.content_data?.generated_sessions || []

    if (workflow.outline_data?.genres) {
      for (const genre of workflow.outline_data.genres) {
        for (const theme of genre.themes) {
          for (const session of theme.sessions) {
            sessions.push({
              id: session.id,
              title: session.title,
              description: session.description,
              session_type: session.session_type,
              estimatedMinutes: session.estimatedMinutes,
              themeTitle: theme.title,
              themeDescription: theme.description,
              genreTitle: genre.title,
              completed: generatedSessions.includes(session.id)
            })
          }
        }
      }
    }

    setSessionsList(sessions)

    // 最初の未完了セッションを選択
    const firstIncomplete = sessions.find(s => !s.completed)
    if (firstIncomplete && !selectedSession) {
      setSelectedSession(firstIncomplete)
    }
  }, [workflow, selectedSession])

  // プロンプト生成
  const handleGeneratePrompt = async () => {
    if (!selectedSession) {
      toast({
        title: "セッションが選択されていません",
        description: "コンテンツを生成するセッションを選択してください",
        variant: "destructive"
      })
      return
    }

    if (!workflow.id) {
      toast({
        title: "ワークフローIDが不明です",
        description: "先にワークフローを保存してください",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)
    
    try {
      const response = await fetch(`/api/ai-course-generation/workflows/${workflow.id}/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': '82413077-a06d-4d9c-82bb-6fdb6a6b8e13', // 開発環境での認証バイパス
          'x-test-role': 'admin'
        },
        body: JSON.stringify({
          action: 'generate_prompt',
          session_id: selectedSession.id,
          batch_mode: generationMode === 'batch'
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'プロンプト生成に失敗しました')
      }

      setCurrentPrompt(result.prompt || result.combined_prompt || '')
      
      toast({
        title: "プロンプト生成完了",
        description: `${generationMode === 'batch' ? '一括' : '単一'}プロンプトが生成されました`,
      })

    } catch (error) {
      console.error('Prompt generation error:', error)
      toast({
        title: "プロンプト生成エラー",
        description: error instanceof Error ? error.message : 'プロンプト生成に失敗しました',
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // プロンプトコピー
  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(currentPrompt)
      toast({
        title: "プロンプトをコピーしました",
        description: "Claude Web Interfaceに貼り付けて実行してください",
      })
    } catch (_error) {
      toast({
        title: "コピーに失敗しました",
        description: "手動でプロンプトを選択してコピーしてください",
        variant: "destructive"
      })
    }
  }

  // Claude Web Interface開く
  const openClaudeInterface = () => {
    window.open('https://claude.ai/chat', '_blank', 'noopener,noreferrer')
  }

  // AIレスポンス送信
  const handleSubmitResponse = async () => {
    if (!selectedSession || !aiResponse.trim()) {
      toast({
        title: "AIレスポンスが入力されていません",
        description: "Claude Web InterfaceからのJSONレスポンスを入力してください",
        variant: "destructive"
      })
      return
    }

    if (!workflow.id) {
      toast({
        title: "ワークフローIDが不明です",
        description: "先にワークフローを保存してください",
        variant: "destructive"
      })
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch(`/api/ai-course-generation/workflows/${workflow.id}/generate-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-test-user-id': '82413077-a06d-4d9c-82bb-6fdb6a6b8e13',
          'x-test-role': 'admin'
        },
        body: JSON.stringify({
          action: 'process_response',
          session_id: selectedSession.id,
          ai_response: aiResponse
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'AIレスポンス処理に失敗しました')
      }

      // ワークフロー更新
      onChange({
        content_data: {
          ...workflow.content_data,
          generated_sessions: [
            ...(workflow.content_data?.generated_sessions || []),
            selectedSession.id
          ]
        },
        current_step: '5'
      })

      toast({
        title: "コンテンツ生成完了！",
        description: `${selectedSession.title}のコンテンツが正常に保存されました`,
      })

      // 次のセッション選択
      const currentIndex = sessionsList.findIndex(s => s.id === selectedSession.id)
      const nextSession = sessionsList[currentIndex + 1]
      
      if (nextSession && !nextSession.completed) {
        setSelectedSession(nextSession)
        setAiResponse('')
        setCurrentPrompt('')
      } else {
        // 全セッション完了
        toast({
          title: "全セッションのコンテンツ生成完了！",
          description: "コースが学習可能な状態になりました",
        })
      }

    } catch (error) {
      console.error('Response processing error:', error)
      toast({
        title: "AIレスポンス処理エラー",
        description: error instanceof Error ? error.message : 'レスポンス処理に失敗しました',
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // 進捗計算
  const completedCount = sessionsList.filter(s => s.completed).length
  const totalCount = sessionsList.length
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
          <Brain className="h-6 w-6 text-purple-600" />
          コンテンツ生成
        </h2>
        <p className="text-muted-foreground">
          各セッションの詳細コンテンツ・クイズを生成してコースを完成させます
        </p>
      </div>

      {/* 進捗状況 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">コンテンツ生成進捗</span>
            <span className="text-sm text-muted-foreground">{completedCount}/{totalCount} セッション</span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="text-xs text-blue-700 mt-1">{progressPercentage}% 完了</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* セッション選択 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">セッション選択</CardTitle>
            <CardDescription>コンテンツを生成するセッションを選択</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {sessionsList.map((session) => (
              <div 
                key={session.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedSession?.id === session.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                } ${session.completed ? 'opacity-50' : ''}`}
                onClick={() => setSelectedSession(session)}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-medium text-sm">{session.title}</div>
                  {session.completed && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {session.genreTitle} &gt; {session.themeTitle}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {session.session_type === 'content' ? '講義' : 
                     session.session_type === 'quiz' ? 'クイズ' : '演習'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {session.estimatedMinutes}分
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* コンテンツ生成エリア */}
        <div className="lg:col-span-2 space-y-4">
          {/* 生成設定 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                AI生成設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={generationMode === 'single' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGenerationMode('single')}
                >
                  単一セッション
                </Button>
                <Button
                  variant={generationMode === 'batch' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGenerationMode('batch')}
                >
                  一括生成
                </Button>
              </div>

              {selectedSession && (
                <div className="p-3 bg-gray-50 rounded">
                  <div className="font-medium text-sm mb-1">{selectedSession.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedSession.description || 'セッションの詳細説明'}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {selectedSession.estimatedMinutes}分
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      {selectedSession.session_type === 'content' ? '講義' : 
                       selectedSession.session_type === 'quiz' ? 'クイズ' : '演習'}
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleGeneratePrompt}
                disabled={!selectedSession || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    プロンプト生成中...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    AIプロンプト生成
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* プロンプト表示・コピー */}
          {currentPrompt && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    生成されたプロンプト
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyPrompt}>
                      <Copy className="h-4 w-4 mr-1" />
                      コピー
                    </Button>
                    <Button variant="outline" size="sm" onClick={openClaudeInterface}>
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Claude起動
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={currentPrompt}
                  readOnly
                  className="min-h-32 text-xs font-mono"
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  プロンプト長: {Math.ceil(currentPrompt.length / 1000)}KB | 
                  推定トークン: {Math.ceil(currentPrompt.length / 4)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AIレスポンス入力 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                AIレスポンス入力
              </CardTitle>
              <CardDescription>
                Claude Web InterfaceからのJSON形式レスポンスを貼り付けてください
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder='{"session_contents": [...], "session_quizzes": [...], ...}'
                value={aiResponse}
                onChange={(e) => setAiResponse(e.target.value)}
                className="min-h-32 font-mono text-sm"
                disabled={isGenerating}
              />
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {aiResponse && (
                    <>
                      文字数: {aiResponse.length} | 
                      JSON: {isValidJSON(aiResponse) ? '✅ 有効' : '❌ 無効'}
                    </>
                  )}
                </div>
                <Button 
                  onClick={handleSubmitResponse}
                  disabled={!aiResponse.trim() || !isValidJSON(aiResponse) || isGenerating}
                  className="flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      処理中...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      コンテンツ保存
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 注意事項 */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>手動AIモードについて:</strong> 
          Claude Web Interfaceでプロンプトを実行し、JSON形式のレスポンスを上記に貼り付けてください。
          将来のClaude API統合により、このプロセスは自動化されます。
        </AlertDescription>
      </Alert>

      {/* フッター */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          前のステップ
        </Button>
        
        <Button 
          onClick={onNext}
          disabled={progressPercentage < 100}
          className="flex items-center gap-2"
        >
          コース完成・次へ
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

// ヘルパー関数
function isValidJSON(str: string): boolean {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}