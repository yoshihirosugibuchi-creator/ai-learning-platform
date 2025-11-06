import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { v4 as uuidv4 } from 'uuid'

// ======================================================================
// 承認済みレビュー問題の本番DB取込API
// ======================================================================

// POST: 承認済み問題を本番DBに取り込み
export async function POST(request: NextRequest) {
  try {
    // システム管理者権限チェック
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (!['admin', 'system_admin'].includes(role || '')) {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }

    const body = await request.json()
    const { questionIds, skipDuplicateCheck = false } = body

    // バリデーション
    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json(
        { error: 'Question IDs are required' },
        { status: 400 }
      )
    }

    console.log(`📥 Starting import for ${questionIds.length} approved questions`)

    // 承認済み問題を取得
    const { data: reviewQuestions, error: fetchError } = await supabaseAdmin
      .from('quiz_questions_review')
      .select('*')
      .in('id', questionIds)
      .eq('status', 'approved')

    if (fetchError) {
      console.error('❌ Error fetching approved questions:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch approved questions', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!reviewQuestions || reviewQuestions.length === 0) {
      return NextResponse.json(
        { error: 'No approved questions found with the provided IDs' },
        { status: 404 }
      )
    }

    console.log(`📋 Found ${reviewQuestions.length} approved questions to import`)

    // バッチIDを生成
    const importBatchId = uuidv4()

    // バッチ情報を記録
    const { error: batchError } = await supabaseAdmin
      .from('quiz_review_batches')
      .insert({
        id: importBatchId,
        batch_type: 'import',
        total_count: reviewQuestions.length,
        parameters: { skipDuplicateCheck },
        executed_by: userId
      })

    if (batchError) {
      console.error('⚠️ Error creating batch record:', batchError)
    }

    // 重複チェック（オプション）
    let duplicates: any[] = []
    if (!skipDuplicateCheck) {
      console.log('🔍 Checking for duplicates...')
      
      // 本番DBから既存の問題を取得して重複チェック
      const { data: existingQuestions } = await supabaseAdmin
        .from('quiz_questions')
        .select('question, category_id, subcategory_id')
      
      if (existingQuestions) {
        duplicates = reviewQuestions.filter(rq => 
          existingQuestions.some(eq => 
            eq.question === rq.question && 
            eq.category_id === rq.category_id &&
            eq.subcategory_id === rq.subcategory_id
          )
        )
        
        if (duplicates.length > 0) {
          console.log(`⚠️ Found ${duplicates.length} potential duplicates`)
        }
      }
    }

    // 重複を除外した問題リスト
    const questionsToImport = reviewQuestions.filter(q => 
      !duplicates.find(d => d.id === q.id)
    )

    if (questionsToImport.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'All questions are duplicates',
        summary: {
          requested: questionIds.length,
          approved: reviewQuestions.length,
          duplicates: duplicates.length,
          imported: 0
        }
      })
    }

    // 最大legacy_idを取得
    const { data: maxIdData } = await supabaseAdmin
      .from('quiz_questions')
      .select('legacy_id')
      .order('legacy_id', { ascending: false })
      .limit(1)
    
    const maxLegacyId = maxIdData?.[0]?.legacy_id || 0

    // 本番DB用にデータを整形
    const productionQuestions = questionsToImport.map((q, index) => ({
      legacy_id: maxLegacyId + index + 1, // 最大値+1から連番
      category_id: q.category_id,
      subcategory: q.subcategory || '',
      subcategory_id: q.subcategory_id || '',
      question: q.question,
      option1: q.option_a,
      option2: q.option_b,
      option3: q.option_c,
      option4: q.option_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation || '',
      difficulty: q.difficulty || '中級',
      time_limit: q.time_limit || 45,
      related_topics: q.tags || [],
      source: q.source || 'AI Generated',
      level1_hint: q.level1_hint || null,
      level2_hint: q.level2_hint || null,
      level3_hint: q.level3_hint || null,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // 本番DBに挿入
    const { data: importedData, error: importError } = await supabaseAdmin
      .from('quiz_questions')
      .insert(productionQuestions)
      .select()

    if (importError) {
      console.error('❌ Error importing to production DB:', importError)
      
      // バッチエラーを記録
      await supabaseAdmin
        .from('quiz_review_batches')
        .update({
          failed_count: questionsToImport.length,
          completed_at: new Date().toISOString(),
          errors: { message: importError.message }
        })
        .eq('id', importBatchId)

      return NextResponse.json(
        { error: 'Failed to import questions', details: importError.message },
        { status: 500 }
      )
    }

    console.log(`✅ Successfully imported ${importedData.length} questions to production DB`)

    // レビューDBの取込情報を更新
    const updatePromises = importedData.map((imported, index) => {
      const reviewId = questionsToImport[index].id
      return supabaseAdmin
        .from('quiz_questions_review')
        .update({
          imported_at: new Date().toISOString(),
          imported_by: userId,
          production_question_id: imported.id,
          import_batch_id: importBatchId
        })
        .eq('id', reviewId)
    })

    await Promise.all(updatePromises)

    // 履歴に記録
    const historyRecords = questionsToImport.map(q => ({
      review_question_id: q.id,
      action_type: 'imported',
      previous_status: 'approved',
      new_status: 'approved',
      comment: `Imported to production DB (Batch: ${importBatchId})`,
      performed_by: userId
    }))

    await supabaseAdmin
      .from('quiz_review_history')
      .insert(historyRecords)

    // バッチ完了を記録
    await supabaseAdmin
      .from('quiz_review_batches')
      .update({
        success_count: importedData.length,
        failed_count: duplicates.length,
        completed_at: new Date().toISOString()
      })
      .eq('id', importBatchId)

    return NextResponse.json({
      success: true,
      data: importedData,
      batchId: importBatchId,
      message: `Successfully imported ${importedData.length} questions to production`,
      summary: {
        requested: questionIds.length,
        approved: reviewQuestions.length,
        duplicates: duplicates.length,
        imported: importedData.length,
        skipped: duplicates.map(d => ({
          id: d.id,
          question: d.question.substring(0, 50) + '...'
        }))
      }
    })

  } catch (error) {
    console.error('❌ Import error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: 取込可能な承認済み問題の一覧取得
export async function GET(request: NextRequest) {
  try {
    // システム管理者権限チェック
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (!['admin', 'system_admin'].includes(role || '')) {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }

    console.log('📋 Fetching approved questions ready for import')
    console.log('🔍 User info:', { userId, role })

    // 承認済みで未取込の問題を取得
    console.log('🔍 Querying with conditions: status=approved, imported_at=null')
    const { data, error, count } = await supabaseAdmin
      .from('quiz_questions_review')
      .select('*', { count: 'exact' })
      .eq('status', 'approved')
      .is('imported_at', null)
      .order('reviewed_at', { ascending: false })

    console.log('🗄️ Query result:', { dataLength: data?.length, error, count })
    
    if (error) {
      console.error('❌ Error fetching importable questions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch importable questions', details: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Found ${data?.length || 0} approved questions ready for import`)

    // ユーザー情報を手動で取得して付加
    let enrichedData = data || []
    if (data && data.length > 0) {
      // ユニークなユーザーIDを収集
      const userIds = new Set<string>()
      data.forEach(question => {
        if (question.generated_by) userIds.add(question.generated_by)
        if (question.reviewed_by) userIds.add(question.reviewed_by)
      })

      if (userIds.size > 0) {
        // ユーザー情報を一括取得
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, name')
          .in('id', Array.from(userIds))

        // ユーザー情報をマップに変換
        const userMap = new Map()
        users?.forEach(user => {
          userMap.set(user.id, {
            display_name: user.name || user.id
          })
        })

        // データにユーザー情報を付加
        enrichedData = data.map(question => ({
          ...question,
          generator: question.generated_by ? userMap.get(question.generated_by) : null,
          reviewer: question.reviewed_by ? userMap.get(question.reviewed_by) : null
        }))
      }
    }

    return NextResponse.json({
      success: true,
      data: enrichedData,
      count: count || 0,
      message: `${count || 0} approved questions ready for import`
    })

  } catch (error) {
    console.error('❌ Import GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}