import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    console.log('🔐 Session API Request')
    
    // クライアントサイドのセッション取得
    const authHeader = request.headers.get('authorization')
    
    if (authHeader) {
      // Authorizationヘッダーがある場合はそれを使用
      const token = authHeader.replace('Bearer ', '')
      
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      if (error || !user) {
        return NextResponse.json({ session: null }, { status: 401 })
      }
      
      return NextResponse.json({
        session: {
          access_token: token,
          user: user
        }
      })
    }
    
    // サーバーサイドでのセッション取得（フォールバック）
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('❌ Session error:', error)
      return NextResponse.json({ session: null }, { status: 401 })
    }
    
    console.log('✅ Session retrieved:', {
      user_id: session?.user?.id,
      has_token: !!session?.access_token
    })
    
    return NextResponse.json({ session })
    
  } catch (error) {
    console.error('❌ Session API Error:', error)
    return NextResponse.json({ session: null }, { status: 500 })
  }
}