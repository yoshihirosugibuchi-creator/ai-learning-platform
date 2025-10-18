const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  try {
    console.log('🚀 Running knowledge cards migration...');
    
    // Read migration file
    const migrationSQL = fs.readFileSync('./database/knowledge-cards-migration.sql', 'utf8');
    
    console.log('📋 Migration SQL loaded, executing...');
    
    // Execute the full SQL script
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    if (error) {
      console.error('❌ Migration error:', error);
      process.exit(1);
    }
    
    console.log('✅ Migration completed successfully');
    
    // Verify table creation
    const { data: tables, error: tablesError } = await supabase
      .from('knowledge_cards')
      .select('theme_id, title')
      .limit(3);
      
    if (tablesError) {
      console.error('❌ Verification error:', tablesError);
    } else {
      console.log(`✅ Verification: Found ${tables?.length || 0} cards in knowledge_cards table`);
      if (tables && tables.length > 0) {
        console.log('📋 Sample cards:', tables.map(c => `${c.theme_id}: ${c.title}`));
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();