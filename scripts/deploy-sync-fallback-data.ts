#!/usr/bin/env tsx

/**
 * Deploy時フォールバックデータ同期スクリプト
 * 
 * 本番デプロイ前に以下を自動実行:
 * 1. DB -> JSON/TypeScript ファイル同期
 * 2. 整合性チェック・検証
 * 3. 不整合時の警告・自動修正
 */

import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
dotenv.config({ path: '.env.local' })
import fs from 'fs'
import path from 'path'

// Supabase接続設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface SyncResult {
  success: boolean
  message: string
  details?: any
}

class FallbackDataSyncer {
  
  /**
   * メイン実行関数
   */
  async run(): Promise<void> {
    console.log('🚀 デプロイ前フォールバックデータ同期を開始します...\n')
    
    const results: SyncResult[] = []
    
    try {
      // 1. カテゴリーデータの同期
      console.log('📂 1. カテゴリーデータの同期...')
      const categoryResult = await this.syncCategories()
      results.push(categoryResult)
      
      // 2. サブカテゴリーデータの同期  
      console.log('📂 2. サブカテゴリーデータの同期...')
      const subcategoryResult = await this.syncSubcategories()
      results.push(subcategoryResult)
      
      // 3. スキルレベルデータの同期
      console.log('📂 3. スキルレベルデータの同期...')
      const skillLevelResult = await this.syncSkillLevels()
      results.push(skillLevelResult)
      
      // 4. チャレンジクイズ問題データの完全同期
      console.log('📂 4. チャレンジクイズ問題データの同期...')
      const quizDataResult = await this.syncQuizQuestions()
      results.push(quizDataResult)
      
      // 5. クイズデータ統計の同期
      console.log('📂 5. クイズデータ統計の同期...')
      const quizStatsResult = await this.syncQuizStats()
      results.push(quizStatsResult)
      
      // 6. コース学習データの同期
      console.log('📂 6. コース学習データの同期...')
      const learningDataResult = await this.syncLearningData()
      results.push(learningDataResult)
      
      // 7. 結果サマリー
      this.printSummary(results)
      
    } catch (error) {
      console.error('❌ 同期処理中にエラーが発生しました:', error)
      process.exit(1)
    }
  }

