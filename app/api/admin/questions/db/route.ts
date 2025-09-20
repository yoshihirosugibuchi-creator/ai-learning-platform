import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { Question } from '@/lib/types'
import fs from 'fs'
import path from 'path'

// DB対応版 - 問題データ取得
export async function GET() {
  try {
    console.log('🔍 Admin: Fetching all questions from DB')
    
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('is_deleted', false)
      .order('legacy_id', { ascending: true })
    
    if (error) {
      console.error('❌ Database query error:', error)
      return NextResponse.json(
        { error: 'Database query failed', details: error.message },
        { status: 500 }
      )
    }
    
    // DB行をQuestion型に変換
    const questions: Question[] = data?.map(row => ({
      id: row.legacy_id,
      category: row.category_id,
      subcategory: row.subcategory,
      subcategory_id: row.subcategory_id,
      question: row.question,
      options: [row.option1, row.option2, row.option3, row.option4],
      correct: row.correct_answer,
      explanation: row.explanation,
      difficulty: row.difficulty,
      timeLimit: row.time_limit,
      relatedTopics: row.related_topics || [],
      source: row.source,
      deleted: row.is_deleted
    })) || []
    
    console.log(`✅ Admin: ${questions.length} questions retrieved from DB`)
    
    return NextResponse.json({ 
      questions,
      total: questions.length,
      source: 'database'
    })
    
  } catch (error) {
    console.error('❌ Admin questions fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DB対応版 - 問題データ一括更新/挿入
export async function POST(request: NextRequest) {
  try {
    const { questions }: { questions: Question[] } = await request.json()
    
    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Invalid questions format' },
        { status: 400 }
      )
    }
    
    console.log(`🚀 Admin: Starting bulk upsert for ${questions.length} questions`)
    
    // 大量データの場合は制限
    if (questions.length > 1000) {
      return NextResponse.json(
        { error: 'Too many questions. Maximum 1000 questions per import.' },
        { status: 400 }
      )
    }
    
    // 高速バリデーション
    const validationErrors: string[] = []
    const validatedQuestions: Question[] = []
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      
      // 基本的なバリデーションのみ（高速化）
      if (!question.id || isNaN(Number(question.id))) {
        validationErrors.push(`Question ${i + 1}: Invalid ID`)
        continue
      }
      
      if (!question.question?.trim()) {
        validationErrors.push(`Question ${i + 1}: Missing question text`)
        continue
      }
      
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        validationErrors.push(`Question ${i + 1}: Must have exactly 4 options`)
        continue
      }
      
      const correctNum = Number(question.correct)
      if (isNaN(correctNum) || correctNum < 0 || correctNum > 3) {
        validationErrors.push(`Question ${i + 1}: Correct answer must be 0-3`)
        continue
      }
      
      if (!question.category?.trim()) {
        validationErrors.push(`Question ${i + 1}: Missing category`)
        continue
      }
      
      validatedQuestions.push(question)
    }
    
    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }
    
    // 一括upsert用データ準備
    const dbRows = validatedQuestions.map(q => ({
      legacy_id: q.id,
      category_id: q.category,
      subcategory: q.subcategory || '',
      subcategory_id: q.subcategory_id || '',
      question: q.question,
      option1: q.options[0],
      option2: q.options[1], 
      option3: q.options[2],
      option4: q.options[3],
      correct_answer: q.correct,
      explanation: q.explanation || '',
      difficulty: q.difficulty || '中級',
      time_limit: q.timeLimit || 45,
      related_topics: q.relatedTopics || [],
      source: q.source || '',
      is_deleted: q.deleted || false,
      updated_at: new Date().toISOString()
    }))
    
    let insertedCount = 0
    const updatedCount = 0
    const errors: string[] = []
    
    // 最適化されたバッチ処理（50件ずつで高速化）
    const BATCH_SIZE = 50
    const startTime = Date.now()
    
    for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
      const batch = dbRows.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i/BATCH_SIZE) + 1
      
      try {
        console.log(`⏳ Processing batch ${batchNum}/${Math.ceil(dbRows.length/BATCH_SIZE)}: ${batch.length} questions`)
        
        const { error } = await supabase
          .from('quiz_questions')
          .upsert(batch, { 
            onConflict: 'legacy_id',
            count: 'exact'
          })
        
        if (error) {
          errors.push(`Batch ${batchNum}: ${error.message}`)
          console.error(`❌ Batch ${batchNum} error:`, error)
          // エラーがあっても処理を継続
        } else {
          // 処理成功
          insertedCount += batch.length // 簡略化: 全てupsertとしてカウント
          console.log(`✅ Batch ${batchNum} completed: ${batch.length} questions`)
        }
        
        // タイムアウト対策: 30秒を超えたら残りはスキップ
        if (Date.now() - startTime > 30000) {
          console.warn(`⚠️ Processing timeout reached. Stopping at batch ${batchNum}`)
          errors.push(`Processing stopped at batch ${batchNum} due to timeout`)
          break
        }
        
      } catch (batchError) {
        errors.push(`Batch ${batchNum}: ${batchError.message}`)
        console.error(`❌ Batch ${batchNum} exception:`, batchError)
        // 継続処理
      }
    }
    
    const totalProcessed = insertedCount
    const processingTime = Date.now() - startTime
    
    console.log(`✅ Admin: Bulk upsert completed - ${totalProcessed} questions processed in ${processingTime}ms`)
    
    return NextResponse.json({
      success: errors.length === 0,
      message: `Successfully processed ${totalProcessed} of ${validatedQuestions.length} questions`,
      stats: {
        total: validatedQuestions.length,
        processed: totalProcessed,
        inserted: totalProcessed, // 簡略化: 全てupsert
        updated: 0,
        errors: errors.length,
        processingTimeMs: processingTime
      },
      errors: errors.length > 0 ? errors : undefined,
      warnings: processingTime > 25000 ? ['Processing took longer than expected. Consider splitting large imports.'] : undefined
    })
    
  } catch (error) {
    console.error('❌ Admin bulk upsert error:', error)
    return NextResponse.json(
      { error: 'Failed to update questions', details: error.message },
      { status: 500 }
    )
  }
}

