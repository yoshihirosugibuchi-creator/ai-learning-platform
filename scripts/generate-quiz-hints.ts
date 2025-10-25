/**
 * クイズ問題ヒント自動生成スクリプト
 * 
 * 機能:
 * 1. quiz_questionsテーブルから全問題を取得
 * 2. 3段階ヒントを自動生成
 *    - Level 1: 用語・概念解説（問題理解のための基礎知識）
 *    - Level 2: アプローチ・思考方向（解決の方向性）
 *    - Level 3: 具体的解答ヒント（正解に近い手がかり）
 * 3. quiz_hintsテーブルに一括挿入
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// 環境変数を読み込み
config({ path: '.env.local' })

// Supabase管理者クライアントを直接作成
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

interface QuizQuestion {
  id: number
  question: string
  option1: string
  option2: string
  option3: string
  option4: string
  correct_answer: number
  explanation: string | null
  category_id: string
  subcategory_id: string | null
  difficulty: string | null
  source: string | null
}

interface GeneratedHint {
  question_id: number
  level1_hint: string
  level2_hint: string
  level3_hint: string
}

/**
 * 問題文から専門用語を抽出
 */
function extractTechnicalTerms(question: string): string[] {
  // カタカナ語（3文字以上）
  const katakanaTerms = question.match(/[ア-ヴー]{3,}/g) || []
  
  // 英語由来のカタカナ語（ハイフン含む）
  const hyphenatedTerms = question.match(/[ア-ヴー]+[-・][ア-ヴー]+/g) || []
  
  // 括弧内の用語
  const bracketedTerms = question.match(/[「『""]([^」』""]+)[」』""]/g)?.map(term => 
    term.replace(/[「『""]([^」』""]+)[」』""]/, '$1')
  ) || []
  
  // 英語表記
  const englishTerms = question.match(/[A-Z][A-Za-z]+/g) || []
  
  return [...new Set([...katakanaTerms, ...hyphenatedTerms, ...bracketedTerms, ...englishTerms])]
}

/**
 * Level 1ヒント生成：用語・概念解説
 */
function generateLevel1Hint(question: QuizQuestion): string {
  const terms = extractTechnicalTerms(question.question)
  
  // 用語解説のテンプレート
  const termExplanations: Record<string, string> = {
    // ビジネス・経営用語
    'スコープ・クリープ': 'プロジェクトの途中で当初の予定になかった作業や機能が追加されてしまう現象',
    'ステークホルダー': 'プロジェクトや組織に利害関係を持つ人々や団体',
    'ROI': 'Return on Investment（投資収益率）- 投資に対してどれだけの利益が得られたかを示す指標',
    'KPI': 'Key Performance Indicator（重要業績評価指標）- 目標達成度を測る重要な指標',
    'PDCA': 'Plan-Do-Check-Act の循環的な業務改善手法',
    'アジャイル': '短期間での開発サイクルを繰り返す柔軟な開発手法',
    'スクラム': 'アジャイル開発の代表的なフレームワークの一つ',
    
    // IT・技術用語
    'API': 'Application Programming Interface - ソフトウェア間でデータをやり取りするための仕組み',
    'クラウド': 'インターネット経由でサーバーやストレージなどのITリソースを利用するサービス',
    'ビッグデータ': '従来の手法では処理が困難な大容量・多様・高速なデータ',
    'IoT': 'Internet of Things - モノがインターネットに接続される仕組み',
    'AI': 'Artificial Intelligence（人工知能）- 人間の知的活動をコンピューターで模倣する技術',
    'DX': 'Digital Transformation - デジタル技術を活用した業務変革',
    
    // マーケティング用語
    'セグメンテーション': '市場を特定の基準で細分化すること',
    'ペルソナ': '商品・サービスの典型的なユーザー像を具体的に設定したもの',
    'コンバージョン': 'ウェブサイトの訪問者が商品購入や会員登録などの目標行動を取ること',
    'CRM': 'Customer Relationship Management - 顧客関係管理システム',
    
    // 財務・会計用語
    'キャッシュフロー': '現金の流入と流出の収支状況',
    'EBITDA': '税引前利益に減価償却費等を加えた収益性指標',
    'IRR': 'Internal Rate of Return（内部収益率）- 投資の収益性を示す指標',
    'NPV': 'Net Present Value（正味現在価値）- 将来キャッシュフローの現在価値',
  }
  
  // 最も重要そうな用語を選択
  const primaryTerm = terms.find(term => termExplanations[term])
  
  if (primaryTerm && termExplanations[primaryTerm]) {
    return `💡 重要用語：「${primaryTerm}」とは、${termExplanations[primaryTerm]}のことです。`
  }
  
  // 難易度別の一般的ヒント
  const difficulty = question.difficulty || 'intermediate'
  
  const generalHints = {
    basic: '💡 この問題は基本的な概念の理解を確認しています。問題文をよく読み、キーワードに注目してください。',
    intermediate: '💡 この問題では、実務での応用を意識して考えてみてください。理論と実践の結びつきがポイントです。',
    advanced: '💡 この問題は応用レベルです。複数の要素を組み合わせて、最適解を見つけることが重要です。',
    expert: '💡 この問題はエキスパートレベルです。専門知識と経験に基づいた深い理解が求められます。'
  }
  
  return generalHints[difficulty as keyof typeof generalHints] || generalHints.intermediate
}

