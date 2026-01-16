import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // リクエストボディの検証
  const { case_text, current_step, user_answer } = body

  if (!case_text || !current_step) {
    return NextResponse.json(
      { error: 'Missing required fields. Case text and current step are required.' },
      { status: 400 }
    )
  }

  try {
    // Hugging Face APIキーの確認
    const hfToken = process.env.HUGGINGFACE_API_KEY
    if (!hfToken) {
      return NextResponse.json(
        { error: 'Hugging Face API key not configured' },
        { status: 500 }
      )
    }

    // システムプロンプトとユーザープロンプトの分離
    const systemPrompt = `あなたは一流のビジネスコンサルタント教育の専門家です。
学習者が自ら気づき、思考を深められるよう、適切な問いかけを行います。

【ヒント提供の原則】
1. 答えを直接示さず、思考を促す問いかけをする
2. ケースの文脈と学習者の回答状況を踏まえた具体的なヒントを出す
3. コンサルティング思考の本質（仮説検証、構造化、優先順位付け等）を意識する
4. 簡潔で的確な20-40文字程度の問いかけにする

【出力形式】
必ずJSON形式で、1つのヒントのみを出力してください。`

    // 学習者の選択状況を分析用に整理
    const hasUserAnswer = user_answer && user_answer.choices && user_answer.choices.length > 0
    const userChoicesText = hasUserAnswer ? `選択: ${user_answer.choices.join(', ')}` : '未選択'
    const userReasoningText = user_answer?.reasoning ? `\n理由: ${user_answer.reasoning}` : ''
    
    // ステップ情報を簡潔に整理（ステップタイプに応じて正解情報を追加）
    const stepOptions = current_step.options?.map((opt: {
      id: string;
      text: string;
      correct?: boolean;
      insufficient?: boolean;
      order?: number;
    }) => {
      let correctIndicator = ''
      if (opt.correct === true) correctIndicator = '(○)'
      else if (opt.correct === false && current_step.type === 'single') correctIndicator = '(×)'
      else if (opt.insufficient === true) correctIndicator = '(不十分)'
      else if (opt.insufficient === false) correctIndicator = '(十分)'
      else if (opt.order) correctIndicator = `(優先度${opt.order})`
      return `${opt.id}: ${opt.text}${correctIndicator}`
    }).join('\n') || ''

    // ステップごとのヒント視点を定義
    const getStepGuidance = (stepName: string) => {
      const guidance: Record<string, string> = {
        'Step1: 状況把握': '【視点】事実とデータの収集。何を・いつ・どこで把握すべきか。変化のパターンと相関関係。',
        'Step2: 問題設定': '【視点】現象と真の問題の分離。ビジネスへの影響度。解決の優先順位。',
        'Step3: 仮説立案': '【視点】検証可能性・影響度・実現可能性による優先順位付け。Quick Winの特定。',
        'Step4: 分析プラン': '【視点】仮説検証に必要なデータ。比較分析の設計。定量化の方法。',
        'Step5: 提言・次アクション': '【視点】実行可能性。必要リソース。短期と中長期の区別。効果測定方法。'
      }
      return guidance[stepName] || '【視点】論理的思考と実務への適用。'
    }

    const userPrompt = `【ケース】B社製造業、歩留まり92%→87%低下、原因不明

【現在ステップ】${current_step.name}
${current_step.description}
${getStepGuidance(current_step.name)}

【選択肢と正解】
${stepOptions}

【学習者の回答】
${userChoicesText}${userReasoningText}

【ヒント生成の指示】
上記の学習者の回答を分析し、以下の観点で1つの問いかけ型ヒントを生成してください：

1. 学習者の選択と正解を比較
2. 不足している視点や見落としている要素を特定
3. その気づきを促す問いかけを作成
4. 「なぜ〜？」「もし〜なら？」「〜の観点から見ると？」などの形式を使用

出力JSON形式：
{
  "hint": "具体的な問いかけ文をここに記載"
}`

    // Hugging Face Inference API呼び出し
    const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.1-8B-Instruct:fastest",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: 400,
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    })

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.status}`)
    }

    const data = await response.json()
    
    // レスポンスの解析
    const generatedText = data.choices?.[0]?.message?.content
    
    if (!generatedText) {
      throw new Error('No response generated from Hugging Face API')
    }

    try {
      // 構造化JSON出力の処理
      console.log('Raw AI response:', generatedText)
      
      // JSON objectを直接パース
      const hintResult = JSON.parse(generatedText.trim())
      
      // 構造の検証
      if (!hintResult.hint || typeof hintResult.hint !== 'string') {
        throw new Error('Invalid hint structure')
      }

      return NextResponse.json({
        success: true,
        data: {
          hints: [hintResult.hint]  // 互換性のため配列形式を維持
        },
        metadata: {
          model: "llama-3.1-8b",
          processing_time: Date.now() / 1000
        }
      })

    } catch (parseError) {
      console.error('Error parsing AI response:', parseError)
      
      // フォールバック: ステップ別専門ヒント
      const fallbackHint = getStepSpecificHint(current_step?.name || 'Step1: 状況把握')
      const fallbackHints = {
        hints: [fallbackHint]
      }
      
      console.log('Using step-specific fallback hints')
      return NextResponse.json({
        success: true,
        data: fallbackHints,
        metadata: {
          model: "fallback",
          processing_time: Date.now() / 1000
        }
      })
    }

  } catch (error) {
    console.error('API Error:', error)
    
    // エラー時も構造化ヒントを返す
    return NextResponse.json({
      success: true,
      data: { hints: [getStepSpecificHint(current_step?.name || 'Step1: 状況把握')] },
      metadata: {
        model: "error-fallback",
        processing_time: Date.now() / 1000
      }
    })
  }
}

// ステップ別専門ヒント関数（単一ヒント返却）
function getStepSpecificHint(stepName: string): string {
  const hintMap: Record<string, string> = {
    'Step1: 状況把握': "不良発生時期と各工程・ロットのパターンを比較すると、何が見えてきますか？",
    'Step2: 問題設定': "歩留まり5%低下のビジネスインパクトを金額で計算すると、解決の優先度はどうなりますか？",
    'Step3: 仮説立案': "材料ロットの検証は数日、設備投資判断は数ヶ月。どちらから始めると効率的でしょうか？",
    'Step4: 分析プラン': "「設備不良の頻度を確認」だけでは不十分です。どのデータと比較すれば因果関係が分かりますか？",
    'Step5: 提言・次アクション': "設備全更新より重点保全、材料全変更よりロット管理。なぜQuick Winから始めるべきでしょうか？"
  }
  
  return hintMap[stepName] || "このケースで最も重要な解決すべき問題は何で、それはなぜでしょうか？"
}