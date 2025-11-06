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
 * 既存問題コンテキストの最適化：重要情報のみ抽出
 */
function generateOptimizedExistingContext(existingContext: string, existingCount: number): string {
  if (!existingContext || existingCount === 0) return ''
  
  // 既存問題一覧から最初の10問のみ表示（プロンプト長制限）
  const maxDisplay = 10
  const lines = existingContext.split('\n').filter(line => line.trim())
  const existingProblemsSection = lines.find(line => line.includes('【既存問題一覧'))
  
  if (existingProblemsSection) {
    const problemLines = lines.slice(lines.indexOf(existingProblemsSection) + 1)
      .filter(line => line.match(/^\d+\./))
      .slice(0, maxDisplay)
    
    return `<existing_problems>
この分野には既に${existingCount}問が登録済みです。以下と重複しない新しい観点で出題してください：

${problemLines.join('\n')}${existingCount > maxDisplay ? `\n...他${existingCount - maxDisplay}問あり` : ''}

⚠️ 上記問題と完全に異なるアプローチ・視点・ユースケースで新問題を作成してください。
</existing_problems>`
  }
  
  return `<existing_problems>
この分野には既に${existingCount}問が登録済みです。重複を避けて新しい観点で出題してください。
</existing_problems>`
}

/**
 * 難易度別の詳細説明文を取得（時間目安含む）
 */
function getDifficultyDescription(difficultyName: string): string {
  const descriptions: Record<string, string> = {
    'basic': '初級(basic) - 学生・新入社員レベル: 10-25秒 - 基本概念・用語・定義',
    'intermediate': '中級(intermediate) - 入社2-3年目レベル: 25-40秒 - 実践的理解・応用問題', 
    'advanced': '上級(advanced) - ベテラン社員レベル: 40-70秒 - 深い理解・複雑な問題解決',
    'expert': 'エキスパート(expert) - 専門家レベル: 50-90秒 - 最新技術・高度な実装・アーキテクチャ設計',
    // 旧形式との互換性（「基礎」→「初級」に統一）
    '初級': '初級(basic) - 学生・新入社員レベル: 10-25秒 - 基本概念・用語・定義',
    '中級': '中級(intermediate) - 入社2-3年目レベル: 25-40秒 - 実践的理解・応用問題',
    '上級': '上級(advanced) - ベテラン社員レベル: 40-70秒 - 深い理解・複雑な問題解決',
    'エキスパート': 'エキスパート(expert) - 専門家レベル: 50-90秒 - 最新技術・高度な実装・アーキテクチャ設計'
  }
  return descriptions[difficultyName] || `${difficultyName}レベル`
}

/**
 * 制限時間の設定（基本時間 + 問題種別による追加時間）
 */
function getTimeLimit(difficultyName: string): number {
  const timeLimits: Record<string, number> = {
    'basic': 25,
    'intermediate': 35, 
    'advanced': 50,
    'expert': 70,
    // 旧形式との互換性（「基礎」→「初級」に統一）
    '初級': 25,
    '中級': 35,
    '上級': 50,
    'エキスパート': 70
  }
  return timeLimits[difficultyName] || 45
}

/**
 * カテゴリータイプ・難易度別の問題作成ガイドライン
 */
function getQuestionGuidelines(categoryType: string, categoryName: string, difficultyName: string): string {
  const businessGuidelines = `
・ビジネス全般で活用できる汎用的なスキル・知識
・業界を問わず重要な基本概念・手法・フレームワーク
・実務で広く使われる標準的なアプローチ・ベストプラクティス
・チームワーク・コミュニケーション・問題解決に関連する内容`

  const industryGuidelines = `
・${categoryName}業界特有の専門知識・技術・ツール
・業界の最新トレンド・技術動向・規制・標準
・実際の${categoryName}業界で直面する課題・ソリューション
・${categoryName}業界のベストプラクティス・成功事例`

  const difficultyFocus = getDifficultyFocus(difficultyName)
  
  return (categoryType === 'main' ? businessGuidelines : industryGuidelines) + '\n\n' + difficultyFocus
}

/**
 * 難易度別のフォーカス内容（詳細時間設定ガイド含む）
 */
