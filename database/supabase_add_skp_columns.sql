-- ========================================
-- user_xp_stats_v2テーブルにSKPカラム追加
-- Supabase管理画面のSQL Editorで実行してください
-- ========================================

-- 1. SKP関連カラムを追加
ALTER TABLE public.user_xp_stats_v2 
ADD COLUMN IF NOT EXISTS total_skp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS quiz_skp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS course_skp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_skp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_skp INTEGER NOT NULL DEFAULT 0;

-- 2. インデックス追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_user_xp_stats_v2_total_skp ON public.user_xp_stats_v2(total_skp DESC);

-- 3. コメント追加
COMMENT ON COLUMN public.user_xp_stats_v2.total_skp IS '総SKP（quiz_skp + course_skp + bonus_skp + streak_skp）';
COMMENT ON COLUMN public.user_xp_stats_v2.quiz_skp IS 'クイズ学習で獲得したSKP';
COMMENT ON COLUMN public.user_xp_stats_v2.course_skp IS 'コース学習で獲得したSKP';
COMMENT ON COLUMN public.user_xp_stats_v2.bonus_skp IS 'ボーナスSKP（パーフェクト等）';
COMMENT ON COLUMN public.user_xp_stats_v2.streak_skp IS '継続学習ボーナスSKP';

-- 4. 既存のSKP取引データから統計を再計算・移行
-- 4-1. ユーザー別SKP集計用の一時ビュー作成
CREATE OR REPLACE VIEW temp_skp_summary AS
SELECT 
  user_id,
  SUM(CASE WHEN type = 'earned' THEN amount ELSE -amount END) as total_skp_earned,
  SUM(CASE 
    WHEN type = 'earned' AND (source ILIKE '%quiz%' OR source ILIKE '%challenge_quiz%') THEN amount 
    WHEN type = 'spent' AND (source ILIKE '%quiz%' OR source ILIKE '%challenge_quiz%') THEN -amount 
    ELSE 0 
  END) as quiz_skp_earned,
  SUM(CASE 
    WHEN type = 'earned' AND source ILIKE '%course%' THEN amount 
    WHEN type = 'spent' AND source ILIKE '%course%' THEN -amount 
    ELSE 0 
  END) as course_skp_earned,
  SUM(CASE 
    WHEN type = 'earned' AND (source ILIKE '%bonus%' OR source ILIKE '%perfect%') THEN amount 
    WHEN type = 'spent' AND (source ILIKE '%bonus%' OR source ILIKE '%perfect%') THEN -amount 
    ELSE 0 
  END) as bonus_skp_earned,
  SUM(CASE 
    WHEN type = 'earned' AND source ILIKE '%streak%' THEN amount 
    WHEN type = 'spent' AND source ILIKE '%streak%' THEN -amount 
    ELSE 0 
  END) as streak_skp_earned
FROM skp_transactions 
GROUP BY user_id;

-- 4-2. user_xp_stats_v2テーブルにSKPデータを移行
UPDATE public.user_xp_stats_v2 
SET 
  total_skp = COALESCE(temp_skp_summary.total_skp_earned, 0),
  quiz_skp = COALESCE(temp_skp_summary.quiz_skp_earned, 0),
  course_skp = COALESCE(temp_skp_summary.course_skp_earned, 0),
  bonus_skp = COALESCE(temp_skp_summary.bonus_skp_earned, 0),
  streak_skp = COALESCE(temp_skp_summary.streak_skp_earned, 0),
  updated_at = NOW()
FROM temp_skp_summary 
WHERE user_xp_stats_v2.user_id = temp_skp_summary.user_id;

-- 4-3. 一時ビュー削除
DROP VIEW IF EXISTS temp_skp_summary;

-- 5. 結果確認用クエリ（実行結果を確認してください）
SELECT 
  COUNT(*) as total_users,
  SUM(total_skp) as total_skp_all_users,
  COUNT(CASE WHEN total_skp > 0 THEN 1 END) as users_with_skp,
  MAX(total_skp) as max_skp,
  AVG(total_skp) as avg_skp
FROM public.user_xp_stats_v2;

-- 6. SKPがあるユーザーのサンプル確認
SELECT 
  user_id,
  total_skp,
  quiz_skp,
  course_skp,
  bonus_skp,
  streak_skp,
  total_xp
FROM public.user_xp_stats_v2 
WHERE total_skp > 0 
ORDER BY total_skp DESC 
LIMIT 5;

-- 完了メッセージ
SELECT 'SKP columns added successfully!' as status;