/**
 * バックアップ整合性確認スクリプト
 * 
 * 目的: バックアップファイルとデータベースの整合性確認
 * 使用方法: npx tsx scripts/verify-backup-integrity.ts [backup-directory]
 */

import 'dotenv/config'
import { supabaseAdmin } from '@/lib/supabase-admin'
import * as fs from 'fs'
import * as path from 'path'

interface VerificationResult {
  tableName: string
  backupRecords: number
  currentRecords: number
  matches: boolean
  backupFileExists: boolean
  error?: string
}

interface VerificationSummary {
  totalTables: number
  matchingTables: number
  mismatchedTables: number
  missingFiles: number
  results: VerificationResult[]
  backupDirectory: string
  verificationTime: string
}

/**
 * 単一テーブルの整合性確認
 */
async function verifyTableIntegrity(
  tableName: string, 
  backupDirectory: string
): Promise<VerificationResult> {
  const result: VerificationResult = {
    tableName,
    backupRecords: 0,
    currentRecords: 0,
    matches: false,
    backupFileExists: false
  }
  
  try {
    // バックアップファイルの確認
    const backupFilePath = path.join(backupDirectory, `${tableName}_backup.json`)
    
    if (!fs.existsSync(backupFilePath)) {
      result.error = 'バックアップファイルが存在しません'
      console.log(`❌ ${tableName}: バックアップファイルなし`)
      return result
    }
    
    result.backupFileExists = true
    
    // バックアップファイルの読み込み
    const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'))
    result.backupRecords = backupData.recordCount || 0
    
    // 現在のデータベース状況確認（型安全性のため as any でキャスト）
    const { count: currentCount, error: dbError } = await supabaseAdmin
      .from(tableName as any)
      .select('*', { count: 'exact', head: true })
    
    if (dbError) {
      result.error = `DB確認エラー: ${dbError.message}`
      console.log(`❌ ${tableName}: ${result.error}`)
      return result
    }
    
    result.currentRecords = currentCount || 0
    result.matches = result.backupRecords === result.currentRecords
    
    if (result.matches) {
      console.log(`✅ ${tableName}: ${result.backupRecords}件 (整合性OK)`)
    } else {
      console.log(`⚠️ ${tableName}: バックアップ ${result.backupRecords}件 ≠ 現在 ${result.currentRecords}件`)
    }
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error'
    console.log(`❌ ${tableName}: ${result.error}`)
  }
  
  return result
}

/**
 * バックアップディレクトリの検索
 */
function findLatestBackupDirectory(): string | null {
  const backupBaseDir = path.join(process.cwd(), 'database', 'backup')
  
  if (!fs.existsSync(backupBaseDir)) {
    return null
  }
  
  const directories = fs.readdirSync(backupBaseDir)
    .filter(dir => dir.startsWith('full_user_data_backup_'))
    .sort()
    .reverse()
  
  return directories.length > 0 ? path.join(backupBaseDir, directories[0]) : null
}

/**
 * 検証サマリーレポート出力
 */
function generateVerificationReport(summary: VerificationSummary): void {
  const reportFilePath = path.join(summary.backupDirectory, 'verification_report.json')
  fs.writeFileSync(reportFilePath, JSON.stringify(summary, null, 2), 'utf8')
  
  console.log('\n📊 整合性確認サマリー:')
  console.log('=' .repeat(50))
  console.log(`📅 確認日時: ${summary.verificationTime}`)
  console.log(`📁 バックアップディレクトリ: ${path.basename(summary.backupDirectory)}`)
  console.log(`📋 確認テーブル数: ${summary.totalTables}`)
  console.log(`✅ 整合性OK: ${summary.matchingTables}テーブル`)
  console.log(`⚠️ 不整合: ${summary.mismatchedTables}テーブル`)
  console.log(`❌ ファイル不存在: ${summary.missingFiles}テーブル`)
  
  console.log('\n📋 詳細結果:')
  summary.results.forEach((result, index) => {
    let status = '❌'
    if (result.backupFileExists) {
      status = result.matches ? '✅' : '⚠️'
    }
    
    console.log(`  ${(index + 1).toString().padStart(2, ' ')}. ${status} ${result.tableName}: ` +
                `バックアップ ${result.backupRecords}件 / 現在 ${result.currentRecords}件`)
    
    if (result.error) {
      console.log(`      🔍 エラー: ${result.error}`)
    }
  })
  
  if (summary.mismatchedTables > 0 || summary.missingFiles > 0) {
    console.log('\n⚠️ 問題のあるテーブル:')
    summary.results
      .filter(r => !r.matches || !r.backupFileExists)
      .forEach(result => {
        if (!result.backupFileExists) {
          console.log(`  - ${result.tableName}: バックアップファイルなし`)
        } else if (!result.matches) {
          console.log(`  - ${result.tableName}: レコード数不一致 (${result.backupRecords} → ${result.currentRecords})`)
        }
      })
    
    console.log('\n💡 推奨対応:')
    console.log('  1. データ変更がないか確認')
    console.log('  2. 必要に応じて再バックアップ実行')
    console.log('  3. 不整合の原因を調査')
  }
  
  console.log(`\n📄 詳細レポート: ${reportFilePath}`)
}

