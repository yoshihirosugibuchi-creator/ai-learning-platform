#!/usr/bin/env node

/**
 * 指定ユーザーの全学習データをリセット（改良版）
 * 
 * 使用方法:
 * node scripts/reset-specific-user.js <userId>
 * 
 * 例:
 * node scripts/reset-specific-user.js 2a4849d1-7d6f-401b-bc75-4e9418e75c07
 * 
 * 特徴:
 * - 強制リセットAPI使用（SERVICE_ROLE_KEY、RLSバイパス）
 * - 20テーブル完全対応（user_knowledge_collection_v2追加）
 * - 削除確認機能
 * - ポート自動検出
 */

const userId = process.argv[2]

if (!userId) {
  console.error('❌ 使用方法: node scripts/reset-specific-user.js <userId>')
  console.error('')
  console.error('例:')
  console.error('  node scripts/reset-specific-user.js 2a4849d1-7d6f-401b-bc75-4e9418e75c07')
  console.error('')
  console.error('ユーザーIDが不明な場合:')
  console.error('1. ブラウザでプロフィールページを開く')
  console.error('2. 開発者ツール → コンソールで以下を実行:')
  console.error('   JSON.parse(localStorage.getItem("supabase.auth.token") || "{}").user?.id')
  console.error('')
  process.exit(1)
}

// UUIDフォーマットの簡単なバリデーション
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
if (!uuidRegex.test(userId)) {
  console.error('❌ 無効なユーザーID形式です。UUIDの形式である必要があります。')
  console.error('例: 2a4849d1-7d6f-401b-bc75-4e9418e75c07')
  process.exit(1)
}

// ポート検出（3001優先、フォールバック3000）
async function detectPort() {
  const ports = [3001, 3000]
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}/api/admin/force-reset`, {
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
    console.log(`🎯 指定ユーザーの全学習データをリセット`)
    console.log(`👤 ユーザーID: ${userId}`)
    console.log('')
    
    // ポート検出
    const port = await detectPort()
    const baseUrl = `http://localhost:${port}`
    
    console.log('⚠️  警告: 以下のデータが完全削除されます（20テーブル）:')
    console.log('   📚 学習進捗: learning_progress, course_session_completions, course_theme_completions, course_completions')
    console.log('   🎯 クイズ履歴: quiz_sessions, quiz_answers, quiz_results, detailed_quiz_data')
    console.log('   📊 XP・統計: user_xp_stats_v2, user_category_xp_stats_v2, user_subcategory_xp_stats_v2, daily_xp_records')
    console.log('   💰 SKP・バッジ: skp_transactions, user_badges')
    console.log('   🎁 コレクション: knowledge_card_collection, wisdom_card_collection, user_knowledge_collection_v2')
    console.log('   ⚙️  設定: user_settings, user_progress')
    console.log('')
    console.log('✅ 保持されるデータ: アカウント情報（users テーブル）')
    console.log('')
    
    // 確認なしで実行（スクリプト用）
    console.log('🚀 強制リセットAPI実行中...')
    
    const response = await fetch(`${baseUrl}/api/admin/force-reset`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId })
    })

    const result = await response.json()

    if (response.ok) {
      console.log('')
      console.log('✅ リセット完了!')
      console.log(`📊 処理結果: ${result.totalTablesProcessed}テーブル処理済み`)
      console.log('📋 削除されたテーブル:', result.deletedTables?.join(', ') || 'なし')
      
      if (result.errors && result.errors.length > 0) {
        console.log('')
        console.log('⚠️  一部エラー:', result.errors)
      }
      
      if (result.verification) {
        console.log('')
        console.log('🔍 削除確認結果:')
        Object.entries(result.verification).forEach(([table, count]) => {
          if (count === 0) {
            console.log(`   ✅ ${table}: ${count}件 (削除完了)`)
          } else if (count === 'error') {
            console.log(`   ❌ ${table}: 確認エラー`)
          } else {
            console.log(`   ⚠️  ${table}: ${count}件 (残存)`)
          }
        })
      }
      
      console.log('')
      console.log('🎉 指定ユーザーのデータリセットが完了しました!')
      console.log('💡 これで初回状態からテストできます。')
    } else {
      console.error('')
      console.error('❌ リセット失敗:', result.error || 'Unknown error')
      if (result.message) {
        console.error('詳細:', result.message)
      }
      process.exit(1)
    }
  } catch (error) {
    console.error('')
    console.error('❌ エラー:', error.message)
    console.log('')
    console.log('💡 トラブルシューティング:')
    console.log('1. 開発サーバーが起動していることを確認: npm run dev')
    console.log('2. 環境変数 SUPABASE_SERVICE_ROLE_KEY が設定されていることを確認')
    console.log('3. ユーザーIDが正しいUUID形式であることを確認')
    process.exit(1)
  }
}

resetUserData()