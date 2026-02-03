import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * ユーザー用 クイズパックAPI
 * GET /api/quiz-packs - 公開パック一覧取得
 */

function getSupabaseWithAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    throw new Error('No authorization header')
  }

  const token = authHeader.replace('Bearer ', '')

  return createClient(
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

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function GET(request: NextRequest) {
  try {
    // 認証確認
    const supabase = getSupabaseWithAuth(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: '認証が必要です' },
        { status: 401 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    // 公開パック一覧を取得
    const { data: packs, error } = await supabaseAdmin
      .from('quiz_packs')
      .select('*')
      .eq('is_published', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Quiz packs fetch error:', error)
      return NextResponse.json(
        { success: false, error: 'パック一覧の取得に失敗しました' },
        { status: 500 }
      )
    }

    // ユーザーの各パックでの学習履歴を取得
    const packIds = packs?.map(p => p.id) || []

    if (packIds.length > 0) {
      const { data: sessions } = await supabaseAdmin
        .from('quiz_sessions')
        .select('pack_id, correct_answers, total_questions, status')
        .eq('user_id', user.id)
        .in('pack_id', packIds)
        .eq('status', 'completed')

      // パックごとの統計を計算
      const packStats: Record<string, { attempts: number; bestScore: number }> = {}

      sessions?.forEach(session => {
        if (!session.pack_id) return

        if (!packStats[session.pack_id]) {
          packStats[session.pack_id] = { attempts: 0, bestScore: 0 }
        }

        packStats[session.pack_id].attempts++

        if (session.total_questions && session.total_questions > 0) {
          const score = Math.round((session.correct_answers / session.total_questions) * 100)
          if (score > packStats[session.pack_id].bestScore) {
            packStats[session.pack_id].bestScore = score
          }
        }
      })

      // パックにユーザー統計を追加
      const packsWithStats = packs?.map(pack => ({
        ...pack,
        user_attempts: packStats[pack.id]?.attempts || 0,
        user_best_score: packStats[pack.id]?.bestScore || null
      }))

      return NextResponse.json({
        success: true,
        packs: packsWithStats || []
      })
    }

    return NextResponse.json({
      success: true,
      packs: packs?.map(pack => ({
        ...pack,
        user_attempts: 0,
        user_best_score: null
      })) || []
    })

  } catch (error) {
    console.error('Quiz packs fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
