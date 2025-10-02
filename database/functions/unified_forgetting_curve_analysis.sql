-- Unified Forgetting Curve Analysis Functions
-- Implementation of Ebbinghaus forgetting curve with personalized parameters
-- Supports both quiz and course learning data analysis

-- Function to calculate personalized forgetting curve parameters
CREATE OR REPLACE FUNCTION calculate_forgetting_curve_parameters(p_user_id UUID)
RETURNS TABLE (
  retention_at_24h DECIMAL(5,3),
  retention_at_7d DECIMAL(5,3),
  decay_rate DECIMAL(5,3),
  consolidation_factor DECIMAL(5,3),
  optimal_review_intervals INTEGER[]
) AS $$
DECLARE
  decay_constant DECIMAL(5,3);
  initial_strength DECIMAL(5,3);
  avg_performance DECIMAL(5,3);
  session_count INTEGER;
BEGIN
  -- Calculate average performance and time-based retention patterns
  SELECT 
    AVG(accuracy_rate) / 100.0 as avg_acc,
    COUNT(*) as session_count
  INTO avg_performance, session_count
  FROM unified_learning_session_analytics
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '90 days'
    AND session_type IN ('quiz', 'mixed');
  
  -- Default values if insufficient data
  IF session_count IS NULL OR session_count < 5 THEN
    retention_at_24h := 0.67;  -- Ebbinghaus default
    retention_at_7d := 0.25;   -- Ebbinghaus default
    decay_rate := 0.5;
    consolidation_factor := 1.0;
    optimal_review_intervals := ARRAY[1, 3, 7, 14, 30];
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Calculate personalized parameters based on historical data
  WITH time_decay_analysis AS (
    SELECT 
      CASE 
        WHEN session_start_time::DATE = LAG(session_start_time::DATE) OVER (
          PARTITION BY category_id, subcategory_id 
          ORDER BY session_start_time
        ) THEN 'same_day'
        WHEN session_start_time::DATE - LAG(session_start_time::DATE) OVER (
          PARTITION BY category_id, subcategory_id 
          ORDER BY session_start_time
        ) = 1 THEN 'next_day'
        WHEN session_start_time::DATE - LAG(session_start_time::DATE) OVER (
          PARTITION BY category_id, subcategory_id 
          ORDER BY session_start_time
        ) BETWEEN 2 AND 7 THEN 'within_week'
        ELSE 'after_week'
      END as time_gap,
      accuracy_rate / 100.0 as performance,
      LAG(accuracy_rate / 100.0) OVER (
        PARTITION BY category_id, subcategory_id 
        ORDER BY session_start_time
      ) as prev_performance
    FROM unified_learning_session_analytics
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '90 days'
      AND session_type IN ('quiz', 'mixed')
  )
  SELECT 
    COALESCE(AVG(CASE WHEN time_gap = 'next_day' THEN performance END), 0.67),
    COALESCE(AVG(CASE WHEN time_gap = 'within_week' THEN performance END), 0.45),
    COALESCE(AVG(CASE WHEN time_gap = 'after_week' THEN performance END), 0.25)
  INTO retention_at_24h, retention_at_7d, decay_rate
  FROM time_decay_analysis
  WHERE prev_performance IS NOT NULL;
  
  -- Calculate decay rate using exponential model: R(t) = R0 * e^(-kt)
  -- Where k is the decay constant
  IF retention_at_24h > 0 AND retention_at_7d > 0 THEN
    decay_constant := LN(retention_at_24h / retention_at_7d) / 6.0; -- 7-1 = 6 days
  ELSE
    decay_constant := 0.2; -- Default decay constant
  END IF;
  
  decay_rate := LEAST(GREATEST(decay_constant, 0.1), 1.0);
  
  -- Calculate consolidation factor based on improvement patterns
  WITH improvement_analysis AS (
    SELECT 
      AVG(
        CASE 
          WHEN LAG(accuracy_rate) OVER (
            PARTITION BY category_id 
            ORDER BY session_start_time
          ) IS NOT NULL 
          THEN (accuracy_rate - LAG(accuracy_rate) OVER (
            PARTITION BY category_id 
            ORDER BY session_start_time
          )) / 100.0
          ELSE 0
        END
      ) as avg_improvement
    FROM unified_learning_session_analytics
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '30 days'
      AND session_type IN ('quiz', 'mixed')
  )
  SELECT GREATEST(0.5, LEAST(2.0, 1.0 + avg_improvement * 2))
  INTO consolidation_factor
  FROM improvement_analysis;
  
  -- Calculate optimal review intervals based on personal forgetting curve
  optimal_review_intervals := ARRAY[
    1, -- Always review after 1 day
    GREATEST(2, (LN(0.8) / (-decay_rate))::INTEGER), -- 80% retention
    GREATEST(3, (LN(0.7) / (-decay_rate))::INTEGER), -- 70% retention  
    GREATEST(7, (LN(0.6) / (-decay_rate))::INTEGER), -- 60% retention
    GREATEST(14, (LN(0.5) / (-decay_rate))::INTEGER) -- 50% retention
  ];
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to predict retention rate at a given time
CREATE OR REPLACE FUNCTION predict_retention_rate(
  p_user_id UUID,
  p_content_id VARCHAR(100),
  p_days_since_learning INTEGER
) RETURNS DECIMAL(5,3) AS $$
DECLARE
  curve_params RECORD;
  base_retention DECIMAL(5,3);
  time_factor DECIMAL(5,3);
  review_bonus DECIMAL(5,3);
  predicted_retention DECIMAL(5,3);