/**
 * メイン検証実行
 */
async function runBackupVerification(backupDirectory: string): Promise<VerificationSummary> {
  console.log('🔍 バックアップ整合性確認開始')
  console.log(`📁 対象ディレクトリ: ${backupDirectory}`)
  
  if (!fs.existsSync(backupDirectory)) {
    throw new Error(`バックアップディレクトリが存在しません: ${backupDirectory}`)
  }
  
  // バックアップサマリー確認
  const summaryPath = path.join(backupDirectory, 'backup_summary.json')
  let targetTables: string[] = []
  
  if (fs.existsSync(summaryPath)) {
    const backupSummary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'))
    targetTables = backupSummary.results.map((r: any) => r.tableName)
    console.log(`📋 バックアップサマリーから${targetTables.length}テーブルを確認`)
  } else {
    // フォールバック: ファイル名から推測
    const files = fs.readdirSync(backupDirectory)
      .filter(f => f.endsWith('_backup.json'))
      .map(f => f.replace('_backup.json', ''))
    targetTables = files
    console.log(`📋 ファイル名から${targetTables.length}テーブルを検出`)
  }
  
  if (targetTables.length === 0) {
    throw new Error('バックアップテーブルが見つかりません')
  }
  
  console.log('')
  
  // 各テーブルの整合性確認
  const results: VerificationResult[] = []
  
  for (const tableName of targetTables) {
    const result = await verifyTableIntegrity(tableName, backupDirectory)
    results.push(result)
    
    // API制限対策の短時間待機
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  const summary: VerificationSummary = {
    totalTables: results.length,
    matchingTables: results.filter(r => r.matches && r.backupFileExists).length,
    mismatchedTables: results.filter(r => r.backupFileExists && !r.matches).length,
    missingFiles: results.filter(r => !r.backupFileExists).length,
    results,
    backupDirectory,
    verificationTime: new Date().toISOString()
  }
  
  generateVerificationReport(summary)
  
  return summary
}

// スクリプト実行
if (require.main === module) {
  const backupDirArg = process.argv[2]
  
  let backupDirectory: string
  
  if (backupDirArg) {
    // 引数で指定されたディレクトリ
    backupDirectory = path.resolve(backupDirArg)
  } else {
    // 最新のバックアップディレクトリを自動検索
    const latestBackup = findLatestBackupDirectory()
    if (!latestBackup) {
      console.error('❌ バックアップディレクトリが見つかりません')
      console.log('使用方法: npx tsx scripts/verify-backup-integrity.ts [backup-directory]')
      console.log('または、先にバックアップを作成してください: npx tsx scripts/backup-all-user-data.ts')
      process.exit(1)
    }
    backupDirectory = latestBackup
    console.log(`📁 最新のバックアップディレクトリを使用: ${path.basename(backupDirectory)}`)
  }
  
  runBackupVerification(backupDirectory)
    .then(summary => {
      if (summary.mismatchedTables === 0 && summary.missingFiles === 0) {
        console.log('\n🎉 バックアップ整合性確認完了！')
        console.log('✅ 全てのテーブルでデータ整合性が確認されました')
        process.exit(0)
      } else {
        console.log('\n⚠️ バックアップ整合性に問題があります')
        console.log(`⚠️ ${summary.mismatchedTables}個のテーブルで不整合`)
        console.log(`❌ ${summary.missingFiles}個のファイルが存在しません`)
        process.exit(1)
      }
    })
    .catch(error => {
      console.error('❌ 整合性確認エラー:', error)
      process.exit(1)
    })
}