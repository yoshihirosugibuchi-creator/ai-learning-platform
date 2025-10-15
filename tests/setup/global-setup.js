// Jest グローバルセットアップ
// 全テスト実行前に1回だけ実行される

module.exports = async () => {
  console.log('🚀 テストスイート開始: グローバルセットアップ実行中...')
  
  // 環境変数の確認
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.warn('⚠️  以下の環境変数が設定されていません:', missingVars.join(', '))
    console.warn('💡 テスト用の環境変数を設定してください')
  }
  
  // テスト開始時刻を記録
  global.__TEST_START_TIME__ = Date.now()
  
  console.log('✅ グローバルセットアップ完了')
}