-- quiz_answersテーブルにuser_idカラム追加
-- 実行日: 2025年10月7日
-- 目的: コース学習・クイズ学習でのユーザー識別を可能にする

-- 1. user_idカラム追加（NOT NULL制約、外部キー制約付き）
ALTER TABLE quiz_answers 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. インデックス追加（検索パフォーマンス向上）
CREATE INDEX idx_quiz_answers_user_id ON quiz_answers(user_id);
CREATE INDEX idx_quiz_answers_user_category ON quiz_answers(user_id, category_id);
CREATE INDEX idx_quiz_answers_user_subcategory ON quiz_answers(user_id, subcategory_id);

-- 3. 複合インデックス（分析クエリ最適化）
CREATE INDEX idx_quiz_answers_user_course_analytics ON quiz_answers(user_id, course_id, created_at) WHERE course_id IS NOT NULL;
CREATE INDEX idx_quiz_answers_user_quiz_analytics ON quiz_answers(user_id, quiz_session_id, created_at) WHERE quiz_session_id IS NOT NULL;

-- 4. RLS (Row Level Security) ポリシー追加
-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "Users can view own quiz answers" ON quiz_answers 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quiz answers" ON quiz_answers 
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quiz answers" ON quiz_answers 
FOR UPDATE USING (auth.uid() = user_id);

-- 5. 管理者アクセス用ポリシー（必要に応じて）
-- CREATE POLICY "Admins can access all quiz answers" ON quiz_answers 
-- FOR ALL USING (
--   EXISTS (
--     SELECT 1 FROM user_profiles 
--     WHERE user_id = auth.uid() 
--     AND role = 'admin'
--   )
-- );

-- 6. 既存データの migration（実際の実行時に必要に応じて）
-- NOTE: 既存データにuser_idを設定する必要がある場合は、
-- quiz_session_id から quiz_sessions.user_id を取得して更新する

-- 例: 既存データ更新クエリ（実行前に要確認）
-- UPDATE quiz_answers 
-- SET user_id = (
--   SELECT qs.user_id 
--   FROM quiz_sessions qs 
--   WHERE qs.id = quiz_answers.quiz_session_id
-- )
-- WHERE quiz_session_id IS NOT NULL 
-- AND user_id IS NULL;

-- 7. NOT NULL制約追加（既存データ更新後）
-- ALTER TABLE quiz_answers 
-- ALTER COLUMN user_id SET NOT NULL;

COMMENT ON COLUMN quiz_answers.user_id IS 'ユーザーID - クイズ回答者の識別用';