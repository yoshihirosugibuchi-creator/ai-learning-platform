-- Flow State Analysis Functions
-- Implementation of Csikszentmihalyi's Flow Theory for optimal learning experience
-- Analyzes challenge-skill balance, focus, and engagement patterns

-- Function to calculate flow state index for a learning session
CREATE OR REPLACE FUNCTION calculate_flow_state_index(
  p_user_skill_level DECIMAL(3,1),  -- User's skill level (1-10)
  p_content_difficulty DECIMAL(3,1), -- Content difficulty (1-10)
  p_accuracy_rate DECIMAL(5,2),     -- Session accuracy (0-100)
  p_response_time_consistency DECIMAL(3,2), -- Response time variation (0-1, lower is better)
  p_session_duration_minutes INTEGER,
  p_interruption_count INTEGER DEFAULT 0,
  p_engagement_indicators JSON DEFAULT NULL
) RETURNS DECIMAL(3,2) AS $$
DECLARE
  challenge_skill_balance DECIMAL(3,2);
  focus_quality DECIMAL(3,2);
  time_distortion DECIMAL(3,2);
  intrinsic_motivation DECIMAL(3,2);
  flow_index DECIMAL(3,2);
  optimal_ratio DECIMAL(3,2);
BEGIN
  -- 1. Challenge-Skill Balance (Core of Flow Theory)
  optimal_ratio := p_content_difficulty / GREATEST(p_user_skill_level, 1.0);
  
  challenge_skill_balance := CASE
    WHEN optimal_ratio BETWEEN 0.8 AND 1.2 THEN 1.0  -- Perfect balance
    WHEN optimal_ratio BETWEEN 0.6 AND 1.5 THEN 0.8  -- Good balance
    WHEN optimal_ratio BETWEEN 0.4 AND 2.0 THEN 0.6  -- Acceptable balance
    WHEN optimal_ratio < 0.4 THEN 0.2  -- Too easy (boredom)
    ELSE 0.3  -- Too hard (anxiety)
  END;
  
  -- 2. Focus Quality (measured by consistency and accuracy)
  focus_quality := CASE
    WHEN p_accuracy_rate >= 85 AND p_response_time_consistency <= 0.3 THEN 1.0
    WHEN p_accuracy_rate >= 70 AND p_response_time_consistency <= 0.5 THEN 0.8
    WHEN p_accuracy_rate >= 60 AND p_response_time_consistency <= 0.7 THEN 0.6
    WHEN p_accuracy_rate >= 50 THEN 0.4
    ELSE 0.2
  END;
  
  -- Reduce focus quality based on interruptions
  focus_quality := focus_quality * (1.0 - LEAST(0.5, p_interruption_count * 0.1));
  
  -- 3. Time Distortion (engagement duration indicator)
  time_distortion := CASE
    WHEN p_session_duration_minutes BETWEEN 20 AND 60 THEN 1.0  -- Optimal engagement time
    WHEN p_session_duration_minutes BETWEEN 15 AND 90 THEN 0.8  -- Good engagement
    WHEN p_session_duration_minutes BETWEEN 10 AND 120 THEN 0.6 -- Acceptable
    WHEN p_session_duration_minutes < 10 THEN 0.3  -- Too short
    ELSE 0.4  -- Too long (fatigue)
  END;
  
  -- 4. Intrinsic Motivation (inferred from engagement indicators)
  intrinsic_motivation := 0.7; -- Default baseline
  
  IF p_engagement_indicators IS NOT NULL THEN
    -- Extract engagement signals from JSON
    intrinsic_motivation := CASE
      WHEN (p_engagement_indicators->>'self_reported_enjoyment')::INTEGER >= 8 THEN 1.0
      WHEN (p_engagement_indicators->>'self_reported_enjoyment')::INTEGER >= 6 THEN 0.8
      WHEN (p_engagement_indicators->>'self_reported_enjoyment')::INTEGER >= 4 THEN 0.6
      ELSE 0.4
    END;
    
    -- Adjust based on voluntary session extension
    IF (p_engagement_indicators->>'session_extended')::BOOLEAN THEN
      intrinsic_motivation := LEAST(1.0, intrinsic_motivation + 0.2);
    END IF;
  END IF;
  
  -- Calculate weighted flow index
  flow_index := (
    challenge_skill_balance * 0.35 +
    focus_quality * 0.30 +
    time_distortion * 0.20 +
    intrinsic_motivation * 0.15
  );
  
  RETURN GREATEST(0.0, LEAST(1.0, flow_index));
