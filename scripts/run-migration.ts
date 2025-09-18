#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

// Create admin client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...')
    
    // Read migration file
    const migrationPath = join(process.cwd(), 'database', 'complete_migration.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    console.log('📄 Migration file loaded, executing SQL...')
    
    // Execute migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }
    
    console.log('✅ Migration completed successfully!')
    
    // Test table creation
    const { data, error: testError } = await supabase
      .from('user_badges')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.warn('⚠️ Warning: user_badges table test failed:', testError)
    } else {
      console.log('✅ user_badges table is accessible')
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error)
    process.exit(1)
  }
}

runMigration()