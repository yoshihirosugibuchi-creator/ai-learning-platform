import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getCurrentUserRole } from '@/lib/auth-helpers'

interface HintGenerationRequest {
  question_id: number
  level: 1 | 2 | 3
  current_hint?: string
}

// AIヒント生成プロンプト設定
const HINT_PROMPTS = {
  1: {
    description: '軽いヒント',
    instruction: `問題のテーマや分野を示す軽いヒントを生成してください。
- 問題の方向性を示すが、具体的な解法は示さない
- 学習者が「ああ、この分野の問題か」と気づける程度
- 1-2文で簡潔に
- 例：「この問題はデータ構造に関する基本的な概念について問うています」`
  },
  2: {
    description: '中程度のヒント',
    instruction: `解法のアプローチや重要なポイントを示すヒントを生成してください。
- 解決に必要な概念や手法を具体的に示す
- ただし、完全な答えは示さない
- 2-3文で具体的に
- 例：「配列の要素を順次比較していく手法を考えてみましょう。特に隣接する要素同士の関係に注目してください」`
  },
  3: {
    description: '決定的なヒント',
    instruction: `正解に導く決定的なヒントを生成してください（正解は明示しない）。
- 正解を選択するための決定的な要素を示す
- 答えそのものは絶対に書かない
- 正解への最後の一歩を示すレベル
- 2-3文で的確に
- 例：「この処理の計算量を考えると、ネストしたループの場合はO(n²)になります。最も効率的なアルゴリズムを選択してください」`
  }
}

// ヒント品質チェック関数
function evaluateHintQuality(hint: string, level: 1 | 2 | 3): number {
  let score = 0
  
  // 基本的な品質チェック
  if (hint.length > 20 && hint.length < 200) score += 20
  if (hint.includes('。') || hint.includes('.')) score += 10
  if (!hint.includes('答え') && !hint.includes('正解')) score += 20
  
  // レベル別チェック
  switch (level) {
    case 1:
      if (hint.includes('分野') || hint.includes('概念') || hint.includes('について')) score += 15
      if (!hint.includes('具体的') && !hint.includes('詳細')) score += 10
      break
    case 2:
      if (hint.includes('手法') || hint.includes('アプローチ') || hint.includes('方法')) score += 15
      if (hint.includes('考え') || hint.includes('注目')) score += 10
      break
    case 3:
      if (hint.includes('選択') || hint.includes('判断') || hint.includes('決定')) score += 15
      if (hint.includes('最も') || hint.includes('重要')) score += 10
      break
  }
  
  // 長さによる調整
  if (hint.length < 50) score -= 10
  if (hint.length > 150) score -= 5
  
  return Math.min(100, Math.max(0, score))
}

