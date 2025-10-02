-- Cognitive Load Analysis Functions
-- Implementation of Sweller's Cognitive Load Theory for learning optimization
-- Analyzes intrinsic, extraneous, and germane load from learning session data

-- Function to calculate cognitive load score for a session
CREATE OR REPLACE FUNCTION calculate_cognitive_load_score(
  p_session_id UUID,
  p_difficulty_level VARCHAR(20),
  p_questions_total INTEGER,
  p_average_response_time_ms INTEGER,
  p_accuracy_rate DECIMAL(5,2),
  p_interruption_count INTEGER DEFAULT 0
) RETURNS DECIMAL(3,2) AS $$
DECLARE
  intrinsic_load DECIMAL(3,2);
  extraneous_load DECIMAL(3,2);
  germane_load DECIMAL(3,2);
  total_load DECIMAL(3,2);
  response_time_factor DECIMAL(3,2);
  accuracy_factor DECIMAL(3,2);
BEGIN
  -- Calculate Intrinsic Load (content difficulty)
  intrinsic_load := CASE p_difficulty_level
    WHEN 'basic' THEN 2.0
    WHEN 'intermediate' THEN 4.0
    WHEN 'advanced' THEN 6.0
    WHEN 'expert' THEN 8.0
    ELSE 3.0
  END;
  
  -- Adjust for question volume
  IF p_questions_total > 20 THEN
    intrinsic_load := intrinsic_load * 1.2;
  ELSIF p_questions_total > 10 THEN
    intrinsic_load := intrinsic_load * 1.1;
  END IF;
  
  -- Calculate Extraneous Load (interface/environment factors)
  response_time_factor := CASE
    WHEN p_average_response_time_ms > 60000 THEN 3.0  -- >1 minute: high extraneous load
    WHEN p_average_response_time_ms > 30000 THEN 2.0  -- >30 seconds: medium load
    WHEN p_average_response_time_ms > 15000 THEN 1.0  -- >15 seconds: normal load
    ELSE 0.5  -- Fast responses: low load
  END;
  
  extraneous_load := response_time_factor + (p_interruption_count * 0.5);
  extraneous_load := LEAST(4.0, extraneous_load);
  
  -- Calculate Germane Load (learning processing effort)
  accuracy_factor := CASE
    WHEN p_accuracy_rate >= 90 THEN 1.0   -- High accuracy: efficient processing
    WHEN p_accuracy_rate >= 70 THEN 2.0   -- Good accuracy: moderate processing
    WHEN p_accuracy_rate >= 50 THEN 3.0   -- Poor accuracy: high processing effort
    ELSE 4.0  -- Very poor: maximum processing effort
  END;
  
  germane_load := accuracy_factor;
  
  -- Calculate total cognitive load (weighted average)
  total_load := (intrinsic_load * 0.4) + (extraneous_load * 0.3) + (germane_load * 0.3);
  
  RETURN LEAST(10.0, GREATEST(0.0, total_load));
END;
$$ LANGUAGE plpgsql;

