#!/usr/bin/env tsx

/**
 * 完全デプロイメント実行スクリプト
 * 
 * 本番デプロイ前の全工程を自動実行:
 * 1. 全データ同期（マスタ・クイズ・コース学習）
 * 2. 整合性チェック・検証
 * 3. ビルド・Lint実行
 * 4. デプロイ可否判定
 */

import { spawn } from 'child_process'
import fs from 'fs'
import path from 'path'

interface DeployStep {
  id: string
  name: string
  command: string
  required: boolean
  timeout?: number
}

interface DeployResult {
  step: string
  success: boolean
  duration: number
  output?: string
  error?: string
}

class CompleteDeploymentExecutor {
  private steps: DeployStep[] = [
    {
      id: 'data_sync',
      name: 'データ同期（マスタ・クイズ・コース学習）',
      command: 'npm run deploy:sync',
      required: true,
      timeout: 120000 // 2分
    },
    {
      id: 'course_consistency',
      name: 'コース学習整合性チェック',
      command: 'npm run check:course-consistency-static',
      required: true,
      timeout: 60000 // 1分
    },
    {
      id: 'data_reflection',
      name: 'データ反映状況分析',
      command: 'npm run analyze:data-reflection',
      required: false,
      timeout: 60000 // 1分
    },
    {
      id: 'build',
      name: 'Next.js ビルド',
      command: 'npm run build',
      required: true,
      timeout: 300000 // 5分
    },
    {
      id: 'lint',
      name: 'ESLint チェック',
      command: 'npm run lint',
      required: false, // 警告があっても続行
      timeout: 120000 // 2分
    }
  ]

  private results: DeployResult[] = []

  /**
   * メイン実行関数
   */
  async run(): Promise<void> {
    console.log('🚀 完全デプロイメント実行を開始します...\n')
    console.log('📋 実行予定ステップ:')
    this.steps.forEach((step, index) => {
      const required = step.required ? '🔴 必須' : '🟡 推奨'
      console.log(`  ${index + 1}. ${step.name} ${required}`)
    })
    console.log()

    const startTime = Date.now()
    let criticalFailure = false

    // 各ステップを順次実行
    for (const step of this.steps) {
      console.log(`📂 ${step.name} を実行中...`)
      
      try {
        const result = await this.executeStep(step)
        this.results.push(result)
        
        if (result.success) {
          console.log(`✅ ${step.name} 完了 (${result.duration}ms)`)
        } else {
          const severity = step.required ? '❌ エラー' : '⚠️  警告'
          console.log(`${severity} ${step.name} 失敗 (${result.duration}ms)`)
          
          if (step.required) {
            criticalFailure = true
            console.log(`🔴 必須ステップが失敗しました: ${step.name}`)
            break
          }
        }
        
      } catch (error) {
        console.error(`💥 ${step.name} で予期しないエラー:`, error)
        this.results.push({
          step: step.name,
          success: false,
          duration: 0,
          error: String(error)
        })
        
        if (step.required) {
          criticalFailure = true
          break
        }
      }
      
      console.log()
    }

    const totalDuration = Date.now() - startTime
    
    // 結果レポート生成
    this.generateReport(totalDuration, criticalFailure)
    
    // 終了コード設定
    if (criticalFailure) {
      console.log('🔴 重要なステップで失敗が発生しました。デプロイは中止してください。')
      process.exit(1)
    } else {
      console.log('🟢 すべての重要ステップが正常に完了しました。デプロイ可能です！')
      process.exit(0)
    }
  }

  /**
   * 個別ステップの実行
   */
  private async executeStep(step: DeployStep): Promise<DeployResult> {
    const startTime = Date.now()
    
    return new Promise((resolve) => {
      const [command, ...args] = step.command.split(' ')
      const child = spawn(command, args, {
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true
      })

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', (data) => {
        stdout += data.toString()
        process.stdout.write(data) // リアルタイム出力
      })

      child.stderr?.on('data', (data) => {
        stderr += data.toString()
        process.stderr.write(data) // リアルタイム出力
      })

      // タイムアウト設定
      const timeout = setTimeout(() => {
        child.kill('SIGTERM')
        resolve({
          step: step.name,
          success: false,
          duration: Date.now() - startTime,
          error: `タイムアウト (${step.timeout}ms)`
        })
      }, step.timeout || 60000)

      child.on('close', (code) => {
        clearTimeout(timeout)
        
        resolve({
          step: step.name,
          success: code === 0,
          duration: Date.now() - startTime,
          output: stdout,
          error: code !== 0 ? stderr : undefined
        })
      })

      child.on('error', (error) => {
        clearTimeout(timeout)
        
        resolve({
          step: step.name,
          success: false,
          duration: Date.now() - startTime,
          error: error.message
        })
      })
    })
  }

  /**
   * 結果レポート生成
   */
  private generateReport(totalDuration: number, criticalFailure: boolean): void {
    console.log('📊 デプロイメント実行結果:')
    console.log('═'.repeat(80))
    
    // 基本統計
    const successCount = this.results.filter(r => r.success).length
    const failureCount = this.results.filter(r => !r.success).length
    const requiredSteps = this.steps.filter(s => s.required).length
    const requiredSuccess = this.results.filter((r, i) => this.steps[i].required && r.success).length
    
    console.log('📈 基本統計:')
    console.log(`  - 総実行時間: ${(totalDuration / 1000).toFixed(1)}秒`)
    console.log(`  - 成功ステップ: ${successCount}/${this.results.length}`)
    console.log(`  - 失敗ステップ: ${failureCount}/${this.results.length}`)
    console.log(`  - 必須ステップ成功: ${requiredSuccess}/${requiredSteps}`)
    console.log()
    
    // ステップ別詳細
    console.log('📋 ステップ別結果:')
    this.results.forEach((result, index) => {
      const step = this.steps[index]
      const status = result.success ? '✅' : '❌'
      const required = step.required ? '[必須]' : '[推奨]'
      const duration = `${(result.duration / 1000).toFixed(1)}s`
      
      console.log(`  ${status} ${required} ${result.step} (${duration})`)
      
      if (!result.success && result.error) {
        console.log(`      エラー: ${result.error.split('\n')[0]}`)
      }
    })
    console.log()
    
    // 総合判定
    console.log('🎯 総合判定:')
    if (criticalFailure) {
      console.log('  🔴 デプロイ不可 - 必須ステップで失敗が発生')
      console.log('  📝 対応方法: 失敗したステップのエラーを解決してから再実行')
    } else if (failureCount > 0) {
      console.log('  🟡 デプロイ可能（警告あり）- 推奨ステップで警告が発生')
      console.log('  📝 推奨: 警告を確認してからデプロイを実行')
    } else {
      console.log('  🟢 デプロイ推奨 - すべてのステップが正常に完了')
    }
    
    console.log('═'.repeat(80))
    
    // 次のアクション
    console.log('💡 次のアクション:')
    if (!criticalFailure) {
      console.log('  1. git add . && git commit -m "Deploy: complete data sync and validation"')
      console.log('  2. git push origin main')
      console.log('  3. Vercelで自動デプロイを確認')
    } else {
      console.log('  1. エラーログを確認してください')
      console.log('  2. 問題を修正後、npm run deploy:complete を再実行')
    }
  }
}

// スクリプト実行
async function main() {
  const executor = new CompleteDeploymentExecutor()
  await executor.run()
}

// 直接実行時のみ実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ デプロイメント実行エラー:', error)
    process.exit(1)
  })
}

export { CompleteDeploymentExecutor }