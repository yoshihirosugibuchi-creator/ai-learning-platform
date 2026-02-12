-- =================================================================
-- learning_themes テーブルに subcategory_id カラム追加
-- 作成日: 2026年2月
-- 目的: テーマ単位でサブカテゴリーを設定可能にする
-- =================================================================

-- サブカテゴリーIDカラムを追加（NULL許可で既存データに影響なし）
ALTER TABLE learning_themes
ADD COLUMN IF NOT EXISTS subcategory_id TEXT;

-- カラムにコメントを追加
COMMENT ON COLUMN learning_themes.subcategory_id IS
  'サブカテゴリーID。ジャンルにsubcategory_idがある場合は自動継承、ない場合はテーマで必須選択';

-- インデックスを追加（サブカテゴリーで検索する場合のパフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_learning_themes_subcategory_id
  ON learning_themes(subcategory_id)
  WHERE subcategory_id IS NOT NULL;

-- =================================================================
-- 完了確認
-- =================================================================
SELECT
  'learning_themes.subcategory_id column added' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'learning_themes'
  AND column_name = 'subcategory_id';
