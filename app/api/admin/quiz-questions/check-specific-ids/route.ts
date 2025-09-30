import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type QuizQuestionPartial = {
  id: number
  category_id: string
  subcategory: string | null
  subcategory_id: string | null
  question: string
}

export async function GET() {
  try {
    console.log('🔍 特定ID問題の確認を開始します...')

    // ID 236, 275, 315の問題を確認
    const { data: specificQuestions, error: specificError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, category_id, subcategory, subcategory_id, question')
      .in('id', [236, 275, 315])
      .order('id')

    if (specificError) {
      throw new Error(`特定ID取得エラー: ${specificError.message}`)
    }

    // ブランディング・ポジショニング問題も確認
    const { data: brandingQuestions, error: brandingError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, category_id, subcategory, subcategory_id, question')
      .eq('subcategory', 'ブランディング・ポジショニング')

    if (brandingError) {
      throw new Error(`ブランディング問題取得エラー: ${brandingError.message}`)
    }

    console.log(`📋 特定ID問題: ${specificQuestions?.length}問見つかりました`)
    console.log(`📋 ブランディング・ポジショニング問題: ${brandingQuestions?.length}問見つかりました`)

    return NextResponse.json({
      message: '特定ID問題の確認完了',
      specificQuestions: specificQuestions?.map((q: QuizQuestionPartial) => ({
        id: q.id,
        category_id: q.category_id,
        subcategory: q.subcategory,
        subcategory_id: q.subcategory_id,
        question: q.question.substring(0, 100) + '...'
      })),
      brandingQuestions: brandingQuestions?.map((q: QuizQuestionPartial) => ({
        id: q.id,
        category_id: q.category_id,
        subcategory: q.subcategory,
        subcategory_id: q.subcategory_id,
        question: q.question.substring(0, 100) + '...'
      }))
    })

  } catch (error) {
    console.error('特定ID確認API エラー:', error)
    return NextResponse.json(
      { 
        error: '特定ID確認に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}