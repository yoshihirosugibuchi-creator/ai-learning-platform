-- ============================================================
-- XPサブカテゴリー修正マイグレーション
--
-- 問題: quiz_answersのsubcategory_idが'general'になっている
-- 原因: APIがsubcategory_idフィールドを返していなかった
-- 解決: quiz_questionsから正しいsubcategory_idを取得して更新
-- ============================================================

-- ============================================================
-- STEP 1: 修正対象の確認（実行前に確認用）
-- ============================================================

-- 1-1. generalになっているレコード数
SELECT
  'quiz_answers with general' as check_type,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as affected_users
FROM quiz_answers
WHERE subcategory_id = 'general';

-- 1-2. 修正可能なレコード数（quiz_questionsに正しいsubcategory_idがある）
SELECT
  'fixable_records' as check_type,
  COUNT(*) as count
FROM quiz_answers qa
JOIN quiz_questions qq ON qa.question_id::integer = qq.id
WHERE qa.subcategory_id = 'general'
  AND qq.subcategory_id IS NOT NULL
  AND qq.subcategory_id != ''
  AND qq.subcategory_id != 'general';

-- 1-3. サンプルデータ確認
SELECT
  qa.id as answer_id,
  qa.user_id,
  qa.question_id,
  qa.category_id,
  qa.subcategory_id as current_subcategory,
  qq.subcategory_id as correct_subcategory,
  qa.earned_xp
FROM quiz_answers qa
JOIN quiz_questions qq ON qa.question_id::integer = qq.id
WHERE qa.subcategory_id = 'general'
  AND qq.subcategory_id IS NOT NULL
  AND qq.subcategory_id != ''
  AND qq.subcategory_id != 'general'
LIMIT 20;

-- ============================================================
-- STEP 2: quiz_answersのsubcategory_id更新
-- ============================================================

-- 2-1. quiz_answersを更新（question_idが数値のもののみ）
UPDATE quiz_answers qa
SET subcategory_id = qq.subcategory_id
FROM quiz_questions qq
WHERE qa.question_id ~ '^\d+$'  -- 数値形式のquestion_idのみ
  AND qa.question_id::integer = qq.id
  AND qa.subcategory_id = 'general'
  AND qq.subcategory_id IS NOT NULL
  AND qq.subcategory_id != ''
  AND qq.subcategory_id != 'general';

-- 更新結果確認
SELECT
  'after_update' as check_type,
  COUNT(*) as remaining_general
FROM quiz_answers
WHERE subcategory_id = 'general';

-- ============================================================
-- STEP 3: user_subcategory_xp_stats_v2の再計算
-- ============================================================

-- 3-1. 現在のuser_subcategory_xp_stats_v2を一旦削除
-- （影響を受けるユーザーのみ）
DELETE FROM user_subcategory_xp_stats_v2
WHERE user_id IN (
  SELECT DISTINCT user_id
  FROM quiz_answers
  WHERE earned_xp > 0
);

-- 3-2. quiz_answersから再集計してINSERT
INSERT INTO user_subcategory_xp_stats_v2 (
  user_id,
  category_id,
  subcategory_id,
  total_xp,
  questions_answered,
  correct_answers,
  accuracy_rate,
  average_time_spent,
  last_activity_at,
  created_at,
  updated_at
)
SELECT
  user_id,
  category_id,
  subcategory_id,
  SUM(earned_xp) as total_xp,
  COUNT(*) as questions_answered,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers,
  CASE
    WHEN COUNT(*) > 0
    THEN (SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::decimal / COUNT(*)) * 100
    ELSE 0
  END as accuracy_rate,
  AVG(time_spent) as average_time_spent,
  MAX(created_at) as last_activity_at,
  NOW() as created_at,
  NOW() as updated_at
FROM quiz_answers
WHERE subcategory_id IS NOT NULL
  AND subcategory_id != ''
GROUP BY user_id, category_id, subcategory_id
ON CONFLICT (user_id, category_id, subcategory_id)
DO UPDATE SET
  total_xp = EXCLUDED.total_xp,
  questions_answered = EXCLUDED.questions_answered,
  correct_answers = EXCLUDED.correct_answers,
  accuracy_rate = EXCLUDED.accuracy_rate,
  average_time_spent = EXCLUDED.average_time_spent,
  last_activity_at = EXCLUDED.last_activity_at,
  updated_at = NOW();

-- ============================================================
-- STEP 4: user_category_xp_stats_v2の再計算
-- ============================================================

-- 4-1. カテゴリー統計も再集計
DELETE FROM user_category_xp_stats_v2
WHERE user_id IN (
  SELECT DISTINCT user_id
  FROM quiz_answers
  WHERE earned_xp > 0
);

-- 4-2. quiz_answersから再集計してINSERT
INSERT INTO user_category_xp_stats_v2 (
  user_id,
  category_id,
  total_xp,
  questions_answered,
  correct_answers,
  accuracy_rate,
  average_time_spent,
  last_activity_at,
  created_at,
  updated_at
)
SELECT
  user_id,
  category_id,
  SUM(earned_xp) as total_xp,
  COUNT(*) as questions_answered,
  SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers,
  CASE
    WHEN COUNT(*) > 0
    THEN (SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::decimal / COUNT(*)) * 100
    ELSE 0
  END as accuracy_rate,
  AVG(time_spent) as average_time_spent,
  MAX(created_at) as last_activity_at,
  NOW() as created_at,
  NOW() as updated_at
FROM quiz_answers
WHERE category_id IS NOT NULL
  AND category_id != ''
GROUP BY user_id, category_id
ON CONFLICT (user_id, category_id)
DO UPDATE SET
  total_xp = EXCLUDED.total_xp,
  questions_answered = EXCLUDED.questions_answered,
  correct_answers = EXCLUDED.correct_answers,
  accuracy_rate = EXCLUDED.accuracy_rate,
  average_time_spent = EXCLUDED.average_time_spent,
  last_activity_at = EXCLUDED.last_activity_at,
  updated_at = NOW();

-- ============================================================
-- STEP 5: 検証クエリ
-- ============================================================

-- 5-1. 特定ユーザーのサブカテゴリー別XP確認
-- （SI業界関連サブカテゴリー）
SELECT
  subcategory_id,
  total_xp,
  questions_answered,
  correct_answers
FROM user_subcategory_xp_stats_v2
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'  -- テストユーザーID
  AND category_id = 'system_integration_industry'
ORDER BY total_xp DESC;

-- 5-2. generalの残存確認
SELECT
  COUNT(*) as general_remaining
FROM user_subcategory_xp_stats_v2
WHERE subcategory_id = 'general';
