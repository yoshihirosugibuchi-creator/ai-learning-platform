-- XP関連テーブルのRLSを一時的に無効化（開発用）
-- 学習分析システム実装により影響を受けたテーブルのRLS無効化

-- 主要XPテーブル/ビューのRLS無効化
ALTER TABLE IF EXISTS user_xp_stats_v2 DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_category_xp_stats_v2 DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_subcategory_xp_stats_v2 DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS daily_xp_records DISABLE ROW LEVEL SECURITY;

-- 関連するユーザーデータテーブルのRLS無効化
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS skp_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS learning_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS learning_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS knowledge_card_collection DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS wisdom_card_collection DISABLE ROW LEVEL SECURITY;

-- クイズ関連テーブル（存在する場合）
ALTER TABLE IF EXISTS quiz_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quiz_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS course_completions DISABLE ROW LEVEL SECURITY;

-- 学習分析用新テーブル
ALTER TABLE IF EXISTS learning_analytics_summary DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS learning_recommendations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS learning_effectiveness_tracking DISABLE ROW LEVEL SECURITY;

-- 確認用クエリ
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'user_xp_stats_v2',
        'user_category_xp_stats_v2', 
        'user_subcategory_xp_stats_v2',
        'daily_xp_records',
        'users',
        'quiz_sessions',
        'quiz_answers',
        'course_completions'
    )
ORDER BY tablename;