/**
 * データベース型ファイルからテーブル情報を抽出し、分析する
 */

const fs = require('fs')
const path = require('path')

// データベース型ファイルを読み込み
const typesFilePath = path.join(__dirname, '..', 'lib', 'database-types-official.ts')
const typesContent = fs.readFileSync(typesFilePath, 'utf8')

function extractTablesFromTypes() {
  const tables = new Map()
  
  // テーブル定義の正規表現パターン
  const tablePattern = /^\s+([a-z_]+):\s*{[\s\S]*?Row:\s*{([\s\S]*?)}\s*Insert:/gm
  
  let match
  while ((match = tablePattern.exec(typesContent)) !== null) {
    const tableName = match[1]
    const rowDefinition = match[2]
    
    // 関数かテーブルかを判定
    const isFunction = checkIfFunction(tableName, rowDefinition)
    
    if (!isFunction) {
      const columns = extractColumns(rowDefinition)
      const hasUserId = columns.some(col => col.name === 'user_id')
      const classification = classifyTable(tableName, columns, hasUserId)
      
      tables.set(tableName, {
        name: tableName,
        columns: columns,
        hasUserId: hasUserId,
        classification: classification,
        rowDefinition: rowDefinition.trim()
      })
    }
  }
  
  return tables
}

function checkIfFunction(tableName, rowDefinition) {
  // 関数の特徴を判定
  const functionIndicators = [
    'calculate_',
    'analyze_',
    'get_',
    'update_',
    'process_',
    'detect_',
    'predict_',
    'provide_',
    'initialize_',
    'recalculate_',
    'add_to_',
    'optimize_'
  ]
  
  return functionIndicators.some(indicator => tableName.startsWith(indicator))
}

function extractColumns(rowDefinition) {
  const columns = []
  const lines = rowDefinition.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('//')) {
      const colonIndex = trimmed.indexOf(':')
      if (colonIndex > 0) {
        const columnName = trimmed.substring(0, colonIndex).trim()
        const columnType = trimmed.substring(colonIndex + 1).trim()
        
        if (columnName && !columnName.includes('[') && !columnName.includes('(')) {
          columns.push({
            name: columnName,
            type: columnType
          })
        }
      }
    }
  }
  
  return columns
}

function classifyTable(tableName, columns, hasUserId) {
  // ビュー・計算テーブル判定
  if (tableName.includes('_stats') || 
      tableName.includes('_summary') || 
      tableName.includes('_analytics') ||
      tableName.includes('_progress') ||
      tableName.includes('_recommendations')) {
    return 'VIEW_OR_COMPUTED'
  }

  // システムテーブル判定
  if (tableName.includes('_log') ||
      tableName.includes('_alert') ||
      tableName.includes('_monitoring') ||
      tableName.includes('_config') ||
      tableName.includes('_batch') ||
      tableName.includes('system_')) {
    return 'SYSTEM'
  }

  // 設定・マスタテーブル判定
  if (tableName.includes('_settings') ||
      tableName.includes('categories') ||
      tableName.includes('_levels') ||
      tableName.includes('_courses') ||
      tableName.includes('_themes') ||
      tableName.includes('_questions') ||
      tableName.includes('_cards') ||
      tableName.includes('xp_level') ||
      tableName === 'users') {
    return 'MASTER_DATA'
  }

  // ユーザーデータテーブル判定
  if (hasUserId) {
    return 'USER_DATA'
  }

  // 中間テーブル・その他
  if (tableName.includes('_completions') ||
      tableName.includes('_sessions') ||
      tableName.includes('_answers') ||
      tableName.includes('_transactions') ||
      tableName.includes('_collection') ||
      tableName.includes('_review') ||
      tableName.includes('_usage')) {
    return 'USER_DATA'  // 多くの場合ユーザーデータ
  }

  return 'UNKNOWN'
}

