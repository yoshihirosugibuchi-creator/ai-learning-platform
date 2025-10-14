#!/usr/bin/env node

/**
 * コア機能テストスクリプト
 * デプロイ前の自動化可能な部分をテスト
 */

console.log('🧪 AI学習プラットフォーム - コア機能テスト開始')
console.log('=====================================')

// 1. カードID変換の整合性テスト
console.log('\n📋 1. カードID変換テスト')
function testCardIdConversion() {
  const themeIds = [
    'so_what_why_so',
    'conclusion_first', 
    'mece_thinking',
    'logical_tree',
    'market_analysis',
    'ai_basic_concepts'
  ]
  
  console.log('テーマID → 数値カードID変換:')
  const results = {}
  
  themeIds.forEach(themeId => {
    const cardString = `theme_${themeId}`
    const numericId = Math.abs(cardString.split('').reduce((a, b) => a + b.charCodeAt(0), 0))
    results[themeId] = { cardString, numericId }
    console.log(`  ${themeId} → "${cardString}" → ${numericId}`)
  })
  
  // 重複チェック
  const numericIds = Object.values(results).map(r => r.numericId)
  const duplicates = numericIds.filter((id, index) => numericIds.indexOf(id) !== index)
  
  if (duplicates.length > 0) {
    console.error('❌ カードID重複検出:', duplicates)
    return false
  }
  
  console.log('✅ カードID変換: 重複なし、正常動作')
  return true
}

// 2. 環境変数テスト
console.log('\n🔧 2. 環境変数テスト')
function testEnvironmentVariables() {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  let allPresent = true
  
  requiredVars.forEach(varName => {
    const value = process.env[varName]
    if (!value) {
      console.error(`❌ 環境変数不足: ${varName}`)
      allPresent = false
    } else {
      // セキュリティのため最初の数文字のみ表示
      const masked = value.substring(0, 10) + '...'
      console.log(`✅ ${varName}: ${masked}`)
    }
  })
  
  if (!allPresent) {
    console.error('❌ 必要な環境変数が不足しています')
    return false
  }
  
  console.log('✅ 環境変数: 全て設定済み')
  return true
}

// 3. 重要ファイル存在チェック
console.log('\n📁 3. 重要ファイル存在チェック')
function testImportantFiles() {
  const fs = require('fs')
  const path = require('path')
  
  const requiredFiles = [
    'lib/database-types-official.ts',
    'lib/supabase-cards.ts',
    'components/learning/LearningSession.tsx',
    'app/api/xp-save/course/route.ts',
    'app/collection/page.tsx',
    'CLAUDE.md',
    '.env.local'
  ]
  
  let allExist = true
  
  requiredFiles.forEach(filePath => {
    const fullPath = path.join(process.cwd(), filePath)
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath)
      console.log(`✅ ${filePath} (${(stats.size / 1024).toFixed(1)}KB)`)
    } else {
      console.error(`❌ ファイル不存在: ${filePath}`)
      allExist = false
    }
  })
  
  if (!allExist) {
    console.error('❌ 必要なファイルが不足しています')
    return false
  }
  
  console.log('✅ 重要ファイル: 全て存在')
  return true
}

// 4. Package.json依存関係チェック
console.log('\n📦 4. 依存関係チェック')
function testDependencies() {
  const fs = require('fs')
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
  
  const criticalDeps = [
    '@supabase/supabase-js',
    'next',
    'react',
    'typescript'
  ]
  
  let allPresent = true
  
  criticalDeps.forEach(dep => {
    const version = packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]
    if (!version) {
      console.error(`❌ 重要な依存関係不足: ${dep}`)
      allPresent = false
    } else {
      console.log(`✅ ${dep}: ${version}`)
    }
  })
  
  if (!allPresent) {
    console.error('❌ 重要な依存関係が不足しています')
    return false
  }
  
  console.log('✅ 依存関係: 全て正常')
  return true
}

// 5. API経路構成チェック
console.log('\n🛣️ 5. API経路構成チェック')
function testApiRoutes() {
  const fs = require('fs')
  const path = require('path')
  
  const criticalApiRoutes = [
    'app/api/xp-save/quiz/route.ts',
    'app/api/xp-save/course/route.ts',
    'app/api/debug/knowledge-cards/route.ts',
    'app/api/categories/route.ts',
    'app/api/auth/user/route.ts'
  ]
  
  let allExist = true
  
  criticalApiRoutes.forEach(routePath => {
    const fullPath = path.join(process.cwd(), routePath)
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8')
      const hasGetOrPost = content.includes('export async function GET') || content.includes('export async function POST')
      if (hasGetOrPost) {
        console.log(`✅ ${routePath.replace('app/api/', '').replace('/route.ts', '')}`)
      } else {
        console.warn(`⚠️ ${routePath}: ハンドラー関数未検出`)
      }
    } else {
      console.error(`❌ API経路不存在: ${routePath}`)
      allExist = false
    }
  })
  
  if (!allExist) {
    console.error('❌ 重要なAPI経路が不足しています')
    return false
  }
  
  console.log('✅ API経路: 全て存在')
  return true
}

// テスト実行
async function runAllTests() {
  console.log('\n🚀 全テスト実行中...\n')
  
  const tests = [
    testCardIdConversion,
    testEnvironmentVariables,
    testImportantFiles,
    testDependencies,
    testApiRoutes
  ]
  
  let allPassed = true
  
  for (const test of tests) {
    try {
      const result = test()
      if (!result) {
        allPassed = false
      }
    } catch (error) {
      console.error(`❌ テスト実行エラー: ${error.message}`)
      allPassed = false
    }
  }
  
  console.log('\n=====================================')
  if (allPassed) {
    console.log('🎉 全テスト成功 - デプロイ準備完了')
    console.log('\n次のステップ:')
    console.log('1. 手動でXP/SKP計算テストを実行')
    console.log('2. ナレッジカード獲得テストを実行')  
    console.log('3. コース完了テストを実行')
    console.log('4. 本番デプロイ実行')
    process.exit(0)
  } else {
    console.log('❌ テスト失敗 - 問題を修正してから再実行')
    console.log('\n修正後に以下コマンドで再テスト:')
    console.log('node scripts/core-function-test.js')
    process.exit(1)
  }
}

// 実行
runAllTests()