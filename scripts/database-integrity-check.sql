-- データベース整合性チェッククエリ
-- デプロイ前にSupabaseコンソールで実行してください

-- =====================================
-- Phase 1: テーブル構造確認
-- =====================================

-- 1. course_completionsテーブルの構造確認（問題のあったカラムが削除されているか）
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'course_completions' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. 重要テーブルの存在確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'quiz_sessions',
    'quiz_answers', 
    'course_session_completions',
    'course_theme_completions',
    'course_completions',
    'knowledge_card_collection',
    'user_xp_stats_v2',
    'skp_transactions'
  )
ORDER BY table_name;

-- =====================================
-- Phase 2: データ整合性チェック
-- =====================================

-- 3. セッション記録とクイズ回答の整合性確認
-- （回答のないセッションがあるかチェック）
SELECT 
  'Missing quiz answers' as issue_type,
  qs.id as session_id,
  qs.user_id,
  qs.completed_at,
  COUNT(qa.id) as answer_count
FROM quiz_sessions qs
LEFT JOIN quiz_answers qa ON qs.id = qa.session_id  
WHERE qs.completed_at >= NOW() - INTERVAL '7 days'  -- 過去7日間のデータをチェック
GROUP BY qs.id, qs.user_id, qs.completed_at
HAVING COUNT(qa.id) = 0
LIMIT 10;

-- 4. ナレッジカードの重複チェック  
SELECT 
  'Duplicate knowledge cards' as issue_type,
  user_id, 
  card_id, 
  COUNT(*) as duplicate_count
FROM knowledge_card_collection
GROUP BY user_id, card_id
HAVING COUNT(*) > 1
LIMIT 10;

-- 5. XP統計の一貫性チェック（計算値と保存値の比較）
WITH calculated_xp AS (
  SELECT 
    user_id,
    COALESCE(SUM(earned_xp), 0) as quiz_total_xp,
    COUNT(*) as quiz_session_count
  FROM quiz_sessions 
  WHERE earned_xp IS NOT NULL
  GROUP BY user_id
),
stored_xp AS (
  SELECT 
    user_id,
    total_xp as stored_total_xp,
    total_quiz_sessions as stored_session_count
  FROM user_xp_stats_v2
)
SELECT 
  'XP calculation mismatch' as issue_type,
  c.user_id,
  c.quiz_total_xp as calculated_xp,
  s.stored_total_xp,
  c.quiz_session_count as calculated_sessions,
  s.stored_session_count,
  ABS(c.quiz_total_xp - s.stored_total_xp) as xp_difference
FROM calculated_xp c
INNER JOIN stored_xp s ON c.user_id = s.user_id
WHERE ABS(c.quiz_total_xp - s.stored_total_xp) > 10  -- 10XP以上の差があるケース
LIMIT 10;

-- =====================================
-- Phase 3: 最近のデータ活動確認
-- =====================================

-- 6. 最近24時間のクイズ活動確認
SELECT 
  'Recent quiz activity' as info_type,
  COUNT(*) as session_count,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(earned_xp) as avg_xp,
  SUM(earned_xp) as total_xp
FROM quiz_sessions 
WHERE completed_at >= NOW() - INTERVAL '24 hours';

-- 7. 最近24時間のナレッジカード獲得確認  
SELECT 
  'Recent card acquisitions' as info_type,
  COUNT(*) as new_cards,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT card_id) as unique_card_types
FROM knowledge_card_collection
WHERE obtained_at >= NOW() - INTERVAL '24 hours';

-- 8. 最近24時間のコース完了確認
SELECT 
  'Recent course completions' as info_type,
  COUNT(*) as completion_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT course_id) as unique_courses
FROM course_completions
WHERE completed_at >= NOW() - INTERVAL '24 hours';

-- =====================================
-- Phase 4: ユーザーデータサンプリング確認
-- =====================================

-- 9. アクティブユーザーのデータ完整性確認（上位5ユーザー）
WITH active_users AS (
  SELECT 
    user_id,
    COUNT(*) as quiz_count
  FROM quiz_sessions 
  WHERE completed_at >= NOW() - INTERVAL '7 days'
  GROUP BY user_id
  ORDER BY COUNT(*) DESC
  LIMIT 5
)
SELECT 
  'Active user data integrity' as check_type,
  au.user_id,
  au.quiz_count,
  xp.total_xp,
  xp.total_skp,
  (SELECT COUNT(*) FROM knowledge_card_collection kcc WHERE kcc.user_id = au.user_id) as card_count,
  (SELECT COUNT(*) FROM course_completions cc WHERE cc.user_id = au.user_id) as course_count
FROM active_users au
LEFT JOIN user_xp_stats_v2 xp ON au.user_id = xp.user_id
ORDER BY au.quiz_count DESC;

-- =====================================  
-- Phase 5: 危険な状態の検出
-- =====================================

-- 10. NULL値や異常値の検出
SELECT 'NULL/Invalid data check' as check_type, 'quiz_sessions' as table_name, COUNT(*) as invalid_count
FROM quiz_sessions 
WHERE user_id IS NULL OR session_id IS NULL OR earned_xp < 0
UNION ALL
SELECT 'NULL/Invalid data check', 'knowledge_card_collection', COUNT(*)
FROM knowledge_card_collection
WHERE user_id IS NULL OR card_id IS NULL OR card_id <= 0
UNION ALL
SELECT 'NULL/Invalid data check', 'user_xp_stats_v2', COUNT(*)
FROM user_xp_stats_v2
WHERE user_id IS NULL OR total_xp < 0 OR total_skp < 0;

-- =====================================
-- 実行後の判定基準
-- =====================================

/*
🚦 判定基準:
✅ 正常: 
- course_completionsにcompletion_bonus_skpカラムが存在しない
- 全重要テーブルが存在する
- データ重複が0件
- XP計算の差異が許容範囲内（±10XP）
- NULL/異常値が0件

⚠️  注意:
- データ重複が1-5件程度（手動確認が必要）
- XP差異が10-100XP程度（原因調査推奨）

❌ 危険:
- 重要テーブルが欠損
- 大量のデータ重複（10件以上）
- XP差異が100XP以上
- 多数のNULL/異常値
*/