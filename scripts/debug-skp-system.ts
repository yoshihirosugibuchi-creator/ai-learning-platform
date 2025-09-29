#!/usr/bin/env npx tsx

/**
 * SKPシステムデバッグ用スクリプト
 * 用途: SKPテーブル・設定・実装状況の確認
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// 環境変数読み込み
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugSKPSystem() {
  console.log('🔍 SKPシステムデバッグ開始\n')

  // 1. SKP設定確認
  console.log('📋 SKP設定確認:')
  const { data: skpSettings, error: skpError } = await supabase
    .from('xp_level_skp_settings')
    .select('*')
    .eq('setting_category', 'skp')
    .order('setting_key')

  if (skpError) {
    console.error('❌ SKP設定取得エラー:', skpError)
    return
  }

  skpSettings?.forEach(setting => {
    console.log(`  ${setting.setting_key}: ${setting.setting_value} (${setting.setting_description})`)
  })

  // 2. skp_transactionsテーブル確認
  console.log('\n📊 SKP取引記録:')
  const { data: skpTransactions, error: transactionError } = await supabase
    .from('skp_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (transactionError) {
    console.error('❌ SKP取引記録取得エラー:', transactionError)
  } else {
    console.log(`  取引記録数: ${skpTransactions?.length || 0}`)
    skpTransactions?.forEach(transaction => {
      console.log(`    ${transaction.type}: ${transaction.amount}SKP - ${transaction.source}`)
    })
  }

  // 3. user_xp_stats_v2テーブル構造確認
  console.log('\n🗄️ user_xp_stats_v2テーブル構造確認:')
  const { data: sampleUser, error: userError } = await supabase
    .from('user_xp_stats_v2')
    .select('*')
    .limit(1)
    .single()

  if (userError) {
    console.error('❌ ユーザー統計取得エラー:', userError)
  } else if (sampleUser) {
    const columns = Object.keys(sampleUser)
    console.log('  カラム一覧:', columns)
    const hasSKPColumns = columns.some(col => col.toLowerCase().includes('skp'))
    console.log(`  SKP関連カラム: ${hasSKPColumns ? '存在' : '❌ 不在'}`)
  }

  // 4. 最近のクイズ・コース完了記録確認
  console.log('\n📝 最近の学習記録:')
  
  // Quiz sessions
  const { data: quizSessions, error: quizError } = await supabase
    .from('quiz_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (!quizError && quizSessions) {
    console.log(`  最近のクイズセッション: ${quizSessions.length}件`)
    quizSessions.forEach(session => {
      console.log(`    正答率: ${session.accuracy}%, XP: ${session.xp_earned || 'N/A'}, SKP: 記録なし`)
    })
  }

  // Course sessions
  const { data: courseSessions, error: courseError } = await supabase
    .from('course_session_completions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (!courseError && courseSessions) {
    console.log(`  最近のコースセッション: ${courseSessions.length}件`)
    courseSessions.forEach(session => {
      console.log(`    正解: ${session.session_quiz_correct}, XP: ${session.earned_xp}, SKP: 記録なし`)
    })
  }
}

async function main() {
  await debugSKPSystem()
  
  console.log('\n💡 SKPシステム実装状況:')
  console.log('✅ SKP設定テーブル: 存在')
  console.log('✅ SKP取引テーブル: 存在')
  console.log('✅ SKP計算関数: 存在 (lib/xp-settings.ts)')
  console.log('❌ user_xp_stats_v2のSKPカラム: 不在')
  console.log('❌ クイズAPIのSKP計算: 未実装')
  console.log('❌ コース学習APIのSKP計算: 未実装')
  console.log('❌ UI表示: 未実装')
}

if (require.main === module) {
  main().catch(console.error)
}