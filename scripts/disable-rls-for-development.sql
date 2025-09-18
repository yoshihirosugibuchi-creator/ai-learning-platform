-- 開発用：全テーブルのRow Level Security (RLS)を無効化
-- ⚠️ 注意: これは開発・テスト専用です。本番環境では使用しないでください。

-- 1. ユーザー関連テーブル
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. クイズ関連テーブル  
ALTER TABLE quiz_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE detailed_quiz_data DISABLE ROW LEVEL SECURITY;

-- 3. 学習進捗関連テーブル
ALTER TABLE category_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE skp_transactions DISABLE ROW LEVEL SECURITY;

-- 4. 学習セッション関連テーブル（存在する場合）
-- ALTER TABLE learning_sessions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_card_collection DISABLE ROW LEVEL SECURITY;

-- 現在のRLS状態を確認
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'users', 
        'quiz_results', 
        'detailed_quiz_data', 
        'category_progress', 
        'skp_transactions'
    )
ORDER BY tablename;

-- 実行完了メッセージ
SELECT '✅ Development RLS disabled for all tables' as status;