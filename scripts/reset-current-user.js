#!/usr/bin/env node

/**
 * 現在ログインしているユーザーの全データをリセット
 * 
 * 使用方法:
 * 1. ブラウザでプロフィールページを開く
 * 2. 開発者ツールのコンソールで以下を実行してユーザーIDを取得:
 *    localStorage.getItem('supabase.auth.token') または sessionStorage内のuser情報
 * 3. このスクリプトを実行: node scripts/reset-current-user.js <userId>
 * 
 * または、APIを直接呼び出し:
 * curl -X POST http://localhost:3000/api/admin/reset-user-data \
 *   -H "Content-Type: application/json" \
 *   -d '{"userId": "your-user-id"}'
 */

const userId = process.argv[2]

if (!userId) {
  console.error('❌ 使用方法: node scripts/reset-current-user.js <userId>')
  console.error('')
  console.error('ユーザーIDを取得するには:')
  console.error('1. ブラウザでプロフィールページを開く')
  console.error('2. 開発者ツール → コンソールで以下を実行:')
  console.error('   JSON.parse(localStorage.getItem("supabase.auth.token") || "{}").user?.id')
  console.error('')
  process.exit(1)
}

// ポート検出（3001優先、フォールバック3000）
async function detectPort() {
  const ports = [3001, 3000]
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}/api/admin/reset-user-data`, {
        method: 'HEAD'
      })
      console.log(`✅ 開発サーバー検出: ポート ${port}`)
      return port
    } catch (error) {
      // ポートが利用できない場合は次を試す
    }
  }
  throw new Error('開発サーバーが見つかりません。npm run dev を実行してください。')
}

async function resetUserData() {
  try {
    console.log(`🔄 ユーザーの全データをリセット中: ${userId}`)
    console.log('⚠️  警告: 以下のデータが削除されます（V2テーブル対応版）:')
    console.log('   📚 学習進捗: learning_progress, course_session_completions, course_theme_completions, course_completions')
    console.log('   📊 XP・統計: user_xp_stats_v2, user_category_xp_stats_v2, user_subcategory_xp_stats_v2, daily_xp_records')
    console.log('   🎯 クイズ履歴: quiz_sessions, quiz_answers')
    console.log('   💰 SKP・バッジ: skp_transactions, user_badges')
    console.log('   🎁 コレクション: knowledge_card_collection, wisdom_card_collection, user_knowledge_collection_v2')
    console.log('   ⚙️  設定: user_settings')
    console.log('')
    
    // ポート検出
    const port = await detectPort()
    const baseUrl = `http://localhost:${port}`
    
    const response = await fetch(`${baseUrl}/api/admin/reset-user-data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ リセット完了!')
      console.log('削除されたテーブル:', result.deletedTables?.join(', ') || 'なし')
      if (result.errors && result.errors.length > 0) {
        console.log('⚠️  一部エラー:', result.errors)
      }
      console.log('')
      console.log('🎉 これで新しい状態でテストできます!')
    } else {
      console.error('❌ リセット失敗:', result.error)
    }
  } catch (error) {
    console.error('❌ エラー:', error.message)
    console.log('\n💡 ヒント: 開発サーバーが起動していることを確認してください (npm run dev)')
  }
}

resetUserData()