// daily_xp_records の詳細調査スクリプト
const { supabase } = require('../lib/supabase');

async function checkDailyRecords() {
  try {
    console.log('🔍 daily_xp_records の詳細調査開始');
    
    // 認証確認
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('❌ ユーザーがログインしていません');
      return;
    }
    
    console.log(`👤 調査対象ユーザー: ${user.id.substring(0, 8)}...`);
    
    // 全データを取得
    const { data: records, error } = await supabase
      .from('daily_xp_records')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });
      
    if (error) {
      console.error('❌ エラー:', error);
      return;
    }
    
    console.log(`📊 総レコード数: ${records?.length || 0}`);
    
    if (!records || records.length === 0) {
      console.log('⚠️ daily_xp_records にデータがありません');
      return;
    }
    
    // 全データ詳細
    console.log('\n📈 全データ詳細:');
    let totalSeconds = 0;
    records.forEach((record, index) => {
      const timeMinutes = Math.round((record.total_time_seconds || 0) / 60);
      totalSeconds += (record.total_time_seconds || 0);
      console.log(`  ${index + 1}. ${record.date}: ${record.total_time_seconds || 0}秒 (${timeMinutes}分) | Quiz: ${record.quiz_sessions || 0}, Course: ${record.course_sessions || 0}`);
    });
    
    console.log(`\n🔢 全期間合計時間: ${totalSeconds}秒 (${Math.round(totalSeconds / 60)}分)`);
    
    // 今週と先週の分析
    console.log('\n📅 週間分析:');
    
    // 週境界の計算をテスト
    const now = new Date();
    console.log(`現在日時: ${now.toISOString()}`);
    
    for (let i = 0; i < 2; i++) {
      const { monday, sunday } = getWeekBounds(now, i);
      const mondayStr = monday.toISOString().split('T')[0];
      const sundayStr = sunday.toISOString().split('T')[0];
      
      console.log(`\n${i === 0 ? '今週' : '先週'} (${mondayStr} - ${sundayStr}):`);
      
      const weekRecords = records.filter(record => {
        return record.date >= mondayStr && record.date <= sundayStr;
      });
      
      const weekTotalSeconds = weekRecords.reduce((sum, r) => sum + (r.total_time_seconds || 0), 0);
      console.log(`  該当レコード数: ${weekRecords.length}`);
      console.log(`  週間合計時間: ${weekTotalSeconds}秒 (${Math.round(weekTotalSeconds / 60)}分)`);
      
      weekRecords.forEach(record => {
        console.log(`    - ${record.date}: ${record.total_time_seconds || 0}秒`);
      });
    }
    
  } catch (error) {
    console.error('❌ スクリプト実行エラー:', error);
  }
}

// 週境界計算関数（supabase-analytics.tsから複製）
function getWeekBounds(date, weeksAgo) {
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

checkDailyRecords().catch(console.error);