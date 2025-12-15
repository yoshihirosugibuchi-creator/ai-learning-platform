/**
 * AIコンテンツ生成プロンプトビルダー
 * アウトライン承認後の詳細コンテンツ・クイズ生成用
 */

import type { CourseGenerationWorkflow } from './types'

export interface SessionContentRequest {
  sessionId: string
  sessionTitle: string
  sessionDescription?: string
  sessionType: 'content' | 'quiz' | 'exercise'
  estimatedMinutes: number
  themeTitle: string
  themeDescription: string
  genreTitle: string
  genreDescription: string
}

export interface ContentGenerationPrompt {
  prompt: string
  expectedStructure: string
  sessionInfo: SessionContentRequest
  totalSessions: number
  sessionIndex: number
}

export class ContentPromptBuilder {
  
  /**
   * セッション別詳細コンテンツ生成プロンプト作成
   */
  buildSessionContentPrompt(
    workflow: CourseGenerationWorkflow,
    sessionRequest: SessionContentRequest
  ): ContentGenerationPrompt {
    
    const { course_basic_info, source_materials, generation_preferences } = workflow
    
    // 参考資料統合
    const sourceMaterialsText = source_materials?.map((source, index) => `
=== 参考資料${index + 1}: ${source.title || 'Untitled'} ===
種類: ${source.type}
${source.content || ''}

---`).join('\n') || ''

    // 学習目標抽出
    const learningObjectives = course_basic_info.learning_objectives?.join('\n- ') || ''
    
    // コース全体構造の文脈情報
    const courseContext = `
## コース全体情報
**コース名**: ${course_basic_info.title}
**概要**: ${course_basic_info.description}
**対象者**: ${course_basic_info.target_audience}
**難易度**: ${course_basic_info.difficulty}

**学習目標**:
- ${learningObjectives}

**ジャンル階層**:
${sessionRequest.genreTitle} > ${sessionRequest.themeTitle} > ${sessionRequest.sessionTitle}
`

    // 生成設定情報
    const generationSettings = `
## 生成設定
- **セッション時間**: ${sessionRequest.estimatedMinutes}分
- **コンテンツスタイル**: ${generation_preferences?.style || 'practical'}
- **相互作用レベル**: ${generation_preferences?.interactivity_level || 'medium'}
- **クイズ含有**: ${generation_preferences?.include_quizzes ? 'あり' : 'なし'}
`

    const prompt = `# AIコンテンツ生成：セッション詳細

あなたは教育コンテンツ設計の専門家です。以下の情報を基に、具体的で実用的な学習コンテンツを生成してください。

${courseContext}

${generationSettings}

## 今回生成対象セッション
**セッション名**: ${sessionRequest.sessionTitle}
**説明**: ${sessionRequest.sessionDescription || 'セッション詳細説明なし'}
**セッション種別**: ${sessionRequest.sessionType}
**推定学習時間**: ${sessionRequest.estimatedMinutes}分

## 参考資料
${sourceMaterialsText}

## 出力要求

以下のJSON形式で、実際に学習者が使用できる詳細コンテンツを生成してください：

\`\`\`json
{
  "session_contents": [
    {
      "content_type": "text",
      "title": "導入：${sessionRequest.sessionTitle}とは",
      "content": "マークダウン形式の詳細説明文章（300-800文字）\\n\\n### 重要なポイント\\n- ポイント1\\n- ポイント2",
      "duration": 5,
      "display_order": 1
    },
    {
      "content_type": "exercise",
      "title": "理解確認：${sessionRequest.sessionTitle}の応用",
      "content": {
        "exercise_type": "reflection",
        "instructions": "以下の質問について考えてみましょう",
        "questions": [
          "具体的な質問1",
          "具体的な質問2"
        ],
        "expected_answers": [
          "期待される回答の要点1",
          "期待される回答の要点2"
        ]
      },
      "duration": ${Math.max(3, Math.floor(sessionRequest.estimatedMinutes * 0.3))},
      "display_order": 2
    }
  ],
  "session_quizzes": [
    {
      "question": "${sessionRequest.sessionTitle}に関する具体的な問題文",
      "options": [
        "選択肢1（詳細で現実的）",
        "選択肢2（詳細で現実的）", 
        "選択肢3（詳細で現実的）",
        "選択肢4（詳細で現実的）"
      ],
      "correct_answer": 0,
      "explanation": "正解の理由を参考資料に基づいて詳しく説明（100-200文字）",
      "display_order": 1
    },
    {
      "question": "実践的な応用問題",
      "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
      "correct_answer": 1,
      "explanation": "正解の根拠と実際の活用場面について",
      "display_order": 2
    }
  ],
  "key_learning_points": [
    "${sessionRequest.sessionTitle}の基本概念",
    "実際の活用場面",
    "注意すべきポイント"
  ],
  "recommended_next_actions": [
    "このセッションで学んだことを実践する具体的なアクション1",
    "関連分野で深く学ぶべき内容2"
  ]
}
\`\`\`

## 重要な要求事項

### コンテンツ品質
1. **具体性**: 抽象的ではなく、実際の例や数字を使用
2. **実用性**: 学習者が実際に使える知識・スキル
3. **段階性**: ${sessionRequest.estimatedMinutes}分で理解できる適切なボリューム
4. **正確性**: 参考資料の内容に基づいた正確な情報

### 教育設計
1. **導入→説明→練習→確認**の流れを意識
2. **アクティブラーニング**要素を含める
3. **${course_basic_info.difficulty}レベル**に適した難易度
4. **${course_basic_info.target_audience}**向けの言葉遣いと例

### 技術要件
1. **JSON形式厳守**
2. **エスケープ処理**（改行は\\n、引用符は\\"）
3. **content_type**: 'text' | 'exercise' | 'image' | 'video'
4. **必須フィールド**をすべて含める

参考資料を十分に活用し、学習者が「なぜ重要か」「どう使うか」を理解できる実用的なコンテンツを生成してください。`

    const expectedStructure = `{
  "session_contents": [セッションコンテンツ配列],
  "session_quizzes": [理解度確認クイズ配列], 
  "key_learning_points": [重要学習ポイント配列],
  "recommended_next_actions": [推奨次アクション配列]
}`

    return {
      prompt,
      expectedStructure,
      sessionInfo: sessionRequest,
      totalSessions: this.countTotalSessions(workflow),
      sessionIndex: this.calculateSessionIndex(workflow, sessionRequest)
    }
  }

