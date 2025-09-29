-- カテゴリー・サブカテゴリー別XP統計テーブル v2版
-- 作成日: 2025-09-28
-- 目的: トリガーによる問題を回避し、アプリケーション側でレベル計算を行う

-- 1. カテゴリー別XP統計テーブル v2 (トリガーなし)
CREATE TABLE IF NOT EXISTS public.user_category_xp_stats_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL,
    
    -- カテゴリーXP統計
    total_xp INTEGER NOT NULL DEFAULT 0, -- カテゴリー総XP
    quiz_xp INTEGER NOT NULL DEFAULT 0, -- クイズから獲得
    course_xp INTEGER NOT NULL DEFAULT 0, -- コース学習から獲得
    current_level INTEGER NOT NULL DEFAULT 1, -- 現在レベル（アプリケーション側で計算）
    
    -- クイズ統計
    quiz_sessions_completed INTEGER NOT NULL DEFAULT 0,
    quiz_questions_answered INTEGER NOT NULL DEFAULT 0,
    quiz_questions_correct INTEGER NOT NULL DEFAULT 0,
    quiz_average_accuracy DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    
    -- コース学習統計
    course_sessions_completed INTEGER NOT NULL DEFAULT 0,
    course_themes_completed INTEGER NOT NULL DEFAULT 0,
    course_completions INTEGER NOT NULL DEFAULT 0,
    
    -- 日時管理
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, category_id)
);

-- 2. サブカテゴリー別XP統計テーブル v2 (トリガーなし)
CREATE TABLE IF NOT EXISTS public.user_subcategory_xp_stats_v2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL,
    subcategory_id TEXT NOT NULL,
    
    -- サブカテゴリーXP統計
    total_xp INTEGER NOT NULL DEFAULT 0, -- サブカテゴリー総XP
    quiz_xp INTEGER NOT NULL DEFAULT 0, -- クイズから獲得
    course_xp INTEGER NOT NULL DEFAULT 0, -- コース学習から獲得
    current_level INTEGER NOT NULL DEFAULT 1, -- 現在レベル（アプリケーション側で計算）
    
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
    
    -- 日時管理
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, category_id, subcategory_id)
);

-- インデックス作成（パフォーマンス向上）
-- user_category_xp_stats_v2
CREATE INDEX IF NOT EXISTS idx_user_category_xp_stats_v2_user_id ON public.user_category_xp_stats_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_user_category_xp_stats_v2_category_id ON public.user_category_xp_stats_v2(category_id);
CREATE INDEX IF NOT EXISTS idx_user_category_xp_stats_v2_total_xp ON public.user_category_xp_stats_v2(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_category_xp_stats_v2_level ON public.user_category_xp_stats_v2(current_level DESC);

-- user_subcategory_xp_stats_v2
CREATE INDEX IF NOT EXISTS idx_user_subcategory_xp_stats_v2_user_id ON public.user_subcategory_xp_stats_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subcategory_xp_stats_v2_category_id ON public.user_subcategory_xp_stats_v2(category_id);
CREATE INDEX IF NOT EXISTS idx_user_subcategory_xp_stats_v2_subcategory_id ON public.user_subcategory_xp_stats_v2(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_user_subcategory_xp_stats_v2_total_xp ON public.user_subcategory_xp_stats_v2(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_subcategory_xp_stats_v2_level ON public.user_subcategory_xp_stats_v2(current_level DESC);

-- RLS (Row Level Security) 設定
ALTER TABLE public.user_category_xp_stats_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subcategory_xp_stats_v2 ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみアクセス可能
CREATE POLICY "user_category_xp_stats_v2_user_policy" ON public.user_category_xp_stats_v2
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_subcategory_xp_stats_v2_user_policy" ON public.user_subcategory_xp_stats_v2
    FOR ALL USING (auth.uid() = user_id);

-- updated_at 自動更新関数（トリガーは使わずに手動更新）
CREATE OR REPLACE FUNCTION public.update_updated_at_column_v2()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 注意: トリガーは作成しない！アプリケーション側でupdated_atを手動設定
-- 過去のトリガー問題を回避するため

-- コメント追加
COMMENT ON TABLE public.user_category_xp_stats_v2 IS 'ユーザーのカテゴリー別XP統計 v2 (トリガーなし)';
COMMENT ON COLUMN public.user_category_xp_stats_v2.current_level IS 'アプリケーション側で計算された現在レベル';
COMMENT ON COLUMN public.user_category_xp_stats_v2.total_xp IS 'カテゴリー総XP（サブカテゴリーXP含む）';

COMMENT ON TABLE public.user_subcategory_xp_stats_v2 IS 'ユーザーのサブカテゴリー別XP統計 v2 (トリガーなし)';
COMMENT ON COLUMN public.user_subcategory_xp_stats_v2.current_level IS 'アプリケーション側で計算された現在レベル';
COMMENT ON COLUMN public.user_subcategory_xp_stats_v2.total_xp IS 'サブカテゴリー総XP';

-- 作成確認用ログ
-- 実行後にSupabaseで以下を確認：
-- SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%xp_stats_v2%';