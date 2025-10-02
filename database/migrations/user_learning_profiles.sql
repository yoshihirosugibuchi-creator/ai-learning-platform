-- User Learning Profiles Table
-- Stores personalized learning characteristics and AI-analyzed patterns for each user
-- Based on scientific learning theories and individual behavioral patterns

CREATE TABLE user_learning_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  
  -- Time Management Preferences
  optimal_session_length INTEGER DEFAULT 25 CHECK (optimal_session_length BETWEEN 5 AND 120),
  peak_performance_hours INTEGER[] DEFAULT '{9,10,14,15}',
  fatigue_threshold INTEGER DEFAULT 60 CHECK (fatigue_threshold BETWEEN 15 AND 180),
  recovery_time_needed INTEGER DEFAULT 10 CHECK (recovery_time_needed BETWEEN 5 AND 60),
  
  -- Learning Characteristics
  difficulty_progression_rate DECIMAL(3,2) DEFAULT 1.0 CHECK (difficulty_progression_rate BETWEEN 0.1 AND 3.0),
  learning_style_type VARCHAR(20) DEFAULT 'balanced' CHECK (learning_style_type IN ('visual', 'auditory', 'kinesthetic', 'reading', 'balanced')),
  chronotype VARCHAR(20) DEFAULT 'unknown' CHECK (chronotype IN ('morning', 'evening', 'intermediate', 'unknown')),
  
  -- Cognitive Analysis
  cognitive_load_tolerance DECIMAL(3,2) DEFAULT 5.0 CHECK (cognitive_load_tolerance BETWEEN 1.0 AND 10.0),
  flow_state_preference JSONB DEFAULT '{"preferred_challenge_level": 0.7, "feedback_frequency": "immediate", "goal_clarity": "high"}',
  
  -- Forgetting Curve Personalization
  forgetting_curve_parameters JSONB DEFAULT '{"initial_retention": 0.9, "decay_rate": 0.5, "consolidation_factor": 1.0}',
  optimal_review_intervals INTEGER[] DEFAULT '{1, 3, 7, 14, 30}',
  
  -- Attention and Focus
  attention_span_minutes INTEGER DEFAULT 25 CHECK (attention_span_minutes BETWEEN 5 AND 90),
  motivation_factors TEXT[] DEFAULT '{"progress_tracking", "achievement_badges", "social_comparison"}',
  
  -- Stress and Performance Indicators
  stress_indicators JSONB DEFAULT '{"accuracy_drop_threshold": 0.15, "response_time_spike": 2.0, "error_pattern_sensitivity": 0.8}',
  
  -- Metadata
  last_analysis_update TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_peak_hours CHECK (
    array_length(peak_performance_hours, 1) IS NULL OR 
    array_length(peak_performance_hours, 1) <= 24
  ),
  CONSTRAINT valid_review_intervals CHECK (
    array_length(optimal_review_intervals, 1) IS NULL OR
    array_length(optimal_review_intervals, 1) <= 10
  )
);

-- Indexes for Performance
CREATE INDEX idx_user_learning_profiles_chronotype ON user_learning_profiles(chronotype);
CREATE INDEX idx_user_learning_profiles_learning_style ON user_learning_profiles(learning_style_type);
CREATE INDEX idx_user_learning_profiles_last_update ON user_learning_profiles(last_analysis_update);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_learning_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_analysis_update = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_learning_profiles_updated_at_trigger
  BEFORE UPDATE ON user_learning_profiles
  FOR EACH ROW EXECUTE FUNCTION update_user_learning_profiles_updated_at();

-- Function to initialize default profile for new users
CREATE OR REPLACE FUNCTION initialize_user_learning_profile(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_learning_profiles (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to update profile based on learning session data
CREATE OR REPLACE FUNCTION update_learning_profile_from_sessions(p_user_id UUID)
RETURNS void AS $$
DECLARE
  avg_session_length INTEGER;
  peak_hours INTEGER[];
  fatigue_pattern INTEGER;
  optimal_difficulty DECIMAL(3,2);
BEGIN
  -- Calculate average session length
  SELECT COALESCE(AVG(duration_seconds / 60), 25)::INTEGER
  INTO avg_session_length
  FROM unified_learning_session_analytics
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '30 days';
  
  -- Identify peak performance hours
  SELECT ARRAY_AGG(DISTINCT EXTRACT(HOUR FROM session_start_time)::INTEGER)
  INTO peak_hours
  FROM unified_learning_session_analytics
  WHERE user_id = p_user_id
    AND accuracy_rate > (
      SELECT AVG(accuracy_rate) * 1.1
      FROM unified_learning_session_analytics
      WHERE user_id = p_user_id
    )
    AND created_at >= NOW() - INTERVAL '30 days'
  LIMIT 6;
  
  -- Calculate fatigue threshold
  SELECT COALESCE(AVG(duration_seconds / 60), 60)::INTEGER
  INTO fatigue_pattern
  FROM unified_learning_session_analytics
  WHERE user_id = p_user_id
    AND accuracy_rate < (
      SELECT AVG(accuracy_rate) * 0.9
      FROM unified_learning_session_analytics
      WHERE user_id = p_user_id
    )
    AND created_at >= NOW() - INTERVAL '30 days';
  
  -- Update profile
  UPDATE user_learning_profiles
  SET 
    optimal_session_length = avg_session_length,
    peak_performance_hours = COALESCE(peak_hours, '{9,10,14,15}'),
    fatigue_threshold = fatigue_pattern,
    last_analysis_update = NOW()
  WHERE user_id = p_user_id;
  
  -- Create profile if it doesn't exist
  IF NOT FOUND THEN
    PERFORM initialize_user_learning_profile(p_user_id);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE user_learning_profiles IS 'Personalized learning characteristics and AI-analyzed patterns for optimal learning experience';
COMMENT ON COLUMN user_learning_profiles.optimal_session_length IS 'AI-calculated optimal learning session duration in minutes';
COMMENT ON COLUMN user_learning_profiles.peak_performance_hours IS 'Array of hours (0-23) when user shows best learning performance';
COMMENT ON COLUMN user_learning_profiles.chronotype IS 'Circadian rhythm type: morning person, evening person, or intermediate';
COMMENT ON COLUMN user_learning_profiles.cognitive_load_tolerance IS 'Maximum cognitive load user can handle effectively (1-10 scale)';
COMMENT ON COLUMN user_learning_profiles.flow_state_preference IS 'JSON object defining conditions for optimal flow state';
COMMENT ON COLUMN user_learning_profiles.forgetting_curve_parameters IS 'Personalized parameters for Ebbinghaus forgetting curve';
COMMENT ON COLUMN user_learning_profiles.stress_indicators IS 'JSON object defining thresholds for detecting learning stress';