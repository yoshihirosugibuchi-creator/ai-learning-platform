-- 開発用：存在する11テーブルのRow Level Security (RLS)を一括無効化
-- ⚠️ 注意: これは開発・テスト専用です。本番環境では実行しないでください。

-- 存在確認＆RLS無効化前の状態確認
SELECT 
    '=== 存在する11テーブルのRLS状態（無効化前） ===' as status,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 'quiz_results', 'category_progress', 'detailed_quiz_data', 
    'skp_transactions', 'learning_sessions', 
    'user_progress', 'user_settings', 'user_badges', 
    'knowledge_card_collection', 'wisdom_card_collection'
)
ORDER BY tablename;

-- 存在する11テーブルのRLSを無効化
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE category_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE detailed_quiz_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE skp_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_card_collection DISABLE ROW LEVEL SECURITY;
ALTER TABLE wisdom_card_collection DISABLE ROW LEVEL SECURITY;

-- RLS無効化後の状態確認
SELECT 
    '=== RLS無効化後の状態（全てfalseであることを確認） ===' as status,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'users', 'quiz_results', 'category_progress', 'detailed_quiz_data', 
    'skp_transactions', 'learning_sessions', 
    'user_progress', 'user_settings', 'user_badges', 
    'knowledge_card_collection', 'wisdom_card_collection'
)
ORDER BY tablename;

-- 完了メッセージ
SELECT 
    '✅ 存在する11テーブルのRLS無効化が完了しました' as message,
    '⚠️ learning_progressテーブルは存在しないため除外しました' as note,
    '🚀 これでクイズ完了時のフリーズ問題が解決されるはずです' as next_step,
    '⚠️ 本番リリース前に必ずPRODUCTION_CHECKLIST.mdを確認してください' as warning;

-- 参考：本番用RLS再有効化スクリプト
/*
本番リリース前に以下を実行：

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE detailed_quiz_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE skp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_card_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE wisdom_card_collection ENABLE ROW LEVEL SECURITY;

詳細はPRODUCTION_CHECKLIST.mdを参照してください。
*/