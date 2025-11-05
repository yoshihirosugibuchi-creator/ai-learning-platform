-- 全データベースオブジェクトの包括的取得クエリ
-- 51テーブル分析用

-- 1. 全テーブル（publicスキーマ）
SELECT 
  'table' as object_type,
  table_name as name,
  table_schema,
  'N/A' as data_type,
  'N/A' as is_nullable
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. 全ビュー（publicスキーマ）
SELECT 
  'view' as object_type,
  table_name as name,
  table_schema,
  'N/A' as data_type,
  'N/A' as is_nullable
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 3. 全カラム情報（user_id存在確認用）
SELECT 
  'column' as object_type,
  table_name || '.' || column_name as name,
  table_schema,
  data_type,
  is_nullable,
  column_name,
  table_name
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name IN (
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
  )
ORDER BY table_name, ordinal_position;

-- 4. 外部キー制約（関係性分析用）
SELECT 
  'foreign_key' as object_type,
  tc.constraint_name as name,
  tc.table_schema,
  'constraint' as data_type,
  'N/A' as is_nullable,
  tc.table_name as source_table,
  ccu.table_name as target_table,
  kcu.column_name as source_column,
  ccu.column_name as target_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 5. インデックス情報
SELECT 
  'index' as object_type,
  indexname as name,
  schemaname as table_schema,
  'index' as data_type,
  'N/A' as is_nullable,
  tablename,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. 関数・プロシージャ
SELECT 
  'function' as object_type,
  routine_name as name,
  routine_schema as table_schema,
  data_type,
  'N/A' as is_nullable
FROM information_schema.routines 
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 7. 現在のRLS設定状況
SELECT 
  'rls_status' as object_type,
  tablename as name,
  schemaname as table_schema,
  CASE 
    WHEN rowsecurity THEN 'enabled'
    ELSE 'disabled'
  END as data_type,
  'N/A' as is_nullable
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
ORDER BY tablename;