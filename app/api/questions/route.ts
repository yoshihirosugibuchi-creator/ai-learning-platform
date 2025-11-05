import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { filterQuizzesByActiveCategories } from '@/lib/category-control'

// Question型定義（レスポンス用）
interface APIQuestion {
  id: number
  legacy_id?: number
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
    id: dbRow.id as number,
    legacy_id: dbRow.legacy_id as number | undefined,
    category: dbRow.category_id as string,
    subcategory: dbRow.subcategory as string | undefined,
    subcategory_id: dbRow.subcategory_id as string | undefined,
    question: dbRow.question as string,
    options: [dbRow.option1 as string, dbRow.option2 as string, dbRow.option3 as string, dbRow.option4 as string],
    correct: dbRow.correct_answer as number, // DB is already 0-based
    explanation: dbRow.explanation as string | undefined,
    difficulty: dbRow.difficulty as string | undefined,
    timeLimit: dbRow.time_limit as number | undefined,
    relatedTopics: (dbRow.related_topics as string[]) || [],
    source: dbRow.source as string | undefined,
    deleted: dbRow.is_deleted as boolean | undefined
  }
}

// Questions API エンドポイント
export async function GET(request: Request) {
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
    
    // カテゴリー制御チェック
    const categoryControl = await filterQuizzesByActiveCategories({} as Record<string, unknown>, category || undefined)
    
    // カテゴリーが制限されている場合
    if (categoryControl.blockedCategories.length > 0) {
      console.log('🚫 Category access blocked:', categoryControl.blockedCategories)
      return NextResponse.json({
        questions: [],
        total: 0,
        blocked: true,
        message: categoryControl.warnings.join(' '),
        allowedCategories: categoryControl.allowedCategories,
        filters: {
          category,
          subcategory,
          difficulty,
          random,
          includeDeleted
        }
      })
    }
    
    // ベースクエリ
    let query = supabase
      .from('quiz_questions')
      .select('*')
    
    // 削除されたアイテムの扱い
    if (!includeDeleted) {
      query = query.eq('is_deleted', false)
    }
    
    // アクティブなカテゴリーのみに制限
    if (categoryControl.allowedCategories.length > 0) {
      if (category) {
        // 特定カテゴリーが指定されている場合（既にチェック済み）
        query = query.eq('category_id', category)
      } else {
        // カテゴリー指定なしの場合、アクティブなカテゴリーのみ
        query = query.in('category_id', categoryControl.allowedCategories)
      }
    } else if (category) {
      // フォールバック：指定されたカテゴリーを使用
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
      categoryControl: {
        allowedCategories: categoryControl.allowedCategories,
        blocked: false,
        warnings: categoryControl.warnings
      },
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