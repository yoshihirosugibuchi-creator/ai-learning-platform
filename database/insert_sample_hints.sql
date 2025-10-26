-- サンプルヒントデータの挿入
-- 作成日: 2025-10-26
-- 目的: ヒント機能テスト用のサンプルデータ作成

-- まず、既存の問題IDを確認
-- SELECT id, question FROM quiz_questions LIMIT 10;

-- サンプル問題（ID: 1-10）にヒントデータを挿入
INSERT INTO quiz_hints (question_id, level1_hint, level2_hint, level3_hint, created_by, updated_by) VALUES
-- 問題ID: 1
(1, 
 'ヒント1：この問題の核心は基本的な概念の理解にあります', 
 'ヒント2：具体的な例を考えて、ステップごとに分析してみましょう', 
 'ヒント3：答えは選択肢の中で最も論理的に一貫性のあるものです',
 'system', 'system'),

-- 問題ID: 2 
(2,
 'ヒント1：キーワードに注目して問題の要点を整理しましょう',
 'ヒント2：それぞれの選択肢を比較して、違いを明確にしてください',
 'ヒント3：正解は問題文の条件を最も満たすものです',
 'system', 'system'),

-- 問題ID: 3
(3,
 'ヒント1：問題の前提条件をもう一度確認してみてください',
 'ヒント2：選択肢を消去法で絞り込んでみましょう',
 'ヒント3：論理的思考の基本原則を適用してください',
 'system', 'system'),

-- 問題ID: 4
(4,
 'ヒント1：この分野の基本知識を思い出してください',
 'ヒント2：類似の事例や概念と比較してみましょう',
 'ヒント3：最も適切で包括的な答えを選んでください',
 'system', 'system'),

-- 問題ID: 5
(5,
 'ヒント1：問題文の重要な部分に焦点を当てましょう',
 'ヒント2：各選択肢の妥当性を検証してください',
 'ヒント3：コンテキストに最も適合する答えを選びましょう',
 'system', 'system')

ON CONFLICT (question_id) DO UPDATE SET
  level1_hint = EXCLUDED.level1_hint,
  level2_hint = EXCLUDED.level2_hint,
  level3_hint = EXCLUDED.level3_hint,
  updated_by = EXCLUDED.updated_by,
  updated_at = NOW();

-- 確認用クエリ
-- SELECT 
--   qh.question_id,
--   qq.question,
--   qh.level1_hint IS NOT NULL as has_level1,
--   qh.level2_hint IS NOT NULL as has_level2,
--   qh.level3_hint IS NOT NULL as has_level3
-- FROM quiz_hints qh
-- JOIN quiz_questions qq ON qh.question_id = qq.id
-- ORDER BY qh.question_id;