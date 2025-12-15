/**
 * AI統合基盤 - 手動モード
 * Claude Web Interfaceでの手動プロンプト実行とレスポンス貼り付け
 */

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Brain, 
  Copy, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ClipboardCopy,
  Target
} from 'lucide-react'

interface SourceMaterial {
  id: string
  type: 'pdf' | 'url' | 'text'
  title: string
  content: string
  metadata?: {
    wordCount?: number
    pageCount?: number
    language?: string
  }
}

interface CourseGenerationWorkflow {
  id?: string
  title: string
  description: string
  difficultyId?: string
  estimatedDuration?: string
  learningObjectives?: string[]
  targetAudience?: string
  courseCategory?: string
  generationPreferences?: {
    sessionLength: number
    includeQuizzes: boolean
    interactivityLevel: 'low' | 'medium' | 'high'
    contentStyle: 'formal' | 'casual' | 'technical'
  }
}

interface ManualAIStepProps {
  sources: SourceMaterial[]
  workflow?: CourseGenerationWorkflow
  onAIResponse?: (response: string) => void
  onNext?: () => void
  onPrevious?: () => void
}

export function ManualAIStep({ 
  sources, 
  workflow,
  onAIResponse,
  onNext,
  onPrevious 
}: ManualAIStepProps) {
  const { toast } = useToast()
  const [aiResponse, setAiResponse] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('')
  const [showPrompt, setShowPrompt] = useState(false)

  // プロンプト生成
  const generatePrompt = () => {
    const totalWordCount = sources.reduce((sum, s) => sum + (s.metadata?.wordCount || 0), 0)
    const sourcesList = sources.map((source, index) => 
      `【参考資料${index + 1}】${source.title} (${source.type === 'pdf' ? 'PDF' : source.type === 'url' ? 'Webサイト' : 'テキスト'}, ${source.metadata?.wordCount || 0}単語)`
    ).join('\n')

    const combinedContent = sources.map((source, index) => `
=== 参考資料 ${index + 1}: ${source.title} ===
種類: ${source.type === 'pdf' ? 'PDF' : source.type === 'url' ? 'Webサイト' : 'テキスト'}
${source.metadata?.wordCount ? `単語数: ${source.metadata.wordCount.toLocaleString()}` : ''}

${source.content}

---
`).join('\n')

    // コース概要情報の生成
    const courseInfoSection = workflow ? `
## コース設計要件

### 基本情報
- **コースタイトル**: ${workflow.title}
- **コース概要**: ${workflow.description}
- **対象者**: ${workflow.targetAudience || '指定なし'}
- **カテゴリー**: ${workflow.courseCategory || '指定なし'}
- **推定学習時間**: ${workflow.estimatedDuration || '指定なし'}

### 学習目標
${workflow.learningObjectives && workflow.learningObjectives.length > 0 
  ? workflow.learningObjectives.map((obj, index) => `${index + 1}. ${obj}`).join('\n')
  : '学習目標は参考資料から適切に設定してください'}

### 生成設定
- **セッション時間**: ${workflow.generationPreferences?.sessionLength || 15}分/セッション
- **コンテンツスタイル**: ${workflow.generationPreferences?.contentStyle === 'formal' ? 'フォーマル' : workflow.generationPreferences?.contentStyle === 'casual' ? 'カジュアル' : workflow.generationPreferences?.contentStyle === 'technical' ? '技術的' : 'フォーマル'}
- **相互作用レベル**: ${workflow.generationPreferences?.interactivityLevel === 'low' ? '低（テキスト中心）' : workflow.generationPreferences?.interactivityLevel === 'high' ? '高（演習・ワークショップ多数）' : '中（図表・例題含む）'}
- **理解度確認クイズ**: ${workflow.generationPreferences?.includeQuizzes ? '含む' : '含まない'}
` : ''

    return `# AI学習コース生成プロンプト

## 指示
以下のコース設計要件と参考資料を分析して、体系的な学習コースのアウトラインを作成してください。
${courseInfoSection}
## 参考資料概要
- 参考資料数: ${sources.length}件
- 総単語数: ${totalWordCount.toLocaleString()}単語

${sourcesList}

## 出力形式
以下のJSON形式でアウトラインを作成してください：

\`\`\`json
{
  "courseTitle": "コースタイトル",
  "courseDescription": "コースの概要説明（2-3文）",
  "estimatedDuration": "推定学習時間",
  "difficulty": "初級/中級/上級",
  "learningObjectives": [
    "学習目標1",
    "学習目標2",
    "学習目標3"
  ],
  "genres": [
    {
      "genreTitle": "ジャンル1タイトル",
      "genreDescription": "ジャンルの説明",
      "themes": [
        {
          "themeTitle": "テーマ1タイトル",
          "themeDescription": "テーマの説明",
          "sessions": [
            {
              "sessionTitle": "セッション1タイトル",
              "sessionDescription": "セッションの説明",
              "contentType": "lecture",
              "estimatedMinutes": 15
            }
          ]
        }
      ]
    }
  ],
  "categoryMapping": {
    "recommendedCategoryId": 1,
    "recommendedSubcategoryId": 1,
    "reason": "カテゴリ選択の理由"
  }
}
\`\`\`

## 参考資料

${combinedContent}

## 重要な要求事項
1. 参考資料の内容を基に、論理的で体系的なコース構成を作成してください
2. 学習者のレベルに応じた適切な難易度設定をしてください
3. 各セッションは10-20分程度の学習時間になるよう調整してください
4. 実践的で具体的な学習内容を含めてください
5. 必ずJSON形式で回答してください

よろしくお願いいたします。`
  }

  // プロンプト生成処理
  const handleGeneratePrompt = () => {
    const prompt = generatePrompt()
    setGeneratedPrompt(prompt)
    setShowPrompt(true)
    toast({
      title: "プロンプトを生成しました",
      description: "内容を確認してからコピーしてください",
    })
  }

  // プロンプトをクリップボードにコピー
  const copyPromptToClipboard = async () => {
    try {
      if (!generatedPrompt) {
        handleGeneratePrompt()
        return
      }
      
      await navigator.clipboard.writeText(generatedPrompt)
      toast({
        title: "プロンプトをコピーしました",
        description: "Claude Web Interfaceに貼り付けてください",
      })
    } catch (_error) {
      toast({
        title: "コピーに失敗しました",
        description: "手動でプロンプトを選択してコピーしてください",
        variant: "destructive"
      })
    }
  }

  // Claude Web Interfaceを開く
  const openClaudeInterface = () => {
    window.open('https://claude.ai/chat', '_blank', 'noopener,noreferrer')
  }

  // AIレスポンス処理
  const handleResponseSubmit = () => {
    if (!aiResponse.trim()) {
      toast({
        title: "AIレスポンスが入力されていません",
        description: "Claude Web InterfaceからのレスポンスJSONを貼り付けてください",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    try {
      // JSON形式の検証
      JSON.parse(aiResponse)
      
      onAIResponse?.(aiResponse)
      toast({
        title: "AIレスポンスを保存しました",
        description: "アウトラインの確認・編集ステップに進みます",
      })
      
      setTimeout(() => {
        setIsProcessing(false)
        onNext?.()
      }, 1000)
      
    } catch (_error) {
      setIsProcessing(false)
      toast({
        title: "JSON形式エラー",
        description: "有効なJSON形式でレスポンスを入力してください",
        variant: "destructive"
      })
    }
  }

  const totalWordCount = sources.reduce((sum, s) => sum + (s.metadata?.wordCount || 0), 0)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
          <Brain className="h-6 w-6 text-purple-600" />
          AI統合基盤（手動モード）
        </h2>
        <p className="text-muted-foreground">
          Claude Web Interfaceを使用してコースアウトラインを生成します
        </p>
      </div>

      {/* コース情報・参考資料サマリー */}
      {workflow && (
        <Card className="border-blue-200 bg-blue-50 mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              コース設計要件
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="font-medium text-blue-800">{workflow.title}</div>
                <div className="text-blue-700 mt-1">{workflow.description}</div>
                {workflow.targetAudience && (
                  <div className="text-blue-600 mt-2">対象者: {workflow.targetAudience}</div>
                )}
              </div>
              <div className="space-y-2">
                {workflow.learningObjectives && workflow.learningObjectives.length > 0 && (
                  <div>
                    <div className="font-medium text-blue-800">学習目標:</div>
                    <ul className="list-disc list-inside text-blue-700 text-xs space-y-1">
                      {workflow.learningObjectives.map((obj, index) => (
                        <li key={index}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-green-600" />
            参考資料サマリー
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{sources.length} 件の参考資料</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{totalWordCount.toLocaleString()} 単語</span>
            </div>
            <div className="flex gap-2">
              {sources.map((source) => (
                <span key={source.id} className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs">
                  {source.type === 'pdf' ? 'PDF' : source.type === 'url' ? 'Web' : 'テキスト'}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ステップ1: プロンプト生成・コピー */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            プロンプトの準備
          </CardTitle>
          <CardDescription>
            参考資料を基にAI用プロンプトを自動生成し、クリップボードにコピーします
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button 
              onClick={handleGeneratePrompt}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              プロンプト生成
            </Button>
            {showPrompt && (
              <Button 
                variant="outline"
                onClick={copyPromptToClipboard}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" />
                クリップボードにコピー
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={openClaudeInterface}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Claude Web Interfaceを開く
            </Button>
          </div>

          {showPrompt && generatedPrompt && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">生成されたプロンプト:</h4>
                <Badge variant="secondary">{Math.ceil(generatedPrompt.length / 1000)}KB</Badge>
              </div>
              <Textarea
                value={generatedPrompt}
                onChange={(e) => setGeneratedPrompt(e.target.value)}
                className="min-h-64 text-xs font-mono"
                placeholder="プロンプトが生成されここに表示されます..."
              />
              <p className="text-xs text-muted-foreground">
                プロンプトは編集可能です。必要に応じて修正してからコピーしてください。
              </p>
            </div>
          )}

          {!showPrompt && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">生成されるプロンプト内容:</p>
              <ul className="text-sm space-y-1">
                <li>• {sources.length}件の参考資料の統合分析指示</li>
                <li>• 体系的コースアウトライン作成要求</li>
                <li>• JSON形式での構造化出力指定</li>
                <li>• カテゴリマッピング指示</li>
                <li>• 学習時間とレベル設定ガイド</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ステップ2: Claude実行 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            Claudeでプロンプト実行
          </CardTitle>
          <CardDescription>
            Claude Web Interfaceにプロンプトを貼り付けて、AIにコースアウトラインを生成させます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>1. Claude Web Interface（claude.ai/chat）にアクセス</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>2. コピーしたプロンプトをチャットボックスに貼り付け</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>3. Enterキーを押してAI生成を実行</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-yellow-500" />
              <span>4. 生成されたJSON形式のレスポンスをコピー</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ステップ3: レスポンス貼り付け */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            AIレスポンスの入力
          </CardTitle>
          <CardDescription>
            Claude Web InterfaceからのJSON形式レスポンスをここに貼り付けてください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder='{"courseTitle": "...", "courseDescription": "...", ...}'
            value={aiResponse}
            onChange={(e) => setAiResponse(e.target.value)}
            className="min-h-32 font-mono text-sm"
            disabled={isProcessing}
          />
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              JSON形式での入力が必要です
            </div>
            
            <Button 
              onClick={handleResponseSubmit}
              disabled={!aiResponse.trim() || isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  処理中...
                </>
              ) : (
                <>
                  <ClipboardCopy className="h-4 w-4" />
                  レスポンスを保存して次へ
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 注意事項 */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">手動モードについて</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Claude Web Interfaceでの手動実行により、最高品質のAI生成が可能です</li>
                <li>将来のClaude API契約後は、このプロセスが自動化されます</li>
                <li>JSON形式でのレスポンスが必要です（形式エラーは自動検出されます）</li>
                <li>生成されたアウトラインは次のステップで詳細編集が可能です</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* フッター */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={onPrevious}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          前のステップ
        </Button>
        
        <div className="text-sm text-muted-foreground">
          Claude Web Interfaceで生成したJSONレスポンスを上記に貼り付けしてください
        </div>
      </div>
    </div>
  )
}