import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUserRole } from '@/lib/auth-helpers'

// 管理者権限のSupabaseクライアント（サービスロールキー使用）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// カード削除（DELETE）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    console.log('🗑️ Admin Wisdom Cards API - DELETE request for ID:', resolvedParams.id)
    
    // 認証・権限確認
    const { userId, role } = await getCurrentUserRole(request)
    if (!userId || !role || !['admin', 'system_admin'].includes(role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const cardId = parseInt(resolvedParams.id)
    if (isNaN(cardId)) {
      return NextResponse.json({ error: 'Invalid card ID' }, { status: 400 })
    }

    // 削除前にカードの存在確認
    const { data: existingCard, error: checkError } = await supabaseAdmin
      .from('wisdom_cards')
      .select('id, author, quote, is_active')
      .eq('id', cardId)
      .single()

    if (checkError || !existingCard) {
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    console.log('🎴 Checking wisdom card for deletion:', existingCard.author, '-', existingCard.quote.substring(0, 30) + '...')

    // ユーザーコレクションでの使用確認
    const { data: collectionUsage, error: usageError } = await supabaseAdmin
      .from('wisdom_card_collection')
      .select('user_id, count')
      .eq('card_id', cardId)
      .limit(5) // 最初の5件のみ取得（表示用）

    if (usageError) {
      console.error('❌ Usage check error:', usageError)
      return NextResponse.json({ error: 'Failed to check card usage' }, { status: 500 })
    }

    const usageCount = collectionUsage?.length || 0
    console.log(`📊 Card usage: ${usageCount} users have this card`)

    // 使用中の場合は論理削除（絶版化）
    if (usageCount > 0) {
      console.log('🔥 Card is in use, marking as discontinued (絶版)')
      
      const { data: _updatedCard, error: discontinueError } = await supabaseAdmin
        .from('wisdom_cards')
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', cardId)
        .select()
        .single()

      if (discontinueError) {
        console.error('❌ Card discontinuation error:', discontinueError)
        return NextResponse.json({ error: 'Failed to discontinue card', details: discontinueError.message }, { status: 500 })
      }

      console.log('✅ Wisdom card marked as discontinued (絶版):', cardId)
      return NextResponse.json({ 
        message: `カードを絶版にしました（${usageCount}名のユーザーが所有中）`,
        deletedCard: existingCard,
        discontinued: true,
        usageCount,
        usageDetails: collectionUsage?.slice(0, 3) // 最初の3件のユーザー情報
      })
    }

    // 使用されていない場合は物理削除
    console.log('✅ Card not in use, performing physical deletion')
    
    const { error: deleteError } = await supabaseAdmin
      .from('wisdom_cards')
      .delete()
      .eq('id', cardId)

    if (deleteError) {
      console.error('❌ Card deletion error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete card', details: deleteError.message }, { status: 500 })
    }

    console.log('✅ Wisdom card deleted successfully:', cardId)
    return NextResponse.json({ message: 'Card deleted successfully', deletedCard: existingCard })

  } catch (error) {
    console.error('❌ Admin Wisdom Cards DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}