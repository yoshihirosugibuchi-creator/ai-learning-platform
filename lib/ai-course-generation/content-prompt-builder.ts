/**
 * AIコンテンツ生成プロンプトビルダー
 * アウトライン承認後の詳細コンテンツ・クイズ生成用
 */

import type { CourseGenerationWorkflow } from './types'

export interface SessionContentRequest {
  sessionId: string
  sessionTitle: string
  sessionDescription?: string
  sessionType: 'knowledge' | 'practice' | 'case_study'
  estimatedMinutes: number
  themeTitle: string
  themeDescription: string
  genreTitle: string
  genreDescription: string
}

export interface ContentGenerationPrompt {
  prompt: string
  expectedStructure: string
  sessionInfo: SessionContentRequest | SessionContentRequest[]
  totalSessions: number
  sessionIndex?: number
  generationType: 'single' | 'theme' | 'genre'
}

export class ContentPromptBuilder {
  
  /**
   * コンテンツタイプの説明
   */
  private getContentTypeGuidance(): string {
    return `
### コンテンツタイプについて

**text型**: 
- 詳細な説明文、導入文、まとめなどのテキストコンテンツ
- マークダウン形式対応（見出し、箇条書き、強調など）
- 300-800文字程度を目安に、読みやすく構造化

**key_points型**:
- 重要ポイントを箇条書きで整理したコンテンツ
- 覚えておくべき要点、チェックリスト、まとめなど
- 各ポイントは簡潔に、必要に応じて補足説明を追加

**example型**:
- 実例、ケーススタディ、具体例を示すコンテンツ
- 【実例】【ケース】【演習】などのタグを使って明確化
- 状況設定、実施内容、結果・学びの流れで構成

### セッションタイプ別の推奨構成

**knowledge型セッション**:
1. text型: 概念や理論の詳細説明
2. key_points型: 重要ポイントの整理
3. text型またはexample型: 実践への応用や具体例

**practice型セッション**:
1. text型: 演習の背景と目的説明
2. example型: 実践演習の詳細
3. key_points型: 学習ポイントと振り返り

**case_study型セッション**:
1. text型: ケースの背景説明
2. example型: ケースの詳細分析
3. key_points型またはtext型: 学びとベストプラクティス`
  }

