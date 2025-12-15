import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConstraints() {
  try {
    // Check table constraints
    const { data: constraints, error: _error } = await supabase
      .rpc('get_table_constraints', { table_name: 'learning_courses' })
      .catch(() => null);

    if (!constraints) {
      // Try a different approach - check actual data
      console.log('Checking actual learning_courses data for difficulty values...');
      
      const { data: courses, error: coursesError } = await supabase
        .from('learning_courses')
        .select('difficulty')
        .limit(50);

      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
        return;
      }

      const difficulties = [...new Set(courses.map(c => c.difficulty))];
      console.log('Actual difficulty values in learning_courses:', difficulties);

      // Try to insert a test 'basic' value to see if constraints exist
      console.log('\nTrying to check if basic value is allowed...');
      const testResult = await supabase
        .from('learning_courses')
        .select('difficulty')
        .eq('difficulty', 'basic')
        .limit(1);

      if (testResult.error) {
        console.log('Error querying basic difficulty:', testResult.error.message);
      } else {
        console.log('Basic difficulty records found:', testResult.data.length);
      }

      // Check skill_levels data
      console.log('\nChecking skill_levels IDs...');
      const { data: skillLevels, error: skillError } = await supabase
        .from('skill_levels')
        .select('id, name, display_order')
        .order('display_order');

      if (skillError) {
        console.error('Error fetching skill levels:', skillError);
      } else {
        console.log('skill_levels data:');
        skillLevels.forEach(level => {
          console.log(`  ID: ${level.id}, Name: ${level.name}`);
        });
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkConstraints();