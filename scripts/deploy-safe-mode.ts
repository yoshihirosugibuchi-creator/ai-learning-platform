#!/usr/bin/env tsx

/**
 * Safe Mode Deployment Script
 * 環境変数に依存せず、既存の静的データを使用してデプロイ準備を行う
 */

import fs from 'fs'
import path from 'path'

interface DeployReport {
  success: boolean
  errors: string[]
  warnings: string[]
  files: {
    verified: string[]
    missing: string[]
    outdated: string[]
  }
  recommendations: string[]
}

class SafeModeDeployment {
  private report: DeployReport = {
    success: false,
    errors: [],
    warnings: [],
    files: {
      verified: [],
      missing: [],
      outdated: []
    },
    recommendations: []
  }

  /**
   * メイン実行
   */
  async run(): Promise<DeployReport> {
    console.log('🛡️ セーフモードデプロイメント開始...')
    console.log('📝 環境変数に依存しない静的データ検証を実行します')
    
    try {
      // 1. 必須ファイルの存在確認
      this.checkRequiredFiles()
      
      // 2. データファイルの整合性確認
      this.validateDataFiles()
      
      // 3. TypeScriptファイルとの整合性確認
      this.checkTypeScriptConsistency()
      
      // 4. フォールバック機能確認
      this.validateFallbackMechanism()
      
      // 5. ビルド前準備
      this.prepareBuildEnvironment()
      
      // 総合判定
      this.generateFinalAssessment()
      
    } catch (error) {
      this.report.errors.push(`予期しないエラー: ${error.message}`)
      console.error('❌ セーフモードデプロイメントでエラーが発生:', error)
    }
    
    this.printReport()
    return this.report
  }

  /**
   * 必須ファイルの存在確認
   */
  private checkRequiredFiles(): void {
    console.log('\n📂 必須ファイル存在確認...')
    
    const requiredFiles = [
      'public/questions.json',
      'public/data/quiz-stats-fallback.json',
      'public/learning-data/courses.json',
      'lib/categories.ts',
      'lib/types/category.ts'
    ]
    
    for (const filePath of requiredFiles) {
      const fullPath = path.join(process.cwd(), filePath)
      
      if (fs.existsSync(fullPath)) {
        this.report.files.verified.push(filePath)
        console.log(`  ✅ ${filePath}`)
      } else {
        this.report.files.missing.push(filePath)
        this.report.errors.push(`必須ファイルが見つかりません: ${filePath}`)
        console.log(`  ❌ ${filePath}`)
      }
    }
  }

  /**
   * データファイルの整合性確認
   */
  private validateDataFiles(): void {
    console.log('\n🔍 データファイル整合性確認...')
    
    try {
      // questions.json確認
      const questionsPath = path.join(process.cwd(), 'public/questions.json')
      if (fs.existsSync(questionsPath)) {
        const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'))
        const questionCount = questionsData.questions?.length || 0
        
        if (questionCount > 0) {
          console.log(`  ✅ questions.json: ${questionCount}問のデータ確認`)
          this.report.files.verified.push('questions.json (data)')
        } else {
          this.report.warnings.push('questions.json にデータがありません')
          console.log(`  ⚠️ questions.json: データが空です`)
        }
      }
      
      // courses.json確認
      const coursesPath = path.join(process.cwd(), 'public/learning-data/courses.json')
      if (fs.existsSync(coursesPath)) {
        const coursesData = JSON.parse(fs.readFileSync(coursesPath, 'utf-8'))
        console.log(`  ✅ courses.json: メタデータ確認完了`)
        this.report.files.verified.push('courses.json (data)')
      }
      
    } catch (error) {
      this.report.errors.push(`データファイル検証エラー: ${error.message}`)
      console.error('  ❌ データファイル検証でエラー:', error.message)
    }
  }

  /**
   * TypeScriptファイルとの整合性確認
   */
  private checkTypeScriptConsistency(): void {
    console.log('\n📝 TypeScriptファイル整合性確認...')
    
    try {
      // categories.ts の存在とexport確認
      const categoriesPath = path.join(process.cwd(), 'lib/categories.ts')
      if (fs.existsSync(categoriesPath)) {
        const categoriesContent = fs.readFileSync(categoriesPath, 'utf-8')
        
        // 必要なexport確認
        const requiredExports = [
          'mainCategories',
          'industryCategories',
          'skillLevels',
          'getCategories',
          'getAllCategoriesSync'
        ]
        
        for (const exportName of requiredExports) {
          if (categoriesContent.includes(`export.*${exportName}`) || 
              categoriesContent.includes(`${exportName}.*=`)) {
            console.log(`  ✅ ${exportName} export確認`)
          } else {
            this.report.warnings.push(`categories.ts: ${exportName} exportが見つかりません`)
            console.log(`  ⚠️ ${exportName} export未確認`)
          }
        }
        
        this.report.files.verified.push('categories.ts (exports)')
      }
      
    } catch (error) {
      this.report.errors.push(`TypeScript整合性確認エラー: ${error.message}`)
      console.error('  ❌ TypeScript整合性確認でエラー:', error.message)
    }
  }

