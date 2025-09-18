// 'general'カテゴリーの進捗データを適切なカテゴリーに移行するスクリプト

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bddqkmnbbvllpvsynklr.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjY0NzY3NDEsImV4cCI6MjA0MjA1Mjc0MX0.O8kzGt4q_jZZ2LYd8iHdSqOX4Xe6sOqP9bI2OKhJO6s';

const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateGeneralCategory() {
  console.log('🔧 Starting migration of general category data...');
  
  try {
    // 'general'カテゴリーの進捗データを取得
    const { data: generalProgress, error: fetchError } = await supabase
      .from('category_progress')
      .select('*')
      .eq('category_id', 'general');
    
    if (fetchError) {
      console.error('Error fetching general category data:', fetchError);
      return;
    }
    
    if (!generalProgress || generalProgress.length === 0) {
      console.log('✅ No general category data found to migrate');
      return;
    }
    
    console.log(`📊 Found ${generalProgress.length} general category records to migrate`);
    
    for (const progress of generalProgress) {
      console.log(`\n🔄 Processing user ${progress.user_id}...`);
      
      // そのユーザーの最近のクイズ結果を確認して、最も多いカテゴリーを特定
      const { data: quizResults, error: quizError } = await supabase
        .from('quiz_results')
        .select('questions')
        .eq('user_id', progress.user_id)
        .order('completed_at', { ascending: false })
        .limit(10);
      
      if (quizError) {
        console.error(`Error fetching quiz results for user ${progress.user_id}:`, quizError);
        continue;
      }
      
      // 問題からカテゴリーを集計
      const categoryCount = {};
      if (quizResults && quizResults.length > 0) {
        quizResults.forEach(result => {
          if (result.questions && Array.isArray(result.questions)) {
            result.questions.forEach(q => {
              if (q.category && q.category !== 'general') {
                categoryCount[q.category] = (categoryCount[q.category] || 0) + 1;
              }
            });
          }
        });
      }
      
      // 最も多いカテゴリーを選択（デフォルトは'logical_thinking_problem_solving'）
      let targetCategory = 'logical_thinking_problem_solving';
      if (Object.keys(categoryCount).length > 0) {
        targetCategory = Object.keys(categoryCount).reduce((a, b) => 
          categoryCount[a] > categoryCount[b] ? a : b
        );
      }
      
      console.log(`📊 User categories found:`, categoryCount);
      console.log(`🎯 Selected target category: ${targetCategory}`);
      
      // 対象カテゴリーに既存の進捗があるかチェック
      const { data: existingProgress, error: existingError } = await supabase
        .from('category_progress')
        .select('*')
        .eq('user_id', progress.user_id)
        .eq('category_id', targetCategory)
        .single();
      
      if (existingError && existingError.code !== 'PGRST116') {
        console.error(`Error checking existing progress:`, existingError);
        continue;
      }
      
      if (existingProgress) {
        // 既存の進捗に統合
        const mergedData = {
          correct_answers: existingProgress.correct_answers + progress.correct_answers,
          total_answers: existingProgress.total_answers + progress.total_answers,
          total_xp: existingProgress.total_xp + progress.total_xp,
          current_level: Math.floor((existingProgress.total_xp + progress.total_xp) / 500) + 1,
          last_answered_at: progress.last_answered_at // より新しい日付を使用
        };
        
        const { error: updateError } = await supabase
          .from('category_progress')
          .update(mergedData)
          .eq('id', existingProgress.id);
        
        if (updateError) {
          console.error(`Error updating existing progress:`, updateError);
          continue;
        }
        
        console.log(`✅ Merged general data into existing ${targetCategory} progress`);
      } else {
        // 新しいカテゴリー進捗を作成
        const newProgress = {
          user_id: progress.user_id,
          category_id: targetCategory,
          correct_answers: progress.correct_answers,
          total_answers: progress.total_answers,
          total_xp: progress.total_xp,
          current_level: progress.current_level,
          last_answered_at: progress.last_answered_at
        };
        
        const { error: insertError } = await supabase
          .from('category_progress')
          .insert([newProgress]);
        
        if (insertError) {
          console.error(`Error creating new progress:`, insertError);
          continue;
        }
        
        console.log(`✅ Created new ${targetCategory} progress from general data`);
      }
      
      // 古いgeneralカテゴリーのデータを削除
      const { error: deleteError } = await supabase
        .from('category_progress')
        .delete()
        .eq('id', progress.id);
      
      if (deleteError) {
        console.error(`Error deleting general progress:`, deleteError);
      } else {
        console.log(`🗑️ Deleted old general category data`);
      }
    }
    
    console.log('\n🎯 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in migration script:', error);
  }
}

migrateGeneralCategory();