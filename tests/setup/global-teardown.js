// Jest グローバル終了処理
// 全テスト実行後に1回だけ実行される

module.exports = async () => {
  console.log('🏁 テストスイート終了: グローバル終了処理実行中...')
  
  // テスト実行時間の計算
  if (global.__TEST_START_TIME__) {
    const duration = Date.now() - global.__TEST_START_TIME__
    const seconds = (duration / 1000).toFixed(2)
    console.log(`⏱️  総テスト実行時間: ${seconds}秒`)
  }
  
  // クリーンアップ処理
  // 必要に応じてテスト用データの削除やコネクションのクローズを行う
  
  console.log('✅ グローバル終了処理完了')
}