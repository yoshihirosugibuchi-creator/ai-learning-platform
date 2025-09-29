#!/usr/bin/env npx tsx

/**
 * XP設定テーブルの状況確認スクリプト
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

async function checkXPSettings() {
  console.log('🔍 XP設定テーブル確認開始\n')

  // テーブル存在確認（直接アクセスで確認）
  console.log('✅ xp_settingsテーブルへ直接アクセスを試行します')

  // 全レコード確認
  const { data: allSettings, error: allError } = await supabase
    .from('xp_settings')
    .select('*')
    .order('setting_key')

  if (allError) {
    console.error('❌ XP設定取得エラー:', allError)
    return
  }

  if (!allSettings || allSettings.length === 0) {
    console.log('⚠️ XP設定レコードが存在しません')
    console.log('🔧 必要なXP設定を挿入します...')
    await insertDefaultXPSettings()
    return
  }

  console.log(`📋 XP設定レコード (${allSettings.length}件):`)
  allSettings.forEach(setting => {
    console.log(`  ${setting.setting_key}: ${setting.setting_value} (${setting.setting_description})`)
  })

  // コース関連設定の確認
  const courseSettings = allSettings.filter(s => s.setting_key.startsWith('xp_course_'))
  console.log(`\n📚 コース関連設定 (${courseSettings.length}件):`)
  if (courseSettings.length === 0) {
    console.log('⚠️ コース関連のXP設定が不足しています')
    console.log('🔧 コース関連XP設定を追加します...')
    await insertCourseXPSettings()
  } else {
    courseSettings.forEach(setting => {
      console.log(`  ${setting.setting_key}: ${setting.setting_value}`)
    })
  }
}

async function insertDefaultXPSettings() {
  const defaultSettings = [
    // クイズXP設定
    { setting_key: 'xp_quiz_basic', setting_value: '10', setting_description: 'クイズ基礎問題のXP', setting_type: 'number' },
    { setting_key: 'xp_quiz_intermediate', setting_value: '20', setting_description: 'クイズ中級問題のXP', setting_type: 'number' },
    { setting_key: 'xp_quiz_advanced', setting_value: '30', setting_description: 'クイズ上級問題のXP', setting_type: 'number' },
    { setting_key: 'xp_quiz_expert', setting_value: '50', setting_description: 'クイズエキスパート問題のXP', setting_type: 'number' },
    
    // コースXP設定
    { setting_key: 'xp_course_basic', setting_value: '15', setting_description: 'コース基礎セッションのXP', setting_type: 'number' },
    { setting_key: 'xp_course_intermediate', setting_value: '25', setting_description: 'コース中級セッションのXP', setting_type: 'number' },
    { setting_key: 'xp_course_advanced', setting_value: '35', setting_description: 'コース上級セッションのXP', setting_type: 'number' },
    { setting_key: 'xp_course_expert', setting_value: '55', setting_description: 'コースエキスパートセッションのXP', setting_type: 'number' },
    
    // ボーナスXP設定
    { setting_key: 'xp_bonus_quiz_80_percent', setting_value: '20', setting_description: 'クイズ80%以上のボーナスXP', setting_type: 'number' },
    { setting_key: 'xp_bonus_quiz_100_percent', setting_value: '30', setting_description: 'クイズ100%のボーナスXP', setting_type: 'number' },
    { setting_key: 'xp_bonus_course_completion', setting_value: '20', setting_description: 'コース完了ボーナスXP', setting_type: 'number' },
    
    // レベル設定
    { setting_key: 'xp_level_threshold', setting_value: '1000', setting_description: 'レベルアップに必要なXP', setting_type: 'number' }
  ]

  for (const setting of defaultSettings) {
    const { error } = await supabase
      .from('xp_settings')
      .insert(setting)

    if (error && error.code !== '23505') { // 重複エラー以外
      console.error(`❌ 設定挿入エラー (${setting.setting_key}):`, error)
    } else {
      console.log(`✅ 挿入: ${setting.setting_key}`)
    }
  }
}

async function insertCourseXPSettings() {
  const courseSettings = [
    { setting_key: 'xp_course_basic', setting_value: '15', setting_description: 'コース基礎セッションのXP', setting_type: 'number' },
    { setting_key: 'xp_course_intermediate', setting_value: '25', setting_description: 'コース中級セッションのXP', setting_type: 'number' },
    { setting_key: 'xp_course_advanced', setting_value: '35', setting_description: 'コース上級セッションのXP', setting_type: 'number' },
    { setting_key: 'xp_course_expert', setting_value: '55', setting_description: 'コースエキスパートセッションのXP', setting_type: 'number' }
  ]

  for (const setting of courseSettings) {
    const { error } = await supabase
      .from('xp_settings')
      .upsert(setting)

    if (error) {
      console.error(`❌ コース設定挿入エラー (${setting.setting_key}):`, error)
    } else {
      console.log(`✅ コース設定: ${setting.setting_key}`)
    }
  }
}

if (require.main === module) {
  checkXPSettings().catch(console.error)
}