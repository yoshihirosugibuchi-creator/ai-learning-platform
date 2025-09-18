#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'

// Environment variables - using anon key for now
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createUserBadgesTable() {
  console.log('🚀 Creating user_badges table...')
  
  try {
    // Check if table already exists by trying to query it
    const { data, error: existsError } = await supabase
      .from('user_badges')
      .select('id')
      .limit(1)
    
    if (!existsError) {
      console.log('✅ user_badges table already exists')
      return
    }
    
    console.log('📝 Table does not exist, need to create it manually in Supabase dashboard')
    console.log('')
    console.log('🔧 Please run the following SQL in your Supabase SQL editor:')
    console.log('')
    console.log(`
-- Create user_badges table
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id VARCHAR(100) NOT NULL,
  course_name VARCHAR(200) NOT NULL,
  badge_id VARCHAR(100) NOT NULL,
  badge_title VARCHAR(200) NOT NULL,
  badge_description TEXT,
  badge_image_url VARCHAR(500),
  badge_color VARCHAR(50),
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  validity_period_months INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_course_id ON user_badges(course_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON user_badges(earned_at);

-- Enable RLS
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own badges" ON user_badges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own badges" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);
`)
    
    console.log('')
    console.log('📍 Steps to fix:')
    console.log('1. Go to https://supabase.com/dashboard/project/<your-project>/sql')
    console.log('2. Copy and paste the SQL above')
    console.log('3. Click "Run" to execute the SQL')
    console.log('4. Restart your development server')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

createUserBadgesTable()