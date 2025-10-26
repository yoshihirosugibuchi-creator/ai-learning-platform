-- ヒント機能完全実装のためのquiz_answersテーブル修正
-- 作成日: 2025-10-26
-- 目的: max_hint_levelフィールド追加でヒント使用レベル記録を可能にする

-- 1. max_hint_levelフィールド追加
ALTER TABLE quiz_answers 
ADD COLUMN max_hint_level integer DEFAULT 0 CHECK (max_hint_level >= 0 AND max_hint_level <= 3);

-- 2. ヒント使用詳細記録フィールド追加（将来の拡張用）
ALTER TABLE quiz_answers 
ADD COLUMN hint_usage_details jsonb DEFAULT '{}';

-- 3. インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_quiz_answers_hint_level ON quiz_answers(max_hint_level);

-- 4. 既存データのhint_usedとmax_hint_levelの整合性確保
-- hint_used = true かつ max_hint_level = 0 のデータがあれば、max_hint_level = 1 に設定
UPDATE quiz_answers 
SET max_hint_level = 1 
WHERE hint_used = true AND max_hint_level = 0;

-- 5. 確認用クエリ（実行後に実行）
-- SELECT 
--   hint_used, 
--   max_hint_level, 
--   COUNT(*) as count 
-- FROM quiz_answers 
-- GROUP BY hint_used, max_hint_level 
-- ORDER BY hint_used, max_hint_level;