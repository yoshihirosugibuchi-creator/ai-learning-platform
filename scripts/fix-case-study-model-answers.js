/**
 * ケーススタディテスト問題のmodel_answer修正スクリプト
 * good_examples と common_mistakes を追加
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ステップごとのgood_examplesとcommon_mistakes生成
function generateModelAnswerAdditions(stepNumber, stepName, targetSkills) {
  const additions = {
    good_examples: [],
    common_mistakes: [],
  };

  switch (stepNumber) {
    case 1: // 状況整理と課題抽出
      additions.good_examples = [
        '外部環境（市場動向、競合）と内部環境（自社の強み弱み）の両面から整理している',
        'データや事実に基づいて課題を特定し、根拠を明示している',
        '課題間の因果関係や優先度を意識した構造化ができている',
      ];
      additions.common_mistakes = [
        '表面的な現象のみを列挙し、本質的な課題に踏み込んでいない',
        '情報を整理せずに羅列しているだけで、構造化されていない',
        '仮定や推測と事実を混同している',
      ];
      break;

    case 2: // 仮説の構築
      additions.good_examples = [
        '複数の仮説を立て、それぞれの根拠と検証方法を示している',
        '仮説に優先順位をつけ、その理由を説明している',
        '既存の枠組みにとらわれない独自の視点を含んでいる',
      ];
      additions.common_mistakes = [
        '仮説が1つしかなく、代替案を検討していない',
        '仮説の根拠が曖昧で、検証可能性が低い',
        '一般論や常識的な仮説に終始している',
      ];
      break;

    case 3: // 分析フレームワークの設計
      additions.good_examples = [
        '課題に適したフレームワークを選択し、その選択理由を説明している',
        '定量・定性両面からの分析アプローチを設計している',
        '必要なデータと入手方法を具体的に示している',
      ];
      additions.common_mistakes = [
        'フレームワークを使うこと自体が目的化し、課題との適合性を検討していない',
        '定性的な分析のみで、数値的な裏付けがない',
        '分析に必要なデータや情報の実現可能性を考慮していない',
      ];
      break;

    case 4: // 戦略提案の策定
      additions.good_examples = [
        '具体的な施策とその期待効果を定量的に示している',
        'リソース制約（予算、人員、時間）を考慮した現実的な提案になっている',
        '複数の選択肢を比較検討し、推奨案を論理的に導出している',
      ];
      additions.common_mistakes = [
        '提案が抽象的で、具体的なアクションが見えない',
        '実現可能性の検討が不十分で、理想論に終わっている',
        'コスト・リソースへの言及がなく、実行計画が描けない',
      ];
      break;

    case 5: // 実行計画とリスク管理
      additions.good_examples = [
        'タイムラインとマイルストーンを明確に設定している',
        '想定されるリスクを洗い出し、対応策を準備している',
        'KPIを設定し、進捗管理の方法を示している',
      ];
      additions.common_mistakes = [
        'スケジュールが曖昧で、いつまでに何をするか不明確',
        'リスクへの言及がなく、楽観的すぎる計画になっている',
        '関係者間の合意形成や調整について考慮されていない',
      ];
      break;

    case 6: // リスク評価（拡張ステップ）
      additions.good_examples = [
        'リスクを発生確率と影響度のマトリクスで整理している',
        '各リスクに対する具体的な対応策（回避・軽減・受容）を提示している',
        'リスクモニタリングの仕組みを設計している',
      ];
      additions.common_mistakes = [
        'リスクの列挙のみで、優先順位付けがない',
        '対応策が「注意する」「確認する」など曖昧',
        '想定外の事態への備えが全く考慮されていない',
      ];
      break;

    default:
      additions.good_examples = [
        '論理的な構造で回答を組み立てている',
        '具体的な根拠やデータを示している',
        '複数の視点から検討している',
      ];
      additions.common_mistakes = [
        '回答が抽象的で具体性に欠ける',
        '根拠や理由の説明が不足している',
        '一面的な見方に偏っている',
      ];
  }

  return additions;
}

async function fixModelAnswers() {
  console.log('=== ケーススタディ model_answer 修正開始 ===\n');

  // 全問題の全ステップを取得
  const { data: steps, error } = await supabase
    .from('case_study_steps')
    .select('id, problem_id, step_number, step_name, target_skills, model_answer')
    .order('problem_id')
    .order('step_number');

  if (error) {
    console.error('ステップ取得エラー:', error);
    return;
  }

  console.log(`対象ステップ数: ${steps.length}\n`);

  let updatedCount = 0;

  for (const step of steps) {
    const currentAnswer = step.model_answer || {};

    // 既にgood_examplesとcommon_mistakesがある場合はスキップ
    if (currentAnswer.good_examples && currentAnswer.common_mistakes) {
      console.log(`Skip: Step ${step.step_number} (${step.step_name}) - 既に設定済み`);
      continue;
    }

    // 追加データを生成
    const additions = generateModelAnswerAdditions(
      step.step_number,
      step.step_name,
      step.target_skills
    );

    // model_answerを更新
    const updatedAnswer = {
      ...currentAnswer,
      good_examples: additions.good_examples,
      common_mistakes: additions.common_mistakes,
    };

    const { error: updateError } = await supabase
      .from('case_study_steps')
      .update({ model_answer: updatedAnswer })
      .eq('id', step.id);

    if (updateError) {
      console.error(`更新エラー (Step ${step.step_number}):`, updateError);
    } else {
      console.log(`Updated: Step ${step.step_number} (${step.step_name})`);
      updatedCount++;
    }
  }

  console.log(`\n=== 完了: ${updatedCount}件更新 ===`);
}

fixModelAnswers().catch(console.error);
