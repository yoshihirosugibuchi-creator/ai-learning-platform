import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRandomWisdomCard } from '@/lib/cards'
// import { WisdomCard } from '@/lib/cards' // 型情報用（レスポンスでWisdomCard型を返す）
import { addWisdomCardToCollection } from '@/lib/supabase-cards'

// リクエストヘッダーから認証情報を取得してSupabaseクライアントを作成
function getSupabaseWithAuth(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    throw new Error('No authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  )
}

// リクエスト型定義
interface WisdomCardRequest {
  user_id: string
  accuracy_rate: number
}

// レスポンス型定義は直接NextResponse.jsonで使用

export async function POST(request: Request): Promise<NextResponse> {
  const apiStartTime = performance.now()
  try {
    console.log('🎴 Wisdom Card API Request started')
    
    // 認証確認
    const authStartTime = performance.now()
    const supabase = getSupabaseWithAuth(request)
    const { data: { user } } = await supabase.auth.getUser()
    const authTime = performance.now() - authStartTime
    console.log('⏱️ Auth time:', `${authTime.toFixed(2)}ms`)
    
    if (!user) {
      console.log('❌ Authentication failed')
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // リクエストボディ解析
    const body: WisdomCardRequest = await request.json()
    const { user_id, accuracy_rate } = body
    
    // ユーザーID確認
    if (user.id !== user_id) {
      console.log('❌ User ID mismatch')
      return NextResponse.json({ error: 'User ID mismatch' }, { status: 403 })
    }
    
    // 配布条件確認（70%以上）
    if (accuracy_rate < 70.0) {
      console.log('ℹ️ Accuracy rate below threshold:', accuracy_rate)
      return NextResponse.json({
        success: true,
        message: 'Accuracy rate below wisdom card threshold'
      })
    }
    
    console.log('🎯 Processing wisdom card for user:', user_id, 'accuracy:', accuracy_rate)
    
    // カード選択・付与処理
    try {
      const cardSelectStartTime = performance.now()
      const randomCard = getRandomWisdomCard(accuracy_rate)
      const cardSelectTime = performance.now() - cardSelectStartTime
      console.log('⏱️ Card selection time:', `${cardSelectTime.toFixed(2)}ms`)
      
      const dbStartTime = performance.now()
      const cardResult = await addWisdomCardToCollection(user_id, randomCard.id)
      const dbTime = performance.now() - dbStartTime
      console.log('⏱️ DB operation time:', `${dbTime.toFixed(2)}ms`)
      
      const totalTime = performance.now() - apiStartTime
      console.log('⏱️ Total API time:', `${totalTime.toFixed(2)}ms`)
      
      console.log('🎴 Wisdom card processed successfully:', {
        cardId: randomCard.id,
        author: randomCard.author,
        isNew: cardResult.isNew,
        count: cardResult.count,
        timing: {
          auth: `${authTime.toFixed(2)}ms`,
          cardSelect: `${cardSelectTime.toFixed(2)}ms`,
          db: `${dbTime.toFixed(2)}ms`,
          total: `${totalTime.toFixed(2)}ms`
        }
      })
      
      return NextResponse.json({
        success: true,
        awarded_card: randomCard,
        is_new_card: cardResult.isNew,
        card_count: cardResult.count,
        message: 'Wisdom card awarded successfully'
      })
      
    } catch (cardError) {
      console.error('❌ Card processing error:', cardError)
      return NextResponse.json({
        success: false,
        error: 'Failed to process wisdom card',
        message: cardError instanceof Error ? cardError.message : 'Unknown card processing error'
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Wisdom Card API Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}