// DB対応版 - 問題データをJSONファイルに同期
export async function PUT() {
  try {
    console.log('🚀 Admin: Starting questions DB→JSON sync')
    
    // DBから全データを取得
    const response = await GET()
    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch data from DB', details: data.error },
        { status: 500 }
      )
    }
    
    const questions = data.questions || []
    
    // JSONファイルパス
    const questionsJsonPath = path.join(process.cwd(), 'public', 'questions.json')
    const backupDir = path.join(process.cwd(), 'backups')
    
    // バックアップディレクトリを作成
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    // 既存ファイルをバックアップ
    let backupPath = null
    if (fs.existsSync(questionsJsonPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      backupPath = path.join(backupDir, `questions-backup-${timestamp}.json`)
      fs.copyFileSync(questionsJsonPath, backupPath)
      console.log(`💾 Backup created: ${path.basename(backupPath)}`)
    }
    
    // 新しいJSONファイルを作成
    const questionsJson = {
      questions,
      lastUpdated: new Date().toISOString(),
      source: 'database_sync',
      totalQuestions: questions.length
    }
    
    fs.writeFileSync(questionsJsonPath, JSON.stringify(questionsJson, null, 2), 'utf-8')
    
    console.log(`✅ Admin: Questions synced to JSON - ${questions.length} questions`)
    
    return NextResponse.json({
      success: true,
      message: `Successfully synced ${questions.length} questions to JSON`,
      stats: {
        totalQuestions: questions.length,
        syncedAt: new Date().toISOString(),
        backupFile: backupPath ? path.basename(backupPath) : null
      }
    })
    
  } catch (error) {
    console.error('❌ Admin questions sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync questions', details: error.message },
      { status: 500 }
    )
  }
}

// DB対応版 - 問題削除
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
    
    const legacyId = Number(questionId)
    
    console.log(`🗑️ Admin: Deleting question ${legacyId}`)
    
    // 論理削除（is_deleted = true）
    const { data, error } = await supabase
      .from('quiz_questions')
      .update({ 
        is_deleted: true,
        updated_at: new Date().toISOString()
      })
      .eq('legacy_id', legacyId)
      .select()
    
    if (error) {
      console.error('❌ Delete operation error:', error)
      return NextResponse.json(
        { error: 'Delete operation failed', details: error.message },
        { status: 500 }
      )
    }
    
    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }
    
    console.log(`✅ Admin: Question ${legacyId} marked as deleted`)
    
    return NextResponse.json({
      success: true,
      message: `Question ${legacyId} deleted successfully`,
      deletedId: legacyId
    })
    
  } catch (error) {
    console.error('❌ Admin delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete question' },
      { status: 500 }
    )
  }
}