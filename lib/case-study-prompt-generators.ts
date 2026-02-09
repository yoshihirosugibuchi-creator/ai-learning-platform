/**
 * ケーススタディ問題AI生成用プロンプトジェネレーター
 *
 * AIモデル別に最適化されたプロンプトテンプレートを生成
 *
 * v2: 職種、フェーズ、情報明確さレベル、good_examples、common_mistakes追加
 * v3: question_type対応（multiple_choice, descriptive, hybrid）
 * v4: question_type をDB値に統一（single, multiple, text, hybrid）
 *     - single: 単一選択のみ（1つだけ選択）
 *     - multiple: 複数選択のみ（1〜4つ選択可能、記述なし）
 *     - text: 記述式のみ（選択肢なし）
 *     - hybrid: 複数選択＋記述（1〜4つ選択可能＋理由記述）
 */

// 問題形式タイプ（DB値に統一）
export type QuestionType = 'single' | 'multiple' | 'text' | 'hybrid'

// 旧UI値からDB値への変換マップ（後方互換性用）
export const questionTypeToDbValue: Record<string, QuestionType> = {
  'multiple_choice': 'multiple',
  'descriptive': 'text',
  'hybrid': 'hybrid',
  'single': 'single',
  'multiple': 'multiple',
  'text': 'text',
}

// 図表形式タイプ
export type DiagramStyle = 'mermaid' | 'ascii' | 'none'

export interface PromptGeneratorParams {
  // 基本設定
  categoryId: string
  categoryName: string
  subcategoryId: string
  subcategoryName: string
  difficulty: string

  // シナリオ設定
  industry: string           // 業界名
  industryCode?: string      // 業界コード
  jobRole: string            // 職種名
  jobRoleCode?: string       // 職種コード
  businessPhase: string      // フェーズ名
  businessPhaseCode?: string // フェーズコード
  scenarioType: string       // シナリオタイプ名
  scenarioTypeCode?: string  // シナリオタイプコード

  // 難易度詳細
  infoClarity?: string       // 情報明確さレベル (level1/level2/level3)
  infoClarityName?: string   // 情報明確さ表示名

  // 構成設定
  stepCount: number
  questionType?: QuestionType // 問題形式（デフォルト: hybrid）
  diagramStyle?: DiagramStyle // 図表形式（デフォルト: mermaid）
  customPrompt?: string      // 追加指示
  aiModel: 'claude' | 'chatgpt' | 'gemini'

  // DB駆動型マスタデータ（オプション - 未指定時はデフォルト値使用）
  stepFrameworkText?: string   // APIから取得したステップフレームワークテキスト
  rubricAxesText?: string      // APIから取得したルーブリック軸テキスト
}

const difficultyDescriptions: Record<string, string> = {
  basic: '初級（基本的な概念の理解と適用、明確な正解がある）',
  intermediate: '中級（複数の視点からの分析、トレードオフの検討が必要）',
  advanced: '上級（複雑な状況判断、創造的な解決策の提案が必要）',
  expert: 'エキスパート（不確実性の高い状況、戦略的な意思決定が必要）',
}

const infoClarityDescriptions: Record<string, string> = {
  level1: 'Level 1: 情報が整理済み、選択肢が明確、正解が比較的分かりやすい',
  level2: 'Level 2: 一部情報不足、曖昧な選択肢あり、複数の解釈が可能',
  level3: 'Level 3: 情報過多、ノイズあり、トレードオフ判断が必要、政治的要因も含む',
}

