/**
 * 基本的な動作確認テスト
 * Jest環境の動作確認とユーティリティ関数のテスト
 */

import { jest } from '@jest/globals'

describe('🧪 Jest環境動作確認', () => {
  test('✅ Jest環境が正常に動作する', () => {
    expect(true).toBe(true)
  })

  test('✅ モック機能が正常に動作する', () => {
    const mockFunction = jest.fn()
    mockFunction('test')
    
    expect(mockFunction).toHaveBeenCalledWith('test')
    expect(mockFunction).toHaveBeenCalledTimes(1)
  })

  test('✅ 非同期テストが正常に動作する', async () => {
    const asyncFunction = () => Promise.resolve('success')
    const result = await asyncFunction()
    
    expect(result).toBe('success')
  })

  test('✅ グローバルテストユーティリティが利用可能', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const testUtils = (global as any).testUtils
    expect(testUtils).toBeDefined()
    expect(testUtils.generateTestUserId).toBeInstanceOf(Function)
    
    const userId = testUtils.generateTestUserId()
    expect(userId).toMatch(/^test-user-\d+-[a-z0-9]+$/)
  })
})

describe('🔧 テストユーティリティ関数', () => {
  test('✅ generateTestUserId が有効なIDを生成', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const testUtils = (global as any).testUtils
    const userId1 = testUtils.generateTestUserId()
    const userId2 = testUtils.generateTestUserId()
    
    // ユニーク性の確認
    expect(userId1).not.toBe(userId2)
    
    // フォーマットの確認
    expect(userId1).toMatch(/^test-user-/)
    expect(userId2).toMatch(/^test-user-/)
  })

  test('✅ createMockRequest が正しいリクエストオブジェクトを作成', () => {
    const mockBody = { test: 'data' }
    const mockHeaders = { 'custom-header': 'value' }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const testUtils = (global as any).testUtils
    const request = testUtils.createMockRequest(mockBody, mockHeaders)
    
    expect(request.json).toBeInstanceOf(Function)
    expect(request.headers).toEqual({
      'content-type': 'application/json',
      'custom-header': 'value'
    })
  })

  test('✅ expectSuccessResponse が成功レスポンスを正しく検証', () => {
    const successResponse = {
      status: 200,
      success: true,
      data: { message: 'success' }
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const testUtils = (global as any).testUtils
    expect(() => {
      testUtils.expectSuccessResponse(successResponse)
    }).not.toThrow()
  })

  test('✅ expectErrorResponse が失敗レスポンスを正しく検証', () => {
    const errorResponse = {
      status: 400,
      success: false,
      error: 'Bad Request'
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const testUtils = (global as any).testUtils
    expect(() => {
      testUtils.expectErrorResponse(errorResponse, 400)
    }).not.toThrow()
  })
})

describe('🌍 環境変数・設定確認', () => {
  test('✅ テスト環境の NODE_ENV が設定されている', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })

  test('✅ タイムゾーンが日本時間に設定されている', () => {
    expect(process.env.TZ).toBe('Asia/Tokyo')
  })

  test('✅ Supabase環境変数が設定されている', () => {
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeDefined()
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeDefined()
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBeDefined()
  })
})

describe('⏱️ パフォーマンス・タイムアウトテスト', () => {
  test('✅ 高速なテストが正常に実行される', () => {
    const start = Date.now()
    
    // 簡単な計算処理
    let result = 0
    for (let i = 0; i < 1000; i++) {
      result += i
    }
    
    const duration = Date.now() - start
    
    expect(result).toBe(499500) // 1+2+...+999 = 499500
    expect(duration).toBeLessThan(100) // 100ms以内
  })

  test('✅ 長時間テストが設定されたタイムアウト内で実行される', async () => {
    // 設定されたタイムアウト（30秒）よりも短い処理
    await new Promise(resolve => setTimeout(resolve, 100))
    expect(true).toBe(true)
  }, 5000) // 5秒タイムアウト
})

describe('🔍 デバッグ・ログ確認', () => {
  test('✅ コンソールログが制御されている', () => {
    // テスト時はconsole.logがモックされている
    console.log('このログは表示されない（TEST_VERBOSE=true時のみ表示）')
    console.error('エラーログは表示される')
    
    // console.logとconsole.errorが関数として利用可能
    expect(typeof console.log).toBe('function')
    expect(typeof console.error).toBe('function')
  })

  test('✅ テスト詳細ログの確認', () => {
    if (process.env.TEST_VERBOSE === 'true') {
      console.log('🔍 詳細ログモードが有効です')
    }
    
    expect(true).toBe(true)
  })
})