/**
 * ヒント品質修正スクリプト（確実版）
 * 低品質ヒントを実用的なヒントに置き換え
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

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
}

/**
 * 技術用語辞書（実際の問題分析に基づく）
 */
const technicalTerms: Record<string, string> = {
  'ROE': '自己資本利益率 - 企業が株主資本をどれだけ効率的に活用して利益を上げているかを示す重要な財務指標',
  '3C': 'Customer（顧客）、Competitor（競合）、Company（自社）の3つの視点から事業環境を分析するフレームワーク',
  'LTV': '顧客生涯価値 - 一人の顧客が企業との取引期間全体を通じて生み出す利益の総額',
  'DCF': 'Discounted Cash Flow - 将来のキャッシュフローを現在価値に割り引いて企業価値を算定する手法',
  'MECE': 'Mutually Exclusive and Collectively Exhaustive - 漏れなく重複なく分類する論理的思考の基本原則',
  'ピラミッドストラクチャー': '論理的思考において結論を頂点として根拠を階層的に整理する構造化手法',
  '相関係数': '2つの変数間の関係の強さを-1から1で表す統計指標。0.8は強い正の相関を示す',
  'アジャイル': '変化に迅速に対応するため短いサイクルで計画・実行・評価を繰り返す組織運営手法',
  'エンゲージメント': '従業員が組織に対して感じる心理的なつながりや貢献意欲の度合い',
  'リーンスタートアップ': '最小限の製品で仮説検証を繰り返し、効率的に事業を成長させる手法',
  'ESG': 'Environment（環境）、Social（社会）、Governance（ガバナンス）の3つの観点から企業を評価する指標',
  'DX': 'デジタルトランスフォーメーション - デジタル技術を活用して業務プロセスや事業モデルを変革すること',
  'Win-Win': '交渉や取引において関係する全ての当事者が利益を得られる状況',
  'ブラックスワン': '発生確率は低いが起きると甚大な影響を与える予測困難な出来事',
  'サプライチェーン': '原材料調達から製造、販売までの一連の供給網',
  'レジリエンス': '困難な状況に直面した時の回復力や適応力'
}

/**
 * Level 1: 技術用語解説ヒント生成
 */