function getDifficultyFocus(difficultyName: string): string {
  const focuses: Record<string, string> = {
    'basic': '【初級レベル重点】\n・基本用語・概念の定義と理解\n・基礎的な手順・プロセスの把握\n・入門レベルでの実践例\n・制限時間: 基本10-25秒',
    'intermediate': '【中級レベル重点】\n・実践的な応用・活用方法\n・複数選択肢の比較・判断\n・業務での具体的な使用場面\n・制限時間: 基本25-40秒',
    'advanced': '【上級レベル重点】\n・複雑な問題解決・分析・設計\n・高度な判断・意思決定\n・専門性の高い実装・運用\n・制限時間: 基本40-70秒',
    'expert': '【エキスパートレベル重点】\n・最新技術・アーキテクチャ設計\n・高度な最適化・パフォーマンス\n・専門家レベルの深い洞察\n・制限時間: 基本50-90秒',
    // 旧形式との互換性（「基礎」→「初級」に統一）
    '初級': '【初級レベル重点】\n・基本用語・概念の定義と理解\n・基礎的な手順・プロセスの把握\n・入門レベルでの実践例\n・制限時間: 基本10-25秒',
    '中級': '【中級レベル重点】\n・実践的な応用・活用方法\n・複数選択肢の比較・判断\n・業務での具体的な使用場面\n・制限時間: 基本25-40秒',
    '上級': '【上級レベル重点】\n・複雑な問題解決・分析・設計\n・高度な判断・意思決定\n・専門性の高い実装・運用\n・制限時間: 基本40-70秒',
    'エキスパート': '【エキスパートレベル重点】\n・最新技術・アーキテクチャ設計\n・高度な最適化・パフォーマンス\n・専門家レベルの深い洞察\n・制限時間: 基本50-90秒'
  }
  return focuses[difficultyName] || ''
}

/**
 * Claude向け最適化プロンプト（情報整理・最適化版）
 */
export function generateClaudePrompt(data: PromptData): string {
  // 既存問題コンテキストの最適化処理
  const optimizedExistingContext = data.existingCount > 0 ? 
    generateOptimizedExistingContext(data.existingContext, data.existingCount) : ''

  return `<task>
${data.categoryName}の${data.subcategoryName}分野で、${data.difficultyName}レベルのクイズ問題を${data.count}問生成してください。
JSON形式で出力し、既存問題との重複を完全に避けてください。
${data.duplicateWarning}
</task>

<target_scope>
・カテゴリー: ${data.categoryName}（${data.categoryType === 'main' ? 'ビジネススキル' : '業界専門スキル'}）
・サブカテゴリー: ${data.subcategoryName}
・難易度: ${getDifficultyDescription(data.difficultyName)}
・問題数: ${data.count}問
</target_scope>

${optimizedExistingContext}

<question_guidelines>
${getQuestionGuidelines(data.categoryType, data.categoryName, data.difficultyName)}
</question_guidelines>

<output_format>
{
  "questions": [
    {
      "question": "具体的で明確な問題文",
      "options": {"A": "選択肢1", "B": "選択肢2", "C": "選択肢3", "D": "選択肢4"},
      "correctAnswer": "A/B/C/D（必ずランダム配置）",
      "explanation": "正解理由と学習ポイント",
      "category": "${data.categoryId}",
      "subcategory": "${data.subcategoryId}",
      "difficulty": "${data.difficultyId}",
      "timeLimit": ${getTimeLimit(data.difficultyName)},
      "tags": ["関連タグ1", "関連タグ2"],
      "source": "参考資料名",
      "hint1": "問題理解に必要な用語・概念の説明",
      "hint2": "正解導出の考え方・着眼点を示すヒント",
      "hint3": "正解判断の根拠・理由を示すヒント"
    }
  ]
}
</output_format>

<hint_guidelines>
**ヒント作成指針**：
- hint1（基礎知識）: 問題の専門用語・基本概念を理解するためのヒント
  例：「BANTとは営業における見込み客の評価指標です」
- hint2（思考誘導）: 正解選択肢を導くための考え方のヒント
  例：「競争環境を分析する際の3つの要素を考えてみましょう」
- hint3（根拠提示）: 正解判断の根拠・理由を示すヒント（答えそのものは避ける）
  例：「この手法は『顧客・競合・自社』の関係性を整理することが目的です」
</hint_guidelines>

<time_setting_guide>
**制限時間設定ガイド（重要）**：
- 基本時間: ${getDifficultyDescription(data.difficultyName).match(/(\d+-\d+秒)/)?.[1] || '10-25秒'}
- 追加時間: 計算問題+10-15秒、コード読解+15-20秒、実装パターン+20-30秒
- 最終調整: 問題複雑度に応じて±5-10秒
</time_setting_guide>

<quality_requirements>
✅ 正確性・明確性・教育的価値を確保
✅ ${data.difficultyName}レベルに適した内容・制限時間
✅ 実務で活用できる実践的な問題
✅ 正解選択肢をA/B/C/Dにランダム配置
✅ 既存問題と完全に異なる観点・アプローチ
✅ 制限時間は上記ガイドに従って適切に設定
</quality_requirements>`
}

/**
 * ChatGPT向け最適化プロンプト（情報整理・最適化版）
 */
