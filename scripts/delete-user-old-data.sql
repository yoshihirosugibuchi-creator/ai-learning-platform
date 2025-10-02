-- 特定ユーザーの古いデータ削除スクリプト
-- ユーザーID: 82413077-a06d-4d9c-82bb-6fdb6a6b8e13
-- 注意: 新しい統合学習分析システム実装前の古いデータを削除

-- =====================================
-- 1. 新しい統合学習分析テーブルのデータ削除
-- =====================================

-- 統合学習セッション分析データ削除
DELETE FROM unified_learning_session_analytics 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- 個人学習プロファイル削除
DELETE FROM user_learning_profiles 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- 復習スケジュール削除
DELETE FROM spaced_repetition_schedule 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- =====================================
-- 2. 既存テーブルの古いデータ削除
-- =====================================

-- クイズ回答データ削除
DELETE FROM quiz_answers 
WHERE quiz_session_id IN (
  SELECT id FROM quiz_sessions WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
);

-- クイズセッション削除
DELETE FROM quiz_sessions 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- 学習進捗削除
DELETE FROM learning_progress 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- コース完了記録削除
DELETE FROM course_completions 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- コーステーマ完了記録削除
DELETE FROM course_theme_completions 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- コースセッション完了記録削除
DELETE FROM course_session_completions 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- 日次XP記録削除
DELETE FROM daily_xp_records 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- XPトランザクション削除
DELETE FROM skp_transactions 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- ナレッジカードコレクション削除
DELETE FROM knowledge_card_collection 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- ウィズダムカードコレクション削除
DELETE FROM wisdom_card_collection 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- ユーザーバッジ削除
DELETE FROM user_badges 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- =====================================
-- 3. XP統計テーブルリセット
-- =====================================

-- ユーザーXP統計v2リセット
UPDATE user_xp_stats_v2 
SET 
  total_xp = 0,
  quiz_xp = 0,
  course_xp = 0,
  bonus_xp = 0,
  quiz_sessions_completed = 0,
  course_sessions_completed = 0,
  quiz_questions_answered = 0,
  quiz_questions_correct = 0,
  quiz_average_accuracy = 0,
  wisdom_cards_total = 0,
  knowledge_cards_total = 0,
  badges_total = 0,
  current_level = 1,
  last_activity_at = NOW(),
  total_skp = 0,
  quiz_skp = 0,
  course_skp = 0,
  bonus_skp = 0,
  streak_skp = 0,
  total_learning_time_seconds = 0,
  quiz_learning_time_seconds = 0,
  course_learning_time_seconds = 0,
  updated_at = NOW()
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- カテゴリーXP統計v2削除
DELETE FROM user_category_xp_stats_v2 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- サブカテゴリーXP統計v2削除
DELETE FROM user_subcategory_xp_stats_v2 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- =====================================
-- 4. ユーザー設定リセット
-- =====================================

-- ユーザー設定削除
DELETE FROM user_settings 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- =====================================
-- 5. usersテーブルの学習関連フィールドリセット
-- =====================================

UPDATE users 
SET 
  total_xp = 0,
  current_level = 1,
  streak = 0,
  last_active = NOW(),
  profile_completed_at = NULL,
  last_profile_update = NOW(),
  updated_at = NOW()
WHERE id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';

-- =====================================
-- 確認クエリ（削除後に実行推奨）
-- =====================================

-- 削除確認用クエリ（コメントアウト解除して実行）
/*
SELECT 'quiz_sessions' as table_name, COUNT(*) as remaining_records 
FROM quiz_sessions WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
UNION ALL
SELECT 'quiz_answers', COUNT(*) 
FROM quiz_answers qa 
JOIN quiz_sessions qs ON qa.quiz_session_id = qs.id 
WHERE qs.user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
UNION ALL
SELECT 'learning_progress', COUNT(*) 
FROM learning_progress WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
UNION ALL
SELECT 'daily_xp_records', COUNT(*) 
FROM daily_xp_records WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
UNION ALL
SELECT 'user_category_xp_stats_v2', COUNT(*) 
FROM user_category_xp_stats_v2 WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
UNION ALL
SELECT 'user_subcategory_xp_stats_v2', COUNT(*) 
FROM user_subcategory_xp_stats_v2 WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13';
*/