import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Question型定義（レスポンス用）
interface APIQuestion {
  id: number
  category: string
  subcategory?: string
  subcategory_id?: string
  question: string
  options: string[]
  correct: number
  explanation?: string
  difficulty?: string
  timeLimit?: number
  relatedTopics?: string[]
  source?: string
  deleted?: boolean
}

// DB行をQuestion型に変換
function dbRowToQuestion(row: unknown): APIQuestion {
  const dbRow = row as Record<string, unknown>
  return {
    id: dbRow.legacy_id,
    category: dbRow.category_id,
    subcategory: dbRow.subcategory,
    subcategory_id: dbRow.subcategory_id,
    question: dbRow.question,
    options: [dbRow.option1, dbRow.option2, dbRow.option3, dbRow.option4],
    correct: dbRow.correct_answer,
    explanation: dbRow.explanation,
    difficulty: dbRow.difficulty,
    timeLimit: dbRow.time_limit,
    relatedTopics: dbRow.related_topics || [],
    source: dbRow.source,
    deleted: dbRow.is_deleted
  }
}

// Questions API エンドポイント
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // パラメータ取得
    const category = searchParams.get('category')
    const subcategory = searchParams.get('subcategory')
    const limit = parseInt(searchParams.get('limit') || '1000')
    const random = searchParams.get('random') === 'true'
    const includeDeleted = searchParams.get('includeDeleted') === 'true'
    const difficulty = searchParams.get('difficulty')
    
    console.log('🔍 Questions API Request:', {
      category,
      subcategory,
      limit,
      random,
      includeDeleted,
      difficulty
    })
    
    // ベースクエリ
    let query = supabase
      .from('quiz_questions')
      .select('*')
    
    // 削除されたアイテムの扱い
    if (!includeDeleted) {
      query = query.eq('is_deleted', false)
    }
    
    // カテゴリーフィルター
    if (category) {
      query = query.eq('category_id', category)
    }
    
    // サブカテゴリーフィルター
    if (subcategory) {
      query = query.eq('subcategory_id', subcategory)
    }
    
    // 難易度フィルター
    if (difficulty) {
      query = query.eq('difficulty', difficulty)
    }
    
    // ランダム並び順（PostgreSQL RANDOM()）
    if (random) {
      // PostgreSQLのRANDOM()関数を使用
      query = query.order('random()')
    } else {
      // 通常はlegacy_idでソート
      query = query.order('legacy_id', { ascending: true })
    }
    
    // 件数制限
    if (limit > 0) {
      query = query.limit(limit)
    }
    
    // クエリ実行
    const { data, error } = await query
    
    if (error) {
      console.error('❌ Database query error:', error)
      return NextResponse.json(
        { 
          error: 'Database query failed',
          details: error.message 
        },
        { status: 500 }
      )
    }
    
    // データ変換
    const questions = data?.map(dbRowToQuestion) || []
    
    console.log(`✅ Questions API Success: ${questions.length} questions returned`)
    
    return NextResponse.json({
      questions,
      total: questions.length,
      filters: {
        category,
        subcategory,
        difficulty,
        random,
        includeDeleted
      }
    })
    
  } catch (error) {
    console.error('❌ Questions API Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}