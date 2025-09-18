// learning_progressテーブルの状態を詳しく確認

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTUyNDMsImV4cCI6MjA3MzU5MTI0M30.vf-At7yXtqbnUvcylDOnqzm4mSzoNTcJifcfgkBWn0A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLearningProgressTable() {
  console.log('🔍 Checking learning_progress table in detail...');
  
  try {
    // 直接テーブルにアクセス
    const { data, error } = await supabase
      .from('learning_progress')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ learning_progress table error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      
      if (error.code === '42P01') {
        console.log('💡 learning_progressテーブルが存在しません。作成が必要です。');
        console.log('');
        console.log('📝 作成用SQL:');
        console.log(`
CREATE TABLE learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  course_id TEXT,
  lesson_id TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  time_spent INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
        `);
      }
    } else {
      console.log('✅ learning_progress table exists and accessible');
      console.log('📊 Data count:', data?.length || 0);
    }
  } catch (err) {
    console.error('❌ Exception:', err.message);
  }
}

checkLearningProgressTable();