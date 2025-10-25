/**
 * 改善されたクイズ問題ヒント生成スクリプト
 * 
 * 改善内容:
 * 1. Level 1: 実際の技術用語・概念の具体的解説（汎用表現排除）
 * 2. Level 2: 問題固有の解法アプローチ（抽象的表現排除）
 * 3. Level 3: 正解番号を隠した方向性ヒント（答え露出防止）
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

interface ImprovedHint {
  question_id: number
  level1_hint: string
  level2_hint: string
  level3_hint: string
}

/**
 * 拡張技術用語辞書（実際の問題文を分析した結果に基づく）
 */
const technicalTerms: Record<string, string> = {
  // 基本ビジネス用語
  'ROE': '自己資本利益率。企業が株主から預かった資本をどれだけ効率的に使って利益を上げているかを示す指標',
  '3C': 'Customer（顧客）、Competitor（競合）、Company（自社）の3つの視点から事業環境を分析するフレームワーク',
  'LTV': '顧客生涯価値。一人の顧客が企業との取引期間全体を通じて生み出す利益の総額',
  'DCF': 'Discounted Cash Flow。将来のキャッシュフローを現在価値に割り引いて企業価値を算定する手法',
  
  // 統計・データ分析
  '相関係数': '2つの変数間の関係の強さを-1から1の数値で表す指標。0.8は強い正の相関を示す',
  
  // 組織・マネジメント
  'アジャイル': '変化に迅速に対応するため、短いサイクルで計画・実行・評価を繰り返す組織運営手法',
  'エンゲージメント': '従業員が組織に対して感じる心理的なつながりや貢献意欲の度合い',
  'リーンスタートアップ': '最小限の製品で仮説検証を繰り返し、効率的に事業を成長させる手法',
  
  // ESG・ガバナンス
  'ESG': 'Environment（環境）、Social（社会）、Governance（ガバナンス）の3つの観点から企業を評価する指標',
  'ガバナンス': '企業経営において、適切な意思決定と監督が行われる仕組み',
  
  // 経営戦略
  'Win-Win': '交渉や取引において、関係する全ての当事者が利益を得られる状況',
  'ブラックスワン': '発生確率は低いが、起きると甚大な影響を与える予測困難な出来事',
  'ピラミッドストラクチャー': '論理的思考において、結論を頂点として根拠を階層的に整理する構造',
  'MECE': 'Mutually Exclusive and Collectively Exhaustive。漏れなく重複なく分類する原則',
  
  // その他
  'サプライチェーン': '原材料調達から製造、販売までの一連の供給網',
  'レジリエンス': '困難な状況に直面した時の回復力や適応力',
  'DX': 'デジタルトランスフォーメーション。デジタル技術を活用して業務プロセスや事業モデルを変革すること'
}

/**
 * 問題文から技術用語を抽出して説明を生成
 */