// デフォルトのステップフレームワーク（API未取得時のフォールバック）
const DEFAULT_STEP_FRAMEWORK = `
【5ステップ標準フレームワーク】
Step 1: 状況把握 - 与えられた情報から重要なポイントを抽出する
  → 主要評価軸: problem_setting（問題設定力）, structuring_logic（ロジック構造化）
Step 2: 課題定義 - 本質的な課題を特定し、解くべき問いを設定する
  → 主要評価軸: problem_setting（問題設定力）, perspective_diversity（視点の多様性）
Step 3: 仮説立案 - 課題解決に向けた仮説を構築する
  → 主要評価軸: hypothesis_thinking（仮説思考）, originality（独自性）
Step 4: 分析プラン - 仮説検証のための分析アプローチを設計する
  → 主要評価軸: analysis_design（分析設計）, feasibility（実現可能性）
Step 5: 提言策定 - 具体的な施策と実行計画を提案する
  → 主要評価軸: proposal_specificity（提案具体性）, impact（インパクト）, expression（表現力）

【拡張ステップ（6〜8ステップの場合）】
Step 6: リスク評価 - 施策実行時のリスクと対策を検討する
  → 主要評価軸: feasibility（実現可能性）, perspective_diversity（視点の多様性）
Step 7: 実行計画詳細 - タイムライン、マイルストーン、KPIを設定する
  → 主要評価軸: proposal_specificity（提案具体性）, feasibility（実現可能性）
Step 8: モニタリング設計 - 効果測定と改善サイクルの仕組みを設計する
  → 主要評価軸: analysis_design（分析設計）, impact（インパクト）
`

// デフォルトのルーブリック軸（API未取得時のフォールバック）
const DEFAULT_RUBRIC_AXES = `
【10軸ルーブリック評価システム】
グループA: 思考基盤
  - problem_setting（問題設定力）: 事象の本質を見抜き、解くべき問いを設定する力
  - structuring_logic（ロジック構造化）: 情報や論点を整理し、論理的に構造化する力

グループB: 価値創造
  - hypothesis_thinking（仮説思考）: 限られた情報から仮説を立て、検証する力
  - proposal_specificity（提案具体性）: 実行可能な施策を具体的に提案する力

グループC: 分析・検証
  - analysis_design（分析設計）: 仮説検証のための分析アプローチを設計する力
  - feasibility（実現可能性）: 制約条件を考慮し、現実的な計画を立てる力

グループD: 実務適用
  - perspective_diversity（視点の多様性）: 複数のステークホルダー視点から検討する力
  - impact（インパクト）: 提案の効果の大きさと範囲を見極める力

グループE: コミュニケーション
  - expression（表現力）: 考えを明確かつ簡潔に伝える力
  - originality（独自性）: 既存の枠にとらわれない創造的なアイデアを生み出す力
`

// 問題形式の説明（UIで使用するためエクスポート）
export const questionTypeDescriptions: Record<QuestionType, string> = {
  single: '単一選択のみ',
  multiple: '複数選択のみ',
  text: '記述式のみ',
  hybrid: '複数選択＋記述',
}

// 問題形式の詳細説明（UI補足用）
export const questionTypeDetails: Record<QuestionType, string> = {
  single: '4択から1つだけ選ぶ形式（記述なし）',
  multiple: '4択から1〜4つ選べる形式（記述なし）',
  text: '選択肢なし、記述のみで回答する形式',
  hybrid: '4択から1〜4つ選んだ上で理由を記述する形式',
}

