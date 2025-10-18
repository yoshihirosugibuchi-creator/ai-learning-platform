import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    console.log('🔍 Checking quiz_answers question_id values...')
    
    // quiz_answersの最新データを確認
    const { data: quizAnswers, error: answersError } = await supabaseAdmin
      .from('quiz_answers')
      .select('question_id, user_answer, confidence_level, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (answersError) {
      console.error('❌ quiz_answers query error:', answersError)
      return NextResponse.json({ error: 'quiz_answers query failed', details: answersError.message }, { status: 500 })
    }
    
    // quiz_questionsのid, legacy_idの対応関係を確認
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, legacy_id, question')
      .limit(10)
    
    if (questionsError) {
      console.error('❌ quiz_questions query error:', questionsError)
      return NextResponse.json({ error: 'quiz_questions query failed', details: questionsError.message }, { status: 500 })
    }
    
    // question_idの値がid(SERIAL)かlegacy_idかを判定
    const questionIds = quizAnswers?.map(qa => parseInt(qa.question_id)) || []
    const questionsMap = {
      byId: questions?.map(q => q.id) || [],
      byLegacyId: questions?.map(q => q.legacy_id) || []
    }
    
    // マッチング確認
    const matchesId = questionIds.filter(qid => questionsMap.byId.includes(qid))
    const matchesLegacyId = questionIds.filter(qid => questionsMap.byLegacyId.includes(qid))
    
    console.log('✅ Quiz answers question_id analysis completed')
    
    return NextResponse.json({
      analysis: {
        totalQuizAnswers: quizAnswers?.length || 0,
        questionIdsInAnswers: questionIds,
        questionIdsMatchingSerialId: matchesId.length,
        questionIdsMatchingLegacyId: matchesLegacyId.length,
        conclusion: matchesLegacyId.length > matchesId.length ? 'Using legacy_id' : 'Using serial id'
      },
      samples: {
        quizAnswers: quizAnswers?.slice(0, 5),
        questions: questions?.slice(0, 5)
      },
      raw: {
        questionIds,
        questionsById: questionsMap.byId.slice(0, 10),
        questionsByLegacyId: questionsMap.byLegacyId.slice(0, 10)
      }
    })
    
  } catch (error) {
    console.error('❌ Quiz answers check error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}