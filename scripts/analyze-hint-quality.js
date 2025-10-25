const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeHintQuality() {
  console.log('🔍 低品質ヒント分析開始...');
  
  // サンプルヒントを取得
  const { data: hints, error } = await supabase
    .from('quiz_hints')
    .select(`
      question_id,
      level1_hint,
      level2_hint,
      level3_hint,
      quiz_questions!inner(question, option1, option2, option3, option4, correct_answer)
    `)
    .limit(20);
    
  if (error) {
    console.error('❌ エラー:', error);
    return;
  }
  
  console.log('📊 品質分析結果:');
  console.log('='.repeat(80));
  
  let genericLevel1Count = 0;
  let genericLevel2Count = 0;
  let answerRevealLevel3Count = 0;
  
  hints.forEach((hint, index) => {
    console.log(`\n${index + 1}. 問題ID: ${hint.question_id}`);
    console.log('問題文:', hint.quiz_questions.question.substring(0, 100) + '...');
    console.log('正解番号:', hint.quiz_questions.correct_answer);
    
    // Level 1 分析
    const level1 = hint.level1_hint;
    if (level1.includes('基本的な概念') || level1.includes('問題文をよく読み') || level1.includes('キーワードに注目')) {
      genericLevel1Count++;
      console.log('❌ Level 1: 汎用的ヒント detected');
    } else if (level1.includes('重要用語')) {
      console.log('✅ Level 1: 用語解説あり');
    } else {
      console.log('⚠️  Level 1: その他');
    }
    
    // Level 2 分析
    const level2 = hint.level2_hint;
    if (level2.includes('核心は何かを見極め') || level2.includes('論理的に選択肢を絞り込んで')) {
      genericLevel2Count++;
      console.log('❌ Level 2: 汎用的ヒント detected');
    } else {
      console.log('✅ Level 2: 具体的アプローチあり');
    }
    
    // Level 3 分析
    const level3 = hint.level3_hint;
    if (level3.includes('正解は') && level3.includes('番')) {
      answerRevealLevel3Count++;
      console.log('❌ Level 3: 正解番号露出 detected');
    } else {
      console.log('✅ Level 3: 適切なヒント');
    }
    
    console.log('Level 1:', level1.substring(0, 80) + '...');
    console.log('Level 2:', level2.substring(0, 80) + '...');
    console.log('Level 3:', level3.substring(0, 80) + '...');
  });
  
  console.log('\n📈 問題統計:');
  console.log('='.repeat(80));
  console.log(`汎用的Level 1ヒント: ${genericLevel1Count}/${hints.length} (${Math.round(genericLevel1Count/hints.length*100)}%)`);
  console.log(`汎用的Level 2ヒント: ${genericLevel2Count}/${hints.length} (${Math.round(genericLevel2Count/hints.length*100)}%)`);
  console.log(`正解露出Level 3ヒント: ${answerRevealLevel3Count}/${hints.length} (${Math.round(answerRevealLevel3Count/hints.length*100)}%)`);
  
  console.log('\n🎯 改善が必要な主要問題:');
  console.log('1. Level 1: 「基本的な概念」「問題文をよく読み」等の汎用表現');
  console.log('2. Level 2: 「核心を見極め」「論理的に絞り込み」等の抽象的表現');
  console.log('3. Level 3: 「正解はX番」の直接的答え露出');
}

analyzeHintQuality().catch(console.error);