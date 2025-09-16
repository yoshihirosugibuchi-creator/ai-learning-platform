-- Fix RLS policies for better access control

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own wisdom cards" ON wisdom_card_collection;
DROP POLICY IF EXISTS "Users can insert own wisdom cards" ON wisdom_card_collection;
DROP POLICY IF EXISTS "Users can update own wisdom cards" ON wisdom_card_collection;

DROP POLICY IF EXISTS "Users can view own knowledge cards" ON knowledge_card_collection;
DROP POLICY IF EXISTS "Users can insert own knowledge cards" ON knowledge_card_collection;
DROP POLICY IF EXISTS "Users can update own knowledge cards" ON knowledge_card_collection;

-- Create new policies with proper permissions
-- Wisdom Card Collection policies
CREATE POLICY "Users can manage own wisdom cards" ON wisdom_card_collection
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Knowledge Card Collection policies  
CREATE POLICY "Users can manage own knowledge cards" ON knowledge_card_collection
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Also ensure the tables have proper RLS enabled
ALTER TABLE wisdom_card_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_card_collection ENABLE ROW LEVEL SECURITY;

-- Check if the tables exist and are accessible
SELECT 'wisdom_card_collection' as table_name, count(*) as row_count FROM wisdom_card_collection;
SELECT 'knowledge_card_collection' as table_name, count(*) as row_count FROM knowledge_card_collection;