import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase-admin'

interface RouteParams {
  params: Promise<{
    category_id: string
  }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { category_id: categoryId } = await params
    const body = await request.json()
    const {
      name,
      description,
      icon,
      color,
      is_active,
      is_visible
    } = body

    console.log('📝 Starting category update:', {
      categoryId,
      requestData: body,
      timestamp: new Date().toISOString()
    })

    // バリデーション
    if (!name) {
      return NextResponse.json(
        { error: 'カテゴリー名は必須です' },
        { status: 400 }
      )
    }

    // カテゴリーの存在確認
    console.log('🔍 Checking if category exists:', categoryId)
    const { data: existingCategory, error: checkError } = await supabase
      .from('categories')
      .select('category_id, name, is_active, is_visible')
      .eq('category_id', categoryId)
      .single()

    console.log('📊 Existing category data:', existingCategory)
    console.log('❓ Check error:', checkError)

    if (checkError || !existingCategory) {
      console.error('❌ Category not found:', { categoryId, checkError })
      return NextResponse.json(
        { error: 'カテゴリーが見つかりません' },
        { status: 404 }
      )
    }

    // 更新データの準備
    const updateData = {
      name,
      description: description || '',
      icon: icon || '📚',
      color: color || '#6B7280',
      is_active: is_active ?? false,
      is_visible: is_visible ?? true,
      updated_at: new Date().toISOString()
    }

    console.log('🔄 Attempting to update with data:', updateData)

    // カテゴリーを更新
    const { data: updatedCategory, error: updateError } = await supabase
      .from('categories')
      .update(updateData)
      .eq('category_id', categoryId)
      .select()
      .single()

    console.log('📤 Update response:', { updatedCategory, updateError })

    if (updateError) {
      console.error('❌ カテゴリー更新エラー:', {
        error: updateError,
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      })
      return NextResponse.json(
        { 
          error: 'カテゴリーの更新に失敗しました', 
          details: updateError.message,
          code: updateError.code,
          hint: updateError.hint
        },
        { status: 500 }
      )
    }

    // 更新後の確認
    console.log('🔍 Verifying update...')
    const { data: verifyData, error: verifyError } = await supabase
      .from('categories')
      .select('category_id, name, is_active, is_visible, updated_at')
      .eq('category_id', categoryId)
      .single()

    console.log('✅ Verification result:', { verifyData, verifyError })

    console.log('✅ カテゴリーが更新されました:', categoryId)
    
    return NextResponse.json({
      message: 'カテゴリーが正常に更新されました',
      category: updatedCategory,
      verification: verifyData
    })

  } catch (error) {
    console.error('❌ カテゴリー更新API 例外エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', details: (error as any)?.message || 'Unknown error' },
      { status: 500 }
    )
  }
}