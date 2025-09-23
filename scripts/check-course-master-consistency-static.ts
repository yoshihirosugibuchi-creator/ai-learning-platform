#!/usr/bin/env tsx

/**
 * コース学習マスタ整合性チェックスクリプト（静的データ版）
 * 
 * 静的なフォールバックデータを使用して以下の整合性をチェック:
 * 1. Learning Course の categoryId がマスタカテゴリーと一致しているか
 * 2. Learning Course の subcategoryId がマスタサブカテゴリーと一致しているか  
 * 3. 難易度レベル（difficulty）がスキルレベルマスタと整合しているか
 * 4. 存在しないカテゴリー・サブカテゴリーを参照していないか
 */

import { learningCourses } from '@/lib/learning/courses'
import type { LearningCourse, LearningGenre } from '@/lib/types/learning'
import { 
  getAllCategoriesSync, 
  skillLevels,
  subcategoryNameToIdMap 
} from '@/lib/categories'

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
  private categories = getAllCategoriesSync()
  private skillLevelsData = skillLevels
  private subcategoryNameMap = subcategoryNameToIdMap
  private report: ConsistencyReport = {
    totalCourses: 0,
    totalGenres: 0,
    issues: [],
    summary: { errors: 0, warnings: 0, infos: 0 }
  }

  /**
   * メイン実行関数
   */
  run(): void {
    console.log('🔍 コース学習マスタ整合性チェックを開始します...\n')
    
    try {
      // 1. 利用可能なデータ表示
      this.displayAvailableData()
      
      // 2. 学習コースデータの基本情報表示
      this.displayCourseOverview()
      
      // 3. 整合性チェック実行
      this.performConsistencyChecks()
      
      // 4. レポート出力
      this.generateReport()
      
    } catch (error) {
      console.error('❌ チェック処理中にエラーが発生しました:', error)
      process.exit(1)
    }
  }

  /**
   * 利用可能なデータを表示
   */
  displayAvailableData(): void {
    console.log('📂 利用可能なマスタデータ:')
    
    const mainCategories = this.categories.filter(cat => cat.type === 'main')
    const industryCategories = this.categories.filter(cat => cat.type === 'industry')
    
    console.log(`  - メインカテゴリー: ${mainCategories.length}件`)
    console.log(`  - 業界カテゴリー: ${industryCategories.length}件`)
    console.log(`  - スキルレベル: ${this.skillLevelsData.length}件`)
    console.log(`  - サブカテゴリー名マッピング: ${Object.keys(this.subcategoryNameMap).length}件`)
    console.log()
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
  performConsistencyChecks(): void {
    console.log('🔍 整合性チェック実行中...\n')
    
    for (const course of learningCourses) {
      // 1. コースレベルのチェック
      this.checkCourseDifficulty(course)
      
      // 2. ジャンルレベルのチェック
      for (const genre of course.genres) {
        this.checkGenreConsistency(course, genre)
      }
    }
  }

  /**
   * コース難易度のチェック
   */
  checkCourseDifficulty(course: LearningCourse): void {
    // difficulty値とスキルレベルマスタの整合性チェック
    const skillLevel = this.skillLevelsData.find(level => level.id === course.difficulty)
    
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
    } else {
      this.addIssue('info', 'Course Difficulty',
        `コース "${course.title}" の難易度 "${course.difficulty}" (${skillLevel?.name}) は正常です`,
        { courseId: course.id, difficulty: course.difficulty, skillLevelName: skillLevel?.name }
      )
    }
  }

  /**
   * ジャンルの整合性チェック
   */
  checkGenreConsistency(course: LearningCourse, genre: LearningGenre): void {
    // 1. カテゴリーIDの存在チェック
    const category = this.categories.find(cat => cat.id === genre.categoryId)
    
    if (!category) {
      this.addIssue('error', 'Genre Category',
        `ジャンル "${genre.title}" で参照されているカテゴリーID "${genre.categoryId}" が存在しません`,
        { courseId: course.id, genreId: genre.id, categoryId: genre.categoryId },
        `カテゴリーマスタに "${genre.categoryId}" を追加するか、ジャンルのcategoryIdを変更してください`
      )
    } else {
      this.addIssue('info', 'Genre Category',
        `ジャンル "${genre.title}" のカテゴリー "${category.name}" は正常です`,
        { courseId: course.id, genreId: genre.id, categoryId: genre.categoryId, categoryName: category.name, categoryType: category.type }
      )
      
      // カテゴリータイプの適切性チェック
      if (category.type === 'industry') {
        this.addIssue('info', 'Genre Category Type',
          `ジャンル "${genre.title}" が業界カテゴリー "${category.name}" を使用しています`,
          { courseId: course.id, genreId: genre.id, categoryId: genre.categoryId, categoryType: category.type },
          `業界特化コンテンツとして適切かご確認ください`
        )
      }
    }

    // 2. サブカテゴリーIDの存在チェック（指定されている場合）
    if (genre.subcategoryId) {
      // サブカテゴリー名から実際のサブカテゴリーIDに変換できるかチェック
      const expectedSubcategoryId = this.subcategoryNameMap[genre.subcategoryId]
      
      if (!expectedSubcategoryId) {
        this.addIssue('warning', 'Genre Subcategory',
          `ジャンル "${genre.title}" で参照されているサブカテゴリー名 "${genre.subcategoryId}" がマッピングに存在しません`,
          { courseId: course.id, genreId: genre.id, subcategoryName: genre.subcategoryId },
          `サブカテゴリー名マッピングに "${genre.subcategoryId}" を追加するか、有効なサブカテゴリー名に変更してください`
        )
      } else {
        this.addIssue('info', 'Genre Subcategory',
          `ジャンル "${genre.title}" のサブカテゴリー "${genre.subcategoryId}" は正常です`,
          { courseId: course.id, genreId: genre.id, subcategoryName: genre.subcategoryId, mappedId: expectedSubcategoryId }
        )
      }

      // カテゴリーとサブカテゴリーの親子関係チェック（category.subcategoriesと照合）
      if (category && !category.subcategories.includes(genre.subcategoryId)) {
        this.addIssue('warning', 'Genre Category-Subcategory Relationship',
          `ジャンル "${genre.title}" のサブカテゴリー "${genre.subcategoryId}" がカテゴリー "${category.name}" の所属サブカテゴリーリストに含まれていません`,
          { 
            courseId: course.id, 
            genreId: genre.id, 
            categoryId: genre.categoryId,
            categoryName: category.name,
            subcategoryName: genre.subcategoryId,
            availableSubcategories: category.subcategories
          },
          `カテゴリーのサブカテゴリーリストに "${genre.subcategoryId}" を追加するか、適切なサブカテゴリーに変更してください`
        )
      }
    } else {
      this.addIssue('info', 'Genre Subcategory',
        `ジャンル "${genre.title}" はサブカテゴリーを指定していません（カテゴリーレベルのコンテンツ）`,
        { courseId: course.id, genreId: genre.id, categoryId: genre.categoryId }
      )
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
    
    // 問題詳細表示（エラーと警告のみ）
    const criticalIssues = this.report.issues.filter(issue => issue.severity === 'error' || issue.severity === 'warning')
    
    if (criticalIssues.length === 0) {
      console.log('🎉 重要な整合性問題は見つかりませんでした！')
    } else {
      console.log('⚠️  発見された問題:')
      // 重要度順に表示
      const sortedIssues = criticalIssues.sort((a, b) => {
        const severityOrder = { error: 0, warning: 1, info: 2 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      })
      
      for (const issue of sortedIssues) {
        const icon = issue.severity === 'error' ? '❌' : '⚠️'
        const severityLabel = issue.severity === 'error' ? 'エラー' : '警告'
        
        console.log(`${icon} [${severityLabel}] ${issue.category}`)
        console.log(`   問題: ${issue.issue}`)
        if (issue.recommendation) {
          console.log(`   推奨対応: ${issue.recommendation}`)
        }
        console.log()
      }
    }
    
    // 情報レベルのサマリー
    const infoIssues = this.report.issues.filter(issue => issue.severity === 'info')
    if (infoIssues.length > 0) {
      console.log(`ℹ️  ${infoIssues.length}件の正常な状態を確認しました。`)
      console.log()
    }
    
    console.log('═'.repeat(70))
    
    // 終了状態の決定
    if (errors > 0) {
      console.log('🔴 重大な整合性問題が見つかりました。対応が必要です。')
      process.exit(1)
    } else if (warnings > 0) {
      console.log('🟡 警告レベルの問題が見つかりました。確認を推奨します。')
    } else {
      console.log('🟢 整合性チェック完了！重要な問題は見つかりませんでした。')
    }
  }
}

// スクリプト実行
function main() {
  const checker = new CourseMasterConsistencyChecker()
  checker.run()
}

// 直接実行時のみ実行
if (require.main === module) {
  main()
}

export { CourseMasterConsistencyChecker }