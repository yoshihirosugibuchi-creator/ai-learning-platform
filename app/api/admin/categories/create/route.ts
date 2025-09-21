import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      category_id,
      name,
      description,
      type,
      icon,
      color,
      is_active = false,
      is_visible = true
    } = body

    // バリデーション
    if (!category_id || !name || !type) {
      return NextResponse.json(
        { error: '必須フィールドが不足しています（category_id, name, type）' },
        { status: 400 }
      )
    }

    if (!['main', 'industry'].includes(type)) {
      return NextResponse.json(
        { error: 'typeは "main" または "industry" である必要があります' },
        { status: 400 }
      )
    }

    // カテゴリーIDの重複チェック
    const { data: existingCategory, error: checkError } = await supabase
      .from('categories')
      .select('category_id')
      .eq('category_id', category_id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('カテゴリー存在チェックエラー:', checkError)
      return NextResponse.json(
        { error: 'カテゴリー存在チェックに失敗しました' },
        { status: 500 }
      )
    }

    if (existingCategory) {
      return NextResponse.json(
        { error: `カテゴリーID "${category_id}" は既に存在します` },
        { status: 409 }
      )
    }

    // 同タイプの最大display_orderを取得
    const { data: maxOrderResult, error: maxOrderError } = await supabase
      .from('categories')
      .select('display_order')
      .eq('type', type)
      .order('display_order', { ascending: false })
      .limit(1)

    if (maxOrderError) {
      console.error('最大display_order取得エラー:', maxOrderError)
      return NextResponse.json(
        { error: '表示順序の取得に失敗しました' },
        { status: 500 }
      )
    }

    const nextDisplayOrder = (maxOrderResult?.[0]?.display_order || 0) + 1

    // 新しいカテゴリーを作成
    const { data: newCategory, error: insertError } = await supabase
      .from('categories')
      .insert([{
        category_id,
        name,
        description: description || '',
        type,
        icon: icon || '📚',
        color: color || '#6B7280',
        display_order: nextDisplayOrder,
        is_active,
        is_visible,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (insertError) {
      console.error('カテゴリー作成エラー:', insertError)
      return NextResponse.json(
        { error: 'カテゴリーの作成に失敗しました', details: insertError.message },
        { status: 500 }
      )
    }

    console.log('✅ 新しいカテゴリーが作成されました:', newCategory.category_id)
    
    return NextResponse.json({
      message: 'カテゴリーが正常に作成されました',
      category: newCategory
    }, { status: 201 })

  } catch (error) {
    console.error('カテゴリー作成API エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}