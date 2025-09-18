// テストユーザーに業界カテゴリーを設定するスクリプト

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bddqkmnbbvllpvsynklr.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTUyNDMsImV4cCI6MjA3MzU5MTI0M30.vf-At7yXtqbnUvcylDOnqzm4mSzoNTcJifcfgkBWn0A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setTestUserIndustry() {
  console.log('🔧 Testing database and categories...');
  
  try {
    // Check users table
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, total_xp, current_level')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    } else {
      console.log('✅ Users table:');
      usersData.forEach(user => {
        console.log(`  - ${user.id}: ${user.email} (${user.total_xp || 0} XP, Level ${user.current_level || 1})`);
      });
    }
    
    // Check category progress table
    const { data: progressData, error: progressError } = await supabase
      .from('category_progress')
      .select('user_id, category_id, total_xp, current_level')
      .limit(10);
    
    if (progressError) {
      console.error('❌ Error fetching category progress:', progressError);
    } else {
      console.log('📊 Category progress (sample):');
      progressData.forEach(progress => {
        console.log(`  - User ${progress.user_id.substring(0, 8)}...: ${progress.category_id} = ${progress.total_xp} XP (Level ${progress.current_level})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

setTestUserIndustry();