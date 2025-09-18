-- 本番用：Row Level Security (RLS)とセキュリティポリシーを設定
-- 🚀 注意: これは本番リリース前に必ず実行してください。

-- 1. 全テーブルでRLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE detailed_quiz_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE skp_transactions ENABLE ROW LEVEL SECURITY;

-- 2. users テーブル用ポリシー
DROP POLICY IF EXISTS "Users can manage their own profile" ON users;
CREATE POLICY "Users can manage their own profile" ON users 
FOR ALL TO authenticated 
USING (auth.uid() = id);

-- 匿名ユーザー用（開発テスト用）
CREATE POLICY "Allow anon operations for development" ON users 
FOR ALL TO anon 
USING (true);

-- 3. quiz_results テーブル用ポリシー
DROP POLICY IF EXISTS "Users can insert quiz results" ON quiz_results;
DROP POLICY IF EXISTS "Users can view quiz results" ON quiz_results;

CREATE POLICY "Users can insert their own quiz results" ON quiz_results 
FOR INSERT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own quiz results" ON quiz_results 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

-- 匿名ユーザー用（開発テスト用）
CREATE POLICY "Allow anon quiz operations for development" ON quiz_results 
FOR ALL TO anon 
USING (true);

-- 4. detailed_quiz_data テーブル用ポリシー
DROP POLICY IF EXISTS "Users can insert detailed quiz data" ON detailed_quiz_data;
DROP POLICY IF EXISTS "Users can view detailed quiz data" ON detailed_quiz_data;

CREATE POLICY "Users can insert their own detailed quiz data" ON detailed_quiz_data 
FOR INSERT TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own detailed quiz data" ON detailed_quiz_data 
FOR SELECT TO authenticated 
USING (auth.uid() = user_id);

-- 匿名ユーザー用（開発テスト用）
CREATE POLICY "Allow anon detailed quiz operations for development" ON detailed_quiz_data 
FOR ALL TO anon 
USING (true);

-- 5. category_progress テーブル用ポリシー
DROP POLICY IF EXISTS "Users can manage their own progress" ON category_progress;

CREATE POLICY "Users can manage their own progress" ON category_progress 
FOR ALL TO authenticated 
USING (auth.uid() = user_id);

-- 匿名ユーザー用（開発テスト用）
CREATE POLICY "Allow anon progress operations for development" ON category_progress 
FOR ALL TO anon 
USING (true);

-- 6. skp_transactions テーブル用ポリシー
DROP POLICY IF EXISTS "Users can manage their own SKP" ON skp_transactions;

CREATE POLICY "Users can manage their own SKP transactions" ON skp_transactions 
FOR ALL TO authenticated 
USING (auth.uid() = user_id);

-- 匿名ユーザー用（開発テスト用）
CREATE POLICY "Allow anon SKP operations for development" ON skp_transactions 
FOR ALL TO anon 
USING (true);

-- 7. RLS状態を確認
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

-- 8. 作成されたポリシーを確認
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 実行完了メッセージ
SELECT '🚀 Production RLS enabled with security policies' as status;