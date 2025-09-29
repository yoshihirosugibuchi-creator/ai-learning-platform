#!/usr/bin/env tsx

/**
 * コース学習マスタ整合性チェックスクリプト
 * 
 * 以下の整合性をチェック:
 * 1. Learning Course の categoryId がマスタカテゴリーと一致しているか
 * 2. Learning Course の subcategoryId がマスタサブカテゴリーと一致しているか  
 * 3. 難易度レベル（difficulty）がスキルレベルマスタと整合しているか
 * 4. 非アクティブカテゴリーを参照していないか
 * 5. 存在しないカテゴリー・サブカテゴリーを参照していないか
 */

import { createClient } from '@supabase/supabase-js'
import { learningCourses } from '@/lib/learning/courses'
import type { LearningCourse, LearningGenre } from '@/lib/types/learning'

// Supabase接続設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ConsistencyIssue {
  severity: 'error' | 'warning' | 'info'
  category: string
  issue: string
  details: any
  recommendation?: string
}

interface ConsistencyReport {
  totalCourses: number
  totalGenres: number
  issues: ConsistencyIssue[]
  summary: {
    errors: number
    warnings: number
    infos: number
  }
}

class CourseMasterConsistencyChecker {
  private categories: any[] = []
  private subcategories: any[] = []
  private skillLevels: any[] = []
  private report: ConsistencyReport = {
    totalCourses: 0,
    totalGenres: 0,
    issues: [],
    summary: { errors: 0, warnings: 0, infos: 0 }
  }

  /**
   * メイン実行関数
   */
  async run(): Promise<void> {
    console.log('🔍 コース学習マスタ整合性チェックを開始します...\n')
    
    try {
      // 1. マスタデータ取得
      await this.loadMasterData()
      
      // 2. 学習コースデータの基本情報表示
      this.displayCourseOverview()
      
      // 3. 整合性チェック実行
      await this.performConsistencyChecks()
      
      // 4. レポート出力
      this.generateReport()
      
    } catch (error) {
      console.error('❌ チェック処理中にエラーが発生しました:', error)
      process.exit(1)
    }
  }

