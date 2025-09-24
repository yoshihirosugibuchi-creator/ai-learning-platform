#!/usr/bin/env tsx

/**
 * データ反映状況分析スクリプト
 * 
 * 現在のクイズJSON・カテゴリーTypeScript反映状況を静的分析
 */

import fs from 'fs'
import path from 'path'
import { getAllCategoriesSync, skillLevels, subcategoryNameToIdMap } from '@/lib/categories'

interface AnalysisReport {
  quizJsonStatus: {
    exists: boolean
    lastModified?: Date
    questionCount?: number
    categoriesUsed?: string[]
    difficulties?: Record<string, number>
    sampleData?: any
  }
  categoryTypeScriptStatus: {
    totalCategories: number
    mainCategories: number
    industryCategories: number
    subcategoryMappings: number
    skillLevels: number
    lastSyncMarkers?: string[]
  }
  consistencyIssues: Array<{
    type: 'error' | 'warning' | 'info'
    category: string
    issue: string
    recommendation?: string
  }>
}

class DataReflectionAnalyzer {
  private report: AnalysisReport = {
    quizJsonStatus: {
      exists: false
    },
    categoryTypeScriptStatus: {
      totalCategories: 0,
      mainCategories: 0,
      industryCategories: 0,
      subcategoryMappings: 0,
      skillLevels: 0
    },
    consistencyIssues: []
  }

  /**
   * メイン実行関数
   */
  run(): void {
    console.log('🔍 データ反映状況分析を開始します...\n')
    
    try {
      // 1. クイズJSON状況分析
      this.analyzeQuizJson()
      
      // 2. カテゴリーTypeScript状況分析
      this.analyzeCategoryTypeScript()
      
      // 3. 整合性チェック
      this.checkConsistency()
      
      // 4. レポート出力
      this.generateReport()
      
    } catch (error) {
      console.error('❌ 分析処理中にエラーが発生しました:', error)
      process.exit(1)
    }
  }

  /**
   * クイズJSON状況分析
   */
  analyzeQuizJson(): void {
    console.log('📄 クイズJSON状況を分析中...')
    
    const quizJsonPath = path.join(process.cwd(), 'public/questions.json')
    
    if (!fs.existsSync(quizJsonPath)) {
      this.report.quizJsonStatus.exists = false
      this.report.consistencyIssues.push({
        type: 'warning',
        category: 'Quiz JSON',
        issue: 'public/questions.json が存在しません',
        recommendation: 'npm run sync:quiz-json を実行してJSONファイルを生成してください'
      })
      return
    }
    
    try {
      const stats = fs.statSync(quizJsonPath)
      const content = JSON.parse(fs.readFileSync(quizJsonPath, 'utf-8'))
      
      this.report.quizJsonStatus = {
        exists: true,
        lastModified: stats.mtime,
        questionCount: content.questions?.length || 0,
        categoriesUsed: this.extractCategoriesFromQuizJson(content),
        difficulties: this.extractDifficultiesFromQuizJson(content),
        sampleData: content.questions?.[0] || null
      }
      
      console.log(`✅ クイズJSON分析完了: ${this.report.quizJsonStatus.questionCount}問`)
      
    } catch (error) {
      this.report.consistencyIssues.push({
        type: 'error',
        category: 'Quiz JSON',
        issue: 'クイズJSONファイルの読み込みに失敗しました',
        recommendation: 'JSONファイルの形式を確認し、必要に応じて再生成してください'
      })
    }
  }

  /**
   * カテゴリーTypeScript状況分析
   */
  analyzeCategoryTypeScript(): void {
    console.log('📝 カテゴリーTypeScript状況を分析中...')
    
    try {
      const categories = getAllCategoriesSync()
      const mainCategories = categories.filter(cat => cat.type === 'main')
      const industryCategories = categories.filter(cat => cat.type === 'industry')
      
      this.report.categoryTypeScriptStatus = {
        totalCategories: categories.length,
        mainCategories: mainCategories.length,
        industryCategories: industryCategories.length,
        subcategoryMappings: Object.keys(subcategoryNameToIdMap).length,
        skillLevels: skillLevels.length,
        lastSyncMarkers: this.findSyncMarkers()
      }
      
      console.log(`✅ カテゴリーTypeScript分析完了: ${categories.length}カテゴリー`)
      
    } catch (error) {
      this.report.consistencyIssues.push({
        type: 'error',
        category: 'Category TypeScript',
        issue: 'カテゴリーTypeScript定義の読み込みに失敗しました',
        recommendation: 'lib/categories.ts ファイルの構文を確認してください'
      })
    }
  }

