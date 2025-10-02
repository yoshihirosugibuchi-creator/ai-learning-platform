-- Spaced Repetition Schedule Table
-- Manages scientifically-optimized review schedules based on Ebbinghaus forgetting curve
-- Implements personalized spaced repetition algorithm for maximum retention

CREATE TABLE spaced_repetition_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Content Identification
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('quiz_question', 'course_material', 'concept', 'skill')),
  content_id VARCHAR(100) NOT NULL,
  category_id VARCHAR(100) NOT NULL,
  subcategory_id VARCHAR(100) NOT NULL,
  
  -- Learning Timeline
  initial_learning_date TIMESTAMPTZ NOT NULL,
  last_review_date TIMESTAMPTZ,
  next_review_date TIMESTAMPTZ NOT NULL,
  
  -- Progress Tracking
  review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
  mastery_level DECIMAL(3,2) DEFAULT 0 CHECK (mastery_level >= 0 AND mastery_level <= 1),
  
  -- Difficulty and Performance Adjustments
  difficulty_adjustment DECIMAL(3,2) DEFAULT 1.0 CHECK (difficulty_adjustment BETWEEN 0.1 AND 3.0),
  retention_strength DECIMAL(3,2) DEFAULT 0.5 CHECK (retention_strength BETWEEN 0 AND 1),
  
  -- Forgetting Curve Parameters
  forgetting_curve_slope DECIMAL(5,3) DEFAULT 0.500 CHECK (forgetting_curve_slope BETWEEN 0.001 AND 2.000),
  optimal_interval_days INTEGER DEFAULT 1 CHECK (optimal_interval_days >= 1),
  
  -- Priority and Scheduling
  priority_score DECIMAL(3,2) DEFAULT 5.0 CHECK (priority_score BETWEEN 1.0 AND 10.0),
  is_mastered BOOLEAN DEFAULT FALSE,
  scheduled_by VARCHAR(20) DEFAULT 'algorithm' CHECK (scheduled_by IN ('algorithm', 'user_request', 'system_trigger')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT unique_user_content UNIQUE (user_id, content_type, content_id),
  CONSTRAINT valid_review_dates CHECK (
    (last_review_date IS NULL AND review_count = 0) OR
    (last_review_date IS NOT NULL AND review_count > 0)
  ),
  CONSTRAINT valid_mastery CHECK (
    (is_mastered = FALSE) OR 
    (is_mastered = TRUE AND mastery_level >= 0.85)
  )
);

-- Indexes for Performance
CREATE INDEX idx_spaced_repetition_user_id ON spaced_repetition_schedule(user_id);
CREATE INDEX idx_spaced_repetition_next_review ON spaced_repetition_schedule(next_review_date);
CREATE INDEX idx_spaced_repetition_due_today ON spaced_repetition_schedule(user_id, next_review_date) 
  WHERE is_mastered = FALSE;
CREATE INDEX idx_spaced_repetition_category ON spaced_repetition_schedule(user_id, category_id, subcategory_id);
CREATE INDEX idx_spaced_repetition_priority ON spaced_repetition_schedule(user_id, priority_score DESC) 
  WHERE is_mastered = FALSE;

-- Composite indexes for common queries
CREATE INDEX idx_spaced_repetition_user_content ON spaced_repetition_schedule(user_id, content_type, content_id);
CREATE INDEX idx_spaced_repetition_overdue ON spaced_repetition_schedule(user_id, next_review_date) 
  WHERE is_mastered = FALSE;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_spaced_repetition_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_spaced_repetition_updated_at_trigger
  BEFORE UPDATE ON spaced_repetition_schedule
  FOR EACH ROW EXECUTE FUNCTION update_spaced_repetition_updated_at();

