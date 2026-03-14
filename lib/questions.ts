import { Question } from './types'
import { globalCache } from './performance-optimizer'
import type { Database as WMDatabase } from '@nozbe/watermelondb'

// DB API使用版 - JSONフォールバック付き
// database引数: null=PC（サーバー直接）、Database=モバイル（ローカルDB優先）
export async function getAllQuestions(database?: WMDatabase | null): Promise<Question[]> {
  // モバイル: ローカルDB優先
  if (database) {
    try {
      const { getAllQuestionsLocal } = await import('./offline/queries/questions')
      return await getAllQuestionsLocal(database)
    } catch (e) {
      console.warn('⚠️ Local questions load failed, falling back to server:', e)
    }
  }

  const cacheKey = 'all_questions_db'

  // キャッシュチェック（5分間）
  const cached = globalCache.get(cacheKey)
  if (cached) {
    console.log('🚀 Questions loaded from cache')
    return cached as Question[]
  }

  try {
    console.log('📡 Fetching questions from DB API')
    const response = await fetch('/api/questions')

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }

    const data = await response.json()
    const questions = data.questions || []

    // キャッシュに保存（5分間）
    globalCache.set(cacheKey, questions, 5 * 60 * 1000)

    console.log(`✅ Questions loaded from DB: ${questions.length} questions`)
    return questions

  } catch (error) {
    console.error('❌ Error loading questions from DB:', error)
    console.log('🔄 Falling back to JSON file...')

    // JSONフォールバック
    return await loadQuestionsFromJSON()
  }
}

// JSONファイルからの問題読み込み（フォールバック用）
async function loadQuestionsFromJSON(): Promise<Question[]> {
  try {
    console.log('📄 Loading questions from JSON fallback')
    const response = await fetch('/questions.json')
    
    if (!response.ok) {
      throw new Error(`JSON file request failed: ${response.status}`)
    }
    
    const data = await response.json()
    const questions = data.questions || []
    
    console.log(`✅ Questions loaded from JSON: ${questions.length} questions`)
    return questions
    
  } catch (error) {
    console.error('❌ Error loading questions from JSON:', error)
    console.log('🔄 Falling back to static emergency questions...')
    
    // 最終的な静的フォールバック（実際のクイズデータから10問）
    return getStaticEmergencyQuestions()
  }
}

/**
 * 緊急時の静的問題（questions.jsonの最初の10問をベース）
 * DB/JSONフォールバックが両方失敗した場合の最後の手段
 * 10問でクイズセッションが完了するため、10問分を用意
 */
