#!/usr/bin/env tsx

/**
 * セッション関連テーブル構造の詳細調査
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// .env.local ファイルから環境変数を直接読み込み
function loadEnvFile(): Record<string, string> {
  const envPath = resolve(process.cwd(), '.env.local')
  const env: Record<string, string> = {}
  
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join('=')
        }
      }
    }
  }
  
  return env
}

const envVars = loadEnvFile()
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSessionTables() {
  console.log('🔍 セッション関連テーブル詳細調査...\n')

  const sessionTables = [
    'session_contents',
    'session_quizzes'
  ]

  for (const tableName of sessionTables) {
    console.log(`\n📊 ${tableName}テーブル:`)
    
    try {
      // テーブルの存在確認
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(2)

      if (error) {
        if (error.message.includes('relation') && error.message.includes('does not exist')) {
          console.log(`   ❌ テーブルが存在しません`)
        } else {
          console.log(`   ❌ エラー: ${error.message}`)
        }
        continue
      }

      console.log(`   ✅ テーブル存在`)
      
      // データ件数取得
      const { count, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })

      if (!countError && count !== null) {
        console.log(`   📈 データ件数: ${count}件`)
      }

      // サンプルデータ表示
      if (data && data.length > 0) {
        console.log(`   🔍 カラム:`, Object.keys(data[0]).join(', '))
        console.log(`   📋 サンプルデータ:`)
        data.forEach((item, index) => {
          console.log(`     [${index + 1}]`, JSON.stringify(item, null, 2).substring(0, 300) + '...')
        })
      }

    } catch (error) {
      console.log(`   ❌ 調査エラー:`, error)
    }
  }

  // learning_genresのサブカテゴリーID状況確認
  console.log('\n📊 learning_genresのサブカテゴリーID状況確認:')
  try {
    const { data: genres, error: genresError } = await supabase
      .from('learning_genres')
      .select('id, title, category_id, subcategory_id')
      .order('id')

    if (!genresError && genres) {
      console.log(`   件数: ${genres.length}件`)
      genres.forEach((genre, index) => {
        const isEnglishId = /^[a-z_]+$/.test(genre.subcategory_id || '')
        const status = isEnglishId ? '✅' : '❌'
        console.log(`   [${index + 1}] ${status} ID: ${genre.id}`)
        console.log(`        Category: ${genre.category_id}, Subcategory: ${genre.subcategory_id}`)
      })
    }
  } catch (error) {
    console.log('   ❌ learning_genres確認エラー:', error)
  }

  // バッジ・ナレッジカードデータ構造確認
  console.log('\n📊 バッジ・ナレッジカードデータ構造確認:')
  try {
    // learning_genresのbadge_data確認
    const { data: genreBadges, error: badgeError } = await supabase
      .from('learning_genres')
      .select('id, title, badge_data')
      .limit(2)

    if (!badgeError && genreBadges) {
      console.log(`   🎫 learning_genres badge_data構造:`)
      genreBadges.forEach((item, index) => {
        console.log(`     [${index + 1}] ${item.id}: ${item.title}`)
        console.log(`     Badge Data:`, JSON.stringify(item.badge_data, null, 2).substring(0, 200) + '...')
      })
    }

    // learning_themesのreward_card_data確認
    const { data: themeRewards, error: rewardError } = await supabase
      .from('learning_themes')
      .select('id, title, reward_card_data')
      .limit(2)

    if (!rewardError && themeRewards) {
      console.log(`   🎁 learning_themes reward_card_data構造:`)
      themeRewards.forEach((item, index) => {
        console.log(`     [${index + 1}] ${item.id}: ${item.title}`)
        console.log(`     Reward Data:`, JSON.stringify(item.reward_card_data, null, 2).substring(0, 200) + '...')
      })
    }

  } catch (error) {
    console.log('   ❌ バッジ・カードデータ確認エラー:', error)
  }

  // learning_progressの詳細確認
  console.log('\n📊 learning_progress構造確認:')
  try {
    const { data: progress, error: progressError } = await supabase
      .from('learning_progress')
      .select('*')
      .limit(2)
      .order('created_at desc')

    if (!progressError && progress) {
      console.log(`   📈 learning_progress構造:`)
      progress.forEach((item, index) => {
        console.log(`     [${index + 1}] User: ${item.user_id?.substring(0, 8)}...`)
        console.log(`        Course: ${item.course_id}, Session: ${item.session_id}`)
        console.log(`        Progress: ${item.completion_percentage}%, Data:`, JSON.stringify(item.progress_data, null, 2).substring(0, 150) + '...')
      })
    }

  } catch (error) {
    console.log('   ❌ learning_progress確認エラー:', error)
  }
}

checkSessionTables().catch(console.error)