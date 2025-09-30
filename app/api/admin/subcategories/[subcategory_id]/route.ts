import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface RouteParams {
  params: Promise<{
    subcategory_id: string
  }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { subcategory_id: subcategoryId } = await params

    // サブカテゴリーの存在確認
    const { data: existingSubcategory, error: checkError } = await supabaseAdmin
      .from('subcategories')
      .select('subcategory_id, name')
      .eq('subcategory_id', subcategoryId)
      .single()

    if (checkError || !existingSubcategory) {
      return NextResponse.json(
        { error: 'サブカテゴリーが見つかりません' },
        { status: 404 }
      )
    }

    // サブカテゴリーを削除
    const { error: deleteError } = await supabaseAdmin
      .from('subcategories')
      .delete()
      .eq('subcategory_id', subcategoryId)

    if (deleteError) {
      console.error('サブカテゴリー削除エラー:', deleteError)
      return NextResponse.json(
        { error: 'サブカテゴリーの削除に失敗しました', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log('✅ サブカテゴリーが削除されました:', subcategoryId)
    
    return NextResponse.json({
      message: 'サブカテゴリーが正常に削除されました'
    })

  } catch (error) {
    console.error('サブカテゴリー削除API エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}