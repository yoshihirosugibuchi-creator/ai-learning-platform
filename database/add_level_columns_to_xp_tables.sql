-- レベル列をXP統計テーブルに追加
-- レベル制限機能やクエリ効率化のためのDB保存

-- 1. user_xp_stats にレベル列を追加
ALTER TABLE public.user_xp_stats 
ADD COLUMN IF NOT EXISTS current_level INTEGER NOT NULL DEFAULT 1;

-- 2. user_category_xp_stats にレベル列を追加
ALTER TABLE public.user_category_xp_stats 
ADD COLUMN IF NOT EXISTS current_level INTEGER NOT NULL DEFAULT 1;

-- 3. user_subcategory_xp_stats にレベル列を追加
ALTER TABLE public.user_subcategory_xp_stats 
ADD COLUMN IF NOT EXISTS current_level INTEGER NOT NULL DEFAULT 1;

-- 4. レベル用インデックス追加（レベル制限クエリの効率化）
CREATE INDEX IF NOT EXISTS idx_user_xp_stats_level ON public.user_xp_stats(current_level DESC);
CREATE INDEX IF NOT EXISTS idx_user_category_xp_stats_level ON public.user_category_xp_stats(current_level DESC);
CREATE INDEX IF NOT EXISTS idx_user_subcategory_xp_stats_level ON public.user_subcategory_xp_stats(current_level DESC);

-- 5. コメント追加
COMMENT ON COLUMN public.user_xp_stats.current_level IS 'ユーザーの現在の総合レベル（XPから計算して保存）';
COMMENT ON COLUMN public.user_category_xp_stats.current_level IS 'カテゴリー別の現在レベル（カテゴリーXPから計算して保存）';
COMMENT ON COLUMN public.user_subcategory_xp_stats.current_level IS 'サブカテゴリー別の現在レベル（サブカテゴリーXPから計算して保存）';

-- 6. 既存データの初期レベル計算（XP設定の閾値1000XPを仮定）
-- 注意: 実際のXP閾値は xp_level_skp_settings テーブルから取得すべき

-- 総合レベル更新
UPDATE public.user_xp_stats 
SET current_level = FLOOR(total_xp / 1000) + 1
WHERE current_level = 1 AND total_xp > 0;

-- カテゴリーレベル更新（仮に500XP/レベルとする）
UPDATE public.user_category_xp_stats 
SET current_level = FLOOR(total_xp / 500) + 1
WHERE current_level = 1 AND total_xp > 0;

-- サブカテゴリーレベル更新（仮に500XP/レベルとする）
UPDATE public.user_subcategory_xp_stats 
SET current_level = FLOOR(total_xp / 500) + 1
WHERE current_level = 1 AND total_xp > 0;

-- 7. 今後のXP更新時に自動でレベルも更新するための関数
CREATE OR REPLACE FUNCTION public.update_user_level_on_xp_change()
RETURNS TRIGGER AS $$
BEGIN
    -- XP設定テーブルから閾値を取得（エラーハンドリング付き）
    DECLARE
        overall_threshold INTEGER := 1000;  -- デフォルト値
        category_threshold INTEGER := 500;  -- デフォルト値
    BEGIN
        -- XP設定から実際の閾値を取得
        SELECT setting_value INTO overall_threshold 
        FROM xp_level_skp_settings 
        WHERE setting_category = 'level' AND setting_key = 'overall_threshold' AND is_active = true;
        
        SELECT setting_value INTO category_threshold 
        FROM xp_level_skp_settings 
        WHERE setting_category = 'level' AND setting_key = 'main_category_threshold' AND is_active = true;
        
        -- NULLの場合はデフォルト値を使用
        overall_threshold := COALESCE(overall_threshold, 1000);
        category_threshold := COALESCE(category_threshold, 500);
    EXCEPTION
        WHEN OTHERS THEN
            -- エラー時はデフォルト値を使用
            overall_threshold := 1000;
            category_threshold := 500;
    END;
    
    -- テーブルに応じてレベル計算
    IF TG_TABLE_NAME = 'user_xp_stats' THEN
        NEW.current_level := FLOOR(NEW.total_xp / overall_threshold) + 1;
    ELSIF TG_TABLE_NAME = 'user_category_xp_stats' THEN
        NEW.current_level := FLOOR(NEW.total_xp / category_threshold) + 1;
    ELSIF TG_TABLE_NAME = 'user_subcategory_xp_stats' THEN
        NEW.current_level := FLOOR(NEW.total_xp / category_threshold) + 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. トリガー作成（XP更新時に自動でレベルも更新）
CREATE TRIGGER trigger_update_user_xp_stats_level
    BEFORE INSERT OR UPDATE OF total_xp ON public.user_xp_stats
    FOR EACH ROW EXECUTE FUNCTION public.update_user_level_on_xp_change();

CREATE TRIGGER trigger_update_user_category_xp_stats_level
    BEFORE INSERT OR UPDATE OF total_xp ON public.user_category_xp_stats
    FOR EACH ROW EXECUTE FUNCTION public.update_user_level_on_xp_change();

CREATE TRIGGER trigger_update_user_subcategory_xp_stats_level
    BEFORE INSERT OR UPDATE OF total_xp ON public.user_subcategory_xp_stats
    FOR EACH ROW EXECUTE FUNCTION public.update_user_level_on_xp_change();