-- 開発用：全12テーブルのRow Level Security (RLS)を一括無効化
-- ⚠️ 注意: これは開発・テスト専用です。本番環境では実行しないでください。

-- RLS無効化前の状態確認
SELECT 
    '=== RLS無効化前の状態 ===' as status,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 'quiz_results', 'category_progress', 'detailed_quiz_data', 
    'skp_transactions', 'learning_sessions', 'learning_progress', 
    'user_progress', 'user_settings', 'user_badges', 
    'knowledge_card_collection', 'wisdom_card_collection'
)
ORDER BY tablename;

-- 全12テーブルのRLSを無効化
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE category_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE detailed_quiz_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE skp_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_card_collection DISABLE ROW LEVEL SECURITY;
ALTER TABLE wisdom_card_collection DISABLE ROW LEVEL SECURITY;

-- RLS無効化後の状態確認
SELECT 
    '=== RLS無効化後の状態 ===' as status,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 'quiz_results', 'category_progress', 'detailed_quiz_data', 
    'skp_transactions', 'learning_sessions', 'learning_progress', 
    'user_progress', 'user_settings', 'user_badges', 
    'knowledge_card_collection', 'wisdom_card_collection'
)
ORDER BY tablename;

-- 完了メッセージ
SELECT 
    '✅ 全12テーブルのRLS無効化が完了しました' as message,
    '⚠️ 本番リリース前に必ずRLSを再有効化してください' as warning;

-- 参考：本番用RLS再有効化スクリプト
/*
本番リリース前に以下を実行：

-- 全テーブルのRLS再有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE detailed_quiz_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE skp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_card_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE wisdom_card_collection ENABLE ROW LEVEL SECURITY;

詳細は PRODUCTION_CHECKLIST.md を参照してください。
*/