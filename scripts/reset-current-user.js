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

async function resetUserData() {
  try {
    console.log(`🔄 ユーザーの全データをリセット中: ${userId}`)
    console.log('⚠️  警告: 以下のデータが削除されます:')
    console.log('   - 学習進捗 (learning_progress)')
    console.log('   - 獲得バッジ (user_badges)')
    console.log('   - XP統計 (user_xp_stats, category_xp_stats)')
    console.log('   - SKP取引履歴 (skp_transactions)')
    console.log('   - クイズセッション履歴 (quiz_sessions)')
    console.log('')
    
    const response = await fetch('http://localhost:3000/api/admin/reset-user-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ リセット完了!')
      console.log('削除されたテーブル:', result.deletedTables)
      if (result.errors) {
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