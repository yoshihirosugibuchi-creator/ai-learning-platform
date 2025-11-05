const { createClient } = require('@supabase/supabase-js')

// 環境変数を読み込み
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error('❌ 環境変数が不足しています')
  process.exit(1)
}

const supabaseAnon = createClient(supabaseUrl, anonKey)
const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testRLS() {
  console.log('🔍 RLS動作テストを開始します...\n')

  // テストするテーブル一覧
  const userDataTables = [
    'users',
    'quiz_sessions',
    'quiz_answers', 
    'user_xp_stats_v2',
    'user_category_xp_stats_v2',
    'user_subcategory_xp_stats_v2',
    'daily_xp_records',
    'skp_transactions',
    'course_session_completions',
    'wisdom_card_collection'
  ]

  const masterDataTables = [
    'categories',
    'subcategories',
    'quiz_questions',
    'learning_courses',
    'learning_themes',
    'learning_sessions',
    'wisdom_cards'
  ]

  console.log('📊 テーブルアクセステスト結果:')
  console.log('='.repeat(90))
  console.log('テーブル名'.padEnd(35) + '匿名アクセス'.padEnd(15) + '管理者アクセス'.padEnd(15) + 'RLS判定')
  console.log('='.repeat(90))

  // ユーザーデータテーブルのテスト
  for (const tableName of userDataTables) {
    await testTableAccess(tableName, 'user')
  }

  // マスタデータテーブルのテスト
  for (const tableName of masterDataTables) {
    await testTableAccess(tableName, 'master')
  }

  console.log('='.repeat(90))
  
  // サマリー表示
  await displaySummary()
}

async function testTableAccess(tableName, tableType) {
  let anonResult = 'ERROR'
  let adminResult = 'ERROR'
  let rlsStatus = 'UNKNOWN'

  try {
    // 匿名アクセステスト
    const { data: anonData, error: anonError } = await supabaseAnon
      .from(tableName)
      .select('*')
      .limit(1)

    if (anonError) {
      if (anonError.message.includes('RLS') || anonError.message.includes('policy') || anonError.code === 'PGRST116') {
        anonResult = 'BLOCKED'
      } else {
        anonResult = 'ERROR'
      }
    } else {
      anonResult = 'ALLOWED'
    }

    // 管理者アクセステスト
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .limit(1)

    if (adminError) {
      adminResult = 'ERROR'
    } else {
      adminResult = 'ALLOWED'
    }

    // RLS判定
    if (anonResult === 'BLOCKED' && adminResult === 'ALLOWED') {
      rlsStatus = '✅ ENABLED'
    } else if (anonResult === 'ALLOWED' && adminResult === 'ALLOWED') {
      if (tableType === 'user') {
        rlsStatus = '❌ DISABLED'
      } else {
        rlsStatus = '⚪ DISABLED'
      }
    } else {
      rlsStatus = '🔍 UNCLEAR'
    }

  } catch (error) {
    anonResult = 'ERROR'
    adminResult = 'ERROR'
    rlsStatus = '❌ ERROR'
  }

  const anonDisplay = anonResult === 'ALLOWED' ? '✅ 許可' : 
                     anonResult === 'BLOCKED' ? '❌ 拒否' : '⚠️ エラー'
  const adminDisplay = adminResult === 'ALLOWED' ? '✅ 許可' : '⚠️ エラー'

  console.log(
    tableName.padEnd(35) + 
    anonDisplay.padEnd(15) + 
    adminDisplay.padEnd(15) + 
    rlsStatus
  )
}

async function displaySummary() {
  console.log('\n📋 RLS設定サマリー:')
  console.log('='.repeat(60))
  
  console.log('🔴 RLS有効 (✅ ENABLED): ユーザーデータが適切に保護されている')
  console.log('🟡 RLS無効・ユーザーデータ (❌ DISABLED): 緊急対応が必要')
  console.log('⚪ RLS無効・マスタデータ (⚪ DISABLED): 通常の設定')
  console.log('🔍 状況不明 (🔍 UNCLEAR): 詳細調査が必要')
  console.log('⚠️ エラー (❌ ERROR): テーブルアクセスに問題')
  
  console.log('='.repeat(60))
  
  console.log('\n💡 推奨事項:')
  console.log('1. ❌ DISABLED のユーザーデータテーブルに対してRLSポリシーを設定')
  console.log('2. 🔍 UNCLEAR のテーブルについて詳細調査を実施')
  console.log('3. ⚠️ ERROR のテーブルについて権限設定を確認')
  console.log('4. 定期的なRLS設定の監査を実施')
}

// 実行
testRLS().catch(console.error)