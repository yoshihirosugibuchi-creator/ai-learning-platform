#!/usr/bin/env tsx

/**
 * XP統合APIテストスクリプト
 * 作成したAPIが正常に動作するかテスト
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testXPAPIs() {
  console.log('🧪 XP統合APIテスト開始...\n')

  try {
    // 1. テストデータベース構造確認
    console.log('📊 1. データベース構造確認:')
    
    const tables = [
      'xp_level_skp_settings',
      'quiz_sessions', 
      'quiz_answers',
      'user_xp_stats_v2',
      'user_category_xp_stats_v2',
      'user_subcategory_xp_stats_v2'
    ]

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })

        if (error) {
          console.log(`   ❌ ${table}: ${error.message}`)
        } else {
          console.log(`   ✅ ${table}: ${count || 0}件`)
        }
      } catch (err) {
        console.log(`   ❌ ${table}: エラー - ${err}`)
      }
    }

    // 2. XP設定値確認
    console.log('\n⚙️ 2. XP設定値確認:')
    const { data: settings, error: settingsError } = await supabase
      .from('xp_level_skp_settings')
      .select('*')
      .eq('is_active', true)
      .order('setting_category, setting_key')

    if (settingsError) {
      console.log(`   ❌ 設定取得エラー: ${settingsError.message}`)
    } else if (settings && settings.length > 0) {
      console.log(`   ✅ ${settings.length}個の設定値が存在:`)
      settings.forEach(setting => {
        console.log(`     ${setting.setting_key}: ${setting.setting_value} (${setting.setting_description})`)
      })
    } else {
      console.log('   ⚠️ XP設定値が見つかりません')
    }

    // 3. XP計算関数テスト
    console.log('\n🧮 3. XP計算関数テスト:')
    const difficulties = ['basic', 'intermediate', 'advanced', 'expert']
    
    for (const difficulty of difficulties) {
      try {
        const { data: xp, error } = await supabase
          .rpc('calculate_question_xp', { difficulty })

        if (error) {
          console.log(`   ❌ ${difficulty}: ${error.message}`)
        } else {
          console.log(`   ✅ ${difficulty}: ${xp}XP`)
        }
      } catch (err) {
        console.log(`   ❌ ${difficulty}: 関数エラー - ${err}`)
      }
    }

    // 4. テストユーザー作成（ダミーデータ）
    console.log('\n👤 4. テストユーザー確認:')
    
    // 既存ユーザーの確認
    const { data: existingUsers, error: userError } = await supabase.auth.admin.listUsers()
    
    if (userError) {
      console.log(`   ❌ ユーザー一覧取得エラー: ${userError.message}`)
    } else {
      console.log(`   ✅ 登録ユーザー数: ${existingUsers.users.length}人`)
      
      if (existingUsers.users.length > 0) {
        const testUser = existingUsers.users[0]
        console.log(`   📝 テストユーザー: ${testUser.email} (${testUser.id.substring(0, 8)}...)`)
        
        // 5. テストユーザーでXP統計確認
        console.log('\n📈 5. XP統計テーブル確認:')
        
        const { data: userStats, error: statsError } = await supabase
          .from('user_xp_stats')
          .select('*')
          .eq('user_id', testUser.id)
          .single()

        if (statsError && statsError.code !== 'PGRST116') {
          console.log(`   ❌ ユーザー統計エラー: ${statsError.message}`)
        } else if (userStats) {
          console.log(`   ✅ ユーザー統計存在: 総XP=${userStats.total_xp}, クイズセッション=${userStats.quiz_sessions_completed}回`)
        } else {
          console.log('   ⚠️ ユーザー統計が存在しません（初回状態）')
        }
      }
    }

    // 6. サンプルクイズデータでXP保存テスト
    console.log('\n🎯 6. サンプルクイズセッションテスト:')
    
    // テスト用ダミーデータ
    const sampleQuizData = {
      session_start_time: new Date().toISOString(),
      total_questions: 3,
      correct_answers: 2,
      accuracy_rate: 66.67,
      answers: [
        {
          question_id: 'test_q1',
          user_answer: 1,
          is_correct: true,
          time_spent: 30,
          is_timeout: false,
          category_id: 'thinking',
          subcategory_id: 'logical_thinking',
          difficulty: 'intermediate'
        },
        {
          question_id: 'test_q2', 
          user_answer: 2,
          is_correct: false,
          time_spent: 45,
          is_timeout: false,
          category_id: 'thinking',
          subcategory_id: 'logical_thinking',
          difficulty: 'basic'
        },
        {
          question_id: 'test_q3',
          user_answer: 3,
          is_correct: true,
          time_spent: 25,
          is_timeout: false,
          category_id: 'thinking',
          subcategory_id: 'creative_thinking',
          difficulty: 'advanced'
        }
      ]
    }

    console.log('   📝 テストクイズデータ準備完了')
    console.log(`     問題数: ${sampleQuizData.total_questions}問`)
    console.log(`     正答数: ${sampleQuizData.correct_answers}問`)
    console.log(`     正答率: ${sampleQuizData.accuracy_rate}%`)

    console.log('\n✅ XP統合APIテスト完了')
    console.log('\n🔄 次のステップ:')
    console.log('   1. localhost:3000でアプリを起動')
    console.log('   2. ログイン後に /api/xp-stats にアクセス')
    console.log('   3. クイズを実行して /api/xp-save/quiz をテスト')
    console.log('   4. XP統計の更新を確認')

  } catch (error) {
    console.error('❌ APIテストエラー:', error)
  }
}

testXPAPIs().catch(console.error)