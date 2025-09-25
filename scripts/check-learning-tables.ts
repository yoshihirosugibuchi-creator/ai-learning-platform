#!/usr/bin/env tsx

/**
 * 学習関連DBテーブル構造の調査
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

async function checkLearningTables() {
  console.log('🔍 学習関連テーブル構造調査...\n')

  const learningTables = [
    'learning_courses',
    'learning_genres', 
    'learning_themes',
    'learning_sessions',
    'learning_content',
    'learning_progress',
    'user_learning_stats'
  ]

  for (const tableName of learningTables) {
    console.log(`\n📊 ${tableName}テーブル:`)
    
    try {
      // テーブルの存在確認
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)

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
        if (count && count > 0) {
          console.log(`   📋 サンプル:`, JSON.stringify(data[0], null, 2).substring(0, 200) + '...')
        }
      }

    } catch (error) {
      console.log(`   ❌ 調査エラー:`, error)
    }
  }

  // 既存テーブルの確認
  console.log('\n🔍 既存の学習関連データ確認...')
  
  try {
    // learning_genresテーブルの詳細確認
    const { data: genres, error: genresError } = await supabase
      .from('learning_genres')
      .select('*')
      .limit(3)
      .order('id')

    if (!genresError && genres) {
      console.log(`\n📊 learning_genresテーブル詳細:`)
      console.log(`   件数: ${genres.length}件（サンプル）`)
      genres.forEach((genre, index) => {
        console.log(`   [${index + 1}] ID: ${genre.id}, Title: ${genre.title}`)
        console.log(`        Category: ${genre.subcategory_id}, Course: ${genre.course_id}`)
      })
    }

  } catch (error) {
    console.log('   ❌ 既存データ確認エラー:', error)
  }
}

checkLearningTables().catch(console.error)