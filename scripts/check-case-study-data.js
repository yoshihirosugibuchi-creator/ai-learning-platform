require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  // 問題データ
  const { data: problems, error: pErr } = await supabase
    .from('case_study_problems')
    .select('id, title, difficulty, status, step_count, industry, scenario_type')
    .order('created_at');

  console.log('=== case_study_problems (' + (problems?.length || 0) + '件) ===');
  if (problems) {
    problems.forEach(p => console.log(JSON.stringify(p)));
  }
  if (pErr) console.log('Error:', pErr);

  // ステップデータ（最初の問題のみ）
  if (problems && problems.length > 0) {
    const { data: steps, error: sErr } = await supabase
      .from('case_study_steps')
      .select('step_number, step_name, question_type, target_skills, hint, options, model_answer')
      .eq('problem_id', problems[0].id)
      .order('step_number');

    console.log('\n=== steps for "' + problems[0].title + '" ===');
    if (steps) {
      steps.forEach(s => {
        console.log('Step ' + s.step_number + ': ' + s.step_name);
        console.log('  type: ' + s.question_type);
        console.log('  target_skills: ' + JSON.stringify(s.target_skills));
        console.log('  hint: ' + (s.hint ? 'あり' : 'なし'));
        console.log('  options: ' + (s.options ? (Array.isArray(s.options) ? s.options.length + '個' : 'あり') : 'なし'));
        console.log('  model_answer: ' + (s.model_answer ? 'あり' : 'なし'));
        if (s.model_answer) {
          const ma = s.model_answer;
          console.log('    - ideal_choices: ' + (ma.ideal_choices ? 'あり' : 'なし'));
          console.log('    - essential_points: ' + (ma.essential_points ? 'あり' : 'なし'));
          console.log('    - good_examples: ' + (ma.good_examples ? 'あり' : 'なし'));
          console.log('    - common_mistakes: ' + (ma.common_mistakes ? 'あり' : 'なし'));
          console.log('    - scoring_anchors: ' + (ma.scoring_anchors ? 'あり' : 'なし'));
        }
      });
    }
    if (sErr) console.log('Error:', sErr);
  }

  // オプションマスタ
  const { data: options, error: oErr } = await supabase
    .from('case_study_options')
    .select('option_type, code, name')
    .order('option_type')
    .order('display_order');

  console.log('\n=== case_study_options (' + (options?.length || 0) + '件) ===');
  const grouped = {};
  if (options) {
    options.forEach(o => {
      if (!grouped[o.option_type]) grouped[o.option_type] = [];
      grouped[o.option_type].push(o.code);
    });
    Object.entries(grouped).forEach(([type, codes]) => {
      console.log(type + ': ' + codes.join(', '));
    });
  }
  if (oErr) console.log('Error:', oErr);

  // ルーブリック軸
  const { data: rubric, error: rErr } = await supabase
    .from('case_study_rubric_axes')
    .select('axis_code, axis_name, rubric_group_code')
    .order('display_order');

  console.log('\n=== case_study_rubric_axes (' + (rubric?.length || 0) + '件) ===');
  if (rubric) {
    rubric.forEach(r => console.log(r.rubric_group_code + ': ' + r.axis_code + ' (' + r.axis_name + ')'));
  }
  if (rErr) console.log('Error:', rErr);
}

check().catch(console.error);
