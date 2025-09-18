// RLS（Row Level Security）ポリシーを確認するスクリプト

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTUyNDMsImV4cCI6MjA3MzU5MTI0M30.vf-At7yXtqbnUvcylDOnqzm4mSzoNTcJifcfgkBWn0A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuizResultInsert() {
  console.log('🧪 Testing quiz result insert with test user...');
  
  const testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Test user ID from AuthProvider
  
  // Step 1: まずusersテーブルにテストユーザーを作成
  console.log('👤 Creating test user...');
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .upsert([{
        id: testUserId,
        email: 'test@example.com',
        name: 'Test User',
        skill_level: 'beginner',
        learning_style: 'mixed',
        experience_level: 'beginner',
        total_xp: 0,
        current_level: 1,
        streak: 0,
        last_active: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (userError) {
      console.error('❌ User creation error:', userError);
    } else {
      console.log('✅ Test user created/updated:', userData?.email);
    }
  } catch (userErr) {
    console.error('❌ User creation exception:', userErr.message);
  }
  
  // Step 2: クイズ結果を挿入テスト
  console.log('\n📝 Testing quiz result insertion...');
  try {
    const testQuizData = {
      user_id: testUserId,
      category_id: 'communication_presentation',
      subcategory_id: null,
      score: 800,
      total_questions: 10,
      time_taken: 120,
      completed_at: new Date().toISOString()
    };
    
    console.log('📋 Test data:', testQuizData);
    
    const { data: quizData, error: quizError } = await supabase
      .from('quiz_results')
      .insert([testQuizData])
      .select()
      .single();
    
    if (quizError) {
      console.error('❌ Quiz insert error:', {
        code: quizError.code,
        message: quizError.message,
        details: quizError.details,
        hint: quizError.hint
      });
    } else {
      console.log('✅ Quiz result inserted successfully:', quizData?.id);
    }
  } catch (quizErr) {
    console.error('❌ Quiz insert exception:', quizErr.message);
  }
  
  // Step 3: カテゴリー進捗テスト
  console.log('\n📊 Testing category progress insertion...');
  try {
    const testProgressData = {
      user_id: testUserId,
      category_id: 'communication_presentation',
      current_level: 1,
      total_xp: 20,
      correct_answers: 8,
      total_answers: 10,
      last_answered_at: new Date().toISOString()
    };
    
    const { data: progressData, error: progressError } = await supabase
      .from('category_progress')
      .upsert([testProgressData])
      .select()
      .single();
    
    if (progressError) {
      console.error('❌ Category progress error:', {
        code: progressError.code,
        message: progressError.message,
        details: progressError.details,
        hint: progressError.hint
      });
    } else {
      console.log('✅ Category progress updated successfully:', progressData?.id);
    }
  } catch (progressErr) {
    console.error('❌ Category progress exception:', progressErr.message);
  }
  
  console.log('\n🎯 RLS Policy Recommendations:');
  console.log('If you see permission errors above, you may need to create RLS policies:');
  console.log('');
  console.log('-- For quiz_results table:');
  console.log('CREATE POLICY "Users can insert their own quiz results" ON quiz_results FOR INSERT TO anon, authenticated USING (true);');
  console.log('CREATE POLICY "Users can view their own quiz results" ON quiz_results FOR SELECT TO anon, authenticated USING (true);');
  console.log('');
  console.log('-- For category_progress table:');
  console.log('CREATE POLICY "Users can manage their own progress" ON category_progress FOR ALL TO anon, authenticated USING (true);');
  console.log('');
  console.log('-- For users table:');
  console.log('CREATE POLICY "Users can manage their own profile" ON users FOR ALL TO anon, authenticated USING (true);');
  console.log('');
  console.log('-- Or temporarily disable RLS for testing:');
  console.log('ALTER TABLE quiz_results DISABLE ROW LEVEL SECURITY;');
  console.log('ALTER TABLE category_progress DISABLE ROW LEVEL SECURITY;');
  console.log('ALTER TABLE users DISABLE ROW LEVEL SECURITY;');
}

testQuizResultInsert();