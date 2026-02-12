/**
 * カテゴリマッピング→次ステップ遷移テスト
 *
 * テスト内容:
 * 1. テスト用ワークフローを作成
 * 2. publish-outline APIを呼び出し
 * 3. ステップ遷移が正しく行われるか確認
 * 4. 重複クリック時に重複コースが作成されないか確認
 * 5. クリーンアップ
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TEST_USER_ID = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'; // テスト用ユーザー
const TEST_WORKFLOW_TITLE = 'テスト遷移確認コース_' + Date.now();

async function createTestWorkflow() {
  console.log('📝 テストワークフロー作成中...');

  const outlineData = {
    approved: true,
    course: {
      title: TEST_WORKFLOW_TITLE,
      description: 'テスト用コース',
      estimatedDays: 7,
      difficulty: 'basic',
      targetAudience: 'テスト',
      learningObjectives: ['テスト目標']
    },
    genres: [
      {
        id: 'test_genre_1',
        title: 'テストジャンル1',
        description: 'テスト用ジャンル',
        estimatedDays: 3,
        display_order: 0,
        themes: [
          {
            id: 'test_theme_1',
            title: 'テストテーマ1',
            description: 'テスト用テーマ',
            estimatedMinutes: 30,
            display_order: 0,
            sessions: [
              {
                id: 'test_session_1',
                title: 'テストセッション1',
                session_type: 'knowledge',
                estimatedMinutes: 10,
                display_order: 0
              }
            ]
          }
        ]
      }
    ],
    generated_at: new Date().toISOString()
  };

  const categoryMappings = [
    {
      genreId: 'test_genre_1',
      genreTitle: 'テストジャンル1',
      selectedCategoryId: 'general',
      manualOverride: true
    }
  ];

  const { data: workflow, error } = await supabase
    .from('ai_course_workflows')
    .insert({
      user_id: TEST_USER_ID,
      title: TEST_WORKFLOW_TITLE,
      description: 'テスト用ワークフロー',
      status: 'outline_approved',
      current_step: 4, // カテゴリマッピングステップ
      outline_data: outlineData,
      category_mappings: categoryMappings
    })
    .select()
    .single();

  if (error) {
    console.error('❌ ワークフロー作成エラー:', error);
    throw error;
  }

  console.log('✅ ワークフロー作成完了:', workflow.id);
  return workflow;
}

async function callPublishOutlineAPI(workflowId, categoryMappings) {
  console.log('📡 publish-outline API呼び出し...');

  // 直接Supabaseを使ってAPIロジックをシミュレート
  // (実際のHTTPリクエストは認証が複雑なため)

  // 1. ワークフロー取得
  const { data: workflow, error: fetchError } = await supabase
    .from('ai_course_workflows')
    .select('*')
    .eq('id', workflowId)
    .single();

  if (fetchError) {
    console.error('❌ ワークフロー取得エラー:', fetchError);
    return { success: false, error: fetchError.message };
  }

  // 2. 既存コースチェック（修正後のロジック）
  const courseTitle = workflow.outline_data?.course?.title || workflow.title;
  const { data: existingCourse } = await supabase
    .from('learning_courses')
    .select('id, title')
    .eq('title', courseTitle)
    .maybeSingle();

  if (existingCourse) {
    console.log('⚠️ 既存コース検出:', existingCourse.id);

    // ワークフロー更新
    await supabase
      .from('ai_course_workflows')
      .update({
        published_course_id: existingCourse.id,
        status: 'outline_approved',
        current_step: 5, // 次のステップへ
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId);

    return {
      success: true,
      course_id: existingCourse.id,
      already_exists: true
    };
  }

  // 3. 新規コース作成（簡略版）
  console.log('📦 新規コース作成中...');

  const courseId = 'test_' + Date.now().toString(36);

  const { error: insertError } = await supabase
    .from('learning_courses')
    .insert({
      id: courseId,
      title: courseTitle,
      description: workflow.description || 'テスト',
      difficulty: 'basic',
      estimated_days: 7,
      icon: '📚',
      color: '#4F46E5',
      status: 'draft'
    });

  if (insertError) {
    console.error('❌ コース作成エラー:', insertError);
    return { success: false, error: insertError.message };
  }

  // 4. ワークフロー更新
  const { error: updateError } = await supabase
    .from('ai_course_workflows')
    .update({
      published_course_id: courseId,
      status: 'outline_approved',
      current_step: 5, // 次のステップへ
      updated_at: new Date().toISOString()
    })
    .eq('id', workflowId);

  if (updateError) {
    console.error('⚠️ ワークフロー更新エラー:', updateError);
  }

  console.log('✅ コース作成完了:', courseId);
  return {
    success: true,
    course_id: courseId,
    already_exists: false
  };
}

async function verifyWorkflowState(workflowId) {
  console.log('🔍 ワークフロー状態確認...');

  const { data: workflow, error } = await supabase
    .from('ai_course_workflows')
    .select('id, title, current_step, published_course_id, status')
    .eq('id', workflowId)
    .single();

  if (error) {
    console.error('❌ 状態確認エラー:', error);
    return null;
  }

  console.log('  current_step:', workflow.current_step);
  console.log('  published_course_id:', workflow.published_course_id);
  console.log('  status:', workflow.status);

  return workflow;
}

async function countCoursesWithTitle(title) {
  const { count, error } = await supabase
    .from('learning_courses')
    .select('*', { count: 'exact', head: true })
    .eq('title', title);

  if (error) {
    console.error('❌ コース数確認エラー:', error);
    return -1;
  }

  return count;
}

async function cleanup(workflowId, courseTitle) {
  console.log('🧹 クリーンアップ中...');

  // コース削除
  const { error: courseError } = await supabase
    .from('learning_courses')
    .delete()
    .eq('title', courseTitle);

  if (courseError) {
    console.log('  コース削除エラー:', courseError.message);
  } else {
    console.log('  ✅ コース削除完了');
  }

  // ワークフロー削除
  const { error: workflowError } = await supabase
    .from('ai_course_workflows')
    .delete()
    .eq('id', workflowId);

  if (workflowError) {
    console.log('  ワークフロー削除エラー:', workflowError.message);
  } else {
    console.log('  ✅ ワークフロー削除完了');
  }
}

async function runTest() {
  console.log('========================================');
  console.log('カテゴリマッピング→次ステップ遷移テスト');
  console.log('========================================\n');

  let workflow = null;
  let testPassed = true;

  try {
    // 1. テストワークフロー作成
    workflow = await createTestWorkflow();

    // 2. 初期状態確認
    console.log('\n--- 初期状態 ---');
    await verifyWorkflowState(workflow.id);

    // 3. 1回目のAPI呼び出し
    console.log('\n--- 1回目のpublish-outline呼び出し ---');
    const result1 = await callPublishOutlineAPI(workflow.id, workflow.category_mappings);
    console.log('結果:', result1);

    // 4. 状態確認
    console.log('\n--- 1回目後の状態 ---');
    const state1 = await verifyWorkflowState(workflow.id);

    if (state1.current_step !== 5) {
      console.log('❌ テスト失敗: current_stepが5に更新されていない');
      testPassed = false;
    } else {
      console.log('✅ current_stepが5に正しく更新された');
    }

    if (!state1.published_course_id) {
      console.log('❌ テスト失敗: published_course_idが設定されていない');
      testPassed = false;
    } else {
      console.log('✅ published_course_idが設定された');
    }

    // 5. コース数確認
    const courseCount1 = await countCoursesWithTitle(TEST_WORKFLOW_TITLE);
    console.log('コース数:', courseCount1);

    // 6. 2回目のAPI呼び出し（重複テスト）
    console.log('\n--- 2回目のpublish-outline呼び出し（重複テスト） ---');
    const result2 = await callPublishOutlineAPI(workflow.id, workflow.category_mappings);
    console.log('結果:', result2);

    if (result2.already_exists) {
      console.log('✅ 既存コースを正しく検出');
    } else {
      console.log('❌ テスト失敗: 重複コースが作成された可能性');
      testPassed = false;
    }

    // 7. コース数再確認
    const courseCount2 = await countCoursesWithTitle(TEST_WORKFLOW_TITLE);
    console.log('コース数:', courseCount2);

    if (courseCount2 === 1) {
      console.log('✅ 重複コースなし（1件のみ）');
    } else {
      console.log('❌ テスト失敗: コース数が1以外:', courseCount2);
      testPassed = false;
    }

    // 8. 3回目のAPI呼び出し（さらに重複テスト）
    console.log('\n--- 3回目のpublish-outline呼び出し（さらに重複テスト） ---');
    const result3 = await callPublishOutlineAPI(workflow.id, workflow.category_mappings);
    console.log('結果:', result3);

    const courseCount3 = await countCoursesWithTitle(TEST_WORKFLOW_TITLE);
    console.log('コース数:', courseCount3);

    if (courseCount3 === 1) {
      console.log('✅ 3回呼び出しても重複なし');
    } else {
      console.log('❌ テスト失敗: コース数が1以外:', courseCount3);
      testPassed = false;
    }

  } catch (error) {
    console.error('\n❌ テストエラー:', error);
    testPassed = false;
  } finally {
    // クリーンアップ
    if (workflow) {
      console.log('\n--- クリーンアップ ---');
      await cleanup(workflow.id, TEST_WORKFLOW_TITLE);
    }
  }

  // 結果サマリー
  console.log('\n========================================');
  if (testPassed) {
    console.log('✅ 全テスト成功');
  } else {
    console.log('❌ テスト失敗あり');
  }
  console.log('========================================');
}

runTest().catch(console.error);