function getStaticEmergencyQuestions(): Question[] {
  return [
    {
      id: 1,
      category: "finance",
      subcategory: "財務分析・企業価値評価",
      subcategory_id: "financial_analysis_valuation",
      question: "ROE（自己資本利益率）が15%の企業について、最も適切な解釈は？",
      options: [
        "売上高が業界平均より高い",
        "従業員数が適正規模である", 
        "設立年数が長く安定している",
        "自己資本を効率的に活用して利益を創出している"
      ],
      correct: 3,
      explanation: "ROE = 当期純利益 ÷ 自己資本 × 100で計算されます。15%は一般的に良好な数値で、投下した自己資本に対して効率的に利益を生み出していることを示しています。",
      difficulty: "intermediate",
      timeLimit: 45,
      relatedTopics: ["ROA", "財務レバレッジ", "収益性分析"],
      source: "日本公認会計士協会 財務分析ガイドライン",
      deleted: false
    },
    {
      id: 2,
      category: "strategy_management", 
      subcategory: "競争戦略・フレームワーク",
      subcategory_id: "competitive_strategy_frameworks",
      question: "3C分析のフレームワークを構成する3つの要素として正しい組み合わせは？",
      options: [
        "Customer（顧客）、Competitor（競合）、Company（自社）",
        "Cost（コスト）、Channel（チャネル）、Campaign（キャンペーン）",
        "Culture（文化）、Climate（環境）、Capacity（能力）",
        "Capital（資本）、Communication（伝達）、Control（統制）"
      ],
      correct: 0,
      explanation: "3C分析は、Customer（顧客）、Competitor（競合）、Company（自社）の3つの視点から事業環境を分析する代表的な戦略フレームワークです。顧客ニーズ、競合状況、自社の強みを包括的に分析することで効果的な戦略立案が可能になります。",
      difficulty: "basic",
      timeLimit: 30,
      relatedTopics: ["SWOT分析", "5Forces", "戦略立案"],
      source: "マッキンゼー戦略フレームワーク集",
      deleted: false
    },
    {
      id: 3,
      category: "strategy_management",
      subcategory: "category_level", 
      subcategory_id: "category_level",
      question: "顧客生涯価値（LTV）を向上させる最も効果的な施策の組み合わせは？",
      options: [
        "新規顧客獲得のみに注力",
        "広告費の大幅削減",
        "客単価向上と継続率向上の両方",
        "商品価格の値下げ"
      ],
      correct: 2,
      explanation: "LTV = 客単価 × 購買頻度 × 継続期間で算出されます。客単価と継続率の向上により、既存顧客からの収益を最大化できます。",
      difficulty: "intermediate",
      timeLimit: 40,
      relatedTopics: ["CAC", "チャーンレート", "リテンション戦略"],
      source: "デジタルマーケティング実践ガイド",
      deleted: false
    },
    {
      id: 4,
      category: "communication_presentation",
      subcategory: "資料作成・可視化技術",
      subcategory_id: "document_visualization_tech", 
      question: "プロジェクトで発生した予期しない技術的課題への最適な対応は？",
      options: [
        "スケジュール調整と代替案検討",
        "課題を無視して進行",
        "プロジェクト即座中止", 
        "担当者のみで解決"
      ],
      correct: 0,
      explanation: "技術的課題が発生した場合、まず影響度を評価し、スケジュール調整や代替案を検討することが重要です。ステークホルダーとの早期共有も必要です。",
      difficulty: "intermediate",
      timeLimit: 50,
      relatedTopics: ["リスクアセスメント", "ステークホルダー管理", "変更管理"],
      source: "PMI プロジェクト管理標準",
      deleted: false
    },
    {
      id: 5,
      category: "leadership_hr",
      subcategory: "チームマネジメント・モチベーション",
      subcategory_id: "team_management_motivation",
      question: "相関係数0.8が示す関係性について正しいのは？",
      options: [
        "強い正の相関",
        "弱い正の相関",
        "因果関係が確定",
        "データに誤りがある"
      ],
      correct: 0,
      explanation: "相関係数0.8は強い正の相関を示します（一般的に0.7以上が強い相関）。相関関係とは2種類のデータの関係性を示すもので、因果関係は異なることに注意が必要です。",
      difficulty: "intermediate", 
      timeLimit: 35,
      relatedTopics: ["回帰分析", "統計的有意性", "データ解釈"],
      source: "統計学実践ハンドブック",
      deleted: false
    },
    {
      id: 6,
      category: "finance",
      subcategory: "投資判断・リスク管理",
      subcategory_id: "investment_risk_management",
      question: "チームのモチベーション向上に最も効果的なアプローチは？",
      options: [
        "報酬額の大幅増額のみ",
        "目標設定と成長機会の提供", 
        "監視体制の強化",
        "競争環境の徹底"
      ],
      correct: 1,
      explanation: "内発的動機を高める目標設定と成長機会の提供が、持続的なモチベーション向上に最も効果的です。単純な金銭的報酬だけでは長期的な効果は限定的です。",
      difficulty: "intermediate",
      timeLimit: 40,
      relatedTopics: ["動機理論", "目標設定理論", "チームビルディング"],
      source: "ハーバードビジネスレビュー リーダーシップ論集",
      deleted: false
    },
    {
      id: 7,
      category: "project_operations",
      subcategory: "プロジェクト設計・WBS",
      subcategory_id: "project_design_wbs",
      question: "デザイン思考のプロセスで最初に行うべきステップは？",
      options: [
        "プロトタイプの作成",
        "ユーザーニーズの共感的理解",
        "アイデアの発散思考",
        "市場分析とベンチマーク"
      ],
      correct: 1,
      explanation: "デザイン思考では「共感（Empathize）」が最初のステップです。ユーザーの視点に立ち、真のニーズや課題を深く理解することから始まります。",
      difficulty: "basic",
      timeLimit: 35,
      relatedTopics: ["人間中心設計", "ユーザーリサーチ", "ペルソナ設計"],
      source: "スタンフォード大学 d.school デザイン思考ガイド",
      deleted: false
    },
    {
      id: 8,
      category: "marketing_sales",
      subcategory: "顧客分析・セグメンテーション",
      subcategory_id: "customer_analysis_segmentation",
      question: "企業のデジタル変革（DX）を成功させるための最重要要素は？",
      options: [
        "最新技術の全面導入",
        "IT予算の大幅増額",
        "外部コンサルタントへの委託",
        "組織文化とマインドセットの変革"
      ],
      correct: 3,
      explanation: "DXの成功には技術導入以上に、組織全体のマインドセット変革と変化を受け入れる文化の醸成が不可欠です。人的要素が最も重要な成功要因となります。",
      difficulty: "intermediate",
      timeLimit: 45,
      relatedTopics: ["変更管理", "組織開発", "デジタルリテラシー"],
      source: "経済産業省 DXレポート2.0",
      deleted: false
    },
    {
      id: 9,
      category: "finance",
      subcategory: "管理会計・KPI設計",
      subcategory_id: "management_accounting_kpi",
      question: "ESG経営において「E（環境）」「S（社会）」「G（ガバナンス）」のバランスを取る際の基本的な考え方は？",
      options: [
        "環境要素を最優先に考慮する",
        "短期的利益を重視してバランスを調整",
        "法的要求事項のみに対応する",
        "ステークホルダーの期待に応じて統合的に推進"
      ],
      correct: 3,
      explanation: "ESG経営では、投資家、従業員、顧客、地域社会などの多様なステークホルダーの期待を理解し、E・S・Gの各要素を統合的に推進することが重要です。",
      difficulty: "advanced",
      timeLimit: 50,
      relatedTopics: ["ステークホルダー資本主義", "SDGs", "統合報告書"],
      source: "日本取引所グループ ESG情報開示実践ハンドブック",
      deleted: false
    },
    {
      id: 10,
      category: "communication_presentation",
      subcategory: "会議運営・ファシリテーション",
      subcategory_id: "meeting_facilitation",
      question: "アジャイル組織の特徴として最も適切でないものは？",
      options: [
        "階層的な意思決定構造の維持",
        "迅速な意思決定と実行力",
        "顧客価値創造への集中",
        "学習と適応の文化"
      ],
      correct: 0,
      explanation: "アジャイル組織では階層的な意思決定構造ではなく、権限委譲と分散型の意思決定が重視されます。迅速性と柔軟性を確保するため、フラットな組織構造が基本となります。",
      difficulty: "intermediate",
      timeLimit: 40,
      relatedTopics: ["権限委譲", "自律型チーム", "スクラム経営"],
      source: "ハーバードビジネスレビュー アジャイル組織論",
      deleted: false
    }
  ]
}