  /**
   * 整合性チェック
   */
  checkConsistency(): void {
    console.log('🔍 整合性をチェック中...')
    
    // クイズJSONとカテゴリーTypeScriptの整合性
    if (this.report.quizJsonStatus.exists && this.report.quizJsonStatus.categoriesUsed) {
      const staticCategories = getAllCategoriesSync()
      const staticCategoryIds = staticCategories.map(cat => cat.id)
      
      for (const categoryId of this.report.quizJsonStatus.categoriesUsed) {
        if (!staticCategoryIds.includes(categoryId as any)) {
          this.report.consistencyIssues.push({
            type: 'warning',
            category: 'Data Consistency',
            issue: `クイズJSON内のカテゴリー "${categoryId}" がTypeScript定義に存在しません`,
            recommendation: `カテゴリー "${categoryId}" をlib/categories.tsに追加するか、クイズデータを更新してください`
          })
        }
      }
    }
    
    // 同期マーカーのチェック
    if (this.report.categoryTypeScriptStatus.lastSyncMarkers) {
      const hasRecentSync = this.report.categoryTypeScriptStatus.lastSyncMarkers.some(marker => {
        const match = marker.match(/2025-\d{2}-\d{2}/)
        return match && new Date(match[0]) > new Date('2025-09-20')
      })
      
      if (!hasRecentSync) {
        this.report.consistencyIssues.push({
          type: 'info',
          category: 'Sync Status',
          issue: '最近のDB同期マーカーが見つかりません',
          recommendation: 'カテゴリーデータが最新かどうか確認してください'
        })
      }
    }
    
    console.log('✅ 整合性チェック完了')
  }

  /**
   * クイズJSONからカテゴリーを抽出
   */
  extractCategoriesFromQuizJson(content: any): string[] {
    if (!content.questions || !Array.isArray(content.questions)) {
      return []
    }
    
    const categories = new Set<string>()
    content.questions.forEach((q: any) => {
      if (q.category) {
        categories.add(q.category)
      }
    })
    
    return Array.from(categories)
  }

  /**
   * クイズJSONから難易度を抽出
   */
  extractDifficultiesFromQuizJson(content: any): Record<string, number> {
    if (!content.questions || !Array.isArray(content.questions)) {
      return {}
    }
    
    const difficulties: Record<string, number> = {}
    content.questions.forEach((q: any) => {
      if (q.difficulty) {
        difficulties[q.difficulty] = (difficulties[q.difficulty] || 0) + 1
      }
    })
    
    return difficulties
  }

  /**
   * カテゴリーファイルから同期マーカーを検索
   */
  findSyncMarkers(): string[] {
    try {
      const categoriesPath = path.join(process.cwd(), 'lib/categories.ts')
      const content = fs.readFileSync(categoriesPath, 'utf-8')
      
      const syncMarkers: string[] = []
      const lines = content.split('\n')
      
      for (const line of lines) {
        if (line.includes('Last sync:') || line.includes('DB同期済み:')) {
          syncMarkers.push(line.trim())
        }
      }
      
      return syncMarkers
    } catch (error) {
      return []
    }
  }

