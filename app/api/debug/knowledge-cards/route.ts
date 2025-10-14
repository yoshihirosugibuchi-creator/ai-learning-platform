import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database-types-official'

function getSupabaseWithAuth(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    throw new Error('No authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

export async function GET(request: Request) {
  try {
    let supabase
    try {
      supabase = getSupabaseWithAuth(request)
    } catch (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // 認証確認
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ User error:', userError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // ナレッジカードデータを取得
    const { data: knowledgeCards, error } = await supabase
      .from('knowledge_card_collection')
      .select('*')
      .eq('user_id', user.id)
      .order('obtained_at', { ascending: false })

    if (error) {
      console.error('Error fetching knowledge cards:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // テーマIDとカードIDの対応関係を推測
    const cardAnalysis = knowledgeCards?.map(card => {
      // 逆算してテーマIDを推測（完全ではないが参考情報として）
      const possibleThemes = ['so_what_why_so', 'conclusion_first', 'mece_thinking', 'logical_tree']
      const matchingThemes = possibleThemes.filter(themeId => {
        const expectedCardId = Math.abs(`theme_${themeId}`.split('').reduce((a, b) => a + b.charCodeAt(0), 0))
        return expectedCardId === card.card_id
      })

      return {
        ...card,
        possibleSourceThemes: matchingThemes
      }
    }) || []

    return NextResponse.json({
      success: true,
      userId: user.id.substring(0, 8) + '...',
      totalCards: knowledgeCards?.length || 0,
      cards: cardAnalysis,
      debugInfo: {
        sampleCardIdCalculations: {
          'theme_so_what_why_so': Math.abs(`theme_so_what_why_so`.split('').reduce((a, b) => a + b.charCodeAt(0), 0)),
          'theme_conclusion_first': Math.abs(`theme_conclusion_first`.split('').reduce((a, b) => a + b.charCodeAt(0), 0)),
          'theme_mece_thinking': Math.abs(`theme_mece_thinking`.split('').reduce((a, b) => a + b.charCodeAt(0), 0)),
          'theme_logical_tree': Math.abs(`theme_logical_tree`.split('').reduce((a, b) => a + b.charCodeAt(0), 0))
        }
      }
    })

  } catch (error) {
    console.error('❌ Debug API Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch knowledge cards debug info',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}