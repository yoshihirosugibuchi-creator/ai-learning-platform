-- 不要テーブル削除SQL
-- 実行日: 2025年11月5日
-- 目的: learning_progress, knowledge_card_collection, quiz_hints_backup テーブルの削除

-- 1. learning_progress テーブル削除（course_session_completions に置き換え済み）
DROP TABLE IF EXISTS learning_progress CASCADE;

-- 2. knowledge_card_collection テーブル削除（使用されていない）
DROP TABLE IF EXISTS knowledge_card_collection CASCADE;

-- 3. quiz_hints_backup テーブル削除（マイグレーション完了済みバックアップ）
DROP TABLE IF EXISTS quiz_hints_backup CASCADE;

-- 確認: 削除されたテーブルの確認
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('learning_progress', 'knowledge_card_collection', 'quiz_hints_backup');