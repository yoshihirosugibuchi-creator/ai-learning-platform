const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

(async () => {
  try {
    console.log('🔍 Searching for multiple_choice quiz records...\n');

    // Query all quiz records with multiple_choice type
    const { data: multipleChoiceQuizzes, error } = await supabaseAdmin
      .from('session_quizzes')
      .select('*')
      .eq('quiz_type', 'multiple_choice');

    if (error) {
      console.error('❌ Error querying multiple_choice quizzes:', error);
      return;
    }

    console.log(`📊 Multiple choice quizzes found: ${multipleChoiceQuizzes?.length || 0}\n`);
    
    if (multipleChoiceQuizzes && multipleChoiceQuizzes.length > 0) {
      console.log('📋 Quiz Details:');
      console.log('='.repeat(80));
      
      for (let i = 0; i < multipleChoiceQuizzes.length; i++) {
        const quiz = multipleChoiceQuizzes[i];
        console.log(`${i + 1}. Quiz ID: ${quiz.id}`);
        console.log(`   Session ID: ${quiz.session_id}`);
        console.log(`   Question: ${quiz.question}`);
        console.log(`   Options: ${JSON.stringify(quiz.options, null, 2)}`);
        console.log(`   Correct Answer: ${quiz.correct_answer}`);
        console.log(`   Explanation: ${quiz.explanation || 'N/A'}`);
        console.log(`   Display Order: ${quiz.display_order || 'N/A'}`);
        console.log(`   Created: ${quiz.created_at}`);
        console.log(`   Updated: ${quiz.updated_at || 'N/A'}`);
        console.log('-'.repeat(40));
      }
      
      // Get related session information
      console.log('\n🔗 Related Session & Hierarchy Information:');
      console.log('='.repeat(80));
      
      for (const quiz of multipleChoiceQuizzes) {
        console.log(`\nQuiz ${quiz.id}:`);
        
        // Get session
        const { data: session } = await supabaseAdmin
          .from('learning_sessions')
          .select('id, title, theme_id, session_type')
          .eq('id', quiz.session_id)
          .single();
        
        if (session) {
          console.log(`  Session: ${session.title} (${session.session_type})`);
          
          // Get theme
          const { data: theme } = await supabaseAdmin
            .from('learning_themes')
            .select('id, title, genre_id')
            .eq('id', session.theme_id)
            .single();
          
          if (theme) {
            console.log(`  Theme: ${theme.title}`);
            
            // Get genre
            const { data: genre } = await supabaseAdmin
              .from('learning_genres')
              .select('id, title, course_id')
              .eq('id', theme.genre_id)
              .single();
            
            if (genre) {
              console.log(`  Genre: ${genre.title}`);
              console.log(`  Course ID: ${genre.course_id}`);
            }
          }
        } else {
          console.log('  ❌ Session not found - orphaned quiz record');
        }
      }

      // Check for any dependencies
      console.log('\n🔄 Checking Dependencies:');
      console.log('='.repeat(80));
      
      // Check if any user has completed these sessions
      for (const quiz of multipleChoiceQuizzes) {
        const { data: completions, error: compError } = await supabaseAdmin
          .from('course_session_completions')
          .select('user_id, created_at')
          .eq('session_id', quiz.session_id)
          .limit(5);

        if (!compError && completions && completions.length > 0) {
          console.log(`⚠️  Quiz ${quiz.id} - Session has ${completions.length} user completions`);
          console.log(`   Recent completions: ${completions.map(c => c.user_id).slice(0, 3).join(', ')}`);
        } else {
          console.log(`✅ Quiz ${quiz.id} - No user completions found`);
        }
      }

    } else {
      console.log('✅ No multiple_choice quizzes found in the database');
      console.log('   This means the issue may have been already resolved');
      console.log('   or the data was from a different source.');
    }

    // Also check for any inconsistent quiz_type values
    console.log('\n🔍 Checking for other quiz_type values:');
    const { data: allQuizTypes } = await supabaseAdmin
      .from('session_quizzes')
      .select('quiz_type')
      .not('quiz_type', 'eq', 'single_choice');

    if (allQuizTypes && allQuizTypes.length > 0) {
      const uniqueTypes = [...new Set(allQuizTypes.map(q => q.quiz_type))];
      console.log('⚠️  Non-standard quiz types found:', uniqueTypes);
    } else {
      console.log('✅ All quiz records use single_choice type');
    }

  } catch (error) {
    console.error('❌ Script error:', error);
  }
})();