// カテゴリー別問題取得（オーバーロード対応）
export function getQuestionsByCategory(questions: Question[], category: string): Question[]
export function getQuestionsByCategory(category: string, limit?: number): Promise<Question[]>
export function getQuestionsByCategory(questionsOrCategory: Question[] | string, categoryOrLimit?: string | number): Question[] | Promise<Question[]> {
  // 既存のシグネチャ: getQuestionsByCategory(questions, category)
  if (Array.isArray(questionsOrCategory)) {
    const questions = questionsOrCategory
    const category = categoryOrLimit as string
    return questions.filter(q => q.category === category && !q.deleted)
  }
  
  // 新しいシグネチャ: getQuestionsByCategory(category, limit) - DB API使用
  return getQuestionsByCategoryFromDB(questionsOrCategory as string, categoryOrLimit as number)
}

// DB API版のカテゴリー別問題取得（内部関数）
async function getQuestionsByCategoryFromDB(category: string, limit: number = 1000): Promise<Question[]> {
  try {
    console.log(`📡 Fetching questions for category: ${category}`)
    const response = await fetch(`/api/questions?category=${encodeURIComponent(category)}&limit=${limit}`)
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    return data.questions || []
    
  } catch (error) {
    console.error(`❌ Error loading questions for category ${category}:`, error)
    console.log('🔄 Falling back to JSON for category filtering...')
    // フォールバック: JSONから全問題取得してフィルター
    const allQuestions = await loadQuestionsFromJSON()
    return allQuestions.filter(q => q.category === category && !q.deleted).slice(0, limit)
  }
}