// 問題形式別のステップJSONスキーマ例を生成（Claude用）
function buildStepJsonExampleClaude(questionType: QuestionType, params: PromptGeneratorParams): string {
  const baseStep = `{
      "step_number": 1,
      "step_name": "状況把握",
      "description": "このステップで学習者に求めること（100-200文字）",
      "category_id": "${params.categoryId}",
      "subcategory_id": "${params.subcategoryId}",
      "question_type": "${questionType}",`

  switch (questionType) {
    case 'single':
      // 単一選択のみ：4択から1つだけ選ぶ（記述なし）
      return `${baseStep}
      "options": [
        {"id": "1a", "text": "選択肢テキスト", "is_correct": true, "partial_score": 4},
        {"id": "1b", "text": "選択肢テキスト", "is_correct": false, "partial_score": 0},
        {"id": "1c", "text": "選択肢テキスト", "is_correct": false, "partial_score": 0},
        {"id": "1d", "text": "選択肢テキスト", "is_correct": false, "partial_score": 0}
      ],
      "model_answer": {
        "ideal_choices": ["1a"],
        "choice_explanations": {
          "1a": "【正解】この選択肢が正解の理由：○○という観点から最も適切なアプローチである。",
          "1b": "【不正解】この選択肢が不適切な理由：△△の考慮が欠けている。",
          "1c": "【不正解】この選択肢が不適切な理由：前提となる××が誤っている。",
          "1d": "【不正解】この選択肢が不適切な理由：□□の観点が不足している。"
        },
        "essential_points": [],
        "good_examples": [],
        "common_mistakes": ["選択肢1bを選ぶ（△△を見落としている）", "選択肢1cを選ぶ（××を誤解している）"],
        "scoring_anchors": {
          "1": "1点：不正解選択肢を選択",
          "3": "3点：部分的に正しい選択肢を選択",
          "5": "5点：正解選択肢を選択"
        }
      },
      "hint": "ヒント文（50-100文字）",
      "target_skills": ["problem_setting", "structuring_logic"],
      "max_score": 20
    }`

    case 'multiple':
      // 複数選択のみ：4択から1〜4つ選べる（記述なし）
      return `${baseStep}
      "options": [
        {"id": "1a", "text": "選択肢テキスト", "is_correct": true, "partial_score": 4},
        {"id": "1b", "text": "選択肢テキスト", "is_correct": true, "partial_score": 3},
        {"id": "1c", "text": "選択肢テキスト", "is_correct": false, "partial_score": 0},
        {"id": "1d", "text": "選択肢テキスト", "is_correct": false, "partial_score": 0}
      ],
      "model_answer": {
        "ideal_choices": ["1a", "1b"],
        "choice_explanations": {
          "1a": "【正解】この選択肢が正解の理由：○○という観点から最も適切なアプローチである。",
          "1b": "【正解】この選択肢も正解の理由：□□の視点を含んでおり有用。",
          "1c": "【不正解】この選択肢が不適切な理由：前提となる××が誤っている。",
          "1d": "【不正解】この選択肢が不適切な理由：□□の観点が不足している。"
        },
        "essential_points": [],
        "good_examples": [],
        "common_mistakes": ["1aのみを選び1bを見落とす", "1cを選ぶ（××を誤解している）"],
        "scoring_anchors": {
          "1": "1点：正解選択肢を1つも選ばず、不正解のみ選択",
          "2": "2点：正解選択肢を1つ選んだが、不正解も含む",
          "3": "3点：正解選択肢を1つ選び、不正解は選ばず",
          "4": "4点：正解選択肢を全て選んだが、不正解も1つ含む",
          "5": "5点：正解選択肢を全て選び、不正解は選ばず"
        }
      },
      "hint": "ヒント文（50-100文字）",
      "target_skills": ["problem_setting", "structuring_logic"],
      "max_score": 20
    }`

    case 'text':
      // 記述式のみ：選択肢なし、記述のみで回答
      return `${baseStep}
      "options": [],
      "model_answer": {
        "ideal_choices": [],
        "choice_explanations": {},
        "essential_points": ["キーワード1", "キーワード2", "キーワード3", "キーワード4", "キーワード5"],
        "good_examples": [
          "優秀回答例1（200-300文字）：○○の観点から△△を分析し、□□と××の関係性を明確にした上で、具体的な課題として☆☆を特定している。さらに、その根拠として数値データや事実を用いて論理的に説明しており、全体の構造が明確である。",
          "優秀回答例2（200-300文字）：別のアプローチとして、◇◇の視点から問題を捉え直し、▽▽という仮説を立てている。この仮説に基づき、検証可能な形で論点を整理しており、独自の視点が含まれている。"
        ],
        "common_mistakes": [
          "表面的な現象のみを列挙し、本質的な課題に踏み込んでいない",
          "因果関係の分析が不十分で、結論が飛躍している",
          "根拠となるデータや事実の引用がなく、主観的な意見に終始している"
        ],
        "scoring_anchors": {
          "1": "1点：課題の認識が曖昧または的外れ、構造化されていない",
          "2": "2点：課題を認識しているが表層的、論理展開が弱い",
          "3": "3点：課題を適切に認識し論理的に説明しているが、深さや独自性が不足",
          "4": "4点：本質的課題を特定し、根拠を示して論理的に展開している",
          "5": "5点：本質的課題を正確に特定し、独自の視点で深い考察を加えている"
        }
      },
      "hint": "ヒント文（50-100文字、思考の方向性を示唆）",
      "target_skills": ["problem_setting", "structuring_logic"],
      "max_score": 20
    }`

    case 'hybrid':
    default:
      // 複数選択＋記述：4択から1〜4つ選び、さらに理由を記述
      return `${baseStep}
      "options": [
        {"id": "1a", "text": "選択肢テキスト", "is_correct": true, "partial_score": 4},
        {"id": "1b", "text": "選択肢テキスト", "is_correct": true, "partial_score": 3},
        {"id": "1c", "text": "選択肢テキスト", "is_correct": true, "partial_score": 2},
        {"id": "1d", "text": "選択肢テキスト", "is_correct": false, "partial_score": 0}
      ],
      "model_answer": {
        "ideal_choices": ["1a", "1b", "1c"],
        "choice_explanations": {
          "1a": "【正解】この選択肢が最も適切な理由：○○という観点から△△を正確に捉えており、ステップの目的に最も合致している。",
          "1b": "【正解】この選択肢も適切な理由：□□の視点を含んでおり、問題解決に有用なアプローチである。",
          "1c": "【部分点】この選択肢が部分的に正解の理由：方向性は正しいが、××の考慮が不足している。",
          "1d": "【不正解】この選択肢が不適切な理由：△△という誤った前提に基づいており、実際の状況と合致しない。"
        },
        "essential_points": ["キーワード1", "キーワード2", "キーワード3"],
        "good_examples": ["優秀回答例（100-150文字）：○○という観点から△△を分析し、□□という結論を導いている。特に××の視点が優れている。"],
        "common_mistakes": ["表層的な現象のみに着目し本質を見落とす", "因果関係を逆に捉える"],
        "scoring_anchors": {
          "1": "1点の基準：選択・記述ともに的外れ",
          "2": "2点の基準：選択は部分的に正しいが、記述が表層的",
          "3": "3点の基準：選択は概ね正しいが、記述の論理性や深さが不足",
          "4": "4点の基準：選択が正しく、記述も論理的で根拠がある",
          "5": "5点の基準：選択が完璧で、記述に独自の視点と深い考察がある"
        }
      },
      "hint": "ヒント文（50-100文字、直接答えを示さず思考の方向性を示唆）",
      "target_skills": ["problem_setting", "structuring_logic"],
      "max_score": 20
    }`
  }
}

