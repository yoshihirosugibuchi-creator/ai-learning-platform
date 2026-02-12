require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const titles = ['AI を深堀する', 'AI研究の今を学ぶ'];

  for (const title of titles) {
    console.log('\n=== ' + title + ' ===');

    const { data: course } = await supabase
      .from('learning_courses')
      .select('id')
      .eq('title', title)
      .single();

    if (!course) {
      console.log('Not found');
      continue;
    }
    console.log('Course ID:', course.id);

    const { data: genres } = await supabase
      .from('learning_genres')
      .select('id, title')
      .eq('course_id', course.id);

    for (const g of genres || []) {
      console.log('  Genre:', g.id, '-', g.title);

      const { data: themes } = await supabase
        .from('learning_themes')
        .select('id, title')
        .eq('genre_id', g.id);

      for (const t of themes || []) {
        console.log('    Theme:', t.id, '-', t.title);

        const { data: sessions } = await supabase
          .from('learning_sessions')
          .select('id, title')
          .eq('theme_id', t.id);

        for (const s of sessions || []) {
          console.log('      Session:', s.id, '-', s.title);
        }
      }
    }
  }
}

check().catch(console.error);