function determineRLSRequirement(tableInfo) {
  const { name, classification, hasUserId } = tableInfo

  switch (classification) {
    case 'USER_DATA':
      return {
        rlsRequired: true,
        rlsType: 'USER_ISOLATION',
        policyDescription: hasUserId 
          ? `ユーザー分離: user_id = auth.uid()` 
          : 'ユーザー関連データの適切な分離ポリシー必要',
        priority: 'HIGH',
        urgency: 'CRITICAL'
      }

    case 'MASTER_DATA':
      return {
        rlsRequired: true,
        rlsType: 'READ_ONLY_OR_ADMIN',
        policyDescription: '認証済みユーザー読み取り可、管理者のみ書き込み可',
        priority: 'MEDIUM',
        urgency: 'STANDARD'
      }

    case 'SYSTEM':
      return {
        rlsRequired: true,
        rlsType: 'ADMIN_ONLY',
        policyDescription: 'システム管理者のみアクセス可能',
        priority: 'HIGH',
        urgency: 'HIGH'
      }

    case 'VIEW_OR_COMPUTED':
      return {
        rlsRequired: true,
        rlsType: 'USER_BASED_OR_READ_ONLY',
        policyDescription: hasUserId 
          ? 'ユーザーベースのアクセス制御'
          : '認証済みユーザー読み取り専用',
        priority: 'MEDIUM',
        urgency: 'STANDARD'
      }

    default:
      return {
        rlsRequired: true,
        rlsType: 'INVESTIGATION_NEEDED',
        policyDescription: '詳細調査が必要',
        priority: 'HIGH',
        urgency: 'HIGH'
      }
  }
}

function generateAnalysisReport() {
  console.log('🔍 テーブル抽出・分析開始...')
  
  const tables = extractTablesFromTypes()
  const analysis = {
    totalTables: tables.size,
    byClassification: {
      USER_DATA: [],
      MASTER_DATA: [],
      SYSTEM: [],
      VIEW_OR_COMPUTED: [],
      UNKNOWN: []
    },
    rlsRequirements: {
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: []
    }
  }

  // 各テーブルの分析
  for (const [tableName, tableInfo] of tables) {
    const rlsReq = determineRLSRequirement(tableInfo)
    
    const completeInfo = {
      ...tableInfo,
      rlsRequirement: rlsReq
    }

    analysis.byClassification[tableInfo.classification].push(completeInfo)
    
    // 緊急度による分類
    const urgencyKey = rlsReq.urgency === 'CRITICAL' ? 'CRITICAL' :
                      rlsReq.priority === 'HIGH' ? 'HIGH' :
                      rlsReq.priority === 'MEDIUM' ? 'MEDIUM' : 'LOW'
    analysis.rlsRequirements[urgencyKey].push(completeInfo)

    console.log(`✅ ${tableName}: ${tableInfo.classification} - RLS: ${rlsReq.rlsType} (${rlsReq.urgency})`)
  }

  // サマリー表示
  console.log('\n📊 分析結果サマリー:')
  console.log(`総テーブル数: ${analysis.totalTables}`)
  console.log('分類別:')
  Object.entries(analysis.byClassification).forEach(([key, value]) => {
    console.log(`  ${key}: ${value.length}テーブル`)
  })
  console.log('RLS緊急度別:')
  Object.entries(analysis.rlsRequirements).forEach(([key, value]) => {
    console.log(`  ${key}: ${value.length}テーブル`)
  })

  return analysis
}

// メイン実行
if (require.main === module) {
  try {
    const analysis = generateAnalysisReport()
    
    // 結果をJSONファイルに保存
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const outputFile = `table-analysis-${timestamp}.json`
    
    fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2))
    console.log(`\n💾 分析結果保存: ${outputFile}`)
    
  } catch (error) {
    console.error('❌ 分析エラー:', error)
    process.exit(1)
  }
}

module.exports = { generateAnalysisReport, extractTablesFromTypes }