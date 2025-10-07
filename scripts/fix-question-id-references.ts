/**
 * quiz_answers.question_id参照修正スクリプト
 * 
 * 目的:
 * 1. quiz_answers.question_id を legacy_id参照から id参照に変更
 * 2. subcategory_id ブランクを 'category_level' に統一
 */

import 'dotenv/config'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface FixReport {
  questionIdFix: {
    totalAnswers: number
    updatedAnswers: number
    unmatchedAnswers: number
    errors: string[]
  }
  subcategoryFix: {
    blankAnswers: number
    updatedAnswers: number
    blankQuestions: number
    updatedQuestions: number
    errors: string[]
  }
}

/**
 * 1. quiz_answers.question_id を legacy_id から id 参照に修正
 */
async function fixQuestionIdReferences(): Promise<FixReport['questionIdFix']> {
  console.log('🔧 quiz_answers.question_id 参照修正開始...')
  
  const result: FixReport['questionIdFix'] = {
    totalAnswers: 0,
    updatedAnswers: 0,
    unmatchedAnswers: 0,
    errors: []
  }
  
  try {
    // 現状確認
    const { count: totalCount } = await supabaseAdmin
      .from('quiz_answers')
      .select('*', { count: 'exact', head: true })
      
    result.totalAnswers = totalCount || 0
    console.log(`📊 総回答数: ${result.totalAnswers}件`)
    
    if (result.totalAnswers === 0) {
      console.log('ℹ️ 回答データが存在しません')
      return result
    }
    
    // legacy_id → id マッピング作成
    console.log('🗺️ ID マッピング作成中...')
    const { data: idMapping, error: mappingError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, legacy_id')
      
    if (mappingError) {
      result.errors.push(`IDマッピング取得エラー: ${mappingError.message}`)
      return result
    }
    
    const legacyToIdMap = new Map<string, number>()
    idMapping?.forEach(q => {
      legacyToIdMap.set(q.legacy_id.toString(), q.id)
    })
    
    console.log(`✅ IDマッピング作成完了: ${legacyToIdMap.size}件`)
    
    // quiz_answersを個別更新
    console.log('🔄 quiz_answers.question_id 更新中...')
    
    // 全回答を取得
    const { data: allAnswers, error: fetchError } = await supabaseAdmin
      .from('quiz_answers')
      .select('id, question_id')
      
    if (fetchError) {
      result.errors.push(`回答取得エラー: ${fetchError.message}`)
      return result
    }
    
    let updatedCount = 0
    const batchSize = 50
    
    for (let i = 0; i < (allAnswers?.length || 0); i += batchSize) {
      const batch = allAnswers?.slice(i, i + batchSize) || []
      console.log(`📝 ${i + 1}-${Math.min(i + batchSize, allAnswers?.length || 0)}件目を処理中...`)
      
      for (const answer of batch) {
        const newId = legacyToIdMap.get(answer.question_id)
        if (newId && newId.toString() !== answer.question_id) {
          const { error: updateError } = await supabaseAdmin
            .from('quiz_answers')
            .update({ question_id: newId.toString() })
            .eq('id', answer.id)
            
          if (updateError) {
            result.errors.push(`回答${answer.id}更新エラー: ${updateError.message}`)
          } else {
            updatedCount++
          }
        }
      }
    }
    
    result.updatedAnswers = updatedCount
    console.log(`✅ 更新完了: ${result.updatedAnswers}件`)
    
    // マッチしなかった回答の確認（簡易チェック）
    const { data: allAnswersAfter, error: afterFetchError } = await supabaseAdmin
      .from('quiz_answers')
      .select('question_id')
      
    if (!afterFetchError && allAnswersAfter) {
      const { data: allQuestions } = await supabaseAdmin
        .from('quiz_questions')
        .select('id')
        
      const questionIds = new Set(allQuestions?.map(q => q.id.toString()) || [])
      const unmatchedCount = allAnswersAfter.filter(a => !questionIds.has(a.question_id)).length
      
      result.unmatchedAnswers = unmatchedCount
      if (unmatchedCount > 0) {
        result.errors.push(`マッチしない回答: ${unmatchedCount}件`)
      }
    }
    
  } catch (error) {
    result.errors.push(`予期しないエラー: ${error}`)
  }
  
  return result
}

/**
 * 2. subcategory_id ブランクを 'category_level' に修正
 */
async function fixSubcategoryReferences(): Promise<FixReport['subcategoryFix']> {
  console.log('\n🔧 subcategory_id ブランク修正開始...')
  
  const result: FixReport['subcategoryFix'] = {
    blankAnswers: 0,
    updatedAnswers: 0,
    blankQuestions: 0,
    updatedQuestions: 0,
    errors: []
  }
  
  try {
    // quiz_answersのブランク確認・修正
    console.log('📊 quiz_answers subcategory_id ブランク確認中...')
    const { count: blankAnswersCount } = await supabaseAdmin
      .from('quiz_answers')
      .select('*', { count: 'exact', head: true })
      .or('subcategory_id.is.null,subcategory_id.eq.')
      
    result.blankAnswers = blankAnswersCount || 0
    console.log(`📊 ブランク回答数: ${result.blankAnswers}件`)
    
    if (result.blankAnswers > 0) {
      const { error: updateAnswersError } = await supabaseAdmin
        .from('quiz_answers')
        .update({ subcategory_id: 'category_level' })
        .or('subcategory_id.is.null,subcategory_id.eq.')
        
      if (updateAnswersError) {
        result.errors.push(`quiz_answers更新エラー: ${updateAnswersError.message}`)
      } else {
        result.updatedAnswers = result.blankAnswers
        console.log(`✅ quiz_answers更新完了: ${result.updatedAnswers}件`)
      }
    }
    
    // quiz_questionsのブランク確認・修正
    console.log('📊 quiz_questions subcategory_id ブランク確認中...')
    const { count: blankQuestionsCount } = await supabaseAdmin
      .from('quiz_questions')
      .select('*', { count: 'exact', head: true })
      .or('subcategory_id.is.null,subcategory_id.eq.')
      
    result.blankQuestions = blankQuestionsCount || 0
    console.log(`📊 ブランク問題数: ${result.blankQuestions}件`)
    
    if (result.blankQuestions > 0) {
      const { error: updateQuestionsError } = await supabaseAdmin
        .from('quiz_questions')
        .update({ 
          subcategory_id: 'category_level',
          subcategory: 'カテゴリーレベル'
        })
        .or('subcategory_id.is.null,subcategory_id.eq.')
        
      if (updateQuestionsError) {
        result.errors.push(`quiz_questions更新エラー: ${updateQuestionsError.message}`)
      } else {
        result.updatedQuestions = result.blankQuestions
        console.log(`✅ quiz_questions更新完了: ${result.updatedQuestions}件`)
      }
    }
    
  } catch (error) {
    result.errors.push(`予期しないエラー: ${error}`)
  }
  
  return result
}

/**
 * 3. 修正結果の検証
 */
async function validateFixes(): Promise<void> {
  console.log('\n🔍 修正結果検証中...')
  
  try {
    // quiz_answers.question_id 参照の整合性確認（簡易チェック）
    const { data: allAnswers } = await supabaseAdmin
      .from('quiz_answers')
      .select('question_id')
      
    const { data: allQuestions } = await supabaseAdmin
      .from('quiz_questions')
      .select('id')
      
    const questionIds = new Set(allQuestions?.map(q => q.id.toString()) || [])
    const invalidCount = allAnswers?.filter(a => !questionIds.has(a.question_id)).length || 0
      
    console.log(`🔍 無効な question_id 参照: ${invalidCount}件`)
    
    // subcategory_id ブランクの残存確認
    const { count: remainingBlanks } = await supabaseAdmin
      .from('quiz_answers')
      .select('*', { count: 'exact', head: true })
      .or('subcategory_id.is.null,subcategory_id.eq.')
      
    console.log(`🔍 残存subcategory_idブランク: ${remainingBlanks || 0}件`)
    
  } catch (error) {
    console.error('❌ 検証エラー:', error)
  }
}

/**
 * メイン実行
 */
async function runQuestionIdFix(): Promise<FixReport> {
  console.log('🔧 quiz_answers データ修正スクリプト開始')
  console.log('=' .repeat(50))
  
  const report: FixReport = {
    questionIdFix: {
      totalAnswers: 0,
      updatedAnswers: 0,
      unmatchedAnswers: 0,
      errors: []
    },
    subcategoryFix: {
      blankAnswers: 0,
      updatedAnswers: 0,
      blankQuestions: 0,
      updatedQuestions: 0,
      errors: []
    }
  }
  
  try {
    // Phase 1: question_id 参照修正
    report.questionIdFix = await fixQuestionIdReferences()
    
    // Phase 2: subcategory_id 修正
    report.subcategoryFix = await fixSubcategoryReferences()
    
    // Phase 3: 検証
    await validateFixes()
    
    console.log('\n📋 修正結果サマリー:')
    console.log(`🔧 question_id修正: ${report.questionIdFix.updatedAnswers}/${report.questionIdFix.totalAnswers}件`)
    console.log(`📝 subcategory修正: 回答${report.subcategoryFix.updatedAnswers}件, 問題${report.subcategoryFix.updatedQuestions}件`)
    
    const allErrors = [...report.questionIdFix.errors, ...report.subcategoryFix.errors]
    if (allErrors.length > 0) {
      console.log('\n⚠️ エラー詳細:')
      allErrors.forEach(err => console.log(`- ${err}`))
    }
    
  } catch (error) {
    console.error('❌ 修正処理中にエラーが発生:', error)
    throw error
  }
  
  return report
}

// スクリプト実行
if (require.main === module) {
  runQuestionIdFix()
    .then(report => {
      console.log('\n✅ quiz_answers データ修正完了')
      console.log('\n📄 完全なレポート:')
      console.log(JSON.stringify(report, null, 2))
    })
    .catch(error => {
      console.error('❌ 修正実行エラー:', error)
      process.exit(1)
    })
}