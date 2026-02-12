/**
 * AI採点テストスクリプト
 * 実際のセッションデータを使って、修正後のプロンプトでAI採点をテスト
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getQuestionTypeLabel(questionType) {
  switch (questionType) {
    case 'single': return '単一選択のみ（1つだけ選択、記述なし）';
    case 'multiple': return '複数選択のみ（1〜4つ選択可、記述なし）';
    case 'text': return '記述式のみ（選択肢なし）';
    case 'hybrid': return '複数選択＋記述（1〜4つ選択＋理由記述）';
    default: return '複数選択＋記述';
  }
}

function formatStepAnswer(step) {
  const answer = step.answer;
  const questionType = step.questionType || 'hybrid';
  const lines = [`Step${step.stepNumber}（${step.stepName}）[${getQuestionTypeLabel(questionType)}]:`];

  // 選択式の場合のみ選択結果を表示
  if (questionType === 'single' || questionType === 'multiple' || questionType === 'hybrid') {
    const choices = answer?.selectedChoices?.length ? answer.selectedChoices.join(', ') : '(未選択)';
    lines.push(`  選択: ${choices}`);
  }

  // 記述式の場合のみ記述内容を表示
  if (questionType === 'text' || questionType === 'hybrid') {
    const reasoning = answer?.reasoningText || '(記述なし)';
    lines.push(`  記述: ${reasoning}`);
  }

  return lines.join('\n');
}

function formatModelAnswer(step) {
  const questionType = step.questionType || 'hybrid';
  const ma = step.modelAnswer;
  if (!ma) return `Step${step.stepNumber}: (模範解答なし)`;

  const parts = [`Step${step.stepNumber}（${step.stepName}）:`];

  if (questionType === 'single' || questionType === 'multiple' || questionType === 'hybrid') {
    if (ma.ideal_choices?.length) {
      parts.push(`  理想選択: ${ma.ideal_choices.join(', ')}`);
    }
    if (ma.choice_explanations) {
      parts.push(`  選択肢解説（フィードバック生成時に参照）:`);
      for (const [id, explanation] of Object.entries(ma.choice_explanations)) {
        parts.push(`    ${id}: ${explanation.substring(0, 200)}${explanation.length > 200 ? '...' : ''}`);
      }
    }
  }

  // 採点基準は全形式で表示（1-5点をmax_scoreにスケーリング）
  if (ma.scoring_anchors) {
    const maxScore = step.maxScore || 20;
    parts.push(`  採点基準（品質レベル→実際のスコア）:`);
    for (const [level, desc] of Object.entries(ma.scoring_anchors)) {
      const levelNum = parseInt(level) || 1;
      const actualScore = Math.round((levelNum / 5) * maxScore);
      parts.push(`    品質${level}（=${actualScore}/${maxScore}点）: ${desc}`);
    }
  }

  return parts.join('\n');
}

function getEvaluationRulesForStep(step) {
  const questionType = step.questionType || 'hybrid';
  switch (questionType) {
    case 'single':
      return `Step${step.stepNumber}は【単一選択】です。選択結果のみで評価。記述なしでも減点しない。`;
    case 'multiple':
      return `Step${step.stepNumber}は【複数選択】です。選択結果のみで評価。記述なしでも減点しない。`;
    case 'text':
      return `Step${step.stepNumber}は【記述式】です。記述内容のみで評価。`;
    case 'hybrid':
      return `Step${step.stepNumber}は【複数選択＋記述】です。選択と記述の両方を評価。`;
    default:
      return '';
  }
}

async function main() {
  try {
    const sessionId = 'a0290d21-a5d7-43b5-977e-c459660ecc69';

    console.log('=== セッションデータ取得中... ===\n');

    const { data: session } = await supabase
      .from('case_study_sessions')
      .select('*, case_study_problems (*)')
      .eq('id', sessionId)
      .single();

    const { data: steps } = await supabase
      .from('case_study_steps')
      .select('*')
      .eq('problem_id', session.problem_id)
      .order('step_number');

    const { data: details } = await supabase
      .from('case_study_step_details')
      .select('*')
      .eq('session_id', sessionId)
      .order('step_number');

    const { data: rubricAxes } = await supabase
      .from('case_study_rubric_axes')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    // リクエスト構築
    const request = {
      caseText: session.case_study_problems.case_text,
      steps: steps.map(s => {
        const detail = details.find(d => d.step_number === s.step_number);
        return {
          stepNumber: s.step_number,
          stepName: s.step_name,
          questionType: s.question_type || 'hybrid',
          modelAnswer: s.model_answer,
          maxScore: s.max_score,
          answer: detail ? {
            selectedChoices: detail.selected_choices,
            reasoningText: detail.reasoning_text
          } : null
        };
      }),
      rubricAxes: rubricAxes.map(a => ({
        axisName: a.axis_name,
        axisNameEn: a.axis_name_en,
        description: a.description,
        weight: a.weight
      })),
      hintCount: session.hint_count || 0
    };

    // プロンプト構築
    const stepsDescription = request.steps
      .map(step => formatStepAnswer(step))
      .join('\n\n');

    const modelAnswers = request.steps
      .map(step => formatModelAnswer(step))
      .join('\n\n');

    const stepEvaluationRules = request.steps
      .map(step => getEvaluationRulesForStep(step))
      .join('\n');

    const skillKeys = request.rubricAxes.map(a => a.axisNameEn);

    const systemPrompt = `あなたは一流のビジネスコンサルタント教育の専門家です。学習者のケーススタディ回答をルーブリック軸で客観的に評価します。

重要：各ステップの問題形式（question_type）に応じて適切に評価してください。
- multiple（複数選択）: 選択結果のみで評価。記述は求められていません。

必ずJSON形式で出力してください。JSON以外の文を出力しないでください。`;

    const userPrompt = `【評価対象ケース】
${request.caseText.substring(0, 600)}...

【学習者の回答】
${stepsDescription}

【採点基準（模範解答）】
${modelAnswers}

【各ステップの問題形式と評価方法】
${stepEvaluationRules}

【評価ルール - 必ず従ってください】
1. 各ステップは最大20点
2. ★スコア計算★ 採点基準の品質レベル(1-5)は20点満点にスケーリング：
   - 品質1 → 4点、品質3 → 12点、品質5 → 20点
3. ★超重要★ これは【複数選択】形式です。選択結果のみで評価してください。
4. 学習者は全ステップで理想選択肢を正しく選んでいます。品質5相当なので20点を付けてください。
5. ★フィードバック生成★
   - 「選択肢解説」を参照し、選んだ選択肢がなぜ良いかを具体的に説明すること
   - 「正解を選びました」だけでなく、その選択が示す思考力を言及すること
   - 例：「AsIs/ToBeの整理軸を選択し、課題の全体像を漏れなく把握できる視点を示しています」

【出力フォーマット（厳守）】
{"step_scores": [{"step": 1, "score": 数値, "max": 20, "feedback": "フィードバック"}, {"step": 2, "score": 数値, "max": 20, "feedback": "フィードバック"}, {"step": 3, "score": 数値, "max": 20, "feedback": "フィードバック"}, {"step": 4, "score": 数値, "max": 20, "feedback": "フィードバック"}, {"step": 5, "score": 数値, "max": 20, "feedback": "フィードバック"}], "skill_scores": {"problem_setting": 4, "structuring_logic": 4, "hypothesis_thinking": 4, "analysis_design": 4, "proposal_specificity": 4}, "overall_feedback": "総合コメント"}`;

    console.log('=== 【学習者の回答】部分 ===');
    console.log(stepsDescription);
    console.log('\n=== 【評価ルール】部分 ===');
    console.log(stepEvaluationRules);
    console.log('\n=== HuggingFace APIに送信中... ===\n');

    const hfToken = process.env.HUGGINGFACE_API_KEY;
    if (!hfToken) {
      console.error('HUGGINGFACE_API_KEY not found');
      return;
    }

    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-72B-Instruct',  // 本番と同じモデル
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.2
      })
    });

    if (!response.ok) {
      console.error('API Error:', response.status, await response.text());
      return;
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    console.log('=== AI採点結果（生データ） ===');
    console.log(result);

    // JSONパース（マークダウンコードブロック対応）
    try {
      let jsonText = result.trim();
      if (jsonText.startsWith('```')) {
        const lines = jsonText.split('\n');
        const startIndex = lines[0].startsWith('```') ? 1 : 0;
        const endIndex = lines[lines.length - 1] === '```' ? lines.length - 1 : lines.length;
        jsonText = lines.slice(startIndex, endIndex).join('\n').trim();
      }
      const parsed = JSON.parse(jsonText);
      console.log('\n=== AI採点結果（整形） ===');
      console.log('ステップ別スコア:');
      parsed.step_scores?.forEach(s => {
        console.log(`  Step${s.step}: ${s.score}/${s.max}点 - ${s.feedback}`);
      });
      console.log('\n総合フィードバック:', parsed.overall_feedback);

      const totalScore = parsed.step_scores?.reduce((sum, s) => sum + s.score, 0) || 0;
      const maxScore = parsed.step_scores?.reduce((sum, s) => sum + s.max, 0) || 100;
      console.log(`\n総合スコア: ${totalScore}/${maxScore}点 (${Math.round(totalScore/maxScore*100)}%)`);
    } catch (e) {
      console.log('JSONパースエラー:', e.message);
    }

  } catch (err) {
    console.error('Error:', err);
  }
}

main();
