-- ============================================================
-- function_search_path_mutable 警告の一括修正
-- 対象: public スキーマの全関数に search_path を設定
-- 日付: 2026-02-25
--
-- search_path が未設定の関数はインジェクション攻撃のリスクがある
-- SET search_path = 'public' により安全なスキーマ解決を保証
-- ============================================================

DO $$
DECLARE
  func_record RECORD;
  alter_sql TEXT;
BEGIN
  FOR func_record IN
    SELECT
      n.nspname AS schema_name,
      p.proname AS func_name,
      pg_get_function_identity_arguments(p.oid) AS func_args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'  -- 通常の関数のみ（集約関数等を除外）
      AND NOT EXISTS (
        SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) AS config
        WHERE config LIKE 'search_path=%'
      )
  LOOP
    alter_sql := format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = ''public''',
      func_record.schema_name,
      func_record.func_name,
      func_record.func_args
    );
    RAISE NOTICE 'Fixing: %', alter_sql;
    EXECUTE alter_sql;
  END LOOP;
END $$;
