#!/usr/bin/env npx tsx

/**
 * XP_level_skp_settingsテーブル内容確認スクリプト
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

async function checkLevelSkpSettings() {
  console.log('🔍 XP_level_skp_settingsテーブル確認開始\n')

  // XP_level_skp_settingsテーブル確認
  const { data: levelSkpSettings, error: levelSkpError } = await supabase
    .from('xp_level_skp_settings')
    .select('*')
    .order('setting_category, setting_key')

  if (levelSkpError) {
    console.error('❌ XP_level_skp_settings取得エラー:', levelSkpError)
    return
  }

  if (!levelSkpSettings || levelSkpSettings.length === 0) {
    console.log('⚠️ XP_level_skp_settingsにデータがありません')
    return
  }

  console.log(`✅ XP_level_skp_settings: ${levelSkpSettings.length}件\n`)
  
  // カテゴリ別に表示
  const categories = [...new Set(levelSkpSettings.map(s => s.setting_category))]
  categories.forEach(category => {
    console.log(`📋 [${category}]`)
    const categorySettings = levelSkpSettings.filter(s => s.setting_category === category)
    categorySettings.forEach(setting => {
      console.log(`  ${setting.setting_key}: ${setting.setting_value} ${setting.is_active ? '✅' : '❌'} - ${setting.setting_description || 'N/A'}`)
    })
    console.log('')
  })

  // xp_settingsと比較
  console.log('\n🔄 xp_settingsとの比較:')
  const { data: xpSettings, error: xpError } = await supabase
    .from('xp_settings')
    .select('*')
    .order('setting_key')

  if (xpError) {
    console.error('❌ xp_settings取得エラー:', xpError)
    return
  }

  if (xpSettings && xpSettings.length > 0) {
    console.log(`\n📋 xp_settings (${xpSettings.length}件):`)
    xpSettings.forEach(setting => {
      console.log(`  ${setting.setting_key}: ${setting.setting_value} - ${setting.setting_description || 'N/A'}`)
    })

    // wisdom card関連設定があるかチェック
    const wisdomCardSettings = xpSettings.filter(s => s.setting_key.includes('wisdom_cards'))
    if (wisdomCardSettings.length > 0) {
      console.log('\n🎯 wisdom card関連設定 (xp_settingsから):')
      wisdomCardSettings.forEach(setting => {
        console.log(`  ${setting.setting_key}: ${setting.setting_value}`)
      })
    }
  }
}

if (require.main === module) {
  checkLevelSkpSettings().catch(console.error)
}