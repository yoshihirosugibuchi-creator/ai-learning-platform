/**
 * コースを削除してワークフローをリセット
 * 翻訳キーが有効になった状態で再生成できるようにする
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const COURSES_TO_RESET = ['AI を深堀する', 'AI研究の今を学ぶ'];

async function deleteCourseData(courseId, courseTitle) {
  console.log(`\n--- ${courseTitle} (${courseId}) の削除 ---`);

  // 1. ジャンルを取得
  const { data: genres } = await supabase
    .from('learning_genres')
    .select('id')
    .eq('course_id', courseId);

  if (genres && genres.length > 0) {
    const genreIds = genres.map(g => g.id);
    console.log('ジャンル数:', genreIds.length);

    // 2. テーマを取得
    const { data: themes } = await supabase
      .from('learning_themes')
      .select('id')
      .in('genre_id', genreIds);

    if (themes && themes.length > 0) {
      const themeIds = themes.map(t => t.id);
      console.log('テーマ数:', themeIds.length);

      // 3. セッションを取得
      const { data: sessions } = await supabase
        .from('learning_sessions')
        .select('id')
        .in('theme_id', themeIds);

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        console.log('セッション数:', sessionIds.length);

        // 4. セッションコンテンツ削除
        const { error: contentErr } = await supabase
          .from('session_contents')
          .delete()
          .in('session_id', sessionIds);
        console.log('session_contents削除:', contentErr ? 'Error: ' + contentErr.message : 'OK');

        // 5. セッションクイズ削除
        const { error: quizErr } = await supabase
          .from('session_quizzes')
          .delete()
          .in('session_id', sessionIds);
        console.log('session_quizzes削除:', quizErr ? 'Error: ' + quizErr.message : 'OK');

        // 6. セッション削除
        const { error: sessErr } = await supabase
          .from('learning_sessions')
          .delete()
          .in('theme_id', themeIds);
        console.log('learning_sessions削除:', sessErr ? 'Error: ' + sessErr.message : 'OK');
      }

      // 7. テーマ削除
      const { error: themeErr } = await supabase
        .from('learning_themes')
        .delete()
        .in('genre_id', genreIds);
      console.log('learning_themes削除:', themeErr ? 'Error: ' + themeErr.message : 'OK');
    }

    // 8. ジャンル削除
    const { error: genreErr } = await supabase
      .from('learning_genres')
      .delete()
      .eq('course_id', courseId);
    console.log('learning_genres削除:', genreErr ? 'Error: ' + genreErr.message : 'OK');
  }

  // 9. コース削除
  const { error: courseErr } = await supabase
    .from('learning_courses')
    .delete()
    .eq('id', courseId);
  console.log('learning_courses削除:', courseErr ? 'Error: ' + courseErr.message : 'OK');
}

async function resetWorkflow(title) {
  console.log(`\n--- ワークフロー「${title}」リセット ---`);

  // ワークフローをカテゴリマッピングステップ（step 4）に戻す
  const { data: workflow, error: fetchErr } = await supabase
    .from('ai_course_workflows')
    .select('id, current_step, published_course_id')
    .eq('title', title)
    .single();

  if (fetchErr || !workflow) {
    console.log('ワークフローが見つかりません:', fetchErr?.message);
    return;
  }

  console.log('現在の状態: step=' + workflow.current_step + ', published_course_id=' + workflow.published_course_id);

  const { error: updateErr } = await supabase
    .from('ai_course_workflows')
    .update({
      current_step: '4',  // カテゴリマッピングステップに戻す
      published_course_id: null,
      status: 'outline_approved',
      updated_at: new Date().toISOString()
    })
    .eq('id', workflow.id);

  if (updateErr) {
    console.log('ワークフロー更新失敗:', updateErr.message);
  } else {
    console.log('✅ ワークフローリセット完了: step=4, published_course_id=null');
  }
}

async function main() {
  console.log('========================================');
  console.log('コース削除 & ワークフローリセット');
  console.log('========================================');

  for (const title of COURSES_TO_RESET) {
    console.log('\n========================================');
    console.log('処理中:', title);
    console.log('========================================');

    // コースを取得
    const { data: course } = await supabase
      .from('learning_courses')
      .select('id')
      .eq('title', title)
      .single();

    if (course) {
      await deleteCourseData(course.id, title);
    } else {
      console.log('コースが見つかりません（既に削除済み？）');
    }

    // ワークフローをリセット
    await resetWorkflow(title);
  }

  console.log('\n========================================');
  console.log('完了！');
  console.log('');
  console.log('次のステップ:');
  console.log('1. 本番環境にデプロイが完了していることを確認');
  console.log('2. AIコース生成画面から該当コースを開く');
  console.log('3. カテゴリマッピング画面で「承認して次へ」をクリック');
  console.log('4. 正しい英語IDでコースが再生成されます');
  console.log('========================================');
}

main().catch(console.error);
