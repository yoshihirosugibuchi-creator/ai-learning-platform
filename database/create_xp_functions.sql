-- 統合XPシステム: XP計算・更新関数群
-- 作成日: 2025-09-25

-- 1. 設定値取得関数
CREATE OR REPLACE FUNCTION get_xp_setting(setting_key TEXT) 
RETURNS INTEGER AS $$
DECLARE
    setting_value INTEGER;
BEGIN
    SELECT CAST(xp_settings.setting_value AS INTEGER) 
    INTO setting_value
    FROM public.xp_settings 
    WHERE xp_settings.setting_key = get_xp_setting.setting_key;
    
    RETURN COALESCE(setting_value, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 難易度別XP計算関数
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

-- 3. クイズセッション完了時の統計更新関数
CREATE OR REPLACE FUNCTION update_quiz_session_stats(
    p_user_id UUID,
    p_session_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_session quiz_sessions%ROWTYPE;
    v_answers RECORD;
    v_bonus_xp INTEGER := 0;
    v_wisdom_cards INTEGER := 0;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- セッション情報取得
    SELECT * INTO v_session FROM public.quiz_sessions WHERE id = p_session_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Quiz session not found: %', p_session_id;
    END IF;
    
    -- ボーナスXP計算
    IF v_session.accuracy_rate >= 100.0 THEN
        v_bonus_xp := get_xp_setting('quiz_bonus_100_percent');
        v_wisdom_cards := get_xp_setting('wisdom_cards_100_percent');
    ELSIF v_session.accuracy_rate >= 80.0 THEN
        v_bonus_xp := get_xp_setting('quiz_bonus_80_percent');
        v_wisdom_cards := get_xp_setting('wisdom_cards_80_percent');
    END IF;
    
    -- セッション記録更新
    UPDATE public.quiz_sessions 
    SET 
        bonus_xp = v_bonus_xp,
        wisdom_cards_awarded = v_wisdom_cards,
        total_xp = (SELECT COALESCE(SUM(earned_xp), 0) FROM public.quiz_answers WHERE quiz_session_id = p_session_id) + v_bonus_xp,
        status = 'completed',
        session_end_time = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;
    
    -- 各回答のカテゴリー別統計更新
    FOR v_answers IN 
        SELECT 
            category_id,
            subcategory_id,
            COUNT(*) as question_count,
            COUNT(CASE WHEN is_correct THEN 1 END) as correct_count,
            SUM(earned_xp) as total_earned_xp
        FROM public.quiz_answers 
        WHERE quiz_session_id = p_session_id
        GROUP BY category_id, subcategory_id
    LOOP
        -- サブカテゴリー統計更新（category_levelは除外）
        IF v_answers.subcategory_id != 'category_level' THEN
            INSERT INTO public.user_subcategory_xp_stats (
                user_id, category_id, subcategory_id, 
                total_xp, quiz_xp,
                quiz_sessions_completed, quiz_questions_answered, quiz_questions_correct,
                quiz_average_accuracy,
                quiz_perfect_sessions, quiz_80plus_sessions
            ) VALUES (
                p_user_id, v_answers.category_id, v_answers.subcategory_id,
                v_answers.total_earned_xp, v_answers.total_earned_xp,
                1, v_answers.question_count, v_answers.correct_count,
                ROUND(v_answers.correct_count::DECIMAL / v_answers.question_count * 100, 2),
                CASE WHEN v_session.accuracy_rate >= 100.0 THEN 1 ELSE 0 END,
                CASE WHEN v_session.accuracy_rate >= 80.0 THEN 1 ELSE 0 END
            )
            ON CONFLICT (user_id, category_id, subcategory_id) DO UPDATE SET
                total_xp = user_subcategory_xp_stats.total_xp + v_answers.total_earned_xp,
                quiz_xp = user_subcategory_xp_stats.quiz_xp + v_answers.total_earned_xp,
                quiz_sessions_completed = user_subcategory_xp_stats.quiz_sessions_completed + 1,
                quiz_questions_answered = user_subcategory_xp_stats.quiz_questions_answered + v_answers.question_count,
                quiz_questions_correct = user_subcategory_xp_stats.quiz_questions_correct + v_answers.correct_count,
                quiz_average_accuracy = ROUND(
                    user_subcategory_xp_stats.quiz_questions_correct::DECIMAL + v_answers.correct_count
                    / (user_subcategory_xp_stats.quiz_questions_answered + v_answers.question_count) * 100, 2
                ),
                quiz_perfect_sessions = user_subcategory_xp_stats.quiz_perfect_sessions + CASE WHEN v_session.accuracy_rate >= 100.0 THEN 1 ELSE 0 END,
                quiz_80plus_sessions = user_subcategory_xp_stats.quiz_80plus_sessions + CASE WHEN v_session.accuracy_rate >= 80.0 THEN 1 ELSE 0 END,
                updated_at = NOW();
        END IF;
        
        -- カテゴリー統計更新
        INSERT INTO public.user_category_xp_stats (
            user_id, category_id,
            total_xp, quiz_xp,
            quiz_sessions_completed, quiz_questions_answered, quiz_questions_correct,
            quiz_average_accuracy
        ) VALUES (
            p_user_id, v_answers.category_id,
            v_answers.total_earned_xp, v_answers.total_earned_xp,
            1, v_answers.question_count, v_answers.correct_count,
            ROUND(v_answers.correct_count::DECIMAL / v_answers.question_count * 100, 2)
        )
        ON CONFLICT (user_id, category_id) DO UPDATE SET
            total_xp = user_category_xp_stats.total_xp + v_answers.total_earned_xp,
            quiz_xp = user_category_xp_stats.quiz_xp + v_answers.total_earned_xp,
            quiz_sessions_completed = user_category_xp_stats.quiz_sessions_completed + 1,
            quiz_questions_answered = user_category_xp_stats.quiz_questions_answered + v_answers.question_count,
            quiz_questions_correct = user_category_xp_stats.quiz_questions_correct + v_answers.correct_count,
            quiz_average_accuracy = ROUND(
                (user_category_xp_stats.quiz_questions_correct::DECIMAL + v_answers.correct_count)
                / (user_category_xp_stats.quiz_questions_answered + v_answers.question_count) * 100, 2
            ),
            updated_at = NOW();
    END LOOP;
    
    -- ユーザー全体統計更新
    INSERT INTO public.user_xp_stats (
        user_id,
        total_xp, quiz_xp, bonus_xp,
        quiz_sessions_completed,
        quiz_questions_answered, quiz_questions_correct,
        quiz_average_accuracy,
        quiz_perfect_sessions, quiz_80plus_sessions,
        wisdom_cards_total,
        last_activity_at
    ) VALUES (
        p_user_id,
        v_session.total_xp, v_session.total_xp, v_bonus_xp,
        1,
        v_session.total_questions, v_session.correct_answers,
        v_session.accuracy_rate,
        CASE WHEN v_session.accuracy_rate >= 100.0 THEN 1 ELSE 0 END,
        CASE WHEN v_session.accuracy_rate >= 80.0 THEN 1 ELSE 0 END,
        v_wisdom_cards,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_xp = user_xp_stats.total_xp + v_session.total_xp,
        quiz_xp = user_xp_stats.quiz_xp + v_session.total_xp,
        bonus_xp = user_xp_stats.bonus_xp + v_bonus_xp,
        quiz_sessions_completed = user_xp_stats.quiz_sessions_completed + 1,
        quiz_questions_answered = user_xp_stats.quiz_questions_answered + v_session.total_questions,
        quiz_questions_correct = user_xp_stats.quiz_questions_correct + v_session.correct_answers,
        quiz_average_accuracy = ROUND(
            user_xp_stats.quiz_questions_correct::DECIMAL + v_session.correct_answers
            / (user_xp_stats.quiz_questions_answered + v_session.total_questions) * 100, 2
        ),
        quiz_perfect_sessions = user_xp_stats.quiz_perfect_sessions + CASE WHEN v_session.accuracy_rate >= 100.0 THEN 1 ELSE 0 END,
        quiz_80plus_sessions = user_xp_stats.quiz_80plus_sessions + CASE WHEN v_session.accuracy_rate >= 80.0 THEN 1 ELSE 0 END,
        wisdom_cards_total = user_xp_stats.wisdom_cards_total + v_wisdom_cards,
        last_activity_at = NOW(),
        updated_at = NOW();
    
    -- 日別記録更新
    INSERT INTO public.daily_xp_records (
        user_id, date,
        total_xp_earned, quiz_xp_earned, bonus_xp_earned,
        quiz_sessions,
        study_time_minutes
    ) VALUES (
        p_user_id, v_today,
        v_session.total_xp, v_session.total_xp - v_bonus_xp, v_bonus_xp,
        1,
        -- 10問 × 平均90秒/問 = 15分として概算
        15
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        total_xp_earned = daily_xp_records.total_xp_earned + v_session.total_xp,
        quiz_xp_earned = daily_xp_records.quiz_xp_earned + (v_session.total_xp - v_bonus_xp),
        bonus_xp_earned = daily_xp_records.bonus_xp_earned + v_bonus_xp,
        quiz_sessions = daily_xp_records.quiz_sessions + 1,
        study_time_minutes = daily_xp_records.study_time_minutes + 15;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. コース学習セッション完了時の統計更新関数
CREATE OR REPLACE FUNCTION update_course_session_stats(
    p_user_id UUID,
    p_session_id TEXT,
    p_course_id TEXT,
    p_theme_id TEXT,
    p_genre_id TEXT,
    p_category_id TEXT,
    p_subcategory_id TEXT,
    p_quiz_correct BOOLEAN,
    p_is_first_completion BOOLEAN DEFAULT true
)
RETURNS VOID AS $$
DECLARE
    v_earned_xp INTEGER := 0;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- 初回完了かつクイズ正解の場合のみXP付与
    IF p_is_first_completion AND p_quiz_correct THEN
        v_earned_xp := get_xp_setting('course_base_xp');
    END IF;
    
    -- セッション完了記録
    INSERT INTO public.course_session_completions (
        user_id, session_id, course_id, theme_id, genre_id,
        category_id, subcategory_id,
        is_first_completion, session_quiz_correct, earned_xp
    ) VALUES (
        p_user_id, p_session_id, p_course_id, p_theme_id, p_genre_id,
        p_category_id, p_subcategory_id,
        p_is_first_completion, p_quiz_correct, v_earned_xp
    );
    
    -- XP付与がある場合の統計更新
    IF v_earned_xp > 0 THEN
        -- サブカテゴリー統計更新
        INSERT INTO public.user_subcategory_xp_stats (
            user_id, category_id, subcategory_id,
            total_xp, course_xp,
            course_sessions_completed
        ) VALUES (
            p_user_id, p_category_id, p_subcategory_id,
            v_earned_xp, v_earned_xp,
            1
        )
        ON CONFLICT (user_id, category_id, subcategory_id) DO UPDATE SET
            total_xp = user_subcategory_xp_stats.total_xp + v_earned_xp,
            course_xp = user_subcategory_xp_stats.course_xp + v_earned_xp,
            course_sessions_completed = user_subcategory_xp_stats.course_sessions_completed + 1,
            updated_at = NOW();
        
        -- カテゴリー統計更新
        INSERT INTO public.user_category_xp_stats (
            user_id, category_id,
            total_xp, course_xp,
            course_sessions_completed
        ) VALUES (
            p_user_id, p_category_id,
            v_earned_xp, v_earned_xp,
            1
        )
        ON CONFLICT (user_id, category_id) DO UPDATE SET
            total_xp = user_category_xp_stats.total_xp + v_earned_xp,
            course_xp = user_category_xp_stats.course_xp + v_earned_xp,
            course_sessions_completed = user_category_xp_stats.course_sessions_completed + 1,
            updated_at = NOW();
        
        -- ユーザー全体統計更新
        INSERT INTO public.user_xp_stats (
            user_id,
            total_xp, course_xp,
            course_sessions_completed,
            last_activity_at
        ) VALUES (
            p_user_id,
            v_earned_xp, v_earned_xp,
            1,
            NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            total_xp = user_xp_stats.total_xp + v_earned_xp,
            course_xp = user_xp_stats.course_xp + v_earned_xp,
            course_sessions_completed = user_xp_stats.course_sessions_completed + 1,
            last_activity_at = NOW(),
            updated_at = NOW();
        
        -- 日別記録更新
        INSERT INTO public.daily_xp_records (
            user_id, date,
            total_xp_earned, course_xp_earned,
            course_sessions,
            study_time_minutes
        ) VALUES (
            p_user_id, v_today,
            v_earned_xp, v_earned_xp,
            1,
            -- 1セッション平均20分として概算
            20
        )
        ON CONFLICT (user_id, date) DO UPDATE SET
            total_xp_earned = daily_xp_records.total_xp_earned + v_earned_xp,
            course_xp_earned = daily_xp_records.course_xp_earned + v_earned_xp,
            course_sessions = daily_xp_records.course_sessions + 1,
            study_time_minutes = daily_xp_records.study_time_minutes + 20;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. コース完了ボーナス処理関数
CREATE OR REPLACE FUNCTION process_course_completion_bonus(
    p_user_id UUID,
    p_course_id TEXT
)
RETURNS VOID AS $$
DECLARE
    v_bonus_xp INTEGER;
    v_badges INTEGER;
    v_today DATE := CURRENT_DATE;
BEGIN
    v_bonus_xp := get_xp_setting('course_completion_bonus');
    v_badges := get_xp_setting('badges_course_completion');
    
    -- コース完了記録更新（既存レコードの場合はスキップ）
    INSERT INTO public.course_completions (
        user_id, course_id,
        completion_bonus_xp, badges_awarded
    ) VALUES (
        p_user_id, p_course_id,
        v_bonus_xp, v_badges
    )
    ON CONFLICT (user_id, course_id) DO NOTHING;
    
    -- ユーザー全体統計にボーナスXP追加
    UPDATE public.user_xp_stats SET
        total_xp = total_xp + v_bonus_xp,
        bonus_xp = bonus_xp + v_bonus_xp,
        course_completions = course_completions + 1,
        badges_total = badges_total + v_badges,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- 日別記録にボーナスXP追加
    INSERT INTO public.daily_xp_records (
        user_id, date,
        total_xp_earned, bonus_xp_earned
    ) VALUES (
        p_user_id, v_today,
        v_bonus_xp, v_bonus_xp
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        total_xp_earned = daily_xp_records.total_xp_earned + v_bonus_xp,
        bonus_xp_earned = daily_xp_records.bonus_xp_earned + v_bonus_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数に対するコメント追加
COMMENT ON FUNCTION get_xp_setting(TEXT) IS 'XP設定値を取得する関数';
COMMENT ON FUNCTION calculate_question_xp(TEXT) IS '問題の難易度に基づいてXPを計算する関数';
COMMENT ON FUNCTION update_quiz_session_stats(UUID, UUID) IS 'クイズセッション完了時の統計更新関数';
COMMENT ON FUNCTION update_course_session_stats(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN) IS 'コース学習セッション完了時の統計更新関数';
COMMENT ON FUNCTION process_course_completion_bonus(UUID, TEXT) IS 'コース完了ボーナス処理関数';