BEGIN
  -- Get user's forgetting curve parameters
  SELECT * INTO curve_params
  FROM calculate_forgetting_curve_parameters(p_user_id)
  LIMIT 1;
  
  -- Calculate base retention using exponential decay model
  base_retention := EXP(-curve_params.decay_rate * p_days_since_learning);
  
  -- Apply consolidation factor for long-term memory
  IF p_days_since_learning > 7 THEN
    base_retention := base_retention * curve_params.consolidation_factor;
  END IF;
  
  -- Check for review history bonus
  SELECT COUNT(*) * 0.1 INTO review_bonus
  FROM spaced_repetition_schedule
  WHERE user_id = p_user_id 
    AND content_id = p_content_id
    AND review_count > 0;
  
  predicted_retention := LEAST(1.0, base_retention + COALESCE(review_bonus, 0));
  
  RETURN GREATEST(0.0, predicted_retention);
END;
$$ LANGUAGE plpgsql;

-- Function to analyze forgetting patterns across categories
CREATE OR REPLACE FUNCTION analyze_category_forgetting_patterns(p_user_id UUID)
RETURNS TABLE (
  category_id VARCHAR(100),
  category_name VARCHAR(255),
  avg_retention_24h DECIMAL(5,3),
  avg_retention_7d DECIMAL(5,3),
  difficulty_factor DECIMAL(5,3),
  recommended_review_frequency INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH category_performance AS (
    SELECT 
      uls.category_id,
      c.name as category_name,
      -- 24-hour retention analysis
      AVG(
        CASE 
          WHEN session_start_time::DATE - LAG(session_start_time::DATE) OVER (
            PARTITION BY uls.category_id 
            ORDER BY session_start_time
          ) = 1 
          THEN uls.accuracy_rate / 100.0
        END
      ) as retention_24h,
      -- 7-day retention analysis
      AVG(
        CASE 
          WHEN session_start_time::DATE - LAG(session_start_time::DATE) OVER (
            PARTITION BY uls.category_id 
            ORDER BY session_start_time
          ) BETWEEN 5 AND 9
          THEN uls.accuracy_rate / 100.0
        END
      ) as retention_7d,
      -- Overall difficulty assessment
      AVG(uls.cognitive_load_score) / 10.0 as difficulty,
      COUNT(*) as session_count
    FROM unified_learning_session_analytics uls
    JOIN categories c ON c.category_id = uls.category_id
    WHERE uls.user_id = p_user_id
      AND uls.created_at >= NOW() - INTERVAL '60 days'
      AND uls.session_type IN ('quiz', 'mixed')
    GROUP BY uls.category_id, c.name
    HAVING COUNT(*) >= 3
  )
  SELECT 
    cp.category_id,
    cp.category_name,
    COALESCE(cp.retention_24h, 0.67) as avg_retention_24h,
    COALESCE(cp.retention_7d, 0.25) as avg_retention_7d,
    COALESCE(cp.difficulty, 0.5) as difficulty_factor,
    -- Recommended review frequency based on retention patterns
    CASE 
      WHEN COALESCE(cp.retention_7d, 0.25) > 0.7 THEN 14  -- High retention: every 2 weeks
      WHEN COALESCE(cp.retention_7d, 0.25) > 0.5 THEN 7   -- Medium retention: weekly
      WHEN COALESCE(cp.retention_7d, 0.25) > 0.3 THEN 3   -- Low retention: every 3 days
      ELSE 1  -- Very low retention: daily
    END as recommended_review_frequency
  FROM category_performance cp
  ORDER BY cp.difficulty DESC, cp.retention_7d ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to update user's forgetting curve profile
CREATE OR REPLACE FUNCTION update_user_forgetting_profile(p_user_id UUID)
RETURNS void AS $$
DECLARE
  curve_params RECORD;
  profile_exists BOOLEAN;
BEGIN
  -- Calculate latest forgetting curve parameters
  SELECT * INTO curve_params
  FROM calculate_forgetting_curve_parameters(p_user_id)
  LIMIT 1;
  
  -- Check if profile exists
  SELECT EXISTS(
    SELECT 1 FROM user_learning_profiles WHERE user_id = p_user_id
  ) INTO profile_exists;
  
  IF profile_exists THEN
    -- Update existing profile
    UPDATE user_learning_profiles
    SET 
      forgetting_curve_parameters = jsonb_build_object(
        'retention_24h', curve_params.retention_at_24h,
        'retention_7d', curve_params.retention_at_7d,
        'decay_rate', curve_params.decay_rate,
        'consolidation_factor', curve_params.consolidation_factor,
        'last_calculated', NOW()
      ),
      optimal_review_intervals = curve_params.optimal_review_intervals,
      last_analysis_update = NOW()
    WHERE user_id = p_user_id;
  ELSE
    -- Create new profile
    INSERT INTO user_learning_profiles (
      user_id,
      forgetting_curve_parameters,
      optimal_review_intervals
    ) VALUES (
      p_user_id,
      jsonb_build_object(
        'retention_24h', curve_params.retention_at_24h,
        'retention_7d', curve_params.retention_at_7d,
        'decay_rate', curve_params.decay_rate,
        'consolidation_factor', curve_params.consolidation_factor,
        'last_calculated', NOW()
      ),
      curve_params.optimal_review_intervals
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to generate review recommendations based on forgetting curve
CREATE OR REPLACE FUNCTION get_forgetting_curve_recommendations(p_user_id UUID)
RETURNS TABLE (
  content_type VARCHAR(20),
  content_id VARCHAR(100),
  category_id VARCHAR(100),
  predicted_retention DECIMAL(5,3),
  days_since_learning INTEGER,
  urgency_score INTEGER,
  recommended_action TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH content_analysis AS (
    SELECT DISTINCT
      uls.session_type as content_type,
      COALESCE(uls.quiz_session_id::VARCHAR, uls.course_session_id) as content_id,
      uls.category_id,
      MAX(uls.session_start_time) as last_session,
      EXTRACT(DAY FROM (NOW() - MAX(uls.session_start_time)))::INTEGER as days_since,
      AVG(uls.accuracy_rate / 100.0) as avg_performance
    FROM unified_learning_session_analytics uls
    WHERE uls.user_id = p_user_id
      AND uls.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY uls.session_type, COALESCE(uls.quiz_session_id::VARCHAR, uls.course_session_id), uls.category_id
  )
  SELECT 
    ca.content_type,
    ca.content_id,
    ca.category_id,
    predict_retention_rate(p_user_id, ca.content_id, ca.days_since) as predicted_retention,
    ca.days_since as days_since_learning,
    -- Urgency score (1-10) based on retention prediction and time
    CASE 
      WHEN predict_retention_rate(p_user_id, ca.content_id, ca.days_since) < 0.3 THEN 10
      WHEN predict_retention_rate(p_user_id, ca.content_id, ca.days_since) < 0.5 THEN 8
      WHEN predict_retention_rate(p_user_id, ca.content_id, ca.days_since) < 0.7 THEN 6
      WHEN ca.days_since > 14 THEN 4
      ELSE 2
    END as urgency_score,
    -- Recommended action
    CASE 
      WHEN predict_retention_rate(p_user_id, ca.content_id, ca.days_since) < 0.3 THEN 'URGENT_REVIEW'
      WHEN predict_retention_rate(p_user_id, ca.content_id, ca.days_since) < 0.5 THEN 'REVIEW_SOON'
      WHEN predict_retention_rate(p_user_id, ca.content_id, ca.days_since) < 0.7 THEN 'SCHEDULE_REVIEW'
      WHEN ca.days_since > 21 THEN 'CONSIDER_REVIEW'
      ELSE 'WELL_RETAINED'
    END as recommended_action
  FROM content_analysis ca
  WHERE ca.days_since > 0
  ORDER BY 
    predict_retention_rate(p_user_id, ca.content_id, ca.days_since) ASC,
    ca.days_since DESC;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION calculate_forgetting_curve_parameters IS 'Calculates personalized Ebbinghaus forgetting curve parameters based on user learning history';
COMMENT ON FUNCTION predict_retention_rate IS 'Predicts knowledge retention rate for specific content after given time period';
COMMENT ON FUNCTION analyze_category_forgetting_patterns IS 'Analyzes forgetting patterns across different learning categories';
COMMENT ON FUNCTION update_user_forgetting_profile IS 'Updates user learning profile with latest forgetting curve analysis';
COMMENT ON FUNCTION get_forgetting_curve_recommendations IS 'Generates review recommendations based on forgetting curve predictions';