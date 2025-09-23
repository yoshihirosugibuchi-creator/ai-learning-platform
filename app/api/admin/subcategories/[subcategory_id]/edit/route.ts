import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

interface RouteParams {
  params: Promise<{
    subcategory_id: string
  }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { subcategory_id: subcategoryId } = await params
    const body = await request.json()
    const {
      name,
      description,
      icon
    } = body

    // バリデーション
    if (!name) {
      return NextResponse.json(
        { error: 'サブカテゴリー名は必須です' },
        { status: 400 }
      )
    }

    // サブカテゴリーの存在確認
    const { data: existingSubcategory, error: checkError } = await supabase
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

    // サブカテゴリーを更新
    const { data: updatedSubcategory, error: updateError } = await supabase
      .from('subcategories')
      .update({
        name,
        description: description || '',
        icon: icon || '📚',
        updated_at: new Date().toISOString()
      })
      .eq('subcategory_id', subcategoryId)
      .select()
      .single()

    if (updateError) {
      console.error('サブカテゴリー更新エラー:', updateError)
      return NextResponse.json(
        { error: 'サブカテゴリーの更新に失敗しました', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('✅ サブカテゴリーが更新されました:', subcategoryId)
    
    return NextResponse.json({
      message: 'サブカテゴリーが正常に更新されました',
      subcategory: updatedSubcategory
    })

  } catch (error) {
    console.error('サブカテゴリー更新API エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}