-- =================================================================
-- Quiz Pre-computation System Database Schema
-- Created: 2025-11-03
-- Purpose: Support instant quiz start through pre-calculated question sets
-- =================================================================

-- ---------------------------------------------------------------
-- STEP 1: Create Enum Type for Quiz Types
-- ---------------------------------------------------------------
-- Create custom type for quiz_type if not exists
DO $$ BEGIN
    CREATE TYPE quiz_type_enum AS ENUM ('business-ai', 'self-personalized', 'category', 'review');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ---------------------------------------------------------------
-- STEP 2: Pre-computed Quiz Sets Table
-- ---------------------------------------------------------------
-- This table stores pre-calculated question sets for each user/quiz type
-- Generated during quiz completion for instant access on next start
CREATE TABLE IF NOT EXISTS precomputed_quiz_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    quiz_type quiz_type_enum NOT NULL,
    
    -- Specific filters for category-based quiz types
    category_filter TEXT[], -- Used for category quizzes: ['category1', 'category2']
    difficulty_filter TEXT[], -- Used for difficulty filtering: ['basic', 'intermediate']
    
    -- Pre-selected question IDs (main payload)
    question_ids INTEGER[] NOT NULL, -- Array of quiz_questions.id
    
    -- Analysis data from AI optimization (for debugging/monitoring)
    analysis_data JSONB NOT NULL DEFAULT '{}', -- Stores optimization results, weights, etc.
    
    -- Settings hash for detecting changes (self-personalized quizzes)
    user_settings_hash TEXT, -- Hash of user quiz settings to detect changes
    
    -- Lifecycle management
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '72 hours', -- 3 days expiry
    used_at TIMESTAMP WITH TIME ZONE NULL, -- Mark when set was consumed
    
    -- Version for tracking regenerations
    version INTEGER DEFAULT 1,
    
    -- Validation constraints
    CONSTRAINT precomputed_quiz_sets_valid_questions 
        CHECK (array_length(question_ids, 1) BETWEEN 5 AND 15),
    CONSTRAINT precomputed_quiz_sets_valid_expiry 
        CHECK (expires_at > created_at)
);

-- ---------------------------------------------------------------
-- STEP 3: User Question Usage Tracking Table  
-- ---------------------------------------------------------------
-- Track question usage history for smart random selection and overlap prevention
CREATE TABLE IF NOT EXISTS user_question_usage (
    -- Composite primary key for efficient lookups
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
    
    -- Question metadata (denormalized for performance)
    category_id TEXT NOT NULL,
    subcategory_id TEXT,
    difficulty TEXT NOT NULL,
    
    -- Usage tracking
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 1,
    recent_usage_count INTEGER DEFAULT 1, -- Count in last 30 days
    
    -- Performance tracking
    last_accuracy_rate DECIMAL(3,2), -- 0.00 to 1.00
    avg_time_spent INTEGER, -- seconds
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (user_id, question_id)
);

-- ---------------------------------------------------------------
-- STEP 4: Indexes for Performance Optimization
-- ---------------------------------------------------------------

-- Primary lookup index for precomputed sets
CREATE INDEX IF NOT EXISTS idx_precomputed_quiz_sets_user_type_lookup 
ON precomputed_quiz_sets(user_id, quiz_type, used_at, expires_at);

-- Cleanup index for expired sets
CREATE INDEX IF NOT EXISTS idx_precomputed_quiz_sets_cleanup
ON precomputed_quiz_sets(expires_at) 
WHERE used_at IS NULL;

-- Category-specific lookup for category quizzes
CREATE INDEX IF NOT EXISTS idx_precomputed_quiz_sets_category_filter 
ON precomputed_quiz_sets USING GIN(category_filter)
WHERE quiz_type = 'category';

-- User question usage primary lookups
CREATE INDEX IF NOT EXISTS idx_user_question_usage_category_recent 
ON user_question_usage(user_id, category_id, last_used_at DESC);

-- Recent usage analysis
CREATE INDEX IF NOT EXISTS idx_user_question_usage_recent_activity 
ON user_question_usage(user_id, last_used_at DESC);