// 図表形式別のガイダンスを生成
function buildDiagramGuidance(diagramStyle: DiagramStyle): string {
  switch (diagramStyle) {
    case 'mermaid':
      return `
【図表・ダイアグラム（Mermaid形式）】
ケーステキストや選択肢で図を使用する場合、Mermaid記法を使用してください。
- フローチャート、組織図、プロセス図などはMermaid記法で記述
- ASCIIアートやテキストベースの図は使用禁止

Mermaid記法の例:
\`\`\`mermaid
graph TD
    A["📥 現状分析"] --> B{"課題特定"}
    B -->|重要| C["⚡ 優先対応"]
    B -->|軽微| D["📋 改善計画"]
\`\`\`

重要な構文ルール:
- subgraph名は英語ID + ラベル形式: subgraph sales ["📊 営業部門"]
- ノードラベル内での改行（\\n）は禁止（スペースで区切る）
- 絵文字は使用OK（📊、⚙️、📋等で視覚的に分かりやすく）`

    case 'ascii':
      return `
【図表・ダイアグラム（テキスト形式）】
ケーステキストや選択肢で図を使用する場合、シンプルなテキスト図を使用してください。
- Mermaid記法は使用禁止
- 罫線文字（─│┌┐└┘→←↑↓）を使用してシンプルに表現

テキスト図の例:
\`\`\`
┌─────────┐    ┌─────────┐    ┌─────────┐
│ 現状分析 │ → │ 課題特定 │ → │ 施策立案 │
└─────────┘    └─────────┘    └─────────┘
\`\`\``

    case 'none':
      return `
【図表について】
ケーステキストや選択肢で図は使用しないでください。
- フローチャートやダイアグラムは使用禁止
- 関係性は文章や箇条書きで説明
- プロセスは番号付きリストで表現`

    default:
      return ''
  }
}

