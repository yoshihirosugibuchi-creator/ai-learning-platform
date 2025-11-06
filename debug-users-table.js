// ブラウザコンソールで実行するデバッグスクリプト
// マイページ（http://localhost:3000/profile）を開いた状態で実行してください

async function debugUsersTable() {
  try {
    console.log('🔍 Starting users table debug...')
    
    // 認証トークンを取得
    const { supabase } = await import('/lib/supabase.js')
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      console.error('❌ No session found')
      return
    }
    
    console.log('✅ Session found:', session.user.email)
    
    // デバッグAPIを呼び出し
    const response = await fetch('/api/debug/users-table-access', {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    })
    
    const result = await response.json()
    console.log('🔍 Debug results:', result)
    
    // 結果の詳細表示
    if (result.tests) {
      console.log('📊 Client Access:', result.tests.clientAccess)
      console.log('📊 Admin Access:', result.tests.adminAccess)
      console.log('📊 Table Exists:', result.tests.tableExists)
    }
    
    return result
    
  } catch (error) {
    console.error('❌ Debug failed:', error)
  }
}

// 実行
debugUsersTable()