/**
 * Level 2ヒント生成：アプローチ・思考方向
 */
function generateLevel2Hint(question: QuizQuestion): string {
  const questionText = question.question.toLowerCase()
  
  // 問題タイプ別のアプローチヒント
  if (questionText.includes('最も効果的') || questionText.includes('最適')) {
    return '🎯 この問題では、複数の選択肢の中から「最も効果的」なものを選ぶ必要があります。それぞれの選択肢の効果と実現可能性を比較してみてください。'
  }
  
  if (questionText.includes('問題') && questionText.includes('解決')) {
    return '🔧 問題解決のアプローチとして、まず問題の根本原因を特定し、次に実行可能な解決策を検討してみてください。'
  }
  
  if (questionText.includes('戦略') || questionText.includes('計画')) {
    return '📋 戦略的思考が必要です。短期的な効果だけでなく、長期的な影響も考慮して判断してみてください。'
  }
  
  if (questionText.includes('管理') || questionText.includes('マネジメント')) {
    return '👥 管理・マネジメントの観点では、人・プロセス・技術の3つの要素をバランスよく考慮することが重要です。'
  }
  
  if (questionText.includes('リスク')) {
    return '⚠️ リスク管理では、リスクの特定→評価→対策→監視のプロセスを意識して考えてみてください。'
  }
  
  if (questionText.includes('コスト') || questionText.includes('費用')) {
    return '💰 コスト分析では、初期費用だけでなく、運用費用や機会費用も含めて総合的に判断することが大切です。'
  }
  
  if (questionText.includes('品質')) {
    return '✨ 品質向上には、予防・検査・改善の3つのアプローチがあります。どの段階での対策が最も効果的か考えてみてください。'
  }
  
  // デフォルトのアプローチヒント
  const category = question.category_id
  
  const categoryHints: Record<string, string> = {
    business_strategy: '📈 ビジネス戦略では、市場環境・競合状況・自社の強みを総合的に分析することが重要です。',
    project_management: '📊 プロジェクト管理では、スコープ・時間・コスト・品質のバランスを考慮してください。',
    marketing: '🎯 マーケティングでは、顧客のニーズと行動パターンを理解することから始めてください。',
    technology: '💻 技術的な問題では、現在の技術トレンドと将来の発展性を考慮することが大切です。',
    finance: '📊 財務分析では、数値だけでなく、その背景にあるビジネス要因も考慮してください。',
    human_resources: '👥 人事・組織の問題では、個人のモチベーションと組織全体の目標の整合性を考えてみてください。'
  }
  
  return categoryHints[category] || '🤔 この問題の核心は何かを見極め、論理的に選択肢を絞り込んでいきましょう。'
}

/**
 * Level 3ヒント生成：具体的解答ヒント
 */
function generateLevel3Hint(question: QuizQuestion): string {
  const options = [question.option1, question.option2, question.option3, question.option4]
  const correctAnswer = question.correct_answer
  const correctOption = options[correctAnswer - 1]
  
  // null/undefined チェックを追加
  if (!correctOption) {
    return `🎯 正解は${correctAnswer}番の選択肢です。この選択肢をよく確認してみてください。`
  }
  
  // 正解の選択肢から特徴的なキーワードを抽出
  const correctKeywords = correctOption.match(/[ァ-ヶー]+|[a-zA-Z]+|[一-龯]+/g) || []
  const keyKeywords = correctKeywords.filter(word => word.length >= 2)
  
  // 説明文がある場合はそこからもヒントを抽出
  let explanationHint = ''
  if (question.explanation) {
    const explanationWords = question.explanation.substring(0, 100) // 最初の100文字
    explanationHint = ` 説明によると、${explanationWords}...という要素が重要です。`
  }
  
  // 問題タイプ別の具体的ヒント
  const questionText = question.question.toLowerCase()
  
  if (questionText.includes('優先') || questionText.includes('重要')) {
    return `⭐ 最も優先すべき要素は何かを考えてください。正解は「${keyKeywords.slice(0, 2).join('、')}」に関連する選択肢です。${explanationHint}`
  }
  
  if (questionText.includes('手法') || questionText.includes('方法')) {
    return `🔧 効果的な手法・方法を選ぶ問題です。「${keyKeywords.slice(0, 2).join('、')}」がポイントになります。${explanationHint}`
  }
  
  if (questionText.includes('原因') || questionText.includes('要因')) {
    return `🔍 根本的な原因・要因を特定する問題です。「${keyKeywords.slice(0, 2).join('、')}」に注目してください。${explanationHint}`
  }
  
  // デフォルトの具体的ヒント
  if (keyKeywords.length >= 2) {
    return `🎯 正解のポイントは「${keyKeywords.slice(0, 2).join('」と「')}」です。これらの要素を含む選択肢を探してください。${explanationHint}`
  }
  
  return `🎯 正解は${correctAnswer}番の選択肢です。この選択肢の特徴をよく観察してみてください。${explanationHint}`
}

