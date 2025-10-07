// 週間データ分析用デバッグAPI
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🔍 週間データ分析デバッグAPI開始');
    
    // 認証確認
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'ユーザーがログインしていません' }, { status: 401 });
    }
    
    console.log(`👤 調査対象ユーザー: ${user.id.substring(0, 8)}...`);
    
    // daily_xp_records の全データを取得
    const { data: records, error } = await supabase
      .from('daily_xp_records')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
      
    if (error) {
      console.error('❌ daily_xp_records取得エラー:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log(`📊 総レコード数: ${records?.length || 0}`);
    
    if (!records || records.length === 0) {
      return NextResponse.json({ 
        message: 'daily_xp_records にデータがありません',
        records: [],
        analysis: null
      });
    }
    
    // 全データ分析
    let totalSeconds = 0;
    const detailedRecords = records.map((record, index) => {
      const timeMinutes = Math.round((record.total_time_seconds || 0) / 60);
      totalSeconds += (record.total_time_seconds || 0);
      return {
        index: index + 1,
        date: record.date,
        timeSeconds: record.total_time_seconds || 0,
        timeMinutes,
        quizSessions: record.quiz_sessions || 0,
        courseSessions: record.course_sessions || 0
      };
    });
    
    console.log(`🔢 全期間合計時間: ${totalSeconds}秒 (${Math.round(totalSeconds / 60)}分)`);
    
    // 週間分析
    const now = new Date();
    const weeklyAnalysis = [];
    
    for (let i = 0; i < 4; i++) {
      const { monday, sunday } = getWeekBounds(now, i);
      const mondayStr = monday.toISOString().split('T')[0];
      const sundayStr = sunday.toISOString().split('T')[0];
      
      const weekRecords = records.filter(record => {
        return record.date >= mondayStr && record.date <= sundayStr;
      });
      
      const weekTotalSeconds = weekRecords.reduce((sum, r) => sum + (r.total_time_seconds || 0), 0);
      
      const weekData = {
        weekIndex: i,
        label: i === 0 ? '今週' : i === 1 ? '先週' : `${i}週間前`,
        dateRange: `${mondayStr} - ${sundayStr}`,
        recordCount: weekRecords.length,
        totalSeconds: weekTotalSeconds,
        totalMinutes: Math.round(weekTotalSeconds / 60),
        records: weekRecords.map(r => ({
          date: r.date,
          timeSeconds: r.total_time_seconds || 0,
          timeMinutes: Math.round((r.total_time_seconds || 0) / 60)
        }))
      };
      
      weeklyAnalysis.push(weekData);
      
      console.log(`\n${weekData.label} (${weekData.dateRange}):`);
      console.log(`  該当レコード数: ${weekData.recordCount}`);
      console.log(`  週間合計時間: ${weekTotalSeconds}秒 (${Math.round(weekTotalSeconds / 60)}分)`);
    }
    
    // user_xp_stats_v2 の学習時間も取得して比較
    const { data: xpStats } = await supabase
      .from('user_xp_stats_v2')
      .select('total_learning_time_seconds, quiz_learning_time_seconds, course_learning_time_seconds')
      .eq('user_id', user.id)
      .single();
    
    return NextResponse.json({
      message: '週間データ分析完了',
      currentTime: now.toISOString(),
      totalRecords: records.length,
      allPeriodTotal: {
        seconds: totalSeconds,
        minutes: Math.round(totalSeconds / 60)
      },
      xpStatsComparison: {
        totalLearningTimeSeconds: xpStats?.total_learning_time_seconds || 0,
        totalLearningTimeMinutes: Math.round((xpStats?.total_learning_time_seconds || 0) / 60),
        quizLearningTimeSeconds: xpStats?.quiz_learning_time_seconds || 0,
        courseLearningTimeSeconds: xpStats?.course_learning_time_seconds || 0
      },
      weeklyAnalysis,
      detailedRecords: detailedRecords.slice(0, 10) // 最近10件のみ
    });
    
  } catch (error) {
    console.error('❌ 週間データ分析エラー:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}

// 週境界計算関数（supabase-analytics.tsから複製）
function getWeekBounds(date: Date, weeksAgo: number): { monday: Date, sunday: Date } {
  const target = new Date(date);
  target.setDate(date.getDate() - (weeksAgo * 7));
  
  // その週の月曜日を取得
  const dayOfWeek = target.getDay(); // 0=日曜, 1=月曜, ...
  const monday = new Date(target);
  monday.setDate(target.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0); // 開始時刻を00:00:00に設定
  
  // その週の日曜日を取得
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999); // 終了時刻を23:59:59に設定
  
  return { monday, sunday };
}