  /**
   * マスタデータを取得
   */
  async loadMasterData(): Promise<void> {
    console.log('📂 マスタデータを取得中...')
    
    // カテゴリー取得
    const { data: categoriesData, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .order('type, display_order')
    
    if (categoriesError) throw categoriesError
    this.categories = categoriesData || []
    
    // サブカテゴリー取得
    const { data: subcategoriesData, error: subcategoriesError } = await supabase
      .from('subcategories')
      .select('*')
      .order('parent_category_id, display_order')
    
    if (subcategoriesError) throw subcategoriesError
    this.subcategories = subcategoriesData || []
    
    // スキルレベル取得
    const { data: skillLevelsData, error: skillLevelsError } = await supabase
      .from('skill_levels')
      .select('*')
      .order('display_order')
    
    if (skillLevelsError) throw skillLevelsError
    this.skillLevels = skillLevelsData || []
    
    console.log('✅ マスタデータ取得完了')
    console.log(`  - カテゴリー: ${this.categories.length}件`)
    console.log(`  - サブカテゴリー: ${this.subcategories.length}件`)
    console.log(`  - スキルレベル: ${this.skillLevels.length}件\n`)
  }

  /**
   * 学習コースデータの概要を表示
   */
  displayCourseOverview(): void {
    const totalGenres = learningCourses.reduce((acc, course) => acc + course.genres.length, 0)
    const totalThemes = learningCourses.reduce((acc, course) => 
      acc + course.genres.reduce((genreAcc, genre) => genreAcc + genre.themes.length, 0), 0
    )
    
    this.report.totalCourses = learningCourses.length
    this.report.totalGenres = totalGenres
    
    console.log('📊 学習コースデータ概要:')
    console.log(`  - コース数: ${learningCourses.length}`)
    console.log(`  - ジャンル数: ${totalGenres}`)
    console.log(`  - テーマ数: ${totalThemes}`)
    console.log()
  }

  /**
   * 整合性チェックを実行
   */
  async performConsistencyChecks(): Promise<void> {
    console.log('🔍 整合性チェック実行中...\n')
    
    for (const course of learningCourses) {
      // 1. コースレベルのチェック
      this.checkCourseDifficulty(course)
      
      // 2. ジャンルレベルのチェック
      for (const genre of course.genres) {
        await this.checkGenreConsistency(course, genre)
      }
    }
  }

  /**
   * コース難易度のチェック
   */
  checkCourseDifficulty(course: LearningCourse): void {
    // difficulty値とスキルレベルマスタの整合性チェック
    const skillLevel = this.skillLevels.find(level => level.level_id === course.difficulty)
    
    if (!skillLevel) {
      this.addIssue('error', 'Course Difficulty', 
        `コース "${course.title}" の難易度 "${course.difficulty}" がスキルレベルマスタに存在しません`,
        { courseId: course.id, difficulty: course.difficulty },
        `スキルレベルマスタに "${course.difficulty}" を追加するか、コースの難易度を変更してください`
      )
    }
    
    // 難易度の英語名が正しいかチェック
    const validDifficulties = ['basic', 'intermediate', 'advanced', 'expert']
    if (!validDifficulties.includes(course.difficulty)) {
      this.addIssue('error', 'Course Difficulty',
        `コース "${course.title}" の難易度 "${course.difficulty}" は有効な値ではありません`,
        { courseId: course.id, difficulty: course.difficulty, validValues: validDifficulties },
        `difficulty を ${validDifficulties.join(', ')} のいずれかに変更してください`
      )
    }
  }

  /**
   * ジャンルの整合性チェック
   */
  async checkGenreConsistency(course: LearningCourse, genre: LearningGenre): Promise<void> {
    // 1. カテゴリーIDの存在チェック
    const category = this.categories.find(cat => cat.category_id === genre.categoryId)
    
    if (!category) {
      this.addIssue('error', 'Genre Category',
        `ジャンル "${genre.title}" で参照されているカテゴリーID "${genre.categoryId}" が存在しません`,
        { courseId: course.id, genreId: genre.id, categoryId: genre.categoryId },
        `カテゴリーマスタに "${genre.categoryId}" を追加するか、ジャンルのcategoryIdを変更してください`
      )
    } else {
      // カテゴリーがアクティブかチェック
      if (!category.is_active) {
        this.addIssue('warning', 'Genre Category',
          `ジャンル "${genre.title}" が参照するカテゴリー "${category.name}" は非アクティブです`,
          { courseId: course.id, genreId: genre.id, categoryId: genre.categoryId, categoryName: category.name },
          `カテゴリーをアクティブにするか、異なるカテゴリーに変更を検討してください`
        )
      }
      
      // カテゴリーが表示可能かチェック
      if (!category.is_visible) {
        this.addIssue('warning', 'Genre Category',
          `ジャンル "${genre.title}" が参照するカテゴリー "${category.name}" は表示不可です`,
          { courseId: course.id, genreId: genre.id, categoryId: genre.categoryId, categoryName: category.name },
          `カテゴリーを表示可能にするか、異なるカテゴリーに変更を検討してください`
        )
      }
    }

    // 2. サブカテゴリーIDの存在チェック（指定されている場合）
    if (genre.subcategoryId) {
      const subcategory = this.subcategories.find(sub => sub.subcategory_id === genre.subcategoryId)
      
      if (!subcategory) {
        this.addIssue('error', 'Genre Subcategory',
          `ジャンル "${genre.title}" で参照されているサブカテゴリーID "${genre.subcategoryId}" が存在しません`,
          { courseId: course.id, genreId: genre.id, subcategoryId: genre.subcategoryId },
          `サブカテゴリーマスタに "${genre.subcategoryId}" を追加するか、ジャンルのsubcategoryIdを変更してください`
        )
      } else {
        // サブカテゴリーの親カテゴリーとの整合性チェック
        if (subcategory.parent_category_id !== genre.categoryId) {
          this.addIssue('error', 'Genre Consistency',
            `ジャンル "${genre.title}" のカテゴリー・サブカテゴリーの関係が不整合です`,
            { 
              courseId: course.id, 
              genreId: genre.id, 
              categoryId: genre.categoryId,
              subcategoryId: genre.subcategoryId,
              subcategoryParent: subcategory.parent_category_id
            },
            `subcategoryIdを ${subcategory.parent_category_id} カテゴリーのサブカテゴリーに変更するか、categoryIdを ${subcategory.parent_category_id} に変更してください`
          )
        }
        
        // サブカテゴリーがアクティブかチェック
        if (!subcategory.is_active) {
          this.addIssue('warning', 'Genre Subcategory',
            `ジャンル "${genre.title}" が参照するサブカテゴリー "${subcategory.name}" は非アクティブです`,
            { courseId: course.id, genreId: genre.id, subcategoryId: genre.subcategoryId, subcategoryName: subcategory.name },
            `サブカテゴリーをアクティブにするか、異なるサブカテゴリーに変更を検討してください`
          )
        }
      }
    }

    // 3. カテゴリータイプの適切性チェック
    if (category) {
      // 学習コースに industry カテゴリーを使用している場合の警告
      if (category.type === 'industry') {
        this.addIssue('info', 'Genre Category Type',
          `ジャンル "${genre.title}" が業界カテゴリー "${category.name}" を使用しています`,
          { courseId: course.id, genreId: genre.id, categoryId: genre.categoryId, categoryType: category.type },
          `業界特化コンテンツとして適切かご確認ください`
        )
      }
    }
  }

  /**
   * 問題を追加
   */
  addIssue(severity: ConsistencyIssue['severity'], category: string, issue: string, details: any, recommendation?: string): void {
    this.report.issues.push({
      severity,
      category,
      issue,
      details,
      recommendation
    })
    
    this.report.summary[severity === 'error' ? 'errors' : severity === 'warning' ? 'warnings' : 'infos']++
  }

  /**
   * レポート生成
   */
  generateReport(): void {
    console.log('\n📊 整合性チェック結果:')
    console.log('═'.repeat(70))
    
    // サマリー表示
    const { errors, warnings, infos } = this.report.summary
    console.log(`📈 サマリー:`)
    console.log(`  - 総エラー数: ${errors}件`)
    console.log(`  - 総警告数: ${warnings}件`)
    console.log(`  - 総情報: ${infos}件`)
    console.log(`  - 検査対象: ${this.report.totalCourses}コース, ${this.report.totalGenres}ジャンル`)
    console.log()
    
    // 問題詳細表示
    if (this.report.issues.length === 0) {
      console.log('🎉 整合性に問題は見つかりませんでした！')
    } else {
      // 重要度順に表示
      const sortedIssues = this.report.issues.sort((a, b) => {
        const severityOrder = { error: 0, warning: 1, info: 2 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      })
      
      for (const issue of sortedIssues) {
        const icon = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️'
        const severityLabel = issue.severity === 'error' ? 'エラー' : issue.severity === 'warning' ? '警告' : '情報'
        
        console.log(`${icon} [${severityLabel}] ${issue.category}`)
        console.log(`   問題: ${issue.issue}`)
        console.log(`   詳細: ${JSON.stringify(issue.details, null, 2)}`)
        if (issue.recommendation) {
          console.log(`   推奨対応: ${issue.recommendation}`)
        }
        console.log()
      }
    }
    
    console.log('═'.repeat(70))
    
    // 終了状態の決定
    if (errors > 0) {
      console.log('🔴 重大な整合性問題が見つかりました。対応が必要です。')
      process.exit(1)
    } else if (warnings > 0) {
      console.log('🟡 警告レベルの問題が見つかりました。確認を推奨します。')
    } else {
      console.log('🟢 整合性チェック完了！問題は見つかりませんでした。')
    }
  }
}

// スクリプト実行
async function main() {
  const checker = new CourseMasterConsistencyChecker()
  await checker.run()
}

// 直接実行時のみ実行
if (require.main === module) {
  main().catch(error => {
    console.error('❌ スクリプト実行エラー:', error)
    process.exit(1)
  })
}

export { CourseMasterConsistencyChecker }