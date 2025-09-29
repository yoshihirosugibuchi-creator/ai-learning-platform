-- トリガーなしの新しいXP統計テーブル作成
-- 既存の問題のあるトリガーを回避するためのクリーンなテーブル

-- 1. 新しいXP統計テーブル作成（トリガーなし）
CREATE TABLE IF NOT EXISTS public.user_xp_stats_v2 (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  quiz_xp INTEGER NOT NULL DEFAULT 0,
  course_xp INTEGER NOT NULL DEFAULT 0,
  bonus_xp INTEGER NOT NULL DEFAULT 0,
  quiz_sessions_completed INTEGER NOT NULL DEFAULT 0,
  course_sessions_completed INTEGER NOT NULL DEFAULT 0,
  quiz_questions_answered INTEGER NOT NULL DEFAULT 0,
  quiz_questions_correct INTEGER NOT NULL DEFAULT 0,
  quiz_average_accuracy DECIMAL(5,2) DEFAULT 0.00,
  wisdom_cards_total INTEGER NOT NULL DEFAULT 0,
  knowledge_cards_total INTEGER NOT NULL DEFAULT 0,
  badges_total INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_user_xp_stats_v2_user_id ON public.user_xp_stats_v2(user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_stats_v2_total_xp ON public.user_xp_stats_v2(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_stats_v2_level ON public.user_xp_stats_v2(current_level DESC);
CREATE INDEX IF NOT EXISTS idx_user_xp_stats_v2_activity ON public.user_xp_stats_v2(last_activity_at DESC);

-- 3. RLS（Row Level Security）有効化
ALTER TABLE public.user_xp_stats_v2 ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシー作成（ユーザーは自分のデータのみアクセス可能）
CREATE POLICY "Users can view their own XP stats" ON public.user_xp_stats_v2
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own XP stats" ON public.user_xp_stats_v2
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own XP stats" ON public.user_xp_stats_v2
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 5. 既存データのマイグレーション
INSERT INTO public.user_xp_stats_v2 (
  user_id, total_xp, quiz_xp, course_xp, bonus_xp,
  quiz_sessions_completed, course_sessions_completed,
  quiz_questions_answered, quiz_questions_correct, quiz_average_accuracy,
  wisdom_cards_total, knowledge_cards_total, badges_total,
  current_level, last_activity_at, updated_at
)
SELECT 
  user_id, total_xp, quiz_xp, course_xp, 
  COALESCE(bonus_xp, 0) as bonus_xp,
  quiz_sessions_completed, course_sessions_completed,
  quiz_questions_answered, quiz_questions_correct, quiz_average_accuracy,
  wisdom_cards_total, knowledge_cards_total, badges_total,
  COALESCE(current_level, 1) as current_level,
  last_activity_at, 
  COALESCE(updated_at, NOW()) as updated_at
FROM public.user_xp_stats
ON CONFLICT (user_id) DO NOTHING;

-- 6. コメント追加
COMMENT ON TABLE public.user_xp_stats_v2 IS 'ユーザーXP統計テーブル v2 - トリガーレス・アプリケーション管理';
COMMENT ON COLUMN public.user_xp_stats_v2.total_xp IS '総XP（quiz_xp + course_xp）';
COMMENT ON COLUMN public.user_xp_stats_v2.current_level IS 'アプリケーション計算による現在レベル';
COMMENT ON COLUMN public.user_xp_stats_v2.quiz_average_accuracy IS 'クイズ平均正答率（%）';

-- 7. 成功メッセージ
DO $$
BEGIN
  RAISE NOTICE 'user_xp_stats_v2 table created successfully with % records migrated', 
    (SELECT COUNT(*) FROM public.user_xp_stats_v2);
END $$;