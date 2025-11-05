-- RLS Phase 1: 基盤関数とヘルパー関数作成
-- 作成日: 2025年11月4日
-- 目的: 全RLSポリシーで使用する共通関数を定義

-- =============================================================================
-- 1. 管理者権限チェック関数
-- =============================================================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role IN ('admin', 'system_admin') 
    FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数の説明とセキュリティ設定
COMMENT ON FUNCTION is_admin() IS 'admin または system_admin 権限を持つユーザーかどうかを確認';

-- =============================================================================
-- 2. システム管理者権限チェック関数
-- =============================================================================

CREATE OR REPLACE FUNCTION is_system_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'system_admin' 
    FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数の説明
COMMENT ON FUNCTION is_system_admin() IS 'system_admin 権限を持つユーザーかどうかを確認';

-- =============================================================================
-- 3. ユーザー自身または管理者かチェック関数
-- =============================================================================

CREATE OR REPLACE FUNCTION is_owner_or_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    auth.uid() = user_id OR is_admin()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数の説明
COMMENT ON FUNCTION is_owner_or_admin(UUID) IS 'データの所有者本人または管理者かどうかを確認';

-- =============================================================================
-- 4. 認証済みユーザーかチェック関数
-- =============================================================================

CREATE OR REPLACE FUNCTION is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数の説明
COMMENT ON FUNCTION is_authenticated() IS '認証済みユーザーかどうかを確認';

-- =============================================================================
-- 5. RLS有効化確認用のテスト関数
-- =============================================================================

CREATE OR REPLACE FUNCTION test_rls_function()
RETURNS TEXT AS $$
BEGIN
  RETURN CASE 
    WHEN auth.uid() IS NULL THEN 'anonymous'
    WHEN is_system_admin() THEN 'system_admin'
    WHEN is_admin() THEN 'admin'
    ELSE 'user'
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数の説明
COMMENT ON FUNCTION test_rls_function() IS 'RLS機能テスト用: 現在のユーザーの権限レベルを返す';

-- =============================================================================
-- 実行確認
-- =============================================================================

-- 関数が正しく作成されたかテスト
SELECT 
  'is_admin' as function_name,
  proname,
  pronargs
FROM pg_proc 
WHERE proname = 'is_admin';

SELECT 
  'is_system_admin' as function_name,
  proname,
  pronargs
FROM pg_proc 
WHERE proname = 'is_system_admin';

SELECT 
  'is_owner_or_admin' as function_name,
  proname,
  pronargs
FROM pg_proc 
WHERE proname = 'is_owner_or_admin';

SELECT 
  'is_authenticated' as function_name,
  proname,
  pronargs
FROM pg_proc 
WHERE proname = 'is_authenticated';

SELECT 
  'test_rls_function' as function_name,
  proname,
  pronargs
FROM pg_proc 
WHERE proname = 'test_rls_function';