// RLS無効化が正常に実行されたか確認するスクリプト

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTUyNDMsImV4cCI6MjA3MzU5MTI0M30.vf-At7yXtqbnUvcylDOnqzm4mSzoNTcJifcfgkBWn0A';

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyRLSStatus() {
  console.log('🔍 Verifying RLS status after SQL execution...');
  
  const testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Test user from AuthProvider
  
  // Test 1: users テーブルのアクセステスト
  console.log('\n👤 Testing users table access...');
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
      console.error('❌ Users table error:', userError.code, userError.message);
    } else {
      console.log('✅ Users table accessible - RLS disabled successfully');
    }
  } catch (err) {
    console.error('❌ Users table exception:', err.message);
  }

  // Test 2: quiz_results テーブルのアクセステスト
  console.log('\n📝 Testing quiz_results table access...');
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
    
    const { data: quizData, error: quizError } = await supabase
      .from('quiz_results')
      .insert([testQuizData])
      .select()
      .single();
    
    if (quizError) {
      console.error('❌ Quiz results table error:', quizError.code, quizError.message);
      if (quizError.code === '42501') {
        console.log('⚠️ RLS is still enabled! SQL execution may have failed.');
      }
    } else {
      console.log('✅ Quiz results table accessible - RLS disabled successfully');
      console.log('🗑️ Cleaning up test data...');
      
      // Clean up test data
      await supabase
        .from('quiz_results')
        .delete()
        .eq('id', quizData.id);
    }
  } catch (err) {
    console.error('❌ Quiz results table exception:', err.message);
  }

  // Test 3: category_progress テーブルのアクセステスト
  console.log('\n📊 Testing category_progress table access...');
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
      console.error('❌ Category progress table error:', progressError.code, progressError.message);
    } else {
      console.log('✅ Category progress table accessible - RLS disabled successfully');
    }
  } catch (err) {
    console.error('❌ Category progress table exception:', err.message);
  }

  console.log('\n🎯 Summary:');
  console.log('If you see ❌ errors above, the RLS disable SQL may not have been executed properly.');
  console.log('If you see ✅ success messages, RLS is disabled and the timeout issue is elsewhere.');
}

verifyRLSStatus();