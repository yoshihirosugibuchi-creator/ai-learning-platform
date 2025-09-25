-- 統合XPシステム: 集計テーブル群
-- 作成日: 2025-09-25

-- 1. ユーザー全体XP統計テーブル
CREATE TABLE IF NOT EXISTS public.user_xp_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- 全体統計
    total_xp INTEGER NOT NULL DEFAULT 0, -- ユーザー全体の総XP
    quiz_xp INTEGER NOT NULL DEFAULT 0, -- クイズから獲得したXP（ボーナス含む）
    course_xp INTEGER NOT NULL DEFAULT 0, -- コース学習から獲得したXP（ボーナス含む）
    bonus_xp INTEGER NOT NULL DEFAULT 0, -- ボーナスXPの合計
    
    -- クイズ統計
    quiz_sessions_completed INTEGER NOT NULL DEFAULT 0, -- 完了したクイズセッション数
    quiz_questions_answered INTEGER NOT NULL DEFAULT 0, -- 回答した問題数
    quiz_questions_correct INTEGER NOT NULL DEFAULT 0, -- 正解した問題数
    quiz_average_accuracy DECIMAL(5,2) NOT NULL DEFAULT 0.0, -- 平均正答率
    quiz_perfect_sessions INTEGER NOT NULL DEFAULT 0, -- 100%正答セッション数
    quiz_80plus_sessions INTEGER NOT NULL DEFAULT 0, -- 80%以上正答セッション数
    
    -- コース学習統計
    course_sessions_completed INTEGER NOT NULL DEFAULT 0, -- 完了したセッション数
    course_themes_completed INTEGER NOT NULL DEFAULT 0, -- 完了したテーマ数
    course_completions INTEGER NOT NULL DEFAULT 0, -- 完了したコース数
    
    -- 報酬統計
    wisdom_cards_total INTEGER NOT NULL DEFAULT 0, -- 獲得した格言カード総数
    knowledge_cards_total INTEGER NOT NULL DEFAULT 0, -- 獲得したナレッジカード総数
    badges_total INTEGER NOT NULL DEFAULT 0, -- 獲得したバッジ総数
    
    -- 最終更新情報
    last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. カテゴリー別XP統計テーブル
CREATE TABLE IF NOT EXISTS public.user_category_xp_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL,
    
    -- カテゴリーXP統計
    total_xp INTEGER NOT NULL DEFAULT 0, -- カテゴリー総XP（サブカテゴリー合計+category_level）
    quiz_xp INTEGER NOT NULL DEFAULT 0, -- クイズから獲得
    course_xp INTEGER NOT NULL DEFAULT 0, -- コース学習から獲得
    
    -- クイズ統計
    quiz_sessions_completed INTEGER NOT NULL DEFAULT 0,
    quiz_questions_answered INTEGER NOT NULL DEFAULT 0,
    quiz_questions_correct INTEGER NOT NULL DEFAULT 0,
    quiz_average_accuracy DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    
    -- コース学習統計
    course_sessions_completed INTEGER NOT NULL DEFAULT 0,
    course_themes_completed INTEGER NOT NULL DEFAULT 0,
    course_completions INTEGER NOT NULL DEFAULT 0,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, category_id)
);

-- 3. サブカテゴリー別XP統計テーブル
CREATE TABLE IF NOT EXISTS public.user_subcategory_xp_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL,
    subcategory_id TEXT NOT NULL,
    
    -- サブカテゴリーXP統計
    total_xp INTEGER NOT NULL DEFAULT 0, -- サブカテゴリー総XP
    quiz_xp INTEGER NOT NULL DEFAULT 0, -- クイズから獲得
    course_xp INTEGER NOT NULL DEFAULT 0, -- コース学習から獲得
    
    -- クイズ統計
    quiz_sessions_completed INTEGER NOT NULL DEFAULT 0,
    quiz_questions_answered INTEGER NOT NULL DEFAULT 0,
    quiz_questions_correct INTEGER NOT NULL DEFAULT 0,
    quiz_average_accuracy DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    quiz_perfect_sessions INTEGER NOT NULL DEFAULT 0,
    quiz_80plus_sessions INTEGER NOT NULL DEFAULT 0,
    
    -- コース学習統計
    course_sessions_completed INTEGER NOT NULL DEFAULT 0,
    course_themes_completed INTEGER NOT NULL DEFAULT 0,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, category_id, subcategory_id)
);

