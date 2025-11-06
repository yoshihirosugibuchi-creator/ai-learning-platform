import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import type { Question } from '@/lib/types'
import fs from 'fs'
import path from 'path'

// 問題データ取得
export async function GET(request: NextRequest) {
  try {
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (!['admin', 'system_admin'].includes(role || '')) {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }
    
    console.log('🔍 Admin: Fetching questions from unified table')
    
    const { data, error } = await supabaseAdmin
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
    
    // 統合テーブルから直接Question型に変換
    const questions: Question[] = data?.map((row) => ({
      id: row.id,
      legacy_id: row.legacy_id,
      category: row.category_id,
      subcategory: row.subcategory || '',
      subcategory_id: row.subcategory_id || '',
      question: row.question,
      options: [row.option1, row.option2, row.option3, row.option4],
      correct: row.correct_answer,
      explanation: row.explanation,
      difficulty: row.difficulty,
      timeLimit: row.time_limit,
      relatedTopics: Array.isArray(row.related_topics) ? row.related_topics as string[] : [],
      source: row.source,
      deleted: row.is_deleted || false,
      level1_hint: row.level1_hint || null,
      level2_hint: row.level2_hint || null,
      level3_hint: row.level3_hint || null,
      // DB日時を追加
      createdAt: row.created_at || undefined,
      updatedAt: row.updated_at || undefined
    })) || []
    
    console.log(`✅ Admin: ${questions.length} questions retrieved`)
    
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

// CSV問題データ取込（統合テーブル・シンプル版）
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { userId, role, error: authError } = await getCurrentUserRole(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required', details: authError }, { status: 401 })
    }
    if (role !== 'system_admin') {
      return NextResponse.json({ error: 'System administrator access required' }, { status: 403 })
    }
    
    console.log('✅ Admin: CSV import started by:', userId)
    
    const { questions }: { questions: Question[] } = await request.json()
    
    if (!Array.isArray(questions)) {
      return NextResponse.json({ error: 'Invalid questions format' }, { status: 400 })
    }
    
    if (questions.length > 1000) {
      return NextResponse.json({ error: 'Too many questions. Maximum 1000 per import.' }, { status: 400 })
    }
    
    console.log(`📋 Processing ${questions.length} questions from CSV`)
    
    // バリデーション
    const validationErrors: string[] = []
    const validatedQuestions: Question[] = []
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      
      if (q.id && isNaN(Number(q.id))) {
        validationErrors.push(`Row ${i + 1}: Invalid ID`)
        continue
      }
      
      if (!q.question?.trim()) {
        validationErrors.push(`Row ${i + 1}: Missing question text`)
        continue
      }
      
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        validationErrors.push(`Row ${i + 1}: Must have exactly 4 options`)
        continue
      }
      
      const correctNum = Number(q.correct)
      if (isNaN(correctNum) || correctNum < 0 || correctNum > 3) {
        validationErrors.push(`Row ${i + 1}: Correct answer must be 0-3`)
        continue
      }
      
      if (!q.category?.trim()) {
        validationErrors.push(`Row ${i + 1}: Missing category`)
        continue
      }
      
      validatedQuestions.push(q)
    }
    
    if (validationErrors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: validationErrors }, { status: 400 })
    }
    
    // 統合テーブル用データ準備
    const dbRows = validatedQuestions.map(q => ({
      ...(q.id ? { id: q.id } : {}), // 既存：ID指定、新規：自動採番
      legacy_id: q.legacy_id as number,
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
      level1_hint: q.level1_hint || null,
      level2_hint: q.level2_hint || null,
      level3_hint: q.level3_hint || null,
      updated_at: new Date().toISOString()
    }))
    
    // バッチ処理でupsert
    let totalProcessed = 0
    const errors: string[] = []
    const BATCH_SIZE = 50
    
    console.log(`🚀 Starting batch upsert (${Math.ceil(dbRows.length/BATCH_SIZE)} batches)`)
    
    for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
      const batch = dbRows.slice(i, i + BATCH_SIZE)
      const batchNum = Math.floor(i/BATCH_SIZE) + 1
      
      try {
        console.log(`⏳ Batch ${batchNum}: Processing ${batch.length} questions`)
        
        const { error } = await supabaseAdmin
          .from('quiz_questions')
          .upsert(batch, { onConflict: 'id' })
        
        if (error) {
          errors.push(`Batch ${batchNum}: ${error.message}`)
          console.error(`❌ Batch ${batchNum} error:`, error)
        } else {
          totalProcessed += batch.length
          console.log(`✅ Batch ${batchNum}: ${batch.length} questions processed`)
        }
      } catch (batchError) {
        const errorMsg = (batchError as Error)?.message || 'Unknown error'
        errors.push(`Batch ${batchNum}: ${errorMsg}`)
        console.error(`❌ Batch ${batchNum} exception:`, batchError)
      }
    }

    // ヒント統計
    const questionsWithHints = validatedQuestions.filter(q => 
      q.level1_hint || q.level2_hint || q.level3_hint
    )

    console.log(`✅ Import completed: ${totalProcessed}/${validatedQuestions.length} processed, ${questionsWithHints.length} with hints`)

    return NextResponse.json({
      success: errors.length === 0,
      message: `Successfully processed ${totalProcessed} of ${validatedQuestions.length} questions`,
      stats: {
        total: validatedQuestions.length,
        processed: totalProcessed,
        errors: errors.length,
        hintsProcessed: questionsWithHints.length
      },
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('❌ CSV import error:', error)
    return NextResponse.json(
      { error: 'Failed to import questions', details: (error as Error)?.message },
      { status: 500 }
    )
  }
}

