import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

export async function POST() {
  try {
    console.log('🔄 特定サブカテゴリーの修正を開始します...')

    const fixes = []

    // 1. マーケティング戦略問題を顧客分析・セグメンテーションに修正
    console.log('🔄 ブランディング・ポジショニング問題を顧客分析・セグメンテーションに修正...')
    
    // まず該当問題を特定
    const { data: brandingQuestions, error: brandingError } = await supabase
      .from('quiz_questions')
      .select('id, question, subcategory')
      .eq('subcategory', 'ブランディング・ポジショニング')

    if (brandingError) {
      throw new Error(`ブランディング問題取得エラー: ${brandingError.message}`)
    }

    console.log(`📋 ブランディング・ポジショニング問題: ${brandingQuestions?.length}問見つかりました`)
    brandingQuestions?.forEach(q => {
      console.log(`  - ID ${q.id}: ${q.question.substring(0, 50)}...`)
    })

    // ブランディング・ポジショニング問題を顧客分析・セグメンテーションに変更
    if (brandingQuestions && brandingQuestions.length > 0) {
      const { error: updateBrandingError } = await supabase
        .from('quiz_questions')
        .update({
          subcategory: '顧客分析・セグメンテーション',
          subcategory_id: 'customer_analysis_segmentation',
          updated_at: new Date().toISOString()
        })
        .eq('subcategory', 'ブランディング・ポジショニング')

      if (updateBrandingError) {
        throw new Error(`ブランディング更新エラー: ${updateBrandingError.message}`)
      }

      fixes.push({
        action: 'ブランディング・ポジショニング → 顧客分析・セグメンテーション',
        count: brandingQuestions.length,
        questionIds: brandingQuestions.map(q => q.id)
      })
    }

    // 2. ID315の問題を財務分析・企業価値評価に修正
    console.log('🔄 ID315問題を財務分析・企業価値評価に修正...')
    
    // ID315の内容を確認
    const { data: id315Questions, error: id315Error } = await supabase
      .from('quiz_questions')
      .select('id, question, subcategory, subcategory_id')
      .eq('id', 315)

    if (id315Error) {
      throw new Error(`ID315取得エラー: ${id315Error.message}`)
    }

    if (id315Questions && id315Questions.length > 0) {
      const id315Question = id315Questions[0]
      console.log(`📋 ID315問題内容: ${id315Question.question.substring(0, 100)}...`)
      
      const { error: updateId315Error } = await supabase
        .from('quiz_questions')
        .update({
          subcategory: '財務分析・企業価値評価',
          subcategory_id: 'financial_analysis_valuation',
          updated_at: new Date().toISOString()
        })
        .eq('id', 315)

      if (updateId315Error) {
        throw new Error(`ID315更新エラー: ${updateId315Error.message}`)
      }

      fixes.push({
        action: 'ID315を事業計画・資金調達 → 財務分析・企業価値評価',
        questionId: 315,
        question: id315Question.question.substring(0, 50) + '...'
      })
    }

    // 修正後の確認
    const { data: finalCheck, error: finalCheckError } = await supabase
      .from('quiz_questions')
      .select('id, category_id, subcategory, subcategory_id, question')
      .or('id.eq.315,subcategory.eq.顧客分析・セグメンテーション,subcategory.eq.事業計画・資金調達,subcategory.eq.財務分析・企業価値評価')
      .order('id')

    if (finalCheckError) {
      throw new Error(`最終確認エラー: ${finalCheckError.message}`)
    }

    // 統計
    const stats = {
      customerAnalysisQuestions: finalCheck?.filter(q => q.subcategory === '顧客分析・セグメンテーション').length || 0,
      businessPlanningQuestions: finalCheck?.filter(q => q.subcategory === '事業計画・資金調達').length || 0,
      financialAnalysisQuestions: finalCheck?.filter(q => q.subcategory === '財務分析・企業価値評価').length || 0
    }

    console.log(`✅ 修正完了! ${fixes.length}件の修正を実行しました`)

    return NextResponse.json({
      message: '特定サブカテゴリーの修正が完了しました',
      fixes,
      stats,
      verification: finalCheck?.map(q => ({
        id: q.id,
        category_id: q.category_id,
        subcategory: q.subcategory,
        subcategory_id: q.subcategory_id,
        question: q.question.substring(0, 50) + '...'
      }))
    })

  } catch (error) {
    console.error('特定サブカテゴリー修正API エラー:', error)
    return NextResponse.json(
      { 
        error: '特定サブカテゴリー修正に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}