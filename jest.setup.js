// Jest セットアップファイル
process.env.NODE_ENV = 'test'
process.env.TZ = 'Asia/Tokyo'

// Supabase テスト用環境変数
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'

// fetch をグローバルで利用可能にする（Node.js 18未満の場合）
if (!global.fetch) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: fetch } = require('node-fetch')
  global.fetch = fetch
}

// テスト用のユーティリティ関数
const testUtils = {
  generateTestUserId: () => `test-user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  
  createMockRequest: (body = {}, headers = {}) => ({
    json: () => Promise.resolve(body),
    headers: {
      'content-type': 'application/json',
      ...headers
    }
  }),
  
  expectSuccessResponse: (response) => {
    expect(response.status).toBe(200)
    expect(response.success).toBe(true)
  },
  
  expectErrorResponse: (response, expectedStatus = 400) => {
    expect(response.status).toBe(expectedStatus)
    expect(response.error).toBeDefined()
  }
}

// グローバルに設定
global.testUtils = testUtils

console.log('🧪 Jest テスト環境セットアップ完了')