  /**
   * レポート生成
   */
  generateReport(): void {
    console.log('\n📊 データ反映状況分析結果:')
    console.log('═'.repeat(70))
    
    // クイズJSON状況
    console.log('📄 クイズJSON状況:')
    if (this.report.quizJsonStatus.exists) {
      console.log(`  ✅ ファイル: 存在 (${this.report.quizJsonStatus.questionCount}問)`)
      console.log(`  📅 最終更新: ${this.report.quizJsonStatus.lastModified?.toLocaleString('ja-JP') || '不明'}`)
      
      if (this.report.quizJsonStatus.categoriesUsed && this.report.quizJsonStatus.categoriesUsed.length > 0) {
        console.log(`  📂 使用カテゴリー: ${this.report.quizJsonStatus.categoriesUsed.length}個`)
        console.log(`     ${this.report.quizJsonStatus.categoriesUsed.slice(0, 5).join(', ')}${this.report.quizJsonStatus.categoriesUsed.length > 5 ? '...' : ''}`)
      }
      
      if (this.report.quizJsonStatus.difficulties) {
        console.log(`  📊 難易度分布:`)
        Object.entries(this.report.quizJsonStatus.difficulties).forEach(([difficulty, count]) => {
          console.log(`     ${difficulty}: ${count}問`)
        })
      }
    } else {
      console.log('  ❌ ファイル: 存在しません')
    }
    console.log()
    
    // カテゴリーTypeScript状況
    console.log('📝 カテゴリーTypeScript状況:')
    console.log(`  📊 総カテゴリー数: ${this.report.categoryTypeScriptStatus.totalCategories}`)
    console.log(`  🎯 メインカテゴリー: ${this.report.categoryTypeScriptStatus.mainCategories}`)
    console.log(`  🏢 業界カテゴリー: ${this.report.categoryTypeScriptStatus.industryCategories}`)
    console.log(`  🔗 サブカテゴリーマッピング: ${this.report.categoryTypeScriptStatus.subcategoryMappings}`)
    console.log(`  📈 スキルレベル: ${this.report.categoryTypeScriptStatus.skillLevels}`)
    
    if (this.report.categoryTypeScriptStatus.lastSyncMarkers && this.report.categoryTypeScriptStatus.lastSyncMarkers.length > 0) {
      console.log(`  🔄 同期マーカー:`)
      this.report.categoryTypeScriptStatus.lastSyncMarkers.slice(0, 3).forEach(marker => {
        console.log(`     ${marker}`)
      })
    }
    console.log()
    
    // 問題・警告
    if (this.report.consistencyIssues.length > 0) {
      console.log('⚠️  発見された問題:')
      const errors = this.report.consistencyIssues.filter(i => i.type === 'error')
      const warnings = this.report.consistencyIssues.filter(i => i.type === 'warning')
      const infos = this.report.consistencyIssues.filter(i => i.type === 'info')
      
      if (errors.length > 0) {
        console.log(`❌ エラー (${errors.length}件):`)
        errors.forEach(issue => {
          console.log(`   ${issue.issue}`)
          if (issue.recommendation) {
            console.log(`   → ${issue.recommendation}`)
          }
        })
      }
      
      if (warnings.length > 0) {
        console.log(`⚠️  警告 (${warnings.length}件):`)
        warnings.forEach(issue => {
          console.log(`   ${issue.issue}`)
          if (issue.recommendation) {
            console.log(`   → ${issue.recommendation}`)
          }
        })
      }
      
      if (infos.length > 0) {
        console.log(`ℹ️  情報 (${infos.length}件):`)
        infos.forEach(issue => {
          console.log(`   ${issue.issue}`)
          if (issue.recommendation) {
            console.log(`   → ${issue.recommendation}`)
          }
        })
      }
    } else {
      console.log('🎉 重要な問題は見つかりませんでした！')
    }
    
    console.log('═'.repeat(70))
    
    // 総合評価
    const errorCount = this.report.consistencyIssues.filter(i => i.type === 'error').length
    const warningCount = this.report.consistencyIssues.filter(i => i.type === 'warning').length
    
    if (errorCount > 0) {
      console.log('🔴 重大な問題が見つかりました。対応が必要です。')
    } else if (warningCount > 0) {
      console.log('🟡 警告レベルの問題があります。確認を推奨します。')
    } else {
      console.log('🟢 データ反映状況は良好です！')
    }
    
    // 推奨アクション
    console.log('\n💡 推奨アクション:')
    if (!this.report.quizJsonStatus.exists) {
      console.log('  1. npm run sync:quiz-json を実行してクイズJSONを生成')
    }
    if (this.report.quizJsonStatus.lastModified) {
      const daysSinceUpdate = Math.floor((Date.now() - this.report.quizJsonStatus.lastModified.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceUpdate > 7) {
        console.log(`  2. クイズJSONが${daysSinceUpdate}日前の更新です。最新化を検討してください`)
      }
    }
    console.log('  3. 定期的に npm run check:course-consistency-static を実行')
    console.log('  4. 本番デプロイ前に npm run deploy:pre を実行')
  }
}

// スクリプト実行
function main() {
  const analyzer = new DataReflectionAnalyzer()
  analyzer.run()
}

// 直接実行時のみ実行
if (require.main === module) {
  main()
}

export { DataReflectionAnalyzer }