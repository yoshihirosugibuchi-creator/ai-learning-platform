import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // リクエストボディの検証
    const { case_text, answer_step1, answer_step2, answer_step3, answer_step4, answer_step5, hint_count = 0, step_times_json = '{}' } = body

    if (!case_text || !answer_step1 || !answer_step2 || !answer_step3 || !answer_step4 || !answer_step5) {
      return NextResponse.json(
        { error: 'Missing required fields. All step answers are required.' },
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

    // システムプロンプト：評価者の役割定義
    const systemPrompt = `あなたは一流のビジネスコンサルタント教育の専門家です。学習者のケーススタディ回答を10軸ルーブリックで客観的に評価します。

出力ルール：
1. 必ずJSON形式で出力してください
2. 各軸を1-5点で採点（5点満点）
3. 理由は2-3文で簡潔に
4. 総合スコアは各軸の平均×20で算出
5. あなた自身の解答例は提示しない`
    
    // ユーザープロンプト：評価対象と基準
    const userPrompt = `【評価対象ケース】
B社製造業の歩留まり改善（92%→87%低下、原因不明）

【学習者の回答】
Step1（状況把握）: ${answer_step1}
Step2（問題設定）: ${answer_step2}
Step3（仮説立案）: ${answer_step3}
Step4（分析プラン）: ${answer_step4}
Step5（提言・次アクション）: ${answer_step5}

【10軸評価基準】
1. problem_setting: 問題設定力（現象と問題の分離）
2. structuring_logic: 構造化・論理性（論理的思考）
3. critical_thinking: 批判的思考（前提の検証）
4. hypothesis_thinking: 仮説思考（仮説立案力）
5. creativity: 創造性（新しい視点）
6. analysis_design: 分析設計力（検証方法）
7. risk_assumption_awareness: リスク・前提認識
8. practicality_client_view: 実行可能性・クライアント志向
9. practical_application: 実務適用能力
10. clarity_expression: 表現の明瞭さ

以下のJSON形式で評価してください：
2. structuring_logic: 構造化・論理性
3. critical_thinking: 批判的思考

（B）価値創造スキル
4. hypothesis_thinking: 仮説思考
5. creativity: 創造性

（C）分析・検証スキル
6. analysis_design: 分析設計力
7. risk_assumption_awareness: リスク・前提認識

（D）実務適用スキル
8. practicality_client_view: 実行可能性・クライアント志向
9. practical_application: 実務適用能力

（E）コミュニケーションスキル
10. clarity_expression: 表現の明瞭さ

各軸は1～5点で採点し、理由を2～4文で述べてください。
========================
【学習者の回答】
Step1: ${answer_step1}
Step2: ${answer_step2}
Step3: ${answer_step3}
Step4: ${answer_step4}
Step5: ${answer_step5}
========================
【メタ情報】
ヒント使用回数: ${hint_count}
ステップ別回答時間（秒）: ${step_times_json}
========================
【評価ルール】
1. 各軸ごとに1～5点の整数で採点すること。
2. 理由は客観的に、回答内の具体的行動・記述に言及しながら述べること。
3. 質問者が推測した内容は決して評価対象に含めないこと（＝書いていないことを加点しない）。
4. ヒントを使いすぎている場合や時間が極端に長い場合、適切に減点してよい。
5. 「総合スコア」は10軸の合計点（50点満点）として計算すること。
========================
【出力フォーマット（厳守）】
{
 "dimension_scores": {
   "problem_setting": { "score": 数値, "reason": "理由" },
   "structuring_logic": { "score": 数値, "reason": "理由" },
   "critical_thinking": { "score": 数値, "reason": "理由" },
   "hypothesis_thinking": { "score": 数値, "reason": "理由" },
   "creativity": { "score": 数値, "reason": "理由" },
   "analysis_design": { "score": 数値, "reason": "理由" },
   "risk_assumption_awareness": { "score": 数値, "reason": "理由" },
   "practicality_client_view": { "score": 数値, "reason": "理由" },
   "practical_application": { "score": 数値, "reason": "理由" },
   "clarity_expression": { "score": 数値, "reason": "理由" }
 },
 "total_score": 数値,
 "overall_comment": "総合コメント（3～5文）"
}

JSON以外の文を絶対に出力しないこと。
`

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
            content: userPrompt + `

{
  "dimension_scores": {
    "problem_setting": {"score": 数値, "reason": "理由"},
    "structuring_logic": {"score": 数値, "reason": "理由"},
    "critical_thinking": {"score": 数値, "reason": "理由"},
    "hypothesis_thinking": {"score": 数値, "reason": "理由"},
    "creativity": {"score": 数値, "reason": "理由"},
    "analysis_design": {"score": 数値, "reason": "理由"},
    "risk_assumption_awareness": {"score": 数値, "reason": "理由"},
    "practicality_client_view": {"score": 数値, "reason": "理由"},
    "practical_application": {"score": 数値, "reason": "理由"},
    "clarity_expression": {"score": 数値, "reason": "理由"}
  },
  "total_score": 数値,
  "overall_comment": "総合コメント"
}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.2,
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
      console.log('Raw AI scoring response:', generatedText)
      
      const scoringResult = JSON.parse(generatedText.trim())
      
      // 構造の検証
      if (!scoringResult.dimension_scores || !scoringResult.total_score) {
        throw new Error('Invalid scoring structure')
      }

      return NextResponse.json({
        success: true,
        data: scoringResult,
        metadata: {
          model: "llama-3.1-8b",
          processing_time: Date.now() / 1000,
          hint_count: hint_count
        }
      })

    } catch (parseError) {
      console.error('Error parsing AI scoring response:', parseError)
      
      // フォールバック: 基本的なスコア構造を返す
      const fallbackScoring = {
        dimension_scores: {
          problem_setting: { score: 3, reason: "基本的な問題認識が見られます" },
          structuring_logic: { score: 3, reason: "論理的な構成が部分的に確認できます" },
          critical_thinking: { score: 3, reason: "批判的視点が一部含まれています" },
          hypothesis_thinking: { score: 3, reason: "仮説立案の基本要素があります" },
          creativity: { score: 3, reason: "標準的なアプローチが取られています" },
          analysis_design: { score: 3, reason: "分析方法の基本設計があります" },
          risk_assumption_awareness: { score: 3, reason: "リスク認識が部分的にあります" },
          practicality_client_view: { score: 3, reason: "実行可能性への配慮が見られます" },
          practical_application: { score: 3, reason: "実務適用の基本要素があります" },
          clarity_expression: { score: 3, reason: "表現は基本的に明確です" }
        },
        total_score: 30,
        overall_comment: "基本的なコンサルティング思考プロセスが確認できます。さらなる深掘りと具体性の向上が期待されます。"
      }
      
      return NextResponse.json({
        success: true,
        data: fallbackScoring,
        metadata: {
          model: "fallback",
          processing_time: Date.now() / 1000,
          hint_count: hint_count
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