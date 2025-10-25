-- ===============================================
-- 外部キー制約追加（JOINクエリ用）
-- 実行方法: テーブル作成・データ投入後にこのスクリプトを実行
-- ===============================================

-- user_knowledge_collection_v2 → knowledge_cards の外部キー
ALTER TABLE user_knowledge_collection_v2 
ADD CONSTRAINT fk_user_knowledge_collection_v2_theme_id 
FOREIGN KEY (theme_id) REFERENCES knowledge_cards(theme_id) ON DELETE CASCADE;

-- 確認クエリ
SELECT '外部キー制約追加完了' as status;