/**
 * 全問題のヒントを生成
 */
async function generateHintsForAllQuestions(): Promise<GeneratedHint[]> {
  console.log('🔍 Fetching all quiz questions...')
  
  const { data: questions, error } = await supabaseAdmin
    .from('quiz_questions')
    .select('*')
    .eq('is_deleted', false)
    .order('id')
  
  if (error) {
    throw new Error(`Failed to fetch questions: ${error.message}`)
  }
  
  if (!questions || questions.length === 0) {
    throw new Error('No questions found')
  }
  
  console.log(`📝 Found ${questions.length} questions. Generating hints...`)
  
  const generatedHints: GeneratedHint[] = []
  
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i] as QuizQuestion
    
    console.log(`⏳ Processing question ${i + 1}/${questions.length}: ${question.question.substring(0, 50)}...`)
    
    try {
      const hint: GeneratedHint = {
        question_id: question.id,
        level1_hint: generateLevel1Hint(question),
        level2_hint: generateLevel2Hint(question),
        level3_hint: generateLevel3Hint(question)
      }
      
      generatedHints.push(hint)
      
      // 進捗表示
      if ((i + 1) % 50 === 0) {
        console.log(`✅ Generated hints for ${i + 1} questions`)
      }
      
    } catch (error) {
      console.error(`❌ Error generating hints for question ${question.id}:`, error)
      // エラーが発生した問題はスキップして続行
      continue
    }
  }
  
  console.log(`✅ Successfully generated hints for ${generatedHints.length} questions`)
  return generatedHints
}

/**
 * 生成されたヒントをデータベースに挿入
 */
async function insertHintsToDatabase(hints: GeneratedHint[]): Promise<void> {
  console.log(`💾 Inserting ${hints.length} hints to database...`)
  
  // バッチサイズ（一度に挿入する件数）
  const batchSize = 50
  let insertedCount = 0
  
  for (let i = 0; i < hints.length; i += batchSize) {
    const batch = hints.slice(i, i + batchSize)
    
    try {
      const { error } = await supabaseAdmin
        .from('quiz_hints')
        .insert(batch)
      
      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error)
        throw error
      }
      
      insertedCount += batch.length
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(hints.length / batchSize)} (${insertedCount}/${hints.length} hints)`)
      
      // バッチ間で少し待機（データベースへの負荷軽減）
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`❌ Failed to insert batch ${Math.floor(i / batchSize) + 1}:`, error)
      throw error
    }
  }
  
  console.log(`✅ Successfully inserted all ${insertedCount} hints to database`)
}

/**
 * 結果の検証
 */
async function verifyResults(): Promise<void> {
  console.log('🔍 Verifying insertion results...')
  
  // 挿入されたヒント数を確認
  const { count, error: countError } = await supabaseAdmin
    .from('quiz_hints')
    .select('*', { count: 'exact', head: true })
  
  if (countError) {
    throw new Error(`Failed to count hints: ${countError.message}`)
  }
  
  console.log(`📊 Total hints in database: ${count}`)
  
  // サンプルデータを確認
  const { data: sample, error: sampleError } = await supabaseAdmin
    .from('quiz_hints')
    .select('question_id, level1_hint, level2_hint, level3_hint')
    .limit(3)
  
  if (sampleError) {
    throw new Error(`Failed to fetch sample: ${sampleError.message}`)
  }
  
  console.log('📋 Sample hints:')
  sample?.forEach((hint, index) => {
    console.log(`\n${index + 1}. Question ID: ${hint.question_id}`)
    console.log(`   Level 1: ${hint.level1_hint.substring(0, 80)}...`)
    console.log(`   Level 2: ${hint.level2_hint.substring(0, 80)}...`)
    console.log(`   Level 3: ${hint.level3_hint.substring(0, 80)}...`)
  })
}

/**
 * メイン実行関数
 */
async function main() {
  try {
    console.log('🚀 Starting quiz hints generation process...')
    console.log('=' .repeat(60))
    
    const startTime = Date.now()
    
    // 1. 全問題のヒントを生成
    const hints = await generateHintsForAllQuestions()
    
    // 2. データベースに挿入
    await insertHintsToDatabase(hints)
    
    // 3. 結果を検証
    await verifyResults()
    
    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000
    
    console.log('\n🎉 Quiz hints generation completed successfully!')
    console.log(`⏱️  Total execution time: ${duration.toFixed(2)} seconds`)
    console.log(`📝 Generated hints for ${hints.length} questions`)
    console.log('=' .repeat(60))
    
  } catch (error) {
    console.error('💥 Error in quiz hints generation:', error)
    process.exit(1)
  }
}

// CLI実行時はmain()を実行
if (require.main === module) {
  main()
}

export { generateHintsForAllQuestions, insertHintsToDatabase, verifyResults }