#!/usr/bin/env npx tsx

/**
 * コース学習XPシステムデバッグ用スクリプト
 * 用途: 初回完了と復習モードのXP計算をテスト
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// 環境変数読み込み
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugCourseXPSystem() {
  console.log('🔍 コース学習XPシステムデバッグ開始\n')

  // 1. XP設定確認
  console.log('📋 XP設定確認:')
  const { data: xpSettings, error: xpError } = await supabase
    .from('xp_settings')
    .select('*')
    .order('setting_key')

  if (xpError) {
    console.error('❌ XP設定取得エラー:', xpError)
    return
  }

  const courseXPSettings = xpSettings?.filter(s => s.setting_key.startsWith('xp_course_'))
  courseXPSettings?.forEach(setting => {
    console.log(`  ${setting.setting_key}: ${setting.setting_value}`)
  })

  // 2. セッション完了記録の確認
  console.log('\n📚 最近のセッション完了記録:')
  const { data: completions, error: completionError } = await supabase
    .from('course_session_completions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  if (completionError) {
    console.error('❌ セッション完了記録取得エラー:', completionError)
    return
  }

  completions?.forEach(completion => {
    console.log(`  セッション: ${completion.session_id}`)
    console.log(`    初回完了: ${completion.is_first_completion}`)
    console.log(`    クイズ正解: ${completion.session_quiz_correct}`)
    console.log(`    獲得XP: ${completion.earned_xp}`)
    console.log(`    完了時刻: ${completion.completion_time}`)
    console.log('    ---')
  })

  // 3. ユーザー統計確認
  console.log('\n📊 ユーザーXP統計:')
  const { data: userStats, error: statsError } = await supabase
    .from('user_xp_stats_v2')
    .select('*')
    .order('total_xp', { ascending: false })
    .limit(5)

  if (statsError) {
    console.error('❌ ユーザー統計取得エラー:', statsError)
    return
  }

  userStats?.forEach(stat => {
    console.log(`  ユーザー: ${stat.user_id.substring(0, 8)}...`)
    console.log(`    総XP: ${stat.total_xp}`)
    console.log(`    コース完了セッション: ${stat.course_sessions_completed}`)
    console.log(`    コースXP: ${stat.course_xp}`)
    console.log('    ---')
  })

  // 4. 初回完了をテストするためのuser_settings確認
  console.log('\n🔧 user_settings進捗記録 (最新10件):')
  const { data: userSettings, error: settingsError } = await supabase
    .from('user_settings')
    .select('*')
    .like('setting_key', 'lp_%')
    .order('updated_at', { ascending: false })
    .limit(10)

  if (settingsError) {
    console.error('❌ user_settings取得エラー:', settingsError)
    return
  }

  userSettings?.forEach(setting => {
    const progressData = setting.setting_value as any
    console.log(`  進捗キー: ${setting.setting_key.replace('lp_', '')}`)
    console.log(`    完了済み: ${progressData?.completed || false}`)
    console.log(`    セッション: ${progressData?.sessionId || 'N/A'}`)
    console.log(`    完了日時: ${progressData?.completedAt || 'N/A'}`)
    console.log('    ---')
  })
}

// 初回完了をリセットしてテストする関数
async function resetSessionForTesting(sessionKey: string, userId: string) {
  console.log(`\n🔄 セッション「${sessionKey}」を初回完了テスト用にリセット`)
  
  // user_settingsから該当の進捗を削除
  const { error: deleteError } = await supabase
    .from('user_settings')
    .delete()
    .eq('user_id', userId)
    .eq('setting_key', `lp_${sessionKey}`)

  if (deleteError) {
    console.error('❌ user_settings削除エラー:', deleteError)
    return false
  }

  console.log('✅ user_settings進捗記録を削除しました')
  console.log('ℹ️  次回このセッションを完了すると初回完了としてXPが付与されます')
  return true
}

async function main() {
  await debugCourseXPSystem()
  
  // 使用例のコメント
  console.log('\n💡 使用例:')
  console.log('初回完了をテストしたい場合は以下を実行:')
  console.log('npx tsx scripts/debug-course-xp-system.ts reset [sessionKey] [userId]')
  console.log('例: npx tsx scripts/debug-course-xp-system.ts reset consulting_thinking_basics_thinking_foundation_mece_thinking_mece_basics 2a4849d1-...')
  
  // コマンドライン引数処理
  const args = process.argv.slice(2)
  if (args[0] === 'reset' && args[1] && args[2]) {
    const sessionKey = args[1]
    const userId = args[2]
    await resetSessionForTesting(sessionKey, userId)
  }
}

if (require.main === module) {
  main().catch(console.error)
}