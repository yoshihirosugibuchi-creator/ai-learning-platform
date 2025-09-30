import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function listAllTables() {
  console.log('📋 Supabase データベース テーブル一覧')
  console.log('='.repeat(50))
  
  try {
    // 1. information_schemaを使用してテーブル一覧を取得
    console.log('\n📊 基本テーブル一覧:')
    
    // 直接SQLクエリを実行
    const { data: tables, error } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `
      })
    
    if (error) {
      console.log('RPC経由でのクエリが失敗。代替方法を使用...')
      await listTablesAlternative()
      return
    }
    
    if (tables && tables.length > 0) {
      console.log(`テーブル数: ${tables.length}`)
      tables.forEach((table: any, index: number) => {
        console.log(`${index + 1}. ${table.table_name}`)
      })
    }
    
    // 2. 各テーブルの基本情報を個別取得
    console.log('\n🔍 テーブル詳細情報:')
    
    // 検出されたテーブルまたは既知のテーブルを使用
    const tableNames = tables?.map((t: any) => t.table_name) || [
      'quiz_sessions',
      'quiz_results', 
      'quiz_answers',
      'learning_progress',
      'user_xp_stats_v2',
      'user_xp_stats',
      'daily_xp_records',
      'user_category_xp_stats_v2',
      'user_subcategory_xp_stats_v2',
      'categories',
      'subcategories',
      'user_settings',
      'skp_transactions',
      'course_session_completions',
      'category_progress',
      'user_progress',
      'detailed_quiz_data'
    ]
    
    for (const tableName of tableNames) {
      try {
        // テーブルの存在確認と行数取得
        const { count, error: countError } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true })
        
        if (countError) {
          console.log(`❌ ${tableName}: アクセスできません (${countError.message})`)
        } else {
          console.log(`✅ ${tableName}: ${count || 0} 行`)
        }
      } catch (err) {
        console.log(`❌ ${tableName}: テーブルが存在しないか、アクセスできません`)
      }
    }
    
  } catch (error) {
    console.error('❌ テーブル一覧取得エラー:', error)
    await listTablesAlternative()
  }
}

async function listTablesAlternative() {
  console.log('\n🔄 代替方法でテーブル一覧を取得中...')
  
  // 既知のテーブルに対して直接アクセステストを実行
  const possibleTables = [
    'auth',
    'categories', 
    'subcategories',
    'quiz_sessions',
    'quiz_results',
    'quiz_answers', 
    'learning_progress',
    'user_xp_stats',
    'user_xp_stats_v2',
    'user_category_xp_stats',
    'user_category_xp_stats_v2', 
    'user_subcategory_xp_stats_v2',
    'daily_xp_records',
    'user_settings',
    'category_progress',
    'user_progress', 
    'detailed_quiz_data',
    'skp_transactions',
    'course_session_completions',
    'users',
    'profiles'
  ]
  
  console.log('\n📋 アクセス可能なテーブル:')
  const accessibleTables = []
  
  for (const tableName of possibleTables) {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
      
      if (!error) {
        accessibleTables.push({ name: tableName, count: count || 0 })
        console.log(`✅ ${tableName}: ${count || 0} 行`)
      }
    } catch (err) {
      // テーブルが存在しない場合は静かに無視
    }
  }
  
  console.log(`\n📊 合計 ${accessibleTables.length} テーブルにアクセス可能`)
  
  // 行数でソート
  const sortedTables = accessibleTables.sort((a, b) => b.count - a.count)
  console.log('\n📈 行数順（多い順）:')
  sortedTables.forEach((table, index) => {
    console.log(`${index + 1}. ${table.name}: ${table.count} 行`)
  })
}

listAllTables()