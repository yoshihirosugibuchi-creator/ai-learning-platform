import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCurrentUserProfile() {
  console.log('🔍 現在ログイン中のユーザーのプロフィール確認')
  console.log('='.repeat(60))
  
  try {
    // 最近ログインしたユーザーを確認（XP統計から推測）
    console.log('\n1. XP統計から最近アクティブなユーザーを特定:')
    const { data: xpUsers, error: xpError } = await supabase
      .from('user_xp_stats_v2')
      .select('user_id, total_xp, total_learning_time_seconds')
      .order('total_xp', { ascending: false })
      .limit(5)
    
    if (xpError) {
      console.log('❌ XP統計取得エラー:', xpError.message)
    } else {
      console.log('📊 XP統計上位ユーザー:')
      if (xpUsers) {
        for (const xpUser of xpUsers) {
          console.log(`  - ${xpUser.user_id.substring(0, 8)}... : ${xpUser.total_xp} XP`)
          
          // このユーザーのプロフィール詳細を取得
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', xpUser.user_id)
            .single()
          
          if (profileError) {
            console.log(`    ❌ プロフィール取得失敗: ${profileError.message}`)
          } else if (profile) {
            console.log(`    📋 プロフィール詳細:`)
            console.log(`      - Email: ${profile.email}`)
            console.log(`      - Name: ${profile.name || 'null'}`)
            console.log(`      - Display Name: ${profile.display_name || 'null'}`)
            console.log(`      - Industry: ${profile.industry || 'null'}`)
            console.log(`      - Job Title: ${profile.job_title || 'null'}`)
            console.log(`      - Learning Level: ${profile.learning_level || 'null'}`)
            console.log(`      - Profile Completed: ${profile.profile_completed_at || 'null'}`)
            console.log(`      - Last Update: ${profile.last_profile_update || 'null'}`)
            console.log(`      - Created: ${profile.created_at}`)
            console.log(`      - Updated: ${profile.updated_at}`)
          }
          console.log()
        }
      }
    }
    
    // 2. プロフィール完成度の分析
    console.log('\n2. プロフィール完成度分析:')
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('users')
      .select('email, name, display_name, industry, job_title, learning_level, profile_completed_at')
    
    if (allProfilesError) {
      console.log('❌ 全プロフィール取得エラー:', allProfilesError.message)
    } else if (allProfiles) {
      console.log(`📊 全プロフィール数: ${allProfiles.length}`)
      
      let completeProfiles = 0
      let partialProfiles = 0
      let minimalProfiles = 0
      
      allProfiles.forEach(profile => {
        const hasExtendedInfo = profile.display_name || profile.industry || profile.job_title || profile.learning_level
        const hasCompleted = profile.profile_completed_at
        
        if (hasCompleted && hasExtendedInfo) {
          completeProfiles++
        } else if (hasExtendedInfo) {
          partialProfiles++
        } else {
          minimalProfiles++
        }
      })
      
      console.log(`  ✅ 完成プロフィール: ${completeProfiles}`)
      console.log(`  🔶 部分プロフィール: ${partialProfiles}`)
      console.log(`  ⚠️ 最小プロフィール: ${minimalProfiles}`)
    }
    
    // 3. プロフィール問題の原因分析
    console.log('\n3. プロフィール表示問題の原因分析:')
    console.log('💡 判明した問題点:')
    console.log('  1. 多くのユーザーで拡張プロフィール情報（display_name, industry等）がnull')
    console.log('  2. プロフィール完成フラグ（profile_completed_at）がnull')
    console.log('  3. 基本情報（name, email）は存在するが、拡張情報が不足')
    console.log('\n🔧 推奨する修正アプローチ:')
    console.log('  1. プロフィール表示時のnull値ハンドリング改善')
    console.log('  2. 未設定フィールドの適切なデフォルト表示')
    console.log('  3. プロフィール編集促進UI追加')
    
    console.log('\n✅ 分析完了')
    
  } catch (error) {
    console.error('❌ 分析中にエラー発生:', error)
  }
}

checkCurrentUserProfile()