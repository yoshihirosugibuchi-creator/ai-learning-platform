import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 category_levelの修正を元に戻します...')

    // subcategory_idとsubcategoryの両方を元に戻す
    const { error: updateError } = await supabase
      .from('quiz_questions')
      .update({ 
        subcategory_id: 'category_level',
        subcategory: 'category_level',
        updated_at: new Date().toISOString()
      })
      .eq('subcategory', '経営戦略・事業戦略')

    if (updateError) {
      throw new Error(`更新エラー: ${updateError.message}`)
    }

    // 修正結果を確認
    const { data: updatedQuestions, error: fetchError } = await supabase
      .from('quiz_questions')
      .select('id, subcategory_id, subcategory')
      .eq('subcategory', 'category_level')

    if (fetchError) {
      throw new Error(`確認エラー: ${fetchError.message}`)
    }

    console.log(`✅ category_levelの修正完了: ${updatedQuestions?.length}問を修正`)

    return NextResponse.json({
      message: 'category_levelの修正が完了しました',
      summary: {
        updatedQuestions: updatedQuestions?.length || 0
      },
      questions: updatedQuestions
    })

  } catch (error) {
    console.error('category_level修正API エラー:', error)
    return NextResponse.json(
      { 
        error: 'category_levelの修正に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}