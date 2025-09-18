// 全テーブルの存在確認とRLS状態をチェック

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTUyNDMsImV4cCI6MjA3MzU5MTI0M30.vf-At7yXtqbnUvcylDOnqzm4mSzoNTcJifcfgkBWn0A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllTables() {
  console.log('🔍 Checking all project tables...');
  
  // プロジェクトで使用されている可能性のあるテーブル
  const allTables = [
    'users',
    'quiz_results', 
    'category_progress',
    'detailed_quiz_data',
    'skp_transactions',
    'learning_sessions',
    'learning_progress',
    'user_progress',
    'user_settings',
    'user_badges',
    'knowledge_card_collection',
    'wisdom_card_collection'
  ];
  
  const existingTables = [];
  const missingTables = [];
  
  for (const tableName of allTables) {
    try {
      console.log(`\n📋 Checking: ${tableName}`);
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log(`❌ Table '${tableName}' does not exist`);
          missingTables.push(tableName);
        } else if (error.code === '42501') {
          console.log(`🔒 Table '${tableName}' exists but blocked by RLS`);
          existingTables.push(tableName);
        } else {
          console.log(`⚠️ Table '${tableName}' - Other error: ${error.message}`);
          existingTables.push(tableName);
        }
      } else {
        console.log(`✅ Table '${tableName}' accessible (${data?.length || 0} rows)`);
        existingTables.push(tableName);
      }
    } catch (err) {
      console.error(`❌ Exception checking '${tableName}':`, err.message);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`✅ Existing tables (${existingTables.length}):`, existingTables);
  console.log(`❌ Missing tables (${missingTables.length}):`, missingTables);
  
  console.log('\n🔧 SQL for disabling RLS on existing tables:');
  existingTables.forEach(table => {
    console.log(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`);
  });
  
  console.log('\n🚀 SQL for enabling RLS on existing tables (for production):');
  existingTables.forEach(table => {
    console.log(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
  });
}

checkAllTables();