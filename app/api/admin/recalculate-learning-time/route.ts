import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// リクエストヘッダーから認証情報を取得してSupabaseクライアントを作成
function getSupabaseWithAuth(request: Request) {
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

interface RecalculateRequest {
  userId?: string // 特定ユーザーのみ再計算（省略時は認証ユーザー）
}

// 学習時間統計再計算API
export async function POST(request: Request) {
  try {
    console.log('📊 Learning time recalculation API called')

    const body: RecalculateRequest = await request.json()
    
    // 認証付きSupabaseクライアント作成
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

    const targetUserId = body.userId || user.id
    console.log('👤 Recalculating for user:', targetUserId.substring(0, 8) + '...')
    
    // PostgreSQL関数を使用して高速再計算
    const { data: recalcResult, error: recalcError } = await supabase
      .rpc('update_user_learning_time_stats', { 
        target_user_id: targetUserId 
      })
    
    if (recalcError) {
      console.error('❌ Recalculation error:', recalcError)
      return NextResponse.json(
        { 
          error: 'Failed to recalculate learning time',
          details: recalcError.message 
        }, 
        { status: 500 }
      )
    }

    const result = recalcResult?.[0]
    
    if (!result) {
      return NextResponse.json(
        { error: 'No data returned from recalculation' }, 
        { status: 500 }
      )
    }

    console.log('✅ Learning time recalculation completed:', {
      userId: targetUserId,
      quizTime: result.quiz_time,
      courseTime: result.course_time,
      totalTime: result.total_time,
      updatedRows: result.updated_rows
    })

    // 日次データの再計算（オプション、重い処理なので非同期）
    Promise.resolve().then(async () => {
      try {
        console.log('📅 Starting daily data recalculation (async)...')
        
        const { data: dailyData, error: dailyError } = await supabase
          .rpc('recalculate_daily_learning_time', { 
            target_user_id: targetUserId 
          })
        
        if (dailyError) {
          console.warn('⚠️ Daily recalculation warning:', dailyError)
          return
        }

        // daily_xp_recordsテーブルを更新
        if (dailyData && dailyData.length > 0) {
          const updates = dailyData.map((day: { 
            date_str: string
            quiz_time_seconds: number
            course_time_seconds: number
            total_time_seconds: number
          }) => ({
            user_id: targetUserId,
            date: day.date_str,
            quiz_time_seconds: day.quiz_time_seconds,
            course_time_seconds: day.course_time_seconds,
            total_time_seconds: day.total_time_seconds
          }))
          
          // 効率的なUPSERT処理
          const { error: upsertError } = await supabase
            .from('daily_xp_records')
            .upsert(updates, { 
              onConflict: 'user_id,date',
              ignoreDuplicates: false 
            })
          
          if (upsertError) {
            console.warn('⚠️ Daily records upsert warning:', upsertError)
          } else {
            console.log('📅 Daily learning time records updated:', updates.length)
          }
        }
        
      } catch (error) {
        console.warn('⚠️ Async daily recalculation error:', error)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Learning time statistics recalculated successfully',
      data: {
        userId: targetUserId,
        quizLearningTimeSeconds: result.quiz_time,
        courseLearningTimeSeconds: result.course_time,
        totalLearningTimeSeconds: result.total_time,
        updatedRows: result.updated_rows
      }
    })

  } catch (error) {
    console.error('❌ Learning time recalculation API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    )
  }
}