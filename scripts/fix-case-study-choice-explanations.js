/**
 * ケーススタディテスト問題のmodel_answerにchoice_explanationsを追加するスクリプト
 * 各選択肢がなぜ正解/不正解なのかの解説を追加
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ステップ番号とステップ名に基づいて選択肢の解説を生成
function generateChoiceExplanations(stepNumber, stepName, options) {
  const explanations = {};

  // 各選択肢に対して解説を生成
  for (const option of options) {
    const optionId = option.id;
    const isCorrect = option.is_correct;
    const partialScore = option.partial_score;
    const optionText = option.text;

    let explanation = '';

    if (isCorrect && partialScore >= 3) {
      // 完全正解
      explanation = `【正解】${optionText.substring(0, 30)}...は、このステップ（${stepName}）の目的に合致した適切なアプローチです。`;
    } else if (isCorrect && partialScore > 0) {
      // 部分点
      explanation = `【部分点】${optionText.substring(0, 30)}...は方向性は正しいですが、より深い分析や具体性が求められます。`;
    } else {
      // 不正解
      explanation = `【不正解】${optionText.substring(0, 30)}...は、このステップの目的からずれているか、前提に問題があります。`;
    }

    explanations[optionId] = explanation;
  }

  return explanations;
}

async function fixChoiceExplanations() {
  console.log('=== ケーススタディ choice_explanations 追加開始 ===\n');

  // 全問題の全ステップを取得
  const { data: steps, error } = await supabase
    .from('case_study_steps')
    .select('id, problem_id, step_number, step_name, options, model_answer')
    .order('problem_id')
    .order('step_number');

  if (error) {
    console.error('ステップ取得エラー:', error);
    return;
  }

  console.log(`対象ステップ数: ${steps.length}\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const step of steps) {
    const currentAnswer = step.model_answer || {};
    const options = step.options || [];

    // 既にchoice_explanationsがある場合はスキップ
    if (currentAnswer.choice_explanations && Object.keys(currentAnswer.choice_explanations).length > 0) {
      console.log(`Skip: Step ${step.step_number} (${step.step_name}) - 既に設定済み`);
      skippedCount++;
      continue;
    }

    // optionsがない場合もスキップ
    if (options.length === 0) {
      console.log(`Skip: Step ${step.step_number} (${step.step_name}) - 選択肢なし`);
      skippedCount++;
      continue;
    }

    // 選択肢の解説を生成
    const choiceExplanations = generateChoiceExplanations(
      step.step_number,
      step.step_name,
      options
    );

    // model_answerを更新
    const updatedAnswer = {
      ...currentAnswer,
      choice_explanations: choiceExplanations,
    };

    const { error: updateError } = await supabase
      .from('case_study_steps')
      .update({ model_answer: updatedAnswer })
      .eq('id', step.id);

    if (updateError) {
      console.error(`更新エラー (Step ${step.step_number}):`, updateError);
    } else {
      console.log(`Updated: Step ${step.step_number} (${step.step_name})`);
      console.log(`  - 選択肢数: ${options.length}`);
      console.log(`  - 解説キー: ${Object.keys(choiceExplanations).join(', ')}`);
      updatedCount++;
    }
  }

  console.log(`\n=== 完了: ${updatedCount}件更新, ${skippedCount}件スキップ ===`);
}

fixChoiceExplanations().catch(console.error);
