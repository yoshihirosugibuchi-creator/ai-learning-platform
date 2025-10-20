// AI別プロンプト最適化ライブラリ
// 既存プロンプトの重要情報を全て保持しつつ、各AIの特性に合わせて表現を最適化

interface PromptData {
  categoryName: string
  categoryId: string
  categoryType: string
  subcategoryName: string
  subcategoryId: string
  difficultyName: string
  difficultyId: string
  count: number
  duplicateWarning: string
  existingContext: string
  categoryTypeDescription: string
  existingCount: number
}

/**
 * Claude向け最適化プロンプト（XMLタグ構造化）
 */
export function generateClaudePrompt(data: PromptData): string {
  return `<task>
日本語でクイズ問題を生成してください。出力は必ずJSON形式でお願いします。
${data.duplicateWarning}
${data.existingContext}
</task>

<generation_conditions>
- カテゴリー: ${data.categoryName}（ID: ${data.categoryId}）
- カテゴリータイプ: ${data.categoryType === 'main' ? 'ビジネススキル' : '業界専門スキル'}（${data.categoryTypeDescription}）
- サブカテゴリー: ${data.subcategoryName}（ID: ${data.subcategoryId}）
- 難易度: ${data.difficultyName}（ID: ${data.difficultyId}）
- 問題数: ${data.count}問
- ソース: 適切な参考情報源（書籍、公式ドキュメント、標準仕様等）
</generation_conditions>

<question_perspective>
${data.categoryType === 'main' ? 
`<business_skills>
- ビジネス全般で活用できる汎用的なスキル・知識
- 業界を問わず重要な基本概念・手法
- 実務で広く使われる標準的なアプローチ
- チームワーク・コミュニケーション・問題解決に関連する内容
</business_skills>` :
`<industry_expertise>
- ${data.categoryName}業界特有の専門知識・技術
- 業界の最新トレンド・技術動向
- 実際の${data.categoryName}業界で直面する課題・ソリューション
- ${data.categoryName}業界のベストプラクティス・事例
</industry_expertise>`}
</question_perspective>

<difficulty_definitions>
- 基礎: 学生・新入社員レベル（基本概念・用語・定義の理解）
- 中級: 入社2-3年目レベル（実践的な理解・応用問題）
- 上級: ベテラン社員レベル（深い理解・複雑な問題解決）
- エキスパート: 専門家レベル（最新技術・高度な実装・アーキテクチャ設計）
</difficulty_definitions>

<time_limit_guidelines>
- 基礎レベル: 10-25秒（基本概念・定義問題）
- 中級レベル: 25-40秒（思考・応用問題）
- 上級レベル: 40-70秒（複雑な分析・実装問題）
- エキスパート: 50-90秒（高度な技術判断・設計問題）
- 計算問題: +10-15秒追加 | コード読解: +15-20秒追加 | 実装パターン: +20-30秒追加
</time_limit_guidelines>

<duplicate_avoidance>
${data.existingCount > 0 ? `- ${data.subcategoryName}分野では既に${data.existingCount}問が存在（全難易度レベル含む）
- 上記表示された既存問題と絶対に重複しない新しい観点・切り口から出題
- 既存問題の内容・表現・アプローチを完全に避ける
- より深い理解や実践的な応用問題を重視
- 異なるユースケース・シナリオ・実装パターンでの出題
- 初級・中級・上級の全難易度レベルでの既存問題を考慮
- 上記既存問題一覧とは明確に異なるアプローチを必須採用` : `- 基礎から応用まで幅広い観点での出題
- 体系的で段階的な難易度設定
- 実務で活用できる実践的な内容
- 新規分野として質の高い問題を体系的に構築`}
</duplicate_avoidance>

<output_format>
{
  "questions": [
    {
      "question": "問題文をここに記載（具体的で明確に）",
      "options": {"A": "選択肢1", "B": "選択肢2", "C": "選択肢3", "D": "選択肢4"},
      "correctAnswer": "A～Dのいずれか（必ずランダムに）",
      "explanation": "正解の理由と学習ポイントを詳しく説明",
      "category": "${data.categoryId}",
      "subcategory": "${data.subcategoryId}",
      "difficulty": "${data.difficultyId}",
      "timeLimit": 45,
      "tags": ["具体的タグ1", "具体的タグ2", "具体的タグ3"],
      "source": "参考資料名・公式ドキュメント・書籍名等"
    }
  ]
}
</output_format>

<quality_standards>
- 正確性: 技術的に正しく、最新の情報に基づく
- 明確性: 曖昧さのない問題文と選択肢
- 教育的価値: 解説で理解を深め、実務に活かせる知識
- 適切性: ${data.difficultyName}レベルに適合した難易度
- 実践性: 実際の開発・業務で遭遇する場面を想定
- 具体性: 抽象的でなく具体的なシナリオベース
- ランダム性: 正解選択肢は必ずA/B/C/Dにランダムに配置（偏りを避ける）
</quality_standards>

<important_notes>
⚠️ correctAnswerは各問題でA/B/C/Dをランダムに使用してください。
例：1問目="B"、2問目="D"、3問目="A"、4問目="C"、5問目="B" など、偏らないように。

ソース記載例: "MDN Web Docs"、"ECMAScript仕様書"、"Clean Code（Robert C. Martin著）"等
タグ記載例: 技術要素["JavaScript", "ES6"]、概念["デザインパターン"]、分野["フロントエンド"]等
</important_notes>`
}

