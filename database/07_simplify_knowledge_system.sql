-- ===============================================
-- ナレッジカードシステム正しい設計：初回テーマ完了のみ報酬
-- 既存knowledge_cardsテーブル削除、シンプルなuser_knowledge_collection_v2活用
-- ===============================================

-- 1. 外部キー制約削除（存在する場合）
ALTER TABLE user_knowledge_collection_v2 DROP CONSTRAINT IF EXISTS fk_user_knowledge_collection_v2_theme_id;

-- 2. 誤って作成したknowledge_cardsテーブル削除
DROP TABLE IF EXISTS knowledge_cards;

-- 3. user_knowledge_collection_v2テーブル構造をシンプル化
-- countカラム削除（初回のみなので不要）
ALTER TABLE user_knowledge_collection_v2 DROP COLUMN IF EXISTS count;
ALTER TABLE user_knowledge_collection_v2 DROP COLUMN IF EXISTS last_obtained_at;

-- 4. カラム名修正
ALTER TABLE user_knowledge_collection_v2 RENAME COLUMN first_obtained_at TO obtained_at;

-- 5. 制約追加：1ユーザー1テーマ1回のみ（既に存在する場合はスキップ）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'uk_user_knowledge_collection_v2_user_theme'
  ) THEN
    ALTER TABLE user_knowledge_collection_v2 
    ADD CONSTRAINT uk_user_knowledge_collection_v2_user_theme 
    UNIQUE (user_id, theme_id);
  END IF;
END $$;

-- 6. インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_user_knowledge_collection_v2_user_id 
ON user_knowledge_collection_v2(user_id);

CREATE INDEX IF NOT EXISTS idx_user_knowledge_collection_v2_theme_id 
ON user_knowledge_collection_v2(theme_id);

-- 7. 確認クエリ
SELECT 
  'user_knowledge_collection_v2テーブル正規化完了' as status,
  COUNT(*) as current_records
FROM user_knowledge_collection_v2;