  /**
   * セッション別詳細コンテンツ生成プロンプト作成
   */
  buildSessionContentPrompt(
    workflow: CourseGenerationWorkflow,
    sessionRequest: SessionContentRequest
  ): ContentGenerationPrompt {
    
    const { course_basic_info, generation_preferences } = workflow
    
    // 学習目標抽出
    const learningObjectives = course_basic_info.learning_objectives?.join('\n- ') || ''
    
    // generation_preferencesから正しい値を取得
    const includeQuizzes = generation_preferences?.include_quizzes ?? true // UIのデフォルト値
    const contentStyle = generation_preferences?.style || 'formal'
    const interactivityLevel = generation_preferences?.interactivity_level || 'medium'
    const sessionLength = generation_preferences?.session_length || sessionRequest.estimatedMinutes || 15
    
    // コース全体構造の文脈情報（ジャンル・テーマ情報を含む）
    const courseContext = `
## コース全体情報
**コース名**: ${course_basic_info.title}
**概要**: ${course_basic_info.description}
**対象者**: ${course_basic_info.target_audience}
**難易度**: ${course_basic_info.difficulty}

**学習目標**:
- ${learningObjectives}

## セッション位置づけ
**ジャンル**: ${sessionRequest.genreTitle}
- ${sessionRequest.genreDescription || 'ジャンル説明なし'}

**テーマ**: ${sessionRequest.themeTitle}
- ${sessionRequest.themeDescription || 'テーマ説明なし'}

**セッション**: ${sessionRequest.sessionTitle}
- ${sessionRequest.sessionDescription || 'セッション説明なし'}
`

    const generationSettings = `
## 生成設定
- **セッション時間**: ${sessionLength}分
- **コンテンツスタイル**: ${contentStyle === 'formal' ? 'フォーマル（ビジネス向け）' : contentStyle === 'casual' ? 'カジュアル（親しみやすい）' : '技術的（専門用語使用）'}
- **相互作用レベル**: ${interactivityLevel === 'low' ? '低（説明中心）' : interactivityLevel === 'high' ? '高（演習・ワーク多め）' : '中（バランス型）'}
- **クイズ生成**: ${includeQuizzes ? '必須（1問/セッション・4択形式）' : 'なし'}
- **セッションタイプ**: ${sessionRequest.sessionType === 'knowledge' ? '知識学習' : sessionRequest.sessionType === 'practice' ? '実践演習' : 'ケーススタディ'}
`

    const prompt = `# AIコンテンツ生成：セッション詳細

あなたは教育コンテンツ設計の専門家です。以下の情報を基に、具体的で実用的な学習コンテンツを生成してください。

${courseContext}

${generationSettings}

${this.getContentTypeGuidance()}

## 今回生成対象セッション
**セッションID**: \`${sessionRequest.sessionId}\`
**セッション名**: ${sessionRequest.sessionTitle}
**説明**: ${sessionRequest.sessionDescription || 'セッション詳細説明なし'}
**セッション種別**: ${sessionRequest.sessionType}
**推定学習時間**: ${sessionRequest.estimatedMinutes}分

## 出力要求

以下のJSON形式で、実際に学習者が使用できる詳細コンテンツを生成してください。
**重要**:
- content_typeは必ず 'text', 'key_points', 'example' のいずれかを使用すること
- session_idは上記のセッションIDを正確に使用すること

\`\`\`json
{
  "session_id": "${sessionRequest.sessionId}",
  "session_contents": [
    {
      "content_type": "text",
      "title": "適切なタイトル（セッション内容を反映）",
      "content": "文字列形式の詳細な説明文。マークダウン記法使用可。改行は\\nでエスケープ。",
      "duration": ${Math.floor(sessionRequest.estimatedMinutes * 0.4)},
      "display_order": 1
    },
    {
      "content_type": "key_points または example（セッションタイプに応じて選択）",
      "title": "適切なタイトル",
      "content": "文字列形式のコンテンツ。必ず文字列型で記述。",
      "duration": ${Math.floor(sessionRequest.estimatedMinutes * 0.3)},
      "display_order": 2
    },
    {
      "content_type": "text または key_points",
      "title": "まとめまたは実践への応用",
      "content": "文字列形式のまとめや次のステップ。",
      "duration": ${Math.floor(sessionRequest.estimatedMinutes * 0.3)},
      "display_order": 3
    }
  ],
  ${includeQuizzes ? `"session_quizzes": [
    {
      "question": "基本セッション内容の確認クイズ・理解度を問う問題文（50-100文字）",
      "options": [
        "選択肢1（20-40文字、現実的な内容）",
        "選択肢2（20-40文字、現実的な内容）",
        "選択肢3（20-40文字、現実的な内容）",
        "選択肢4（20-40文字、現実的な内容）"
      ],
      "correct_answer": 0,
      "explanation": "なぜこの答えが正解かを学習内容と関連付けて説明（80-150文字）",
      "display_order": 1
    }
  ],` : '"session_quizzes": [],'}
  "key_learning_points": [
    "このセッションの核となる学習ポイント1",
    "実践で活用できる重要な知識2",
    "注意すべき点や誤解しやすいポイント3"
  ],
  "recommended_next_actions": [
    "学んだ内容を実践するための具体的なアクション",
    "さらに深く学ぶための推奨事項"
  ]
}
\`\`\`

## 重要な要求事項

### コンテンツ品質
1. **具体性**: 抽象的ではなく、実際の例や数字を使用
2. **実用性**: ${course_basic_info.target_audience}が実際に使える知識・スキル
3. **段階性**: ${sessionRequest.estimatedMinutes}分で理解できる適切なボリューム
4. **文脈性**: ジャンル・テーマ全体の流れを意識した内容

### 必須ルール（フィールド名厳守）
1. **content_typeは 'text', 'key_points', 'example' のみ使用**
2. **本文は"content"フィールドに記述**（"body"や"text"ではなく必ず"content"を使用）
3. **contentフィールドは必ず文字列型**（オブジェクトや配列は不可）
4. **optionsフィールドは文字列の配列**（オブジェクト配列ではなく文字列配列）
5. **correct_answerは0-3の整数**（0ベースインデックス）
6. **display_orderは整数**（"order"ではなく"display_order"を使用）
7. **改行は\\n、引用符は\\"でエスケープ**

### 教育設計
1. **導入→説明→実践→確認**の流れを意識
2. **${interactivityLevel}の相互作用レベル**に応じた内容
3. **${course_basic_info.difficulty}レベル**に適した難易度
4. **${contentStyle}スタイル**での表現

${includeQuizzes ? `### クイズ設計（1セッション1問制限・single_choice形式）
1. **基本セッション内容の確認クイズ**: 当該セッションの理解度を確認する4択問題
2. **4択形式**: 必ず4つの選択肢を用意、正解は1つのみ
3. **選択肢は現実的で詳細**に記述
4. **explanationは学習内容と関連付けて具体的に**
5. **重要**: 1セッションあたり1問のみ生成（複数問は禁止）` : ''}

学習者が「なぜ重要か」「どう使うか」を理解できる実用的なコンテンツを生成してください。`

    const expectedStructure = `{
  "session_id": string, // 必須：プロンプトで指定されたセッションIDを使用
  "session_contents": [
    {
      "content_type": "text" | "key_points" | "example",
      "title": string,
      "content": string, // 必ず文字列型
      "duration": number,
      "display_order": number
    }
  ],
  "session_quizzes": [
    {
      "question": string,
      "options": string[], // 文字列の配列
      "correct_answer": 0-3,
      "explanation": string,
      "display_order": number
    }
  ],
  "key_learning_points": string[],
  "recommended_next_actions": string[]
}`

    return {
      prompt,
      expectedStructure,
      sessionInfo: sessionRequest,
      totalSessions: this.countTotalSessions(workflow),
      sessionIndex: this.calculateSessionIndex(workflow, sessionRequest),
      generationType: 'single'
    }
  }