/**
 * ChatGPT向け最適化プロンプト（構造化・箇条書き重視）
 */
export function generateChatGPTPrompt(data: PromptData): string {
  return `以下の条件で日本語のクイズ問題を生成してください。
出力は必ずJSON形式でお願いします。${data.duplicateWarning}${data.existingContext}

# 生成条件
- **カテゴリー**: ${data.categoryName}（ID: ${data.categoryId}）
- **カテゴリータイプ**: ${data.categoryType === 'main' ? 'ビジネススキル' : '業界専門スキル'}（${data.categoryTypeDescription}）
- **サブカテゴリー**: ${data.subcategoryName}（ID: ${data.subcategoryId}）
- **難易度**: ${data.difficultyName}（ID: ${data.difficultyId}）
- **問題数**: ${data.count}問
- **ソース**: 適切な参考情報源（書籍、公式ドキュメント、標準仕様等）

# 問題作成の視点
${data.categoryType === 'main' ? 
`## ビジネススキル観点
- ビジネス全般で活用できる汎用的なスキル・知識
- 業界を問わず重要な基本概念・手法
- 実務で広く使われる標準的なアプローチ
- チームワーク・コミュニケーション・問題解決に関連する内容` :
`## 業界専門スキル観点
- ${data.categoryName}業界特有の専門知識・技術
- 業界の最新トレンド・技術動向
- 実際の${data.categoryName}業界で直面する課題・ソリューション
- ${data.categoryName}業界のベストプラクティス・事例`}

# 難易度レベル定義
- **基礎**: 学生・新入社員レベル（基本概念・用語・定義の理解）
- **中級**: 入社2-3年目レベル（実践的な理解・応用問題）
- **上級**: ベテラン社員レベル（深い理解・複雑な問題解決）
- **エキスパート**: 専門家レベル（最新技術・高度な実装・アーキテクチャ設計）

# 制限時間設定指針（マイクロラーニング対応）
- 基礎レベル: 10-25秒（基本概念・定義問題）
- 中級レベル: 25-40秒（思考・応用問題）
- 上級レベル: 40-70秒（複雑な分析・実装問題）
- エキスパート: 50-90秒（高度な技術判断・設計問題）
- **追加時間**: 計算問題+10-15秒、コード読解+15-20秒、実装パターン+20-30秒

# 重複回避要件
${data.existingCount > 0 ? `- ${data.subcategoryName}分野では既に${data.existingCount}問が存在（全難易度レベル含む）
- 上記表示された既存問題と絶対に重複しない新しい観点・切り口から出題
- 既存問題の内容・表現・アプローチを完全に避ける
- より深い理解や実践的な応用問題を重視
- 異なるユースケース・シナリオ・実装パターンでの出題
- 初級・中級・上級の全難易度レベルでの既存問題を考慮
- 上記既存問題一覧とは明確に異なるアプローチを必須採用` : `- 基礎から応用まで幅広い観点での出題
- 体系的で段階的な難易度設定
- 実務で活用できる実践的な内容
- 新規分野として質の高い問題を体系的に構築`}

# 出力形式
\`\`\`json
{
  "questions": [
    {
      "question": "問題文をここに記載（具体的で明確に）",
      "options": {"A": "選択肢1", "B": "選択肢2", "C": "選択肢3", "D": "選択肢4"},
      "correctAnswer": "A～Dのいずれか（必ずランダムに）",
      "explanation": "正解の理由と学習ポイントを詳しく説明",
      "category": "${data.categoryId}",
      "subcategory": "${data.subcategoryId}",
      "difficulty": "${data.difficultyId}",
      "timeLimit": 45,
      "tags": ["具体的タグ1", "具体的タグ2", "具体的タグ3"],
      "source": "参考資料名・公式ドキュメント・書籍名等"
    }
  ]
}
\`\`\`

# 品質基準（必須遵守）
1. **正確性**: 技術的に正しく、最新の情報に基づく
2. **明確性**: 曖昧さのない問題文と選択肢
3. **教育的価値**: 解説で理解を深め、実務に活かせる知識
4. **適切性**: ${data.difficultyName}レベルに適合した難易度
5. **実践性**: 実際の開発・業務で遭遇する場面を想定
6. **具体性**: 抽象的でなく具体的なシナリオベース
7. **ランダム性**: 正解選択肢は必ずA/B/C/Dにランダムに配置（偏りを避ける）

# 重要な注意事項
⚠️ **correctAnswerは各問題でA/B/C/Dをランダムに使用してください。**
例：1問目="B"、2問目="D"、3問目="A"、4問目="C"、5問目="B" など、偏らないように。

**ソース記載例**: "MDN Web Docs - JavaScript"、"ECMAScript 2023仕様書"、"Clean Code（Robert C. Martin著）"等
**タグ記載例**: 技術要素["JavaScript", "ES6"]、概念["デザインパターン"]、分野["フロントエンド"]等`
}

