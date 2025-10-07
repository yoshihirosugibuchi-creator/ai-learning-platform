/**
 * quiz_answersのquestion_idがquiz_questionsのid or legacy_idのどちらを参照しているかを確認
 */

import 'dotenv/config'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function checkQuestionIdRelationship() {
  console.log('🔍 quiz_answers.question_id の参照先を確認中...')

  // 1. quiz_answersのサンプルを取得
  const { data: answers, error: answersError } = await supabaseAdmin
    .from('quiz_answers')
    .select('question_id')
    .limit(10)

  if (answersError) {
    console.error('❌ quiz_answers取得エラー:', answersError)
    return
  }

  console.log(`📊 サンプルanswers: ${answers?.length}件`)
  const sampleQuestionIds = answers?.map(a => a.question_id) || []
  console.log('サンプルquestion_id:', sampleQuestionIds.slice(0, 5))

  // 2. quiz_questionsでid照合
  console.log('\n🔍 quiz_questions.id との照合...')
  const { data: matchById, error: byIdError } = await supabaseAdmin
    .from('quiz_questions')
    .select('id, legacy_id')
    .in('id', sampleQuestionIds.map(id => parseInt(id)))

  if (byIdError) {
    console.error('❌ id照合エラー:', byIdError)
  } else {
    console.log(`✅ id照合結果: ${matchById?.length}件マッチ`)
    matchById?.slice(0, 3).forEach(q => {
      console.log(`- ID ${q.id} (legacy: ${q.legacy_id})`)
    })
  }

  // 3. quiz_questionsでlegacy_id照合
  console.log('\n🔍 quiz_questions.legacy_id との照合...')
  const { data: matchByLegacyId, error: byLegacyError } = await supabaseAdmin
    .from('quiz_questions')
    .select('id, legacy_id')
    .in('legacy_id', sampleQuestionIds.map(id => parseInt(id)))

  if (byLegacyError) {
    console.error('❌ legacy_id照合エラー:', byLegacyError)
  } else {
    console.log(`✅ legacy_id照合結果: ${matchByLegacyId?.length}件マッチ`)
    matchByLegacyId?.slice(0, 3).forEach(q => {
      console.log(`- Legacy ${q.legacy_id} (ID: ${q.id})`)
    })
  }

  // 4. 詳細分析
  console.log('\n📊 詳細分析:')
  const idMatches = matchById?.length || 0
  const legacyMatches = matchByLegacyId?.length || 0
  const totalSample = sampleQuestionIds.length

  console.log(`- quiz_questions.id でマッチ: ${idMatches}/${totalSample}件 (${((idMatches/totalSample)*100).toFixed(1)}%)`)
  console.log(`- quiz_questions.legacy_id でマッチ: ${legacyMatches}/${totalSample}件 (${((legacyMatches/totalSample)*100).toFixed(1)}%)`)

  if (idMatches > legacyMatches) {
    console.log('✅ 結論: quiz_answers.question_id は quiz_questions.id を参照している')
  } else if (legacyMatches > idMatches) {
    console.log('✅ 結論: quiz_answers.question_id は quiz_questions.legacy_id を参照している')
  } else {
    console.log('⚠️ 結論: 不明確 - 追加調査が必要')
  }

  // 5. 具体例での確認
  if (sampleQuestionIds.length > 0) {
    const sampleId = sampleQuestionIds[0]
    console.log(`\n🔍 具体例確認 (question_id: ${sampleId}):`)
    
    const { data: byIdSample } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, legacy_id')
      .eq('id', parseInt(sampleId))
      .single()

    const { data: byLegacySample } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, legacy_id')
      .eq('legacy_id', parseInt(sampleId))
      .single()

    if (byIdSample) {
      console.log(`- ID ${sampleId}として存在: Quiz ID ${byIdSample.id}`)
    }
    if (byLegacySample) {
      console.log(`- Legacy ID ${sampleId}として存在: Quiz ID ${byLegacySample.id}`)
    }
  }
}

// スクリプト実行
if (require.main === module) {
  checkQuestionIdRelationship()
    .then(() => {
      console.log('\n✅ question_id参照先確認完了')
    })
    .catch(error => {
      console.error('❌ 確認実行エラー:', error)
      process.exit(1)
    })
}