// 問題形式別の要件テキストを生成
function buildQuestionTypeRequirements(questionType: QuestionType): string {
  switch (questionType) {
    case 'single':
      return `【各ステップの要件】
- question_type: "single"（単一選択のみ - 4択から1つだけ選ぶ、記述なし）
- options: 4択（id, text, is_correct, partial_score付き）
  - 正解選択肢は1つのみ、不正解は3つ
  - partial_scoreは0-4の整数（正解=4、不正解=0）
- model_answer: 以下の全フィールドを含むこと
  - ideal_choices: 正解選択肢のID配列（1つのみ）
  - choice_explanations: 各選択肢の解説（なぜ正解/不正解なのか）★必須
    - 形式: {"1a": "【正解】この選択肢が正解の理由...", "1b": "【不正解】...", ...}
    - 全選択肢（正解・不正解両方）に解説を付けること
  - essential_points: 空配列[]（記述なしのため不要）
  - good_examples: 空配列[]（記述なしのため不要）
  - common_mistakes: よくある選択ミスのパターン（2-3個）★必須
  - scoring_anchors: 選択結果による採点基準`

    case 'multiple':
      return `【各ステップの要件】
- question_type: "multiple"（複数選択のみ - 4択から1〜4つ選べる、記述なし）
- options: 4択（id, text, is_correct, partial_score付き）
  - 正解選択肢は1-3個、不正解は1-3個
  - partial_scoreは0-4の整数（最重要=4、重要=3、部分点=1-2、不正解=0）
  - 学習者は1つ以上を選択可能（全て選んでも可）
- model_answer: 以下の全フィールドを含むこと
  - ideal_choices: 正解選択肢のID配列（複数可）
  - choice_explanations: 各選択肢の解説（なぜ正解/不正解なのか）★必須
    - 形式: {"1a": "【正解】この選択肢が正解の理由...", "1b": "【不正解】...", ...}
    - 全選択肢（正解・不正解両方）に解説を付けること
  - essential_points: 空配列[]（記述なしのため不要）
  - good_examples: 空配列[]（記述なしのため不要）
  - common_mistakes: よくある選択ミスのパターン（2-3個）★必須
  - scoring_anchors: 選択の組み合わせによる採点基準（正解を全て選び不正解を選ばない=満点）`

    case 'text':
      return `【各ステップの要件】
- question_type: "text"（記述式のみ - 選択肢なし）
- options: 空配列[]（選択肢なし）
- model_answer: 以下の全フィールドを含むこと
  - ideal_choices: 空配列[]（選択肢なし）
  - choice_explanations: 空オブジェクト{}（選択肢なし）
  - essential_points: 記述で含めるべき必須キーワード/概念（5-7個）★必須
  - good_examples: 優秀回答例（200-300文字、2パターン）★必須
  - common_mistakes: よくある間違いパターン（3-4個）★必須
  - scoring_anchors: 1-5点の段階的な採点基準（記述内容の質で評価）`

    case 'hybrid':
    default:
      return `【各ステップの要件】
- question_type: "hybrid"（複数選択＋記述 - 4択から1〜4つ選び、さらに理由を記述）
- options: 4択（id, text, is_correct, partial_score付き）
  - 正解選択肢は1-3個、不正解は1-3個
  - partial_scoreは0-4の整数
  - 学習者は1つ以上を選択可能（全て選んでも可）
- model_answer: 以下の全フィールドを含むこと
  - ideal_choices: 理想的な選択肢の組み合わせ
  - choice_explanations: 各選択肢の解説（なぜ正解/不正解なのか）★必須
    - 形式: {"1a": "【正解】この選択肢が正解の理由...", "1b": "【不正解】...", ...}
    - 全選択肢（正解・不正解両方）に解説を付けること
  - essential_points: 記述で含めるべき必須キーワード/概念（3-5個）★必須
  - good_examples: 優秀回答例（100-150文字、1-2パターン）★必須
  - common_mistakes: よくある間違いパターン（2-3個）★必須
  - scoring_anchors: 1-5点の採点基準（選択と記述の両方を評価）`
  }
}

