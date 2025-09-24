#!/usr/bin/env tsx

/**
 * 静的データ保証スクリプト
 * DB接続に失敗した場合でも最低限のデプロイが可能になるよう、
 * 静的データファイルを生成・検証する
 */

import fs from 'fs'
import path from 'path'

// 最低限のフォールバックデータ定義
const FALLBACK_CATEGORIES = [
  {
    id: 'data_analysis',
    name: 'データ分析・統計',
    type: 'main',
    displayOrder: 1,
    subcategories: ['統計・データ分析', 'データ視覚化'],
    icon: '📊',
    color: '#3B82F6',
    isActive: true,
    isVisible: true,
    description: 'データ分析と統計の基礎'
  },
  {
    id: 'business_strategy',
    name: '戦略・企画',
    type: 'main', 
    displayOrder: 2,
    subcategories: ['事業戦略', '企画・マーケティング'],
    icon: '🎯',
    color: '#10B981',
    isActive: true,
    isVisible: true,
    description: '事業戦略と企画の基本'
  }
]

const FALLBACK_QUESTIONS = {
  questions: [
    {
      id: 1,
      category: 'data_analysis',
      question: '平均と中央値の違いを説明してください。',
      options: [
        '平均は全データの合計を個数で割った値、中央値は真ん中の値',
        '平均は最も頻繁に現れる値、中央値は全データの合計を個数で割った値',
        '平均と中央値は同じ意味',
        '平均は真ん中の値、中央値は最も頻繁に現れる値'
      ],
      correct: 0,
      explanation: '平均は算術平均で、中央値（メディアン）はデータを順番に並べたときの真ん中の値です。',
      difficulty: '基礎',
      timeLimit: 45
    },
    {
      id: 2,
      category: 'business_strategy',
      question: 'SWOT分析の4要素は何ですか？',
      options: [
        'Strengths, Weaknesses, Opportunities, Threats',
        'Sales, Workflow, Operations, Technology',
        'Strategy, Work, Organization, Team',
        'Success, Win, Opportunity, Target'
      ],
      correct: 0,
      explanation: 'SWOT分析は、Strengths（強み）、Weaknesses（弱み）、Opportunities（機会）、Threats（脅威）の4要素で分析します。',
      difficulty: '基礎',
      timeLimit: 45
    }
  ],
  lastUpdated: new Date().toISOString(),
  totalQuestions: 2,
  categories: ['data_analysis', 'business_strategy']
}

const FALLBACK_COURSES = {
  courses: [
    {
      id: 'data_analysis_basics',
      title: 'データ分析基礎',
      description: 'データ分析の基本を学ぶコース',
      category: 'data_analysis',
      level: 'beginner',
      estimatedHours: 2,
      isActive: true,
      genres: []
    },
    {
      id: 'business_strategy_basics',
      title: '戦略・企画基礎',
      description: 'ビジネス戦略の基本を学ぶコース',
      category: 'business_strategy',
      level: 'beginner',
      estimatedHours: 2,
      isActive: true,
      genres: []
    }
  ],
  totalCourses: 2,
  lastUpdated: new Date().toISOString()
}

class StaticDataEnsurer {
  private publicDir = path.join(process.cwd(), 'public')
  private dataDir = path.join(this.publicDir, 'data')
  private learningDataDir = path.join(this.publicDir, 'learning-data')

  /**
   * メイン実行
   */
  async run(): Promise<void> {
    console.log('📁 静的データ保証プロセス開始...')
    
    try {
      // ディレクトリ作成
      this.ensureDirectories()
      
      // 必須ファイル生成
      this.ensureQuestionsJson()
      this.ensureQuizStats()
      this.ensureCoursesJson()
      this.ensureCategoriesData()
      
      console.log('✅ 静的データ保証完了')
      console.log('📊 最低限のフォールバックデータが準備されました')
      
    } catch (error) {
      console.error('❌ 静的データ保証エラー:', error)
      throw error
    }
  }

