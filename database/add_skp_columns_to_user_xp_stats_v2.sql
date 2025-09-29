-- user_xp_stats_v2テーブルにSKP関連カラム追加
-- SKPシステムを統合XP統計に組み込む

-- 1. SKP関連カラムを追加
ALTER TABLE public.user_xp_stats_v2 
ADD COLUMN IF NOT EXISTS total_skp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS quiz_skp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS course_skp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_skp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_skp INTEGER NOT NULL DEFAULT 0;

-- 2. インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_user_xp_stats_v2_total_skp ON public.user_xp_stats_v2(total_skp DESC);

-- 3. 既存のSKP取引データから統計を再計算
WITH skp_summary AS (
  SELECT 
    user_id,
    SUM(CASE WHEN type = 'earned' THEN amount ELSE -amount END) as total_skp_earned,
    SUM(CASE 
      WHEN type = 'earned' AND source LIKE '%quiz%' THEN amount 
      WHEN type = 'spent' AND source LIKE '%quiz%' THEN -amount 
      ELSE 0 
    END) as quiz_skp_earned,
    SUM(CASE 
      WHEN type = 'earned' AND source LIKE '%course%' THEN amount 
      WHEN type = 'spent' AND source LIKE '%course%' THEN -amount 
      ELSE 0 
    END) as course_skp_earned,
    SUM(CASE 
      WHEN type = 'earned' AND source LIKE '%bonus%' THEN amount 
      WHEN type = 'spent' AND source LIKE '%bonus%' THEN -amount 
      ELSE 0 
    END) as bonus_skp_earned,
    SUM(CASE 
      WHEN type = 'earned' AND source LIKE '%streak%' THEN amount 
      WHEN type = 'spent' AND source LIKE '%streak%' THEN -amount 
      ELSE 0 
    END) as streak_skp_earned
  FROM skp_transactions 
  GROUP BY user_id
)
UPDATE public.user_xp_stats_v2 
SET 
  total_skp = COALESCE(skp_summary.total_skp_earned, 0),
  quiz_skp = COALESCE(skp_summary.quiz_skp_earned, 0),
  course_skp = COALESCE(skp_summary.course_skp_earned, 0),
  bonus_skp = COALESCE(skp_summary.bonus_skp_earned, 0),
  streak_skp = COALESCE(skp_summary.streak_skp_earned, 0),
  updated_at = NOW()
FROM skp_summary 
WHERE user_xp_stats_v2.user_id = skp_summary.user_id;

-- 4. コメント追加
COMMENT ON COLUMN public.user_xp_stats_v2.total_skp IS '総SKP（quiz_skp + course_skp + bonus_skp + streak_skp）';
COMMENT ON COLUMN public.user_xp_stats_v2.quiz_skp IS 'クイズ学習で獲得したSKP';
COMMENT ON COLUMN public.user_xp_stats_v2.course_skp IS 'コース学習で獲得したSKP';
COMMENT ON COLUMN public.user_xp_stats_v2.bonus_skp IS 'ボーナスSKP（パーフェクト等）';
COMMENT ON COLUMN public.user_xp_stats_v2.streak_skp IS '継続学習ボーナスSKP';

-- 5. 成功メッセージ
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count 
  FROM public.user_xp_stats_v2 
  WHERE total_skp > 0;
  
  RAISE NOTICE 'SKP columns added successfully. % users have SKP data migrated.', updated_count;
END $$;