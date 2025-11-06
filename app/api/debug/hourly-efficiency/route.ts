import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    console.log('🔍 Debug: Checking hourly efficiency data for user:', userId)

    // 最新の5件のdaily_xp_recordsをチェック
    const { data: records, error } = await supabaseAdmin
      .from('daily_xp_records')
      .select('user_id, date, hourly_efficiency_data')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(10)

    if (error) {
      console.error('❌ Error fetching daily_xp_records:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log(`📊 Found ${records?.length || 0} daily_xp_records`)

    // hourly_efficiency_dataの存在確認
    const recordsWithHourlyData = records?.filter(r => r.hourly_efficiency_data) || []
    console.log(`⏰ Records with hourly_efficiency_data: ${recordsWithHourlyData.length}`)

    // データの詳細分析
    const analysis = recordsWithHourlyData.map(record => {
      let parsedData = null
      let isValidJson = false
      
      try {
        if (typeof record.hourly_efficiency_data === 'string') {
          parsedData = JSON.parse(record.hourly_efficiency_data)
          isValidJson = true
        } else if (typeof record.hourly_efficiency_data === 'object') {
          parsedData = record.hourly_efficiency_data
          isValidJson = true
        }
      } catch (e) {
        console.error('JSON parse error for record:', record.date, e)
      }

      return {
        date: record.date,
        has_hourly_data: !!record.hourly_efficiency_data,
        is_valid_json: isValidJson,
        hourly_data_type: typeof record.hourly_efficiency_data,
        hourly_stats_count: parsedData?.hourly_stats ? Object.keys(parsedData.hourly_stats).length : 0,
        peak_hours: parsedData?.peak_hours || [],
        total_thinking_time: parsedData?.total_thinking_time || 0,
        daily_session_count: parsedData?.daily_session_count || 0,
        sample_hour_data: parsedData?.hourly_stats ? Object.entries(parsedData.hourly_stats).slice(0, 3) : []
      }
    })

    // 最新のクイズセッションもチェック
    const { data: quizSessions, error: quizError } = await supabaseAdmin
      .from('quiz_sessions')
      .select('created_at, id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)

    if (quizError) {
      console.error('❌ Error fetching quiz sessions:', quizError)
    }

    const results = {
      userId,
      total_records: records?.length || 0,
      records_with_hourly_data: recordsWithHourlyData.length,
      records_analysis: analysis,
      recent_quiz_sessions: quizSessions?.map(s => ({
        created_at: s.created_at,
        session_id: s.id
      })) || [],
      summary: {
        has_recent_records: (records?.length || 0) > 0,
        has_hourly_data: recordsWithHourlyData.length > 0,
        latest_record_date: records?.[0]?.date || null,
        issue_detected: recordsWithHourlyData.length === 0 && (records?.length || 0) > 0
      }
    }

    console.log('✅ Hourly efficiency debug completed:', results.summary)
    return NextResponse.json(results)

  } catch (error) {
    console.error('❌ Debug error:', error)
    return NextResponse.json(
      { error: 'Debug failed', details: (error as Error).message },
      { status: 500 }
    )
  }
}