/**
 * Gemini向け最適化プロンプト（簡潔・効率重視）
 */
export function generateGeminiPrompt(data: PromptData): string {
  return `## クイズ問題生成タスク
日本語のクイズ問題を生成してください。JSON形式で出力。
${data.duplicateWarning}${data.existingContext}

**基本条件**
- カテゴリー: ${data.categoryName}（${data.categoryId}）
- サブカテゴリー: ${data.subcategoryName}（${data.subcategoryId}）
- 難易度: ${data.difficultyName}（${data.difficultyId}）
- 問題数: ${data.count}問
- カテゴリータイプ: ${data.categoryTypeDescription}

**問題作成観点**
${data.categoryType === 'main' ? 
`ビジネススキル: 汎用的スキル・知識、基本概念・手法、標準的アプローチ、チームワーク・コミュニケーション・問題解決` :
`業界専門: ${data.categoryName}業界の専門知識・技術、最新トレンド・技術動向、実際の業界課題・ソリューション、ベストプラクティス・事例`}

**難易度・制限時間設定**
- 基礎（学生・新入社員）: 10-25秒 - 基本概念・用語・定義
- 中級（入社2-3年目）: 25-40秒 - 実践的理解・応用問題
- 上級（ベテラン社員）: 40-70秒 - 深い理解・複雑な問題解決
- エキスパート（専門家）: 50-90秒 - 最新技術・高度な実装・アーキテクチャ設計
- 追加時間: 計算+10-15秒、コード読解+15-20秒、実装パターン+20-30秒

**重複回避**
${data.existingCount > 0 ? `${data.subcategoryName}分野既存${data.existingCount}問。上記既存問題と完全に異なる新観点・切り口必須。既存の内容・表現・アプローチ完全回避。深い理解・実践的応用重視。異なるユースケース・シナリオ・実装パターン。全難易度レベル既存問題考慮。` : `新規分野。基礎～応用幅広い観点。体系的段階的難易度。実務活用実践的内容。質の高い問題体系的構築。`}

**JSON出力形式**
\`\`\`json
{
  "questions": [
    {
      "question": "具体的で明確な問題文",
      "options": {"A": "選択肢1", "B": "選択肢2", "C": "選択肢3", "D": "選択肢4"},
      "correctAnswer": "A～D（必ずランダム配置）",
      "explanation": "正解理由と学習ポイント詳細説明",
      "category": "${data.categoryId}",
      "subcategory": "${data.subcategoryId}",
      "difficulty": "${data.difficultyId}",
      "timeLimit": 適切な秒数,
      "tags": ["具体的タグ1", "具体的タグ2", "具体的タグ3"],
      "source": "参考資料名・公式ドキュメント・書籍名"
    }
  ]
}
\`\`\`

**品質基準（全項目必須）**
正確性（技術的正確・最新情報）、明確性（曖昧さなし）、教育的価値（実務活用可能知識）、適切性（${data.difficultyName}レベル適合）、実践性（実際の開発・業務場面）、具体性（具体的シナリオベース）、ランダム性（A/B/C/Dランダム配置・偏り回避）

**重要注意**
⚠️ correctAnswerは各問題でA,B,C,Dをランダム使用必須。例：1問目="B"、2問目="D"、3問目="A"等、偏り禁止。
ソース例："MDN Web Docs"、"ECMAScript仕様書"、"Clean Code"等
タグ例：技術["JavaScript","ES6"]、概念["デザインパターン"]、分野["フロントエンド"]等`
}

/**
 * AI別プロンプト生成のメイン関数
 */
export function generateAIOptimizedPrompt(aiModel: string, data: PromptData): string {
  switch (aiModel.toLowerCase()) {
    case 'claude':
      return generateClaudePrompt(data)
    case 'chatgpt':
      return generateChatGPTPrompt(data)
    case 'gemini':
      return generateGeminiPrompt(data)
    default:
      // デフォルトはClaude形式（現在のプロンプトを維持）
      return generateClaudePrompt(data)
  }
}