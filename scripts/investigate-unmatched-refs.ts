/**
 * マッチしない question_id 参照の調査
 */

import 'dotenv/config'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function investigateUnmatched() {
  console.log('🔍 マッチしない回答の詳細調査...')
  
  // 全回答の question_id を取得
  const { data: allAnswers } = await supabaseAdmin
    .from('quiz_answers')
    .select('question_id, created_at')
    
  // 全問題の id を取得
  const { data: allQuestions } = await supabaseAdmin
    .from('quiz_questions')
    .select('id, legacy_id')
    
  const questionIds = new Set(allQuestions?.map(q => q.id.toString()) || [])
  const legacyIds = new Set(allQuestions?.map(q => q.legacy_id.toString()) || [])
  
  // マッチしない question_id を特定
  const unmatchedAnswers = allAnswers?.filter(a => !questionIds.has(a.question_id)) || []
  
  console.log('マッチしない question_id の詳細:')
  const unmatchedCount = new Map()
  unmatchedAnswers.forEach(answer => {
    const count = unmatchedCount.get(answer.question_id) || 0
    unmatchedCount.set(answer.question_id, count + 1)
  })
  
  console.log('\nマッチしない question_id 一覧:')
  Array.from(unmatchedCount.entries()).slice(0, 10).forEach(([qid, count]) => {
    const existsAsLegacy = legacyIds.has(qid)
    console.log(`- ${qid}: ${count}件 (legacy_id存在: ${existsAsLegacy ? 'YES' : 'NO'})`)
  })
  
  console.log(`\n総計: ${unmatchedAnswers.length}件のマッチしない回答`)
  console.log(`ユニークquestion_id: ${unmatchedCount.size}種類`)
  
  // 削除された問題の可能性チェック
  console.log('\n🗑️ 削除された問題の可能性:')
  const potentialDeleted = Array.from(unmatchedCount.keys()).filter(qid => legacyIds.has(qid))
  console.log(`Legacy_idとして存在するが、現在のidにない: ${potentialDeleted.length}種類`)
  
  if (potentialDeleted.length > 0) {
    console.log('削除された可能性のある問題ID:')
    potentialDeleted.slice(0, 5).forEach(qid => {
      console.log(`- ${qid}`)
    })
  }
}

// スクリプト実行
if (require.main === module) {
  investigateUnmatched()
    .then(() => {
      console.log('\n✅ 調査完了')
    })
    .catch(error => {
      console.error('❌ 調査エラー:', error)
      process.exit(1)
    })
}