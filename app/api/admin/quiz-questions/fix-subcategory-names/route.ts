import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

// quiz_questionsで使用されている誤ったサブカテゴリー名を正しい名称にマッピング
const quizSubcategoryNameMapping: Record<string, string> = {
  // AI・デジタル活用関連
  "AI・ML基盤構築": "AI・機械学習活用",
  "AI基礎・業務活用": "AI・機械学習活用",
  "DX戦略・実行": "DX戦略・デジタル変革",
  "データ分析・BI活用": "データドリブン経営",
  "システム活用・効率化": "業務システム設計",

  // コンサルティング関連
  "クライアント関係構築": "継続案件獲得・拡販戦略",
  "プロジェクト推進・管理": "プロジェクト炎上対応・リカバリー",

  // マーケティング・営業関連
  "マーケティング戦略・フレームワーク": "ブランディング・ポジショニング",
  "営業戦略・手法": "営業戦略・CRM",

  // 財務関連
  "資金調達・資本政策": "事業計画・資金調達",

  // 商社関連
  "デジタル貿易": "多国間三国間取引",

  // 一般的なカテゴリーレベル
  "category_level": "経営戦略・事業戦略" // 一般的な戦略質問として
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 quiz_questionsテーブルのサブカテゴリー名の修正を開始します...')

    // 1. 現在のquiz_questionsの不正な名称をカウント
    const { data: questions, error: fetchError } = await supabase
      .from('quiz_questions')
      .select('id, subcategory')

    if (fetchError) {
      throw new Error(`データ取得エラー: ${fetchError.message}`)
    }

    // 修正対象のサブカテゴリー名をカウント
    const subcategoryNameCounts: Record<string, number> = {}
    questions?.forEach(q => {
      subcategoryNameCounts[q.subcategory] = (subcategoryNameCounts[q.subcategory] || 0) + 1
    })

    console.log(`📊 総質問数: ${questions?.length}`)
    console.log(`📊 ユニークなサブカテゴリー名数: ${Object.keys(subcategoryNameCounts).length}`)

    let updateCount = 0
    let skipCount = 0
    const results: Array<{
      oldName: string
      newName: string
      questionCount: number
      status: 'success' | 'error' | 'skipped'
      message?: string
    }> = []

    // 2. 各サブカテゴリー名を修正
    for (const [oldName, newName] of Object.entries(quizSubcategoryNameMapping)) {
      const questionCount = subcategoryNameCounts[oldName] || 0
      
      if (questionCount > 0) {
        console.log(`🔄 修正中: "${oldName}" → "${newName}" (${questionCount}問)`)
        
        try {
          // バッチで更新
          const { error: updateError } = await supabase
            .from('quiz_questions')
            .update({ 
              subcategory: newName,
              updated_at: new Date().toISOString()
            })
            .eq('subcategory', oldName)

          if (updateError) {
            throw new Error(updateError.message)
          }

          updateCount += questionCount
          results.push({
            oldName,
            newName,
            questionCount,
            status: 'success'
          })
          console.log(`✅ 更新成功: ${questionCount}問のサブカテゴリー名を "${newName}" に変更`)

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`❌ 更新失敗 "${oldName}": ${errorMessage}`)
          results.push({
            oldName,
            newName,
            questionCount,
            status: 'error',
            message: errorMessage
          })
        }
      } else {
        skipCount++
        results.push({
          oldName,
          newName,
          questionCount: 0,
          status: 'skipped',
          message: '該当する質問なし'
        })
        console.log(`⏭️  スキップ: "${oldName}" (該当する質問なし)`)
      }
    }

    console.log(`✅ 修正完了! 更新: ${updateCount}問, スキップ: ${skipCount}件`)

    // 3. 修正後の状況を確認
    const { data: updatedQuestions, error: verifyError } = await supabase
      .from('quiz_questions')
      .select('subcategory')

    if (!verifyError && updatedQuestions) {
      const updatedCounts: Record<string, number> = {}
      updatedQuestions.forEach(q => {
        updatedCounts[q.subcategory] = (updatedCounts[q.subcategory] || 0) + 1
      })

      console.log('\n📋 修正後のサブカテゴリー名使用状況（上位20位）:')
      Object.entries(updatedCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20)
        .forEach(([name, count]) => {
          console.log(`  - ${name}: ${count}問`)
        })
    }

    return NextResponse.json({
      message: 'quiz_questionsのサブカテゴリー名修正が完了しました',
      summary: {
        totalQuestions: questions?.length || 0,
        updatedQuestions: updateCount,
        skippedMappings: skipCount
      },
      results
    })

  } catch (error) {
    console.error('quiz_questionsのサブカテゴリー名修正API エラー:', error)
    return NextResponse.json(
      { 
        error: 'quiz_questionsのサブカテゴリー名修正に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}