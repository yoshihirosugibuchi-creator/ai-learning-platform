/**
 * 全ユーザーデータリセット機能のテストスクリプト
 * 
 * 注意: このスクリプトは実際にデータを削除します！
 * 本番環境では絶対に実行しないでください
 */

const RESET_API_URL = 'http://localhost:3000/api/admin/reset-all-user-data'
const CONFIRMATION_CODE = 'RESET_ALL_USERS_CONFIRMED_2025'

async function testFullReset() {
  console.log('🔥 全ユーザーデータリセットテスト開始')
  console.log('⚠️ この操作は全てのユーザーデータを削除します')
  console.log('')

  try {
    const response = await fetch(RESET_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        confirmationCode: CONFIRMATION_CODE
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    console.log('📊 削除結果:')
    console.log(`✅ 成功: ${result.summary?.successful || 0}テーブル`)
    console.log(`❌ 失敗: ${result.summary?.failed || 0}テーブル`)
    console.log(`📈 完了率: ${result.summary?.completionRate || 0}%`)

    console.log('\n📋 削除されたテーブル:')
    result.deletedTables?.forEach((table: string, index: number) => {
      console.log(`  ${index + 1}. ${table}`)
    })

    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ エラー詳細:')
      result.errors.forEach((error: string, index: number) => {
        console.log(`  ${index + 1}. ${error}`)
      })
    }

    console.log('\n🎉 全ユーザーデータリセット完了')
    return result

  } catch (error) {
    console.error('❌ リセット実行エラー:', error)
    throw error
  }
}

// 確認プロンプト（手動実行時のみ）
if (require.main === module) {
  console.log('⚠️ 全ユーザーデータリセット確認')
  console.log('この操作により以下のデータが全て削除されます:')
  console.log('- 全ユーザーのクイズ回答・セッション')
  console.log('- 全ユーザーのXP・SKP・統計データ') 
  console.log('- 全ユーザーの学習進捗・完了記録')
  console.log('- 全ユーザーのバッジ・コレクション')
  console.log('- 全ユーザーの設定・プロファイル')
  console.log('- 全ユーザーのAI分析データ')
  console.log('')
  console.log('実行する場合は、以下のコメントを削除してスクリプトを再実行してください:')
  console.log('// testFullReset()')
  console.log('')
  
  // 安全のため、デフォルトでは実行しない
  // testFullReset()
  //   .then(() => {
  //     console.log('✅ テスト完了')
  //   })
  //   .catch(error => {
  //     console.error('❌ テストエラー:', error)
  //     process.exit(1)
  //   })
}