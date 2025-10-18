-- user_subcategory_xp_stats_v2構造修正 - クイズセッション情報をuser_xp_stats_v2に移動
-- 実行日：2025年10月17日

-- 📊 Step 1: user_xp_stats_v2にクイズセッション統計カラムを追加
ALTER TABLE user_xp_stats_v2 
ADD COLUMN IF NOT EXISTS quiz_perfect_sessions integer DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS quiz_80plus_sessions integer DEFAULT 0 NOT NULL;

-- 📊 Step 2: user_subcategory_xp_stats_v2から不要なクイズセッションカラムを削除
ALTER TABLE user_subcategory_xp_stats_v2 
DROP COLUMN IF EXISTS quiz_perfect_sessions,
DROP COLUMN IF EXISTS quiz_80plus_sessions;

-- 🔍 検証: テーブル構造変更確認
SELECT 
  '=== user_xp_stats_v2構造確認（quiz_perfect_sessions/quiz_80plus_sessions追加） ==='::text,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_xp_stats_v2' 
  AND table_schema = 'public'
  AND column_name IN ('quiz_perfect_sessions', 'quiz_80plus_sessions')
ORDER BY column_name;

-- user_subcategory_xp_stats_v2の現在の構造確認
SELECT 
  '=== user_subcategory_xp_stats_v2構造確認 ==='::text,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_subcategory_xp_stats_v2' 
  AND table_schema = 'public'
ORDER BY ordinal_position;