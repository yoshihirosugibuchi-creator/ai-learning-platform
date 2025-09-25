-- XP計算バグ修正: multiplier値の誤った100での割り算を削除
-- 修正日: 2025-09-25

CREATE OR REPLACE FUNCTION calculate_question_xp(difficulty TEXT)
RETURNS INTEGER AS $$
DECLARE
    base_xp INTEGER;
    multiplier DECIMAL(3,2);
BEGIN
    base_xp := get_xp_setting('quiz_base_xp');
    
    CASE difficulty
        WHEN 'basic' THEN multiplier := get_xp_setting('difficulty_basic')::DECIMAL;
        WHEN 'intermediate' THEN multiplier := get_xp_setting('difficulty_intermediate')::DECIMAL;
        WHEN 'advanced' THEN multiplier := get_xp_setting('difficulty_advanced')::DECIMAL;
        WHEN 'expert' THEN multiplier := get_xp_setting('difficulty_expert')::DECIMAL;
        ELSE multiplier := 1.0; -- デフォルト
    END CASE;
    
    RETURN CAST(base_xp * multiplier AS INTEGER);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;