function buildCommonRequirements(params: PromptGeneratorParams): string {
  const infoClarityDesc = params.infoClarity
    ? infoClarityDescriptions[params.infoClarity] || params.infoClarityName || ''
    : ''

  let scenarioContext = `【シナリオ設定】
- 業界: ${params.industry}
- 職種: ${params.jobRole}
- フェーズ: ${params.businessPhase}
- シナリオタイプ: ${params.scenarioType}`

  if (infoClarityDesc) {
    scenarioContext += `
- 情報の明確さ: ${infoClarityDesc}`
  }

  // DB駆動型：パラメータが渡されていればそれを使用、なければデフォルト
  const stepFramework = params.stepFrameworkText || DEFAULT_STEP_FRAMEWORK
  const rubricAxes = params.rubricAxesText || DEFAULT_RUBRIC_AXES
  const diagramStyle = params.diagramStyle || 'mermaid'
  const diagramGuidance = buildDiagramGuidance(diagramStyle)

  return `【生成する問題の仕様】
- カテゴリー: ${params.categoryName} (${params.categoryId})
- サブカテゴリー: ${params.subcategoryName} (${params.subcategoryId})
- 難易度: ${difficultyDescriptions[params.difficulty] || params.difficulty}
- ステップ数: ${params.stepCount}

${scenarioContext}

${stepFramework}

${rubricAxes}

${buildQuestionTypeRequirements(params.questionType || 'hybrid')}
- hint: 各ステップにヒント文を1つ（直接答えを示さず、思考の方向性を示唆）
- target_skills: 上記10軸から2-3個選択（ステップの目的に合わせて）
- category_id / subcategory_id: 各ステップのXP計上先カテゴリー（問題全体と異なってもよい）
- max_score: 20（全ステップ共通）
${diagramGuidance}
${params.customPrompt ? `\n【追加指示】\n${params.customPrompt}` : ''}`
}

