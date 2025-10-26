#!/usr/bin/env tsx
/**
 * データベーススキーマ一貫性チェッカー
 * コード内のテーブル・カラム参照とdatabase-types-official.tsの矛盾を検出
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

// データベース型定義を読み込み（改良版）
async function loadDatabaseTypes(): Promise<Record<string, string[]>> {
  const typesPath = path.join(process.cwd(), 'lib/database-types-official.ts')
  const content = fs.readFileSync(typesPath, 'utf-8')
  
  const tables: Record<string, string[]> = {}
  
  // テーブル定義を正規表現で抽出（より正確に）
  const tableMatches = content.matchAll(/(\w+):\s*\{\s*Row:\s*\{([^}]+)\}/g)
  
  for (const match of tableMatches) {
    const tableName = match[1]
    const rowDefinition = match[2]
    
    // カラム名を抽出（?: type の形式を想定）
    const columnMatches = rowDefinition.matchAll(/(\w+)\s*:/g)
    const columns = Array.from(columnMatches, m => m[1])
    
    // 重複除去
    tables[tableName] = [...new Set(columns)]
    console.log(`📋 Table: ${tableName}, Columns: ${tables[tableName].length}`)
  }
  
  return tables
}

// コード内のデータベース参照を検索（より正確に）
async function findDatabaseReferences(): Promise<{
  file: string
  line: number
  table: string
  column: string
  context: string
}[]> {
  const files = await glob('**/*.{ts,tsx}', {
    ignore: ['node_modules/**', '.next/**', 'lib/database-types-official.ts', 'scripts/**']
  })
  
  const references: Array<{
    file: string
    line: number
    table: string
    column: string
    context: string
  }> = []
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')
    const lines = content.split('\n')
    
    let currentTable: string | null = null
    
    lines.forEach((line, index) => {
      // from句でテーブル名を追跡
      const fromMatch = line.match(/\.from\(['"`](\w+)['"`]\)/)
      if (fromMatch) {
        currentTable = fromMatch[1]
      }
      
      // console.errorなどのログ、コメント、バックアップファイル、エラーメッセージは除外
      if (line.includes('console.') || 
          line.includes('//') || 
          line.includes('/*') ||
          file.includes('backup') ||
          line.trim().startsWith('//') ||
          line.trim().startsWith('*') ||
          line.includes('Error ') ||
          line.includes('error:') ||
          line.includes('❌') ||
          line.includes('⚠️') ||
          line.includes('console.error') ||
          line.includes('console.warn') ||
          line.includes('console.log') ||
          // エラーメッセージ内の文字列リテラルを除外
          line.includes("'Error ") ||
          line.includes('"Error ') ||
          line.includes("'error") ||
          line.includes('"error') ||
          line.includes('`Error ') ||
          line.includes('`error') ||
          // ログメッセージ内のテーブル参照を除外
          line.match(/['"`][^'"`]*Error[^'"`]*['"`]/) ||
          line.match(/['"`][^'"`]*error[^'"`]*['"`]/) ||
          line.match(/['"`][^'"`]*updating[^'"`]*['"`]/) ||
          line.match(/['"`][^'"`]*creating[^'"`]*['"`]/)) {
        return
      }
      
      // .eq('column', value) - 具体的なカラム参照
      const eqMatches = line.matchAll(/\.eq\(['"`](\w+)['"`]/g)
      for (const match of eqMatches) {
        if (currentTable && match[1] && match[1] !== '*') {
          references.push({
            file,
            line: index + 1,
            table: currentTable,
            column: match[1],
            context: line.trim()
          })
        }
      }
      
      // .update({ column: value }) - オブジェクトのキー
      const updateMatch = line.match(/\.update\(\{([^}]+)\}/)
      if (updateMatch && currentTable) {
        const updateContent = updateMatch[1]
        const columnMatches = updateContent.matchAll(/(\w+):/g)
        for (const colMatch of columnMatches) {
          references.push({
            file,
            line: index + 1,
            table: currentTable,
            column: colMatch[1],
            context: line.trim()
          })
        }
      }
      
      // .insert({ column: value }) - オブジェクトのキー
      const insertMatch = line.match(/\.insert\(\{([^}]+)\}/)
      if (insertMatch && currentTable) {
        const insertContent = insertMatch[1]
        const columnMatches = insertContent.matchAll(/(\w+):/g)
        for (const colMatch of columnMatches) {
          references.push({
            file,
            line: index + 1,
            table: currentTable,
            column: colMatch[1],
            context: line.trim()
          })
        }
      }
      
      // 複数行にまたがるinsert/updateの場合は次の行もチェック
      if (line.includes('.insert(') || line.includes('.update(')) {
        for (let i = index + 1; i < Math.min(index + 10, lines.length); i++) {
          const nextLine = lines[i]
          if (nextLine.includes('}')) break
          
          const colonMatches = nextLine.matchAll(/(\w+):/g)
          for (const colMatch of colonMatches) {
            if (currentTable) {
              references.push({
                file,
                line: i + 1,
                table: currentTable,
                column: colMatch[1],
                context: nextLine.trim()
              })
            }
          }
        }
      }
    })
  }
  
  return references
}

// 矛盾チェック
async function checkConsistency() {
  console.log('🔍 データベーススキーマ一貫性チェック開始...\n')
  
  const tables = await loadDatabaseTypes()
  const references = await findDatabaseReferences()
  
  console.log(`📊 検出されたテーブル数: ${Object.keys(tables).length}`)
  console.log(`📊 検出されたデータベース参照: ${references.length}\n`)
  
  const errors: Array<{
    type: 'missing_table' | 'missing_column'
    file: string
    line: number
    table: string
    column?: string
    context: string
  }> = []
  
  for (const ref of references) {
    // テーブル存在チェック
    if (!tables[ref.table]) {
      errors.push({
        type: 'missing_table',
        file: ref.file,
        line: ref.line,
        table: ref.table,
        context: ref.context
      })
      continue
    }
    
    // カラム存在チェック
    if (ref.column && !tables[ref.table].includes(ref.column)) {
      errors.push({
        type: 'missing_column',
        file: ref.file,
        line: ref.line,
        table: ref.table,
        column: ref.column,
        context: ref.context
      })
    }
  }
  
  // 結果表示と分析
  if (errors.length === 0) {
    console.log('✅ データベーススキーマ一貫性: 問題なし')
  } else {
    console.log(`❌ データベーススキーマ一貫性エラー: ${errors.length}件\n`)
    
    // 重要なエラーを分類
    const realErrors = errors.filter(error => 
      // console.errorやログメッセージを除外
      !error.context.includes('console.') &&
      !error.context.includes('Error ') &&
      !error.context.includes('error:') &&
      !error.context.includes('❌') &&
      !error.context.includes('⚠️')
    )
    
    const logErrors = errors.filter(error => 
      error.context.includes('console.') ||
      error.context.includes('Error ') ||
      error.context.includes('error:') ||
      error.context.includes('❌') ||
      error.context.includes('⚠️')
    )
    
    console.log(`🚨 重要なスキーマ問題: ${realErrors.length}件`)
    console.log(`📝 ログメッセージ内の参照: ${logErrors.length}件\n`)
    
    // 重要なエラーのみ表示
    if (realErrors.length > 0) {
      console.log('🚨 修正が必要な実際のスキーマ問題:')
      realErrors.forEach(error => {
        if (error.type === 'missing_table') {
          console.log(`❌ テーブル不存在: ${error.table}`)
        } else {
          console.log(`❌ カラム不存在: ${error.table}.${error.column}`)
        }
        console.log(`   📁 ${error.file}:${error.line}`)
        console.log(`   📝 ${error.context}`)
        console.log()
      })
    }
    
    // ログエラーは要約のみ表示
    if (logErrors.length > 0) {
      console.log(`📝 ログメッセージ内の参照（修正不要）: ${logErrors.length}件`)
      const logErrorSummary = logErrors.reduce((acc, error) => {
        const key = `${error.table}.${error.column || 'N/A'}`
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      Object.entries(logErrorSummary).forEach(([ref, count]) => {
        console.log(`   - ${ref}: ${count}箇所`)
      })
      console.log()
    }
    
    console.log('🔧 修正方法:')
    console.log('1. database-types-official.ts を最新化: npm run db:types:update')
    console.log('2. 実際のスキーマ問題のみ修正（ログメッセージは無視）')
    
    if (realErrors.length > 0) {
      process.exit(1)
    }
  }
}

// 実行
checkConsistency().catch(console.error)