#!/usr/bin/env tsx

/**
 * マスタデータ整合性チェックスクリプト
 * カテゴリー・サブカテゴリーの重複チェックとクイズデータの整合性確認
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// .env.local ファイルから環境変数を直接読み込み
function loadEnvFile(): Record<string, string> {
  const envPath = resolve(process.cwd(), '.env.local')
  const env: Record<string, string> = {}
  
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join('=')
        }
      }
    }
  }
  
  return env
}

const envVars = loadEnvFile()

// 環境変数から Supabase 設定を取得
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 環境変数確認:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定')
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? (supabaseServiceKey.includes('placeholder') ? 'プレースホルダー値' : '設定済み') : '未設定')

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey.includes('placeholder')) {
  console.error('❌ Supabase環境変数が正しく設定されていません')
  console.error('必要な環境変数: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  
  if (supabaseServiceKey?.includes('placeholder')) {
    console.error('💡 SUPABASE_SERVICE_ROLE_KEYがプレースホルダー値です。実際のキーに変更してください。')
  }
  
  console.log('\n📋 環境変数設定方法:')
  console.log('1. .env.local ファイルを確認')
  console.log('2. SUPABASE_SERVICE_ROLE_KEY を実際の値に更新')
  console.log('3. Supabaseダッシュボードの Settings > API から取得可能')
  
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// 静的データファイルパス
const QUESTIONS_JSON_PATH = resolve(process.cwd(), 'public/questions.json')
const COURSES_JSON_PATH = resolve(process.cwd(), 'public/learning-data/courses.json')

interface CheckResult {
  category: string
  hasErrors: boolean
  errors: string[]
  warnings: string[]
  details: any
}

interface MasterDataSummary {
  categories: {
    total: number
    duplicates: string[]
    types: Record<string, number>
  }
  subcategories: {
    total: number
    duplicates: string[]
    orphans: string[]
  }
  quizData: {
    total: number
    missingCategories: string[]
    missingSubcategories: string[]
    categoryLevelCount: number
    generalCount: number
  }
  courseData: {
    total: number
    missingCategories: string[]
  }
}

class MasterDataIntegrityChecker {
  private results: CheckResult[] = []
  private summary: MasterDataSummary = {
    categories: { total: 0, duplicates: [], types: {} },
    subcategories: { total: 0, duplicates: [], orphans: [] },
    quizData: { total: 0, missingCategories: [], missingSubcategories: [], categoryLevelCount: 0, generalCount: 0 },
    courseData: { total: 0, missingCategories: [] }
  }

  async run(): Promise<void> {
    console.log('🔍 マスタデータ整合性チェック開始...\n')

    try {
      // Phase 0.1: カテゴリーマスタチェック
      await this.checkCategoryMasterData()

      // Phase 0.2: サブカテゴリーマスタチェック
      await this.checkSubcategoryMasterData()

      // Phase 0.3: クイズデータ整合性チェック
      await this.checkQuizDataIntegrity()

      // Phase 0.4: コース学習データ整合性チェック
      await this.checkCourseDataIntegrity()

      // 結果レポート出力
      this.generateReport()

    } catch (error) {
      console.error('❌ チェック中にエラーが発生しました:', error)
      process.exit(1)
    }
  }

  private async checkCategoryMasterData(): Promise<void> {
    console.log('📋 Phase 0.1: カテゴリーマスタIDユニーク性チェック')

    const { data: categories, error } = await supabase
      .from('categories')
      .select('category_id, name, type, is_active')

    if (error) {
      console.error('❌ カテゴリーデータ取得エラー:', error)
      return
    }

    if (!categories || categories.length === 0) {
      console.warn('⚠️ カテゴリーマスタデータが見つかりません')
      return
    }

    // ID重複チェック
    const categoryIds = categories.map(c => c.category_id)
    const uniqueIds = new Set(categoryIds)
    const duplicateIds = categoryIds.filter((id, index) => categoryIds.indexOf(id) !== index)

    // タイプ別集計
    const typeBreakdown = categories.reduce((acc, cat) => {
      acc[cat.type] = (acc[cat.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    this.summary.categories = {
      total: categories.length,
      duplicates: [...new Set(duplicateIds)],
      types: typeBreakdown
    }

    const result: CheckResult = {
      category: 'カテゴリーマスタ',
      hasErrors: duplicateIds.length > 0,
      errors: duplicateIds.length > 0 ? [`重複ID検出: ${duplicateIds.join(', ')}`] : [],
      warnings: [],
      details: {
        total: categories.length,
        uniqueCount: uniqueIds.size,
        typeBreakdown,
        sampleData: categories.slice(0, 3)
      }
    }

    this.results.push(result)
    
    if (duplicateIds.length > 0) {
      console.log('❌ カテゴリーID重複発見:', duplicateIds)
    } else {
      console.log('✅ カテゴリーIDユニーク性OK')
    }
    
    console.log(`📊 カテゴリー統計: 合計${categories.length}件`, typeBreakdown)
    console.log()
  }

  private async checkSubcategoryMasterData(): Promise<void> {
    console.log('📋 Phase 0.2: サブカテゴリーマスタIDユニーク性チェック')

    const { data: subcategories, error: subError } = await supabase
      .from('subcategories')
      .select('subcategory_id, name, parent_category_id, is_active')

    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('category_id')

    if (subError || catError) {
      console.error('❌ サブカテゴリーデータ取得エラー:', subError || catError)
      return
    }

    const categoryIds = new Set((categories || []).map(c => c.category_id))
    
    if (!subcategories || subcategories.length === 0) {
      console.warn('⚠️ サブカテゴリーマスタデータが見つかりません')
      return
    }

    // ID重複チェック
    const subcategoryIds = subcategories.map(s => s.subcategory_id)
    const uniqueSubIds = new Set(subcategoryIds)
    const duplicateSubIds = subcategoryIds.filter((id, index) => subcategoryIds.indexOf(id) !== index)

    // 親カテゴリー存在チェック
    const orphanSubcategories = subcategories
      .filter(sub => !categoryIds.has(sub.parent_category_id))
      .map(sub => `${sub.subcategory_id} (親:${sub.parent_category_id})`)

    this.summary.subcategories = {
      total: subcategories.length,
      duplicates: [...new Set(duplicateSubIds)],
      orphans: orphanSubcategories
    }

    const result: CheckResult = {
      category: 'サブカテゴリーマスタ',
      hasErrors: duplicateSubIds.length > 0 || orphanSubcategories.length > 0,
      errors: [
        ...(duplicateSubIds.length > 0 ? [`重複ID検出: ${duplicateSubIds.join(', ')}`] : []),
        ...(orphanSubcategories.length > 0 ? [`親カテゴリー不存在: ${orphanSubcategories.slice(0, 5).join(', ')}`] : [])
      ],
      warnings: [],
      details: {
        total: subcategories.length,
        uniqueCount: uniqueSubIds.size,
        orphanCount: orphanSubcategories.length,
        sampleData: subcategories.slice(0, 3)
      }
    }

    this.results.push(result)

    if (duplicateSubIds.length > 0) {
      console.log('❌ サブカテゴリーID重複発見:', duplicateSubIds)
    } else {
      console.log('✅ サブカテゴリーIDユニーク性OK')
    }

    if (orphanSubcategories.length > 0) {
      console.log('❌ 親カテゴリー不存在のサブカテゴリー:', orphanSubcategories.slice(0, 5))
      if (orphanSubcategories.length > 5) {
        console.log(`   ... 他${orphanSubcategories.length - 5}件`)
      }
    } else {
      console.log('✅ サブカテゴリー親子関係OK')
    }

    console.log(`📊 サブカテゴリー統計: 合計${subcategories.length}件`)
    console.log()
  }

  private async checkQuizDataIntegrity(): Promise<void> {
    console.log('📋 Phase 0.3: クイズデータのマスタ不一致チェック')

    // マスタデータ取得
    const { data: categories } = await supabase.from('categories').select('category_id, name')
    const { data: subcategories } = await supabase.from('subcategories').select('subcategory_id, name')

    const categoryIds = new Set((categories || []).map(c => c.category_id))
    const categoryNames = new Set((categories || []).map(c => c.name))
    const subcategoryIds = new Set((subcategories || []).map(s => s.subcategory_id))
    const subcategoryNames = new Set((subcategories || []).map(s => s.name))

    console.log('🔍 マスタデータ詳細:')
    console.log('カテゴリーID例:', Array.from(categoryIds).slice(0, 3))
    console.log('カテゴリー名例:', Array.from(categoryNames).slice(0, 3))
    console.log('サブカテゴリーID例:', Array.from(subcategoryIds).slice(0, 3))
    console.log('サブカテゴリー名例:', Array.from(subcategoryNames).slice(0, 3))

    // 静的JSONファイルからクイズデータ取得
    let quizQuestions: any[] = []
    if (existsSync(QUESTIONS_JSON_PATH)) {
      try {
        const questionsData = JSON.parse(readFileSync(QUESTIONS_JSON_PATH, 'utf-8'))
        quizQuestions = questionsData.questions || []
      } catch (error) {
        console.warn('⚠️ questions.json読み込みエラー:', error)
      }
    }

    // DBからも取得（is_deleted = false のみ取得）
    const { data: dbQuestions } = await supabase
      .from('quiz_questions')
      .select('id, category, subcategory, subcategory_id, is_deleted')
      .eq('is_deleted', false)

    const allQuestions = [...quizQuestions, ...(dbQuestions || [])]

    if (allQuestions.length === 0) {
      console.warn('⚠️ クイズデータが見つかりません')
      return
    }

    console.log('🔍 クイズデータ詳細分析:')
    console.log('クイズデータ総数:', allQuestions.length)
    
    // クイズデータのサンプルを表示
    const sampleQuestions = allQuestions.slice(0, 5)
    console.log('クイズデータサンプル:')
    sampleQuestions.forEach((q, i) => {
      console.log(`  ${i+1}. category: "${q.category}", subcategory: "${q.subcategory}", subcategory_id: "${q.subcategory_id || 'undefined'}"`)
    })

    // 整合性チェック
    const missingCategories: string[] = []
    const missingSubcategories: string[] = []
    const missingCategoryNames: string[] = []
    const missingSubcategoryNames: string[] = []
    let categoryLevelCount = 0
    let generalCount = 0

    for (const question of allQuestions) {
      const category = question.category
      const subcategory = question.subcategory
      const subcategoryId = question.subcategory_id

      // general カウント
      if (category === 'general') {
        generalCount++
        continue
      }

      // category_level カウント
      if (subcategory === 'category_level' || subcategoryId === 'category_level') {
        categoryLevelCount++
      }

      // カテゴリー存在チェック（IDとしてチェック）
      if (!categoryIds.has(category)) {
        // 日本語名としてもチェック
        if (!categoryNames.has(category)) {
          missingCategories.push(category)
        } else {
          missingCategoryNames.push(category)
        }
      }

      // サブカテゴリー存在チェック（category_level 以外）
      // 正しい比較: subcategory_id（英語） vs マスタのsubcategory_id（英語）
      if (subcategoryId && subcategoryId !== 'category_level') {
        if (!subcategoryIds.has(subcategoryId)) {
          missingSubcategories.push(subcategoryId)
        }
      } else if (subcategory && subcategory !== 'category_level' && !subcategoryId) {
        // subcategory_idがない場合のフォールバック：日本語名での確認
        if (!subcategoryNames.has(subcategory)) {
          missingSubcategoryNames.push(subcategory)
        }
      }
    }

    console.log('🔍 分析結果:')
    console.log('- カテゴリーIDで不一致:', [...new Set(missingCategories)].length, '件')
    console.log('- カテゴリー名で存在（ID不一致）:', [...new Set(missingCategoryNames)].length, '件')
    console.log('- サブカテゴリーID（英語）で不一致:', [...new Set(missingSubcategories)].length, '件')
    console.log('- サブカテゴリー名（日本語、IDなし）で不一致:', [...new Set(missingSubcategoryNames)].length, '件')

    if ([...new Set(missingSubcategories)].length > 0) {
      console.log('不一致サブカテゴリーID例:', [...new Set(missingSubcategories)].slice(0, 5))
    }
    if ([...new Set(missingSubcategoryNames)].length > 0) {
      console.log('不一致サブカテゴリー名例:', [...new Set(missingSubcategoryNames)].slice(0, 5))
    }

    this.summary.quizData = {
      total: allQuestions.length,
      missingCategories: [...new Set(missingCategories)],
      missingSubcategories: [...new Set(missingSubcategories)],
      categoryLevelCount,
      generalCount
    }

    const result: CheckResult = {
      category: 'クイズデータ',
      hasErrors: missingCategories.length > 0 || missingSubcategories.length > 0,
      errors: [
        ...(missingCategories.length > 0 ? [`不存在カテゴリー: ${missingCategories.slice(0, 5).join(', ')}`] : []),
        ...(missingSubcategories.length > 0 ? [`不存在サブカテゴリー: ${missingSubcategories.slice(0, 5).join(', ')}`] : [])
      ],
      warnings: [
        ...(generalCount > 0 ? [`移行データ(general): ${generalCount}件`] : []),
        ...(categoryLevelCount > 0 ? [`カテゴリーレベル: ${categoryLevelCount}件`] : [])
      ],
      details: {
        total: allQuestions.length,
        missingCategoryCount: missingCategories.length,
        missingSubcategoryCount: missingSubcategories.length,
        specialCases: { generalCount, categoryLevelCount }
      }
    }

    this.results.push(result)

    if (missingCategories.length > 0) {
      console.log('❌ マスタにないカテゴリー:', missingCategories.slice(0, 5))
      if (missingCategories.length > 5) {
        console.log(`   ... 他${missingCategories.length - 5}件`)
      }
    }

    if (missingSubcategories.length > 0) {
      console.log('❌ マスタにないサブカテゴリー:', missingSubcategories.slice(0, 5))
      if (missingSubcategories.length > 5) {
        console.log(`   ... 他${missingSubcategories.length - 5}件`)
      }
    }

    if (generalCount > 0) {
      console.log(`⚠️ 移行データ(general): ${generalCount}件 - 正常な例外`)
    }

    if (categoryLevelCount > 0) {
      console.log(`⚠️ カテゴリーレベル: ${categoryLevelCount}件 - 正常な例外`)
    }

    if (missingCategories.length === 0 && missingSubcategories.length === 0) {
      console.log('✅ クイズデータマスタ整合性OK')
    }

    console.log(`📊 クイズデータ統計: 合計${allQuestions.length}件`)
    console.log()
  }

  private async checkCourseDataIntegrity(): Promise<void> {
    console.log('📋 Phase 0.4: コース学習データのマスタ不一致チェック')

    // マスタデータ取得
    const { data: categories } = await supabase.from('categories').select('category_id, name')
    const categoryIds = new Set((categories || []).map(c => c.category_id))

    // コースデータ取得（DB優先）
    const { data: dbGenres } = await supabase
      .from('learning_genres')
      .select('id, course_id, category_id, subcategory_id')

    // 静的JSONファイルからも取得
    let staticCourseData: any[] = []
    if (existsSync(COURSES_JSON_PATH)) {
      try {
        const coursesData = JSON.parse(readFileSync(COURSES_JSON_PATH, 'utf-8'))
        // コースファイルの構造を分析
        console.log('📄 Static courses.json structure:', Object.keys(coursesData))
      } catch (error) {
        console.warn('⚠️ courses.json読み込みエラー:', error)
      }
    }

    const allCourseGenres = dbGenres || []

    if (allCourseGenres.length === 0) {
      console.warn('⚠️ コース学習データが見つかりません')
      return
    }

    // 整合性チェック
    const missingCategories: string[] = []

    for (const genre of allCourseGenres) {
      const categoryId = genre.category_id

      if (categoryId && !categoryIds.has(categoryId)) {
        missingCategories.push(categoryId)
      }
    }

    this.summary.courseData = {
      total: allCourseGenres.length,
      missingCategories: [...new Set(missingCategories)]
    }

    const result: CheckResult = {
      category: 'コース学習データ',
      hasErrors: missingCategories.length > 0,
      errors: missingCategories.length > 0 ? [`不存在カテゴリー: ${missingCategories.join(', ')}`] : [],
      warnings: [],
      details: {
        total: allCourseGenres.length,
        missingCategoryCount: missingCategories.length,
        sampleData: allCourseGenres.slice(0, 3)
      }
    }

    this.results.push(result)

    if (missingCategories.length > 0) {
      console.log('❌ マスタにないカテゴリー:', missingCategories)
    } else {
      console.log('✅ コース学習データマスタ整合性OK')
    }

    console.log(`📊 コース学習データ統計: 合計${allCourseGenres.length}件`)
    console.log()
  }

  private generateReport(): void {
    console.log('=' .repeat(80))
    console.log('📊 マスタデータ整合性チェック結果レポート')
    console.log('=' .repeat(80))

    // エラー・警告サマリー
    const totalErrors = this.results.reduce((sum, r) => sum + r.errors.length, 0)
    const totalWarnings = this.results.reduce((sum, r) => sum + r.warnings.length, 0)

    console.log('\n🚨 総合結果:')
    if (totalErrors === 0) {
      console.log('✅ 致命的エラー: なし')
    } else {
      console.log(`❌ 致命的エラー: ${totalErrors}件`)
    }
    
    if (totalWarnings > 0) {
      console.log(`⚠️ 警告: ${totalWarnings}件`)
    }

    // 詳細結果
    console.log('\n📋 詳細結果:')
    for (const result of this.results) {
      const status = result.hasErrors ? '❌' : (result.warnings.length > 0 ? '⚠️' : '✅')
      console.log(`${status} ${result.category}`)
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => console.log(`   エラー: ${error}`))
      }
      
      if (result.warnings.length > 0) {
        result.warnings.forEach(warning => console.log(`   警告: ${warning}`))
      }
    }

    // 数値サマリー
    console.log('\n📊 データ統計:')
    console.log(`カテゴリー: ${this.summary.categories.total}件 (重複: ${this.summary.categories.duplicates.length}件)`)
    console.log(`サブカテゴリー: ${this.summary.subcategories.total}件 (重複: ${this.summary.subcategories.duplicates.length}件, 孤児: ${this.summary.subcategories.orphans.length}件)`)
    console.log(`クイズデータ: ${this.summary.quizData.total}件 (不整合カテゴリー: ${this.summary.quizData.missingCategories.length}件, 不整合サブカテゴリー: ${this.summary.quizData.missingSubcategories.length}件)`)
    console.log(`コースデータ: ${this.summary.courseData.total}件 (不整合カテゴリー: ${this.summary.courseData.missingCategories.length}件)`)

    // 例外データレポート
    if (this.summary.quizData.generalCount > 0 || this.summary.quizData.categoryLevelCount > 0) {
      console.log('\n🔍 例外データ詳細:')
      if (this.summary.quizData.generalCount > 0) {
        console.log(`- 移行データ(general): ${this.summary.quizData.generalCount}件 (正常)`)
      }
      if (this.summary.quizData.categoryLevelCount > 0) {
        console.log(`- カテゴリーレベル: ${this.summary.quizData.categoryLevelCount}件 (正常)`)
      }
    }

    // 修正提案
    if (totalErrors > 0) {
      console.log('\n🔧 修正が必要な項目:')
      
      if (this.summary.categories.duplicates.length > 0) {
        console.log('- カテゴリーID重複の解消')
      }
      
      if (this.summary.subcategories.duplicates.length > 0) {
        console.log('- サブカテゴリーID重複の解消')
      }
      
      if (this.summary.subcategories.orphans.length > 0) {
        console.log('- 孤児サブカテゴリーの親カテゴリー修正')
      }
      
      if (this.summary.quizData.missingCategories.length > 0) {
        console.log('- クイズデータの不存在カテゴリー修正')
      }
      
      if (this.summary.quizData.missingSubcategories.length > 0) {
        console.log('- クイズデータの不存在サブカテゴリー修正')
      }
    } else {
      console.log('\n🎉 マスタデータ整合性: 問題なし')
      console.log('Phase 2以降の作業に進行可能です')
    }

    console.log('=' .repeat(80))
  }
}

// スクリプト実行
async function main() {
  const checker = new MasterDataIntegrityChecker()
  await checker.run()
}

main().catch(console.error)