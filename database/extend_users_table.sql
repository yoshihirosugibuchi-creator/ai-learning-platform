-- Users table extension for comprehensive profile management
-- Execute this SQL in Supabase SQL Editor

-- Add missing columns to users table if they don't exist
-- Note: This script is safe to run multiple times

-- Basic profile information
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS position_level TEXT,
ADD COLUMN IF NOT EXISTS learning_level TEXT;

-- Industry and experience information  
ALTER TABLE users
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS experience_years INTEGER;

-- Learning preferences (JSONB for flexibility)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS interested_industries JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS learning_goals JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS selected_categories JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS selected_industry_categories JSONB DEFAULT '[]'::jsonb;

-- Learning settings
ALTER TABLE users
ADD COLUMN IF NOT EXISTS weekly_goal TEXT;

-- Additional profile metadata
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_profile_update TIMESTAMPTZ;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_industry ON users(industry);
CREATE INDEX IF NOT EXISTS idx_users_job_title ON users(job_title);
CREATE INDEX IF NOT EXISTS idx_users_experience_years ON users(experience_years);
CREATE INDEX IF NOT EXISTS idx_users_learning_level ON users(learning_level);

-- Add comments for documentation
COMMENT ON COLUMN users.display_name IS 'User preferred display name';
COMMENT ON COLUMN users.job_title IS 'User job title/role';
COMMENT ON COLUMN users.position_level IS 'User position level (entry, junior, mid, senior, lead, director, executive)';
COMMENT ON COLUMN users.learning_level IS 'User learning level (beginner, intermediate, advanced, expert)';
COMMENT ON COLUMN users.industry IS 'User primary industry (category ID)';
COMMENT ON COLUMN users.experience_years IS 'User experience years (0, 2, 5, 10, 16)';
COMMENT ON COLUMN users.interested_industries IS 'Array of interested industry category IDs';
COMMENT ON COLUMN users.learning_goals IS 'Array of learning goals';
COMMENT ON COLUMN users.selected_categories IS 'Array of selected main category IDs';
COMMENT ON COLUMN users.selected_industry_categories IS 'Array of selected industry category IDs';
COMMENT ON COLUMN users.weekly_goal IS 'Weekly learning goal (light, medium, heavy)';
COMMENT ON COLUMN users.profile_completed_at IS 'When user completed initial profile setup';
COMMENT ON COLUMN users.last_profile_update IS 'Last profile update timestamp';

-- Update trigger to automatically set last_profile_update
CREATE OR REPLACE FUNCTION update_last_profile_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_profile_update = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_last_profile_update ON users;
CREATE TRIGGER trigger_update_last_profile_update
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_last_profile_update();