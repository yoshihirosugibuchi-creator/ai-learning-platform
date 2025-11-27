import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { saveUserQuizSettings } from '@/lib/user-quiz-settings'
import { generateSelfPersonalizedSet } from '@/lib/precomputed-quiz-engine'

/**
 * セルフパーソナライズクイズ設定を更新
 */
export async function PUT(request: NextRequest) {
  try {
    // Authorization Bearer認証
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '認証トークンが必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // リクエストボディを取得
    const settings = await request.json()

    // セルフパーソナライズクイズ設定を保存
    const result = await saveUserQuizSettings(user.id, settings)
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'セルフパーソナライズ設定の保存に失敗しました' },
        { status: 500 }
      )
    }

    console.log('✅ Quiz personalization settings updated successfully for user:', user.id)

    // セルフパーソナライズクイズ設定変更時は該当タイプの事前セットのみ削除→再生成
    console.log('🔄 Quiz personalization settings changed, regenerating self-personalized precomputed sets...')
    
    try {
      // 1. セルフパーソナライズタイプのみ削除
      console.log('🗑️ Deleting existing self-personalized precomputed sets...')
      const { error: deleteError } = await supabaseAdmin
        .from('precomputed_quiz_sets')
        .delete()
        .eq('user_id', user.id)
        .eq('quiz_type', 'self-personalized')
      
      if (deleteError) {
        console.error('❌ Error deleting self-personalized sets:', deleteError)
        throw deleteError
      }
      console.log('✅ Self-personalized sets deleted successfully')
      
      // 2. 新規セット生成
      const context = {
        userId: user.id,
        forceRegenerate: true
      }
      
      const generationResult = await generateSelfPersonalizedSet(context)
      
      if (generationResult.generated) {
        console.log(`✅ Self-personalized precomputed sets regenerated: ${generationResult.sets_count} sets`)
      } else if (generationResult.skipped) {
        console.log(`ℹ️ Self-personalized precomputed sets skipped: ${generationResult.reason}`)
      }
    } catch (error) {
      console.error('❌ Error regenerating self-personalized precomputed sets:', error)
      // エラーがあっても設定保存は成功させる（事前セット再生成は副次的な処理）
    }

    return NextResponse.json({
      success: true,
      message: 'セルフパーソナライズ設定を更新しました'
    })

  } catch (error) {
    console.error('❌ Error updating quiz personalization settings:', error)
    return NextResponse.json(
      { success: false, error: 'セルフパーソナライズ設定の更新に失敗しました' },
      { status: 500 }
    )
  }
}