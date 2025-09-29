#!/usr/bin/env npx tsx

/**
 * user_xp_stats_v2テーブルにSKPカラム追加スクリプト
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

// 環境変数読み込み
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function addSKPColumns() {
  console.log('🔧 user_xp_stats_v2にSKPカラム追加開始\n')

  // 1. SKPカラム追加
  console.log('1. SKPカラム追加...')
  const alterQueries = [
    'ALTER TABLE public.user_xp_stats_v2 ADD COLUMN IF NOT EXISTS total_skp INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE public.user_xp_stats_v2 ADD COLUMN IF NOT EXISTS quiz_skp INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE public.user_xp_stats_v2 ADD COLUMN IF NOT EXISTS course_skp INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE public.user_xp_stats_v2 ADD COLUMN IF NOT EXISTS bonus_skp INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE public.user_xp_stats_v2 ADD COLUMN IF NOT EXISTS streak_skp INTEGER NOT NULL DEFAULT 0'
  ]

  for (const query of alterQueries) {
    try {
      console.log(`  実行中: ${query}`)
      const { error } = await supabase.rpc('exec_sql', { sql: query })
      if (error) {
        console.warn(`  ⚠️ 警告: ${error.message}`)
      } else {
        console.log('  ✅ 成功')
      }
    } catch (error) {
      console.error(`  ❌ エラー:`, error)
    }
  }

  // 2. インデックス追加
  console.log('\n2. インデックス追加...')
  try {
    const { error } = await supabase.rpc('exec_sql', { 
      sql: 'CREATE INDEX IF NOT EXISTS idx_user_xp_stats_v2_total_skp ON public.user_xp_stats_v2(total_skp DESC)' 
    })
    if (error) {
      console.warn('⚠️ インデックス追加警告:', error.message)
    } else {
      console.log('✅ インデックス追加成功')
    }
  } catch (error) {
    console.error('❌ インデックス追加エラー:', error)
  }

  // 3. 既存SKPデータ移行
  console.log('\n3. 既存SKPデータ移行...')
  
  // SKP取引データ集計
  const { data: skpTransactions, error: transactionError } = await supabase
    .from('skp_transactions')
    .select('user_id, type, amount, source')

  if (transactionError) {
    console.error('❌ SKP取引データ取得エラー:', transactionError)
    return
  }

  console.log(`📊 SKP取引記録: ${skpTransactions?.length || 0}件`)

  // ユーザー別SKP集計
  const userSKPSummary: Record<string, {
    total: number,
    quiz: number,
    course: number,
    bonus: number,
    streak: number
  }> = {}

  skpTransactions?.forEach(transaction => {
    const userId = transaction.user_id
    if (!userSKPSummary[userId]) {
      userSKPSummary[userId] = { total: 0, quiz: 0, course: 0, bonus: 0, streak: 0 }
    }

    const amount = transaction.type === 'earned' ? transaction.amount : -transaction.amount
    userSKPSummary[userId].total += amount

    // ソース別分類
    if (transaction.source.includes('quiz')) {
      userSKPSummary[userId].quiz += amount
    } else if (transaction.source.includes('course')) {
      userSKPSummary[userId].course += amount
    } else if (transaction.source.includes('bonus') || transaction.source.includes('perfect')) {
      userSKPSummary[userId].bonus += amount
    } else if (transaction.source.includes('streak')) {
      userSKPSummary[userId].streak += amount
    }
  })

  console.log(`👥 SKPデータがあるユーザー: ${Object.keys(userSKPSummary).length}人`)

  // 各ユーザーのSKPデータ更新
  let updatedCount = 0
  for (const [userId, skpData] of Object.entries(userSKPSummary)) {
    const { error } = await supabase
      .from('user_xp_stats_v2')
      .update({
        total_skp: skpData.total,
        quiz_skp: skpData.quiz,
        course_skp: skpData.course,
        bonus_skp: skpData.bonus,
        streak_skp: skpData.streak,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)

    if (error) {
      console.warn(`⚠️ ユーザー ${userId.substring(0, 8)}... SKP更新警告:`, error.message)
    } else {
      updatedCount++
      console.log(`✅ ユーザー ${userId.substring(0, 8)}... SKP更新成功: ${skpData.total}SKP`)
    }
  }

  console.log(`\n🎉 SKPカラム追加完了: ${updatedCount}人のSKPデータを移行しました`)
}

async function verifyColumns() {
  console.log('\n🔍 カラム追加確認...')
  
  const { data: sampleUser, error } = await supabase
    .from('user_xp_stats_v2')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    console.error('❌ 確認エラー:', error)
    return
  }

  const columns = Object.keys(sampleUser)
  const skpColumns = columns.filter(col => col.includes('skp'))
  
  console.log('📋 追加されたSKPカラム:', skpColumns)
  console.log(`📊 サンプルユーザーのSKP: ${sampleUser.total_skp || 0}`)
}

async function main() {
  await addSKPColumns()
  await verifyColumns()
}

if (require.main === module) {
  main().catch(console.error)
}