  /**
   * テーマ単位のコンテンツ生成プロンプト作成
   */
  buildThemeContentPrompt(
    workflow: CourseGenerationWorkflow,
    themeTitle: string,
    sessionRequests: SessionContentRequest[]
  ): ContentGenerationPrompt {
    
    const { course_basic_info, generation_preferences } = workflow
    
    // generation_preferencesから正しい値を取得
    const includeQuizzes = generation_preferences?.include_quizzes ?? true
    const contentStyle = generation_preferences?.style || 'formal'
    const interactivityLevel = generation_preferences?.interactivity_level || 'medium'
    
    const sessionList = sessionRequests.map((s, i) =>
      `${i + 1}. **${s.sessionTitle}** (ID: \`${s.sessionId}\`, ${s.sessionType}, ${s.estimatedMinutes}分)`
    ).join('\n')

    const prompt = `# AIコンテンツ生成：テーマ単位

あなたは教育コンテンツ設計の専門家です。以下のテーマに含まれるすべてのセッションのコンテンツを一括生成してください。

## コース情報
**コース名**: ${course_basic_info.title}
**対象者**: ${course_basic_info.target_audience}
**難易度**: ${course_basic_info.difficulty}

## テーマ情報
**テーマ名**: ${themeTitle}
**セッション一覧**:
${sessionList}

## 生成設定
- **コンテンツスタイル**: ${contentStyle}
- **相互作用レベル**: ${interactivityLevel}
- **クイズ生成**: ${includeQuizzes ? '各セッションに1問・4択形式' : 'なし'}

${this.getContentTypeGuidance()}

## 出力要求

各セッションごとに、前述の形式でコンテンツを生成してください。
セッション間の関連性と段階的な学習の流れを意識してください。

**重要（必須ルール）**:
- 各セッションのsession_idは、上記セッション一覧に記載されたIDを正確に使用
- 本文は**"content"フィールド**に記述（"body"や"text"ではなく必ず"content"）
- contentフィールドは文字列型（オブジェクトや配列は不可）
- optionsは文字列の配列（オブジェクト配列ではなく \`["選択肢1", "選択肢2", ...]\`）
- **"display_order"フィールド**を使用（"order"ではなく）

\`\`\`json
{
  "sessions": [
${sessionRequests.map(s => `    {
      "session_id": "${s.sessionId}",
      "session_contents": [
        {
          "content_type": "text",
          "title": "タイトル",
          "content": "本文をここに記述（bodyではなくcontent）",
          "duration": 5,
          "display_order": 1
        }
      ],
      "session_quizzes": [
        {
          "question": "問題文",
          "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
          "correct_answer": 0,
          "explanation": "解説",
          "display_order": 1
        }
      ],
      "key_learning_points": [...],
      "recommended_next_actions": [...]
    }`).join(',\n')}
  ]
}
\`\`\`
`

    return {
      prompt,
      expectedStructure: '{ "sessions": [...] }',
      sessionInfo: sessionRequests,
      totalSessions: this.countTotalSessions(workflow),
      generationType: 'theme'
    }
  }