-- Question frequency analysis
CREATE INDEX IF NOT EXISTS idx_user_question_usage_frequency 
ON user_question_usage(user_id, category_id, recent_usage_count DESC);

-- ---------------------------------------------------------------
-- STEP 5: Row Level Security (RLS) Policies
-- ---------------------------------------------------------------

-- Enable RLS on both tables
ALTER TABLE precomputed_quiz_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_question_usage ENABLE ROW LEVEL SECURITY;

-- Precomputed Quiz Sets Policies
CREATE POLICY "Users can view their own precomputed quiz sets" 
ON precomputed_quiz_sets FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own precomputed quiz sets" 
ON precomputed_quiz_sets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own precomputed quiz sets" 
ON precomputed_quiz_sets FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own precomputed quiz sets" 
ON precomputed_quiz_sets FOR DELETE 
USING (auth.uid() = user_id);

-- User Question Usage Policies  
CREATE POLICY "Users can view their own question usage" 
ON user_question_usage FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own question usage" 
ON user_question_usage FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own question usage" 
ON user_question_usage FOR UPDATE 
USING (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- STEP 6: Utility Functions for Data Management
-- ---------------------------------------------------------------

-- Function to clean up expired precomputed sets
CREATE OR REPLACE FUNCTION cleanup_expired_precomputed_sets()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM precomputed_quiz_sets 
    WHERE expires_at < NOW() 
    AND used_at IS NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update recent usage counts (run daily)
CREATE OR REPLACE FUNCTION update_recent_usage_counts()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE user_question_usage 
    SET recent_usage_count = (
        SELECT COUNT(*) 
        FROM user_question_usage uqu2 
        WHERE uqu2.user_id = user_question_usage.user_id 
        AND uqu2.question_id = user_question_usage.question_id
        AND uqu2.last_used_at > NOW() - INTERVAL '30 days'
    );
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get smart weights for question selection
CREATE OR REPLACE FUNCTION get_question_smart_weights(
    p_user_id UUID,
    p_category_id TEXT,
    p_difficulties TEXT[]
)
RETURNS TABLE(
    question_id INTEGER,
    smart_weight DECIMAL(5,3)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.id as question_id,
        CASE 
            WHEN uqu.last_used_at IS NULL THEN 1.0
            WHEN uqu.last_used_at > NOW() - INTERVAL '7 days' THEN 
                GREATEST(0.1, EXTRACT(DAYS FROM NOW() - uqu.last_used_at)::DECIMAL / 7.0)
            WHEN uqu.recent_usage_count >= 3 THEN 
                GREATEST(0.2, 1.0 - (uqu.recent_usage_count - 2) * 0.2)
            ELSE 1.0
        END::DECIMAL(5,3) as smart_weight
    FROM quiz_questions q
    LEFT JOIN user_question_usage uqu ON (
        uqu.user_id = p_user_id 
        AND uqu.question_id = q.id
    )
    WHERE q.category = p_category_id
    AND q.difficulty = ANY(p_difficulties);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------
-- STEP 7: Initial Data Verification
-- ---------------------------------------------------------------

-- Verify tables were created successfully
SELECT 
    schemaname,
    tablename,
    hasindexes,
    hasrules
FROM pg_tables 
WHERE tablename IN ('precomputed_quiz_sets', 'user_question_usage')
ORDER BY tablename;

-- Verify indexes were created
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('precomputed_quiz_sets', 'user_question_usage')
ORDER BY tablename, indexname;

-- Show table sizes (should be 0 for new tables)
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats 
WHERE tablename IN ('precomputed_quiz_sets', 'user_question_usage')
ORDER BY tablename, attname;

-- =================================================================
-- Migration Complete - Pre-computation System Ready
-- =================================================================

-- Next steps:
-- 1. Run this script in Supabase SQL Editor
-- 2. Verify all tables and indexes are created
-- 3. Test basic CRUD operations
-- 4. Implement API endpoints
-- 5. Create helper functions in application code

COMMENT ON TABLE precomputed_quiz_sets IS 'Stores pre-calculated question sets for instant quiz starts';
COMMENT ON TABLE user_question_usage IS 'Tracks question usage for smart random selection and optimization';