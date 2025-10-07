import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    console.log('🔍 quiz_answersテーブルのuser_id設定状況を分析中...')
    
    // 全レコード数を取得
    const { count: totalCount, error: totalError } = await supabaseAdmin
      .from('quiz_answers')
      .select('*', { count: 'exact', head: true })
    
    if (totalError) {
      throw new Error(`Total count error: ${totalError.message}`)
    }
    
    // user_idが設定されているレコード数
    const { count: withUserIdCount, error: withUserIdError } = await supabaseAdmin
      .from('quiz_answers')
      .select('*', { count: 'exact', head: true })
      .not('user_id', 'is', null)
    
    if (withUserIdError) {
      throw new Error(`With user_id count error: ${withUserIdError.message}`)
    }
    
    // user_idがNULLのレコード数
    const { count: withoutUserIdCount, error: withoutUserIdError } = await supabaseAdmin
      .from('quiz_answers')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null)
    
    if (withoutUserIdError) {
      throw new Error(`Without user_id count error: ${withoutUserIdError.message}`)
    }
    
    // サンプルのNULLレコードを取得
    const { data: sampleNullRecords } = await supabaseAdmin
      .from('quiz_answers')
      .select('id, created_at, session_type, quiz_session_id')
      .is('user_id', null)
      .limit(5)
    
    // 設定されているユーザーIDの一覧を取得
    const { data: distinctUserData, error: distinctUserError } = await supabaseAdmin
      .from('quiz_answers')
      .select('user_id')
      .not('user_id', 'is', null)
    
    if (distinctUserError) {
      throw new Error(`Distinct users error: ${distinctUserError.message}`)
    }
    
    const distinctUsers = [...new Set(distinctUserData?.map(d => d.user_id).filter(Boolean))] as string[]
    
    const totalRecords = totalCount || 0
    const withUserId = withUserIdCount || 0
    const withoutUserId = withoutUserIdCount || 0
    const userIdPercentage = totalRecords > 0 ? Math.round((withUserId / totalRecords) * 100 * 100) / 100 : 0
    
    const analysis = {
      totalRecords,
      withUserId,
      withoutUserId,
      userIdPercentage,
      sampleNullRecords: sampleNullRecords || [],
      distinctUsers,
      recommendation: userIdPercentage < 50 ? 'FULL_DELETE' : 'USER_SPECIFIC_DELETE'
    }
    
    console.log('📊 分析結果:')
    console.log(`📝 総レコード数: ${analysis.totalRecords.toLocaleString()}件`)
    console.log(`✅ user_id設定済み: ${analysis.withUserId.toLocaleString()}件 (${analysis.userIdPercentage}%)`)
    console.log(`❌ user_id未設定: ${analysis.withoutUserId.toLocaleString()}件`)
    console.log(`👥 設定済みユーザー数: ${analysis.distinctUsers.length}人`)
    
    return NextResponse.json({
      success: true,
      analysis
    })
    
  } catch (error) {
    console.error('❌ 分析エラー:', error)
    return NextResponse.json(
      { error: 'Analysis failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}