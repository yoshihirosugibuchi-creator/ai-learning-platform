import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

export async function POST() {
  try {
    console.log('🔄 手動修正を開始します...')

    const fixes = []

    // 1. マーケティング戦略・フレームワーク → 顧客分析・セグメンテーション
    // 現在"ブランディング・ポジショニング"になっている問題をすべて修正
    console.log('🔄 マーケティング問題を顧客分析・セグメンテーションに修正...')
    
    const { data: marketingQuestions, error: marketingError } = await supabase
      .from('quiz_questions')
      .select('id, question, subcategory')
      .or('question.ilike.%マーケティング戦略%,question.ilike.%フレームワーク%,question.ilike.%ブランディング%,question.ilike.%ポジショニング%')

    if (marketingError) {
      throw new Error(`マーケティング問題取得エラー: ${marketingError.message}`)
    }

    console.log(`📋 マーケティング関連問題: ${marketingQuestions?.length}問見つかりました`)
    
    // まず現在のブランディング・ポジショニングカテゴリーの問題をすべて顧客分析・セグメンテーションに変更
    const { error: updateMarketingError } = await supabase
      .from('quiz_questions')
      .update({
        subcategory: '顧客分析・セグメンテーション',
        subcategory_id: 'customer_analysis_segmentation',
        updated_at: new Date().toISOString()
      })
      .eq('subcategory', 'ブランディング・ポジショニング')

    if (!updateMarketingError) {
      fixes.push({
        action: 'ブランディング・ポジショニング → 顧客分析・セグメンテーション',
        note: '全ての該当問題を修正'
      })
    }

    // 2. 事業計画・資金調達の問題で、財務分析に適した問題を特定して修正
    console.log('🔄 事業計画・資金調達の問題から財務分析相当を検索...')
    
    const { data: financeQuestions, error: financeError } = await supabase
      .from('quiz_questions')
      .select('id, question, subcategory')
      .eq('subcategory', '事業計画・資金調達')

    if (financeError) {
      throw new Error(`財務問題取得エラー: ${financeError.message}`)
    }

    console.log(`📋 事業計画・資金調達問題: ${financeQuestions?.length}問見つかりました`)

    // 財務分析に該当しそうな問題を特定（DCF、企業価値評価、財務分析関連キーワード）
    const financialAnalysisQuestions = financeQuestions?.filter(q => 
      q.question.includes('企業価値評価') ||
      q.question.includes('DCF') ||
      q.question.includes('バリュエーション') ||
      q.question.includes('財務分析') ||
      q.question.includes('ROE') ||
      q.question.includes('ROA') ||
      q.question.includes('EBITDA') ||
      q.question.includes('PBR') ||
      q.question.includes('PER')
    ) || []

    console.log(`📋 財務分析相当の問題: ${financialAnalysisQuestions.length}問特定`)
    financialAnalysisQuestions.forEach(q => {
      console.log(`  - ID ${q.id}: ${q.question.substring(0, 60)}...`)
    })

    if (financialAnalysisQuestions.length > 0) {
      const financialAnalysisIds = financialAnalysisQuestions.map(q => q.id)
      
      const { error: updateFinanceError } = await supabase
        .from('quiz_questions')
        .update({
          subcategory: '財務分析・企業価値評価',
          subcategory_id: 'financial_analysis_valuation',
          updated_at: new Date().toISOString()
        })
        .in('id', financialAnalysisIds)

      if (!updateFinanceError) {
        fixes.push({
          action: '事業計画・資金調達 → 財務分析・企業価値評価',
          count: financialAnalysisIds.length,
          questionIds: financialAnalysisIds
        })
      }
    }

    // 修正後の確認
    const { data: finalCheck, error: finalCheckError } = await supabase
      .from('quiz_questions')
      .select('id, category_id, subcategory, subcategory_id')
      .or('subcategory.eq.顧客分析・セグメンテーション,subcategory.eq.事業計画・資金調達,subcategory.eq.財務分析・企業価値評価')

    if (finalCheckError) {
      throw new Error(`最終確認エラー: ${finalCheckError.message}`)
    }

    // 統計
    const stats = {
      customerAnalysisQuestions: finalCheck?.filter(q => q.subcategory === '顧客分析・セグメンテーション').length || 0,
      businessPlanningQuestions: finalCheck?.filter(q => q.subcategory === '事業計画・資金調達').length || 0,
      financialAnalysisQuestions: finalCheck?.filter(q => q.subcategory === '財務分析・企業価値評価').length || 0
    }

    console.log(`✅ 手動修正完了! ${fixes.length}件の修正を実行しました`)

    return NextResponse.json({
      message: '手動修正が完了しました',
      fixes,
      stats,
      detectedQuestions: {
        marketing: marketingQuestions?.length || 0,
        finance: financeQuestions?.length || 0,
        financialAnalysis: financialAnalysisQuestions.length
      }
    })

  } catch (error) {
    console.error('手動修正API エラー:', error)
    return NextResponse.json(
      { 
        error: '手動修正に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}