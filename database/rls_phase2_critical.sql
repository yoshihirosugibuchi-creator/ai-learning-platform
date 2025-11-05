-- RLS Phase 2: 最重要5テーブルのRLS設定
-- 作成日: 2025年11月4日
-- 対象: users, skp_transactions, user_xp_stats_v2, quiz_sessions, quiz_answers

-- 前提: Phase 1の基盤関数が実行済みであること

-- =============================================================================
-- 1. users テーブル（最重要）
-- =============================================================================

-- RLS有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザー自身のデータまたは管理者のみアクセス可能
CREATE POLICY "users_access_policy" ON users
  FOR ALL USING (is_owner_or_admin(id));

-- 管理者用の全アクセスポリシー（必要に応じて）
CREATE POLICY "users_admin_all_access" ON users
  FOR ALL USING (is_admin());

-- usersテーブルの特別な考慮事項
COMMENT ON POLICY "users_access_policy" ON users IS 'ユーザー自身または管理者のみアクセス可能';

-- =============================================================================
-- 2. skp_transactions テーブル（金銭価値データ）
-- =============================================================================

-- RLS有効化
ALTER TABLE skp_transactions ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザー自身の取引履歴または管理者のみアクセス可能
CREATE POLICY "skp_transactions_user_access" ON skp_transactions
  FOR ALL USING (is_owner_or_admin(user_id));

COMMENT ON POLICY "skp_transactions_user_access" ON skp_transactions IS 'ユーザー自身のSKP取引履歴または管理者のみアクセス可能';

-- =============================================================================
-- 3. user_xp_stats_v2 テーブル（統計データ）
-- =============================================================================

-- RLS有効化
ALTER TABLE user_xp_stats_v2 ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザー自身の統計データまたは管理者のみアクセス可能
CREATE POLICY "user_xp_stats_v2_user_access" ON user_xp_stats_v2
  FOR ALL USING (is_owner_or_admin(user_id));

COMMENT ON POLICY "user_xp_stats_v2_user_access" ON user_xp_stats_v2 IS 'ユーザー自身のXP統計データまたは管理者のみアクセス可能';

-- =============================================================================
-- 4. quiz_sessions テーブル（学習履歴）
-- =============================================================================

-- RLS有効化
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザー自身のクイズセッションまたは管理者のみアクセス可能
CREATE POLICY "quiz_sessions_user_access" ON quiz_sessions
  FOR ALL USING (is_owner_or_admin(user_id));

COMMENT ON POLICY "quiz_sessions_user_access" ON quiz_sessions IS 'ユーザー自身のクイズセッションまたは管理者のみアクセス可能';

-- =============================================================================
-- 5. quiz_answers テーブル（回答履歴）
-- =============================================================================

-- RLS有効化
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザー自身の回答履歴または管理者のみアクセス可能
CREATE POLICY "quiz_answers_user_access" ON quiz_answers
  FOR ALL USING (is_owner_or_admin(user_id));

COMMENT ON POLICY "quiz_answers_user_access" ON quiz_answers IS 'ユーザー自身のクイズ回答履歴または管理者のみアクセス可能';

-- =============================================================================
-- Phase 2 実行確認
-- =============================================================================

-- RLS有効化状況確認
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'skp_transactions', 'user_xp_stats_v2', 'quiz_sessions', 'quiz_answers')
ORDER BY tablename;

-- ポリシー作成状況確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('users', 'skp_transactions', 'user_xp_stats_v2', 'quiz_sessions', 'quiz_answers')
ORDER BY tablename, policyname;

-- =============================================================================
-- ロールバック用SQL（緊急時のみ使用）
-- =============================================================================

/*
-- 緊急時ロールバック（コメントアウト状態で保管）

-- RLS無効化
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE skp_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp_stats_v2 DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers DISABLE ROW LEVEL SECURITY;

-- ポリシー削除
DROP POLICY IF EXISTS "users_access_policy" ON users;
DROP POLICY IF EXISTS "users_admin_all_access" ON users;
DROP POLICY IF EXISTS "skp_transactions_user_access" ON skp_transactions;
DROP POLICY IF EXISTS "user_xp_stats_v2_user_access" ON user_xp_stats_v2;
DROP POLICY IF EXISTS "quiz_sessions_user_access" ON quiz_sessions;
DROP POLICY IF EXISTS "quiz_answers_user_access" ON quiz_answers;

*/