  /**
   * テーマ完了時ナレッジカード生成プロンプト
   */
  buildRewardCardPrompt(
    workflow: CourseGenerationWorkflow,
    themeId: string,
    completedSessions: SessionContentRequest[]
  ): string {
    
    const theme = this.findThemeById(workflow, themeId)
    if (!theme) return ''

    const sessionsText = completedSessions.map(s => `- ${s.sessionTitle}`).join('\n')
    
    return `# ナレッジカード生成

テーマ「${theme.title}」の学習完了を祝うナレッジカードを生成してください。

## 完了したセッション
${sessionsText}

## 出力形式
\`\`\`json
{
  "type": "knowledge_card",
  "title": "${theme.title}修了",
  "description": "達成内容の簡潔な説明（50文字以内）",
  "achievement_data": {
    "sessions_completed": ${completedSessions.length},
    "key_learnings": ["学習した重要概念1", "学習した重要概念2", "学習した重要概念3"],
    "mastery_level": "基礎|応用|上級",
    "next_recommendations": ["次に学ぶべき内容1", "実践推奨アクション2"]
  },
  "visual_data": {
    "icon": "適切な絵文字",
    "color_scheme": "blue|green|purple|orange|red",
    "background_pattern": "achievement|knowledge|skill|certificate"
  }
}
\`\`\``
  }

  /**
   * コース修了証バッジ生成プロンプト
   */
  buildCompletionBadgePrompt(
    workflow: CourseGenerationWorkflow,
    completedThemes: string[]
  ): string {
    
    const { course_basic_info } = workflow
    const totalThemes = this.countTotalThemes(workflow)
    
    return `# コース修了証バッジ生成

コース「${course_basic_info.title}」の修了証バッジを生成してください。

## コース情報
- **完了テーマ数**: ${completedThemes.length}/${totalThemes}
- **対象者**: ${course_basic_info.target_audience}
- **学習目標達成度**: 100%

## 出力形式
\`\`\`json
{
  "type": "completion_certificate",
  "title": "${course_basic_info.title} 修了証",
  "description": "${course_basic_info.description}",
  "certificate_data": {
    "course_name": "${course_basic_info.title}",
    "completion_date": "発行時自動設定",
    "achievement_level": "${course_basic_info.difficulty}",
    "total_learning_hours": "${course_basic_info.estimated_duration}",
    "skills_acquired": ${JSON.stringify(course_basic_info.learning_objectives)},
    "certificate_id": "自動生成UUID"
  },
  "visual_data": {
    "template": "modern|classic|minimal|elegant",
    "primary_color": "course_theme_color",
    "accent_color": "complementary_color",
    "logo_position": "top|bottom|corner"
  },
  "validity": {
    "expires": true,
    "expiry_period": "2_years",
    "renewal_requirements": ["継続学習推奨コース"]
  }
}
\`\`\``
  }

  // ヘルパーメソッド
  private countTotalSessions(workflow: CourseGenerationWorkflow): number {
    return workflow.outline_data?.genres.reduce((total, genre) => 
      total + genre.themes.reduce((themeTotal, theme) => 
        themeTotal + theme.sessions.length, 0), 0) || 0
  }

  private calculateSessionIndex(workflow: CourseGenerationWorkflow, request: SessionContentRequest): number {
    let index = 0
    const genres = workflow.outline_data?.genres || []
    
    for (const genre of genres) {
      for (const theme of genre.themes) {
        for (const session of theme.sessions) {
          if (session.id === request.sessionId) {
            return index
          }
          index++
        }
      }
    }
    return index
  }

  private findThemeById(workflow: CourseGenerationWorkflow, themeId: string) {
    const genres = workflow.outline_data?.genres || []
    for (const genre of genres) {
      const theme = genre.themes.find(t => t.id === themeId)
      if (theme) return theme
    }
    return null
  }

  private countTotalThemes(workflow: CourseGenerationWorkflow): number {
    return workflow.outline_data?.genres.reduce((total, genre) => 
      total + genre.themes.length, 0) || 0
  }
}

export const contentPromptBuilder = new ContentPromptBuilder()