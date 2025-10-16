import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUserRole } from '@/lib/auth-helpers'

// 管理者権限のSupabaseクライアント（サービスロールキー使用）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// カード取得（GET）
export async function GET(request: NextRequest) {
  try {
    console.log('🎴 Admin Wisdom Cards API - GET request')
    
    // 認証・権限確認
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId || !role || !['admin', 'system_admin'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // 全カード取得
    const { data: cards, error } = await supabaseAdmin
      .from('wisdom_cards')
      .select('*')
      .order('display_order', { ascending: true })
      .order('id', { ascending: true })

    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch cards' }, { status: 500 })
    }

    console.log(`✅ Successfully fetched ${cards.length} wisdom cards`)
    return NextResponse.json({ cards })

  } catch (error) {
    console.error('❌ Admin Wisdom Cards API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// カード作成（POST）
export async function POST(request: NextRequest) {
  try {
    console.log('🎴 Admin Wisdom Cards API - POST request')
    
    // 認証・権限確認
    const authResult = await getCurrentUserRole(request)
    console.log('🔐 Full auth result - POST:', authResult)
    
    const { userId, role } = authResult
    console.log('🔐 Auth check - POST:', { userId: userId ? 'present' : 'missing', role })
    
    if (!userId || !role || !['admin', 'system_admin'].includes(role)) {
      console.error('❌ Permission denied - POST:', { 
        userId: !!userId, 
        role, 
        required: ['admin', 'system_admin'],
        error: authResult.error 
      })
      return NextResponse.json({ error: 'Insufficient permissions', debug: authResult.error }, { status: 403 })
    }

    // リクエストボディ取得
    const cardData = await request.json()
    console.log('📝 Creating new wisdom card:', cardData.author)

    // データバリデーション
    if (!cardData.author || !cardData.quote || !cardData.category_id || !cardData.rarity) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // カード作成
    const { data: newCard, error } = await supabaseAdmin
      .from('wisdom_cards')
      .insert([{
        author: cardData.author,
        quote: cardData.quote,
        category_id: cardData.category_id,
        subcategory_id: cardData.subcategory_id || null,
        rarity: cardData.rarity,
        context: cardData.context,
        application_area: cardData.application_area,
        card_image_url: cardData.card_image_url || null,
        background_image_url: cardData.background_image_url || null,
        author_portrait_url: cardData.author_portrait_url || null,
        animation_url: cardData.animation_url || null,
        particle_effect_config: null, // JSONBは後で拡張
        category_icon_url: cardData.category_icon_url || null,
        rarity_frame_url: cardData.rarity_frame_url || null,
        special_badge_url: cardData.special_badge_url || null,
        is_active: cardData.is_active !== false,
        display_order: cardData.display_order || 0
      }])
      .select()
      .single()

    if (error) {
      console.error('❌ Card creation error:', error)
      return NextResponse.json({ error: 'Failed to create card', details: error.message }, { status: 500 })
    }

    console.log('✅ Wisdom card created successfully:', newCard.id)
    return NextResponse.json({ card: newCard, message: 'Card created successfully' })

  } catch (error) {
    console.error('❌ Admin Wisdom Cards POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// カード更新（PUT）
export async function PUT(request: NextRequest) {
  try {
    console.log('🎴 Admin Wisdom Cards API - PUT request')
    
    // 認証・権限確認
    const authResult = await getCurrentUserRole(request)
    console.log('🔐 Full auth result - PUT:', authResult)
    
    const { userId, role } = authResult
    console.log('🔐 Auth check - PUT:', { userId: userId ? 'present' : 'missing', role })
    
    if (!userId || !role || !['admin', 'system_admin'].includes(role)) {
      console.error('❌ Permission denied - PUT:', { 
        userId: !!userId, 
        role, 
        required: ['admin', 'system_admin'],
        error: authResult.error 
      })
      return NextResponse.json({ error: 'Insufficient permissions', debug: authResult.error }, { status: 403 })
    }

    // リクエストボディ取得
    const cardData = await request.json()
    console.log('✏️ Updating wisdom card:', cardData.id)

    // IDの確認
    if (!cardData.id) {
      return NextResponse.json({ error: 'Card ID is required' }, { status: 400 })
    }

    // is_activeのみの更新の場合は簡易バリデーション
    const isStatusUpdateOnly = Object.keys(cardData).length <= 3 && cardData.hasOwnProperty('is_active')
    
    if (!isStatusUpdateOnly) {
      // 通常の更新時のバリデーション
      if (!cardData.author || !cardData.quote || !cardData.category_id || !cardData.rarity) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }
    }

    // カード更新（条件分岐）
    let updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (isStatusUpdateOnly) {
      // ステータス更新のみ
      updateData.is_active = cardData.is_active
      console.log(`🔄 Status-only update: is_active = ${cardData.is_active}`)
    } else {
      // 通常の全項目更新
      updateData = {
        ...updateData,
        author: cardData.author,
        quote: cardData.quote,
        category_id: cardData.category_id,
        subcategory_id: cardData.subcategory_id || null,
        rarity: cardData.rarity,
        context: cardData.context,
        application_area: cardData.application_area,
        card_image_url: cardData.card_image_url || null,
        background_image_url: cardData.background_image_url || null,
        author_portrait_url: cardData.author_portrait_url || null,
        animation_url: cardData.animation_url || null,
        category_icon_url: cardData.category_icon_url || null,
        rarity_frame_url: cardData.rarity_frame_url || null,
        special_badge_url: cardData.special_badge_url || null,
        is_active: cardData.is_active !== false,
        display_order: cardData.display_order || 0
      }
    }

    const { data: updatedCard, error } = await supabaseAdmin
      .from('wisdom_cards')
      .update(updateData)
      .eq('id', cardData.id)
      .select()
      .single()

    if (error) {
      console.error('❌ Card update error:', error)
      return NextResponse.json({ error: 'Failed to update card', details: error.message }, { status: 500 })
    }

    console.log('✅ Wisdom card updated successfully:', updatedCard.id)
    return NextResponse.json({ card: updatedCard, message: 'Card updated successfully' })

  } catch (error) {
    console.error('❌ Admin Wisdom Cards PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}