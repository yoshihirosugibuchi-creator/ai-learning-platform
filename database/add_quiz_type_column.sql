-- quiz_sessionsテーブルにquiz_typeカラムを追加
-- 実行場所: Supabase Dashboard > SQL Editor

-- 1. quiz_typeカラムを追加
ALTER TABLE quiz_sessions 
ADD COLUMN quiz_type TEXT CHECK (quiz_type IN ('main', 'self-personalized', 'category', 'review')) 
DEFAULT 'main';

-- 2. 既存データのquiz_type設定（データ整合性確保）
-- 既存のセッションは全て'main'として扱う（ビジネスAIパーソナライズクイズ相当）
UPDATE quiz_sessions 
SET quiz_type = 'main' 
WHERE quiz_type IS NULL;

-- 3. NOT NULL制約を追加（将来的なデータ整合性確保）
ALTER TABLE quiz_sessions 
ALTER COLUMN quiz_type SET NOT NULL;

-- 4. インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_quiz_type 
ON quiz_sessions(quiz_type);

-- 5. インデックス追加（分析クエリ用）
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_quiz_type 
ON quiz_sessions(user_id, quiz_type);

-- 6. 確認クエリ
SELECT 
  quiz_type,
  COUNT(*) as session_count,
  COUNT(DISTINCT user_id) as unique_users
FROM quiz_sessions 
GROUP BY quiz_type
ORDER BY quiz_type;

-- 7. 最新10件の確認
SELECT 
  id,
  user_id,
  quiz_type,
  total_questions,
  correct_answers,
  created_at
FROM quiz_sessions 
ORDER BY created_at DESC 
LIMIT 10;