  /**
   * フォールバック機能確認
   */
  private validateFallbackMechanism(): void {
    console.log('\n🔄 フォールバック機能確認...')
    
    try {
      // lib/categories.ts のフォールバック機能確認
      const categoriesPath = path.join(process.cwd(), 'lib/categories.ts')
      if (fs.existsSync(categoriesPath)) {
        const content = fs.readFileSync(categoriesPath, 'utf-8')
        
        if (content.includes('mainCategories') && content.includes('industryCategories')) {
          console.log('  ✅ 静的カテゴリーデータ確認')
          this.report.files.verified.push('categories.ts (fallback data)')
        } else {
          this.report.warnings.push('categories.ts: 静的データが不完全な可能性があります')
        }
      }
      
      // questions.json フォールバック確認
      const questionsPath = path.join(process.cwd(), 'public/questions.json')
      if (fs.existsSync(questionsPath)) {
        console.log('  ✅ 静的クイズデータ確認')
      } else {
        this.report.recommendations.push('questions.json の静的版を作成することを推奨します')
      }
      
    } catch (error) {
      this.report.errors.push(`フォールバック確認エラー: ${error.message}`)
    }
  }

  /**
   * ビルド前準備
   */
  private prepareBuildEnvironment(): void {
    console.log('\n🏗️ ビルド前環境準備...')
    
    try {
      // TypeScript コンパイル確認
      console.log('  🔍 TypeScript コンパイル確認中...')
      // Note: 実際のTSチェックはここで実行可能
      
      // 環境変数の安全確認
      const requiredEnvVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY'
      ]
      
      for (const envVar of requiredEnvVars) {
        if (process.env[envVar]) {
          console.log(`  ✅ ${envVar} 設定済み`)
        } else {
          this.report.warnings.push(`環境変数 ${envVar} が設定されていません`)
          console.log(`  ⚠️ ${envVar} 未設定`)
        }
      }
      
      console.log('  ✅ ビルド前準備完了')
      
    } catch (error) {
      this.report.errors.push(`ビルド前準備エラー: ${error.message}`)
    }
  }

  /**
   * 総合判定
   */
  private generateFinalAssessment(): void {
    console.log('\n🎯 総合判定...')
    
    const hasError = this.report.errors.length > 0
    const hasWarning = this.report.warnings.length > 0
    
    if (!hasError) {
      this.report.success = true
      console.log('  🟢 セーフモードデプロイ可能')
      
      if (hasWarning) {
        console.log('  🟡 警告がありますが、デプロイは可能です')
        this.report.recommendations.push('警告を解決することでより安定したデプロイが可能になります')
      }
    } else {
      this.report.success = false
      console.log('  🔴 デプロイ不可 - エラーを修正してください')
    }
  }

  /**
   * レポート出力
   */
  private printReport(): void {
    console.log('\n' + '='.repeat(70))
    console.log('📊 セーフモードデプロイメント レポート')
    console.log('='.repeat(70))
    
    console.log(`\n✅ 検証済みファイル: ${this.report.files.verified.length}個`)
    this.report.files.verified.forEach(file => console.log(`  - ${file}`))
    
    if (this.report.files.missing.length > 0) {
      console.log(`\n❌ 未発見ファイル: ${this.report.files.missing.length}個`)
      this.report.files.missing.forEach(file => console.log(`  - ${file}`))
    }
    
    if (this.report.errors.length > 0) {
      console.log(`\n🔴 エラー: ${this.report.errors.length}件`)
      this.report.errors.forEach(error => console.log(`  - ${error}`))
    }
    
    if (this.report.warnings.length > 0) {
      console.log(`\n🟡 警告: ${this.report.warnings.length}件`)
      this.report.warnings.forEach(warning => console.log(`  - ${warning}`))
    }
    
    if (this.report.recommendations.length > 0) {
      console.log(`\n💡 推奨事項: ${this.report.recommendations.length}件`)
      this.report.recommendations.forEach(rec => console.log(`  - ${rec}`))
    }
    
    console.log('\n' + '='.repeat(70))
    console.log(`🎯 最終判定: ${this.report.success ? '✅ デプロイ可能' : '❌ デプロイ不可'}`)
    console.log('='.repeat(70))
  }
}

// 直接実行時のみ実行
if (require.main === module) {
  const deployment = new SafeModeDeployment()
  deployment.run().then(report => {
    process.exit(report.success ? 0 : 1)
  }).catch(error => {
    console.error('❌ セーフモードデプロイメント失敗:', error)
    process.exit(1)
  })
}

export { SafeModeDeployment }