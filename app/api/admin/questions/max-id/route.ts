import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

// 最大legacy_id取得API
export async function GET(request: NextRequest) {
  try {
    // 管理者権限チェック（admin または system_admin）
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (!['admin', 'system_admin'].includes(role || '')) {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 })
    }
    
    console.log('🔍 Admin: Fetching max legacy_id')
    
    // 最大のlegacy_idを取得
    const { data, error } = await supabaseAdmin
      .from('quiz_questions')
      .select('legacy_id')
      .order('legacy_id', { ascending: false })
      .limit(1)
    
    if (error) {
      console.error('❌ Max ID query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch max ID', details: error.message },
        { status: 500 }
      )
    }
    
    const maxId = data && data.length > 0 ? data[0].legacy_id : 0
    
    console.log(`✅ Admin: Current max legacy_id = ${maxId}`)
    
    return NextResponse.json({
      success: true,
      maxId: maxId
    })
    
  } catch (error) {
    console.error('❌ Admin max ID error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}