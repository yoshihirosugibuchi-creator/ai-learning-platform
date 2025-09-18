// Supabaseテーブル構造を確認・作成するスクリプト

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTUyNDMsImV4cCI6MjA3MzU5MTI0M30.vf-At7yXtqbnUvcylDOnqzm4mSzoNTcJifcfgkBWn0A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndCreateTables() {
  console.log('🔍 Checking Supabase tables...');
  
  // 必要なテーブルのリスト
  const requiredTables = [
    'users',
    'quiz_results', 
    'category_progress',
    'detailed_quiz_data',
    'skp_transactions'
  ];
  
  for (const tableName of requiredTables) {
    console.log(`\n📋 Checking table: ${tableName}`);
    
    try {
      // テーブルにアクセスしてみる
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          console.log(`❌ Table '${tableName}' does not exist`);
          console.log(`📝 SQL to create '${tableName}':`);
          
          // テーブル作成SQLを提案
          switch (tableName) {
            case 'users':
              console.log(`
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  skill_level TEXT DEFAULT 'beginner',
  learning_style TEXT DEFAULT 'mixed',
  experience_level TEXT DEFAULT 'beginner',
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  selected_industry_categories TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
              `);
              break;
            case 'quiz_results':
              console.log(`
CREATE TABLE quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  category_id TEXT,
  subcategory_id TEXT,
  score INTEGER,
  total_questions INTEGER,
  time_taken INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
              `);
              break;
            case 'category_progress':
              console.log(`
CREATE TABLE category_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  category_id TEXT,
  current_level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_answers INTEGER DEFAULT 0,
  last_answered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category_id)
);
              `);
              break;
            case 'detailed_quiz_data':
              console.log(`
CREATE TABLE detailed_quiz_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  quiz_result_id UUID REFERENCES quiz_results(id),
  question_id TEXT,
  question_text TEXT,
  selected_answer TEXT,
  correct_answer TEXT,
  is_correct BOOLEAN,
  response_time INTEGER,
  confidence_level INTEGER,
  category TEXT,
  difficulty TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
              `);
              break;
            case 'skp_transactions':
              console.log(`
CREATE TABLE skp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  type TEXT CHECK (type IN ('earned', 'spent')),
  amount INTEGER,
  source TEXT,
  description TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
              `);
              break;
          }
        } else {
          console.log(`❌ Error accessing table '${tableName}':`, error.message);
        }
      } else {
        console.log(`✅ Table '${tableName}' exists and accessible`);
        console.log(`📊 Sample data count: ${data?.length || 0} rows`);
      }
    } catch (err) {
      console.error(`❌ Exception checking table '${tableName}':`, err.message);
    }
  }
  
  console.log('\n🎯 Summary:');
  console.log('1. Copy the SQL statements above');
  console.log('2. Go to your Supabase dashboard SQL editor');
  console.log('3. Execute the CREATE TABLE statements for missing tables');
  console.log('4. Enable Row Level Security (RLS) if needed');
  console.log('5. Set up appropriate policies for your tables');
}

checkAndCreateTables();