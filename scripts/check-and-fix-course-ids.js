/**
 * コースID修正スクリプト
 * AI を深堀する、AI研究の今を学ぶ のIDを正しい英語IDに修正
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Microsoft Translator
const translateWithMicrosoft = async (text) => {
  const subscriptionKey = process.env.MICROSOFT_TRANSLATOR_KEY;
  if (!subscriptionKey) {
    console.warn('MICROSOFT_TRANSLATOR_KEY not found');
    return null;
  }

  const endpoint = 'https://api.cognitive.microsofttranslator.com/translate';
  const params = new URLSearchParams({
    'api-version': '3.0',
    'to': 'en',
    'from': 'ja'
  });

  const response = await fetch(`${endpoint}?${params}`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Region': 'japaneast'
    },
    body: JSON.stringify([{ text }])
  });

  if (!response.ok) {
    console.warn('Translation failed:', response.status);
    return null;
  }

  const result = await response.json();
  if (result && result.length > 0 && result[0].translations) {
    return result[0].translations[0].text;
  }
  return null;
};

// ID生成
const generateId = async (title) => {
  console.log(`  翻訳中: "${title}"`);
  const translated = await translateWithMicrosoft(title);

  if (!translated) {
    console.log(`  翻訳失敗`);
    return null;
  }

  console.log(`  翻訳結果: "${translated}"`);

  const cleanId = translated
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);

  console.log(`  生成ID: "${cleanId}"`);
  return cleanId;
};

async function checkAndFixCourseIds() {
  const courseTitles = ['AI を深堀する', 'AI研究の今を学ぶ'];

  for (const title of courseTitles) {
    console.log('\n========================================');
    console.log('コース:', title);
    console.log('========================================');

    const { data: course } = await supabase
      .from('learning_courses')
      .select('id, title')
      .eq('title', title)
      .single();

    if (!course) {
      console.log('コースが見つかりません');
      continue;
    }

    console.log('\n現在のコースID:', course.id);

    // 新しいコースIDを生成
    const newCourseId = await generateId(course.title);
    if (!newCourseId) continue;

    // ジャンル取得
    const { data: genres } = await supabase
      .from('learning_genres')
      .select('id, title, display_order')
      .eq('course_id', course.id)
      .order('display_order');

    console.log('\n--- ジャンル ---');
    const genreIdMap = {};
    for (const g of genres || []) {
      console.log(`\n現在ID: ${g.id} | Title: ${g.title}`);
      const newGenreId = await generateId(g.title);
      if (newGenreId) {
        genreIdMap[g.id] = newGenreId;
      }

      // テーマ取得
      const { data: themes } = await supabase
        .from('learning_themes')
        .select('id, title, display_order')
        .eq('genre_id', g.id)
        .order('display_order');

      const themeIdMap = {};
      for (const t of themes || []) {
        console.log(`  現在テーマID: ${t.id} | Title: ${t.title}`);
        const newThemeId = await generateId(t.title);
        if (newThemeId) {
          themeIdMap[t.id] = newThemeId;
        }

        // セッション取得
        const { data: sessions } = await supabase
          .from('learning_sessions')
          .select('id, title, display_order')
          .eq('theme_id', t.id)
          .order('display_order');

        for (const s of sessions || []) {
          console.log(`    現在セッションID: ${s.id} | Title: ${s.title}`);
          const newSessionId = await generateId(s.title);

          if (newSessionId) {
            // セッションID更新
            const { error: sessErr } = await supabase
              .from('learning_sessions')
              .update({ id: newSessionId })
              .eq('id', s.id);

            if (sessErr) {
              console.log(`    ❌ セッションID更新失敗:`, sessErr.message);
            } else {
              console.log(`    ✅ セッションID更新: ${s.id} → ${newSessionId}`);
            }
          }
        }

        // テーマID更新
        if (themeIdMap[t.id]) {
          const { error: themeErr } = await supabase
            .from('learning_themes')
            .update({ id: themeIdMap[t.id] })
            .eq('id', t.id);

          if (themeErr) {
            console.log(`  ❌ テーマID更新失敗:`, themeErr.message);
          } else {
            console.log(`  ✅ テーマID更新: ${t.id} → ${themeIdMap[t.id]}`);
          }
        }
      }

      // ジャンルID更新
      if (genreIdMap[g.id]) {
        const { error: genreErr } = await supabase
          .from('learning_genres')
          .update({ id: genreIdMap[g.id] })
          .eq('id', g.id);

        if (genreErr) {
          console.log(`❌ ジャンルID更新失敗:`, genreErr.message);
        } else {
          console.log(`✅ ジャンルID更新: ${g.id} → ${genreIdMap[g.id]}`);
        }
      }
    }

    // コースID更新
    console.log('\n--- コースID更新 ---');
    const { error: courseErr } = await supabase
      .from('learning_courses')
      .update({ id: newCourseId })
      .eq('id', course.id);

    if (courseErr) {
      console.log(`❌ コースID更新失敗:`, courseErr.message);
    } else {
      console.log(`✅ コースID更新: ${course.id} → ${newCourseId}`);

      // ワークフローのpublished_course_idも更新
      const { error: wfErr } = await supabase
        .from('ai_course_workflows')
        .update({ published_course_id: newCourseId })
        .eq('title', title);

      if (wfErr) {
        console.log(`❌ ワークフロー更新失敗:`, wfErr.message);
      } else {
        console.log(`✅ ワークフローのpublished_course_id更新`);
      }
    }
  }

  console.log('\n========================================');
  console.log('完了');
  console.log('========================================');
}

checkAndFixCourseIds().catch(console.error);