export function generateChatGPTPrompt(data: PromptData): string {
  const optimizedExistingContext = data.existingCount > 0 ? 
    generateOptimizedExistingContext(data.existingContext, data.existingCount) : ''

  return `# ${data.categoryName}の${data.subcategoryName}分野クイズ問題生成
${data.difficultyName}レベルで${data.count}問作成。JSON形式で出力してください。
${data.duplicateWarning}

## 生成条件
- **カテゴリー**: ${data.categoryName}（${data.categoryType === 'main' ? 'ビジネススキル' : '業界専門スキル'}）
- **サブカテゴリー**: ${data.subcategoryName}
- **難易度**: ${getDifficultyDescription(data.difficultyName)}
- **問題数**: ${data.count}問

${optimizedExistingContext}

## 問題作成ガイドライン
${getQuestionGuidelines(data.categoryType, data.categoryName, data.difficultyName)}

## 出力形式
\`\`\`json
{
  "questions": [
    {
      "question": "具体的で明確な問題文",
      "options": {"A": "選択肢1", "B": "選択肢2", "C": "選択肢3", "D": "選択肢4"},
      "correctAnswer": "A/B/C/D（必ずランダム配置）",
      "explanation": "正解理由と学習ポイント",
      "category": "${data.categoryId}",
      "subcategory": "${data.subcategoryId}",
      "difficulty": "${data.difficultyId}",
      "timeLimit": ${getTimeLimit(data.difficultyName)},
      "tags": ["関連タグ1", "関連タグ2"],
      "source": "参考資料名",
      "hint1": "問題理解に必要な用語・概念の簡潔な説明",
      "hint2": "正解導出の考え方・着眼点を示すヒント",
      "hint3": "正解判断の根拠・理由を示すヒント"
    }
  ]
}
\`\`\`

## ヒント作成ガイドライン
**hint1（基礎知識）**: 問題の専門用語・基本概念を理解するためのヒント
- 例：「BANTとは営業における見込み客の評価指標です」

**hint2（思考誘導）**: 正解選択肢を導くための考え方のヒント  
- 例：「競争環境を分析する際の3つの要素を考えてみましょう」

**hint3（根拠提示）**: 正解判断の根拠・理由を示すヒント（答えは言わない）
- 例：「この手法は『顧客・競合・自社』の関係性を整理することが目的です」

## 制限時間設定ガイド（重要）
- **基本時間**: ${getDifficultyDescription(data.difficultyName).match(/(\d+-\d+秒)/)?.[1] || '10-25秒'}
- **追加時間**: 計算問題+10-15秒、コード読解+15-20秒、実装パターン+20-30秒
- **最終調整**: 問題複雑度に応じて±5-10秒

## 品質要件
1. **正確性**: 技術的に正しく最新の情報
2. **明確性**: 曖昧さのない問題文と選択肢
3. **教育的価値**: 実務に活かせる知識
4. **適切性**: ${data.difficultyName}レベルに適合・制限時間適正
5. **実践性**: 実際の業務で遭遇する場面
6. **ランダム性**: 正解選択肢をA/B/C/Dにランダム配置

⚠️ **正解選択肢（correctAnswer）は必ずA/B/C/Dをランダムに使用してください**
⚠️ **制限時間（timeLimit）は上記ガイドに従って適切に設定してください**`
}

/**
 * Gemini向け最適化プロンプト（情報整理・最適化版）
 */
export function generateGeminiPrompt(data: PromptData): string {
  const optimizedExistingContext = data.existingCount > 0 ? 
    generateOptimizedExistingContext(data.existingContext, data.existingCount) : ''

  return `## ${data.categoryName}/${data.subcategoryName}クイズ生成
${data.difficultyName}レベル・${data.count}問・JSON出力
${data.duplicateWarning}

**生成設定**
・カテゴリー: ${data.categoryName}（${data.categoryType === 'main' ? 'ビジネス' : '業界専門'}）
・サブカテゴリー: ${data.subcategoryName}
・難易度: ${getDifficultyDescription(data.difficultyName)}

${optimizedExistingContext}

**作成指針**
${getQuestionGuidelines(data.categoryType, data.categoryName, data.difficultyName)}

**JSON出力**
\`\`\`json
{
  "questions": [
    {
      "question": "明確な問題文",
      "options": {"A": "選択肢1", "B": "選択肢2", "C": "選択肢3", "D": "選択肢4"},
      "correctAnswer": "A/B/C/D（ランダム）",
      "explanation": "正解理由・学習ポイント",
      "category": "${data.categoryId}",
      "subcategory": "${data.subcategoryId}",
      "difficulty": "${data.difficultyId}",
      "timeLimit": ${getTimeLimit(data.difficultyName)},
      "tags": ["タグ1", "タグ2"],
      "source": "参考資料名",
      "hint1": "用語・概念の基礎説明",
      "hint2": "正解導出の考え方", 
      "hint3": "判断根拠の提示"
    }
  ]
}
\`\`\`

**ヒント指針**
- hint1: 用語・概念の基礎説明
- hint2: 正解導出の考え方
- hint3: 判断根拠（答えは言わない）

**制限時間ガイド**
基本時間: ${getDifficultyDescription(data.difficultyName).match(/(\d+-\d+秒)/)?.[1] || '10-25秒'} + 追加時間（計算+10-15秒、コード読解+15-20秒、実装+20-30秒）

**必須要件**
正確性・明確性・教育的価値・${data.difficultyName}レベル適合・制限時間適正・実践性・A/B/C/Dランダム配置
⚠️ correctAnswerは必ずA,B,C,Dランダム使用
⚠️ timeLimitは上記ガイド従って設定`
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