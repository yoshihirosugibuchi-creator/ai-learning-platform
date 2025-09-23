import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

export async function POST() {
  try {
    console.log('🔄 RPAとノーコード問題の修正及び整合性修正を開始します...')

    const fixes = []

    // 1. RPAとノーコードの2問をAI・機械学習活用に移動
    console.log('🔄 RPAとノーコード問題をAI・機械学習活用に移動...')
    
    // RPAの問題を特定して移動
    const { data: rpaQuestions, error: rpaError } = await supabase
      .from('quiz_questions')
      .select('id, question')
      .ilike('question', '%RPA%')

    if (rpaError) throw new Error(`RPA問題取得エラー: ${rpaError.message}`)

    // ノーコード問題を特定して移動
    const { data: nocodeQuestions, error: nocodeError } = await supabase
      .from('quiz_questions')
      .select('id, question')
      .or('question.ilike.%ローコード%,question.ilike.%ノーコード%,question.ilike.%low-code%,question.ilike.%no-code%')

    if (nocodeError) throw new Error(`ノーコード問題取得エラー: ${nocodeError.message}`)

    const targetQuestionIds = [
      ...(rpaQuestions?.map(q => q.id) || []),
      ...(nocodeQuestions?.map(q => q.id) || [])
    ]

    if (targetQuestionIds.length > 0) {
      const { error: updateRpaNoCodeError } = await supabase
        .from('quiz_questions')
        .update({
          category_id: 'ai_digital_utilization',
          subcategory: 'AI・機械学習活用',
          subcategory_id: 'ai_ml_utilization',
          updated_at: new Date().toISOString()
        })
        .in('id', targetQuestionIds)

      if (updateRpaNoCodeError) {
        throw new Error(`RPA/ノーコード更新エラー: ${updateRpaNoCodeError.message}`)
      }

      fixes.push({
        action: 'RPAとノーコード問題をAI・機械学習活用に移動',
        count: targetQuestionIds.length,
        questionIds: targetQuestionIds
      })
    }

    // 2. プロジェクト炎上対応・リカバリーのサブカテゴリーIDを修正
    console.log('🔄 プロジェクト炎上対応・リカバリーのサブカテゴリーID修正...')
    const { error: projectRecoveryError } = await supabase
      .from('quiz_questions')
      .update({
        subcategory_id: 'project_recovery',
        updated_at: new Date().toISOString()
      })
      .eq('subcategory', 'プロジェクト炎上対応・リカバリー')
      .eq('subcategory_id', 'operation_reform')

    if (projectRecoveryError) {
      throw new Error(`プロジェクト炎上対応修正エラー: ${projectRecoveryError.message}`)
    }

    fixes.push({
      action: 'プロジェクト炎上対応・リカバリーのサブカテゴリーID修正',
      from: 'operation_reform',
      to: 'project_recovery'
    })

    // 3. AI・機械学習活用の誤分類をai_digital_utilizationに修正
    console.log('🔄 AI・機械学習活用の誤分類修正...')
    const { error: aiMlCategoryError } = await supabase
      .from('quiz_questions')
      .update({
        category_id: 'ai_digital_utilization',
        updated_at: new Date().toISOString()
      })
      .eq('subcategory', 'AI・機械学習活用')
      .neq('category_id', 'ai_digital_utilization')

    if (aiMlCategoryError) {
      throw new Error(`AI・機械学習活用カテゴリー修正エラー: ${aiMlCategoryError.message}`)
    }

    fixes.push({
      action: 'AI・機械学習活用の誤分類をai_digital_utilizationに修正'
    })

    // 4. 業務システム設計の誤分類をbusiness_process_analysisに修正
    console.log('🔄 業務システム設計の誤分類修正...')
    const { error: businessSystemError } = await supabase
      .from('quiz_questions')
      .update({
        category_id: 'business_process_analysis',
        updated_at: new Date().toISOString()
      })
      .eq('subcategory', '業務システム設計')
      .neq('category_id', 'business_process_analysis')

    if (businessSystemError) {
      throw new Error(`業務システム設計カテゴリー修正エラー: ${businessSystemError.message}`)
    }

    fixes.push({
      action: '業務システム設計の誤分類をbusiness_process_analysisに修正'
    })

    // 修正後の確認
    const { data: finalCheck, error: finalCheckError } = await supabase
      .from('quiz_questions')
      .select('category_id, subcategory, subcategory_id')
      .in('subcategory', ['AI・機械学習活用', 'プロジェクト炎上対応・リカバリー', '業務システム設計'])

    if (finalCheckError) {
      throw new Error(`最終確認エラー: ${finalCheckError.message}`)
    }

    // 統計
    const stats = {
      aiMlQuestions: finalCheck?.filter(q => q.subcategory === 'AI・機械学習活用').length || 0,
      projectRecoveryQuestions: finalCheck?.filter(q => q.subcategory === 'プロジェクト炎上対応・リカバリー').length || 0,
      businessSystemQuestions: finalCheck?.filter(q => q.subcategory === '業務システム設計').length || 0
    }

    console.log(`✅ 修正完了! ${fixes.length}件の修正を実行しました`)

    return NextResponse.json({
      message: 'RPAとノーコード問題及び整合性修正が完了しました',
      fixes,
      stats,
      verification: finalCheck
    })

  } catch (error) {
    console.error('RPA/ノーコード修正API エラー:', error)
    return NextResponse.json(
      { 
        error: 'RPA/ノーコード修正に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}