function generateLevel1TechnicalHint(question: QuizQuestion): string {
  const questionText = question.question
  
  // 技術用語の直接マッチング
  for (const [term, explanation] of Object.entries(technicalTerms)) {
    if (questionText.includes(term)) {
      return `💡 重要用語「${term}」：${explanation}`
    }
  }
  
  // パターンマッチングによる用語抽出
  // ROE、3Cなどの英語略語
  const acronymMatch = questionText.match(/[A-Z]{2,5}(?=[（\(]|が|の|を|は|について)/g)
  if (acronymMatch) {
    const acronym = acronymMatch[0]
    if (technicalTerms[acronym]) {
      return `💡 重要用語「${acronym}」：${technicalTerms[acronym]}`
    }
  }
  
  // カタカナ専門用語（3文字以上）
  const katakanaMatch = questionText.match(/[ア-ヴー]{3,}(?=の|を|は|が|について|分析|手法|原則)/g)
  if (katakanaMatch) {
    const term = katakanaMatch[0]
    if (technicalTerms[term]) {
      return `💡 重要用語「${term}」：${technicalTerms[term]}`
    }
  }
  
  // カテゴリ別の基礎概念説明
  const categoryHints: Record<string, string> = {
    'finance': '💡 財務分析では、数値の意味を正しく理解することが重要です。指標が何を測定しているかを考えてみてください。',
    'strategy': '💡 戦略的思考では、複数の視点から状況を分析することが重要です。フレームワークの構成要素を思い出してみてください。',
    'marketing': '💡 マーケティングでは、顧客価値を中心に考えることが重要です。顧客との関係性に注目してみてください。',
    'management': '💡 組織運営では、人と仕組みの両方が重要です。効果的なマネジメント手法の特徴を考えてみてください。',
    'technology': '💡 技術的課題では、プロセスとアプローチが重要です。どのような手順で進めるべきか考えてみてください。'
  }
  
  return categoryHints[question.category_id] || '💡 この問題のキーワードに含まれる専門用語の意味を正確に理解することが解答の鍵です。'
}

/**
 * 問題固有の解法アプローチヒントを生成
 */
function generateLevel2SpecificHint(question: QuizQuestion): string {
  const questionText = question.question.toLowerCase()
  
  // 問題タイプ別の具体的アプローチ
  if (questionText.includes('最も効果的') || questionText.includes('最適')) {
    return `🎯 複数の選択肢を比較する問題です。短期効果だけでなく、長期的な影響と実現可能性を総合的に評価してください。`
  }
  
  if (questionText.includes('適切でない') || questionText.includes('誤っている')) {
    return `⚠️ 「適切でない」ものを選ぶ問題です。他の選択肢が正しい理由を確認し、明らかに異なる要素を含む選択肢を見つけてください。`
  }
  
  if (questionText.includes('組み合わせ') || questionText.includes('要素')) {
    return `🔍 構成要素を問う問題です。フレームワークや理論の基本的な構造を思い出し、必須要素が含まれているかチェックしてください。`
  }
  
  if (questionText.includes('計算') || questionText.includes('算出') || questionText.includes('%')) {
    return `📊 数値計算問題です。式の意味を理解し、与えられた条件から何を求めるべきかを明確にしてから計算してください。`
  }
  
  if (questionText.includes('対応') || questionText.includes('対処')) {
    return `🔧 課題解決問題です。問題の根本原因を特定し、最も直接的かつ効果的な解決策を選んでください。`
  }
  
  if (questionText.includes('向上') || questionText.includes('改善')) {
    return `📈 改善策を問う問題です。現状の課題を正しく把握し、最も直接的に改善効果をもたらす施策を選んでください。`
  }
  
  if (questionText.includes('重要') || questionText.includes('重視')) {
    return `⭐ 優先順位を問う問題です。理想的な状況よりも、実際のビジネス現場で最も重視されるべき要素を考えてください。`
  }
  
  if (questionText.includes('特徴') || questionText.includes('原則')) {
    return `🏗️ 基本概念を問う問題です。その理論や手法の核となる特徴を思い出し、他の概念との違いを明確にしてください。`
  }
  
  // カテゴリ別の詳細アプローチ
  const categoryApproaches: Record<string, string> = {
    'finance': '💰 財務問題では、計算式の構成要素と、その数値が示すビジネス上の意味の両方を理解することが重要です。',
    'strategy': '🎯 戦略問題では、内部環境と外部環境の両方を考慮し、持続可能な競争優位性を生み出す要素を重視してください。',
    'marketing': '👥 マーケティング問題では、顧客視点での価値創造と、企業の収益性のバランスを考えてください。',
    'management': '⚖️ マネジメント問題では、短期的な成果と長期的な組織発展の両方を考慮した選択肢を評価してください。',
    'technology': '🔧 技術問題では、技術的な実現可能性とビジネス価値の両方を総合的に判断してください。'
  }
  
  return categoryApproaches[question.category_id] || '🤔 問題の文脈と選択肢の関係性を整理し、最も論理的な根拠を持つ選択肢を選んでください。'
}

/**
 * 正解番号を露出しない方向性ヒントを生成
 */
function generateLevel3DirectionalHint(question: QuizQuestion): string {
  const options = [question.option1, question.option2, question.option3, question.option4]
  const correctAnswer = question.correct_answer
  const correctOption = options[correctAnswer - 1]
  
  if (!correctOption) {
    return `🎯 正解の選択肢は、問題で求められている条件を最も適切に満たすものです。各選択肢を再度検討してください。`
  }
  
  // 正解選択肢の特徴的キーワードを抽出（答えを直接露出しない）
  const significantWords = correctOption
    .match(/[ア-ヴー]{2,}|[一-龯]{2,}|[A-Za-z]{3,}/g) || []
  
  // 最も特徴的だが答えを明かさない範囲でヒント作成
  const questionText = question.question.toLowerCase()
  
  if (questionText.includes('適切でない') || questionText.includes('誤っている')) {
    return `❌ 他の選択肢と明らかに異なる要素や、一般的な原則に反する内容を含む選択肢に注目してください。`
  }
  
  if (questionText.includes('最も効果的') || questionText.includes('最適')) {
    return `🎯 最も包括的で実践的な解決策を提示している選択肢を探してください。理論だけでなく実行可能性も重要です。`
  }
  
  if (questionText.includes('最初') || questionText.includes('第一')) {
    return `1️⃣ プロセスの最初に行うべき基本的なステップに注目してください。後続の作業の基盤となる活動が正解です。`
  }
  
  if (questionText.includes('重要') || questionText.includes('重視')) {
    return `⭐ 理論的な理想よりも、実際のビジネス現場で最も重視される現実的な要素を含む選択肢を探してください。`
  }
  
  if (questionText.includes('原則') || questionText.includes('基本')) {
    return `🏗️ その理論・手法の最も基本的で核となる原則を表現している選択肢を選んでください。`
  }
  
  // 説明文がある場合はそこからヒント抽出
  if (question.explanation && question.explanation.length > 50) {
    const explanationKeywords = question.explanation.substring(0, 150)
      .match(/[ア-ヴー]{2,}|[一-龯]{2,}/g) || []
    
    if (explanationKeywords.length > 0) {
      const hintKeyword = explanationKeywords[0]
      return `💡 解説で重要とされる「${hintKeyword}」に関連する概念を含む選択肢に注目してください。`
    }
  }
  
  // カテゴリ別の方向性ヒント
  const categoryDirections: Record<string, string> = {
    'finance': '💰 数値の背景にあるビジネス上の意味や、財務健全性に最も直結する要素を重視してください。',
    'strategy': '🎯 競合他社との差別化や持続可能な競争優位性につながる要素を含む選択肢を探してください。',
    'marketing': '👥 顧客価値の創造と企業の長期的収益性の両方を実現する施策を選んでください。',
    'management': '⚖️ 組織全体の生産性と従業員のモチベーション向上の両方を考慮した選択肢を選んでください。',
    'technology': '🔧 技術的実現可能性とビジネス価値の創出を両立する選択肢に注目してください。'
  }
  
  return categoryDirections[question.category_id] || '🎯 問題の核心的な要求を最も直接的に満たす選択肢を選んでください。各選択肢の実質的な内容を比較検討してみてください。'
}

/**
 * 改善されたヒント生成メイン関数
 */
function generateImprovedHint(question: QuizQuestion): ImprovedHint {
  return {
    question_id: question.id,
    level1_hint: generateLevel1TechnicalHint(question),
    level2_hint: generateLevel2SpecificHint(question),
    level3_hint: generateLevel3DirectionalHint(question)
  }
}

/**
 * 全問題の改善されたヒントを生成
 */
async function generateImprovedHintsForAllQuestions(): Promise<ImprovedHint[]> {
  console.log('🚀 改善されたヒント生成開始...')
  
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
  
  console.log(`📝 Found ${questions.length} questions. Generating improved hints...`)
  
  const improvedHints: ImprovedHint[] = []
  
  for (let i = 0; i < questions.length; i++) {
    const question = questions[i] as QuizQuestion
    
    console.log(`⏳ Processing question ${i + 1}/${questions.length}: ${question.question.substring(0, 50)}...`)
    
    try {
      const hint = generateImprovedHint(question)
      improvedHints.push(hint)
      
      // 進捗表示
      if ((i + 1) % 50 === 0) {
        console.log(`✅ Generated improved hints for ${i + 1} questions`)
      }
      
    } catch (error) {
      console.error(`❌ Error generating improved hints for question ${question.id}:`, error)
      continue
    }
  }
  
  console.log(`✅ Successfully generated improved hints for ${improvedHints.length} questions`)
  return improvedHints
}

/**
 * 既存ヒントを改善されたヒントで更新
 */
async function updateHintsInDatabase(hints: ImprovedHint[]): Promise<void> {
  console.log(`💾 Updating ${hints.length} hints in database...`)
  
  const batchSize = 50
  let updatedCount = 0
  
  for (let i = 0; i < hints.length; i += batchSize) {
    const batch = hints.slice(i, i + batchSize)
    
    try {
      // 各ヒントを個別更新（UPSERT）
      for (const hint of batch) {
        const { error } = await supabaseAdmin
          .from('quiz_hints')
          .upsert({
            question_id: hint.question_id,
            level1_hint: hint.level1_hint,
            level2_hint: hint.level2_hint,
            level3_hint: hint.level3_hint,
            updated_at: new Date().toISOString()
          })
        
        if (error) {
          console.error(`❌ Error updating hint for question ${hint.question_id}:`, error)
          continue
        }
        
        updatedCount++
      }
      
      console.log(`✅ Updated batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(hints.length / batchSize)} (${updatedCount}/${hints.length} hints)`)
      
      // バッチ間で少し待機
      await new Promise(resolve => setTimeout(resolve, 100))
      
    } catch (error) {
      console.error(`❌ Failed to update batch ${Math.floor(i / batchSize) + 1}:`, error)
      throw error
    }
  }
  
  console.log(`✅ Successfully updated ${updatedCount} hints in database`)
}

/**
 * 更新結果の検証
 */
async function verifyImprovedHints(): Promise<void> {
  console.log('🔍 Verifying improved hints...')
  
  // サンプル確認
  const { data: sample, error } = await supabaseAdmin
    .from('quiz_hints')
    .select(`
      question_id,
      level1_hint,
      level2_hint,
      level3_hint,
      quiz_questions!inner(question)
    `)
    .limit(5)
  
  if (error) {
    throw new Error(`Failed to fetch sample: ${error.message}`)
  }
  
  console.log('📋 Improved hints sample:')
  sample?.forEach((hint: { question_id: number; level1_hint: string; level2_hint: string; level3_hint: string; quiz_questions: { question: string }[] }, index) => {
    console.log(`\n${index + 1}. Question ID: ${hint.question_id}`)
    console.log(`   Question: ${hint.quiz_questions?.[0]?.question?.substring(0, 100) || 'No question'}...`)
    console.log(`   Level 1: ${hint.level1_hint}`)
    console.log(`   Level 2: ${hint.level2_hint}`)
    console.log(`   Level 3: ${hint.level3_hint}`)
  })
  
  // 品質チェック
  let technicalHintCount = 0
  let specificHintCount = 0
  let directionalHintCount = 0
  
  sample?.forEach(hint => {
    if (hint.level1_hint.includes('重要用語') || hint.level1_hint.includes('：')) {
      technicalHintCount++
    }
    if (!hint.level2_hint.includes('核心は何かを見極め') && !hint.level2_hint.includes('論理的に選択肢を絞り込んで')) {
      specificHintCount++
    }
    if (!hint.level3_hint.includes('正解は') || !hint.level3_hint.includes('番の選択肢')) {
      directionalHintCount++
    }
  })
  
  console.log('\n📈 Quality improvement results:')
  console.log(`✅ Technical hints (Level 1): ${technicalHintCount}/${sample?.length || 0}`)
  console.log(`✅ Specific hints (Level 2): ${specificHintCount}/${sample?.length || 0}`)
  console.log(`✅ Directional hints (Level 3): ${directionalHintCount}/${sample?.length || 0}`)
}

/**
 * メイン実行関数
 */
async function main() {
  try {
    console.log('🎯 Starting improved quiz hints generation process...')
    console.log('=' .repeat(60))
    
    const startTime = Date.now()
    
    // 1. 改善されたヒントを生成
    const improvedHints = await generateImprovedHintsForAllQuestions()
    
    // 2. データベースを更新
    await updateHintsInDatabase(improvedHints)
    
    // 3. 結果を検証
    await verifyImprovedHints()
    
    const endTime = Date.now()
    const duration = (endTime - startTime) / 1000
    
    console.log('\n🎉 Improved quiz hints generation completed successfully!')
    console.log(`⏱️  Total execution time: ${duration.toFixed(2)} seconds`)
    console.log(`📝 Updated hints for ${improvedHints.length} questions`)
    console.log('🎯 Quality improvements:')
    console.log('  - Level 1: Technical term explanations instead of generic advice')
    console.log('  - Level 2: Specific approach guidance instead of abstract thinking')
    console.log('  - Level 3: Directional hints instead of answer revelation')
    console.log('=' .repeat(60))
    
  } catch (error) {
    console.error('💥 Error in improved quiz hints generation:', error)
    process.exit(1)
  }
}

// CLI実行時はmain()を実行
if (require.main === module) {
  main()
}

export { generateImprovedHintsForAllQuestions, updateHintsInDatabase, verifyImprovedHints }