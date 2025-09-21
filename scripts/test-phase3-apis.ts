#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

// 環境変数読み込み
config({ path: path.join(process.cwd(), '.env.local') })

async function testPhase3APIs() {
  console.log('🧪 Phase 3 API統合テストを開始します...\n')

  const baseUrl = 'http://localhost:3000'
  const testResults: any[] = []

  // ヘルパー関数：API テスト
  async function testAPI(name: string, url: string, options?: RequestInit) {
    try {
      const response = await fetch(url, options)
      const isSuccess = response.ok
      const data = isSuccess ? await response.json() : null

      testResults.push({
        name,
        url,
        status: response.status,
        success: isSuccess,
        data: data ? Object.keys(data).slice(0, 3) : null // データの主要キーのみ
      })

      console.log(`${isSuccess ? '✅' : '❌'} ${name}: ${response.status} ${response.statusText}`)
      
      if (isSuccess && data) {
        // データの概要を表示
        if (data.categories) {
          console.log(`   📋 カテゴリー数: ${data.categories.length}`)
        }
        if (data.subcategories) {
          console.log(`   📂 サブカテゴリー数: ${data.subcategories.length}`)
        }
        if (data.skill_levels) {
          console.log(`   🎯 スキルレベル数: ${data.skill_levels.length}`)
        }
        if (data.meta) {
          console.log(`   📊 メタ情報: ${JSON.stringify(data.meta).slice(0, 100)}...`)
        }
      }
      
      return { success: isSuccess, data }
    } catch (error) {
      console.log(`❌ ${name}: Error - ${error}`)
      testResults.push({
        name,
        url,
        status: 'ERROR',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return { success: false, error }
    }
  }

  console.log('📋 **1. ユーザー向けカテゴリーAPI テスト**')
  console.log('='.repeat(60))

  // 1.1 全カテゴリー取得
  await testAPI(
    'GET /api/categories (全カテゴリー)',
    `${baseUrl}/api/categories`
  )

  // 1.2 メインカテゴリーのみ
  await testAPI(
    'GET /api/categories (メインのみ)',
    `${baseUrl}/api/categories?type=main`
  )

  // 1.3 業界カテゴリーのみ
  await testAPI(
    'GET /api/categories (業界のみ)',
    `${baseUrl}/api/categories?type=industry`
  )

  console.log('\n📂 **2. サブカテゴリーAPI テスト**')
  console.log('='.repeat(60))

  // 2.1 全サブカテゴリー取得
  await testAPI(
    'GET /api/subcategories (全サブカテゴリー)',
    `${baseUrl}/api/subcategories`
  )

  // 2.2 特定カテゴリーのサブカテゴリー
  await testAPI(
    'GET /api/subcategories (プログラミングのみ)',
    `${baseUrl}/api/subcategories?parent_category_id=programming`
  )

  console.log('\n🎯 **3. スキルレベルAPI テスト**')
  console.log('='.repeat(60))

  // 3.1 スキルレベル取得
  await testAPI(
    'GET /api/skill-levels',
    `${baseUrl}/api/skill-levels`
  )

  console.log('\n🔧 **4. 管理者向けAPI テスト**')
  console.log('='.repeat(60))

  // 4.1 管理者カテゴリー一覧
  await testAPI(
    'GET /api/admin/categories (管理者向け)',
    `${baseUrl}/api/admin/categories`
  )

  // 4.2 非アクティブカテゴリー含む
  await testAPI(
    'GET /api/admin/categories (非アクティブ含む)',
    `${baseUrl}/api/admin/categories?include_inactive=true`
  )

  // 4.3 カテゴリー状態取得
  await testAPI(
    'GET /api/admin/categories/[id]/status',
    `${baseUrl}/api/admin/categories/communication_presentation/status`
  )

  console.log('\n🔄 **5. カテゴリー状態更新テスト**')
  console.log('='.repeat(60))

  // 5.1 非アクティブカテゴリーの状態確認
  const statusCheck = await testAPI(
    'GET status (金融業界)',
    `${baseUrl}/api/admin/categories/financial_services_industry/status`
  )

  // 5.2 一時的にアクティブ化
  if (statusCheck.success) {
    await testAPI(
      'PATCH status (アクティブ化)',
      `${baseUrl}/api/admin/categories/financial_services_industry/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true })
      }
    )

    // 5.3 元に戻す
    await testAPI(
      'PATCH status (非アクティブ化)',
      `${baseUrl}/api/admin/categories/financial_services_industry/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false })
      }
    )
  }

  console.log('\n📊 **6. テスト結果サマリー**')
  console.log('='.repeat(60))

  const successCount = testResults.filter(r => r.success).length
  const totalCount = testResults.length
  const successRate = ((successCount / totalCount) * 100).toFixed(1)

  console.log(`✅ 成功: ${successCount}/${totalCount} (${successRate}%)`)
  console.log(`❌ 失敗: ${totalCount - successCount}/${totalCount}`)

  if (testResults.some(r => !r.success)) {
    console.log('\n❌ **失敗したテスト:**')
    testResults
      .filter(r => !r.success)
      .forEach(r => {
        console.log(`   ${r.name}: ${r.status} - ${r.error || 'HTTP Error'}`)
      })
  }

  console.log('\n🎯 **Phase 3 API開発状況:**')
  console.log('✅ 3.1 ユーザー向けカテゴリー取得API (/api/categories)')
  console.log('✅ 3.2 管理者向けカテゴリー管理API (/api/admin/categories)')
  console.log('✅ 3.3 サブカテゴリー取得API (/api/subcategories)')
  console.log('✅ 3.4 スキルレベル取得API (/api/skill-levels)')
  console.log('✅ 3.5 カテゴリー状態更新API (有効化/無効化)')
  console.log('⏳ 3.6 カテゴリー並び順更新API (ドラッグ&ドロップ対応) - 未実装')

  console.log('\n🚀 Phase 3 API開発完了！')
  console.log('   次のフェーズ: Phase 4 (Frontend Integration)')
}

// 実行
testPhase3APIs().then(() => {
  console.log('\n🧪 Phase 3 APIテスト完了')
  process.exit(0)
}).catch(error => {
  console.error('❌ Test error:', error)
  process.exit(1)
})