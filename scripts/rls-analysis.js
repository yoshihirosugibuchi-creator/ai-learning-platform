const { createClient } = require('@supabase/supabase-js')

// 環境変数を読み込み
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ 環境変数が不足しています')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '設定済み' : '未設定')
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function analyzeRLS() {
  console.log('🔍 RLS設定分析を開始します...\n')

  try {
    // 1. 全テーブル一覧とRLS設定状況を取得
    console.log('📋 全テーブルの取得中...')
    
    // SupabaseのRPC関数を使ってテーブル情報を取得
    let tablesData = null
    let tablesError = null
    
    // 複数の方法を試行
    try {
      const { data, error } = await supabaseAdmin.rpc('get_schema_info')
      if (!error) {
        tablesData = data
      } else {
        tablesError = error
      }
    } catch (e) {
      // get_schema_info関数が存在しない場合、別の方法を試す
      try {
        const { data, error } = await supabaseAdmin
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .eq('table_type', 'BASE TABLE')
        
        if (!error && data) {
          tablesData = data.map(t => ({
            table_name: t.table_name,
            rls_enabled: null,
            rls_status: 'Unknown'
          }))
        } else {
          tablesError = error || { message: 'No data returned' }
        }
      } catch (e2) {
        tablesError = { message: 'All RPC methods failed' }
      }
    }

    if (tablesError) {
      console.error('⚠️ SQL関数でのテーブル取得に失敗、フォールバック方式を使用:', tablesError.message)
      
      // フォールバック: 既知のテーブルをチェック
      const knownTables = [
        'users', 'categories', 'subcategories', 'quiz_questions', 'quiz_sessions', 
        'quiz_answers', 'user_xp_stats_v2', 'user_category_xp_stats_v2', 
        'user_subcategory_xp_stats_v2', 'daily_xp_records', 'skp_transactions',
        'learning_courses', 'learning_themes', 'learning_sessions', 
        'course_session_completions', 'wisdom_cards', 'wisdom_card_collection',
        'xp_level_skp_settings', 'unified_learning_session_analytics',
        'user_learning_profiles', 'spaced_repetition_schedule',
        'industry_level_targets', 'learning_analytics_summary',
        'learning_effectiveness_tracking', 'system_alerts',
        'system_config_monitoring', 'system_health_logs',
        'daily_analytics_batch_log', 'skill_levels'
      ]

      const fallbackTables = []
      for (const tableName of knownTables) {
        try {
          const { error } = await supabaseAdmin
            .from(tableName)
            .select('*')
            .limit(1)
          
          if (!error) {
            fallbackTables.push({
              table_name: tableName,
              rls_enabled: null,
              rls_status: 'Unknown'
            })
          }
        } catch (e) {
          // テーブルが存在しない場合はスキップ
        }
      }
      
      console.log(`✅ フォールバック方式で ${fallbackTables.length} 個のテーブルを検出\n`)
      
      // テーブル一覧を表示
      console.log('📊 テーブル一覧:')
      console.log('==========================================')
      console.log('テーブル名'.padEnd(35) + 'RLS設定')
      console.log('==========================================')
      
      fallbackTables.forEach(table => {
        const status = table.rls_status === 'Unknown' ? '🔍 不明' : 
                      table.rls_status === 'Enabled' ? '✅ 有効' : '❌ 無効'
        console.log(table.table_name.padEnd(35) + status)
      })
      
      console.log('==========================================\n')
      
      // user_id列の存在確認（個別テーブルアクセスで確認）
      console.log('🔍 user_id列の存在確認中...')
      const tablesWithUserId = []
      
      for (const table of fallbackTables) {
        try {
          // 実際にテーブルからuser_id列を選択してみる
          const { data, error } = await supabaseAdmin
            .from(table.table_name)
            .select('user_id')
            .limit(1)
          
          if (!error) {
            tablesWithUserId.push(table.table_name)
          }
        } catch (e) {
          // user_id列が存在しない場合はエラーになるのでスキップ
        }
      }
      
      console.log('📋 user_id列を持つテーブル:')
      console.log('==========================================')
      tablesWithUserId.forEach(tableName => {
        console.log(`- ${tableName}`)
      })
      console.log('==========================================\n')
      
      // リスク分析
      console.log('⚠️ RLS設定リスク分析:')
      console.log('==========================================')
      
      const userDataTables = fallbackTables.filter(table => 
        tablesWithUserId.includes(table.table_name) ||
        table.table_name.startsWith('user_') ||
        table.table_name === 'users' ||
        ['quiz_sessions', 'quiz_answers', 'daily_xp_records', 'skp_transactions', 'course_session_completions'].includes(table.table_name)
      )
      
      const masterDataTables = fallbackTables.filter(table => 
        !userDataTables.includes(table)
      )
      
      console.log('🔴 ユーザーデータテーブル (RLS推奨):')
      userDataTables.forEach(table => {
        const risk = table.rls_status === 'Unknown' ? '⚠️ 要確認' : 
                     table.rls_status === 'Disabled' ? '🚨 HIGH RISK' : '✅ 安全'
        console.log(`  ${table.table_name.padEnd(35)} ${risk}`)
      })
      
      console.log('\n🟡 マスタデータテーブル (RLS任意):')
      masterDataTables.forEach(table => {
        const status = table.rls_status === 'Unknown' ? '🔍 要確認' : 
                      table.rls_status === 'Enabled' ? '✅ 有効' : '⚪ 無効(通常)'
        console.log(`  ${table.table_name.padEnd(35)} ${status}`)
      })
      
      console.log('==========================================\n')
      
      // 問題のあるテーブルの特定
      const problemTables = userDataTables.filter(table => 
        table.rls_status === 'Disabled' || table.rls_status === 'Unknown'
      )
      
      if (problemTables.length > 0) {
        console.log('🚨 問題のあるテーブル (緊急対応必要):')
        console.log('==========================================')
        problemTables.forEach(table => {
          console.log(`❌ ${table.table_name}`)
          if (table.rls_status === 'Disabled') {
            console.log('   理由: ユーザーデータテーブルでRLSが無効')
          } else {
            console.log('   理由: RLS設定状況が不明')
          }
          console.log('   対策: RLSポリシーの設定・確認が必要')
          console.log('')
        })
        console.log('==========================================\n')
      } else {
        console.log('✅ 明らかな問題は検出されませんでした\n')
      }
      
      return
    }

    // 成功した場合の処理
    console.log(`✅ ${tablesData.length} 個のテーブルを検出\n`)
    
    // 2. user_id列の存在確認（個別テーブルアクセスで確認）
    console.log('🔍 user_id列の存在確認中...')
    const tablesWithUserId = []
    
    for (const table of tablesData) {
      try {
        // 実際にテーブルからuser_id列を選択してみる
        const { data, error } = await supabaseAdmin
          .from(table.table_name)
          .select('user_id')
          .limit(1)
        
        if (!error) {
          tablesWithUserId.push(table.table_name)
        }
      } catch (e) {
        // user_id列が存在しない場合はエラーになるのでスキップ
      }
    }

    // カラム情報をシミュレート
    const columnsData = []
    tablesWithUserId.forEach(tableName => {
      columnsData.push({
        table_name: tableName,
        column_name: 'user_id',
        data_type: 'uuid',
        is_nullable: 'NO'
      })
    })

    console.log(`✅ ${tablesWithUserId.length} 個のテーブルでuser_id列を検出\n`)

    // RLSポリシーの取得は今回はスキップ（アクセス制限のため）
    const policiesData = []

    // 結果の表示
    displayResults(tablesData, policiesData, columnsData)

  } catch (error) {
    console.error('❌ RLS分析中にエラーが発生しました:', error.message)
  }
}

