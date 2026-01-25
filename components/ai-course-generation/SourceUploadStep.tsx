/**
 * AI生成コース - 参考資料アップロードステップ
 * ファイル（PDF）、URL、テキスト直接入力に対応
 */

'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'
import {
  Upload as UploadIcon,
  FileText,
  Link,
  Type,
  Check,
  Loader2,
  AlertCircle,
  Globe,
  FileUp,
  Trash2,
  Cloud,
  Shield
} from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { parsePDFInBrowser, estimateWordCount, detectLanguage } from '@/lib/ai-course-generation/browser-pdf-parser'

// 参考資料の型定義（Blob Storage対応）
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
  // Blob Storage オプション機能
  blobStorage?: {
    url: string
    uploadedAt: string
    publicWarningAccepted: boolean
  }
}

interface _UploadStats {
  type: string
  originalSize?: number
  extractedLength: number
  wordCount?: number
  pageCount?: number
  language?: string
}

interface SourceUploadStepProps {
  workflowId?: string
  initialSources?: SourceMaterial[]
  onSourcesChange?: (sources: SourceMaterial[]) => void
  onNext?: () => void
  onPrevious?: () => void
}

export function SourceUploadStep({ 
  workflowId,
  initialSources = [],
  onSourcesChange,
  onNext,
  onPrevious 
}: SourceUploadStepProps) {
  const { toast } = useToast()
  const [sources, setSources] = useState<SourceMaterial[]>(initialSources)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // Blob Storage オプション機能
  const [showBlobWarning, setShowBlobWarning] = useState(false)
  const [blobWarningAccepted, setBlobWarningAccepted] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  // 初期値が変更された場合にローカル状態を更新
  useEffect(() => {
    setSources(initialSources)
  }, [initialSources])

  // 認証ヘッダー取得ヘルパー
  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('認証が必要です。ログインしてください。')
    }

    return {
      'Authorization': `Bearer ${session.access_token}`
    }
  }
  
  // デバッグ用ログ
  React.useEffect(() => {
    console.log('🚀 SourceUploadStep mounted')
    return () => console.log('🔚 SourceUploadStep unmounted')
  }, [])

  // Blob Storage警告ダイアログの確認処理
  const handleBlobWarningConfirm = async () => {
    if (!pendingFile || !blobWarningAccepted) return

    setShowBlobWarning(false)
    await processPDFFile(pendingFile, true) // Blob Storage有効
    setPendingFile(null)
    setBlobWarningAccepted(false)
  }

  const handleBlobWarningCancel = async () => {
    if (!pendingFile) return

    setShowBlobWarning(false)
    await processPDFFile(pendingFile, false) // Blob Storage無効
    setPendingFile(null)
    setBlobWarningAccepted(false)
  }

  // PDF ファイル処理（ブラウザ内解析対応）
  const processPDFFile = async (file: File, _useBlobStorage = false) => {
    console.log('📄 Processing file:', file.name, file.type, file.size)
    setIsUploading(true)
    setUploadProgress(0)

    try {
      const authHeaders = await getAuthHeaders()

      // 4.5MB以上の場合はブラウザ内でPDF解析
      const VERCEL_LIMIT = 4.5 * 1024 * 1024
      const useBrowserParsing = file.size > VERCEL_LIMIT

      if (useBrowserParsing) {
        // ブラウザ内PDF解析（大きなファイル用）
        console.log('📖 Using browser-side PDF parsing (file > 4.5MB)')
        setUploadProgress(10)

        // 1. ブラウザ内でPDFからテキスト抽出
        const parseResult = await parsePDFInBrowser(file)
        setUploadProgress(50)

        if (!parseResult.success) {
          throw new Error(parseResult.error || 'PDF解析に失敗しました')
        }

        // 2. 抽出したテキストをAPIに送信
        const response = await fetch('/api/ai-course-generation/upload-sources', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            type: 'text',
            content: parseResult.text,
            title: file.name.replace('.pdf', ''),
            metadata: {
              originalType: 'pdf',
              originalFileName: file.name,
              originalFileSize: file.size,
              pageCount: parseResult.pageCount,
              parsedInBrowser: true
            }
          })
        })

        setUploadProgress(80)

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'テキスト送信に失敗しました')
        }

        const result = await response.json()
        setUploadProgress(100)

        // SourceMaterialの型を調整（PDFとして表示）
        const newSource = {
          ...result.source,
          type: 'pdf' as const,
          fileSize: file.size,
          metadata: {
            ...result.source.metadata,
            pageCount: parseResult.pageCount,
            wordCount: estimateWordCount(parseResult.text),
            language: detectLanguage(parseResult.text)
          }
        } as SourceMaterial

        const updatedSources = [...sources, newSource]
        setSources(updatedSources)
        onSourcesChange?.(updatedSources)

        toast({
          title: "PDFアップロード完了",
          description: `${newSource.title} (${newSource.metadata?.wordCount?.toLocaleString()} 単語, ${parseResult.pageCount}ページ)`,
        })

      } else {
        // 従来方式（4.5MB以下のファイル）
        console.log('📤 Using traditional server upload (file <= 4.5MB)')
        const formData = new FormData()
        formData.append('file', file)
        formData.append('title', file.name.replace('.pdf', ''))
        formData.append('useBlobStorage', 'false')

        const response = await fetch('/api/ai-course-generation/upload-sources', {
          method: 'POST',
          headers: {
            ...authHeaders,
          },
          body: formData,
        })

        setUploadProgress(50)

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'アップロードに失敗しました')
        }

        const result = await response.json()
        setUploadProgress(100)

        const newSource = result.source as SourceMaterial
        const updatedSources = [...sources, newSource]
        setSources(updatedSources)
        onSourcesChange?.(updatedSources)

        toast({
          title: "PDFアップロード完了",
          description: `${newSource.title} (${result.stats.wordCount?.toLocaleString()} 単語)`,
        })
      }

    } catch (error) {
      console.error('❌ Upload error:', error)
      toast({
        title: "アップロードエラー",
        description: error instanceof Error ? error.message : 'ファイルの処理に失敗しました',
        variant: "destructive"
      })
    } finally {
      console.log('🔄 Resetting upload state')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // PDF ファイルアップロード（ドロップゾーン）
  const onDropPDF = useCallback(async (acceptedFiles: File[]) => {
    console.log('📁 onDropPDF called with:', acceptedFiles)
    if (acceptedFiles.length === 0) {
      console.log('❌ No files accepted')
      return
    }

    const file = acceptedFiles[0]
    
    // 50MB制限チェック
    const MAX_SIZE = 50 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      toast({
        title: "ファイルサイズエラー",
        description: `ファイルサイズが制限を超えています。上限: 50MB`,
        variant: "destructive"
      })
      return
    }

    // Blob Storage利用可能かチェック（環境変数）
    const blobEnabled = process.env.NEXT_PUBLIC_BLOB_STORAGE_ENABLED === 'true'
    
    if (blobEnabled) {
      // Blob Storage警告ダイアログ表示
      setPendingFile(file)
      setShowBlobWarning(true)
    } else {
      // 通常処理（テキスト抽出のみ）
      await processPDFFile(file, false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources, onSourcesChange, toast, workflowId])

  console.log('🔧 SourceUploadStep render - isUploading:', isUploading)
  
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (acceptedFiles, fileRejections) => {
      console.log('🎯 onDrop called with acceptedFiles:', acceptedFiles.length, 'rejected:', fileRejections.length)
      if (acceptedFiles.length > 0) {
        console.log('📄 File details:', acceptedFiles[0])
        onDropPDF(acceptedFiles)
      }
      if (fileRejections.length > 0) {
        console.log('❌ Rejected files:', fileRejections)
        toast({
          title: "ファイル形式エラー", 
          description: "PDFファイルを選択してください",
          variant: "destructive"
        })
      }
    },
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: false,
    disabled: isUploading
  })

  // URL から内容取得
  const [urlInput, setUrlInput] = useState('')
  const [urlTitle, setUrlTitle] = useState('')
  const [isProcessingUrl, setIsProcessingUrl] = useState(false)

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return

    setIsProcessingUrl(true)
    try {
      // 認証ヘッダー取得
      const authHeaders = await getAuthHeaders()

      const response = await fetch('/api/ai-course-generation/upload-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          type: 'url',
          url: urlInput.trim(),
          title: urlTitle || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'URL解析に失敗しました')
      }

      const result = await response.json()
      const newSource = result.source as SourceMaterial

      const updatedSources = [...sources, newSource]
      setSources(updatedSources)
      onSourcesChange?.(updatedSources)

      setUrlInput('')
      setUrlTitle('')

      toast({
        title: "URL解析完了",
        description: `${newSource.title} (${result.stats.wordCount?.toLocaleString()} 単語)`,
      })

    } catch (error) {
      toast({
        title: "URL解析エラー",
        description: error instanceof Error ? error.message : 'URLの解析に失敗しました',
        variant: "destructive"
      })
    } finally {
      setIsProcessingUrl(false)
    }
  }

  // テキスト直接入力
  const [textInput, setTextInput] = useState('')
  const [textTitle, setTextTitle] = useState('')
  const [isProcessingText, setIsProcessingText] = useState(false)

  const handleTextSubmit = async () => {
    if (!textInput.trim() || textInput.trim().length < 10) {
      toast({
        title: "入力エラー",
        description: "最低10文字以上のテキストを入力してください",
        variant: "destructive"
      })
      return
    }

    setIsProcessingText(true)
    try {
      // 認証ヘッダー取得
      const authHeaders = await getAuthHeaders()

      const response = await fetch('/api/ai-course-generation/upload-sources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({
          type: 'text',
          content: textInput.trim(),
          title: textTitle || 'テキスト入力'
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'テキスト処理に失敗しました')
      }

      const result = await response.json()
      const newSource = result.source as SourceMaterial

      const updatedSources = [...sources, newSource]
      setSources(updatedSources)
      onSourcesChange?.(updatedSources)

      setTextInput('')
      setTextTitle('')

      toast({
        title: "テキスト追加完了",
        description: `${newSource.title} (${result.stats.wordCount?.toLocaleString()} 単語)`,
      })

    } catch (error) {
      toast({
        title: "テキスト処理エラー",
        description: error instanceof Error ? error.message : 'テキストの処理に失敗しました',
        variant: "destructive"
      })
    } finally {
      setIsProcessingText(false)
    }
  }

  // 参考資料削除
  const removeSource = (id: string) => {
    const updatedSources = sources.filter(s => s.id !== id)
    setSources(updatedSources)
    onSourcesChange?.(updatedSources)
  }

  // 統計情報計算
  const totalWordCount = sources.reduce((sum, s) => sum + (s.metadata?.wordCount || 0), 0)
  const sourceTypes = sources.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div>
        <h2 className="text-2xl font-semibold mb-2">参考資料のアップロード</h2>
        <p className="text-muted-foreground">
          コース生成に使用する参考資料を追加してください。PDF、Webページ、テキスト直接入力に対応しています。
        </p>
      </div>

      {/* アップロードタブ */}
      <Tabs defaultValue="pdf" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pdf" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            PDF
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            URL
          </TabsTrigger>
          <TabsTrigger value="text" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            テキスト
          </TabsTrigger>
        </TabsList>

        {/* PDFアップロード */}
        <TabsContent value="pdf">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileUp className="h-5 w-5" />
                PDFファイルアップロード
              </CardTitle>
              <CardDescription>
                参考文献やドキュメントのPDFファイルをアップロードできます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isUploading ? (
                <>
                  {/* ドラッグ&ドロップエリア */}
                  <div
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                      ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                    `}
                  >
                    <input {...getInputProps()} />
                    <UploadIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    
                    {isDragActive ? (
                      <p className="text-blue-600">PDFファイルをここにドロップ</p>
                    ) : (
                      <div>
                        <p className="text-lg font-medium mb-2">PDFファイルをドラッグ&ドロップ</p>
                        <p className="text-sm text-muted-foreground">最大50MBまで対応</p>
                      </div>
                    )}
                  </div>

                  {/* ファイル選択ボタン */}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-3">または</p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        console.log('🔘 File select button clicked')
                        open()
                      }}
                      disabled={isUploading}
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      ファイルを選択
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
                  <p className="text-lg font-medium mb-2">PDFを解析中...</p>
                  <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">{uploadProgress}%</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* URL解析 */}
        <TabsContent value="url">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                WebページURL
              </CardTitle>
              <CardDescription>
                記事、ドキュメント、ブログ等のWebページから内容を抽出します
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="url-input">URL</Label>
                <Input
                  id="url-input"
                  type="url"
                  placeholder="https://example.com/article"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={isProcessingUrl}
                />
              </div>
              <div>
                <Label htmlFor="url-title">タイトル (任意)</Label>
                <Input
                  id="url-title"
                  placeholder="自動で取得されます"
                  value={urlTitle}
                  onChange={(e) => setUrlTitle(e.target.value)}
                  disabled={isProcessingUrl}
                />
              </div>
              <Button 
                onClick={handleUrlSubmit}
                disabled={!urlInput.trim() || isProcessingUrl}
                className="w-full"
              >
                {isProcessingUrl && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                URLから内容を取得
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* テキスト直接入力 */}
        <TabsContent value="text">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="h-5 w-5" />
                テキスト直接入力
              </CardTitle>
              <CardDescription>
                コース内容や要点を直接テキストで入力できます
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="text-title">タイトル</Label>
                <Input
                  id="text-title"
                  placeholder="参考資料のタイトル"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  disabled={isProcessingText}
                />
              </div>
              <div>
                <Label htmlFor="text-content">内容</Label>
                <Textarea
                  id="text-content"
                  placeholder="学習内容や参考情報をここに入力してください..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="min-h-32"
                  disabled={isProcessingText}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {textInput.length} 文字 (最低10文字必要)
                </p>
              </div>
              <Button 
                onClick={handleTextSubmit}
                disabled={textInput.trim().length < 10 || isProcessingText}
                className="w-full"
              >
                {isProcessingText && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                テキストを追加
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* アップロード済み参考資料一覧 */}
      {sources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                アップロード済み参考資料
              </span>
              <Badge variant="outline">
                {sources.length} 件
              </Badge>
            </CardTitle>
            <CardDescription>
              合計 {totalWordCount.toLocaleString()} 単語
              {Object.entries(sourceTypes).map(([type, count]) => (
                <span key={type} className="ml-4">
                  {type === 'pdf' ? 'PDF' : type === 'url' ? 'Web' : 'テキスト'}: {count}件
                </span>
              ))}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sources.map((source) => (
                <div 
                  key={source.id}
                  className="flex items-start justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {source.type === 'pdf' && <FileText className="h-4 w-4 text-red-500" />}
                      {source.type === 'url' && <Globe className="h-4 w-4 text-blue-500" />}
                      {source.type === 'text' && <Type className="h-4 w-4 text-green-500" />}
                      
                      <h4 className="font-medium truncate">{source.title}</h4>
                      
                      {/* Blob Storage表示 */}
                      {source.blobStorage && (
                        <Badge variant="outline" className="gap-1">
                          <Cloud className="h-3 w-3" />
                          Blob保存
                        </Badge>
                      )}
                      
                      <Badge variant="secondary" className="ml-auto">
                        {source.metadata?.wordCount?.toLocaleString()} 単語
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground truncate">
                      {source.content.substring(0, 100)}...
                    </p>
                    
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      {source.metadata?.pageCount && (
                        <span>{source.metadata.pageCount} ページ</span>
                      )}
                      {source.metadata?.language && (
                        <span>言語: {source.metadata.language}</span>
                      )}
                      {source.originalUrl && (
                        <span className="truncate max-w-48">{source.originalUrl}</span>
                      )}
                      {source.blobStorage && (
                        <span className="text-blue-600">
                          <a 
                            href={source.blobStorage.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:underline"
                          >
                            元ファイル表示
                          </a>
                        </span>
                      )}
                      <span>{new Date(source.extractedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSource(source.id)}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 注意事項 */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">参考資料について</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>PDF: 最大50MB、テキスト抽出可能な形式のみ</li>
                <li>URL: 公開アクセス可能なWebページのみ</li>
                <li>AI生成は参考資料の品質に大きく依存します</li>
                <li>より多くの関連資料を提供することで、より充実したコースが生成されます</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ナビゲーション */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={onPrevious}
        >
          前のステップ
        </Button>

        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {sources.length === 0 ? (
              "最低1つの参考資料をアップロードしてください"
            ) : (
              `${sources.length} 件の参考資料が準備完了`
            )}
          </div>
          
          <Button 
            onClick={onNext}
            disabled={false}
            className="min-w-32"
          >
            次のステップ
          </Button>
        </div>
      </div>

      {/* Blob Storage警告ダイアログ */}
      <Dialog open={showBlobWarning} onOpenChange={setShowBlobWarning}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-amber-500" />
              Blob Storage オプション
            </DialogTitle>
            <DialogDescription>
              研究・検証目的でのファイル保存機能
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 警告メッセージ */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex gap-2 text-amber-800">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium mb-2">⚠️ 重要な注意事項</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>アップロードされたファイルは<strong>公開状態</strong>になります</li>
                    <li>URLを知る人は誰でもアクセスできます</li>
                    <li>機密情報を含むファイルはアップロードしないでください</li>
                    <li>研究・検証目的での利用を推奨します</li>
                    <li>ファイルサイズ制限: 50MB以下</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 確認チェックボックス */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="blob-warning-accept"
                checked={blobWarningAccepted}
                onCheckedChange={(checked) => setBlobWarningAccepted(!!checked)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="blob-warning-accept"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  上記の内容を理解し、公開してもよいファイルであることを確認しました
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleBlobWarningCancel}>
              テキスト抽出のみ
            </Button>
            <Button 
              onClick={handleBlobWarningConfirm}
              disabled={!blobWarningAccepted}
              className="bg-amber-500 hover:bg-amber-600"
            >
              <Cloud className="h-4 w-4 mr-2" />
              Blob保存する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}