/** Claude (XML形式) 用プロンプトを生成 */
export function generateClaudePrompt(params: PromptGeneratorParams): string {
  const common = buildCommonRequirements(params)
  const questionType = params.questionType || 'hybrid'
  const stepExample = buildStepJsonExampleClaude(questionType, params)

  return `あなたはビジネス教育のケーススタディ問題作成の専門家です。
以下の仕様に従い、ケーススタディ問題をJSON形式で生成してください。

${common}

<output_format>
以下のJSON構造で出力してください。JSON以外のテキストは出力しないでください。

<json_schema>
{
  "title": "問題タイトル（30文字以内）",
  "case_text": "ケースの本文（企業名・数値・状況を含む800-1500文字、Markdown形式可）",
  "primary_category_id": "${params.categoryId}",
  "primary_subcategory_id": "${params.subcategoryId}",
  "difficulty": "${params.difficulty}",
  "industry": "${params.industryCode || params.industry}",
  "scenario_type": "${params.scenarioTypeCode || params.scenarioType}",
  "job_role": "${params.jobRoleCode || params.jobRole}",
  "business_phase": "${params.businessPhaseCode || params.businessPhase}",
  "estimated_minutes": 30,
  "steps": [
    ${stepExample}
  ]
}
</json_schema>
</output_format>

【生成のポイント】
- ケーステキストは具体的な企業名（架空）、数値データ、状況説明を含む臨場感のあるものに
${questionType !== 'text' ? '- 各ステップの選択肢は、学習者が「考えさせられる」内容に\n- choice_explanationsは全選択肢に対して「なぜ正解/不正解なのか」を明確に説明' : ''}
${questionType === 'text' || questionType === 'hybrid' ? '- good_examplesは具体的で模範となる回答例を記述\n- essential_pointsは記述回答で含めるべき重要なキーワードや概念を列挙' : ''}
${questionType === 'single' ? '- 単一選択：正解は1つのみ、学習者は1つだけ選択可能' : ''}
${questionType === 'multiple' || questionType === 'hybrid' ? '- 複数選択：学習者は1〜4つの選択肢を選べる（正解が複数あってもよい）' : ''}
- common_mistakesは学習者が陥りやすい思考パターンを具体的に記述
- 各ステップのtarget_skillsはステップの目的に合わせて選択`
}

/** ChatGPT (Markdown形式) 用プロンプトを生成 */
export function generateChatGPTPrompt(params: PromptGeneratorParams): string {
  const common = buildCommonRequirements(params)
  const questionType = params.questionType || 'hybrid'
  const stepExample = buildStepJsonExampleClaude(questionType, params) // 同じヘルパーを使用

  return `# ケーススタディ問題生成

あなたはビジネス教育のケーススタディ問題作成の専門家です。
以下の仕様に従い、ケーススタディ問題を**JSONのみ**で生成してください。

${common}

## 出力フォーマット

以下のJSON構造で出力してください。\`\`\`json\`\`\`で囲んでください。

\`\`\`json
{
  "title": "問題タイトル（30文字以内）",
  "case_text": "ケースの本文（800-1500文字、Markdown形式可）",
  "primary_category_id": "${params.categoryId}",
  "primary_subcategory_id": "${params.subcategoryId}",
  "difficulty": "${params.difficulty}",
  "industry": "${params.industryCode || params.industry}",
  "scenario_type": "${params.scenarioTypeCode || params.scenarioType}",
  "job_role": "${params.jobRoleCode || params.jobRole}",
  "business_phase": "${params.businessPhaseCode || params.businessPhase}",
  "estimated_minutes": 30,
  "steps": [
    ${stepExample}
  ]
}
\`\`\`

**注意事項:**
- ケーステキストには具体的な企業名（架空）・数値・状況を含めてください
${questionType !== 'text' ? `- 選択肢は「考えさせる」ものにしてください
- **choice_explanations**は全選択肢になぜ正解/不正解かの解説を必ず含めてください` : ''}
${questionType === 'text' || questionType === 'hybrid' ? `- **good_examples**は具体的な優秀回答例を必ず含めてください
- **essential_points**は記述で含めるべきキーワードを必ず含めてください` : ''}
${questionType === 'single' ? '- 単一選択：正解は1つのみ、学習者は1つだけ選択可能' : ''}
${questionType === 'multiple' || questionType === 'hybrid' ? '- 複数選択：学習者は1〜4つの選択肢を選べる' : ''}
- **common_mistakes**はよくある間違いパターンを必ず含めてください
- scoring_anchorsは1-5点の段階的な基準にしてください
- JSON以外のテキストは出力しないでください`
}

