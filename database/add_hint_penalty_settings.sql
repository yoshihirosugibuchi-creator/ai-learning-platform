-- xp_level_skp_settings テーブル修正
-- 誤って追加したヒントペナルティカラムを削除し、正しいレコード方式に変更

-- Step 1: 追加したカラムを削除
ALTER TABLE public.xp_level_skp_settings 
DROP COLUMN IF EXISTS hint_level1_penalty_percent,
DROP COLUMN IF EXISTS hint_level2_penalty_percent,
DROP COLUMN IF EXISTS hint_level3_penalty_percent;

-- Step 2: ヒント設定レコードを追加（レコード方式）
INSERT INTO public.xp_level_skp_settings (setting_category, setting_key, setting_value, setting_description, is_active) VALUES
('hint_penalty', 'level1_percent', 5, 'ヒントLevel1使用時のXP減額率(%)', true),
('hint_penalty', 'level2_percent', 15, 'ヒントLevel2使用時のXP減額率(%)', true),
('hint_penalty', 'level3_percent', 30, 'ヒントLevel3使用時のXP減額率(%)', true);

-- Step 3: 設定の確認
SELECT setting_category, setting_key, setting_value, setting_description 
FROM public.xp_level_skp_settings 
WHERE setting_category = 'hint_penalty'
ORDER BY setting_key;

-- コメント追加
COMMENT ON TABLE public.xp_level_skp_settings IS '統合XP/Level/SKP設定管理テーブル - 全ての報酬・レベル・ヒント設定を一元管理';