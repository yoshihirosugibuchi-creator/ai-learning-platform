-- Fix RLS infinite recursion on users table
-- 根本原因: is_admin()関数がusersテーブルを参照し、usersテーブルのRLSポリシーが再帰を引き起こす

-- =============================================================================
-- Phase 1: 緊急修正 - usersテーブルの安全なRLSポリシー
-- =============================================================================

-- Step 1: 既存のポリシーを削除
DROP POLICY IF EXISTS "users_access_policy" ON users;
DROP POLICY IF EXISTS "users_admin_all_access" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Step 2: RLSを一時無効化（安全な再設定のため）
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 3: usersテーブル専用の安全な関数を作成
-- auth.uid()のみを使用し、usersテーブルを参照しない
CREATE OR REPLACE FUNCTION is_authenticated_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: 安全なRLSポリシーを作成
-- ユーザー自身のレコードのみアクセス可能（無限再帰回避）
CREATE POLICY "users_self_access_only" ON users
  FOR ALL USING (auth.uid() = id);

-- Step 5: service_roleによる完全アクセス許可（API用）
CREATE POLICY "users_service_role_access" ON users
  FOR ALL TO service_role USING (true);

-- Step 6: RLSを再有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 7: 権限設定
GRANT ALL ON users TO service_role;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- =============================================================================
-- Phase 2: 管理者権限チェック関数の修正
-- =============================================================================

-- auth.users.user_metadataを使用する安全な管理者チェック関数
CREATE OR REPLACE FUNCTION is_admin_safe()
RETURNS BOOLEAN AS $$
BEGIN
  -- auth.users.user_metadataを直接参照（usersテーブル回避）
  RETURN (
    COALESCE(
      (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role',
      'user'
    ) IN ('admin', 'system_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_system_admin_safe()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    COALESCE(
      (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role',
      'user'
    ) = 'system_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: 他のテーブル用の安全な関数
CREATE OR REPLACE FUNCTION is_owner_or_admin_safe(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.uid() = user_id OR is_admin_safe()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Phase 3: 検証とコメント
-- =============================================================================

-- RLS状態確認
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'users';

-- ポリシー確認
SELECT 
  schemaname,
  tablename,
  policyname,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'users'
ORDER BY policyname;

-- コメント追加
COMMENT ON POLICY "users_self_access_only" ON users IS 'ユーザー自身のレコードのみアクセス可能 - 無限再帰回避版';
COMMENT ON POLICY "users_service_role_access" ON users IS 'サービスロール（API）による完全アクセス';

COMMENT ON FUNCTION is_admin_safe() IS '無限再帰を回避する管理者権限チェック - auth.user_metadataを使用';
COMMENT ON FUNCTION is_system_admin_safe() IS '無限再帰を回避するシステム管理者権限チェック';
COMMENT ON FUNCTION is_owner_or_admin_safe(UUID) IS '無限再帰を回避する所有者または管理者チェック';

-- 実行ログ
INSERT INTO system_alerts (
    alert_type, 
    severity, 
    title, 
    message, 
    context
) VALUES (
    'rls_infinite_recursion_fix',
    'high',
    'RLS infinite recursion fixed',
    'Fixed infinite recursion in users table RLS policies by avoiding self-reference',
    jsonb_build_object(
        'action', 'fix_infinite_recursion',
        'affected_table', 'users',
        'fix_method', 'auth_uid_only_policies',
        'safe_functions_created', ARRAY['is_admin_safe', 'is_system_admin_safe', 'is_owner_or_admin_safe'],
        'timestamp', NOW()
    )
) ON CONFLICT DO NOTHING;

SELECT 'RLS infinite recursion fix completed successfully' as status, NOW() as timestamp;