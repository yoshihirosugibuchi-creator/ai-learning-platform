import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { v4 as uuidv4 } from 'uuid'

// ======================================================================
// レビュー問題のCRUD API
// ======================================================================

// GET: レビュー問題の一覧取得（フィルタリング対応）
export async function GET(request: NextRequest) {
  try {
    // システム管理者権限チェック
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (role !== 'admin' && role !== 'system_admin') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }

    // クエリパラメータの取得
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'generated_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    console.log('🔍 Fetching review questions with filters:', { status, category, difficulty, page, limit })

    // クエリ構築（外部キー制約がないため、手動でユーザー情報を後で取得）
    let query = supabaseAdmin
      .from('quiz_questions_review')
      .select('*', { count: 'exact' })
      .is('imported_at', null) // 取込済みでない問題のみ表示

    // フィルタリング
    if (status) {
      query = query.eq('status', status)
    }
    if (category) {
      query = query.eq('category_id', category)
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty)
    }

    // ソート
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy, { ascending })

    // ページネーション
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('❌ Error fetching review questions:', error)
      return NextResponse.json(
        { error: 'Failed to fetch review questions', details: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Fetched ${data?.length || 0} review questions (total: ${count})`)

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
            id: user.id,
            display_name: user.name || user.id,
            username: user.name || user.id
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
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })

  } catch (error) {
    console.error('❌ Review questions GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST: 新規レビュー問題の作成（AI生成結果の保存）
export async function POST(request: NextRequest) {
  try {
    // システム管理者権限チェック
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (role !== 'admin' && role !== 'system_admin') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }

    const body = await request.json()
    const { questions, batchId, aiPrompt, aiModel, generationParams } = body

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: 'Invalid questions data' },
        { status: 400 }
      )
    }

    console.log(`📝 Creating ${questions.length} review questions`)

    // バッチIDの生成（提供されていない場合）
    const generationBatchId = batchId || uuidv4()

    // バッチ情報を記録
    if (!batchId) {
      const { error: batchError } = await supabaseAdmin
        .from('quiz_review_batches')
        .insert({
          id: generationBatchId,
          batch_type: 'generation',
          total_count: questions.length,
          parameters: {
            aiPrompt,
            aiModel,
            generationParams
          },
          executed_by: userId
        })

      if (batchError) {
        console.error('❌ Error creating batch record:', batchError)
      }
    }

    // 問題データの整形
    const reviewQuestions = questions.map(q => ({
      question: q.question,
      option_a: q.options?.A || q.option_a || '',
      option_b: q.options?.B || q.option_b || '',
      option_c: q.options?.C || q.option_c || '',
      option_d: q.options?.D || q.option_d || '',
      correct_answer: typeof q.correctAnswer === 'string' 
        ? ['A', 'B', 'C', 'D'].indexOf(q.correctAnswer)
        : (q.correct || 0),
      explanation: q.explanation || '',
      category_id: q.category || q.category_id,
      subcategory: q.subcategory || '',
      subcategory_id: q.subcategory_id || '',
      difficulty: q.difficulty || '中級',
      time_limit: q.timeLimit || q.time_limit || 45,
      tags: q.tags || [],
      source: q.source || '',
      level1_hint: q.hint1 || null,
      level2_hint: q.hint2 || null,
      level3_hint: q.hint3 || null,
      status: 'pending',
      priority: 0,
      ai_prompt: aiPrompt || '',
      ai_model: aiModel || 'claude',
      generation_params: generationParams || {},
      generated_by: userId,
      generation_batch_id: generationBatchId
    }))

    // データベースに挿入
    const { data, error } = await supabaseAdmin
      .from('quiz_questions_review')
      .insert(reviewQuestions)
      .select()

    if (error) {
      console.error('❌ Error inserting review questions:', error)

      // バッチエラーを記録
      await supabaseAdmin
        .from('quiz_review_batches')
        .update({
          failed_count: questions.length,
          completed_at: new Date().toISOString(),
          errors: { message: error.message }
        })
        .eq('id', generationBatchId)

      return NextResponse.json(
        { error: 'Failed to save review questions', details: error.message },
        { status: 500 }
      )
    }

    // バッチ成功を記録
    await supabaseAdmin
      .from('quiz_review_batches')
      .update({
        success_count: data.length,
        completed_at: new Date().toISOString()
      })
      .eq('id', generationBatchId)

    // 履歴に記録
    const historyRecords = data.map(q => ({
      review_question_id: q.id,
      action_type: 'created',
      new_status: 'pending',
      comment: 'AI generated question saved for review',
      performed_by: userId
    }))

    await supabaseAdmin
      .from('quiz_review_history')
      .insert(historyRecords)

    console.log(`✅ Created ${data.length} review questions`)

    return NextResponse.json({
      success: true,
      data,
      batchId: generationBatchId,
      message: `Successfully created ${data.length} review questions`
    })

  } catch (error) {
    console.error('❌ Review questions POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT: レビュー問題の更新
export async function PUT(request: NextRequest) {
  try {
    // システム管理者権限チェック
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (role !== 'admin' && role !== 'system_admin') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }

    const body = await request.json()
    const { id: idFromBody, ...updateData } = body

    if (!idFromBody) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      )
    }

    const id = typeof idFromBody === 'number' ? idFromBody : parseInt(idFromBody, 10)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid question ID format' },
        { status: 400 }
      )
    }

    console.log(`📝 Updating review question ${id}`)

    // 現在のデータを取得（履歴用）
    const { data: currentData, error: fetchError } = await supabaseAdmin
      .from('quiz_questions_review')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentData) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // 変更内容を記録
    const changes: Record<string, { old: string | number | null; new: string | number | null }> = {}
    
    // 型安全な比較のため、更新可能なフィールドを明示的に処理
    if ('question' in updateData && currentData.question !== updateData.question) {
      changes.question = { old: currentData.question, new: updateData.question }
    }
    if ('option_a' in updateData && currentData.option_a !== updateData.option_a) {
      changes.option_a = { old: currentData.option_a, new: updateData.option_a }
    }
    if ('option_b' in updateData && currentData.option_b !== updateData.option_b) {
      changes.option_b = { old: currentData.option_b, new: updateData.option_b }
    }
    if ('option_c' in updateData && currentData.option_c !== updateData.option_c) {
      changes.option_c = { old: currentData.option_c, new: updateData.option_c }
    }
    if ('option_d' in updateData && currentData.option_d !== updateData.option_d) {
      changes.option_d = { old: currentData.option_d, new: updateData.option_d }
    }
    if ('correct_answer' in updateData && currentData.correct_answer !== updateData.correct_answer) {
      changes.correct_answer = { old: currentData.correct_answer, new: updateData.correct_answer }
    }
    if ('explanation' in updateData && currentData.explanation !== updateData.explanation) {
      changes.explanation = { old: currentData.explanation, new: updateData.explanation }
    }
    if ('status' in updateData && currentData.status !== updateData.status) {
      changes.status = { old: currentData.status, new: updateData.status }
    }
    if ('level1_hint' in updateData && currentData.level1_hint !== updateData.level1_hint) {
      changes.level1_hint = { old: currentData.level1_hint, new: updateData.level1_hint }
    }
    if ('level2_hint' in updateData && currentData.level2_hint !== updateData.level2_hint) {
      changes.level2_hint = { old: currentData.level2_hint, new: updateData.level2_hint }
    }
    if ('level3_hint' in updateData && currentData.level3_hint !== updateData.level3_hint) {
      changes.level3_hint = { old: currentData.level3_hint, new: updateData.level3_hint }
    }

    // 更新実行
    const { data, error } = await supabaseAdmin
      .from('quiz_questions_review')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Error updating review question:', error)
      return NextResponse.json(
        { error: 'Failed to update question', details: error.message },
        { status: 500 }
      )
    }

    // 履歴に記録
    await supabaseAdmin
      .from('quiz_review_history')
      .insert({
        review_question_id: id,
        action_type: 'edited',
        previous_status: currentData.status,
        new_status: updateData.status || currentData.status,
        changes,
        comment: updateData.review_notes || 'Question updated',
        performed_by: userId
      })

    console.log(`✅ Updated review question ${id}`)

    return NextResponse.json({
      success: true,
      data,
      message: 'Question updated successfully'
    })

  } catch (error) {
    console.error('❌ Review questions PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: レビュー問題の削除
export async function DELETE(request: NextRequest) {
  try {
    // システム管理者権限チェック
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (role !== 'admin' && role !== 'system_admin') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const idStr = searchParams.get('id')

    if (!idStr) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      )
    }

    const id = parseInt(idStr, 10)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'Invalid question ID format' },
        { status: 400 }
      )
    }

    console.log(`🗑️ Deleting review question ${id}`)

    // 削除実行（履歴は CASCADE で自動削除される）
    const { error } = await supabaseAdmin
      .from('quiz_questions_review')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('❌ Error deleting review question:', error)
      return NextResponse.json(
        { error: 'Failed to delete question', details: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Deleted review question ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Question deleted successfully'
    })

  } catch (error) {
    console.error('❌ Review questions DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}