const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkDifficultyLevels() {
  console.log('🔍 詳細なdifficulty値の確認中...');
  
  // 1. quiz_questionsのdifficultyを全て確認
  const { data: quizData, error } = await supabase
    .from('quiz_questions')
    .select('difficulty')
    .order('difficulty');
  
  if (error) {
    console.error('❌ Quiz questions error:', error);
    return;
  }
  
  const difficultyCount = {};
  quizData.forEach(q => {
    difficultyCount[q.difficulty] = (difficultyCount[q.difficulty] || 0) + 1;
  });
  
  console.log('📊 Quiz questionsのdifficultyカウント:');
  Object.entries(difficultyCount).forEach(([diff, count]) => {
    console.log(`  - ${diff}: ${count}問`);
  });
  
  // 2. skill_levelテーブルを確認
  console.log('\n🎯 skill_levelテーブルの内容:');
  const { data: skillData, error: skillError } = await supabase
    .from('skill_levels')
    .select('*')
    .order('level_order');
    
  if (skillError) {
    console.error('❌ Skill levels error:', skillError);
  } else {
    console.log('📋 Skill levels:');
    skillData.forEach(skill => {
      console.log(`  - ${skill.level_name} (order: ${skill.level_order}): ${skill.description || 'N/A'}`);
    });
  }
  
  // 3. expertの問題を具体的に確認
  console.log('\n🎓 expertレベルの問題を確認:');
  const { data: expertQuestions, error: expertError } = await supabase
    .from('quiz_questions')
    .select('id, question, difficulty, category_id, subcategory_id')
    .eq('difficulty', 'expert')
    .limit(5);
    
  if (!expertError && expertQuestions) {
    console.log(`📚 Expert問題数: ${expertQuestions.length}`);
    expertQuestions.forEach(q => {
      console.log(`  - [${q.id}] ${q.question.substring(0, 50)}... (cat: ${q.category_id})`);
    });
  }
  
  // 4. learning_sessionsのdifficultyも確認
  const { data: sessionData, error: sessionError } = await supabase
    .from('learning_sessions')
    .select('difficulty')
    .order('difficulty');
    
  if (!sessionError && sessionData) {
    const sessionDiffCount = {};
    sessionData.forEach(s => {
      if (s.difficulty) {
        sessionDiffCount[s.difficulty] = (sessionDiffCount[s.difficulty] || 0) + 1;
      }
    });
    
    console.log('\n📚 Learning sessionsのdifficultyカウント:');
    Object.entries(sessionDiffCount).forEach(([diff, count]) => {
      console.log(`  - ${diff}: ${count}セッション`);
    });
  }
}

checkDifficultyLevels();