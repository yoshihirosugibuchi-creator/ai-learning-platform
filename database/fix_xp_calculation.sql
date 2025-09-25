-- XP計算関数の修正: multiplier値の誤った割り算を修正
-- 修正対象: calculate_question_xp関数

CREATE OR REPLACE FUNCTION calculate_question_xp(difficulty TEXT)
RETURNS INTEGER AS $$
DECLARE
    base_xp INTEGER;
    multiplier DECIMAL(3,2);
BEGIN
    base_xp := get_xp_setting('quiz_base_xp');
    
    CASE difficulty
        WHEN 'basic' THEN multiplier := get_xp_setting('difficulty_basic')::DECIMAL / 100; -- 設定値が100倍保存されている場合
        WHEN 'intermediate' THEN multiplier := get_xp_setting('difficulty_intermediate')::DECIMAL / 100; -- 設定値が100倍保存されている場合
        WHEN 'advanced' THEN multiplier := get_xp_setting('difficulty_advanced')::DECIMAL / 100; -- 設定値が100倍保存されている場合
        WHEN 'expert' THEN multiplier := get_xp_setting('difficulty_expert')::DECIMAL / 100; -- 設定値が100倍保存されている場合
        ELSE multiplier := 1.0; -- デフォルト
    END CASE;
    
    RETURN CAST(base_xp * multiplier AS INTEGER);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 代替案: 設定値が小数として保存されている場合の関数
CREATE OR REPLACE FUNCTION calculate_question_xp_alt(difficulty TEXT)
RETURNS INTEGER AS $$
DECLARE
    base_xp INTEGER;
    multiplier DECIMAL(3,2);
BEGIN
    base_xp := get_xp_setting('quiz_base_xp');
    
    CASE difficulty
        WHEN 'basic' THEN multiplier := get_xp_setting('difficulty_basic')::DECIMAL; -- 設定値をそのまま使用
        WHEN 'intermediate' THEN multiplier := get_xp_setting('difficulty_intermediate')::DECIMAL; -- 設定値をそのまま使用
        WHEN 'advanced' THEN multiplier := get_xp_setting('difficulty_advanced')::DECIMAL; -- 設定値をそのまま使用
        WHEN 'expert' THEN multiplier := get_xp_setting('difficulty_expert')::DECIMAL; -- 設定値をそのまま使用
        ELSE multiplier := 1.0; -- デフォルト
    END CASE;
    
    RETURN CAST(base_xp * multiplier AS INTEGER);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;