// JSONファイル同期
export async function PUT(request: NextRequest) {
  try {
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (role !== 'system_admin') {
      return NextResponse.json({ error: 'System administrator access required' }, { status: 403 })
    }
    
    console.log('🚀 Admin: Starting DB→JSON sync')
    
    const response = await GET(request)
    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch data from DB', details: data.error },
        { status: 500 }
      )
    }
    
    const questions = data.questions || []
    const questionsJsonPath = path.join(process.cwd(), 'public', 'questions.json')
    const backupDir = path.join(process.cwd(), 'backups')
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    let backupPath = null
    if (fs.existsSync(questionsJsonPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      backupPath = path.join(backupDir, `questions-backup-${timestamp}.json`)
      fs.copyFileSync(questionsJsonPath, backupPath)
      console.log(`💾 Backup created: ${path.basename(backupPath)}`)
    }
    
    const questionsJson = {
      questions,
      lastUpdated: new Date().toISOString(),
      source: 'database_sync',
      totalQuestions: questions.length
    }
    
    fs.writeFileSync(questionsJsonPath, JSON.stringify(questionsJson, null, 2), 'utf-8')
    
    console.log(`✅ Admin: ${questions.length} questions synced to JSON`)
    
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
      { error: 'Failed to sync questions', details: (error as Error)?.message },
      { status: 500 }
    )
  }
}

// 問題削除
export async function DELETE(request: NextRequest) {
  try {
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (role !== 'system_admin') {
      return NextResponse.json({ error: 'System administrator access required' }, { status: 403 })
    }
    
    const url = new URL(request.url)
    const questionId = url.searchParams.get('id')
    
    if (!questionId || isNaN(Number(questionId))) {
      return NextResponse.json({ error: 'Invalid question ID' }, { status: 400 })
    }
    
    const legacyId = Number(questionId)
    
    console.log(`🗑️ Admin: Deleting question ${legacyId}`)
    
    const { data, error } = await supabaseAdmin
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
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }
    
    console.log(`✅ Admin: Question ${legacyId} marked as deleted`)
    
    return NextResponse.json({
      success: true,
      message: `Question ${legacyId} deleted successfully`,
      deletedId: legacyId
    })
    
  } catch (error) {
    console.error('❌ Admin delete error:', error)
    return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 })
  }
}