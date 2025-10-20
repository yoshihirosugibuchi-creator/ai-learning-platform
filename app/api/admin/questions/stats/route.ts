import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

// キーワード抽出関数：問題文から重要なキーワードを抽出
function extractKeywords(questionText: string): string {
  if (!questionText || questionText.length < 10) {
    return questionText // 短すぎる場合はそのまま返す
  }

  // 日本語の重要語句抽出ロジック
  const text = questionText.trim()
  
  // 1. 専門用語や固有名詞を抽出（カタカナ、英数字含む）
  const technicalTerms = text.match(/[ア-ン][ア-ンー]+|[A-Za-z][A-Za-z0-9]*|[０-９]+/g) || []
  
  // 2. 重要な日本語キーワード（名詞・動詞など）を抽出
  const importantWords = text.match(/[一-龯]{2,}/g) || []
  
  // 3. 記号や接続詞を除去、重複削除
  const keywords = [...new Set([...technicalTerms, ...importantWords])]
    .filter(word => 
      word.length >= 2 && 
      !['です', 'ます', 'した', 'する', 'ある', 'いる', 'ない', 'から', 'ので', 'ため', 'とき', 'こと', 'もの', 'など', 'また', 'さらに', 'ただし', 'なお', 'ちなみに'].includes(word)
    )
    .slice(0, 8) // 最大8個まで
  
  // 4. キーワードを結合して返す
  if (keywords.length === 0) {
    // キーワード抽出できない場合は先頭40文字を返す
    return text.length > 40 ? text.substring(0, 40) + '...' : text
  }
  
  return keywords.join('・')
}

// クイズ問題統計API - 重複防止用
export async function GET(request: NextRequest) {
  try {
    // 管理者権限チェック（admin または system_admin）
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (!['admin', 'system_admin'].includes(role || '')) {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }
    
    console.log('🔍 Admin: Fetching quiz question statistics')
    
    // サブカテゴリー別問題数統計と問題サンプル取得
    console.log('🔍 Querying quiz_questions table...')
    const { data: subcategoryStats, error: subcategoryError } = await supabaseAdmin
      .from('quiz_questions')
      .select('subcategory_id, question, id, category_id, difficulty, time_limit')
      .or('is_deleted.is.null,is_deleted.eq.false')
      .order('id', { ascending: false })
    
    console.log(`📊 Found ${subcategoryStats?.length || 0} total questions`)
    console.log('Sample data:', subcategoryStats?.slice(0, 3))
    
    if (subcategoryError) {
      console.error('❌ Subcategory stats query error:', subcategoryError)
      return NextResponse.json(
        { error: 'Failed to fetch subcategory statistics', details: subcategoryError.message },
        { status: 500 }
      )
    }
    
    // サブカテゴリー別カウント集計と問題サンプル収集
    const subcategoryCount: {[key: string]: number} = {}
    const subcategorySamples: {[key: string]: string[]} = {}
    
    subcategoryStats?.forEach(question => {
      if (question.subcategory_id) {
        // カウント更新
        subcategoryCount[question.subcategory_id] = (subcategoryCount[question.subcategory_id] || 0) + 1
        
        // サンプル収集（全問題を収集・重複完全防止のため）
        if (!subcategorySamples[question.subcategory_id]) {
          subcategorySamples[question.subcategory_id] = []
        }
        if (question.question) {
          // キーワード抽出方式：重要概念を抽出
          const keywords = extractKeywords(question.question)
          
          // 難易度とタイムリミットを含めた表示形式
          const difficultyLabel = question.difficulty || '未設定'
          const timeLimitLabel = question.time_limit || 45
          const formattedQuestion = `[${difficultyLabel}・${timeLimitLabel}秒] ${keywords}`
          
          subcategorySamples[question.subcategory_id].push(formattedQuestion)
        }
      }
    })
    
    // カテゴリー別問題数統計
    const { data: categoryStats, error: categoryError } = await supabaseAdmin
      .from('quiz_questions')
      .select('category_id')
      .eq('is_deleted', false)
    
    if (categoryError) {
      console.error('❌ Category stats query error:', categoryError)
      return NextResponse.json(
        { error: 'Failed to fetch category statistics', details: categoryError.message },
        { status: 500 }
      )
    }
    
    // カテゴリー別カウント集計
    const categoryCount: {[key: string]: number} = {}
    categoryStats?.forEach(question => {
      if (question.category_id) {
        categoryCount[question.category_id] = (categoryCount[question.category_id] || 0) + 1
      }
    })
    
    // 難易度別問題数統計
    const { data: difficultyStats, error: difficultyError } = await supabaseAdmin
      .from('quiz_questions')
      .select('difficulty')
      .eq('is_deleted', false)
    
    if (difficultyError) {
      console.error('❌ Difficulty stats query error:', difficultyError)
      return NextResponse.json(
        { error: 'Failed to fetch difficulty statistics', details: difficultyError.message },
        { status: 500 }
      )
    }
    
    // 難易度別カウント集計
    const difficultyCount: {[key: string]: number} = {}
    difficultyStats?.forEach(question => {
      if (question.difficulty) {
        difficultyCount[question.difficulty] = (difficultyCount[question.difficulty] || 0) + 1
      }
    })
    
    // 全体統計
    const totalQuestions = subcategoryStats?.length || 0
    
    console.log(`✅ Admin: Statistics retrieved - ${totalQuestions} total questions`)
    
    return NextResponse.json({
      success: true,
      total_questions: totalQuestions,
      subcategory_stats: subcategoryCount,
      subcategory_samples: subcategorySamples,
      category_stats: categoryCount,
      difficulty_stats: difficultyCount,
      meta: {
        subcategories_with_questions: Object.keys(subcategoryCount).length,
        categories_with_questions: Object.keys(categoryCount).length,
        difficulties_with_questions: Object.keys(difficultyCount).length,
        total_samples: Object.values(subcategorySamples).reduce((sum, samples) => sum + samples.length, 0),
        retrieved_at: new Date().toISOString()
      }
    })
    
  } catch (error) {
    console.error('❌ Admin question statistics error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}