/** Gemini (コンパクトMarkdown形式) 用プロンプトを生成 */
export function generateGeminiPrompt(params: PromptGeneratorParams): string {
  const common = buildCommonRequirements(params)
  const questionType = params.questionType || 'hybrid'

  // Gemini用の簡潔なmodel_answer構造
  let modelAnswerSchema: string
  let requiredFields: string

  switch (questionType) {
    case 'single':
      // 単一選択のみ
      modelAnswerSchema = `"model_answer": {
      "ideal_choices": string[] (1つのみ),
      "choice_explanations": {[optionId: string]: string},
      "essential_points": [],
      "good_examples": [],
      "common_mistakes": string[],
      "scoring_anchors": {"1": string, "3": string, "5": string}
    }`
      requiredFields = 'choice_explanations、common_mistakesは必須です。正解は1つのみ。'
      break

    case 'multiple':
      // 複数選択のみ
      modelAnswerSchema = `"model_answer": {
      "ideal_choices": string[] (1-3個),
      "choice_explanations": {[optionId: string]: string},
      "essential_points": [],
      "good_examples": [],
      "common_mistakes": string[],
      "scoring_anchors": {"1": string, "2": string, "3": string, "4": string, "5": string}
    }`
      requiredFields = 'choice_explanations、common_mistakesは必須です。学習者は1〜4つ選択可能。'
      break

    case 'text':
      // 記述式のみ
      modelAnswerSchema = `"model_answer": {
      "ideal_choices": [],
      "choice_explanations": {},
      "essential_points": string[] (5-7個),
      "good_examples": string[] (200-300文字、2パターン),
      "common_mistakes": string[] (3-4個),
      "scoring_anchors": {"1": string, "2": string, "3": string, "4": string, "5": string}
    }`
      requiredFields = 'essential_points、good_examples、common_mistakesは必須です。'
      break

    case 'hybrid':
    default:
      // 複数選択＋記述
      modelAnswerSchema = `"model_answer": {
      "ideal_choices": string[] (1-3個),
      "choice_explanations": {[optionId: string]: string},
      "essential_points": string[] (3-5個),
      "good_examples": string[] (100-150文字),
      "common_mistakes": string[],
      "scoring_anchors": {"1": string, "2": string, "3": string, "4": string, "5": string}
    }`
      requiredFields = 'choice_explanations、essential_points、good_examples、common_mistakesは必須です。学習者は1〜4つ選択可能。'
  }

  const optionsSchema = questionType === 'text'
    ? '"options": [],'
    : '"options": [{"id": string, "text": string, "is_correct": boolean, "partial_score": 0-4}],'

  return `ケーススタディ問題をJSON形式で1つ生成してください。

${common}

出力はJSON形式のみ。以下の構造に従ってください:

{
  "title": string (30文字以内),
  "case_text": string (800-1500文字、架空企業名・数値・状況含む),
  "primary_category_id": "${params.categoryId}",
  "primary_subcategory_id": "${params.subcategoryId}",
  "difficulty": "${params.difficulty}",
  "industry": "${params.industryCode || params.industry}",
  "scenario_type": "${params.scenarioTypeCode || params.scenarioType}",
  "job_role": "${params.jobRoleCode || params.jobRole}",
  "business_phase": "${params.businessPhaseCode || params.businessPhase}",
  "estimated_minutes": number,
  "steps": [{
    "step_number": number,
    "step_name": string,
    "description": string (100-200文字),
    "category_id": string,
    "subcategory_id": string,
    "question_type": "${questionType}",
    ${optionsSchema}
    ${modelAnswerSchema},
    "hint": string (50-100文字),
    "target_skills": string[] (10軸から2-3個),
    "max_score": 20
  }]
}

JSON以外の出力禁止。${requiredFields}`
}

/** AIモデルに応じたプロンプトを生成 */
export function generatePrompt(params: PromptGeneratorParams): string {
  switch (params.aiModel) {
    case 'claude':
      return generateClaudePrompt(params)
    case 'chatgpt':
      return generateChatGPTPrompt(params)
    case 'gemini':
      return generateGeminiPrompt(params)
    default:
      return generateChatGPTPrompt(params)
  }
}