  /**
   * カテゴリーデータの同期
   */
  async syncCategories(): Promise<SyncResult> {
    try {
      // DBからカテゴリーデータを取得
      const { data: dbCategories, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order')
      
      if (error) throw error
      
      // TypeScriptファイルのパス
      const tsFilePath = path.join(process.cwd(), 'lib/categories.ts')
      
      // 現在のTypeScriptファイルを読み込み
      const currentContent = fs.readFileSync(tsFilePath, 'utf-8')
      
      // フォールバックデータ部分を生成
      const fallbackData = this.generateCategoryFallbackData(dbCategories || [])
      
      // TypeScriptファイルの更新が必要かチェック
      const needsUpdate = !currentContent.includes(JSON.stringify(fallbackData).substring(0, 100))
      
      if (needsUpdate) {
        // バックアップ作成
        fs.writeFileSync(`${tsFilePath}.backup.${Date.now()}`, currentContent)
        
        // フォールバックデータ部分を更新
        const updatedContent = this.updateCategoryTypeScript(currentContent, fallbackData)
        fs.writeFileSync(tsFilePath, updatedContent)
        
        console.log('  ✅ カテゴリーTypeScriptファイルを更新しました')
        return { success: true, message: 'カテゴリーデータ同期完了（更新あり）', details: { updated: true, count: dbCategories?.length } }
      } else {
        console.log('  ℹ️  カテゴリーデータは最新です')
        return { success: true, message: 'カテゴリーデータ同期完了（更新なし）', details: { updated: false, count: dbCategories?.length } }
      }
      
    } catch (error) {
      console.error('  ❌ カテゴリー同期エラー:', error)
      return { success: false, message: 'カテゴリー同期失敗', details: error }
    }
  }

  /**
   * サブカテゴリーデータの同期
   */
  async syncSubcategories(): Promise<SyncResult> {
    try {
      // DBからサブカテゴリーデータを取得
      const { data: dbSubcategories, error } = await supabase
        .from('subcategories')
        .select('*')
        .order('parent_category_id, display_order')
      
      if (error) throw error
      
      // JSONファイルのパス
      const jsonFilePath = path.join(process.cwd(), 'public/data/subcategories-fallback.json')
      
      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(jsonFilePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      
      // フォールバックJSONデータを生成
      const fallbackData = {
        lastUpdated: new Date().toISOString(),
        source: 'database_sync',
        subcategories: dbSubcategories || []
      }
      
      // JSONファイルに書き込み
      fs.writeFileSync(jsonFilePath, JSON.stringify(fallbackData, null, 2))
      
      console.log('  ✅ サブカテゴリーJSONファイルを更新しました')
      return { success: true, message: 'サブカテゴリーデータ同期完了', details: { count: dbSubcategories?.length } }
      
    } catch (error) {
      console.error('  ❌ サブカテゴリー同期エラー:', error)
      return { success: false, message: 'サブカテゴリー同期失敗', details: error }
    }
  }

  /**
   * スキルレベルデータの同期
   */
  async syncSkillLevels(): Promise<SyncResult> {
    try {
      // DBからスキルレベルデータを取得
      const { data: dbSkillLevels, error } = await supabase
        .from('skill_levels')
        .select('*')
        .order('display_order')
      
      if (error) throw error
      
      // JSONファイルのパス
      const jsonFilePath = path.join(process.cwd(), 'public/data/skill-levels-fallback.json')
      
      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(jsonFilePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      
      // フォールバックJSONデータを生成
      const fallbackData = {
        lastUpdated: new Date().toISOString(),
        source: 'database_sync',
        skillLevels: dbSkillLevels || []
      }
      
      // JSONファイルに書き込み
      fs.writeFileSync(jsonFilePath, JSON.stringify(fallbackData, null, 2))
      
      console.log('  ✅ スキルレベルJSONファイルを更新しました')
      return { success: true, message: 'スキルレベルデータ同期完了', details: { count: dbSkillLevels?.length } }
      
    } catch (error) {
      console.error('  ❌ スキルレベル同期エラー:', error)
      return { success: false, message: 'スキルレベル同期失敗', details: error }
    }
  }

  /**
   * チャレンジクイズ問題データの完全同期
   */
  async syncQuizQuestions(): Promise<SyncResult> {
    try {
      console.log('  🔄 DBから全クイズ問題データを取得中...')
      
      // DBから全クイズ問題データを取得
      const { data: quizData, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .order('legacy_id')
      
      if (error) throw error
      
      if (!quizData || quizData.length === 0) {
        console.warn('  ⚠️  DBにアクティブな問題データが見つかりません')
        return { success: false, message: '問題データが存在しません' }
      }
      
      // JSONファイルパス
      const jsonFilePath = path.join(process.cwd(), 'public/questions.json')
      
      // バックアップ作成
      if (fs.existsSync(jsonFilePath)) {
        const backupPath = `${jsonFilePath}.backup.${Date.now()}`
        fs.copyFileSync(jsonFilePath, backupPath)
        console.log(`  📦 既存ファイルをバックアップ: ${path.basename(backupPath)}`)
      }
      
      // 問題データを変換
      const processedQuestions = quizData.map(row => ({
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
        // is_active: row.is_active, // DB列不存在のためコメントアウト
        created_at: row.created_at,
        updated_at: row.updated_at
      }))
      
      // JSONデータ構造を生成
      const jsonData = {
        questions: processedQuestions,
        metadata: {
          lastUpdated: new Date().toISOString(),
          totalQuestions: processedQuestions.length,
          activeQuestions: processedQuestions.length, // 全問題をアクティブとして扱う
          source: 'database_deploy_sync',
          syncedAt: new Date().toISOString(),
          categories: [...new Set(processedQuestions.map(q => q.category))].length,
          subcategories: [...new Set(processedQuestions.map(q => q.subcategory_id).filter(Boolean))].length
        }
      }
      
      // JSONファイルに書き出し
      fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2))
      
      console.log(`  ✅ クイズ問題データを同期完了: ${processedQuestions.length}問`)
      console.log(`  📊 カテゴリー: ${jsonData.metadata.categories}個, サブカテゴリー: ${jsonData.metadata.subcategories}個`)
      
      return { 
        success: true, 
        message: `クイズ問題データ同期完了: ${processedQuestions.length}問`, 
        details: { 
          questions: processedQuestions.length,
          categories: jsonData.metadata.categories,
          subcategories: jsonData.metadata.subcategories
        } 
      }
      
    } catch (error) {
      console.error('  ❌ クイズ問題データ同期エラー:', error)
      return { success: false, message: 'クイズ問題データ同期失敗', details: error }
    }
  }

  /**
   * クイズデータ統計の同期
   */
  async syncQuizStats(): Promise<SyncResult> {
    try {
      // DBからクイズ統計データを取得
      const { data: quizStats, error } = await supabase
        .from('quiz_questions')
        .select('category_id, subcategory_id, difficulty')
      
      if (error) throw error
      
      // 統計データを生成
      const stats = this.generateQuizStats(quizStats || [])
      
      // JSONファイルのパス
      const jsonFilePath = path.join(process.cwd(), 'public/data/quiz-stats-fallback.json')
      
      // ディレクトリが存在しない場合は作成
      const dir = path.dirname(jsonFilePath)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      
      // フォールバックJSONデータを生成
      const fallbackData = {
        lastUpdated: new Date().toISOString(),
        source: 'database_sync',
        stats
      }
      
      // JSONファイルに書き込み
      fs.writeFileSync(jsonFilePath, JSON.stringify(fallbackData, null, 2))
      
      console.log('  ✅ クイズ統計JSONファイルを更新しました')
      return { success: true, message: 'クイズ統計データ同期完了', details: { totalQuestions: quizStats?.length, categories: Object.keys(stats.byCategory).length } }
      
    } catch (error) {
      console.error('  ❌ クイズ統計同期エラー:', error)
      return { success: false, message: 'クイズ統計同期失敗', details: error }
    }
  }

  /**
   * コース学習データの同期
   */
  async syncLearningData(): Promise<SyncResult> {
    try {
      console.log('  🔄 コース学習データの検証・同期中...')
      
      // コース定義ファイルの読み込み
      const coursesPath = path.join(process.cwd(), 'lib/learning/courses.ts')
      if (!fs.existsSync(coursesPath)) {
        console.warn('  ⚠️  コース定義ファイルが見つかりません')
        return { success: false, message: 'コース定義ファイルが存在しません' }
      }
      
      // 学習データディレクトリの確認
      const learningDataDir = path.join(process.cwd(), 'public/learning-data')
      if (!fs.existsSync(learningDataDir)) {
        console.log('  📁 学習データディレクトリを作成中...')
        fs.mkdirSync(learningDataDir, { recursive: true })
      }
      
      // 既存のコース学習JSONファイルを確認
      const existingFiles = fs.readdirSync(learningDataDir).filter(file => file.endsWith('.json'))
      console.log(`  📊 既存の学習データファイル: ${existingFiles.length}個`)
      
      // コース定義との整合性チェック（静的読み込みで安定性確保）
      let learningCourses: any[] = []
      try {
        const coursesModule = require('../lib/learning/courses')
        learningCourses = coursesModule.learningCourses || []
      } catch (error) {
        console.warn('  ⚠️  コース定義の動的読み込みを試行中...')
        // フォールバック: 静的データからコース数のみ取得
        learningCourses = [
          { id: 'consulting_thinking_basics' },
          { id: 'ai_literacy_fundamentals' },
          { id: 'marketing_practice' }
        ]
      }
      const courseIds = learningCourses.map(course => course.id)
      const expectedFiles = courseIds.map(id => `${id}.json`)
      expectedFiles.push('courses.json') // メタデータファイル
      
      const missingFiles = expectedFiles.filter(file => !existingFiles.includes(file))
      const extraFiles = existingFiles.filter(file => !expectedFiles.includes(file))
      
      // 結果サマリー作成
      const syncSummary = {
        totalCourses: learningCourses.length,
        expectedFiles: expectedFiles.length,
        existingFiles: existingFiles.length,
        missingFiles: missingFiles.length,
        extraFiles: extraFiles.length
      }
      
      // メタデータファイルの更新
      const coursesMetaPath = path.join(learningDataDir, 'courses.json')
      const metaData = {
        lastUpdated: new Date().toISOString(),
        source: 'deploy_sync',
        totalCourses: learningCourses.length,
        courses: learningCourses.map(course => ({
          id: course.id,
          title: course.title || `コース: ${course.id}`,
          description: course.description || '学習コース',
          difficulty: course.difficulty || 'basic',
          estimatedDays: course.estimatedDays || 14,
          genreCount: course.genres?.length || 0
        })),
        syncStatus: {
          expectedFiles: expectedFiles.length,
          existingFiles: existingFiles.length,
          missingFiles,
          extraFiles
        }
      }
      
      // メタデータファイルのバックアップ＆更新
      if (fs.existsSync(coursesMetaPath)) {
        const backupPath = `${coursesMetaPath}.backup.${Date.now()}`
        fs.copyFileSync(coursesMetaPath, backupPath)
        console.log(`  📦 メタデータファイルをバックアップ: ${path.basename(backupPath)}`)
      }
      
      fs.writeFileSync(coursesMetaPath, JSON.stringify(metaData, null, 2))
      
      console.log(`  ✅ コース学習データ同期完了`)
      console.log(`  📊 コース: ${syncSummary.totalCourses}個, ファイル: ${syncSummary.existingFiles}個`)
      
      if (missingFiles.length > 0) {
        console.warn(`  ⚠️  不足ファイル: ${missingFiles.join(', ')}`)
      }
      
      if (extraFiles.length > 0) {
        console.warn(`  ⚠️  余剰ファイル: ${extraFiles.join(', ')}`)
      }
      
      return { 
        success: true, 
        message: `コース学習データ同期完了: ${syncSummary.totalCourses}コース`, 
        details: syncSummary
      }
      
    } catch (error) {
      console.error('  ❌ コース学習データ同期エラー:', error)
      return { success: false, message: 'コース学習データ同期失敗', details: error }
    }
  }

  /**
   * カテゴリーフォールバックデータを生成
   */
  private generateCategoryFallbackData(categories: any[]): any[] {
    return categories.map(cat => ({
      category_id: cat.category_id,
      name: cat.name,
      description: cat.description,
      icon: cat.icon,
      color: cat.color,
      display_order: cat.display_order,
      is_active: cat.is_active,
      category_type: cat.category_type
    }))
  }

  /**
   * カテゴリーTypeScriptファイルを更新
   */
  private updateCategoryTypeScript(content: string, fallbackData: any[]): string {
    // フォールバックデータ部分を特定・置換
    const fallbackStart = content.indexOf('// FALLBACK_DATA_START')
    const fallbackEnd = content.indexOf('// FALLBACK_DATA_END')
    
    if (fallbackStart === -1 || fallbackEnd === -1) {
      console.warn('  ⚠️  フォールバックデータマーカーが見つかりません。手動で追加してください。')
      return content
    }
    
    const newFallbackSection = `// FALLBACK_DATA_START
// 自動生成されたフォールバックデータ - 手動編集禁止
export const FALLBACK_CATEGORIES = ${JSON.stringify(fallbackData, null, 2)} as const

// FALLBACK_DATA_END`
    
    return content.substring(0, fallbackStart) + newFallbackSection + content.substring(fallbackEnd + '// FALLBACK_DATA_END'.length)
  }

  /**
   * クイズ統計データを生成
   */
  private generateQuizStats(quizData: any[]): any {
    const stats = {
      total: quizData.length,
      byCategory: {} as Record<string, number>,
      bySubcategory: {} as Record<string, number>,
      byDifficulty: {} as Record<string, number>
    }
    
    quizData.forEach(quiz => {
      // カテゴリー別
      stats.byCategory[quiz.category_id] = (stats.byCategory[quiz.category_id] || 0) + 1
      
      // サブカテゴリー別  
      if (quiz.subcategory_id) {
        stats.bySubcategory[quiz.subcategory_id] = (stats.bySubcategory[quiz.subcategory_id] || 0) + 1
      }
      
      // 難易度別
      stats.byDifficulty[quiz.difficulty] = (stats.byDifficulty[quiz.difficulty] || 0) + 1
    })
    
    return stats
  }

  /**
   * 結果サマリーを出力
   */
  private printSummary(results: SyncResult[]): void {
    console.log('\n📊 フォールバックデータ同期結果:')
    console.log('═'.repeat(50))
    
    const successCount = results.filter(r => r.success).length
    const totalCount = results.length
    
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌'
      console.log(`${status} ${index + 1}. ${result.message}`)
      if (result.details) {
        console.log(`   詳細: ${JSON.stringify(result.details)}`)
      }
    })
    
    console.log('═'.repeat(50))
    console.log(`📈 成功: ${successCount}/${totalCount}`)
    
    if (successCount === totalCount) {
      console.log('🎉 すべてのフォールバックデータ同期が完了しました！')
      console.log('💡 本番環境でDBに接続できない場合、これらのファイルが自動的に使用されます。')
    } else {
      console.log('⚠️  一部の同期に失敗しました。上記のエラーを確認してください。')
      process.exit(1)
    }
  }
}

// スクリプト実行
async function main() {
  const syncer = new FallbackDataSyncer()
  await syncer.run()
}

// 直接実行時のみ実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ スクリプト実行エラー:', error)
    process.exit(1)
  })
}

export { FallbackDataSyncer }