// Fisher-Yates Shuffle実装（真のランダム化）
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// ランダム問題取得（オーバーロード対応）
export function getRandomQuestions(questions: Question[], count?: number): Question[]
export function getRandomQuestions(count?: number): Promise<Question[]>
export function getRandomQuestions(questionsOrCount?: Question[] | number, count?: number): Question[] | Promise<Question[]> {
  // 既存のシグネチャ: getRandomQuestions(questions, count)
  if (Array.isArray(questionsOrCount)) {
    const questions = questionsOrCount
    const finalCount = count || 10
    const activeQuestions = questions.filter(q => !q.deleted)
    const shuffled = fisherYatesShuffle(activeQuestions)
    return shuffled.slice(0, finalCount)
  }
  
  // 新しいシグネチャ: getRandomQuestions(count) - DB API使用
  return getRandomQuestionsFromDB(questionsOrCount || 10)
}

// DB API版のランダム問題取得（内部関数）
async function getRandomQuestionsFromDB(count: number = 10): Promise<Question[]> {
  try {
    console.log(`📡 Fetching ${count} random questions from DB`)
    const response = await fetch(`/api/questions?limit=${count}&random=true`)
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    return data.questions || []
    
  } catch (error) {
    console.error('❌ Error loading random questions from DB:', error)
    console.log('🔄 Falling back to JSON for random selection...')
    // フォールバック: JSONから全問題取得してランダム選択
    const allQuestions = await loadQuestionsFromJSON()
    const activeQuestions = allQuestions.filter(q => !q.deleted)
    const shuffled = [...activeQuestions].sort(() => 0.5 - Math.random())
    return shuffled.slice(0, count)
  }
}

// ID指定問題取得（従来互換）
export function getQuestionById(questions: Question[], id: number): Question | undefined {
  return questions.find(q => q.id === id && !q.deleted)
}

// カテゴリー一覧取得（オーバーロード対応）
export function getCategories(questions: Question[]): string[]
export function getCategories(): Promise<string[]>
export function getCategories(questions?: Question[]): string[] | Promise<string[]> {
  // 既存のシグネチャ: getCategories(questions)
  if (questions) {
    const activeQuestions = questions.filter(q => !q.deleted)
    return Array.from(new Set(activeQuestions.map(q => q.category)))
  }
  
  // 新しいシグネチャ: getCategories() - 統計API使用
  return getCategoriesFromAPI()
}

// API版のカテゴリー一覧取得（内部関数）
async function getCategoriesFromAPI(): Promise<string[]> {
  try {
    console.log('📡 Fetching categories from stats API')
    const response = await fetch('/api/questions/stats')
    
    if (!response.ok) {
      throw new Error(`Stats API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    return Object.keys(data.categories || {})
    
  } catch (error) {
    console.error('❌ Error loading categories:', error)
    console.log('🔄 Falling back to JSON for categories...')
    // フォールバック: JSONから全問題取得してカテゴリー抽出
    const allQuestions = await loadQuestionsFromJSON()
    const activeQuestions = allQuestions.filter(q => !q.deleted)
    return Array.from(new Set(activeQuestions.map(q => q.category)))
  }
}

// 統計情報取得（新機能）
export async function getQuestionStats() {
  try {
    const response = await fetch('/api/questions/stats')
    if (!response.ok) {
      throw new Error(`Stats API request failed: ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error('❌ Error loading question stats:', error)
    return {
      total: 0,
      categories: {},
      difficulties: {},
      topSubcategories: {}
    }
  }
}

// 後方互換性のための関数（既存コードで使用されている場合）
export function getQuestionsByCategoryLegacy(questions: Question[], category: string): Question[] {
  return questions.filter(q => q.category === category && !q.deleted)
}

export function getRandomQuestionsLegacy(questions: Question[], count: number = 10): Question[] {
  const activeQuestions = questions.filter(q => !q.deleted)
  const shuffled = fisherYatesShuffle(activeQuestions)
  return shuffled.slice(0, count)
}