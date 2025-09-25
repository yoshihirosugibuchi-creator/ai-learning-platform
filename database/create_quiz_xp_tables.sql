-- 統合XPシステム: クイズ用テーブル群
-- 作成日: 2025-09-25

-- 1. クイズセッション記録テーブル
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    session_end_time TIMESTAMP WITH TIME ZONE,
    total_questions INTEGER NOT NULL DEFAULT 10,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    accuracy_rate DECIMAL(5,2) NOT NULL DEFAULT 0.0, -- 60.00% など
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- 'completed', 'abandoned'
    bonus_xp INTEGER NOT NULL DEFAULT 0, -- ボーナスXP (20 or 30 or 0)
    total_xp INTEGER NOT NULL DEFAULT 0, -- セッション全体の獲得XP
    wisdom_cards_awarded INTEGER DEFAULT 0, -- 付与された格言カード数
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 統一回答記録テーブル（最も詳細なレベル - クイズ・コース問わず全問題記録）
CREATE TABLE IF NOT EXISTS public.quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL, -- クイズ問題ID
    user_answer INTEGER, -- ユーザーの選択 (1,2,3,4)
    is_correct BOOLEAN NOT NULL DEFAULT false,
    time_spent INTEGER NOT NULL DEFAULT 0, -- 回答時間（秒）
    is_timeout BOOLEAN NOT NULL DEFAULT false, -- 時間切れか
    
    -- セッション種別識別
    session_type VARCHAR(20) NOT NULL DEFAULT 'quiz', -- 'quiz', 'course_confirmation'
    
    -- コース学習関連情報（course_confirmationの場合に使用）
    course_session_id TEXT, -- コース学習セッションID
    course_id TEXT, -- コースID
    theme_id TEXT, -- テーマID
    genre_id TEXT, -- ジャンルID
    
    -- カテゴリー情報（非正規化でパフォーマンス向上）
    category_id TEXT NOT NULL,
    subcategory_id TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL, -- 'basic', 'intermediate', 'advanced', 'expert'
    
    -- XP計算結果
    earned_xp INTEGER NOT NULL DEFAULT 0, -- その問題で獲得したXP
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 管理者XP設定テーブル
CREATE TABLE IF NOT EXISTS public.xp_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    setting_description TEXT,
    setting_type VARCHAR(20) DEFAULT 'number', -- 'number', 'text', 'boolean'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初期設定値の挿入
INSERT INTO public.xp_settings (setting_key, setting_value, setting_description, setting_type) 
VALUES 
    -- クイズ基本設定
    ('quiz_base_xp', '10', 'クイズ問題1問正解時の基礎XP', 'number'),
    ('difficulty_basic', '1.0', '基礎レベル難易度倍率', 'number'),
    ('difficulty_intermediate', '1.2', '中級レベル難易度倍率', 'number'),
    ('difficulty_advanced', '1.5', '上級レベル難易度倍率', 'number'),
    ('difficulty_expert', '2.0', 'エキスパートレベル難易度倍率', 'number'),
    ('quiz_bonus_80_percent', '20', '80%以上正答率ボーナスXP', 'number'),
    ('quiz_bonus_100_percent', '30', '100%正答率ボーナスXP', 'number'),
    
    -- コース学習基本設定
    ('course_base_xp', '10', 'コースセッション完了時の基礎XP', 'number'),
    ('course_completion_bonus', '20', 'コース完了ボーナスXP', 'number'),
    
    -- 格言カード設定
    ('wisdom_cards_80_percent', '1', '80%以上正答率での格言カード付与数', 'number'),
    ('wisdom_cards_100_percent', '2', '100%正答率での格言カード付与数', 'number')
ON CONFLICT (setting_key) DO NOTHING;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user_id ON public.quiz_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_status ON public.quiz_sessions(status);
CREATE INDEX IF NOT EXISTS idx_quiz_sessions_created_at ON public.quiz_sessions(created_at);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_session_id ON public.quiz_answers(quiz_session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question_id ON public.quiz_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_category ON public.quiz_answers(category_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_subcategory ON public.quiz_answers(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_created_at ON public.quiz_answers(created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_session_type ON public.quiz_answers(session_type);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_course_session ON public.quiz_answers(course_session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_course_id ON public.quiz_answers(course_id);

-- RLS (Row Level Security) 設定
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_settings ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "quiz_sessions_user_policy" ON public.quiz_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "quiz_answers_user_policy" ON public.quiz_answers
    FOR ALL USING (
        auth.uid() IN (
            SELECT user_id FROM public.quiz_sessions 
            WHERE id = quiz_session_id
        )
    );

-- XP設定は全ユーザー読み取り可能
CREATE POLICY "xp_settings_read_policy" ON public.xp_settings
    FOR SELECT USING (true);

-- コメント追加
COMMENT ON TABLE public.quiz_sessions IS 'クイズセッション記録（10問1セット）';
COMMENT ON COLUMN public.quiz_sessions.accuracy_rate IS '正答率（%）';
COMMENT ON COLUMN public.quiz_sessions.bonus_xp IS 'セッション全体のボーナスXP（80%以上で20、100%で30）';
COMMENT ON COLUMN public.quiz_sessions.total_xp IS 'セッション全体で獲得したXP合計';

COMMENT ON TABLE public.quiz_answers IS '統一回答記録（クイズ10問セッション・コース確認クイズの全問題記録）';
COMMENT ON COLUMN public.quiz_answers.session_type IS 'セッション種別（quiz: 10問クイズ、course_confirmation: コース確認クイズ）';
COMMENT ON COLUMN public.quiz_answers.course_session_id IS 'コース学習セッションID（コース確認クイズの場合）';
COMMENT ON COLUMN public.quiz_answers.is_timeout IS '制限時間切れで自動回答になったか';
COMMENT ON COLUMN public.quiz_answers.earned_xp IS 'その問題で獲得したXP（正解時のみ）';

COMMENT ON TABLE public.xp_settings IS '管理者が変更可能なXP計算設定';

-- Updated_at 自動更新関数とトリガー
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER update_quiz_sessions_updated_at 
    BEFORE UPDATE ON public.quiz_sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_xp_settings_updated_at 
    BEFORE UPDATE ON public.xp_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();