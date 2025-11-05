/**
 * 完全テーブル分析スクリプト
 * 51テーブル全ての詳細分析とRLS要件決定
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 環境変数読み込み
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ 必要な環境変数が設定されていません')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceRoleKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function getAllDatabaseObjects() {
  console.log('🔍 データベースオブジェクト完全取得開始...')
  
  try {
    // 1. 全テーブル取得
    const { data: tables, error: tablesError } = await supabase.rpc('execute_sql', {
      sql: `
        SELECT 
          table_name,
          table_type,
          table_schema
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `
    })

    if (tablesError) {
      // 直接クエリで試行
      console.log('📋 直接クエリでテーブル一覧を取得...')
      
      const tablesQuery = `
        SELECT tablename as table_name, schemaname as table_schema
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `
      
      const { data: directTables, error: directError } = await supabase
        .from('pg_tables')
        .select('tablename, schemaname')
        .eq('schemaname', 'public')
        .order('tablename')

      if (directError) {
        console.error('❌ テーブル取得エラー:', directError)
        return null
      }

      console.log(`✅ テーブル数: ${directTables.length}`)
      return { tables: directTables.map(t => ({ table_name: t.tablename, table_schema: t.schemaname })) }
    }

    console.log(`✅ テーブル数: ${tables.length}`)
    return { tables }

  } catch (error) {
    console.error('❌ データベースオブジェクト取得エラー:', error)
    return null
  }
}

async function analyzeTableStructure(tableName) {
  console.log(`🔍 ${tableName} の構造分析中...`)
  
  try {
    // テーブルのカラム情報取得
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', tableName)
      .order('ordinal_position')

    if (error) {
      console.error(`❌ ${tableName} カラム情報取得エラー:`, error)
      return null
    }

    // user_id列の存在確認
    const hasUserId = columns.some(col => col.column_name === 'user_id')
    
    // id列の存在確認
    const hasId = columns.some(col => col.column_name === 'id')
    
    // created_at/updated_at列の存在確認
    const hasTimestamps = {
      created_at: columns.some(col => col.column_name === 'created_at'),
      updated_at: columns.some(col => col.column_name === 'updated_at')
    }

    return {
      table_name: tableName,
      columns: columns,
      column_count: columns.length,
      has_user_id: hasUserId,
      has_id: hasId,
      has_timestamps: hasTimestamps,
      classification: classifyTable(tableName, columns, hasUserId)
    }

  } catch (error) {
    console.error(`❌ ${tableName} 構造分析エラー:`, error)
    return null
  }
}

function classifyTable(tableName, columns, hasUserId) {
  // システムテーブル判定
  if (tableName.startsWith('auth_') || 
      tableName.includes('_audit') || 
      tableName.includes('_log') ||
      tableName.endsWith('_logs')) {
    return 'SYSTEM'
  }

  // ビューテーブル判定（統計系）
  if (tableName.includes('_stats') || 
      tableName.includes('_summary') || 
      tableName.includes('_analytics')) {
    return 'VIEW_OR_COMPUTED'
  }

  // ユーザーデータテーブル判定
  if (hasUserId) {
    return 'USER_DATA'
  }

  // マスタデータテーブル判定
  if (tableName.includes('_master') || 
      tableName.endsWith('categories') || 
      tableName.endsWith('_settings') ||
      tableName.includes('questions') ||
      tableName.includes('cards')) {
    return 'MASTER_DATA'
  }

  // デフォルト分類
  return 'UNKNOWN'
}

function determineRLSRequirement(tableInfo) {
  const { table_name, classification, has_user_id } = tableInfo

  switch (classification) {
    case 'USER_DATA':
      return {
        rls_required: true,
        rls_type: 'USER_ISOLATION',
        policy_description: `user_id = auth.uid() のポリシーでユーザー分離`,
        priority: 'HIGH'
      }

    case 'MASTER_DATA':
      return {
        rls_required: true,
        rls_type: 'READ_ONLY',
        policy_description: '認証済みユーザーは読み取り専用、管理者は読み書き可能',
        priority: 'MEDIUM'
      }

    case 'SYSTEM':
      return {
        rls_required: true,
        rls_type: 'ADMIN_ONLY',
        policy_description: 'システム管理者のみアクセス可能',
        priority: 'HIGH'
      }

    case 'VIEW_OR_COMPUTED':
      return {
        rls_required: true,
        rls_type: 'READ_ONLY_OR_USER_BASED',
        policy_description: 'ビューの場合は元テーブルのRLSに依存、計算テーブルの場合はuser_idベース',
        priority: 'MEDIUM'
      }

    default:
      return {
        rls_required: true,
        rls_type: 'INVESTIGATION_NEEDED',
        policy_description: '詳細調査が必要 - 用途と内容を確認してポリシー策定',
        priority: 'HIGH'
      }
  }
}

async function generateCompleteAnalysis() {
  console.log('🚀 完全テーブル分析開始...')
  
  const dbObjects = await getAllDatabaseObjects()
  if (!dbObjects) {
    console.error('❌ データベースオブジェクト取得に失敗しました')
    return
  }

  const analysisResults = []
  const rlsRequirements = {
    USER_DATA: [],
    MASTER_DATA: [],
    SYSTEM: [],
    VIEW_OR_COMPUTED: [],
    UNKNOWN: []
  }

  // 各テーブルの詳細分析
  for (const table of dbObjects.tables) {
    const tableInfo = await analyzeTableStructure(table.table_name)
    if (tableInfo) {
      const rlsReq = determineRLSRequirement(tableInfo)
      
      const completeInfo = {
        ...tableInfo,
        rls_requirement: rlsReq
      }
      
      analysisResults.push(completeInfo)
      rlsRequirements[tableInfo.classification].push(completeInfo)
      
      console.log(`✅ ${table.table_name}: ${tableInfo.classification} - RLS: ${rlsReq.rls_type}`)
    }
    
    // API制限対策で少し待機
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  // 結果の整理
  const summary = {
    total_tables: analysisResults.length,
    by_classification: {
      USER_DATA: rlsRequirements.USER_DATA.length,
      MASTER_DATA: rlsRequirements.MASTER_DATA.length,
      SYSTEM: rlsRequirements.SYSTEM.length,
      VIEW_OR_COMPUTED: rlsRequirements.VIEW_OR_COMPUTED.length,
      UNKNOWN: rlsRequirements.UNKNOWN.length
    },
    high_priority_rls: analysisResults.filter(t => t.rls_requirement.priority === 'HIGH').length,
    medium_priority_rls: analysisResults.filter(t => t.rls_requirement.priority === 'MEDIUM').length
  }

  console.log('\n📊 分析結果サマリー:')
  console.log('総テーブル数:', summary.total_tables)
  console.log('分類別:', summary.by_classification)
  console.log('優先度HIGH:', summary.high_priority_rls)
  console.log('優先度MEDIUM:', summary.medium_priority_rls)

  // 結果をファイルに保存
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const outputFile = `analysis-results-${timestamp}.json`
  
  fs.writeFileSync(outputFile, JSON.stringify({
    summary,
    detailed_results: analysisResults,
    rls_requirements: rlsRequirements,
    analysis_timestamp: new Date().toISOString()
  }, null, 2))

  console.log(`\n💾 分析結果保存: ${outputFile}`)
  
  return {
    summary,
    analysisResults,
    rlsRequirements
  }
}

// スクリプト実行
if (require.main === module) {
  generateCompleteAnalysis()
    .then(() => {
      console.log('✅ 完全テーブル分析完了')
      process.exit(0)
    })
    .catch(error => {
      console.error('❌ 分析実行エラー:', error)
      process.exit(1)
    })
}

module.exports = { generateCompleteAnalysis, analyzeTableStructure }