// シンプルなAIヒント生成シミュレーション
function generateAIHint(question: string, options: string[], correctAnswer: number, level: 1 | 2 | 3): string {
  // 実際のAI呼び出しの代わりに、ルールベースでヒントを生成
  // 本番環境では OpenAI API などを使用
  
  const questionKeywords = question.toLowerCase()
  let hint = ''
  
  switch (level) {
    case 1:
      if (questionKeywords.includes('データ') || questionKeywords.includes('構造')) {
        hint = 'この問題はデータ構造に関する基本的な概念について問うています。'
      } else if (questionKeywords.includes('アルゴリズム') || questionKeywords.includes('計算')) {
        hint = 'アルゴリズムの効率性と計算量に関する問題です。'
      } else if (questionKeywords.includes('プログラム') || questionKeywords.includes('コード')) {
        hint = 'プログラミングの基本的な制御構造について考えてみましょう。'
      } else if (questionKeywords.includes('データベース') || questionKeywords.includes('sql')) {
        hint = 'データベースの基本操作と設計に関する問題です。'
      } else if (questionKeywords.includes('ネットワーク') || questionKeywords.includes('通信')) {
        hint = 'ネットワーク通信の基本的な仕組みに関する問題です。'
      } else {
        hint = 'この問題は基本的なITの概念について問うています。'
      }
      break
      
    case 2:
      if (questionKeywords.includes('データ') || questionKeywords.includes('構造')) {
        hint = '配列、リスト、スタック、キューなどの基本的なデータ構造の特徴と使い分けを考えてみましょう。'
      } else if (questionKeywords.includes('アルゴリズム') || questionKeywords.includes('計算')) {
        hint = 'O記法を使って各選択肢の計算量を比較し、最も効率的な方法を選択してください。'
      } else if (questionKeywords.includes('プログラム') || questionKeywords.includes('コード')) {
        hint = 'ループ、条件分岐、関数などの制御構造がどのように動作するかを考えてみましょう。'
      } else if (questionKeywords.includes('データベース') || questionKeywords.includes('sql')) {
        hint = 'SELECT、INSERT、UPDATE、DELETEなどのSQL文の構文と使い方を思い出してください。'
      } else if (questionKeywords.includes('ネットワーク') || questionKeywords.includes('通信')) {
        hint = 'TCP/IPモデルやOSI参照モデルの各層の役割を考えてみましょう。'
      } else {
        hint = '選択肢の中で最も適切で効率的な手法を選択してください。'
      }
      break
      
    case 3:
      const correctOption = options[correctAnswer - 1]
      const keywords = correctOption.toLowerCase()
      
      if (keywords.includes('o(n²)') || keywords.includes('平方')) {
        hint = 'ネストしたループ構造の場合、計算量はO(n²)になります。最も効率的なアルゴリズムを選択してください。'
      } else if (keywords.includes('o(log n)') || keywords.includes('対数')) {
        hint = '二分探索や分割統治法のように、データを半分ずつ処理する手法の計算量はO(log n)です。'
      } else if (keywords.includes('正規化') || keywords.includes('第3正規形')) {
        hint = 'データベースの正規化では、第3正規形まで正規化することで冗長性を排除できます。'
      } else if (keywords.includes('tcp') || keywords.includes('信頼性')) {
        hint = 'データの確実な配送が必要な場合は、信頼性のあるプロトコルを選択する必要があります。'
      } else if (keywords.includes('スタック') || keywords.includes('lifo')) {
        hint = 'LIFO（Last In, First Out）の特徴を持つデータ構造を考えてください。'
      } else {
        hint = '問題文の条件と各選択肢を注意深く比較し、最も適合する答えを選択してください。'
      }
      break
  }
  
  return hint
}

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { userId, role: userRole } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // システム管理者権限チェック
    if (userRole !== 'system_admin') {
      return NextResponse.json({ error: 'システム管理者権限が必要です' }, { status: 403 })
    }

    const body: HintGenerationRequest = await request.json()
    const { question_id, level } = body

    // バリデーション
    if (!question_id || !level || ![1, 2, 3].includes(level)) {
      return NextResponse.json({ error: '不正なリクエストパラメータです' }, { status: 400 })
    }

    // 問題情報を取得
    const { data: question, error: questionError } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, question, option1, option2, option3, option4, correct_answer, difficulty, category_id')
      .eq('id', question_id)
      .eq('is_deleted', false)
      .single()

    if (questionError || !question) {
      return NextResponse.json({ error: '問題が見つかりません' }, { status: 404 })
    }

    // AIヒント生成（ここではシミュレーション）
    const options = [question.option1, question.option2, question.option3, question.option4]
    const generatedHint = generateAIHint(question.question, options, question.correct_answer, level)
    
    // ヒント品質評価
    const qualityScore = evaluateHintQuality(generatedHint, level)

    // 生成ログを記録（将来のAI-API統合時に実装予定）
    console.log(`ヒント生成完了: 問題ID=${question_id}, レベル=${level}, 品質=${qualityScore}`)

    return NextResponse.json({
      success: true,
      generated_hint: generatedHint,
      quality_score: qualityScore,
      ai_model: 'rule_based_v1',
      level_description: HINT_PROMPTS[level].description
    })

  } catch (error) {
    console.error('AIヒント生成エラー:', error)
    return NextResponse.json(
      { error: 'ヒント生成中にエラーが発生しました' },
      { status: 500 }
    )
  }
}