END;
$$ LANGUAGE plpgsql;

-- Function to analyze user's flow patterns across different conditions
CREATE OR REPLACE FUNCTION analyze_user_flow_patterns(p_user_id UUID)
RETURNS TABLE (
  condition_type VARCHAR(20),
  condition_value VARCHAR(50),
  avg_flow_index DECIMAL(5,3),
  session_count INTEGER,
  avg_accuracy DECIMAL(5,2),
  avg_duration INTEGER,
  flow_frequency_pct DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  -- Analysis by time of day
  SELECT 
    'time_of_day'::VARCHAR(20),
    CASE 
      WHEN EXTRACT(HOUR FROM session_start_time) BETWEEN 6 AND 11 THEN 'morning'
      WHEN EXTRACT(HOUR FROM session_start_time) BETWEEN 12 AND 17 THEN 'afternoon'
      WHEN EXTRACT(HOUR FROM session_start_time) BETWEEN 18 AND 22 THEN 'evening'
      ELSE 'night'
    END::VARCHAR(50),
    AVG(flow_state_index)::DECIMAL(5,3),
    COUNT(*)::INTEGER,
    AVG(accuracy_rate)::DECIMAL(5,2),
    AVG(duration_seconds / 60)::INTEGER,
    (COUNT(*) FILTER (WHERE flow_state_index >= 0.7) * 100.0 / COUNT(*))::DECIMAL(5,2)
  FROM unified_learning_session_analytics
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '30 days'
    AND flow_state_index IS NOT NULL
  GROUP BY 
    CASE 
      WHEN EXTRACT(HOUR FROM session_start_time) BETWEEN 6 AND 11 THEN 'morning'
      WHEN EXTRACT(HOUR FROM session_start_time) BETWEEN 12 AND 17 THEN 'afternoon'
      WHEN EXTRACT(HOUR FROM session_start_time) BETWEEN 18 AND 22 THEN 'evening'
      ELSE 'night'
    END
  HAVING COUNT(*) >= 3
  
  UNION ALL
  
  -- Analysis by difficulty level
  SELECT 
    'difficulty'::VARCHAR(20),
    difficulty_level::VARCHAR(50),
    AVG(flow_state_index)::DECIMAL(5,3),
    COUNT(*)::INTEGER,
    AVG(accuracy_rate)::DECIMAL(5,2),
    AVG(duration_seconds / 60)::INTEGER,
    (COUNT(*) FILTER (WHERE flow_state_index >= 0.7) * 100.0 / COUNT(*))::DECIMAL(5,2)
  FROM unified_learning_session_analytics
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '30 days'
    AND flow_state_index IS NOT NULL
  GROUP BY difficulty_level
  HAVING COUNT(*) >= 3
  
  UNION ALL
  
  -- Analysis by session type
  SELECT 
    'session_type'::VARCHAR(20),
    session_type::VARCHAR(50),
    AVG(flow_state_index)::DECIMAL(5,3),
    COUNT(*)::INTEGER,
    AVG(accuracy_rate)::DECIMAL(5,2),
    AVG(duration_seconds / 60)::INTEGER,
    (COUNT(*) FILTER (WHERE flow_state_index >= 0.7) * 100.0 / COUNT(*))::DECIMAL(5,2)
  FROM unified_learning_session_analytics
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '30 days'
    AND flow_state_index IS NOT NULL
  GROUP BY session_type
  HAVING COUNT(*) >= 3
  
  ORDER BY avg_flow_index DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to detect and predict flow state opportunities
CREATE OR REPLACE FUNCTION predict_flow_opportunities(p_user_id UUID)
RETURNS TABLE (
  opportunity_type VARCHAR(30),
  recommended_time VARCHAR(20),
  optimal_difficulty VARCHAR(20),
  estimated_flow_probability DECIMAL(5,2),
  suggested_duration INTEGER,
  preparation_tips TEXT[]
) AS $$
DECLARE
  user_profile RECORD;
  best_conditions RECORD;
BEGIN
  -- Get user's learning profile
  SELECT 
    optimal_session_length,
    peak_performance_hours,
    flow_state_preference
  INTO user_profile
  FROM user_learning_profiles
  WHERE user_id = p_user_id;
  
  -- Find best flow conditions from historical data
  SELECT 
    condition_value as best_time,
    avg_flow_index as best_flow_score
  INTO best_conditions
  FROM analyze_user_flow_patterns(p_user_id)
  WHERE condition_type = 'time_of_day'
  ORDER BY avg_flow_index DESC
  LIMIT 1;
  
  RETURN QUERY
  WITH flow_predictions AS (
    SELECT 
      'optimal_timing'::VARCHAR(30),
      COALESCE(best_conditions.best_time, 'morning')::VARCHAR(20),
      'intermediate'::VARCHAR(20),
      COALESCE(best_conditions.best_flow_score * 100, 65.0)::DECIMAL(5,2),
      COALESCE(user_profile.optimal_session_length, 25)::INTEGER,
      ARRAY[
        'Choose challenging but achievable content',
        'Minimize potential interruptions',
        'Set clear learning goals for the session',
        'Ensure comfortable physical environment'
      ]::TEXT[]
    WHERE best_conditions.best_flow_score IS NOT NULL
    
    UNION ALL
    
    SELECT 
      'skill_building'::VARCHAR(30),
      'flexible'::VARCHAR(20),
      'basic'::VARCHAR(20),
      70.0::DECIMAL(5,2),
      20::INTEGER,
      ARRAY[
        'Start with easier content to build confidence',
        'Gradually increase difficulty',
        'Focus on incremental progress',
        'Celebrate small wins'
      ]::TEXT[]
    
    UNION ALL
    
    SELECT 
      'challenge_mode'::VARCHAR(30),
      COALESCE(best_conditions.best_time, 'morning')::VARCHAR(20),
      'advanced'::VARCHAR(20),
      55.0::DECIMAL(5,2),
      30::INTEGER,
      ARRAY[
        'Ensure you are well-rested',
        'Warm up with medium difficulty content',
        'Set specific challenging goals',
        'Be prepared for initial struggle'
      ]::TEXT[]
  )
  SELECT * FROM flow_predictions
  ORDER BY estimated_flow_probability DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to provide real-time flow state guidance
CREATE OR REPLACE FUNCTION provide_flow_guidance(
  p_user_id UUID,
  p_current_session_id UUID,
  p_current_accuracy DECIMAL(5,2),
  p_time_elapsed_minutes INTEGER,
  p_recent_response_times INTEGER[]
) RETURNS TABLE (
  current_flow_estimate DECIMAL(3,2),
  flow_status VARCHAR(20),
  recommended_action VARCHAR(50),
  adjustment_suggestion TEXT,
  continue_recommendation BOOLEAN
) AS $$
DECLARE
  session_data RECORD;
  user_skill DECIMAL(3,1);
  content_difficulty DECIMAL(3,1);
  response_consistency DECIMAL(3,2);
  current_flow DECIMAL(3,2);
  flow_status_text VARCHAR(20);
  action_text VARCHAR(50);
  suggestion_text TEXT;
  should_continue BOOLEAN;
BEGIN
  -- Get current session data
  SELECT 
    difficulty_level,
    category_id,
    interruption_count
  INTO session_data
  FROM unified_learning_session_analytics
  WHERE id = p_current_session_id;
  
  -- Estimate user skill level for this category
  SELECT COALESCE(AVG(accuracy_rate / 10.0), 5.0)
  INTO user_skill
  FROM unified_learning_session_analytics
  WHERE user_id = p_user_id
    AND category_id = session_data.category_id
    AND created_at >= NOW() - INTERVAL '14 days';
  
  -- Map difficulty level to numeric scale
  content_difficulty := CASE session_data.difficulty_level
    WHEN 'basic' THEN 3.0
    WHEN 'intermediate' THEN 5.0
    WHEN 'advanced' THEN 7.0
    WHEN 'expert' THEN 9.0
    ELSE 5.0
  END;
  
  -- Calculate response time consistency
  IF array_length(p_recent_response_times, 1) >= 3 THEN
    WITH response_stats AS (
      SELECT 
        AVG(rt) as mean_time,
        STDDEV(rt) as stddev_time
      FROM unnest(p_recent_response_times) as rt
    )
    SELECT COALESCE(stddev_time / NULLIF(mean_time, 0), 0.5)
    INTO response_consistency
    FROM response_stats;
  ELSE
    response_consistency := 0.5; -- Default moderate consistency
  END IF;
  
  -- Calculate current flow state
  current_flow := calculate_flow_state_index(
    user_skill,
    content_difficulty,
    p_current_accuracy,
    response_consistency,
    p_time_elapsed_minutes,
    session_data.interruption_count
  );
  
  -- Determine flow status and recommendations
  IF current_flow >= 0.8 THEN
    flow_status_text := 'EXCELLENT';
    action_text := 'MAINTAIN_CURRENT_PACE';
    suggestion_text := 'You are in an excellent flow state! Continue with the current difficulty and pace.';
    should_continue := TRUE;
  ELSIF current_flow >= 0.6 THEN
    flow_status_text := 'GOOD';
    action_text := 'MINOR_ADJUSTMENTS';
    suggestion_text := 'Good flow state. Consider small adjustments to optimize further.';
    should_continue := TRUE;
  ELSIF current_flow >= 0.4 THEN
    flow_status_text := 'MODERATE';
    IF user_skill > content_difficulty + 1.0 THEN
      action_text := 'INCREASE_DIFFICULTY';
      suggestion_text := 'Content may be too easy. Try increasing difficulty to maintain engagement.';
    ELSIF content_difficulty > user_skill + 1.5 THEN
      action_text := 'DECREASE_DIFFICULTY';
      suggestion_text := 'Content may be too challenging. Consider easier material to build confidence.';
    ELSE
      action_text := 'IMPROVE_FOCUS';
      suggestion_text := 'Try to improve focus by minimizing distractions and taking a brief break if needed.';
    END IF;
    should_continue := TRUE;
  ELSIF current_flow >= 0.2 THEN
    flow_status_text := 'LOW';
    action_text := 'SIGNIFICANT_ADJUSTMENT';
    suggestion_text := 'Flow state is low. Consider changing content difficulty, taking a break, or switching topics.';
    should_continue := (p_time_elapsed_minutes < 15);
  ELSE
    flow_status_text := 'POOR';
    action_text := 'STOP_SESSION';
    suggestion_text := 'Flow state is very low. Consider ending this session and trying again later under better conditions.';
    should_continue := FALSE;
  END IF;
  
  current_flow_estimate := current_flow;
  flow_status := flow_status_text;
  recommended_action := action_text;
  adjustment_suggestion := suggestion_text;
  continue_recommendation := should_continue;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to update user's flow state preferences
CREATE OR REPLACE FUNCTION update_flow_state_preferences(p_user_id UUID)
RETURNS void AS $$
DECLARE
  optimal_conditions RECORD;
  flow_preferences JSON;
BEGIN
  -- Analyze user's best flow conditions
  WITH best_conditions AS (
    SELECT 
      condition_type,
      condition_value,
      avg_flow_index,
      ROW_NUMBER() OVER (PARTITION BY condition_type ORDER BY avg_flow_index DESC) as rank
    FROM analyze_user_flow_patterns(p_user_id)
  )
  SELECT 
    json_object_agg(
      condition_type,
      json_build_object(
        'optimal_value', condition_value,
        'flow_score', avg_flow_index
      )
    )
  INTO flow_preferences
  FROM best_conditions
  WHERE rank = 1;
  
  -- Update user learning profile
  UPDATE user_learning_profiles
  SET 
    flow_state_preference = COALESCE(flow_preferences, '{}'),
    last_analysis_update = NOW()
  WHERE user_id = p_user_id;
  
  -- Create profile if it doesn't exist
  IF NOT FOUND THEN
    INSERT INTO user_learning_profiles (user_id, flow_state_preference)
    VALUES (p_user_id, COALESCE(flow_preferences, '{}'))
    ON CONFLICT (user_id) DO UPDATE SET
      flow_state_preference = EXCLUDED.flow_state_preference,
      last_analysis_update = NOW();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get flow state insights for analytics dashboard
CREATE OR REPLACE FUNCTION get_flow_state_insights(p_user_id UUID)
RETURNS TABLE (
  total_flow_sessions INTEGER,
  avg_flow_index DECIMAL(5,3),
  flow_trend VARCHAR(20),
  best_flow_conditions JSON,
  improvement_suggestions TEXT[]
) AS $$
DECLARE
  flow_trend_calc VARCHAR(20);
  recent_avg DECIMAL(5,3);
  historical_avg DECIMAL(5,3);
BEGIN
  -- Calculate flow trend
  SELECT AVG(flow_state_index) INTO recent_avg
  FROM unified_learning_session_analytics
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '7 days'
    AND flow_state_index IS NOT NULL;
  
  SELECT AVG(flow_state_index) INTO historical_avg
  FROM unified_learning_session_analytics
  WHERE user_id = p_user_id
    AND created_at BETWEEN NOW() - INTERVAL '21 days' AND NOW() - INTERVAL '7 days'
    AND flow_state_index IS NOT NULL;
  
  flow_trend_calc := CASE
    WHEN recent_avg > historical_avg + 0.05 THEN 'IMPROVING'
    WHEN recent_avg < historical_avg - 0.05 THEN 'DECLINING'
    ELSE 'STABLE'
  END;
  
  RETURN QUERY
  WITH flow_insights AS (
    SELECT 
      COUNT(*)::INTEGER as session_count,
      AVG(flow_state_index)::DECIMAL(5,3) as avg_flow,
      flow_trend_calc as trend
    FROM unified_learning_session_analytics
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '30 days'
      AND flow_state_index IS NOT NULL
  ),
  best_conditions AS (
    SELECT json_object_agg(
      condition_type,
      json_build_object(
        'condition', condition_value,
        'flow_score', avg_flow_index,
        'frequency_pct', flow_frequency_pct
      )
    ) as conditions
    FROM (
      SELECT DISTINCT ON (condition_type)
        condition_type,
        condition_value,
        avg_flow_index,
        flow_frequency_pct
      FROM analyze_user_flow_patterns(p_user_id)
      ORDER BY condition_type, avg_flow_index DESC
    ) ranked_conditions
  )
  SELECT 
    fi.session_count,
    fi.avg_flow,
    fi.trend,
    bc.conditions,
    CASE 
      WHEN fi.avg_flow < 0.4 THEN ARRAY[
        'Try learning during your peak performance hours',
        'Choose content that matches your skill level',
        'Minimize distractions during study sessions',
        'Take regular breaks to maintain focus'
      ]
      WHEN fi.avg_flow < 0.6 THEN ARRAY[
        'Experiment with different difficulty levels',
        'Set clear learning goals before each session',
        'Track your progress to maintain motivation'
      ]
      ELSE ARRAY[
        'Continue your current learning approach',
        'Consider mentoring others to deepen understanding',
        'Explore more challenging content areas'
      ]
    END as suggestions
  FROM flow_insights fi
  CROSS JOIN best_conditions bc;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION calculate_flow_state_index IS 'Calculates flow state index based on Csikszentmihalyis Flow Theory principles';
COMMENT ON FUNCTION analyze_user_flow_patterns IS 'Analyzes user flow patterns across different learning conditions';
COMMENT ON FUNCTION predict_flow_opportunities IS 'Predicts optimal conditions for achieving flow state';
COMMENT ON FUNCTION provide_flow_guidance IS 'Provides real-time guidance for maintaining flow state during learning';
COMMENT ON FUNCTION get_flow_state_insights IS 'Generates comprehensive flow state insights for analytics dashboard';