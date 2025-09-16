-- Complete localStorage to Supabase migration SQL
-- This creates all necessary tables for the learning platform

-- 1. SKP Transaction History Table
CREATE TABLE IF NOT EXISTS skp_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('earned', 'spent')),
  amount INTEGER NOT NULL,
  source VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Category Progress Table
CREATE TABLE IF NOT EXISTS category_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id VARCHAR(100) NOT NULL,
  current_level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  total_answers INTEGER DEFAULT 0,
  last_answered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, category_id)
);

-- 3. Wisdom Card Collection Table
CREATE TABLE IF NOT EXISTS wisdom_card_collection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id INTEGER NOT NULL,
  count INTEGER DEFAULT 1,
  obtained_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_obtained_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

-- 4. Knowledge Card Collection Table
CREATE TABLE IF NOT EXISTS knowledge_card_collection (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  card_id INTEGER NOT NULL,
  count INTEGER DEFAULT 1,
  obtained_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_obtained_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

-- 5. Learning Sessions Table
CREATE TABLE IF NOT EXISTS learning_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id VARCHAR(100) NOT NULL,
  course_id VARCHAR(100),
  genre_id VARCHAR(100),
  theme_id VARCHAR(100),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- milliseconds
  completed BOOLEAN DEFAULT FALSE,
  quiz_score INTEGER,
  content_interactions JSONB, -- Store interaction data as JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  setting_key VARCHAR(100) NOT NULL,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, setting_key)
);

-- 7. Detailed Quiz Data Table (for analytics)
CREATE TABLE IF NOT EXISTS detailed_quiz_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_result_id UUID REFERENCES quiz_results(id) ON DELETE CASCADE,
  question_id VARCHAR(100) NOT NULL,
  question_text TEXT NOT NULL,
  selected_answer TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  response_time INTEGER NOT NULL, -- milliseconds
  confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5),
  category VARCHAR(100) NOT NULL,
  difficulty VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_skp_transactions_user_id ON skp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_skp_transactions_timestamp ON skp_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_category_progress_user_id ON category_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_wisdom_card_collection_user_id ON wisdom_card_collection(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_card_collection_user_id ON knowledge_card_collection(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_user_id ON learning_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_sessions_course_id ON learning_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_detailed_quiz_data_user_id ON detailed_quiz_data(user_id);
CREATE INDEX IF NOT EXISTS idx_detailed_quiz_data_quiz_result_id ON detailed_quiz_data(quiz_result_id);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE skp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE wisdom_card_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_card_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE detailed_quiz_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- SKP Transactions policies
CREATE POLICY "Users can view own SKP transactions" ON skp_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own SKP transactions" ON skp_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Category Progress policies
CREATE POLICY "Users can view own category progress" ON category_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own category progress" ON category_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own category progress" ON category_progress FOR UPDATE USING (auth.uid() = user_id);

-- Wisdom Card Collection policies
CREATE POLICY "Users can view own wisdom cards" ON wisdom_card_collection FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wisdom cards" ON wisdom_card_collection FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wisdom cards" ON wisdom_card_collection FOR UPDATE USING (auth.uid() = user_id);

-- Knowledge Card Collection policies
CREATE POLICY "Users can view own knowledge cards" ON knowledge_card_collection FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own knowledge cards" ON knowledge_card_collection FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own knowledge cards" ON knowledge_card_collection FOR UPDATE USING (auth.uid() = user_id);

-- Learning Sessions policies
CREATE POLICY "Users can view own learning sessions" ON learning_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own learning sessions" ON learning_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own learning sessions" ON learning_sessions FOR UPDATE USING (auth.uid() = user_id);

-- User Settings policies
CREATE POLICY "Users can view own settings" ON user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON user_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own settings" ON user_settings FOR DELETE USING (auth.uid() = user_id);

-- Detailed Quiz Data policies
CREATE POLICY "Users can view own detailed quiz data" ON detailed_quiz_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own detailed quiz data" ON detailed_quiz_data FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to relevant tables
CREATE TRIGGER update_category_progress_updated_at BEFORE UPDATE ON category_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_sessions_updated_at BEFORE UPDATE ON learning_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();