function generateLevel1Hint(question: QuizQuestion): string {
  const questionText = question.question
  
  // 問題文から技術用語を特定
  for (const [term, explanation] of Object.entries(technicalTerms)) {
    if (questionText.includes(term)) {
      return `💡 重要用語「${term}」: ${explanation}`
    }
  }
  
  // 英語略語のパターンマッチング
  const acronymMatch = questionText.match(/[A-Z]{2,5}(?=[（\(]|が|の|を|は|について)/g)
  if (acronymMatch) {
    const acronym = acronymMatch[0]
    if (technicalTerms[acronym]) {
      return `💡 重要用語「${acronym}」: ${technicalTerms[acronym]}`
    }
  }
  
  // カテゴリ別の具体的基礎知識
  if (question.category_id.includes('finance') || questionText.includes('投資') || questionText.includes('資本')) {
    return '💡 財務分析では、数値が示すビジネス上の意味を理解することが重要です。計算式の構成要素とその経営への影響を考えてください。'
  }
  
  if (questionText.includes('戦略') || questionText.includes('競争') || questionText.includes('優位')) {
    return '💡 戦略分析では、市場環境、競合状況、自社の強みを総合的に分析することが重要です。持続可能な競争優位の要素を考えてください。'
  }
  
  if (questionText.includes('マーケティング') || questionText.includes('顧客') || questionText.includes('ブランド')) {
    return '💡 マーケティングでは、顧客価値の創造と企業の収益性のバランスが重要です。顧客との関係性に注目してください。'
  }
  
  if (questionText.includes('組織') || questionText.includes('チーム') || questionText.includes('マネジメント')) {
    return '💡 組織運営では、人と仕組みの両方が重要です。効果的なマネジメント手法の特徴と実践での適用を考えてください。'
  }
  
  return '💡 この問題のキーワードに含まれる専門用語や概念の正確な意味を理解することが解答の鍵となります。'
}

/**
 * Level 2: 具体的解法アプローチヒント生成
 */
function generateLevel2Hint(question: QuizQuestion): string {
  const questionText = question.question.toLowerCase()
  
  if (questionText.includes('最も効果的') || questionText.includes('最適')) {
    return '🎯 複数選択肢の比較問題です。短期的効果だけでなく、長期的影響と実現可能性を総合的に評価してください。'
  }
  
  if (questionText.includes('適切でない') || questionText.includes('誤っている')) {
    return '⚠️ 「適切でない」ものを選ぶ問題です。他の選択肢が正しい理由を確認し、明らかに異なる要素を含む選択肢を見つけてください。'
  }
  
  if (questionText.includes('組み合わせ') || questionText.includes('要素') || questionText.includes('構成')) {
    return '🔍 構成要素を問う問題です。理論やフレームワークの基本的な構造を思い出し、必須要素が含まれているかチェックしてください。'
  }
  
  if (questionText.includes('最初') || questionText.includes('第一') || questionText.includes('優先')) {
    return '1️⃣ 優先順位を問う問題です。プロセスの基盤となる活動や、最も重要な要素から順番に考えてください。'
  }
  
  if (questionText.includes('原則') || questionText.includes('基本') || questionText.includes('特徴')) {
    return '🏗️ 基本概念を問う問題です。その理論・手法の核となる特徴を思い出し、他の概念との違いを明確にしてください。'
  }
  
  if (questionText.includes('分析') || questionText.includes('評価') || questionText.includes('判断')) {
    return '📊 分析・評価問題です。複数の観点から体系的に分析し、最も重要な判断基準を適用してください。'
  }
  
  return '🔧 問題の背景と目的を理解し、実際のビジネス現場で最も重視される要素を基準に判断してください。'
}

/**
 * Level 3: 方向性ヒント生成（答えを露出しない）
 */
function generateLevel3Hint(question: QuizQuestion): string {
  const questionText = question.question.toLowerCase()
  
  if (questionText.includes('適切でない') || questionText.includes('誤っている')) {
    return '❌ 他の選択肢と明らかに異なる要素や、一般的な原則に反する内容を含む選択肢に注目してください。'
  }
  
  if (questionText.includes('最も効果的') || questionText.includes('最適')) {
    return '🎯 最も包括的で実践的な解決策を提示している選択肢を探してください。理論だけでなく実行可能性も重要です。'
  }
  
  if (questionText.includes('最初') || questionText.includes('第一')) {
    return '1️⃣ プロセスの最初に行うべき基本的なステップに注目してください。後続の作業の基盤となる活動が正解です。'
  }
  
  if (questionText.includes('重要') || questionText.includes('重視')) {
    return '⭐ 理論的な理想よりも、実際のビジネス現場で最も重視される現実的な要素を含む選択肢を探してください。'
  }
  
  if (questionText.includes('原則') || questionText.includes('基本')) {
    return '🏗️ その理論・手法の最も基本的で核となる原則を表現している選択肢を選んでください。'
  }
  
  if (questionText.includes('特徴')) {
    return '🔍 他の概念や手法との明確な違いを示す特徴的な要素を含む選択肢を探してください。'
  }
  
  // 財務・計算問題
  if (questionText.includes('計算') || questionText.includes('率') || questionText.includes('%')) {
    return '📊 数値の背景にあるビジネス上の意味や、財務健全性に最も直結する解釈を重視してください。'
  }
  
  return '🎯 問題の核心的な要求を最も直接的に満たす選択肢を選んでください。実質的な内容と実現可能性を重視してください。'
}

/**
 * 改善されたヒント生成
 */
function generateImprovedHints(question: QuizQuestion) {
  return {
    question_id: question.id,
    level1_hint: generateLevel1Hint(question),
    level2_hint: generateLevel2Hint(question),
    level3_hint: generateLevel3Hint(question)
  }
}

async function main() {
  try {
    console.log('🔧 ヒント品質修正開始...')
    
    // 全問題を取得
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .eq('is_deleted', false)
      .order('id')
    
    if (questionsError) {
      throw new Error(`Questions fetch error: ${questionsError.message}`)
    }
    
    console.log(`📝 Found ${questions.length} questions`)
    
    let updatedCount = 0
    let errorCount = 0
    
    // 1件ずつ確実に更新
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i] as QuizQuestion
      const improvedHints = generateImprovedHints(question)
      
      try {
        const { error: updateError } = await supabaseAdmin
          .from('quiz_hints')
          .update({
            level1_hint: improvedHints.level1_hint,
            level2_hint: improvedHints.level2_hint,
            level3_hint: improvedHints.level3_hint,
            updated_at: new Date().toISOString()
          })
          .eq('question_id', question.id)
        
        if (updateError) {
          console.error(`❌ Update error for question ${question.id}:`, updateError.message)
          errorCount++
        } else {
          updatedCount++
          if (updatedCount % 50 === 0) {
            console.log(`✅ Updated ${updatedCount}/${questions.length} hints`)
          }
        }
        
        // 短い間隔でAPIレート制限を回避
        await new Promise(resolve => setTimeout(resolve, 10))
        
      } catch (error) {
        console.error(`❌ Exception for question ${question.id}:`, error)
        errorCount++
      }
    }
    
    console.log(`\n🎉 ヒント品質修正完了`)
    console.log(`✅ 更新成功: ${updatedCount}件`)
    console.log(`❌ エラー: ${errorCount}件`)
    
    // 結果確認
    console.log('\n📋 修正結果サンプル:')
    const { data: samples } = await supabaseAdmin
      .from('quiz_hints')
      .select(`
        question_id,
        level1_hint,
        level2_hint,
        level3_hint,
        quiz_questions!inner(question)
      `)
      .limit(3)
    
    samples?.forEach((sample: { question_id: number; level1_hint: string; level2_hint: string; level3_hint: string; quiz_questions: { question: string }[] }, index) => {
      console.log(`\n${index + 1}. Question ID: ${sample.question_id}`)
      console.log(`   Question: ${sample.quiz_questions?.[0]?.question?.substring(0, 100) || 'No question'}...`)
      console.log(`   Level 1: ${sample.level1_hint}`)
      console.log(`   Level 2: ${sample.level2_hint}`)
      console.log(`   Level 3: ${sample.level3_hint}`)
    })
    
  } catch (error) {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}