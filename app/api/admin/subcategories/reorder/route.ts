import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subcategories } = body

    if (!subcategories || !Array.isArray(subcategories)) {
      return NextResponse.json(
        { error: 'サブカテゴリーの配列が必要です' },
        { status: 400 }
      )
    }

    console.log('🔄 Updating subcategory display order:', subcategories.map(sub => 
      `${sub.subcategory_id}: ${sub.display_order}`
    ))

    // 各サブカテゴリーの並び順を更新
    const updatePromises = subcategories.map(async (sub: { subcategory_id: string, display_order: number }) => {
      const { error } = await supabase
        .from('subcategories')
        .update({ 
          display_order: sub.display_order,
          updated_at: new Date().toISOString()
        })
        .eq('subcategory_id', sub.subcategory_id)

      if (error) {
        console.error(`Error updating ${sub.subcategory_id}:`, error)
        throw error
      }
    })

    await Promise.all(updatePromises)

    console.log('✅ Successfully updated subcategory display order')
    
    return NextResponse.json({
      message: 'サブカテゴリーの並び順が正常に更新されました'
    })

  } catch (error) {
    console.error('サブカテゴリー並び順更新API エラー:', error)
    return NextResponse.json(
      { error: 'サブカテゴリーの並び順更新に失敗しました' },
      { status: 500 }
    )
  }
}