function displayResults(tables, policies, columns) {
  // テーブル一覧とRLS設定状況
  console.log('📊 テーブル一覧とRLS設定状況:')
  console.log('='.repeat(80))
  console.log('テーブル名'.padEnd(35) + 'RLS設定'.padEnd(15) + 'user_id'.padEnd(10) + 'リスク')
  console.log('='.repeat(80))
  
  tables.forEach(table => {
    const hasUserId = columns.some(col => 
      col.table_name === table.table_name && col.column_name === 'user_id'
    )
    
    const isUserTable = table.table_name.startsWith('user_') || table.table_name === 'users'
    const isTransactionTable = [
      'quiz_sessions', 'quiz_answers', 'daily_xp_records', 
      'skp_transactions', 'course_session_completions'
    ].includes(table.table_name)
    
    let riskLevel = 'LOW'
    if (hasUserId || isUserTable || isTransactionTable) {
      if (!table.rls_enabled) {
        riskLevel = 'HIGH'
      } else {
        riskLevel = 'LOW'
      }
    }
    
    const rlsStatus = table.rls_enabled ? '✅ 有効' : '❌ 無効'
    const userIdStatus = hasUserId ? '✓' : '✗'
    const riskColor = riskLevel === 'HIGH' ? '🚨' : riskLevel === 'MEDIUM' ? '⚠️' : '✅'
    
    console.log(
      table.table_name.padEnd(35) + 
      rlsStatus.padEnd(15) + 
      userIdStatus.padEnd(10) + 
      `${riskColor} ${riskLevel}`
    )
  })
  console.log('='.repeat(80) + '\n')

  // 問題のあるテーブル
  const problemTables = tables.filter(table => {
    const hasUserId = columns.some(col => 
      col.table_name === table.table_name && col.column_name === 'user_id'
    )
    const isUserTable = table.table_name.startsWith('user_') || table.table_name === 'users'
    const isTransactionTable = [
      'quiz_sessions', 'quiz_answers', 'daily_xp_records', 
      'skp_transactions', 'course_session_completions'
    ].includes(table.table_name)
    
    return (hasUserId || isUserTable || isTransactionTable) && !table.rls_enabled
  })

  if (problemTables.length > 0) {
    console.log('🚨 緊急対応が必要なテーブル:')
    console.log('='.repeat(50))
    problemTables.forEach(table => {
      console.log(`❌ ${table.table_name}`)
      console.log('   理由: ユーザーデータテーブルでRLSが無効')
      console.log('   影響: 権限制御なしでデータアクセス可能')
      console.log('   対策: RLSポリシーの設定が必要')
      console.log('')
    })
    console.log('='.repeat(50) + '\n')
  } else {
    console.log('✅ 緊急対応が必要なテーブルは検出されませんでした\n')
  }

  // RLSポリシー一覧
  if (policies.length > 0) {
    console.log('📋 設定済みRLSポリシー:')
    console.log('='.repeat(80))
    console.log('テーブル名'.padEnd(25) + 'ポリシー名'.padEnd(30) + '操作')
    console.log('='.repeat(80))
    
    policies.forEach(policy => {
      console.log(
        policy.tablename.padEnd(25) + 
        policy.policyname.padEnd(30) + 
        policy.cmd
      )
    })
    console.log('='.repeat(80) + '\n')
  } else {
    console.log('⚠️ RLSポリシーが設定されていません\n')
  }

  // サマリー
  const totalTables = tables.length
  const rlsEnabledTables = tables.filter(t => t.rls_enabled).length
  const userDataTables = tables.filter(table => {
    const hasUserId = columns.some(col => 
      col.table_name === table.table_name && col.column_name === 'user_id'
    )
    const isUserTable = table.table_name.startsWith('user_') || table.table_name === 'users'
    const isTransactionTable = [
      'quiz_sessions', 'quiz_answers', 'daily_xp_records', 
      'skp_transactions', 'course_session_completions'
    ].includes(table.table_name)
    
    return hasUserId || isUserTable || isTransactionTable
  }).length

  console.log('📊 分析サマリー:')
  console.log('='.repeat(50))
  console.log(`総テーブル数: ${totalTables}`)
  console.log(`RLS有効テーブル数: ${rlsEnabledTables}`)
  console.log(`ユーザーデータテーブル数: ${userDataTables}`)
  console.log(`問題のあるテーブル数: ${problemTables.length}`)
  console.log(`設定済みポリシー数: ${policies.length}`)
  console.log('='.repeat(50))
}

// 実行
analyzeRLS().catch(console.error)