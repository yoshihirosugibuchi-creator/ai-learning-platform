import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

interface ContentCreateRequest {
  session_id: string
  content_type: 'text' | 'image' | 'video' | 'example' | 'key_points'
  title?: string
  content: string
  duration?: number
  display_order?: number
}

interface ContentUpdateRequest {
  content_type?: 'text' | 'image' | 'video' | 'example' | 'key_points'
  title?: string
  content?: string
  duration?: number
  display_order?: number
}

// ID生成関数（既存パターンに合わせた英数記号）
const generateContentId = (session_id: string, content_type: string, display_order: number): string => {
  // session_id_content_type_order パターン
  const typeMapping: { [key: string]: string } = {
    'text': 'content',
    'image': 'image', 
    'video': 'video',
    'example': 'example',
    'key_points': 'points'
  }

  const typeSuffix = typeMapping[content_type] || 'content'
  const orderNum = display_order || 1
  
  return `${session_id}_${typeSuffix}_${orderNum}`
}

// コンテンツ作成（POST）
export async function POST(request: NextRequest) {
  try {
    // 認証確認
    const { userId, role } = await getCurrentUserRole(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    if (!role || (role !== 'admin' && role !== 'system_admin')) {
      return NextResponse.json(
        { error: '管理者のアクセス権限が必要です' },
        { status: 403 }
      )
    }

    const body: ContentCreateRequest = await request.json()
    const { session_id, content_type, title, content, duration, display_order } = body

    // 必須フィールド検証
    if (!session_id || !content_type || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, content_type, content' },
        { status: 400 }
      )
    }

    // content_type検証
    const validContentTypes = ['text', 'image', 'video', 'example', 'key_points']
    if (!validContentTypes.includes(content_type)) {
      return NextResponse.json(
        { error: `Invalid content_type. Must be one of: ${validContentTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // セッション存在確認
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('learning_sessions')
      .select('id')
      .eq('id', session_id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: `Session not found: ${session_id}` },
        { status: 404 }
      )
    }

    // display_order がない場合、既存コンテンツ数+1を設定
    let finalDisplayOrder = display_order
    if (!finalDisplayOrder) {
      const { data: existingContents } = await supabaseAdmin
        .from('session_contents')
        .select('display_order')
        .eq('session_id', session_id)
        .order('display_order', { ascending: false })
        .limit(1)

      finalDisplayOrder = existingContents && existingContents.length > 0 
        ? (existingContents[0].display_order || 0) + 1 
        : 1
    }

    // ID生成（重複チェック付き）
    let contentId = generateContentId(session_id, content_type, finalDisplayOrder)
    let counter = 1
    const maxAttempts = 10

    while (counter <= maxAttempts) {
      const { data: existing } = await supabaseAdmin
        .from('session_contents')
        .select('id')
        .eq('id', contentId)
        .single()

      if (!existing) break

      contentId = `${generateContentId(session_id, content_type, finalDisplayOrder)}_${counter}`
      counter++
    }

    if (counter > maxAttempts) {
      return NextResponse.json(
        { error: 'Failed to generate unique content ID' },
        { status: 500 }
      )
    }

    // コンテンツ作成
    const contentData = {
      id: contentId,
      session_id,
      content_type,
      title: title || null,
      content,
      duration: duration || null,
      display_order: finalDisplayOrder
    }

    const { data: newContent, error: insertError } = await supabaseAdmin
      .from('session_contents')
      .insert([contentData])
      .select()
      .single()

    if (insertError) {
      console.error('Content insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to create content', details: insertError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      content: newContent,
      message: `Content created: ${contentId}`
    })

  } catch (error) {
    console.error('Content creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// コンテンツ一覧取得（GET）
export async function GET(request: NextRequest) {
  try {
    // 認証確認
    const { userId } = await getCurrentUserRole(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const session_id = searchParams.get('session_id')
    const content_type = searchParams.get('content_type')

    let query = supabaseAdmin
      .from('session_contents')
      .select(`
        *,
        learning_sessions!inner(id, title, theme_id)
      `)
      .order('display_order', { ascending: true })

    if (session_id) {
      query = query.eq('session_id', session_id)
    }

    if (content_type) {
      query = query.eq('content_type', content_type)
    }

    const { data: contents, error } = await query

    if (error) {
      console.error('Contents fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch contents', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      contents: contents || []
    })

  } catch (error) {
    console.error('Contents GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// コンテンツ更新（PATCH）
export async function PATCH(request: NextRequest) {
  try {
    // 認証確認
    const { userId, role } = await getCurrentUserRole(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    if (!role || (role !== 'admin' && role !== 'system_admin')) {
      return NextResponse.json(
        { error: '管理者のアクセス権限が必要です' },
        { status: 403 }
      )
    }

    const body: ContentUpdateRequest & { id: string } = await request.json()
    const { id, content_type, ...otherUpdateData } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required field: id' },
        { status: 400 }
      )
    }

    // content_type検証
    if (content_type) {
      const validContentTypes = ['text', 'image', 'video', 'example', 'key_points']
      if (!validContentTypes.includes(content_type)) {
        return NextResponse.json(
          { error: `Invalid content_type. Must be one of: ${validContentTypes.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // 更新データから undefined を除去
    const updateData = { 
      ...otherUpdateData, 
      ...(content_type && { content_type }) 
    }
    const cleanUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, value]) => value !== undefined)
    )

    if (Object.keys(cleanUpdateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid update fields provided' },
        { status: 400 }
      )
    }

    const { data: updatedContent, error: updateError } = await supabaseAdmin
      .from('session_contents')
      .update(cleanUpdateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Content update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update content', details: updateError.message },
        { status: 500 }
      )
    }

    if (!updatedContent) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      content: updatedContent,
      message: `Content updated: ${id}`
    })

  } catch (error) {
    console.error('Content PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}