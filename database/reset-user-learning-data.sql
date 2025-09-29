-- ユーザー学習データ完全リセットSQL
-- 作成日: 2025-09-29
-- 目的: 特定ユーザーの学習履歴・進捗データを完全削除（アカウント情報は保持）

-- 使用方法:
-- 1. SQLエディターで実行する場合:
--    'USER_ID_PLACEHOLDER'を実際のユーザーIDに置換してから実行
-- 2. APIエンドポイント経由で実行する場合:
--    /api/admin/reset-user-data を使用

-- 注意: このSQLは以下のデータを削除します
-- ✓ 学習進捗・履歴データ（19テーブル）
-- ✗ アカウント情報・プロファイル（usersテーブル）は保持

-- ===========================================
-- 1. 学習進捗・完了記録系
-- ===========================================

-- 学習進捗
DELETE FROM learning_progress WHERE user_id = 'USER_ID_PLACEHOLDER';

-- コース関連完了記録
DELETE FROM course_session_completions WHERE user_id = 'USER_ID_PLACEHOLDER';
DELETE FROM course_theme_completions WHERE user_id = 'USER_ID_PLACEHOLDER';
DELETE FROM course_completions WHERE user_id = 'USER_ID_PLACEHOLDER';

-- カテゴリ進捗
DELETE FROM category_progress WHERE user_id = 'USER_ID_PLACEHOLDER';

-- ユーザー進捗
DELETE FROM user_progress WHERE user_id = 'USER_ID_PLACEHOLDER';

-- ===========================================
-- 2. クイズ関連データ
-- ===========================================

-- クイズセッション履歴
DELETE FROM quiz_sessions WHERE user_id = 'USER_ID_PLACEHOLDER';

-- quiz_answers は quiz_sessions 削除時に外部キー制約で自動削除される
-- 手動削除は不要（user_id カラムも存在しない）

-- クイズ結果
DELETE FROM quiz_results WHERE user_id = 'USER_ID_PLACEHOLDER';

-- 詳細クイズデータ
DELETE FROM detailed_quiz_data WHERE user_id = 'USER_ID_PLACEHOLDER';

-- ===========================================
-- 3. XP・統計データ
-- ===========================================

-- XP統計（v1・v2）
DELETE FROM user_xp_stats WHERE user_id = 'USER_ID_PLACEHOLDER';
DELETE FROM user_xp_stats_v2 WHERE user_id = 'USER_ID_PLACEHOLDER';

-- カテゴリ別XP統計（v1・v2）
DELETE FROM user_category_xp_stats WHERE user_id = 'USER_ID_PLACEHOLDER';
DELETE FROM user_category_xp_stats_v2 WHERE user_id = 'USER_ID_PLACEHOLDER';

-- サブカテゴリ別XP統計（v1・v2）
DELETE FROM user_subcategory_xp_stats WHERE user_id = 'USER_ID_PLACEHOLDER';
DELETE FROM user_subcategory_xp_stats_v2 WHERE user_id = 'USER_ID_PLACEHOLDER';

-- 日別XP記録（連続学習日数計算用）
DELETE FROM daily_xp_records WHERE user_id = 'USER_ID_PLACEHOLDER';

-- ===========================================
-- 4. SKP・ポイント系
-- ===========================================

-- SKP取引履歴
DELETE FROM skp_transactions WHERE user_id = 'USER_ID_PLACEHOLDER';

-- ===========================================
-- 5. バッジ・カード収集系
-- ===========================================

-- 獲得バッジ
DELETE FROM user_badges WHERE user_id = 'USER_ID_PLACEHOLDER';

-- ナレッジカード収集
DELETE FROM knowledge_card_collection WHERE user_id = 'USER_ID_PLACEHOLDER';

-- 格言カード収集
DELETE FROM wisdom_card_collection WHERE user_id = 'USER_ID_PLACEHOLDER';

-- ===========================================
-- 6. ユーザー設定・パーソナライゼーション
-- ===========================================

-- ユーザー設定（クイズ設定、記憶強度、学習効率など）
DELETE FROM user_settings WHERE user_id = 'USER_ID_PLACEHOLDER';

-- ===========================================
-- 削除完了確認
-- ===========================================

-- 各テーブルの残存データ数を確認
SELECT 'learning_progress' as table_name, count(*) as remaining_count FROM learning_progress WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'course_session_completions', count(*) FROM course_session_completions WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'course_theme_completions', count(*) FROM course_theme_completions WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'course_completions', count(*) FROM course_completions WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'category_progress', count(*) FROM category_progress WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'user_progress', count(*) FROM user_progress WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'quiz_sessions', count(*) FROM quiz_sessions WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'quiz_answers (auto-deleted)', 0 as count
UNION ALL
SELECT 'quiz_results', count(*) FROM quiz_results WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'detailed_quiz_data', count(*) FROM detailed_quiz_data WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'user_xp_stats', count(*) FROM user_xp_stats WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'user_xp_stats_v2', count(*) FROM user_xp_stats_v2 WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'user_category_xp_stats', count(*) FROM user_category_xp_stats WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'user_category_xp_stats_v2', count(*) FROM user_category_xp_stats_v2 WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'user_subcategory_xp_stats', count(*) FROM user_subcategory_xp_stats WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'user_subcategory_xp_stats_v2', count(*) FROM user_subcategory_xp_stats_v2 WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'daily_xp_records', count(*) FROM daily_xp_records WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'skp_transactions', count(*) FROM skp_transactions WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'user_badges', count(*) FROM user_badges WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'knowledge_card_collection', count(*) FROM knowledge_card_collection WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'wisdom_card_collection', count(*) FROM wisdom_card_collection WHERE user_id = 'USER_ID_PLACEHOLDER'
UNION ALL
SELECT 'user_settings', count(*) FROM user_settings WHERE user_id = 'USER_ID_PLACEHOLDER';

-- 注意: すべてのカウントが0になることを確認してください