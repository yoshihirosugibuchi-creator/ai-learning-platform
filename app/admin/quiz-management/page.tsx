'use client'

import { useState, useRef } from 'react'
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
  Shield
} from 'lucide-react'
import type { Question } from '@/lib/types'
import { useUserRole } from '@/hooks/useUserRole'
import { supabase } from '@/lib/supabase'

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
    hasHintColumns: boolean
    withHints: number
  }
}

export default function QuizManagementPage() {
  const { isSystemAdmin, loading: roleLoading } = useUserRole()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // システム管理者権限チェック
  if (roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">権限確認中...</p>
        </div>
      </div>
    )
  }

  if (!isSystemAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md mx-auto border-red-200">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-red-700">アクセス権限不足</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              クイズ問題管理機能はシステム管理者限定です。
            </p>
            <p className="text-sm text-muted-foreground">
              アクセスには最高レベルの権限が必要です。
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 初期データ読み込み（管理者専用API使用）
  const loadQuestions = async () => {
    setLoading(true)
    try {
      // 認証トークンを取得
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }

      const response = await fetch('/api/admin/questions/db', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`)
      }
      
      const result = await response.json()
      const data = result.questions || []
      setQuestions(data)
      setMessage({ type: 'success', text: `${data.length}問のクイズ問題を読み込みました（ヒント付き）` })
    } catch (error) {
      console.error('❌ Admin questions load error:', error)
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
        'id', 'legacy_id', 'category', 'subcategory', 'subcategory_id', 'question', 
        'option1', 'option2', 'option3', 'option4', 
        'correct', 'explanation', 'difficulty', 'timeLimit', 
        'relatedTopics', 'source', 'deleted', 'createdAt', 'updatedAt',
        // ヒント情報を追加
        'level1_hint', 'level2_hint', 'level3_hint'
      ]

      const csvRows = questions.map(q => [
        q.id,
        q.legacy_id,
        q.category || '',
        q.subcategory || '',
        q.subcategory_id || '',
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
        q.deleted ? 'true' : 'false', // deleted flag
        q.createdAt ? new Date(q.createdAt).toISOString().split('T')[0] : '', // createdAt
        q.updatedAt ? new Date(q.updatedAt).toISOString().split('T')[0] : '', // updatedAt
        // ヒント情報を追加
        `"${q.level1_hint?.replace(/"/g, '""') || ''}"`,
        `"${q.level2_hint?.replace(/"/g, '""') || ''}"`,
        `"${q.level3_hint?.replace(/"/g, '""') || ''}"`
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
    } catch {
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
      console.log('CSV Headers:', headers)
      console.log('Has deleted column:', headers.includes('deleted'))
      const requiredHeaders = ['id', 'category', 'question', 'option1', 'option2', 'option3', 'option4', 'correct']
      const hintHeaders = ['level1_hint', 'level2_hint', 'level3_hint']
      const hasHintColumns = hintHeaders.some(hint => headers.includes(hint))
      
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

          const questionData: Record<string, string> = {}
          headers.forEach((header, index) => {
            questionData[header] = values[index] || ''
          })
          
          // デバッグ: deletedフラグの値を確認
          const deletedValue = questionData.deleted as unknown
          const isDeleted = deletedValue === 'true' || 
                           deletedValue === true || 
                           deletedValue === 'TRUE' || 
                           deletedValue === '1' ||
                           (typeof deletedValue === 'string' && 
                            deletedValue.toLowerCase().trim() === 'true')
          
          if (questionData.deleted && (questionData.deleted === 'TRUE' || questionData.deleted === 'FALSE')) {
            console.log(`行${i + 1}: deleted="${questionData.deleted}" → isDeleted=${isDeleted}`)
          }

          // バリデーション（新規問題はIDがブランクでもOK）
          if (questionData.id && isNaN(Number(questionData.id))) {
            errors.push(`行${i + 1}: IDが無効です`)
            continue
          }

          if (!questionData.question.trim()) {
            errors.push(`行${i + 1}: 問題文が空です`)
            continue
          }

          const correctValue = Number(questionData.correct)
          if (correctValue < 0 || correctValue > 3) {
            errors.push(`行${i + 1}: 正解番号は0-3の範囲で指定してください`)
            continue
          }

          // Question型に変換
          const question: Question = {
            id: questionData.id ? Number(questionData.id) : undefined, // 新規時はundefined
            legacy_id: questionData.legacy_id ? Number(questionData.legacy_id) : undefined,
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
            timeLimit: questionData.timeLimit ? Number(questionData.timeLimit) : 60,
            relatedTopics: questionData.relatedTopics ? 
              questionData.relatedTopics.split('|').filter((t: string) => t.trim()) : [],
            source: questionData.source,
            deleted: deletedValue === 'true' || 
                    deletedValue === true || 
                    deletedValue === 'TRUE' || 
                    deletedValue === '1' ||
                    (typeof deletedValue === 'string' && 
                     deletedValue.toLowerCase().trim() === 'true'),
            // ヒント情報を追加（統合テーブル対応）
            level1_hint: questionData.level1_hint || null,
            level2_hint: questionData.level2_hint || null,
            level3_hint: questionData.level3_hint || null
          }

          parsedQuestions.push(question)

        } catch {
          errors.push(`行${i + 1}: パースエラー`)
        }
      }

      // 統計情報計算
      const existingIds = new Set(questions.map(q => q.id))
      const newQuestions = parsedQuestions.filter(q => !existingIds.has(q.id))
      const updatedQuestions = parsedQuestions.filter(q => existingIds.has(q.id))
      
      // deletedフラグの統計
      const deletedQuestions = parsedQuestions.filter(q => q.deleted)
      const activeQuestions = parsedQuestions.filter(q => !q.deleted)
      
      // ヒント情報の統計
      const questionsWithHints = parsedQuestions.filter(q => 
        q.level1_hint || q.level2_hint || q.level3_hint
      )

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
          hasDeletedColumn: headers.includes('deleted'),
          hasHintColumns,
          withHints: questionsWithHints.length
        }
      }

      setImportPreview(preview)
      setMessage({ 
        type: 'info', 
        text: `${parsedQuestions.length}問を解析しました。プレビューを確認してください。` 
      })

    } catch {
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
      
      // 認証トークンを取得
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('認証が必要です')
      }
      
      // 実際のインポート処理（DBの更新）
      const response = await fetch('/api/admin/questions/db', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questions: importPreview.questions })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Import response:', result)
        
        
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
        const errorData = await response.json()
        console.error('❌ Import failed:', errorData)
        throw new Error(`インポートAPIエラー: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('❌ Import error:', error)
      setMessage({ type: 'error', text: `インポートに失敗しました: ${(error as Error).message}` })
    }
    setLoading(false)
  }



  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Shield className="h-6 w-6 mr-2 text-red-600" />
            クイズ問題管理
            <Badge variant="destructive" className="ml-3 text-xs">システム管理者限定</Badge>
          </h1>
          <p className="text-muted-foreground">CSVインポート・エクスポートで問題データを管理します（高権限機能）</p>
        </div>
        <Button onClick={loadQuestions} disabled={loading}>
          <FileText className="h-4 w-4 mr-2" />
          {loading ? '読み込み中...' : '問題を読み込み'}
        </Button>
      </div>

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
            <div className="grid grid-cols-3 md:grid-cols-7 gap-4">
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
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{importPreview.stats.withHints}</div>
                <div className="text-sm text-muted-foreground">ヒント付き</div>
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

            {!importPreview.stats.hasHintColumns && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">ℹ️ 情報</h4>
                <p className="text-sm text-blue-700">
                  CSVファイルにヒントカラム（level1_hint, level2_hint, level3_hint）が見つかりません。ヒント情報は処理されません。
                </p>
              </div>
            )}

            {importPreview.stats.hasHintColumns && importPreview.stats.withHints > 0 && (
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">✅ ヒント情報検出</h4>
                <p className="text-sm text-green-700">
                  {importPreview.stats.withHints}問にヒント情報が含まれています。ヒントデータも一緒にインポートされます。
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

      {/* 問題一覧 */}
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
  )
}