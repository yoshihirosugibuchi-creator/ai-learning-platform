#!/usr/bin/env node

/**
 * Quiz Questions Detailed Analysis Script
 * Comprehensive analysis for quiz_questions table redesign
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function detailedQuizAnalysis() {
  console.log('🔍 Quiz Questions Detailed Analysis Report')
  console.log('==========================================\n')

  try {
    // 1. Quiz Questions Table Analysis
    console.log('📊 1. Quiz Questions Table Analysis')
    console.log('===================================')
    
    const { data: allQuestions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('*')
      .order('id', { ascending: true })

    if (questionsError) throw questionsError

    const activeQuestions = allQuestions.filter(q => !q.is_deleted)
    const deletedQuestions = allQuestions.filter(q => q.is_deleted)

    console.log(`  総問題数: ${allQuestions.length}`)
    console.log(`  有効問題: ${activeQuestions.length}`)
    console.log(`  削除済み: ${deletedQuestions.length}`)

    // ID analysis
    const ids = allQuestions.map(q => q.id)
    const legacyIds = allQuestions.map(q => q.legacy_id)
    
    console.log(`  ID範囲: ${Math.min(...ids)} - ${Math.max(...ids)}`)
    console.log(`  Legacy ID範囲: ${Math.min(...legacyIds)} - ${Math.max(...legacyIds)}`)

    // 2. Deleted Questions Analysis
    console.log('\n📊 2. Deleted Questions Analysis')
    console.log('================================')
    
    if (deletedQuestions.length > 0) {
      console.log('  削除済み問題一覧:')
      deletedQuestions.forEach(q => {
        console.log(`    ID:${q.id}/L:${q.legacy_id} - ${q.question.slice(0, 60)}...`)
        console.log(`      カテゴリ: ${q.category_id}, 削除日: ${q.updated_at}`)
      })
    } else {
      console.log('  削除済み問題なし')
    }

    // 3. Test Data Identification (Advanced)
    console.log('\n📊 3. Test Data Identification')
    console.log('==============================')
    
    const testDataCandidates = allQuestions.filter(q => {
      const question = q.question.toLowerCase()
      const category = q.category_id.toLowerCase()
      
      // More comprehensive test data patterns
      return (
        question.includes('テスト') ||
        question.includes('test') ||
        question.includes('sample') ||
        question.includes('サンプル') ||
        question.includes('ダミー') ||
        question.includes('dummy') ||
        question.includes('example') ||
        question.includes('例題') ||
        question.length < 15 ||
        category === 'test' ||
        category === 'sample' ||
        category === 'dummy' ||
        q.legacy_id > 5000 ||  // Suspicious high legacy_id
        (q.question.trim() === 'Test question' || q.question.trim() === 'テスト問題')
      )
    })

    console.log(`  テストデータ候補: ${testDataCandidates.length}個`)
    
    if (testDataCandidates.length > 0) {
      console.log('\n  詳細一覧:')
      testDataCandidates.forEach(q => {
        const reasons = []
        const question = q.question.toLowerCase()
        const category = q.category_id.toLowerCase()
        
        if (question.includes('テスト') || question.includes('test')) reasons.push('問題文にテスト')
        if (question.includes('sample') || question.includes('サンプル')) reasons.push('サンプル文言')
        if (question.includes('dummy') || question.includes('ダミー')) reasons.push('ダミー文言')
        if (question.length < 15) reasons.push('短すぎる問題文')
        if (category === 'test' || category === 'sample') reasons.push('テストカテゴリ')
        if (q.legacy_id > 5000) reasons.push('異常に大きいLegacy ID')
        
        console.log(`    ID:${q.id}/L:${q.legacy_id} [${q.is_deleted ? '削除済' : '有効'}]`)
        console.log(`      問題: ${q.question.slice(0, 80)}...`)
        console.log(`      理由: ${reasons.join(', ')}`)
      })
    }

    // 4. Quiz Answers Table Analysis
    console.log('\n📊 4. Quiz Answers Table Analysis (ID Usage)')
    console.log('============================================')
    
    const { data: quizAnswers, error: answersError } = await supabase
      .from('quiz_answers')
      .select('question_id')
      .limit(1000)

    if (answersError) {
      console.log(`  ⚠️ Quiz Answers取得エラー: ${answersError.message}`)
    } else {
      const answerQuestionIds = quizAnswers.map(a => a.question_id)
      const uniqueAnswerQuestionIds = [...new Set(answerQuestionIds)]
      
      console.log(`  Quiz Answers総数: ${quizAnswers.length}`)
      console.log(`  使用されているQuestion ID数: ${uniqueAnswerQuestionIds.length}`)
      
      // Check if quiz_answers uses id or legacy_id
      const matchWithIds = uniqueAnswerQuestionIds.filter(qid => 
        allQuestions.some(q => q.id === qid)
      ).length
      
      const matchWithLegacyIds = uniqueAnswerQuestionIds.filter(qid => 
        allQuestions.some(q => q.legacy_id === qid)
      ).length
      
      console.log(`  ID との一致: ${matchWithIds}/${uniqueAnswerQuestionIds.length}`)
      console.log(`  Legacy ID との一致: ${matchWithLegacyIds}/${uniqueAnswerQuestionIds.length}`)
      
      if (matchWithLegacyIds > matchWithIds) {
        console.log(`  ❌ CRITICAL: Quiz AnswersはLegacy IDを使用中`)
        console.log(`  📋 TODO: Quiz Answers の question_id を ID ベースに変更必要`)
      } else if (matchWithIds > matchWithLegacyIds) {
        console.log(`  ✅ Quiz AnswersはIDを使用`)
      } else {
        console.log(`  ⚠️ WARNING: Quiz Answers ID使用パターン不明`)
      }
    }

    // 5. Other Tables Analysis
    console.log('\n📊 5. Other Related Tables Analysis')
    console.log('===================================')
    
    // Quiz Sessions
    const { data: quizSessions, error: sessionsError } = await supabase
      .from('quiz_sessions')
      .select('id, total_questions')
      .limit(100)

    if (!sessionsError && quizSessions) {
      console.log(`  Quiz Sessions: ${quizSessions.length}個のセッション確認`)
      console.log(`  平均問題数: ${(quizSessions.reduce((sum, s) => sum + s.total_questions, 0) / quizSessions.length).toFixed(1)}問`)
    }

    // 6. ID Gap Analysis (Detailed)
    console.log('\n📊 6. ID Gap Analysis (Detailed)')
    console.log('================================')
    
    const idGaps = []
    const legacyIdGaps = []
    const maxId = Math.max(...ids)
    const maxLegacyId = Math.max(...legacyIds)
    
    for (let i = 1; i <= maxId; i++) {
      if (!ids.includes(i)) idGaps.push(i)
    }
    
    for (let i = 1; i <= Math.min(maxLegacyId, 1000); i++) { // Limit analysis to reasonable range
      if (!legacyIds.includes(i)) legacyIdGaps.push(i)
    }
    
    console.log(`  ID欠番: ${idGaps.length}個 (${(idGaps.length/maxId*100).toFixed(1)}%)`)
    console.log(`  Legacy ID欠番 (1-1000範囲): ${legacyIdGaps.length}個`)
    
    if (idGaps.length > 0) {
      const gapRanges = getGapRanges(idGaps)
      console.log(`  主要欠番範囲: ${gapRanges.slice(0, 5).join(', ')}`)
    }

    // 7. JSON Sync Analysis
    console.log('\n📊 7. JSON File Sync Analysis')
    console.log('=============================')
    
    try {
      const fs = require('fs')
      const path = require('path')
      const questionsJsonPath = path.join(process.cwd(), 'public', 'questions.json')
      
      if (fs.existsSync(questionsJsonPath)) {
        const jsonContent = JSON.parse(fs.readFileSync(questionsJsonPath, 'utf-8'))
        const jsonQuestions = jsonContent.questions || []
        
        console.log(`  JSONファイル問題数: ${jsonQuestions.length}`)
        console.log(`  DB問題数: ${activeQuestions.length}`)
        console.log(`  差分: ${Math.abs(jsonQuestions.length - activeQuestions.length)}問`)
        
        if (jsonQuestions.length !== activeQuestions.length) {
          console.log(`  ❌ CRITICAL: DB-JSON同期不整合`)
          console.log(`  📋 TODO: DB→JSON同期処理実行必要`)
        } else {
          console.log(`  ✅ DB-JSON問題数一致`)
        }
        
        // Check ID usage in JSON
        const jsonIds = jsonQuestions.map(q => q.id)
        const dbActiveIds = activeQuestions.map(q => q.legacy_id) // JSON likely uses legacy_id as id
        
        const jsonDbMatch = jsonIds.filter(jid => dbActiveIds.includes(jid)).length
        console.log(`  JSON-DB ID一致率: ${(jsonDbMatch/jsonQuestions.length*100).toFixed(1)}%`)
        
      } else {
        console.log(`  ⚠️ questions.json ファイルが見つかりません`)
      }
    } catch (jsonError) {
      console.log(`  ⚠️ JSON解析エラー: ${jsonError.message}`)
    }

    // 8. Recommendations Summary
    console.log('\n📋 8. Critical Issues & Recommendations')
    console.log('======================================')
    
    const criticalIssues = []
    const recommendations = []
    
    if (testDataCandidates.length > 0) {
      criticalIssues.push(`テストデータ ${testDataCandidates.length}個の存在`)
      recommendations.push(`テストデータの論理削除`)
    }
    
    if (idGaps.length > allQuestions.length * 0.3) {
      criticalIssues.push(`大量ID欠番 (${idGaps.length}個, ${(idGaps.length/maxId*100).toFixed(1)}%)`)
      recommendations.push(`ID/Legacy ID のリナンバリング`)
    }
    
    criticalIssues.push(`Quiz Answers テーブルのID参照方式要確認`)
    recommendations.push(`Quiz Answers の question_id 参照修正`)
    recommendations.push(`CSV取込のDB API復旧`)
    recommendations.push(`DB→JSON同期処理実装`)
    recommendations.push(`新管理者UI設計`)
    
    console.log('\n  🚨 Critical Issues:')
    criticalIssues.forEach((issue, i) => {
      console.log(`    ${i + 1}. ${issue}`)
    })
    
    console.log('\n  📋 Recommendations:')
    recommendations.forEach((rec, i) => {
      console.log(`    ${i + 1}. ${rec}`)
    })

    console.log('\n✅ Detailed analysis completed successfully')

  } catch (error) {
    console.error('❌ Analysis failed:', error.message)
    process.exit(1)
  }
}

// Helper function to identify gap ranges
function getGapRanges(gaps) {
  if (gaps.length === 0) return []
  
  const ranges = []
  let start = gaps[0]
  let end = gaps[0]
  
  for (let i = 1; i < gaps.length; i++) {
    if (gaps[i] === end + 1) {
      end = gaps[i]
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`)
      start = gaps[i]
      end = gaps[i]
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`)
  
  return ranges
}

// Execute analysis
detailedQuizAnalysis()