-- Function to analyze cognitive load patterns for a user
CREATE OR REPLACE FUNCTION analyze_user_cognitive_load_patterns(p_user_id UUID)
RETURNS TABLE (
  time_of_day VARCHAR(10),
  avg_cognitive_load DECIMAL(5,2),
  peak_load_threshold DECIMAL(5,2),
  optimal_session_length INTEGER,
  fatigue_indicators JSON
) AS $$
BEGIN
  RETURN QUERY
  WITH hourly_analysis AS (
    SELECT 
      EXTRACT(HOUR FROM session_start_time)::INTEGER as hour,
      AVG(cognitive_load_score) as avg_load,
      AVG(duration_seconds / 60) as avg_duration,
      AVG(accuracy_rate) as avg_accuracy,
      COUNT(*) as session_count,
      STDDEV(cognitive_load_score) as load_stddev
    FROM unified_learning_session_analytics
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '30 days'
      AND cognitive_load_score > 0
    GROUP BY EXTRACT(HOUR FROM session_start_time)
    HAVING COUNT(*) >= 3
  ),
  time_slots AS (
    SELECT 
      CASE 
        WHEN hour BETWEEN 6 AND 11 THEN 'morning'
        WHEN hour BETWEEN 12 AND 17 THEN 'afternoon'
        WHEN hour BETWEEN 18 AND 22 THEN 'evening'
        ELSE 'night'
      END as time_period,
      AVG(avg_load) as period_avg_load,
      AVG(avg_duration) as period_avg_duration,
      AVG(avg_accuracy) as period_avg_accuracy,
      MAX(avg_load + COALESCE(load_stddev, 0)) as period_peak_load
    FROM hourly_analysis
    GROUP BY 
      CASE 
        WHEN hour BETWEEN 6 AND 11 THEN 'morning'
        WHEN hour BETWEEN 12 AND 17 THEN 'afternoon'
        WHEN hour BETWEEN 18 AND 22 THEN 'evening'
        ELSE 'night'
      END
  )
  SELECT 
    ts.time_period,
    ROUND(ts.period_avg_load, 2) as avg_cognitive_load,
    ROUND(ts.period_peak_load, 2) as peak_load_threshold,
    ROUND(ts.period_avg_duration)::INTEGER as optimal_session_length,
    json_build_object(
      'fatigue_risk', CASE 
        WHEN ts.period_avg_load > 7.0 THEN 'HIGH'
        WHEN ts.period_avg_load > 5.0 THEN 'MEDIUM' 
        ELSE 'LOW'
      END,
      'attention_quality', CASE
        WHEN ts.period_avg_accuracy > 80 THEN 'EXCELLENT'
        WHEN ts.period_avg_accuracy > 70 THEN 'GOOD'
        WHEN ts.period_avg_accuracy > 60 THEN 'FAIR'
        ELSE 'POOR'
      END,
      'recommended_break_frequency', CASE
        WHEN ts.period_avg_load > 6.0 THEN 'Every 15 minutes'
        WHEN ts.period_avg_load > 4.0 THEN 'Every 25 minutes'
        ELSE 'Every 45 minutes'
      END
    ) as fatigue_indicators
  FROM time_slots ts
  ORDER BY 
    CASE ts.time_period
      WHEN 'morning' THEN 1
      WHEN 'afternoon' THEN 2
      WHEN 'evening' THEN 3
      WHEN 'night' THEN 4
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to detect cognitive overload in real-time
CREATE OR REPLACE FUNCTION detect_cognitive_overload(
  p_user_id UUID,
  p_current_session_id UUID,
  p_response_times INTEGER[], -- Array of recent response times
  p_recent_accuracy DECIMAL(5,2)
) RETURNS TABLE (
  overload_detected BOOLEAN,
  overload_severity VARCHAR(10),
  recommended_action VARCHAR(50),
  break_duration_minutes INTEGER,
  reasoning TEXT
) AS $$
DECLARE
  user_baseline RECORD;
  current_load DECIMAL(3,2);
  response_time_spike BOOLEAN;
  accuracy_drop BOOLEAN;
  session_duration INTEGER;
  break_recommendation INTEGER;
