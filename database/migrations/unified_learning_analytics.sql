-- Unified Learning Session Analytics Table
-- Creates comprehensive analytics table for both quiz and course learning sessions
-- Includes scientific learning analysis fields (forgetting curve, cognitive load, flow state)

CREATE TABLE unified_learning_session_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Session Type and Identification
  session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('quiz', 'course', 'mixed')),
  quiz_session_id UUID REFERENCES quiz_sessions(id),
  course_session_id VARCHAR(100),
  course_id VARCHAR(100),
  theme_id VARCHAR(100),
  genre_id VARCHAR(100),
  
  -- Time Tracking
  session_start_time TIMESTAMPTZ NOT NULL,
  session_end_time TIMESTAMPTZ NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  
  -- Content Classification
  category_id VARCHAR(100) NOT NULL,
  subcategory_id VARCHAR(100) NOT NULL,
  difficulty_level VARCHAR(20) NOT NULL CHECK (difficulty_level IN ('basic', 'intermediate', 'advanced', 'expert')),
  
  -- Performance Metrics (Quiz-specific)
  questions_total INTEGER DEFAULT 0 CHECK (questions_total >= 0),
  questions_correct INTEGER DEFAULT 0 CHECK (questions_correct >= 0),
  accuracy_rate DECIMAL(5,2) DEFAULT 0 CHECK (accuracy_rate >= 0 AND accuracy_rate <= 100),
  average_response_time_ms INTEGER DEFAULT 0 CHECK (average_response_time_ms >= 0),
  
  -- Performance Metrics (Course-specific)
  completion_rate DECIMAL(5,2) DEFAULT 0 CHECK (completion_rate >= 0 AND completion_rate <= 100),
  
  -- Scientific Learning Analysis
  cognitive_load_score DECIMAL(3,2) DEFAULT 0 CHECK (cognitive_load_score >= 0 AND cognitive_load_score <= 10),
  attention_breaks INTEGER DEFAULT 0 CHECK (attention_breaks >= 0),
  flow_state_duration INTEGER DEFAULT 0 CHECK (flow_state_duration >= 0),
  flow_state_index DECIMAL(3,2) DEFAULT 0 CHECK (flow_state_index >= 0 AND flow_state_index <= 1),
  
  -- Forgetting Curve & Spaced Repetition
  forgetting_curve_data JSONB,
  spaced_repetition_due TIMESTAMPTZ,
  optimal_review_interval INTEGER CHECK (optimal_review_interval > 0),
  
  -- Contextual Information
  time_of_day VARCHAR(10) NOT NULL, -- Format: 'HH:mm'
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  device_type VARCHAR(50),
  interruption_count INTEGER DEFAULT 0 CHECK (interruption_count >= 0),
  
  -- User Experience
  energy_level_reported INTEGER CHECK (energy_level_reported >= 1 AND energy_level_reported <= 10),
  engagement_score DECIMAL(3,2) DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 10),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_session_reference CHECK (
    (session_type = 'quiz' AND quiz_session_id IS NOT NULL) OR
    (session_type = 'course' AND course_session_id IS NOT NULL) OR
    (session_type = 'mixed' AND (quiz_session_id IS NOT NULL OR course_session_id IS NOT NULL))
  ),
  CONSTRAINT valid_duration CHECK (
    EXTRACT(EPOCH FROM (session_end_time - session_start_time)) = duration_seconds
  ),
  CONSTRAINT valid_accuracy CHECK (
    questions_total = 0 OR questions_correct <= questions_total
  )
);

-- Indexes for Performance
CREATE INDEX idx_unified_analytics_user_id ON unified_learning_session_analytics(user_id);
CREATE INDEX idx_unified_analytics_session_type ON unified_learning_session_analytics(session_type);
CREATE INDEX idx_unified_analytics_category ON unified_learning_session_analytics(category_id, subcategory_id);
CREATE INDEX idx_unified_analytics_time ON unified_learning_session_analytics(session_start_time);
CREATE INDEX idx_unified_analytics_spaced_repetition ON unified_learning_session_analytics(user_id, spaced_repetition_due) WHERE spaced_repetition_due IS NOT NULL;

-- Composite indexes for common queries
CREATE INDEX idx_unified_analytics_user_time ON unified_learning_session_analytics(user_id, session_start_time DESC);
CREATE INDEX idx_unified_analytics_user_category_time ON unified_learning_session_analytics(user_id, category_id, session_start_time DESC);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_unified_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_unified_analytics_updated_at_trigger
  BEFORE UPDATE ON unified_learning_session_analytics
  FOR EACH ROW EXECUTE FUNCTION update_unified_analytics_updated_at();

-- Comments for documentation
COMMENT ON TABLE unified_learning_session_analytics IS 'Comprehensive analytics table tracking both quiz and course learning sessions with scientific learning analysis';
COMMENT ON COLUMN unified_learning_session_analytics.session_type IS 'Type of learning session: quiz, course, or mixed';
COMMENT ON COLUMN unified_learning_session_analytics.cognitive_load_score IS 'Cognitive load measured on scale 0-10 based on response patterns';
COMMENT ON COLUMN unified_learning_session_analytics.flow_state_index IS 'Flow state measurement 0-1 based on engagement and performance';
COMMENT ON COLUMN unified_learning_session_analytics.forgetting_curve_data IS 'JSON data for personalized forgetting curve analysis';
COMMENT ON COLUMN unified_learning_session_analytics.spaced_repetition_due IS 'Next optimal review time based on forgetting curve';