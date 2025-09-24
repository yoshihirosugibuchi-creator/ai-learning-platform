#!/usr/bin/env tsx

/**
 * 環境変数検証スクリプト
 * 
 * デプロイ前に必須環境変数の存在と有効性をチェック:
 * 1. 必須環境変数の存在確認
 * 2. Supabase接続テスト
 * 3. APIキーの有効性確認
 * 4. 開発/本番環境の設定差異チェック
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

interface ValidationResult {
  name: string
  status: 'success' | 'warning' | 'error'
  message: string
  value?: string
}

interface EnvironmentConfig {
  required: string[]
  optional: string[]
  supabaseTest: boolean
}

const ENVIRONMENTS: Record<string, EnvironmentConfig> = {
  development: {
    required: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ],
    optional: [
      'NEXT_PUBLIC_SITE_URL'
    ],
    supabaseTest: true
  },
  production: {
    required: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'NEXT_PUBLIC_SITE_URL'
    ],
    optional: [],
    supabaseTest: true
  }
}

class EnvironmentValidator {
  private results: ValidationResult[] = []
  private environment: string
  private config: EnvironmentConfig

  constructor(environment: string = 'development') {
    this.environment = environment
    this.config = ENVIRONMENTS[environment] || ENVIRONMENTS.development
  }

  private addResult(name: string, status: 'success' | 'warning' | 'error', message: string, value?: string) {
    this.results.push({ name, status, message, value })
  }

  private maskSensitiveValue(key: string, value: string): string {
    const sensitiveKeys = ['KEY', 'SECRET', 'PASSWORD', 'TOKEN']
    const isSensitive = sensitiveKeys.some(sensitive => key.toUpperCase().includes(sensitive))
    
    if (isSensitive && value.length > 10) {
      return `${value.substring(0, 10)}...${value.substring(value.length - 4)} (${value.length} chars)`
    }
    return value
  }

  async validateRequiredVariables(): Promise<void> {
    console.log('🔍 必須環境変数の確認...')
    
    for (const envVar of this.config.required) {
      const value = process.env[envVar]
      
      if (!value) {
        this.addResult(envVar, 'error', '環境変数が設定されていません')
      } else if (value.trim() === '') {
        this.addResult(envVar, 'error', '環境変数が空です')
      } else {
        const maskedValue = this.maskSensitiveValue(envVar, value)
        this.addResult(envVar, 'success', '設定済み', maskedValue)
      }
    }
  }

  async validateOptionalVariables(): Promise<void> {
    console.log('🔍 任意環境変数の確認...')
    
    for (const envVar of this.config.optional) {
      const value = process.env[envVar]
      
      if (!value) {
        this.addResult(envVar, 'warning', '未設定（任意）')
      } else {
        const maskedValue = this.maskSensitiveValue(envVar, value)
        this.addResult(envVar, 'success', '設定済み', maskedValue)
      }
    }
  }

  async validateSupabaseConnection(): Promise<void> {
    if (!this.config.supabaseTest) return

    console.log('🔍 Supabase接続テスト...')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      this.addResult('Supabase Connection', 'error', 'Supabase URLまたはANON KEYが不足')
      return
    }

    try {
      // Anonymous client test
      const anonClient = createClient(supabaseUrl, supabaseAnonKey)
      const { error: anonError } = await anonClient.from('categories').select('count').limit(1)
      
      if (anonError) {
        this.addResult('Supabase Anon Client', 'warning', `接続警告: ${anonError.message}`)
      } else {
        this.addResult('Supabase Anon Client', 'success', '接続成功')
      }

      // Service role client test (if available)
      if (supabaseServiceKey) {
        const serviceClient = createClient(supabaseUrl, supabaseServiceKey)
        const { error: serviceError } = await serviceClient.from('categories').select('count').limit(1)
        
        if (serviceError) {
          // 開発環境では警告、本番環境ではエラー
          const severity = this.environment === 'development' ? 'warning' : 'error'
          this.addResult('Supabase Service Client', severity, `接続失敗: ${serviceError.message}`)
        } else {
          this.addResult('Supabase Service Client', 'success', '接続成功')
        }
      } else {
        this.addResult('Supabase Service Client', 'warning', 'SERVICE_ROLE_KEY未設定')
      }

    } catch (error) {
      this.addResult('Supabase Connection', 'error', `接続例外: ${(error as Error).message}`)
    }
  }

  async validateEnvironmentFiles(): Promise<void> {
    console.log('🔍 環境設定ファイルの確認...')
    
    const envFiles = ['.env.local', '.env.example', 'next.config.ts', 'package.json']
    
    for (const file of envFiles) {
      const filePath = path.join(process.cwd(), file)
      
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath)
        this.addResult(`File: ${file}`, 'success', `存在 (${Math.round(stats.size / 1024)}KB, ${stats.mtime.toLocaleString()})`)
      } else {
        const severity = file === '.env.local' ? 'error' : 'warning'
        this.addResult(`File: ${file}`, severity, '存在しません')
      }
    }
  }

  async validateDeploymentReadiness(): Promise<void> {
    console.log('🔍 デプロイ準備状況の確認...')
    
    // Check if TypeScript errors would block build
    try {
      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execAsync = promisify(exec)
      
      // Check next.config.ts settings
      const nextConfigPath = path.join(process.cwd(), 'next.config.ts')
      if (fs.existsSync(nextConfigPath)) {
        const configContent = fs.readFileSync(nextConfigPath, 'utf-8')
        const ignoreBuildErrors = configContent.includes('ignoreBuildErrors: true')
        
        if (ignoreBuildErrors) {
          this.addResult('TypeScript Build', 'warning', 'TypeScriptエラーを無視する設定（ignoreBuildErrors: true）')
        } else {
          this.addResult('TypeScript Build', 'success', 'TypeScriptエラーチェック有効')
        }
      }

      // Check package.json scripts
      const packageJsonPath = path.join(process.cwd(), 'package.json')
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
        const scripts = packageJson.scripts || {}
        
        const requiredScripts = ['build', 'lint', 'typecheck']
        for (const script of requiredScripts) {
          if (scripts[script]) {
            this.addResult(`Script: ${script}`, 'success', `定義済み: ${scripts[script]}`)
          } else {
            this.addResult(`Script: ${script}`, 'warning', '未定義')
          }
        }
      }

    } catch (error) {
      this.addResult('Deployment Check', 'warning', `チェック時エラー: ${(error as Error).message}`)
    }
  }

  printResults(): void {
    console.log('\n📊 環境変数検証結果:')
    console.log('═'.repeat(80))
    
    let successCount = 0
    let warningCount = 0
    let errorCount = 0
    
    for (const result of this.results) {
      const icon = result.status === 'success' ? '✅' : result.status === 'warning' ? '⚠️ ' : '❌'
      const valueDisplay = result.value ? ` (${result.value})` : ''
      
      console.log(`${icon} ${result.name}: ${result.message}${valueDisplay}`)
      
      if (result.status === 'success') successCount++
      else if (result.status === 'warning') warningCount++
      else errorCount++
    }
    
    console.log('═'.repeat(80))
    console.log(`📈 総計: 成功 ${successCount}, 警告 ${warningCount}, エラー ${errorCount}`)
    
    // 総合判定
    if (errorCount > 0) {
      console.log('🔴 検証失敗: エラーを解決してからデプロイしてください')
      process.exit(1)
    } else if (warningCount > 0) {
      console.log('🟡 検証完了（警告あり): デプロイ可能ですが推奨設定を確認してください')
    } else {
      console.log('🟢 検証成功: デプロイ準備完了')
    }
  }

  async validate(): Promise<void> {
    console.log(`🚀 環境変数検証開始 (${this.environment} environment)`)
    console.log(`📅 実行時刻: ${new Date().toLocaleString()}`)
    console.log('─'.repeat(80))
    
    await this.validateRequiredVariables()
    await this.validateOptionalVariables()
    await this.validateSupabaseConnection()
    await this.validateEnvironmentFiles()
    await this.validateDeploymentReadiness()
    
    this.printResults()
  }
}

// CLI execution
async function main() {
  const environment = process.argv[2] || 'development'
  
  if (!ENVIRONMENTS[environment]) {
    console.error(`❌ 無効な環境: ${environment}`)
    console.error(`有効な環境: ${Object.keys(ENVIRONMENTS).join(', ')}`)
    process.exit(1)
  }
  
  const validator = new EnvironmentValidator(environment)
  await validator.validate()
}

// スクリプトとして実行された場合
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 検証中にエラーが発生:', error)
    process.exit(1)
  })
}

export { EnvironmentValidator }