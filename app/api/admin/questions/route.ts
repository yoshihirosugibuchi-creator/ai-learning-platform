import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import type { Question } from '@/lib/types'

const QUESTIONS_FILE_PATH = path.join(process.cwd(), 'public', 'questions.json')
const BACKUP_DIR = path.join(process.cwd(), 'backups')

// バックアップディレクトリを作成
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true })
}

// バックアップファイルを作成
function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = path.join(BACKUP_DIR, `questions-backup-${timestamp}.json`)
  
  if (fs.existsSync(QUESTIONS_FILE_PATH)) {
    fs.copyFileSync(QUESTIONS_FILE_PATH, backupPath)
    return backupPath
  }
  return null
}

// 現在の問題データを取得
export async function GET() {
  try {
    if (!fs.existsSync(QUESTIONS_FILE_PATH)) {
      return NextResponse.json({ questions: [] })
    }

    const fileContent = fs.readFileSync(QUESTIONS_FILE_PATH, 'utf-8')
    const data = JSON.parse(fileContent)
    
    return NextResponse.json({ 
      questions: data.questions || [],
      total: data.questions?.length || 0 
    })
  } catch (error) {
    console.error('Failed to read questions:', error)
    return NextResponse.json(
      { error: 'Failed to read questions' },
      { status: 500 }
    )
  }
}

// 問題データを更新（CSVインポート）
export async function POST(request: NextRequest) {
  try {
    const { questions }: { questions: Question[] } = await request.json()

    // バリデーション
    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Invalid questions format' },
        { status: 400 }
      )
    }

    // 各問題のバリデーション
    const validationErrors: string[] = []
    const validatedQuestions: Question[] = []

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      
      // 必須フィールドのチェック
      if (!question.id || typeof question.id !== 'number') {
        validationErrors.push(`Question ${i + 1}: Invalid ID`)
        continue
      }

      if (!question.question || typeof question.question !== 'string') {
        validationErrors.push(`Question ${i + 1}: Missing or invalid question text`)
        continue
      }

      if (!Array.isArray(question.options) || question.options.length !== 4) {
        validationErrors.push(`Question ${i + 1}: Must have exactly 4 options`)
        continue
      }

      if (typeof question.correct !== 'number' || question.correct < 0 || question.correct > 3) {
        validationErrors.push(`Question ${i + 1}: Correct answer must be 0-3`)
        continue
      }

      if (!question.category || typeof question.category !== 'string') {
        validationErrors.push(`Question ${i + 1}: Missing or invalid category`)
        continue
      }

      // オプションフィールドのデフォルト値設定
      const validatedQuestion: Question = {
        id: question.id,
        category: question.category,
        subcategory: question.subcategory || '',
        question: question.question,
        options: question.options,
        correct: question.correct,
        explanation: question.explanation || '',
        difficulty: question.difficulty || '中級',
        timeLimit: question.timeLimit || 45,
        relatedTopics: Array.isArray(question.relatedTopics) ? question.relatedTopics : [],
        source: question.source || '',
        deleted: question.deleted || false
      }

      validatedQuestions.push(validatedQuestion)
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationErrors
        },
        { status: 400 }
      )
    }

    // IDの重複チェック
    const ids = validatedQuestions.map(q => q.id)
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)
    
    if (duplicateIds.length > 0) {
      return NextResponse.json(
        { 
          error: 'Duplicate IDs found',
          duplicateIds: [...new Set(duplicateIds)]
        },
        { status: 400 }
      )
    }

    // バックアップを作成
    const backupPath = createBackup()
    console.log('Backup created:', backupPath)

    // IDでソート
    validatedQuestions.sort((a, b) => a.id - b.id)

    // 新しいデータを保存
    const newData = {
      questions: validatedQuestions,
      lastUpdated: new Date().toISOString(),
      totalQuestions: validatedQuestions.length
    }

    fs.writeFileSync(QUESTIONS_FILE_PATH, JSON.stringify(newData, null, 2), 'utf-8')

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${validatedQuestions.length} questions`,
      backup: backupPath ? path.basename(backupPath) : null,
      total: validatedQuestions.length
    })

  } catch (error) {
    console.error('Failed to update questions:', error)
    return NextResponse.json(
      { error: 'Failed to update questions' },
      { status: 500 }
    )
  }
}

// 個別問題の削除
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const questionId = url.searchParams.get('id')

    if (!questionId || isNaN(Number(questionId))) {
      return NextResponse.json(
        { error: 'Invalid question ID' },
        { status: 400 }
      )
    }

    if (!fs.existsSync(QUESTIONS_FILE_PATH)) {
      return NextResponse.json(
        { error: 'Questions file not found' },
        { status: 404 }
      )
    }

    // バックアップを作成
    const backupPath = createBackup()

    // 現在のデータを読み込み
    const fileContent = fs.readFileSync(QUESTIONS_FILE_PATH, 'utf-8')
    const data = JSON.parse(fileContent)
    
    const originalLength = data.questions.length
    const targetId = Number(questionId)
    
    // 指定IDの問題を削除
    data.questions = data.questions.filter((q: Question) => q.id !== targetId)
    
    if (data.questions.length === originalLength) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // 更新されたデータを保存
    data.lastUpdated = new Date().toISOString()
    data.totalQuestions = data.questions.length

    fs.writeFileSync(QUESTIONS_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8')

    return NextResponse.json({
      success: true,
      message: `Question ${targetId} deleted successfully`,
      backup: backupPath ? path.basename(backupPath) : null,
      total: data.questions.length
    })

  } catch (error) {
    console.error('Failed to delete question:', error)
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    )
  }
}