-- 4. 日別XP獲得記録テーブル（学習継続の分析用）
CREATE TABLE IF NOT EXISTS public.daily_xp_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL, -- 日付
    
    -- 日別XP統計
    total_xp_earned INTEGER NOT NULL DEFAULT 0, -- その日に獲得したXP
    quiz_xp_earned INTEGER NOT NULL DEFAULT 0, -- クイズXP
    course_xp_earned INTEGER NOT NULL DEFAULT 0, -- コース学習XP
    bonus_xp_earned INTEGER NOT NULL DEFAULT 0, -- ボーナスXP
    
    -- 活動統計
    quiz_sessions INTEGER NOT NULL DEFAULT 0, -- その日のクイズセッション数
    course_sessions INTEGER NOT NULL DEFAULT 0, -- その日のコース学習セッション数
    study_time_minutes INTEGER NOT NULL DEFAULT 0, -- 推定学習時間（分）
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- インデックス作成
-- user_xp_stats (PRIMARY KEYのみなので追加不要)

-- user_category_xp_stats
CREATE INDEX IF NOT EXISTS idx_user_category_xp_stats_user_id ON public.user_category_xp_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_category_xp_stats_category_id ON public.user_category_xp_stats(category_id);
CREATE INDEX IF NOT EXISTS idx_user_category_xp_stats_total_xp ON public.user_category_xp_stats(total_xp DESC);

-- user_subcategory_xp_stats
CREATE INDEX IF NOT EXISTS idx_user_subcategory_xp_stats_user_id ON public.user_subcategory_xp_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subcategory_xp_stats_category_id ON public.user_subcategory_xp_stats(category_id);
CREATE INDEX IF NOT EXISTS idx_user_subcategory_xp_stats_subcategory_id ON public.user_subcategory_xp_stats(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_user_subcategory_xp_stats_total_xp ON public.user_subcategory_xp_stats(total_xp DESC);

-- daily_xp_records
CREATE INDEX IF NOT EXISTS idx_daily_xp_records_user_id ON public.daily_xp_records(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_xp_records_date ON public.daily_xp_records(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_xp_records_user_date ON public.daily_xp_records(user_id, date DESC);

-- RLS (Row Level Security) 設定
ALTER TABLE public.user_xp_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_category_xp_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subcategory_xp_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_xp_records ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "user_xp_stats_user_policy" ON public.user_xp_stats
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_category_xp_stats_user_policy" ON public.user_category_xp_stats
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_subcategory_xp_stats_user_policy" ON public.user_subcategory_xp_stats
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "daily_xp_records_user_policy" ON public.daily_xp_records
    FOR ALL USING (auth.uid() = user_id);

-- コメント追加
COMMENT ON TABLE public.user_xp_stats IS 'ユーザー全体のXP統計';
COMMENT ON COLUMN public.user_xp_stats.bonus_xp IS 'クイズ80%以上ボーナス・コース完了ボーナスの合計';
COMMENT ON COLUMN public.user_xp_stats.quiz_perfect_sessions IS '100%正答率のクイズセッション数';
COMMENT ON COLUMN public.user_xp_stats.quiz_80plus_sessions IS '80%以上正答率のクイズセッション数';

COMMENT ON TABLE public.user_category_xp_stats IS 'ユーザーのカテゴリー別XP統計';
COMMENT ON COLUMN public.user_category_xp_stats.total_xp IS 'サブカテゴリーXP合計 + category_levelのXP';

COMMENT ON TABLE public.user_subcategory_xp_stats IS 'ユーザーのサブカテゴリー別XP統計';
COMMENT ON COLUMN public.user_subcategory_xp_stats.total_xp IS 'そのサブカテゴリーで獲得した総XP（category_level除く）';

COMMENT ON TABLE public.daily_xp_records IS '日別XP獲得記録（学習継続分析用）';
COMMENT ON COLUMN public.daily_xp_records.study_time_minutes IS '推定学習時間（問題回答時間・セッション数から算出）';

-- Updated_at 自動更新トリガー
CREATE TRIGGER update_user_xp_stats_updated_at 
    BEFORE UPDATE ON public.user_xp_stats
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_category_xp_stats_updated_at 
    BEFORE UPDATE ON public.user_category_xp_stats
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_subcategory_xp_stats_updated_at 
    BEFORE UPDATE ON public.user_subcategory_xp_stats
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();