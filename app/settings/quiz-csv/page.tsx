'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Download, 
  Upload, 
  FileText, 
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Database,
  Info
} from 'lucide-react'
import { getAllQuestions } from '@/lib/questions'
import type { Question } from '@/lib/types'

interface ImportPreview {
  questions: Question[]
  errors: string[]
  warnings: string[]
  stats: {
    total: number
    new: number
    updated: number
    deleted: number
    active: number
    hasDeletedColumn: boolean
  }
}

export default function QuizCSVPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 初期データ読み込み
  const loadQuestions = async () => {
    setLoading(true)
    try {
      const data = await getAllQuestions()
      setQuestions(data)
      setMessage({ type: 'success', text: `${data.length}問のクイズ問題を読み込みました` })
    } catch (error) {
      setMessage({ type: 'error', text: 'クイズ問題の読み込みに失敗しました' })
    }
    setLoading(false)
  }

  // CSV出力
  const exportToCSV = () => {
    if (questions.length === 0) {
      setMessage({ type: 'error', text: 'エクスポートするデータがありません' })
      return
    }

    try {
      const csvHeaders = [
        'id', 'category', 'subcategory', 'subcategory_id', 'question', 
        'option1', 'option2', 'option3', 'option4', 
        'correct', 'explanation', 'difficulty', 'timeLimit', 
        'relatedTopics', 'source', 'deleted', 'createdAt', 'updatedAt'
      ]

      const csvRows = questions.map(q => [
        q.id,
        q.category || '',
        q.subcategory || '',
        (q as any).subcategory_id || '',
        `"${q.question.replace(/"/g, '""')}"`,
        `"${q.options[0]?.replace(/"/g, '""') || ''}"`,
        `"${q.options[1]?.replace(/"/g, '""') || ''}"`,
        `"${q.options[2]?.replace(/"/g, '""') || ''}"`,
        `"${q.options[3]?.replace(/"/g, '""') || ''}"`,
        q.correct,
        `"${q.explanation?.replace(/"/g, '""') || ''}"`,
        q.difficulty || '',
        q.timeLimit || '',
        Array.isArray(q.relatedTopics) ? `"${q.relatedTopics.join('|')}"` : '""',
        `"${q.source?.replace(/"/g, '""') || ''}"`,
        q.deleted ? 'true' : 'false',
        new Date().toISOString().split('T')[0],
        new Date().toISOString().split('T')[0]
      ])

      const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n')
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `quiz-questions-${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setMessage({ type: 'success', text: `${questions.length}問をCSVファイルに出力しました` })
    } catch (error) {
      setMessage({ type: 'error', text: 'CSV出力に失敗しました' })
    }
  }

  // CSVファイル選択
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setMessage({ type: 'error', text: 'CSVファイルを選択してください' })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const csvContent = e.target?.result as string
      parseCSVContent(csvContent)
    }
    reader.readAsText(file, 'UTF-8')
  }

  // CSV内容をパース
  const parseCSVContent = (csvContent: string) => {
    try {
      const lines = csvContent.split('\n').filter(line => line.trim())
      if (lines.length < 2) {
        setMessage({ type: 'error', text: 'CSVファイルが空またはヘッダーのみです' })
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const requiredHeaders = ['id', 'category', 'question', 'option1', 'option2', 'option3', 'option4', 'correct']
      
      const missingHeaders = requiredHeaders.filter(req => !headers.includes(req))
      if (missingHeaders.length > 0) {
        setMessage({ 
          type: 'error', 
          text: `必須カラムが不足しています: ${missingHeaders.join(', ')}` 
        })
        return
      }

      const parsedQuestions: Question[] = []
      const errors: string[] = []
      const warnings: string[] = []

      for (let i = 1; i < lines.length; i++) {
        try {
          const values = parseCSVLine(lines[i])
          if (values.length < headers.length) continue

          const questionData: any = {}
          headers.forEach((header, index) => {
            questionData[header] = values[index] || ''
          })

          // バリデーション
          if (!questionData.id || isNaN(Number(questionData.id))) {
            errors.push(`行${i + 1}: IDが無効です`)
            continue
          }

          if (!questionData.question.trim()) {
            errors.push(`行${i + 1}: 問題文が空です`)
            continue
          }

          if (questionData.correct < 0 || questionData.correct > 3) {
            errors.push(`行${i + 1}: 正解番号は0-3の範囲で指定してください`)
            continue
          }

          // Question型に変換
          const question: Question = {
            id: Number(questionData.id),
            category: questionData.category,
            subcategory: questionData.subcategory,
            subcategory_id: questionData.subcategory_id,
            question: questionData.question,
            options: [
              questionData.option1,
              questionData.option2,
              questionData.option3,
              questionData.option4
            ],
            correct: Number(questionData.correct),
            explanation: questionData.explanation,
            difficulty: questionData.difficulty,
            timeLimit: questionData.timeLimit ? Number(questionData.timeLimit) : undefined,
            relatedTopics: questionData.relatedTopics ? 
              questionData.relatedTopics.split('|').filter((t: string) => t.trim()) : [],
            source: questionData.source,
            deleted: questionData.deleted === 'true' || 
                    questionData.deleted === true || 
                    questionData.deleted === 'TRUE' || 
                    questionData.deleted === '1' ||
                    (typeof questionData.deleted === 'string' && 
                     questionData.deleted.toLowerCase().trim() === 'true')
          }

          parsedQuestions.push(question)

        } catch (error) {
          errors.push(`行${i + 1}: パースエラー`)
        }
      }

      // 統計情報計算
      const existingIds = new Set(questions.map(q => q.id))
      const newQuestions = parsedQuestions.filter(q => !existingIds.has(q.id))
      const updatedQuestions = parsedQuestions.filter(q => existingIds.has(q.id))
      
      const deletedQuestions = parsedQuestions.filter(q => q.deleted)
      const activeQuestions = parsedQuestions.filter(q => !q.deleted)

      const preview: ImportPreview = {
        questions: parsedQuestions,
        errors,
        warnings,
        stats: {
          total: parsedQuestions.length,
          new: newQuestions.length,
          updated: updatedQuestions.length,
          deleted: deletedQuestions.length,
          active: activeQuestions.length,
          hasDeletedColumn: headers.includes('deleted')
        }
      }

      setImportPreview(preview)
      setMessage({ 
        type: 'info', 
        text: `${parsedQuestions.length}問を解析しました。プレビューを確認してください。` 
      })

    } catch (error) {
      setMessage({ type: 'error', text: 'CSVファイルの解析に失敗しました' })
    }
  }

  // CSV行をパース（カンマ区切り、クォート対応）
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    
    result.push(current.trim())
    return result
  }

  // インポート実行
  const executeImport = async () => {
    if (!importPreview) return

    try {
      setLoading(true)
      
      const response = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questions: importPreview.questions })
      })

      if (response.ok) {
        setQuestions(importPreview.questions)
        const deletedCount = importPreview.stats.deleted
        const activeCount = importPreview.stats.active
        setImportPreview(null)
        setMessage({ 
          type: 'success', 
          text: `${importPreview.stats.total}問のインポートが完了しました（有効: ${activeCount}問、削除: ${deletedCount}問）` 
        })
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      } else {
        throw new Error('インポートAPIエラー')
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'インポートに失敗しました' })
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)}
        showBackButton={true}
        onBackClick={() => router.back()}
      />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">クイズ問題API（CSV）</h1>
              <p className="text-muted-foreground">
                クイズ問題のCSV出力・取込管理
              </p>
            </div>
          </div>

          {/* Important Notice */}
          <Alert className="border-amber-200 bg-amber-50">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>重要:</strong> CSVデータの更新後は、変更を本番環境に反映するためにデプロイが必要です。
              将来的にはデータベースでのリアルタイム更新に移行予定です。
            </AlertDescription>
          </Alert>

          {/* Load Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5" />
                <span>データ読み込み</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={loadQuestions} disabled={loading}>
                <FileText className="h-4 w-4 mr-2" />
                問題を読み込み
              </Button>
            </CardContent>
          </Card>

          {/* メッセージ表示 */}
          {message && (
            <Alert className={message.type === 'error' ? 'border-red-500' : message.type === 'success' ? 'border-green-500' : 'border-blue-500'}>
              {message.type === 'error' && <AlertTriangle className="h-4 w-4" />}
              {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {/* CSV操作パネル */}
          <Card>
            <CardHeader>
              <CardTitle>CSV操作</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex space-x-4">
                <Button onClick={exportToCSV} disabled={questions.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV出力 ({questions.length}問)
                </Button>
                
                <div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-import"
                  />
                  <Button asChild>
                    <label htmlFor="csv-import">
                      <Upload className="h-4 w-4 mr-2" />
                      CSV取込
                    </label>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* インポートプレビュー */}
          {importPreview && (
            <Card>
              <CardHeader>
                <CardTitle>インポートプレビュー</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{importPreview.stats.total}</div>
                    <div className="text-sm text-muted-foreground">総問題数</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{importPreview.stats.active}</div>
                    <div className="text-sm text-muted-foreground">有効問題</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{importPreview.stats.deleted}</div>
                    <div className="text-sm text-muted-foreground">削除問題</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-emerald-600">{importPreview.stats.new}</div>
                    <div className="text-sm text-muted-foreground">新規</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{importPreview.stats.updated}</div>
                    <div className="text-sm text-muted-foreground">更新</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-rose-600">{importPreview.errors.length}</div>
                    <div className="text-sm text-muted-foreground">エラー</div>
                  </div>
                </div>
                
                {!importPreview.stats.hasDeletedColumn && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-orange-800 mb-2">⚠️ 警告</h4>
                    <p className="text-sm text-orange-700">
                      CSVファイルに「deleted」カラムが見つかりません。削除フラグは全てfalseとして処理されます。
                    </p>
                  </div>
                )}

                {importPreview.errors.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-red-800 mb-2">エラー一覧</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      {importPreview.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex space-x-4">
                  <Button 
                    onClick={executeImport} 
                    disabled={loading || importPreview.errors.length > 0}
                  >
                    インポート実行
                  </Button>
                  <Button variant="outline" onClick={() => setImportPreview(null)}>
                    キャンセル
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 問題一覧プレビュー */}
          {questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>問題一覧 ({questions.length}問)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {questions.slice(0, 10).map(question => (
                    <div key={question.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant="outline">ID: {question.id}</Badge>
                          <Badge>{question.category}</Badge>
                          <Badge variant="secondary">{question.difficulty}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {question.question}
                        </p>
                      </div>
                    </div>
                  ))}
                  {questions.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center">
                      ...他 {questions.length - 10} 問
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}