BEGIN
  -- Get user's baseline cognitive load patterns
  SELECT 
    AVG(cognitive_load_score) as avg_load,
    STDDEV(cognitive_load_score) as load_stddev,
    AVG(accuracy_rate) as avg_accuracy
  INTO user_baseline
  FROM unified_learning_session_analytics
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '14 days'
    AND cognitive_load_score > 0;
  
  -- Get current session data
  SELECT 
    EXTRACT(EPOCH FROM (NOW() - session_start_time)) / 60 as duration_min,
    cognitive_load_score
  INTO session_duration, current_load
  FROM unified_learning_session_analytics
  WHERE id = p_current_session_id;
  
  -- Detect response time spikes
  response_time_spike := (
    SELECT AVG(rt) > 45000  -- Average > 45 seconds
    FROM unnest(p_response_times) as rt
    WHERE array_length(p_response_times, 1) >= 3
  );
  
  -- Detect accuracy drops
  accuracy_drop := (
    p_recent_accuracy < (COALESCE(user_baseline.avg_accuracy, 70) * 0.8)
  );
  
  -- Determine overload conditions
  IF current_load > (COALESCE(user_baseline.avg_load, 5.0) + COALESCE(user_baseline.load_stddev, 1.0) * 2) 
     OR response_time_spike 
     OR accuracy_drop 
     OR session_duration > 60 THEN
    
    overload_detected := TRUE;
    
    -- Determine severity
    IF current_load > 8.0 OR session_duration > 90 THEN
      overload_severity := 'HIGH';
      recommended_action := 'IMMEDIATE_BREAK';
      break_duration_minutes := 15;
      reasoning := 'High cognitive load detected. Extended break recommended.';
    ELSIF current_load > 6.0 OR response_time_spike THEN
      overload_severity := 'MEDIUM';
      recommended_action := 'SHORT_BREAK';
      break_duration_minutes := 5;
      reasoning := 'Moderate cognitive load. Brief break will help restore focus.';
    ELSE
      overload_severity := 'LOW';
      recommended_action := 'SWITCH_ACTIVITY';
      break_duration_minutes := 2;
      reasoning := 'Mild cognitive fatigue. Try switching to easier content.';
    END IF;
    
  ELSE
    overload_detected := FALSE;
    overload_severity := 'NONE';
    recommended_action := 'CONTINUE';
    break_duration_minutes := 0;
    reasoning := 'Cognitive load within normal range. Continue learning.';
  END IF;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to optimize session parameters based on cognitive load
CREATE OR REPLACE FUNCTION optimize_session_parameters(p_user_id UUID)
RETURNS TABLE (
  optimal_session_duration INTEGER,
  recommended_difficulty VARCHAR(20),
  break_frequency INTEGER,
  max_questions_per_session INTEGER,
  cognitive_load_target DECIMAL(3,2)
) AS $$
DECLARE
  user_profile RECORD;
  load_analysis RECORD;
BEGIN
  -- Get user's cognitive load tolerance from profile
  SELECT 
    cognitive_load_tolerance,
    optimal_session_length,
    fatigue_threshold
  INTO user_profile
  FROM user_learning_profiles
  WHERE user_id = p_user_id;
  
  -- Analyze recent performance under different conditions
  WITH performance_analysis AS (
    SELECT 
      CASE 
        WHEN cognitive_load_score <= 3.0 THEN 'low'
        WHEN cognitive_load_score <= 6.0 THEN 'medium'
        ELSE 'high'
      END as load_category,
      AVG(accuracy_rate) as avg_accuracy,
      AVG(duration_seconds / 60) as avg_duration,
      COUNT(*) as session_count
    FROM unified_learning_session_analytics
    WHERE user_id = p_user_id
      AND created_at >= NOW() - INTERVAL '21 days'
      AND cognitive_load_score > 0
    GROUP BY 
      CASE 
        WHEN cognitive_load_score <= 3.0 THEN 'low'
        WHEN cognitive_load_score <= 6.0 THEN 'medium'
        ELSE 'high'
      END
  )
  SELECT 
    (SELECT avg_accuracy FROM performance_analysis WHERE load_category = 'medium') as medium_accuracy,
    (SELECT avg_duration FROM performance_analysis WHERE load_category = 'medium') as medium_duration
  INTO load_analysis;
  
  -- Generate recommendations
  optimal_session_duration := COALESCE(
    user_profile.optimal_session_length,
    LEAST(45, GREATEST(15, load_analysis.medium_duration::INTEGER))
  );
  
  recommended_difficulty := CASE
    WHEN COALESCE(user_profile.cognitive_load_tolerance, 5.0) > 7.0 THEN 'advanced'
    WHEN COALESCE(user_profile.cognitive_load_tolerance, 5.0) > 5.0 THEN 'intermediate'
    ELSE 'basic'
  END;
  
  break_frequency := CASE
    WHEN COALESCE(user_profile.cognitive_load_tolerance, 5.0) < 4.0 THEN 15
    WHEN COALESCE(user_profile.cognitive_load_tolerance, 5.0) < 6.0 THEN 25
    ELSE 45
  END;
  
  max_questions_per_session := CASE
    WHEN COALESCE(user_profile.cognitive_load_tolerance, 5.0) < 4.0 THEN 10
    WHEN COALESCE(user_profile.cognitive_load_tolerance, 5.0) < 7.0 THEN 15
    ELSE 25
  END;
  
  cognitive_load_target := LEAST(
    COALESCE(user_profile.cognitive_load_tolerance, 5.0),
    6.0  -- Never exceed 6.0 for sustained learning
  );
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to update cognitive load score for existing sessions
CREATE OR REPLACE FUNCTION update_session_cognitive_load(p_session_id UUID)
RETURNS void AS $$
DECLARE
  session_data RECORD;
  calculated_load DECIMAL(3,2);
