import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      subcategory_id,
      name,
      description,
      icon,
      parent_category_id,
      display_order
    } = body

    // バリデーション
    if (!name || !parent_category_id || !subcategory_id) {
      return NextResponse.json(
        { error: 'サブカテゴリーID、名前、親カテゴリーIDは必須です' },
        { status: 400 }
      )
    }

    // サブカテゴリーIDの形式チェック
    if (!/^[a-zA-Z0-9_-]+$/.test(subcategory_id)) {
      return NextResponse.json(
        { error: 'サブカテゴリーIDは英数字、アンダースコア、ハイフンのみ使用できます' },
        { status: 400 }
      )
    }

    // 親カテゴリーの存在確認
    const { data: parentCategory, error: parentError } = await supabase
      .from('categories')
      .select('category_id')
      .eq('category_id', parent_category_id)
      .single()

    if (parentError || !parentCategory) {
      return NextResponse.json(
        { error: '親カテゴリーが見つかりません' },
        { status: 404 }
      )
    }

    // 既存のサブカテゴリーIDとの重複チェック
    const { data: existingSubcategory, error: duplicateError } = await supabase
      .from('subcategories')
      .select('subcategory_id')
      .eq('subcategory_id', subcategory_id)
      .single()

    if (existingSubcategory) {
      return NextResponse.json(
        { error: 'このサブカテゴリーIDは既に使用されています' },
        { status: 409 }
      )
    }

    // サブカテゴリーを作成
    const { data: newSubcategory, error: createError } = await supabase
      .from('subcategories')
      .insert({
        subcategory_id,
        name,
        description: description || '',
        icon: icon || '📚',
        parent_category_id,
        display_order: display_order || 1,
        is_visible: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error('サブカテゴリー作成エラー:', createError)
      return NextResponse.json(
        { error: 'サブカテゴリーの作成に失敗しました', details: createError.message },
        { status: 500 }
      )
    }

    console.log('✅ サブカテゴリーが作成されました:', subcategory_id)
    
    return NextResponse.json({
      message: 'サブカテゴリーが正常に作成されました',
      subcategory: newSubcategory
    })

  } catch (error) {
    console.error('サブカテゴリー作成API エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}