import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

// 問題文要約関数：問題文を理解しやすい要約形式に変換
function summarizeQuestion(questionText: string): string {
  if (!questionText || questionText.length < 10) {
    return questionText // 短すぎる場合はそのまま返す
  }

  const text = questionText.trim()
  
  // 問題文の核心部分を抽出するロジック
  // 1. 質問形式を識別・変換
  let summary = text
  
  // 一般的な質問パターンを簡潔化
  const questionPatterns = [
    { pattern: /^(.{1,50}?)について、?(.{1,50}?)はどれですか？?$/g, format: "$1の$2" },
    { pattern: /^(.{1,50}?)で(.{1,50}?)する方法はどれですか？?$/g, format: "$1での$2方法" },
    { pattern: /^(.{1,50}?)を(.{1,50}?)する際の(.{1,50}?)はどれですか？?$/g, format: "$1を$2する際の$3" },
    { pattern: /^(.{1,50}?)において、?(.{1,50}?)として正しいものはどれですか？?$/g, format: "$1における$2" },
    { pattern: /^(.{1,50}?)に関して、?(.{1,50}?)はどれですか？?$/g, format: "$1の$2" },
    { pattern: /^(.{1,50}?)の(.{1,50}?)として適切なものはどれですか？?$/g, format: "$1の$2" }
  ]
  
  // パターンマッチングで要約を試行
  for (const { pattern, format } of questionPatterns) {
    const match = text.match(pattern)
    if (match) {
      summary = format.replace(/\$1/g, match[1]?.trim() || '').replace(/\$2/g, match[2]?.trim() || '').replace(/\$3/g, match[3]?.trim() || '')
      break
    }
  }
  
  // パターンマッチしない場合は、重要部分を抽出
  if (summary === text) {
    // 「〜について」「〜において」「〜に関して」などの部分を抽出
    const topicMatch = text.match(/(.{1,40}?)(?:について|において|に関して|とは|の場合|のとき)/)
    if (topicMatch) {
      summary = topicMatch[1] + "について"
    } else {
      // 最初の重要な部分（句点まで、または50文字まで）を抽出
      const firstPart = text.split(/。|、/)[0]
      summary = firstPart.length > 60 ? firstPart.substring(0, 60) + "..." : firstPart
    }
  }
  
  // 最終的に長すぎる場合は切り詰め
  if (summary.length > 80) {
    summary = summary.substring(0, 80) + "..."
  }
  
  return summary
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
          // 問題文要約方式：問題作成者が内容を理解しやすい形式に変換
          const questionSummary = summarizeQuestion(question.question)
          
          // 難易度とタイムリミットを含めた表示形式（クイズ生成画面用日本語化）
          const difficultyMapping: Record<string, string> = {
            'basic': '初級(basic)',
            'intermediate': '中級(intermediate)', 
            'advanced': '上級(advanced)',
            'expert': 'エキスパート(expert)'
          }
          const difficultyLabel = difficultyMapping[question.difficulty || ''] || question.difficulty || '未設定'
          const timeLimitLabel = question.time_limit || 45
          const formattedQuestion = `[${difficultyLabel}・${timeLimitLabel}秒] ${questionSummary}`
          
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