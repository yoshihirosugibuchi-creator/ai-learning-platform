-- AI学習分析システム用テーブル作成SQL
-- 2025.10.01 - 統合学習分析システム実装

-- 1. 統合学習セッション分析テーブル
CREATE TABLE IF NOT EXISTS unified_learning_session_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL CHECK (session_type IN ('quiz', 'course', 'mixed')),
  session_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  session_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  
  -- セッション関連ID
  quiz_session_id UUID REFERENCES quiz_sessions(id),
  course_session_id UUID,
  course_id TEXT,
  theme_id TEXT,
  genre_id TEXT,
  category_id TEXT NOT NULL,
  subcategory_id TEXT NOT NULL,
  
  -- 学習パフォーマンス
  difficulty_level TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty_level IN ('basic', 'intermediate', 'advanced', 'expert')),
  questions_total INTEGER NOT NULL DEFAULT 0,
  questions_correct INTEGER NOT NULL DEFAULT 0,
  accuracy_rate DECIMAL(5,2) NOT NULL DEFAULT 0.0,
  completion_rate DECIMAL(5,2) NOT NULL DEFAULT 0.0,
  average_response_time_ms INTEGER NOT NULL DEFAULT 0,
  
  -- 認知科学指標
  cognitive_load_score DECIMAL(3,1) NOT NULL DEFAULT 0.0 CHECK (cognitive_load_score >= 0 AND cognitive_load_score <= 10),
  attention_breaks INTEGER NOT NULL DEFAULT 0,
  flow_state_duration INTEGER NOT NULL DEFAULT 0,
  flow_state_index DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (flow_state_index >= 0 AND flow_state_index <= 1),
  
  -- 忘却曲線・復習関連
  forgetting_curve_data JSONB,
  spaced_repetition_due TIMESTAMP WITH TIME ZONE,
  optimal_review_interval INTEGER,
  
  -- コンテキスト情報
  time_of_day TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  device_type TEXT,
  interruption_count INTEGER NOT NULL DEFAULT 0,
  energy_level_reported INTEGER CHECK (energy_level_reported >= 1 AND energy_level_reported <= 10),
  engagement_score DECIMAL(3,1) NOT NULL DEFAULT 0.0 CHECK (engagement_score >= 0 AND engagement_score <= 10),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ユーザー学習プロファイルテーブル
CREATE TABLE IF NOT EXISTS user_learning_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 学習パターン
  optimal_session_length INTEGER NOT NULL DEFAULT 25, -- 分
  peak_performance_hours INTEGER[] NOT NULL DEFAULT ARRAY[9,10,14,15],
  fatigue_threshold DECIMAL(3,1) NOT NULL DEFAULT 6.0,
  recovery_time_needed INTEGER NOT NULL DEFAULT 15, -- 分
  difficulty_progression_rate DECIMAL(3,2) NOT NULL DEFAULT 0.1,
  
  -- 学習スタイル
  learning_style_type TEXT NOT NULL DEFAULT 'balanced' CHECK (learning_style_type IN ('visual', 'auditory', 'kinesthetic', 'balanced')),
  chronotype TEXT NOT NULL DEFAULT 'intermediate' CHECK (chronotype IN ('morning', 'evening', 'intermediate')),
  cognitive_load_tolerance DECIMAL(3,1) NOT NULL DEFAULT 6.0,
  
  -- フロー状態設定
  flow_state_preference JSONB NOT NULL DEFAULT '{"optimal_difficulty": 0.7, "challenge_preference": "moderate", "feedback_frequency": "regular"}',
  
  -- 忘却曲線パラメータ
  forgetting_curve_parameters JSONB NOT NULL DEFAULT '{"decay_rate": 0.5, "consolidation_factor": 0.7, "retention_strength": 0.8}',
  optimal_review_intervals INTEGER[] NOT NULL DEFAULT ARRAY[1,3,7,14,30],
  
  -- 注意・集中関連
  attention_span_minutes INTEGER NOT NULL DEFAULT 45,
  motivation_factors TEXT[] NOT NULL DEFAULT ARRAY['achievement', 'progress_tracking'],
  stress_indicators JSONB NOT NULL DEFAULT '{"high_error_rate": 0.7, "long_response_time": 5000, "frequent_breaks": 3}',
  
  last_analysis_update TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 間隔反復学習スケジュールテーブル
CREATE TABLE IF NOT EXISTS spaced_repetition_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- コンテンツ情報
  content_type TEXT NOT NULL CHECK (content_type IN ('quiz_question', 'course_material', 'concept', 'skill')),
  content_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  subcategory_id TEXT NOT NULL,
  
  -- スケジュール情報
  initial_learning_date TIMESTAMP WITH TIME ZONE NOT NULL,
  last_review_date TIMESTAMP WITH TIME ZONE,
  next_review_date TIMESTAMP WITH TIME ZONE NOT NULL,
  review_count INTEGER NOT NULL DEFAULT 0,
  
  -- 習熟度指標
  mastery_level DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (mastery_level >= 0 AND mastery_level <= 1),
  difficulty_adjustment DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  retention_strength DECIMAL(3,2) NOT NULL DEFAULT 0.5,
  forgetting_curve_slope DECIMAL(5,3) NOT NULL DEFAULT 0.5,
  optimal_interval_days INTEGER NOT NULL DEFAULT 1,
  priority_score INTEGER NOT NULL DEFAULT 5 CHECK (priority_score >= 1 AND priority_score <= 10),
  
  -- ステータス
  is_mastered BOOLEAN NOT NULL DEFAULT FALSE,
  scheduled_by TEXT NOT NULL DEFAULT 'system',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 一意制約
  UNIQUE(user_id, content_type, content_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_unified_analytics_user_date ON unified_learning_session_analytics(user_id, session_start_time);
CREATE INDEX IF NOT EXISTS idx_unified_analytics_category ON unified_learning_session_analytics(category_id, subcategory_id);
CREATE INDEX IF NOT EXISTS idx_unified_analytics_session_type ON unified_learning_session_analytics(session_type);
CREATE INDEX IF NOT EXISTS idx_spaced_repetition_due ON spaced_repetition_schedule(user_id, next_review_date);
CREATE INDEX IF NOT EXISTS idx_spaced_repetition_content ON spaced_repetition_schedule(content_type, content_id);

-- Row Level Security (RLS) 設定
ALTER TABLE unified_learning_session_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_learning_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaced_repetition_schedule ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: ユーザーは自分のデータのみアクセス可能
CREATE POLICY IF NOT EXISTS "Users can view own analytics" ON unified_learning_session_analytics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own profile" ON user_learning_profiles
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can view own schedule" ON spaced_repetition_schedule
  FOR ALL USING (auth.uid() = user_id);

-- トリガー: updated_at自動更新
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_unified_analytics_updated_at 
  BEFORE UPDATE ON unified_learning_session_analytics 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_user_profiles_updated_at 
  BEFORE UPDATE ON user_learning_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_spaced_repetition_updated_at 
  BEFORE UPDATE ON spaced_repetition_schedule 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();