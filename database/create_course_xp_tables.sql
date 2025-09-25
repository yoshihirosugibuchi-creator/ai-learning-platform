-- 統合XPシステム: コース学習用テーブル群
-- 作成日: 2025-09-25

-- 1. セッション完了記録テーブル
CREATE TABLE IF NOT EXISTS public.course_session_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL, -- learning_sessions.id
    course_id TEXT NOT NULL, -- learning_courses.id
    theme_id TEXT NOT NULL, -- learning_themes.id
    genre_id TEXT NOT NULL, -- learning_genres.id
    
    -- カテゴリー情報（非正規化でパフォーマンス向上）
    category_id TEXT NOT NULL,
    subcategory_id TEXT NOT NULL,
    
    -- 完了詳細
    is_first_completion BOOLEAN NOT NULL DEFAULT true, -- 初回完了かどうか
    session_quiz_correct BOOLEAN NOT NULL DEFAULT false, -- セッション最後のクイズ正解
    earned_xp INTEGER NOT NULL DEFAULT 0, -- セッション完了で獲得したXP
    completion_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 復習かどうかの判定用
    review_count INTEGER NOT NULL DEFAULT 0, -- 何回目の学習か
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 同一ユーザー・セッションの重複防止
    UNIQUE(user_id, session_id, completion_time)
);

-- 2. テーマ完了記録テーブル
CREATE TABLE IF NOT EXISTS public.course_theme_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme_id TEXT NOT NULL, -- learning_themes.id
    course_id TEXT NOT NULL, -- learning_courses.id
    genre_id TEXT NOT NULL, -- learning_genres.id
    
    -- カテゴリー情報
    category_id TEXT NOT NULL,
    subcategory_id TEXT NOT NULL,
    
    -- 完了詳細
    total_sessions INTEGER NOT NULL, -- テーマ内総セッション数
    completed_sessions INTEGER NOT NULL, -- 完了済みセッション数
    completion_rate DECIMAL(5,2) NOT NULL DEFAULT 100.0, -- 完了率
    first_completion_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 報酬
    knowledge_cards_awarded INTEGER DEFAULT 0, -- 付与されたナレッジカード数
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 同一ユーザー・テーマの重複防止
    UNIQUE(user_id, theme_id)
);

-- 3. コース完了記録テーブル
CREATE TABLE IF NOT EXISTS public.course_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL, -- learning_courses.id
    
    -- コース統計
    total_themes INTEGER NOT NULL, -- コース内総テーマ数
    completed_themes INTEGER NOT NULL, -- 完了済みテーマ数
    total_sessions INTEGER NOT NULL, -- コース内総セッション数
    completed_sessions INTEGER NOT NULL, -- 完了済みセッション数
    completion_rate DECIMAL(5,2) NOT NULL DEFAULT 100.0, -- 完了率
    
    -- XP統計
    total_session_xp INTEGER NOT NULL DEFAULT 0, -- セッション完了による総XP
    completion_bonus_xp INTEGER NOT NULL DEFAULT 0, -- コース完了ボーナスXP
    total_earned_xp INTEGER NOT NULL DEFAULT 0, -- このコースで獲得した総XP
    
    first_completion_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- 報酬
    badges_awarded INTEGER DEFAULT 0, -- 付与された修了証（バッジ）数
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 同一ユーザー・コースの重複防止
    UNIQUE(user_id, course_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_course_session_completions_user_id ON public.course_session_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_course_session_completions_session_id ON public.course_session_completions(session_id);
CREATE INDEX IF NOT EXISTS idx_course_session_completions_category ON public.course_session_completions(category_id);
CREATE INDEX IF NOT EXISTS idx_course_session_completions_subcategory ON public.course_session_completions(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_course_session_completions_completion_time ON public.course_session_completions(completion_time);
CREATE INDEX IF NOT EXISTS idx_course_session_completions_is_first ON public.course_session_completions(is_first_completion);

CREATE INDEX IF NOT EXISTS idx_course_theme_completions_user_id ON public.course_theme_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_course_theme_completions_theme_id ON public.course_theme_completions(theme_id);
CREATE INDEX IF NOT EXISTS idx_course_theme_completions_category ON public.course_theme_completions(category_id);
CREATE INDEX IF NOT EXISTS idx_course_theme_completions_subcategory ON public.course_theme_completions(subcategory_id);

CREATE INDEX IF NOT EXISTS idx_course_completions_user_id ON public.course_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_course_completions_course_id ON public.course_completions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_completions_completion_time ON public.course_completions(first_completion_time);

-- RLS (Row Level Security) 設定
ALTER TABLE public.course_session_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_theme_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_completions ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "course_session_completions_user_policy" ON public.course_session_completions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "course_theme_completions_user_policy" ON public.course_theme_completions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "course_completions_user_policy" ON public.course_completions
    FOR ALL USING (auth.uid() = user_id);

-- コメント追加
COMMENT ON TABLE public.course_session_completions IS 'コース学習セッション完了記録';
COMMENT ON COLUMN public.course_session_completions.is_first_completion IS '初回完了フラグ（復習はfalse）';
COMMENT ON COLUMN public.course_session_completions.session_quiz_correct IS 'セッション最後のクイズに正解したかどうか';
COMMENT ON COLUMN public.course_session_completions.earned_xp IS 'そのセッション完了で獲得したXP';
COMMENT ON COLUMN public.course_session_completions.review_count IS '何回目の学習か（0=初回、1=1回目復習...）';

COMMENT ON TABLE public.course_theme_completions IS 'コース学習テーマ完了記録';
COMMENT ON COLUMN public.course_theme_completions.knowledge_cards_awarded IS '付与されたナレッジカード数';

COMMENT ON TABLE public.course_completions IS 'コース学習完了記録と統計';
COMMENT ON COLUMN public.course_completions.completion_bonus_xp IS 'コース完了ボーナスXP（デフォルト20XP）';
COMMENT ON COLUMN public.course_completions.badges_awarded IS '付与された修了証（バッジ）数';

-- Updated_at 自動更新トリガー（course_completions用）
CREATE TRIGGER update_course_completions_updated_at 
    BEFORE UPDATE ON public.course_completions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- コース学習XP設定値をxp_settingsテーブルに追加
INSERT INTO public.xp_settings (setting_key, setting_value, setting_description, setting_type) 
VALUES 
    -- ナレッジカード設定
    ('knowledge_cards_theme_completion', '1', 'テーマ完了時のナレッジカード付与数', 'number'),
    ('badges_course_completion', '1', 'コース完了時のバッジ付与数', 'number')
ON CONFLICT (setting_key) DO NOTHING;