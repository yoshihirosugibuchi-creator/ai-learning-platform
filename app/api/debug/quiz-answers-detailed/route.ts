import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    console.log('🔍 Detailed quiz_answers analysis...')
    
    // quiz_answersの詳細分析
    const { data: allAnswers, error: answersError } = await supabaseAdmin
      .from('quiz_answers')
      .select('question_id, user_answer, confidence_level, created_at, quiz_session_id')
      .order('created_at', { ascending: false })
      .limit(50)
    
    if (answersError) {
      console.error('❌ quiz_answers query error:', answersError)
      return NextResponse.json({ error: 'quiz_answers query failed', details: answersError.message }, { status: 500 })
    }
    
    // question_idのパターン分析
    const patterns = {
      courseConfirmation: [] as string[],
      numericIds: [] as string[],
      otherPatterns: [] as string[]
    }
    
    allAnswers?.forEach(answer => {
      const questionId = answer.question_id
      if (questionId?.startsWith('course_confirmation_')) {
        patterns.courseConfirmation.push(questionId)
      } else if (questionId && /^\d+$/.test(questionId)) {
        patterns.numericIds.push(questionId)
      } else if (questionId) {
        patterns.otherPatterns.push(questionId)
      }
    })
    
    // 数値IDのquiz_questionsテーブルでの対応確認
    const numericQuestionIds = patterns.numericIds.map(id => parseInt(id))
    
    const { data: questionsById, error: byIdError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, legacy_id, question')
      .in('id', numericQuestionIds)
      .limit(10)
    
    const { data: questionsByLegacyId, error: byLegacyError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, legacy_id, question')
      .in('legacy_id', numericQuestionIds)
      .limit(10)
    
    if (byIdError || byLegacyError) {
      console.error('❌ quiz_questions query error:', { byIdError, byLegacyError })
    }
    
    console.log('✅ Detailed quiz answers analysis completed')
    
    return NextResponse.json({
      summary: {
        totalAnswers: allAnswers?.length || 0,
        courseConfirmationAnswers: patterns.courseConfirmation.length,
        numericIdAnswers: patterns.numericIds.length,
        otherPatternAnswers: patterns.otherPatterns.length
      },
      patterns: {
        courseConfirmationSamples: patterns.courseConfirmation.slice(0, 5),
        numericIdSamples: patterns.numericIds.slice(0, 5),
        otherPatternSamples: patterns.otherPatterns.slice(0, 5)
      },
      numericIdMatching: {
        questionsFoundById: questionsById?.length || 0,
        questionsFoundByLegacyId: questionsByLegacyId?.length || 0,
        conclusion: (questionsByLegacyId?.length || 0) > (questionsById?.length || 0) ? 'Numeric IDs match legacy_id' : 'Numeric IDs match serial id'
      },
      samples: {
        recentAnswers: allAnswers?.slice(0, 10),
        questionsById: questionsById?.slice(0, 3),
        questionsByLegacyId: questionsByLegacyId?.slice(0, 3)
      }
    })
    
  } catch (error) {
    console.error('❌ Detailed quiz answers analysis error:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}