-- Function to calculate next review date based on forgetting curve
CREATE OR REPLACE FUNCTION calculate_next_review_date(
  p_user_id UUID,
  p_content_id VARCHAR(100),
  p_performance_score DECIMAL(3,2), -- 0-1 scale (0=failed, 1=perfect)
  p_response_time_ms INTEGER DEFAULT NULL
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  current_schedule RECORD;
  base_interval INTEGER;
  performance_multiplier DECIMAL(3,2);
  difficulty_factor DECIMAL(3,2);
  new_interval_days INTEGER;
  retention_factor DECIMAL(3,2);
BEGIN
  -- Get current schedule record
  SELECT * INTO current_schedule
  FROM spaced_repetition_schedule
  WHERE user_id = p_user_id AND content_id = p_content_id;
  
  -- Default intervals based on SuperMemo algorithm
  CASE current_schedule.review_count
    WHEN 0 THEN base_interval := 1;      -- First review: 1 day
    WHEN 1 THEN base_interval := 3;      -- Second review: 3 days
    WHEN 2 THEN base_interval := 7;      -- Third review: 1 week
    WHEN 3 THEN base_interval := 14;     -- Fourth review: 2 weeks
    WHEN 4 THEN base_interval := 30;     -- Fifth review: 1 month
    ELSE base_interval := LEAST(current_schedule.optimal_interval_days * 2, 180); -- Cap at 6 months
  END CASE;
  
  -- Performance-based multiplier
  performance_multiplier := CASE
    WHEN p_performance_score >= 0.9 THEN 1.5    -- Excellent: extend interval
    WHEN p_performance_score >= 0.8 THEN 1.2    -- Good: slight extension
    WHEN p_performance_score >= 0.6 THEN 1.0    -- Acceptable: normal interval
    WHEN p_performance_score >= 0.4 THEN 0.7    -- Poor: shorter interval
    ELSE 0.5                                     -- Failed: much shorter interval
  END;
  
  -- Difficulty adjustment factor
  difficulty_factor := current_schedule.difficulty_adjustment;
  
  -- Calculate retention factor based on individual forgetting curve
  retention_factor := 1.0 + (current_schedule.retention_strength - 0.5);
  
  -- Calculate final interval
  new_interval_days := GREATEST(1, 
    (base_interval * performance_multiplier * difficulty_factor * retention_factor)::INTEGER
  );
  
  -- Return next review date
  RETURN NOW() + INTERVAL '1 day' * new_interval_days;
END;
$$ LANGUAGE plpgsql;

-- Function to update schedule after review
CREATE OR REPLACE FUNCTION update_review_schedule(
  p_user_id UUID,
  p_content_id VARCHAR(100),
  p_performance_score DECIMAL(3,2),
  p_response_time_ms INTEGER DEFAULT NULL
) RETURNS void AS $$
DECLARE
  new_mastery_level DECIMAL(3,2);
  new_retention_strength DECIMAL(3,2);
  next_review TIMESTAMPTZ;
BEGIN
  -- Calculate new mastery level (exponential moving average)
  SELECT 
    LEAST(1.0, 
      COALESCE(mastery_level * 0.8 + p_performance_score * 0.2, p_performance_score)
    ),
    LEAST(1.0,
      COALESCE(retention_strength * 0.9 + (p_performance_score - 0.5) * 0.1, 0.5)
    )
  INTO new_mastery_level, new_retention_strength
  FROM spaced_repetition_schedule
  WHERE user_id = p_user_id AND content_id = p_content_id;
  
  -- Calculate next review date
  next_review := calculate_next_review_date(p_user_id, p_content_id, p_performance_score, p_response_time_ms);
  
  -- Update schedule
  UPDATE spaced_repetition_schedule
  SET 
    last_review_date = NOW(),
    next_review_date = next_review,
    review_count = review_count + 1,
    mastery_level = new_mastery_level,
    retention_strength = new_retention_strength,
    optimal_interval_days = EXTRACT(DAY FROM (next_review - NOW()))::INTEGER,
    is_mastered = (new_mastery_level >= 0.85 AND review_count >= 3),
    updated_at = NOW()
  WHERE user_id = p_user_id AND content_id = p_content_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get due reviews for a user
CREATE OR REPLACE FUNCTION get_due_reviews(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  id UUID,
  content_type VARCHAR(20),
  content_id VARCHAR(100),
  category_id VARCHAR(100),
  subcategory_id VARCHAR(100),
  days_overdue INTEGER,
  priority_score DECIMAL(3,2),
  mastery_level DECIMAL(3,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sr.id,
    sr.content_type,
    sr.content_id,
    sr.category_id,
    sr.subcategory_id,
    GREATEST(0, EXTRACT(DAY FROM (NOW() - sr.next_review_date))::INTEGER) as days_overdue,
    sr.priority_score,
    sr.mastery_level
  FROM spaced_repetition_schedule sr
  WHERE sr.user_id = p_user_id
    AND sr.next_review_date <= NOW()
    AND sr.is_mastered = FALSE
  ORDER BY 
    sr.priority_score DESC,
    sr.next_review_date ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to add new content to spaced repetition
CREATE OR REPLACE FUNCTION add_to_spaced_repetition(
  p_user_id UUID,
  p_content_type VARCHAR(20),
  p_content_id VARCHAR(100),
  p_category_id VARCHAR(100),
  p_subcategory_id VARCHAR(100),
  p_initial_difficulty DECIMAL(3,2) DEFAULT 1.0
) RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO spaced_repetition_schedule (
    user_id,
    content_type,
    content_id,
    category_id,
    subcategory_id,
    initial_learning_date,
    next_review_date,
    difficulty_adjustment,
    priority_score
  ) VALUES (
    p_user_id,
    p_content_type,
    p_content_id,
    p_category_id,
    p_subcategory_id,
    NOW(),
    NOW() + INTERVAL '1 day', -- First review tomorrow
    p_initial_difficulty,
    5.0 -- Default priority
  )
  ON CONFLICT (user_id, content_type, content_id) DO NOTHING
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE spaced_repetition_schedule IS 'Scientifically-optimized review schedules based on personalized forgetting curves';
COMMENT ON COLUMN spaced_repetition_schedule.mastery_level IS 'Current mastery level (0-1) calculated from review performance';
COMMENT ON COLUMN spaced_repetition_schedule.retention_strength IS 'Personal retention strength affecting forgetting curve slope';
COMMENT ON COLUMN spaced_repetition_schedule.forgetting_curve_slope IS 'Personalized forgetting curve decay rate';
COMMENT ON COLUMN spaced_repetition_schedule.priority_score IS 'Priority score (1-10) for scheduling when multiple reviews are due';
COMMENT ON FUNCTION calculate_next_review_date IS 'Calculates optimal next review date based on performance and individual forgetting curve';
COMMENT ON FUNCTION update_review_schedule IS 'Updates schedule after a review session with performance data';
COMMENT ON FUNCTION get_due_reviews IS 'Returns prioritized list of content due for review';