  /**
   * ジャンル単位のコンテンツ生成プロンプト作成
   */
  buildGenreContentPrompt(
    workflow: CourseGenerationWorkflow,
    genreTitle: string,
    sessionRequests: SessionContentRequest[]
  ): ContentGenerationPrompt {
    
    const { course_basic_info, generation_preferences } = workflow
    
    // generation_preferencesから正しい値を取得
    const includeQuizzes = generation_preferences?.include_quizzes ?? true
    const contentStyle = generation_preferences?.style || 'formal'
    const interactivityLevel = generation_preferences?.interactivity_level || 'medium'
    
    // テーマごとにセッションをグループ化
    const themeGroups = sessionRequests.reduce((acc, session) => {
      if (!acc[session.themeTitle]) {
        acc[session.themeTitle] = []
      }
      acc[session.themeTitle].push(session)
      return acc
    }, {} as Record<string, SessionContentRequest[]>)

    const themeList = Object.entries(themeGroups).map(([theme, sessions]) =>
      `### ${theme}\n${sessions.map((s, i) =>
        `  ${i + 1}. **${s.sessionTitle}** (ID: \`${s.sessionId}\`, ${s.sessionType}, ${s.estimatedMinutes}分)`
      ).join('\n')}`
    ).join('\n\n')

    const prompt = `# AIコンテンツ生成：ジャンル単位

あなたは教育コンテンツ設計の専門家です。以下のジャンル全体のコンテンツを体系的に生成してください。

## コース情報
**コース名**: ${course_basic_info.title}
**対象者**: ${course_basic_info.target_audience}
**難易度**: ${course_basic_info.difficulty}

## ジャンル情報
**ジャンル名**: ${genreTitle}

**テーマ・セッション構成**:
${themeList}

## 生成設定
- **コンテンツスタイル**: ${contentStyle}
- **相互作用レベル**: ${interactivityLevel}
- **クイズ生成**: ${includeQuizzes ? '各セッションに1問・4択形式' : 'なし'}

${this.getContentTypeGuidance()}

## 出力要求

ジャンル全体の学習の流れを意識し、基礎から応用へ段階的に深まるようにコンテンツを生成してください。
各テーマ・セッション間の関連性を明確にし、学習者が体系的に理解できるよう配慮してください。

**重要（必須ルール）**:
- 各セッションのsession_idは、上記セッション一覧に記載されたIDを正確に使用
- 本文は**"content"フィールド**に記述（"body"や"text"ではなく必ず"content"）
- contentフィールドは文字列型（オブジェクトや配列は不可）
- optionsは文字列の配列（オブジェクト配列ではなく \`["選択肢1", "選択肢2", ...]\`）
- **"display_order"フィールド**を使用（"order"ではなく）

\`\`\`json
{
  "genre": "${genreTitle}",
  "themes": [
${Object.entries(themeGroups).map(([themeName, sessions]) => `    {
      "theme_title": "${themeName}",
      "sessions": [
${sessions.map(s => `        {
          "session_id": "${s.sessionId}",
          "session_contents": [
            {
              "content_type": "text",
              "title": "タイトル",
              "content": "本文（bodyではなくcontent）",
              "duration": 5,
              "display_order": 1
            }
          ],
          "session_quizzes": [
            {
              "question": "問題文",
              "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
              "correct_answer": 0,
              "explanation": "解説",
              "display_order": 1
            }
          ],
          "key_learning_points": [...],
          "recommended_next_actions": [...]
        }`).join(',\n')}
      ]
    }`).join(',\n')}
  ]
}
\`\`\`
`

    return {
      prompt,
      expectedStructure: '{ "genre": "...", "themes": [...] }',
      sessionInfo: sessionRequests,
      totalSessions: this.countTotalSessions(workflow),
      generationType: 'genre'
    }
  }

  /**
   * 一括コンテンツ生成プロンプト作成（互換性のため維持）
   */
  buildBatchContentPrompt(
    workflow: CourseGenerationWorkflow,
    sessionRequests: SessionContentRequest[]
  ): {
    totalPrompts: string[]
    sessionCount: number
    estimatedTokens: number
  } {
    const prompts = sessionRequests.map(request => 
      this.buildSessionContentPrompt(workflow, request).prompt
    )
    
    const totalChars = prompts.reduce((sum, p) => sum + p.length, 0)
    const estimatedTokens = Math.ceil(totalChars / 4) // 概算
    
    return {
      totalPrompts: prompts,
      sessionCount: sessionRequests.length,
      estimatedTokens
    }
  }

  /**
   * 全セッション数計算
   */
  private countTotalSessions(workflow: CourseGenerationWorkflow): number {
    let count = 0
    workflow.outline_data?.genres?.forEach(genre => {
      genre.themes?.forEach(theme => {
        count += theme.sessions?.length || 0
      })
    })
    return count
  }

  /**
   * セッションインデックス計算
   */
  private calculateSessionIndex(
    workflow: CourseGenerationWorkflow,
    sessionRequest: SessionContentRequest
  ): number {
    let index = 0
    let found = false
    
    workflow.outline_data?.genres?.forEach(genre => {
      if (!found) {
        genre.themes?.forEach(theme => {
          if (!found) {
            theme.sessions?.forEach(session => {
              if (!found) {
                index++
                if (session.id === sessionRequest.sessionId) {
                  found = true
                }
              }
            })
          }
        })
      }
    })
    
    return index
  }
}

// シングルトン
export const contentPromptBuilder = new ContentPromptBuilder()