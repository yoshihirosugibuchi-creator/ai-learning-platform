/**
 * 全ユーザーデータバックアップスクリプト
 * 
 * 目的: 全削除前のデータ保護
 * 対象: 21テーブルの全ユーザーデータ
 * 
 * 実行方法:
 * npx tsx scripts/backup-all-user-data.ts
 */

import 'dotenv/config'
import { supabaseAdmin } from '@/lib/supabase-admin'
import * as fs from 'fs'
import * as path from 'path'

interface BackupResult {
  tableName: string
  recordCount: number
  filePath: string
  success: boolean
  error?: string
  sampleRecord?: any
}

interface BackupSummary {
  totalTables: number
  successfulBackups: number
  failedBackups: number
  totalRecords: number
  backupDirectory: string
  results: BackupResult[]
  startTime: string
  endTime: string
  duration: string
}

// バックアップ対象テーブル一覧（21テーブル）
const USER_DATA_TABLES = [
  // クイズ・学習活動系
  'quiz_answers',
  'quiz_sessions', 
  'learning_progress',
  
  // XP・統計系
  'user_xp_stats_v2',
  'user_category_xp_stats_v2',
  'user_subcategory_xp_stats_v2',
  'daily_xp_records',
  
  // コース学習系
  'course_session_completions',
  'course_theme_completions',
  'course_completions',
  
  // 報酬・コレクション系
  'user_badges',
  'knowledge_card_collection',
  'wisdom_card_collection',
  'skp_transactions',
  
  // ユーザー設定系
  'user_settings',
  
  // AI学習分析系
  'learning_analytics_summary',
  'learning_effectiveness_tracking',
  'learning_recommendations',
  'unified_learning_session_analytics',
  'user_learning_profiles',
  'spaced_repetition_schedule'
] as const

/**
 * 単一テーブルのバックアップ実行
 */
async function backupSingleTable(
  tableName: string, 
  backupDirectory: string
): Promise<BackupResult> {
  const result: BackupResult = {
    tableName,
    recordCount: 0,
    filePath: '',
    success: false
  }
  
  try {
    console.log(`📦 ${tableName} バックアップ開始...`)
    
    // データ取得（型安全性のため as any でキャスト）
    const { data, error, count } = await supabaseAdmin
      .from(tableName as any)
      .select('*', { count: 'exact' })
    
    if (error) {
      result.error = error.message
      console.error(`❌ ${tableName} データ取得エラー:`, error.message)
      return result
    }
    
    const recordCount = count || 0
    result.recordCount = recordCount
    
    // バックアップファイル作成
    const fileName = `${tableName}_backup.json`
    const filePath = path.join(backupDirectory, fileName)
    result.filePath = filePath
    
    const backupData = {
      tableName,
      recordCount,
      backupDate: new Date().toISOString(),
      data: data || []
    }
    
    // サンプルレコード保存（デバッグ用）
    if (data && data.length > 0) {
      result.sampleRecord = data[0]
    }
    
    // ファイル保存
    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8')
    
    result.success = true
    console.log(`✅ ${tableName}: ${recordCount}件のデータをバックアップ完了`)
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error'
    console.error(`❌ ${tableName} バックアップエラー:`, error)
  }
  
  return result
}

/**
 * バックアップディレクトリの作成
 */
function createBackupDirectory(): string {
  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const backupDir = path.join(process.cwd(), 'database', 'backup', `full_user_data_backup_${timestamp}`)
  
  // ディレクトリ作成（再帰的）
  fs.mkdirSync(backupDir, { recursive: true })
  
  console.log(`📁 バックアップディレクトリ作成: ${backupDir}`)
  return backupDir
}

/**
 * バックアップサマリーレポート出力
 */