BEGIN
  -- Get session data
  SELECT 
    difficulty_level,
    questions_total,
    average_response_time_ms,
    accuracy_rate,
    interruption_count
  INTO session_data
  FROM unified_learning_session_analytics
  WHERE id = p_session_id;
  
  IF session_data IS NOT NULL THEN
    -- Calculate cognitive load score
    calculated_load := calculate_cognitive_load_score(
      p_session_id,
      session_data.difficulty_level,
      session_data.questions_total,
      session_data.average_response_time_ms,
      session_data.accuracy_rate,
      session_data.interruption_count
    );
    
    -- Update session with calculated load
    UPDATE unified_learning_session_analytics
    SET 
      cognitive_load_score = calculated_load,
      updated_at = NOW()
    WHERE id = p_session_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get cognitive load recommendations for upcoming session
CREATE OR REPLACE FUNCTION get_cognitive_load_recommendations(p_user_id UUID)
RETURNS TABLE (
  recommended_time_slot VARCHAR(20),
  optimal_difficulty VARCHAR(20),
  session_duration_minutes INTEGER,
  expected_cognitive_load DECIMAL(3,2),
  break_suggestions TEXT[],
  preparation_tips TEXT[]
) AS $$
DECLARE
  best_time_slot VARCHAR(20);
  current_hour INTEGER;
BEGIN
  current_hour := EXTRACT(HOUR FROM NOW());
  
  -- Find user's best performing time slot
  SELECT time_of_day INTO best_time_slot
  FROM analyze_user_cognitive_load_patterns(p_user_id)
  ORDER BY avg_cognitive_load ASC
  LIMIT 1;
  
  RETURN QUERY
  WITH optimization AS (
    SELECT * FROM optimize_session_parameters(p_user_id)
  )
  SELECT 
    COALESCE(best_time_slot, 
      CASE 
        WHEN current_hour BETWEEN 9 AND 11 THEN 'morning'
        WHEN current_hour BETWEEN 14 AND 16 THEN 'afternoon'
        ELSE 'evening'
      END
    ) as recommended_time_slot,
    o.recommended_difficulty,
    o.optimal_session_duration as session_duration_minutes,
    o.cognitive_load_target as expected_cognitive_load,
    ARRAY[
      'Take a ' || o.break_frequency || '-minute break when cognitive load feels high',
      'Limit to ' || o.max_questions_per_session || ' questions per session',
      'Stop if accuracy drops below 60%'
    ] as break_suggestions,
    ARRAY[
      'Ensure good lighting and comfortable seating',
      'Minimize distractions and interruptions',
      'Have water available to stay hydrated',
      'Start with easier questions to warm up'
    ] as preparation_tips
  FROM optimization o;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON FUNCTION calculate_cognitive_load_score IS 'Calculates cognitive load score based on Swellers Cognitive Load Theory';
COMMENT ON FUNCTION analyze_user_cognitive_load_patterns IS 'Analyzes user cognitive load patterns across different times of day';
COMMENT ON FUNCTION detect_cognitive_overload IS 'Real-time detection of cognitive overload with recommendations';
COMMENT ON FUNCTION optimize_session_parameters IS 'Optimizes learning session parameters based on cognitive load analysis';
COMMENT ON FUNCTION get_cognitive_load_recommendations IS 'Provides personalized recommendations for optimal learning sessions';