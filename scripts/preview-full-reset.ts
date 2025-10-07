/**
 * 全ユーザーデータリセット実行前プレビュー
 * データを削除せずに影響範囲を確認
 */

const ANALYZE_API_URL = 'http://localhost:3000/api/admin/analyze-quiz-answers-user-id'

async function previewFullReset() {
  console.log('🔍 全ユーザーデータリセット実行前プレビュー')
  console.log('=' .repeat(50))

  try {
    // quiz_answersの状況を分析
    const analysisResponse = await fetch(ANALYZE_API_URL)
    if (!analysisResponse.ok) {
      throw new Error(`Analysis API error: ${analysisResponse.status}`)
    }
    
    const analysisResult = await analysisResponse.json()
    const analysis = analysisResult.analysis

    console.log('📊 現在のデータ状況:')
    console.log(`📝 quiz_answers総レコード数: ${analysis.totalRecords.toLocaleString()}件`)
    console.log(`✅ user_id設定済み: ${analysis.withUserId.toLocaleString()}件 (${analysis.userIdPercentage}%)`)
    console.log(`❌ user_id未設定: ${analysis.withoutUserId.toLocaleString()}件`)
    console.log(`👥 現在のユーザー数: ${analysis.distinctUsers.length}人`)

    console.log('\n🎯 削除対象テーブル一覧:')
    const targetTables = [
      'quiz_answers',
      'quiz_sessions', 
      'learning_progress',
      'user_badges',
      'user_xp_stats_v2',
      'user_category_xp_stats_v2',
      'user_subcategory_xp_stats_v2',
      'course_session_completions',
      'course_theme_completions',
      'course_completions',
      'knowledge_card_collection',
      'wisdom_card_collection', 
      'user_settings',
      'skp_transactions',
      'daily_xp_records',
      'learning_analytics_summary',
      'learning_effectiveness_tracking',
      'learning_recommendations',
      'unified_learning_session_analytics',
      'user_learning_profiles',
      'spaced_repetition_schedule'
    ]

    targetTables.forEach((table, index) => {
      console.log(`  ${(index + 1).toString().padStart(2, ' ')}. ${table}`)
    })

    console.log('\n⚠️ 削除される予定のデータ:')
    console.log('🎮 学習活動データ:')
    console.log(`  - 全クイズ回答: ${analysis.totalRecords}件`)
    console.log('  - 全クイズセッション')
    console.log('  - 全学習進捗データ')

    console.log('\n💎 ユーザー統計・報酬データ:')
    console.log('  - 全XP/SKP統計')
    console.log('  - 全バッジ・コレクション')
    console.log('  - 全日別記録')

    console.log('\n📚 コース学習データ:')
    console.log('  - 全コース完了記録')
    console.log('  - 全セッション・テーマ完了記録')

    console.log('\n🤖 AI分析データ:')
    console.log('  - 全学習分析サマリー')
    console.log('  - 全効果追跡データ')
    console.log('  - 全推奨データ')
    console.log('  - 全統合セッション分析')
    console.log('  - 全ユーザープロファイル')
    console.log('  - 全間隔反復スケジュール')

    console.log('\n🔥 実行方法:')
    console.log('以下のコマンドで全削除を実行できます:')
    console.log('')
    console.log('curl -X POST http://localhost:3000/api/admin/reset-all-user-data \\')
    console.log('  -H "Content-Type: application/json" \\')
    console.log('  -d \'{"confirmationCode": "RESET_ALL_USERS_CONFIRMED_2025"}\'')
    console.log('')
    console.log('⚠️ この操作は取り消せません！')

  } catch (error) {
    console.error('❌ プレビューエラー:', error)
    throw error
  }
}

// 実行
if (require.main === module) {
  previewFullReset()
    .then(() => {
      console.log('\n✅ プレビュー完了')
    })
    .catch(error => {
      console.error('❌ プレビューエラー:', error)
      process.exit(1)
    })
}