function generateSummaryReport(summary: BackupSummary): void {
  const summaryFilePath = path.join(summary.backupDirectory, 'backup_summary.json')
  fs.writeFileSync(summaryFilePath, JSON.stringify(summary, null, 2), 'utf8')
  
  // コンソールレポート
  console.log('\n📊 バックアップ完了サマリー:')
  console.log('=' .repeat(50))
  console.log(`📅 実行日時: ${summary.startTime}`)
  console.log(`⏱️  実行時間: ${summary.duration}`)
  console.log(`📁 保存先: ${summary.backupDirectory}`)
  console.log(`📋 対象テーブル数: ${summary.totalTables}`)
  console.log(`✅ 成功: ${summary.successfulBackups}テーブル`)
  console.log(`❌ 失敗: ${summary.failedBackups}テーブル`)
  console.log(`📊 総レコード数: ${summary.totalRecords.toLocaleString()}件`)
  
  console.log('\n📋 テーブル別結果:')
  summary.results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌'
    const count = result.recordCount.toLocaleString()
    console.log(`  ${(index + 1).toString().padStart(2, ' ')}. ${status} ${result.tableName}: ${count}件`)
    if (!result.success && result.error) {
      console.log(`      🔍 エラー: ${result.error}`)
    }
  })
  
  if (summary.failedBackups > 0) {
    console.log('\n⚠️ 失敗したテーブル:')
    summary.results
      .filter(r => !r.success)
      .forEach(result => {
        console.log(`  - ${result.tableName}: ${result.error}`)
      })
  }
  
  console.log(`\n📄 詳細レポート: ${summaryFilePath}`)
}

/**
 * メインバックアップ実行
 */
async function runFullUserDataBackup(): Promise<BackupSummary> {
  const startTime = new Date()
  console.log('🚀 全ユーザーデータバックアップ開始')
  console.log(`📅 開始時刻: ${startTime.toISOString()}`)
  console.log(`📋 対象テーブル数: ${USER_DATA_TABLES.length}`)
  console.log('')
  
  // バックアップディレクトリ作成
  const backupDirectory = createBackupDirectory()
  
  // バックアップ実行
  const results: BackupResult[] = []
  let totalRecords = 0
  
  for (const tableName of USER_DATA_TABLES) {
    const result = await backupSingleTable(tableName, backupDirectory)
    results.push(result)
    
    if (result.success) {
      totalRecords += result.recordCount
    }
    
    // 1秒間隔で実行（API制限対策）
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  const endTime = new Date()
  const duration = `${Math.round((endTime.getTime() - startTime.getTime()) / 1000)}秒`
  
  const summary: BackupSummary = {
    totalTables: USER_DATA_TABLES.length,
    successfulBackups: results.filter(r => r.success).length,
    failedBackups: results.filter(r => !r.success).length,
    totalRecords,
    backupDirectory,
    results,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration
  }
  
  // サマリーレポート出力
  generateSummaryReport(summary)
  
  return summary
}

/**
 * 環境確認
 */
function validateEnvironment(): boolean {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Supabase環境変数が設定されていません')
    console.error('必要な環境変数: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    return false
  }
  
  // ディスク容量確認（簡易）
  const backupBaseDir = path.join(process.cwd(), 'database', 'backup')
  if (!fs.existsSync(backupBaseDir)) {
    fs.mkdirSync(backupBaseDir, { recursive: true })
  }
  
  return true
}

// スクリプト実行
if (require.main === module) {
  console.log('🔍 全ユーザーデータバックアップスクリプト')
  console.log('⚠️ この操作により、全ユーザーデータが安全にバックアップされます')
  console.log('')
  
  // 環境確認
  if (!validateEnvironment()) {
    process.exit(1)
  }
  
  runFullUserDataBackup()
    .then(summary => {
      if (summary.failedBackups === 0) {
        console.log('\n🎉 全ユーザーデータバックアップ完了！')
        console.log('✅ 全てのテーブルが正常にバックアップされました')
        process.exit(0)
      } else {
        console.log('\n⚠️ バックアップ完了（一部エラーあり）')
        console.log(`❌ ${summary.failedBackups}個のテーブルでエラーが発生しました`)
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('❌ バックアップ実行エラー:', error)
      process.exit(1)
    })
}