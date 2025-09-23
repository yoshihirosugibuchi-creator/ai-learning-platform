#!/usr/bin/env tsx

/**
 * クイズデータJSON同期スクリプト
 * 
 * DB → public/questions.json 同期
 * カテゴリーTypeScript反映確認
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { getAllCategoriesSync, skillLevels } from '@/lib/categories'

// Supabase接続設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface QuizQuestion {
  id: number
  category: string
  subcategory?: string
  subcategory_id?: string
  question: string
  options: string[]
  correct: number
  explanation?: string
  difficulty?: string
  timeLimit?: number
  relatedTopics?: string[]
  source?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

interface SyncReport {
  totalQuestions: number
  activeQuestions: number
  categoriesUsed: string[]
  subcategoriesUsed: string[]
  difficulties: Record<string, number>
  issues: Array<{
    type: 'warning' | 'error' | 'info'
    message: string
    details?: any
  }>
}

class QuizDataSyncer {
  private report: SyncReport = {
    totalQuestions: 0,
    activeQuestions: 0,
    categoriesUsed: [],
    subcategoriesUsed: [],
    difficulties: {},
    issues: []
  }

  /**
   * メイン実行関数
   */
  async run(): Promise<void> {
    console.log('🔄 クイズデータJSON同期を開始します...\n')
    
    try {
      // 1. DBからクイズデータを取得
      const quizData = await this.fetchQuizData()
      
      // 2. データ変換・検証
      const processedData = this.processQuizData(quizData)
      
      // 3. JSON書き出し
      await this.writeQuizJSON(processedData)
      
      // 4. カテゴリーTypeScript整合性チェック
      this.checkCategoryTypeScriptConsistency(quizData)
      
      // 5. レポート出力
      this.generateReport()
      
    } catch (error) {
      console.error('❌ 同期処理中にエラーが発生しました:', error)
      process.exit(1)
    }
  }

  /**
   * DBからクイズデータを取得
   */
  async fetchQuizData(): Promise<any[]> {
    console.log('📂 DBからクイズデータを取得中...')
    
    const { data, error } = await supabase
      .from('quiz_questions')
      .select('*')
      .order('legacy_id')
    
    if (error) {
      throw new Error(`クイズデータ取得エラー: ${error.message}`)
    }
    
    console.log(`✅ ${data?.length || 0}件のクイズデータを取得しました`)
    return data || []
  }

  /**
   * クイズデータの処理・変換
   */
  processQuizData(rawData: any[]): QuizQuestion[] {
    console.log('🔄 クイズデータを処理中...')
    
    const processed: QuizQuestion[] = []
    const categoriesSet = new Set<string>()
    const subcategoriesSet = new Set<string>()
    const difficulties: Record<string, number> = {}
    
    for (const row of rawData) {
      try {
        const question: QuizQuestion = {
          id: row.legacy_id,
          category: row.category_id,
          subcategory: row.subcategory,
          subcategory_id: row.subcategory_id,
          question: row.question,
          options: [row.option1, row.option2, row.option3, row.option4],
          correct: row.correct_answer - 1, // 0-based indexに変換
          explanation: row.explanation,
          difficulty: row.difficulty,
          timeLimit: row.time_limit,
          relatedTopics: row.related_topics || [],
          source: row.source,
          is_active: row.is_active,
          created_at: row.created_at,
          updated_at: row.updated_at
        }
        
        // 統計情報収集
        if (row.category_id) categoriesSet.add(row.category_id)
        if (row.subcategory_id) subcategoriesSet.add(row.subcategory_id)
        if (row.difficulty) {
          difficulties[row.difficulty] = (difficulties[row.difficulty] || 0) + 1
        }
        
        processed.push(question)
        
        if (row.is_active) {
          this.report.activeQuestions++
        }
        
      } catch (error) {
        this.report.issues.push({
          type: 'error',
          message: `問題ID ${row.legacy_id} の変換でエラー`,
          details: error
        })
      }
    }
    
    this.report.totalQuestions = processed.length
    this.report.categoriesUsed = Array.from(categoriesSet)
    this.report.subcategoriesUsed = Array.from(subcategoriesSet)
    this.report.difficulties = difficulties
    
    console.log(`✅ ${processed.length}件のクイズデータを処理しました`)
    return processed
  }

  /**
   * JSONファイルに書き出し
   */
  async writeQuizJSON(questions: QuizQuestion[]): Promise<void> {
    console.log('📝 JSONファイルに書き出し中...')
    
    const outputPath = path.join(process.cwd(), 'public/questions.json')
    
    // バックアップ作成
    if (fs.existsSync(outputPath)) {
      const backupPath = `${outputPath}.backup.${Date.now()}`
      fs.copyFileSync(outputPath, backupPath)
      console.log(`📦 既存ファイルをバックアップしました: ${backupPath}`)
    }
    
    const jsonData = {
      questions: questions.filter(q => q.is_active !== false), // アクティブな問題のみ
      metadata: {
        lastUpdated: new Date().toISOString(),
        totalQuestions: questions.length,
        activeQuestions: questions.filter(q => q.is_active !== false).length,
        source: 'database_sync',
        categories: this.report.categoriesUsed.length,
        subcategories: this.report.subcategoriesUsed.length
      }
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2))
    console.log(`✅ JSONファイルを更新しました: ${outputPath}`)
  }

  /**
   * カテゴリーTypeScript整合性チェック
   */
  checkCategoryTypeScriptConsistency(quizData: any[]): void {
    console.log('🔍 カテゴリーTypeScript整合性をチェック中...')
    
    const staticCategories = getAllCategoriesSync()
    const staticCategoryIds = staticCategories.map(cat => cat.id)
    const staticSkillLevelIds = skillLevels.map(level => level.id)
    
    // DBで使用されているカテゴリーがTypeScriptに存在するかチェック
    const dbCategories = new Set(quizData.map(q => q.category_id).filter(Boolean))
    const dbDifficulties = new Set(quizData.map(q => q.difficulty).filter(Boolean))
    
    for (const categoryId of dbCategories) {
      if (!staticCategoryIds.includes(categoryId)) {
        this.report.issues.push({
          type: 'warning',
          message: `DBカテゴリー "${categoryId}" がTypeScript定義に存在しません`,
          details: { categoryId, availableCategories: staticCategoryIds }
        })
      }
    }
    
    for (const difficulty of dbDifficulties) {
      if (!staticSkillLevelIds.includes(difficulty)) {
        this.report.issues.push({
          type: 'warning',
          message: `DB難易度 "${difficulty}" がTypeScript定義に存在しません`,
          details: { difficulty, availableSkillLevels: staticSkillLevelIds }
        })
      }
    }
    
    // TypeScriptで定義されているが使用されていないカテゴリー
    for (const categoryId of staticCategoryIds) {
      if (!dbCategories.has(categoryId)) {
        this.report.issues.push({
          type: 'info',
          message: `TypeScriptカテゴリー "${categoryId}" はDBで使用されていません`,
          details: { categoryId }
        })
      }
    }
    
    console.log('✅ カテゴリーTypeScript整合性チェック完了')
  }

  /**
   * レポート生成
   */
  generateReport(): void {
    console.log('\n📊 クイズデータ同期結果:')
    console.log('═'.repeat(60))
    
    // 基本統計
    console.log('📈 基本統計:')
    console.log(`  - 総問題数: ${this.report.totalQuestions}`)
    console.log(`  - アクティブ問題数: ${this.report.activeQuestions}`)
    console.log(`  - 使用カテゴリー数: ${this.report.categoriesUsed.length}`)
    console.log(`  - 使用サブカテゴリー数: ${this.report.subcategoriesUsed.length}`)
    console.log()
    
    // 難易度分布
    console.log('📊 難易度分布:')
    Object.entries(this.report.difficulties).forEach(([difficulty, count]) => {
      console.log(`  - ${difficulty}: ${count}問`)
    })
    console.log()
    
    // カテゴリー一覧
    console.log('📂 使用カテゴリー:')
    this.report.categoriesUsed.slice(0, 10).forEach(categoryId => {
      console.log(`  - ${categoryId}`)
    })
    if (this.report.categoriesUsed.length > 10) {
      console.log(`  ... (他${this.report.categoriesUsed.length - 10}件)`)
    }
    console.log()
    
    // 問題・警告
    if (this.report.issues.length > 0) {
      console.log('⚠️  発見された問題:')
      const errors = this.report.issues.filter(i => i.type === 'error')
      const warnings = this.report.issues.filter(i => i.type === 'warning')
      const infos = this.report.issues.filter(i => i.type === 'info')
      
      if (errors.length > 0) {
        console.log(`❌ エラー (${errors.length}件):`)
        errors.forEach(issue => {
          console.log(`   ${issue.message}`)
        })
      }
      
      if (warnings.length > 0) {
        console.log(`⚠️  警告 (${warnings.length}件):`)
        warnings.forEach(issue => {
          console.log(`   ${issue.message}`)
        })
      }
      
      if (infos.length > 0) {
        console.log(`ℹ️  情報 (${infos.length}件):`)
        infos.slice(0, 5).forEach(issue => {
          console.log(`   ${issue.message}`)
        })
        if (infos.length > 5) {
          console.log(`   ... (他${infos.length - 5}件)`)
        }
      }
    } else {
      console.log('🎉 問題は見つかりませんでした！')
    }
    
    console.log('═'.repeat(60))
    
    // 終了状態
    const errorCount = this.report.issues.filter(i => i.type === 'error').length
    if (errorCount > 0) {
      console.log('🔴 エラーが発生しました。確認が必要です。')
      process.exit(1)
    } else {
      console.log('🟢 クイズデータ同期が正常に完了しました！')
    }
  }
}

// スクリプト実行
async function main() {
  const syncer = new QuizDataSyncer()
  await syncer.run()
}

// 直接実行時のみ実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ スクリプト実行エラー:', error)
    process.exit(1)
  })
}

export { QuizDataSyncer }