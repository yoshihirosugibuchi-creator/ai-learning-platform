-- ============================================================
-- quiz_answers → quiz_sessions FK制約の復元
-- 作成日: 2026-01-27
-- 説明: ケーススタディ学習機能でFK制約を削除したが、
--       Supabaseの型生成でリレーションが検出できなくなったため復元
--       ケーススタディ回答は quiz_session_id = NULL で対応
-- ============================================================

-- 既存のFK制約があれば削除（重複防止）
ALTER TABLE quiz_answers DROP CONSTRAINT IF EXISTS quiz_answers_quiz_session_id_fkey;

-- FK制約を復元（ON DELETE SET NULL で削除時はNULLに）
ALTER TABLE quiz_answers
ADD CONSTRAINT quiz_answers_quiz_session_id_fkey
FOREIGN KEY (quiz_session_id)
REFERENCES quiz_sessions(id)
ON DELETE SET NULL;

-- ============================================================
-- マイグレーション完了
-- ============================================================
SELECT 'Quiz answers FK constraint restored successfully' AS result;
