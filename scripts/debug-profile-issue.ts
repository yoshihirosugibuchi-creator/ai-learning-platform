import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugProfileIssue() {
  console.log('🔍 プロフィール問題デバッグ開始')
  console.log('='.repeat(50))
  
  try {
    // 1. usersテーブルの存在確認
    console.log('\n1. usersテーブルの存在確認:')
    const { data: tableCheck, error: tableError } = await supabase
      .from('users')
      .select('count(*)')
      .limit(0)
    
    if (tableError) {
      console.log('❌ usersテーブルにアクセスできません:', tableError.message)
      if (tableError.code === '42P01') {
        console.log('💡 usersテーブルが存在しません。作成が必要です。')
        return
      }
    } else {
      console.log('✅ usersテーブルアクセス可能')
    }
    
    // 2. 既存ユーザーデータの確認
    console.log('\n2. 既存ユーザーデータの確認:')
    const { data: existingUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, name, display_name, created_at')
      .limit(10)
    
    if (usersError) {
      console.log('❌ ユーザーデータ取得エラー:', usersError.message)
    } else {
      console.log(`📊 登録ユーザー数: ${existingUsers?.length || 0}`)
      if (existingUsers && existingUsers.length > 0) {
        console.log('👤 ユーザーサンプル:')
        existingUsers.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.email} (${user.name || 'no name'})`)
          console.log(`     - display_name: ${user.display_name || 'none'}`)
          console.log(`     - created: ${user.created_at}`)
        })
      }
    }
    
    // 3. usersテーブルのスキーマ確認
    console.log('\n3. usersテーブルのスキーマ確認:')
    try {
      const { data: schemaCheck } = await supabase
        .from('users')
        .select('*')
        .limit(1)
      
      if (schemaCheck && schemaCheck.length > 0) {
        console.log('📋 テーブルカラム:')
        const columns = Object.keys(schemaCheck[0])
        columns.forEach(col => {
          console.log(`  - ${col}: ${typeof schemaCheck[0][col]} (${schemaCheck[0][col] || 'null'})`)
        })
      } else {
        console.log('ℹ️ テーブルは空です')
      }
    } catch (schemaError) {
      console.log('⚠️ スキーマ確認でエラー:', schemaError)
    }
    
    // 4. auth.usersテーブルとの比較
    console.log('\n4. 認証ユーザーとプロフィールの照合:')
    try {
      // RPC関数でauth.usersを確認（権限があれば）
      const { data: authUsers, error: authError } = await supabase.rpc('get_auth_users')
      
      if (authError) {
        console.log('⚠️ 認証ユーザー情報にアクセスできません:', authError.message)
      } else {
        console.log(`🔐 認証済みユーザー数: ${authUsers?.length || 0}`)
      }
    } catch (authErr) {
      console.log('⚠️ 認証ユーザー確認は利用できません')
    }
    
    // 5. プロフィール作成テスト（テストユーザー）
    console.log('\n5. プロフィール作成テスト:')
    const testUserId = 'test-user-' + Date.now()
    const testProfile = {
      id: testUserId,
      email: 'test@example.com',
      name: 'Test User',
      display_name: 'テストユーザー',
      industry: 'technology',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
    try {
      const { data: createdProfile, error: createError } = await supabase
        .from('users')
        .insert(testProfile)
        .select()
        .single()
      
      if (createError) {
        console.log('❌ テストプロフィール作成エラー:', createError.message)
      } else {
        console.log('✅ テストプロフィール作成成功:', createdProfile.email)
        
        // テストプロフィール削除
        await supabase
          .from('users')
          .delete()
          .eq('id', testUserId)
        console.log('🗑️ テストプロフィール削除完了')
      }
    } catch (testError) {
      console.log('❌ プロフィール作成テストでエラー:', testError)
    }
    
    console.log('\n✅ デバッグ完了')
    
  } catch (error) {
    console.error('❌ デバッグ中にエラー発生:', error)
  }
}

debugProfileIssue()