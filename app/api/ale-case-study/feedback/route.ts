import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // リクエストボディの検証
    const { score_json, answer_step1, answer_step2, answer_step3, answer_step4, answer_step5 } = body

    if (!score_json || !answer_step1 || !answer_step2 || !answer_step3 || !answer_step4 || !answer_step5) {
      return NextResponse.json(
        { error: 'Missing required fields. Score data and all step answers are required.' },
        { status: 400 }
      )
    }

    // Hugging Face APIキーの確認
    const hfToken = process.env.HUGGINGFACE_API_KEY
    if (!hfToken) {
      return NextResponse.json(
        { error: 'Hugging Face API key not configured' },
        { status: 500 }
      )
    }

    // システムプロンプト：コーチの役割定義
    const systemPrompt = `あなたはビジネスコンサルタント教育のプロフェッショナルコーチです。学習者の成長を促進するための的確で建設的なフィードバックを提供します。

出力ルール：
1. 必ずJSON形式で出力してください
2. 良い点を3つ以内で簡潔に
3. 改善点を3つ以内で具体的に
4. 次回へのアドバイス1-2文で
5. 学習者の回答に基づいた評価のみ`
    
    // ユーザープロンプト：フィードバック対象
    const userPrompt = `【ケーススタディ結果】
スコア: ${score_json?.total_score || 0}/50点

【学習者の回答】
Step1: ${answer_step1}
Step2: ${answer_step2}
Step3: ${answer_step3}
Step4: ${answer_step4}
Step5: ${answer_step5}

以下のJSON形式でフィードバックを提供してください：

{
  "good_points": ["良い点1", "良い点2", "良い点3"],
  "improvement_points": ["改善点1", "改善点2", "改善点3"],
  "next_tip": "次回へのアドバイス"
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
        max_tokens: 800,
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
      console.log('Raw AI feedback response:', generatedText)
      
      const feedbackResult = JSON.parse(generatedText.trim())
      
      // 構造の検証
      if (!feedbackResult.good_points || !feedbackResult.improvement_points || !feedbackResult.next_tip) {
        throw new Error('Invalid feedback structure')
      }

      return NextResponse.json({
        success: true,
        data: feedbackResult,
        metadata: {
          model: "llama-3.1-8b",
          processing_time: Date.now() / 1000
        }
      })

    } catch (parseError) {
      console.error('Error parsing AI feedback response:', parseError)
      
      // フォールバック: 基本的なフィードバックを返す
      const fallbackFeedback = {
        good_points: [
          "コンサルティングの5ステップに沿った回答ができています",
          "各ステップでの考察が確認できます",
          "結論に向かう姿勢が見られます"
        ],
        improvement_points: [
          "より具体的なデータや事実に基づいた分析を心がけてみてください",
          "仮説と検証方法の連結をより明確にしてみてください",
          "クライアントの立場や制約をより考慮してみてください"
        ],
        next_tip: "次回は、各ステップでの思考プロセスをより深堆りし、データに基づいた判断を意識してみてください。"
      }
      
      return NextResponse.json({
        success: true,
        data: fallbackFeedback,
        metadata: {
          model: "fallback",
          processing_time: Date.now() / 1000
        }
      })
    }

  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}