  /**
   * 必要ディレクトリの作成
   */
  private ensureDirectories(): void {
    console.log('📂 ディレクトリ作成確認...')
    
    const dirs = [this.publicDir, this.dataDir, this.learningDataDir]
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        console.log(`  ✅ 作成: ${path.relative(process.cwd(), dir)}`)
      } else {
        console.log(`  ✅ 存在: ${path.relative(process.cwd(), dir)}`)
      }
    }
  }

  /**
   * questions.json 保証
   */
  private ensureQuestionsJson(): void {
    const questionsPath = path.join(this.publicDir, 'questions.json')
    
    if (!fs.existsSync(questionsPath)) {
      console.log('📝 questions.json を作成中...')
      fs.writeFileSync(questionsPath, JSON.stringify(FALLBACK_QUESTIONS, null, 2), 'utf-8')
      console.log('  ✅ フォールバック questions.json 作成完了')
    } else {
      // 既存ファイルの検証
      try {
        const existing = JSON.parse(fs.readFileSync(questionsPath, 'utf-8'))
        const questionCount = existing.questions?.length || 0
        
        if (questionCount === 0) {
          console.log('  ⚠️ 既存の questions.json にデータがありません - フォールバックで上書き')
          fs.writeFileSync(questionsPath, JSON.stringify(FALLBACK_QUESTIONS, null, 2), 'utf-8')
        } else {
          console.log(`  ✅ 既存 questions.json 確認 (${questionCount}問)`)
        }
      } catch (error) {
        console.log('  ❌ 既存の questions.json が破損 - フォールバックで復旧')
        fs.writeFileSync(questionsPath, JSON.stringify(FALLBACK_QUESTIONS, null, 2), 'utf-8')
      }
    }
  }

  /**
   * クイズ統計ファイル保証
   */
  private ensureQuizStats(): void {
    const statsPath = path.join(this.dataDir, 'quiz-stats-fallback.json')
    
    if (!fs.existsSync(statsPath)) {
      console.log('📊 quiz-stats-fallback.json を作成中...')
      
      const fallbackStats = {
        totalQuestions: FALLBACK_QUESTIONS.questions.length,
        categories: FALLBACK_CATEGORIES.map(cat => ({
          id: cat.id,
          name: cat.name,
          questionCount: FALLBACK_QUESTIONS.questions.filter(q => q.category === cat.id).length,
          averageDifficulty: 'basic',
          completionRate: 0
        })),
        lastUpdated: new Date().toISOString(),
        generatedBy: 'static-data-ensurer'
      }
      
      fs.writeFileSync(statsPath, JSON.stringify(fallbackStats, null, 2), 'utf-8')
      console.log('  ✅ フォールバック quiz-stats-fallback.json 作成完了')
    } else {
      console.log('  ✅ 既存 quiz-stats-fallback.json 確認')
    }
  }

  /**
   * courses.json 保証
   */
  private ensureCoursesJson(): void {
    const coursesPath = path.join(this.learningDataDir, 'courses.json')
    
    if (!fs.existsSync(coursesPath)) {
      console.log('📚 courses.json を作成中...')
      fs.writeFileSync(coursesPath, JSON.stringify(FALLBACK_COURSES, null, 2), 'utf-8')
      console.log('  ✅ フォールバック courses.json 作成完了')
    } else {
      try {
        const existing = JSON.parse(fs.readFileSync(coursesPath, 'utf-8'))
        const courseCount = existing.courses?.length || 0
        console.log(`  ✅ 既存 courses.json 確認 (${courseCount}コース)`)
      } catch (error) {
        console.log('  ❌ 既存の courses.json が破損 - フォールバックで復旧')
        fs.writeFileSync(coursesPath, JSON.stringify(FALLBACK_COURSES, null, 2), 'utf-8')
      }
    }
  }

  /**
   * カテゴリーデータ保証
   */
  private ensureCategoriesData(): void {
    const categoriesDataPath = path.join(this.dataDir, 'categories-fallback.json')
    
    if (!fs.existsSync(categoriesDataPath)) {
      console.log('📋 categories-fallback.json を作成中...')
      
      const fallbackCategoriesData = {
        mainCategories: FALLBACK_CATEGORIES.filter(cat => cat.type === 'main'),
        industryCategories: FALLBACK_CATEGORIES.filter(cat => cat.type === 'industry'),
        allCategories: FALLBACK_CATEGORIES,
        lastUpdated: new Date().toISOString(),
        generatedBy: 'static-data-ensurer'
      }
      
      fs.writeFileSync(categoriesDataPath, JSON.stringify(fallbackCategoriesData, null, 2), 'utf-8')
      console.log('  ✅ フォールバック categories-fallback.json 作成完了')
    } else {
      console.log('  ✅ 既存 categories-fallback.json 確認')
    }
  }
}

// 直接実行時のみ実行
if (require.main === module) {
  const ensurer = new StaticDataEnsurer()
  ensurer.run()
    .then(() => {
      console.log('\n🎉 静的データ保証プロセス完了！')
      console.log('📦 デプロイ準備が整いました')
      process.exit(0)
    })
    .catch(error => {
      console.error('\n❌ 静的データ保証失敗:', error)
      process.exit(1)
    })
}

export { StaticDataEnsurer }