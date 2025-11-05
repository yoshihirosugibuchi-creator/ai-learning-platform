/**
 * 不明分類テーブルの詳細調査
 */

const fs = require('fs')

// 分析結果ファイル読み込み
const files = fs.readdirSync('.').filter(f => f.startsWith('table-analysis-') && f.endsWith('.json'))
const latestFile = files.sort().pop()

if (!latestFile) {
  console.error('❌ 分析結果ファイルが見つかりません')
  process.exit(1)
}

const analysis = JSON.parse(fs.readFileSync(latestFile, 'utf8'))

console.log('🔍 UNKNOWN分類テーブルの詳細調査...\n')

const unknownTables = analysis.byClassification.UNKNOWN
console.log(`📊 UNKNOWN分類テーブル数: ${unknownTables.length}\n`)

unknownTables.forEach((table, index) => {
  console.log(`${index + 1}. テーブル名: ${table.name}`)
  console.log(`   カラム数: ${table.columns.length}`)
  console.log(`   user_id: ${table.hasUserId ? 'あり' : 'なし'}`)
  
  // 主要カラムを表示
  const keyColumns = table.columns.slice(0, 5).map(col => `${col.name}(${col.type})`).join(', ')
  console.log(`   主要カラム: ${keyColumns}`)
  
  // 推定用途の分析
  const tableName = table.name
  let estimatedPurpose = '不明'
  let suggestedClassification = 'UNKNOWN'
  
  if (tableName === 'public') {
    estimatedPurpose = 'スキーマ名の誤認識（categories テーブルの可能性）'
    suggestedClassification = 'MASTER_DATA'
  } else if (tableName === 'industry_level_targets') {
    estimatedPurpose = '業界レベル目標設定（マスターデータ）'
    suggestedClassification = 'MASTER_DATA'
  } else if (tableName === 'learning_genres') {
    estimatedPurpose = '学習ジャンル分類（マスターデータ）'
    suggestedClassification = 'MASTER_DATA'
  } else if (tableName === 'quiz_hints') {
    estimatedPurpose = 'クイズヒント情報（マスターデータ）'
    suggestedClassification = 'MASTER_DATA'
  } else if (tableName === 'session_contents') {
    estimatedPurpose = 'セッション内容（マスターデータ）'
    suggestedClassification = 'MASTER_DATA'
  } else if (tableName === 'session_quizzes') {
    estimatedPurpose = 'セッション内クイズ（マスターデータ）'
    suggestedClassification = 'MASTER_DATA'
  }
  
  console.log(`   推定用途: ${estimatedPurpose}`)
  console.log(`   推奨分類: ${suggestedClassification}`)
  console.log(`   RLS要件: ${table.rlsRequirement.rlsType}`)
  console.log('   ---')
})

// 再分類の提案
console.log('\n📋 再分類提案:')
console.log('すべてのUNKNOWNテーブルがマスターデータの可能性が高い')
console.log('- user_idカラムなし')
console.log('- 設定・コンテンツ管理系の構造')
console.log('- RLS: 認証済みユーザー読み取り、管理者書き込み推奨\n')

// 統計の再計算
const reclassifiedStats = {
  USER_DATA: analysis.byClassification.USER_DATA.length,
  MASTER_DATA: analysis.byClassification.MASTER_DATA.length + unknownTables.length,
  SYSTEM: analysis.byClassification.SYSTEM.length,
  VIEW_OR_COMPUTED: analysis.byClassification.VIEW_OR_COMPUTED.length,
  UNKNOWN: 0
}

console.log('📊 再分類後の統計:')
Object.entries(reclassifiedStats).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}テーブル`)
})

console.log(`\n✅ 調査完了 - 分析ファイル: ${latestFile}`)