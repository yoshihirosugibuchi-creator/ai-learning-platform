# コース学習コンテンツアーキテクチャ設計書

**最終更新**: 2025年12月18日
**バージョン**: 1.0
**スコープ**: コース学習機能専用（既存クイズ機能とは独立）

---

## 📋 概要と背景

### 対象システム

本設計書は**コース学習機能**に限定したコンテンツアーキテクチャを定義する。

| **機能区分** | **対象** | **備考** |
|-------------|---------|----------|
| **🎯 コース学習** | ✅ 対象 | `/learning/` 配下の体系化された学習コンテンツ |
| **❌ 既存クイズ** | 対象外 | `/quiz/` 配下の単発問題練習機能 |
| **🔧 AIコース生成** | ✅ 関連 | コース学習コンテンツを自動生成 |
| **⚙️ コース学習メンテナンス** | ✅ 関連 | コース学習コンテンツの手動編集 |

### 影響範囲

#### 🚨 直接影響（必須修正対象）
- **learning_sessions**: セッション型定義統一
- **session_contents**: セッションIDとの紐付け修正（249件）
- **session_quizzes**: セッションIDとの紐付け修正（2件のmultiple_choice）
- **course_session_completions**: 新規テーブル作成・データ移行

#### ⚠️ 間接影響（要確認・調整対象）
- **course_completions**: 旧形式データからの移行必要
- **quiz_sessions**: セッション型参照の更新
- **daily_xp_records**: セッション完了記録の参照調整
- **user_xp_stats_v2**: 統計計算ロジックの見直し

#### 潜在的影響
- 学習進捗管理 (`course_session_completions`, `course_theme_completions`)
- XP計算システム (`/api/xp-save/course`)
- 統計・分析システム

---

## 🔍 現状分析

### 既存データ構造 (249件の学習コンテンツ)

#### セッションタイプ分布
```sql
-- 実際のデータベースより
SELECT session_type, COUNT(*) FROM learning_sessions GROUP BY session_type;
```
| session_type | 件数 |
|-------------|------|
| `knowledge` | 23件 |
| `practice` | 15件 |
| `case_study` | 16件 |

#### コンテンツタイプ分布
```sql
-- session_contents テーブルより
SELECT content_type, COUNT(*) FROM session_contents GROUP BY content_type;
```
| content_type | 件数 |
|-------------|------|
| `text` | 49件 |
| `example` | 47件 |
| `key_points` | 43件 |

#### クイズタイプ分布
```sql
-- session_quizzes テーブルより
SELECT quiz_type, COUNT(*) FROM session_quizzes GROUP BY quiz_type;
```
| quiz_type | 件数 |
|----------|------|
| `single_choice` | 54件 |
| `multiple_choice` | 2件（AI生成時のcoming_soonデータ） |

### 現在の実装制約

#### 🚨 重要な発見事項

1. **クイズ数量制約**: 現在のコース学習は**セッションあたり1問限定**
   ```typescript
   // components/learning/LearningSession.tsx:108
   const hasQuiz = session.quiz && session.quiz.length > 0

   // lib/types/learning.ts:45
   quiz: SessionQuiz[]  // 配列だが実装は1問想定
   ```

2. **クイズタイプ限定**: 実装は`single_choice`のみ対応
   ```typescript
   // components/learning/LearningSession.tsx:181-187
   const handleQuizAnswer = (answerIndex: number) => {
     const currentQuiz = session.quiz![currentQuizIndex]
     const isCorrect = answerIndex === currentQuiz.correct  // 単一正解のみ
   ```

3. **API設計不整合**:
   - API定義: `/api/admin/sessions` では `knowledge|practice|case_study`
   - モーダル定義: `lesson|practice|quiz|review|assessment`
   - データベース: `knowledge|practice|case_study`

4. **multiple_choice実装問題（既存2件の対応必要）**:
   - 現状: AI課程生成時にmultiple_choice型クイズが2件作成（coming_soonデータ）
   - 問題: 現在のUIとロジックは single_choice のみ対応
   - 影響: 読み込みエラーの可能性、データ整合性問題

---

## 🎯 統一設計戦略

### セッションタイプ

#### 既存互換タイプ (54件保持)
```typescript
type SessionType =
  | 'knowledge'    // 基礎知識・理論学習 (23件)
  | 'practice'     // 実践練習・演習 (15件)
  | 'case_study'   // ケーススタディ・応用事例 (16件)
```

#### 拡張タイプ (段階的追加)
```typescript
type ExtendedSessionType = SessionType
  | 'review'       // 復習・振り返り (Phase 2で実装時に追加)
  | 'assessment'   // 総合評価・試験 (Phase 3で実装時に追加)
```

#### `review` セッション詳細設計

**目的**: 既習内容の定着強化と忘却防止

**特殊な制御要件**:
```typescript
interface ReviewSessionData {
  original_session_id: string      // 元セッションへの参照
  learned_date: Date               // 初回学習日
  last_review_date?: Date          // 前回復習日
  repetition_count: number         // 復習回数
  retention_score: number          // 定着度 (0-100)
  next_review_date: Date           // 次回復習予定日
  spaced_intervals: number[]       // スペースドリピティション間隔 [1, 3, 7, 14, 30日]
}

// review セッションの自動生成
const generateReviewSession = (originalSession: LearningSession): ReviewSession => ({
  id: `${originalSession.id}_review_${timestamp}`,
  title: `${originalSession.title} - 復習`,
  session_type: 'review',
  estimated_minutes: Math.ceil(originalSession.estimated_minutes * 0.3),

  // コンテンツ制御: 要点のみ抽出
  contents: originalSession.contents
    .filter(c => c.type === 'key_points' || c.type === 'text')
    .slice(0, 2),  // 最重要2件のみ

  // クイズ制御: 基本問題のみ
  quizzes: originalSession.quizzes
    .filter(q => q.difficulty === 'basic')
    .slice(0, 3),  // 最大3問

  review_data: {
    original_session_id: originalSession.id,
    // ... その他復習メタデータ
  }
})
```

#### `assessment` セッション詳細設計

**目的**: 学習成果の総合評価と認定

**特殊な制御要件**:
```typescript
interface AssessmentSessionData {
  assessment_type: 'theme' | 'genre' | 'course'
  passing_score: number            // 合格基準点 (70-85点)
  time_limit_minutes: number       // 制限時間
  question_pool_size: number       // 問題プールサイズ
  selected_questions: number       // 実際出題数
  retake_allowed: boolean          // 再受験可能性
  certification_enabled: boolean   // 修了証発行
}

// assessment セッションの特殊制御
const assessmentSessionBehavior = {
  // コンテンツ制御: ガイダンスのみ
  contents: [
    { type: 'text', title: '試験概要', content: '制限時間・注意事項...' },
    { type: 'key_points', title: '試験範囲', content: '対象テーマ一覧...' }
  ],

  // クイズ制御: 複数テーマから均等出題
  quiz_generation: {
    strategy: 'balanced',  // テーマ間でバランス良く出題
    difficulty_distribution: {
      basic: 0.4,      // 40%
      intermediate: 0.4, // 40%
      advanced: 0.2    // 20%
    },
    question_types: ['single_choice', 'multiple_choice', 'true_false'],
    avoid_duplicates: true
  },

  // 結果制御: 詳細な分析とフィードバック
  result_analysis: {
    overall_score: number,
    theme_breakdown: { theme_id: string, score: number }[],
    weakness_areas: string[],
    recommended_reviews: string[],
    certification_issued: boolean
  }
}
```

### コンテンツタイプ

#### 既存互換タイプ (139件保持)
```typescript
type ContentType =
  | 'text'         // テキストコンテンツ (49件)
  | 'example'      // 事例・ケーススタディ (47件)
  | 'key_points'   // 重要ポイント・まとめ (43件)
```

#### 拡張タイプ (段階的追加)
```typescript
type ExtendedContentType = ContentType
  | 'image'        // 画像・図表 (Phase 2で実装時に追加)
  | 'video'        // 動画解説 (Phase 2で実装時に追加)
  | 'interactive'  // インタラクティブ体験 (Phase 3で実装時に追加)
```

#### `image` コンテンツ実装詳細

```typescript
interface ImageContentData {
  image_url: string                // 画像URL
  alt_text: string                // アクセシビリティ用
  caption?: string                // 図表キャプション
  image_type: 'diagram' | 'chart' | 'infographic' | 'photo'
  zoom_enabled: boolean            // ズーム機能
  annotations?: Array<{            // 画像注釈
    x: number, y: number,         // 座標 (%)
    text: string,                 // 注釈テキスト
    link?: string                 // 関連リンク
  }>
}

// 実装例: MECE分析図表
const meceDiagramContent = {
  content_type: 'image',
  title: 'MECE分析フレームワーク構造図',
  content: 'MECE原則を視覚的に理解するための構造図です',
  image_data: {
    image_url: '/images/learning/mece_framework.svg',
    alt_text: 'MECE分析の相互排他・全体網羅を示すベン図',
    caption: '図1: MECE原則による要素分類の可視化',
    image_type: 'diagram',
    zoom_enabled: true,
    annotations: [
      { x: 25, y: 30, text: '相互排他 (Mutually Exclusive)', link: '#exclusive' },
      { x: 75, y: 70, text: '全体網羅 (Collectively Exhaustive)', link: '#exhaustive' }
    ]
  }
}
```

#### `video` コンテンツ実装詳細

```typescript
interface VideoContentData {
  video_provider: 'youtube' | 'vimeo' | 'self_hosted'
  video_id: string                 // プロバイダーID
  video_url: string               // 直接URL
  duration_seconds: number        // 動画時間
  auto_play: boolean              // 自動再生
  captions_available: boolean     // 字幕有無
  chapters?: Array<{              // チャプター区切り
    start_time: number,           // 開始時間(秒)
    title: string,                // チャプター名
    description?: string          // 説明
  }>
  interactive_elements?: Array<{   // インタラクティブ要素
    time: number,                 // 表示タイミング
    type: 'quiz' | 'note' | 'link',
    content: string
  }>
}

// 実装例: So What分析解説動画
const soWhatVideoContent = {
  content_type: 'video',
  title: 'So What分析の実践テクニック',
  content: '実際のビジネスケースを用いたSo What分析の手順解説',
  video_data: {
    video_provider: 'youtube',
    video_id: 'abc123def456',
    duration_seconds: 480,
    auto_play: false,
    captions_available: true,
    chapters: [
      { start_time: 0, title: '概要説明', description: 'So What分析の目的' },
      { start_time: 120, title: '事例分析', description: '売上データの深掘り' },
      { start_time: 300, title: '洞察抽出', description: '本質的示唆の発見' }
    ],
    interactive_elements: [
      { time: 180, type: 'quiz', content: 'ここまでの理解度をチェック' },
      { time: 350, type: 'note', content: '重要: Why So?との組み合わせ' }
    ]
  }
}
```

#### `interactive` コンテンツ実装詳細

```typescript
interface InteractiveContentData {
  interactive_type: 'drag_drop' | 'simulation' | 'calculator' | 'decision_tree'
  config: InteractiveConfig
  save_progress: boolean           // 進捗保存
  completion_required: boolean     // 完了必須
  max_attempts?: number           // 最大試行回数
}

// ドラッグ&ドロップ実装
interface DragDropConfig {
  instructions: string
  items: Array<{
    id: string
    text: string
    correct_category: string
    hints?: string[]
  }>
  categories: Array<{
    id: string
    title: string
    description?: string
    capacity?: number              // 受け入れ上限数
  }>
  validation: {
    immediate_feedback: boolean
    show_hints_after: number      // N回間違い後にヒント表示
    success_message: string
    failure_message: string
  }
}

// 実装例: 3C分析分類練習
const threeCAnalysisInteractive = {
  content_type: 'interactive',
  title: '3C分析要素分類練習',
  content: '新規事業検討の各要素を適切なCに分類してください',
  interactive_data: {
    interactive_type: 'drag_drop',
    save_progress: true,
    completion_required: true,
    max_attempts: 3,
    config: {
      instructions: '下記の要素を Customer、Competitor、Company のいずれかにドラッグしてください',
      items: [
        { id: '1', text: '市場ニーズの多様化', correct_category: 'customer',
          hints: ['顧客の要求に関する情報です', 'Customerに分類されます'] },
        { id: '2', text: '競合他社の価格戦略', correct_category: 'competitor' },
        { id: '3', text: '自社の技術力', correct_category: 'company' }
      ],
      categories: [
        { id: 'customer', title: 'Customer (顧客)', description: '顧客・市場環境', capacity: 3 },
        { id: 'competitor', title: 'Competitor (競合)', description: '競合他社状況' },
        { id: 'company', title: 'Company (自社)', description: '自社のリソース・能力' }
      ],
      validation: {
        immediate_feedback: false,
        show_hints_after: 2,
        success_message: '正解です！3C分析の基本的な分類ができています',
        failure_message: '再度、各Cの定義を確認して分類してみてください'
      }
    }
  }
}
```

### クイズタイプ

#### 🚨 既存システムへの重要な制約と影響

**現在の実装制約**:
1. **1問限定**: セッションあたり1問のみ（`session.quiz.length = 1`）
2. **単一選択のみ**: `single_choice` のみ実装済み
3. **固定UI**: 複数問題や新形式への対応なし

#### 既存互換タイプ (56件保持)
```typescript
type QuizType =
  | 'single_choice'    // 単一選択問題 (54件)
  | 'multiple_choice'  // 複数選択問題 (2件) ← coming_soonデータ、対応策要検討
```

#### 拡張タイプ (段階的追加)
```typescript
type ExtendedQuizType = QuizType
  | 'true_false'       // 正誤問題 (Phase 2で実装時に追加)
  | 'sorting'          // 並べ替え問題 (Phase 2で実装時に追加)
  | 'fill_blank'       // 穴埋め問題 (Phase 3で実装時に追加)
  | 'essay'           // 記述問題 (Phase 3で実装時に追加)
```

#### `sorting` クイズ実装詳細

```typescript
interface SortingQuizData {
  items: Array<{
    id: string
    text: string
    correct_order: number         // 正しい順序 (1, 2, 3...)
    category?: string            // カテゴリー（任意）
  }>
  scoring: {
    partial_credit: boolean      // 部分点あり
    order_weight: number[]       // 順序別重み配点
  }
  ui_config: {
    layout: 'vertical' | 'horizontal'
    drag_enabled: boolean
    number_display: boolean      // 順序番号表示
  }
}

// 実装例: マーケティング戦略策定プロセス
const marketingProcessSorting = {
  quiz_type: 'sorting',
  question: 'マーケティング戦略策定の正しい手順に並べ替えてください',
  sorting_data: {
    items: [
      { id: 'a', text: '市場分析・顧客理解', correct_order: 1 },
      { id: 'b', text: 'セグメンテーション', correct_order: 2 },
      { id: 'c', text: 'ターゲット選定', correct_order: 3 },
      { id: 'd', text: 'ポジショニング設計', correct_order: 4 },
      { id: 'e', text: 'マーケティング施策実行', correct_order: 5 }
    ],
    scoring: {
      partial_credit: true,
      order_weight: [20, 20, 20, 20, 20]  // 各ステップ均等配点
    },
    ui_config: {
      layout: 'vertical',
      drag_enabled: true,
      number_display: true
    }
  },
  explanation: 'マーケティング戦略は分析→細分化→選定→位置づけ→実行の順序が基本です'
}
```

#### `essay` クイズ実装詳細

```typescript
interface EssayQuizData {
  question: string
  sample_answer?: string           // 模範解答（参考）
  scoring_method: 'keyword' | 'ai' | 'hybrid'

  // キーワード採点
  keyword_scoring?: {
    required_keywords: Array<{
      keyword: string
      points: number
      synonyms?: string[]          // 同義語
    }>
    bonus_keywords?: Array<{
      keyword: string
      points: number
    }>
  }

  // AI採点
  ai_scoring?: {
    criteria: Array<{
      name: string                 // '論理性', '具体性', '完全性'
      weight: number              // 重み (0.0-1.0)
      description: string         // 評価観点詳細
    }>
    prompt_template: string      // AI採点用プロンプト
  }

  // UI制御
  ui_config: {
    min_characters: number       // 最小文字数
    max_characters: number       // 最大文字数
    placeholder: string          // 入力欄プレースホルダー
    auto_save: boolean          // 自動保存
    spell_check: boolean        // スペルチェック
  }
}

// 実装例: 総合思考力評価
const comprehensiveThinkingEssay = {
  quiz_type: 'essay',
  question: '新規事業を検討する際に、MECE思考・So What分析・結論ファーストをどのように組み合わせて活用するか、具体例を交えて論述してください（400-800字）',

  essay_data: {
    scoring_method: 'hybrid',

    keyword_scoring: {
      required_keywords: [
        { keyword: 'MECE', points: 25, synonyms: ['ミーシー', '相互排他', '全体網羅'] },
        { keyword: 'So What', points: 25, synonyms: ['ソーワット', '本質', '洞察'] },
        { keyword: '結論ファースト', points: 25, synonyms: ['結論優先', 'PREP'] }
      ],
      bonus_keywords: [
        { keyword: '具体例', points: 10 },
        { keyword: '実践', points: 5 },
        { keyword: 'フレームワーク', points: 5 }
      ]
    },

    ai_scoring: {
      criteria: [
        { name: '論理性', weight: 0.4, description: '論理的一貫性と構造化' },
        { name: '具体性', weight: 0.3, description: '具体例の適切性と説得力' },
        { name: '統合性', weight: 0.3, description: '3つの手法の統合的活用' }
      ],
      prompt_template: `
以下の解答を評価してください：

【設問】{question}
【解答】{user_answer}
【模範解答】{sample_answer}

評価基準：
{criteria}

100点満点で採点し、各基準の得点と総合評価、改善点をJSON形式で返してください。
      `
    },

    ui_config: {
      min_characters: 400,
      max_characters: 800,
      placeholder: 'MECE、So What、結論ファーストの組み合わせ活用法を具体例とともに記述してください...',
      auto_save: true,
      spell_check: false
    }
  },

  explanation: '各手法の特徴を理解し、相互補完的に活用することで、より効果的な問題解決が可能になります'
}
```

---

## 🚀 段階的実装戦略

### Phase 1: 基盤強化・既存不具合修正 (即時実装)

**目標**: 既存システムの安定化と不整合解消・メンテナンス機能修正・AI生成バグ修正

#### 対象タイプ（データ保護）
```typescript
type SessionType = 'knowledge' | 'practice' | 'case_study'
type ContentType = 'text' | 'example' | 'key_points'
type QuizType = 'single_choice' | 'multiple_choice'
```

#### 1.1 セッション型の統一

**影響コンポーネント**:
- `/app/api/admin/sessions/route.ts`
- `/components/admin/SessionEditModal.tsx`
- `/lib/types/learning.ts`

**修正内容**:
```typescript
// SessionEditModalで使用されている不整合な型を統一
type SessionType = 'knowledge' | 'practice' | 'case_study'  // lesson, quiz, review, assessment を削除
```

#### 1.2 existing multiple_choice問題の解決（詳細対応策）

**既存2件の処理方針**:
```sql
-- Option A: single_choiceに変換（推奨）
UPDATE session_quizzes 
SET quiz_type = 'single_choice', 
    correct = CASE 
      WHEN correct::text ~ '^\[.*\]$' THEN (correct::jsonb->>0)::int
      ELSE correct::int
    END,
    options = CASE 
      WHEN jsonb_array_length(options::jsonb) > 1 THEN 
        jsonb_build_array(options::jsonb->>0, options::jsonb->>1)
      ELSE options::jsonb
    END
WHERE quiz_type = 'multiple_choice';

-- Option B: 削除後再生成
-- DELETE FROM session_quizzes WHERE quiz_type = 'multiple_choice';
-- 対応セッションに新しいsingle_choiceクイズを生成
```

**UIでの暫定対応**:
```typescript
// components/learning/LearningSession.tsx での対応
const renderQuiz = (quiz: SessionQuiz) => {
  // 暫定: multiple_choice を single_choice として扱う
  const normalizedQuiz = quiz.type === 'multiple_choice' ? {
    ...quiz,
    type: 'single_choice' as const,
    correct: Array.isArray(quiz.correct) ? quiz.correct[0] : quiz.correct
  } : quiz

  return <SingleChoiceQuizRenderer quiz={normalizedQuiz} />
}
```

#### 1.3 コース学習メンテナンス機能のバグ修正（詳細対応）

**セッション追加時の不具合**:
- ID自動生成の不具合修正
  ```typescript
  // 修正前: 重複IDや不正ID生成
  const generateSessionId = () => Math.random().toString()
  
  // 修正後: 安全なID生成
  const generateSessionId = () => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  ```
- display_order の自動設定
  ```typescript
  const getNextDisplayOrder = async (themeId: string) => {
    const maxOrder = await getMaxDisplayOrderForTheme(themeId)
    return (maxOrder || 0) + 1
  }
  ```
- コンテンツ・クイズの初期作成プロセス整備

**セッション編集時の不具合**:
- 更新反映不具合の修正
- 関連データ（contents、quizzes）の整合性確保
- バリデーションエラーの適切な処理

**セッション削除時の不具合**:
- 関連データの連鎖削除（contents、quizzes）
  ```sql
  -- 正しい削除順序の実装
  DELETE FROM session_quizzes WHERE session_id = ?;
  DELETE FROM session_contents WHERE session_id = ?;
  DELETE FROM learning_sessions WHERE id = ?;
  ```
- display_order の自動再計算
- 参照整合性の確保

#### 1.4 AIコース生成システムのバグ修正（詳細対応）

**multiple_choice生成停止**:
```typescript
// AI生成時のクイズタイプを single_choice に統一
const generateQuizData = (content: string): QuizData => {
  return {
    quiz_type: 'single_choice',  // multiple_choice を生成しない
    question: extractQuestionFromContent(content),
    options: generateSingleChoiceOptions(content),
    correct: 0  // 最初の選択肢を正解とする
  }
}
```

**ID紐付け強化**:
- セッション作成 → コンテンツ作成 → クイズ作成の順序保証
- トランザクション処理の実装
  ```typescript
  const generateCourseWithTransaction = async (courseData) => {
    const transaction = await db.transaction()
    try {
      const session = await createSession(courseData.session, transaction)
      const contents = await createContents(session.id, courseData.contents, transaction)
      const quizzes = await createQuizzes(session.id, courseData.quizzes, transaction)
      await transaction.commit()
      return { session, contents, quizzes }
    } catch (error) {
      await transaction.rollback()
      throw error
    }
  }
  ```

**バリデーション強化**:
- 生成データの整合性チェック
- 重複チェック機能
- 生成失敗時のリトライ機能

#### Phase 1 成功基準
- [ ] セッション型が knowledge/practice/case_study に統一される
- [ ] 249件の session_contents が正しいセッションIDを持つ
- [ ] 2件の multiple_choice クイズが適切に処理される
- [ ] course_completions → course_session_completions 移行完了
- [ ] コース学習メンテナンス画面でセッションCRUD操作がエラーなく動作
- [ ] AI課程生成で multiple_choice が生成されない
- [ ] TypeScript/ESLint エラーが0件

### Phase 2: 機能拡張・制約解除 (Phase 1完了後)

**目標**: クイズ制約解除・復習機能とマルチメディアコンテンツ追加

#### 2.1 クイズ制約の完全解除（詳細実装）

**現状の制約と修正内容**:

**制約1: 1問限定の解除**
```typescript
// ❌ 修正前: components/learning/LearningSession.tsx
const hasQuiz = session.quiz && session.quiz.length > 0  // 1問前提
const quiz = session.quiz?.[0]  // 最初の1問のみ使用

// ✅ 修正後: 複数クイズ対応
const [currentQuizIndex, setCurrentQuizIndex] = useState(0)
const quizzes = session.quiz || []
const hasQuizzes = quizzes.length > 0
const currentQuiz = quizzes[currentQuizIndex]

// クイズナビゲーション機能の追加
const handleNextQuiz = () => {
  if (currentQuizIndex < quizzes.length - 1) {
    setCurrentQuizIndex(currentQuizIndex + 1)
  }
}

const handlePreviousQuiz = () => {
  if (currentQuizIndex > 0) {
    setCurrentQuizIndex(currentQuizIndex - 1)
  }
}

// 全クイズ完了判定
const allQuizzesCompleted = quizResults.length === quizzes.length
```

**制約2: 単一選択のみの解除**
```typescript
// ✅ 修正後: 複数のクイズタイプ対応
const renderQuizByType = (quiz: SessionQuiz) => {
  switch (quiz.type) {
    case 'single_choice':
      return <SingleChoiceQuiz quiz={quiz} onAnswer={handleAnswer} />
    case 'multiple_choice':
      return <MultipleChoiceQuiz quiz={quiz} onAnswer={handleMultipleAnswer} />
    case 'true_false':
      return <TrueFalseQuiz quiz={quiz} onAnswer={handleBooleanAnswer} />
    case 'sorting':
      return <SortingQuiz quiz={quiz} onAnswer={handleSortingAnswer} />
    default:
      return <div>未対応のクイズタイプです</div>
  }
}
```

**制約3: 固定UIの解除**
```typescript
// ✅ クイズ進捗表示UI
const QuizProgress = ({ current, total }: { current: number, total: number }) => (
  <div className="quiz-progress">
    <div className="progress-text">{current + 1} / {total}</div>
    <div className="progress-bar">
      <div 
        className="progress-fill" 
        style={{ width: `${((current + 1) / total) * 100}%` }}
      />
    </div>
  </div>
)

// ✅ クイズナビゲーションUI
const QuizNavigation = ({ 
  canGoPrevious, 
  canGoNext, 
  onPrevious, 
  onNext,
  onFinish,
  isLastQuiz
}: QuizNavigationProps) => (
  <div className="quiz-navigation">
    <button 
      onClick={onPrevious} 
      disabled={!canGoPrevious}
      className="nav-btn prev-btn"
    >
      前の問題
    </button>
    
    {isLastQuiz ? (
      <button onClick={onFinish} className="nav-btn finish-btn">
        完了
      </button>
    ) : (
      <button 
        onClick={onNext} 
        disabled={!canGoNext}
        className="nav-btn next-btn"
      >
        次の問題
      </button>
    )}
  </div>
)
```

#### 2.2 拡張セッション型の実装（実装時に追加）

**Review型（復習セッション）**:
```typescript
// 実装タイミング: Phase 2 開始時
type SessionType = 'knowledge' | 'practice' | 'case_study' | 'review'
```

#### 2.3 拡張コンテンツ型の実装（実装時に追加）

**Image・Video型**:
```typescript
// 実装タイミング: Phase 2 中盤
type ContentType = 'text' | 'example' | 'key_points' | 'image' | 'video'
```

#### 2.4 拡張クイズ型の実装（実装時に追加）

**True/False・Sorting型**:
```typescript
// 実装タイミング: Phase 2 終盤
type QuizType = 'single_choice' | 'multiple_choice' | 'true_false' | 'sorting'
```

#### 2.5 実装内容

1. **Review セッション機能**
   ```sql
   -- データベーススキーマ拡張
   ALTER TABLE learning_sessions
   ADD COLUMN review_data JSONB;

   CREATE TABLE session_review_schedule (
     id UUID PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id),
     original_session_id VARCHAR REFERENCES learning_sessions(id),
     scheduled_date DATE,
     repetition_interval INTEGER,
     completed_at TIMESTAMP,
     retention_score INTEGER
   );
   ```

2. **メディアコンテンツ対応**
   ```sql
   ALTER TABLE session_contents
   ADD COLUMN image_data JSONB,
   ADD COLUMN video_data JSONB;
   ```

3. **新クイズタイプ実装**
   ```typescript
   // true_false, sorting の UI実装
   // components/learning/quiz/ 配下にタイプ別コンポーネント
   ```

4. **スペースドリピティション基盤**
   ```typescript
   // 忘却曲線アルゴリズム実装
   const calculateNextReviewDate = (
     lastReview: Date,
     repetitionCount: number,
     previousScore: number
   ): Date => {
     const intervals = [1, 3, 7, 14, 30]; // 基本間隔（日）
     const scoreMultiplier = previousScore >= 80 ? 1.0 : 0.7;
     const nextInterval = intervals[Math.min(repetitionCount, intervals.length - 1)] * scoreMultiplier;
     return addDays(lastReview, Math.ceil(nextInterval));
   }
   ```

#### Phase 2 成功基準
- [ ] 1セッションで複数クイズが表示・回答・採点される
- [ ] クイズナビゲーション機能が正常動作する
- [ ] 復習セッション自動生成・スケジューリングが動作する
- [ ] 画像・動画コンテンツが正常表示される
- [ ] true_false、sorting クイズが動作確認される
- [ ] 学習効果測定機能が動作する

### Phase 3: 高度機能・AI採点 (Phase 2完了後)

**目標**: 総合評価・インタラクティブコンテンツ・AI採点システム実装

#### 全機能実装（実装時に追加）
```typescript
type SessionType = 'knowledge' | 'practice' | 'case_study' | 'review' | 'assessment'
type ContentType = 'text' | 'example' | 'key_points' | 'image' | 'video' | 'interactive'
type QuizType = 'single_choice' | 'multiple_choice' | 'true_false' | 'sorting' | 'fill_blank' | 'essay'
```

#### 実装内容

1. **Assessment セッション機能**
   ```typescript
   // 総合試験セッション生成アルゴリズム
   const generateAssessmentSession = (genre: LearningGenre): AssessmentSession => {
     const allQuizzes = collectQuizzesFromThemes(genre.themes);
     const selectedQuizzes = selectBalancedQuizzes(allQuizzes, {
       total: 20,
       difficultyDistribution: { basic: 8, intermediate: 8, advanced: 4 },
       themeBalance: true
     });

     return {
       session_type: 'assessment',
       estimated_minutes: 60,
       quizzes: selectedQuizzes,
       assessment_data: {
         passing_score: 70,
         time_limit_minutes: 60,
         retake_allowed: true
       }
     };
   }
   ```

2. **インタラクティブコンテンツエンジン**
   ```typescript
   // components/learning/interactive/ 配下
   - DragDropActivity.tsx
   - CalculatorSimulation.tsx
   - DecisionTreeNavigator.tsx
   ```

3. **AI採点システム**
   ```typescript
   // API: /api/learning/quiz/score-essay
   const scoreEssayWithAI = async (essayQuiz: EssayQuiz, userAnswer: string) => {
     const prompt = generateScoringPrompt(essayQuiz, userAnswer);
     const aiResponse = await openai.chat.completions.create({
       model: 'gpt-4',
       messages: [{ role: 'user', content: prompt }],
       temperature: 0.2
     });

     return parseAIScoring(aiResponse.choices[0].message.content);
   }
   ```

4. **適応学習アルゴリズム**
   ```typescript
   // 学習者の進捗と理解度に基づく個別最適化
   interface LearningProfile {
     user_id: string;
     learning_pace: 'fast' | 'normal' | 'slow';
     preferred_content_types: ContentType[];
     weak_areas: string[];
     optimal_session_length: number;
     peak_learning_hours: number[];
   }
   ```

#### Phase 3 成功基準
- [ ] 総合試験機能完全動作
- [ ] AI採点精度85%以上
- [ ] インタラクティブコンテンツ正常動作
- [ ] 適応学習効果測定可能

---

## 🛠️ 技術実装詳細

### データベース設計

#### セッション拡張
```sql
-- セッションテーブル拡張
ALTER TABLE learning_sessions
ADD COLUMN review_data JSONB,
ADD COLUMN assessment_data JSONB,
ADD COLUMN ui_config JSONB DEFAULT '{}';

-- インデックス追加
CREATE INDEX idx_sessions_review_data ON learning_sessions USING gin(review_data);
CREATE INDEX idx_sessions_assessment_data ON learning_sessions USING gin(assessment_data);
```

#### コンテンツ拡張
```sql
-- コンテンツテーブル拡張
ALTER TABLE session_contents
ADD COLUMN image_data JSONB,
ADD COLUMN video_data JSONB,
ADD COLUMN interactive_data JSONB,
ADD COLUMN metadata JSONB DEFAULT '{}';

-- ファイル管理テーブル（新規）
CREATE TABLE learning_media_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path VARCHAR NOT NULL,
  file_type VARCHAR NOT NULL,
  file_size_bytes BIGINT,
  mime_type VARCHAR,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);
```

#### クイズ拡張
```sql
-- クイズテーブル拡張
ALTER TABLE session_quizzes
ADD COLUMN items JSONB,  -- sorting用アイテム
ADD COLUMN scoring_method VARCHAR(20) DEFAULT 'fixed',
ADD COLUMN keyword_points JSONB,
ADD COLUMN ai_criteria JSONB,
ADD COLUMN ui_config JSONB DEFAULT '{}',
ADD COLUMN metadata JSONB DEFAULT '{}';
```

#### 復習システム
```sql
-- 復習スケジュールテーブル（新規）
CREATE TABLE user_review_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  original_session_id VARCHAR REFERENCES learning_sessions(id),
  generated_review_session_id VARCHAR,
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  repetition_count INTEGER DEFAULT 0,
  retention_score INTEGER,
  next_review_date DATE,
  created_at TIMESTAMP DEFAULT now(),

  UNIQUE(user_id, original_session_id, scheduled_date)
);

CREATE INDEX idx_review_schedule_user_date ON user_review_schedules(user_id, scheduled_date);
CREATE INDEX idx_review_schedule_due ON user_review_schedules(scheduled_date) WHERE completed_date IS NULL;
```

### API設計

#### セッション管理API拡張
```typescript
// GET /api/learning/sessions/review-schedule?user_id=123&date=2025-12-18
interface ReviewScheduleResponse {
  due_today: ReviewSession[];
  upcoming: { date: string, sessions: ReviewSession[] }[];
  overdue: ReviewSession[];
}

// POST /api/learning/sessions/generate-review
interface GenerateReviewRequest {
  user_id: string;
  original_session_id: string;
  target_date?: string;
}

// POST /api/learning/sessions/generate-assessment
interface GenerateAssessmentRequest {
  assessment_scope: 'theme' | 'genre' | 'course';
  target_id: string;  // theme_id | genre_id | course_id
  question_count?: number;
  difficulty_distribution?: { basic: number, intermediate: number, advanced: number };
}
```

#### コンテンツ管理API拡張
```typescript
// POST /api/learning/content/upload-image
interface ImageUploadRequest {
  session_id: string;
  title: string;
  description: string;
  image_file: File;
  alt_text: string;
  annotations?: ImageAnnotation[];
}

// POST /api/learning/content/embed-video
interface VideoEmbedRequest {
  session_id: string;
  title: string;
  video_provider: 'youtube' | 'vimeo';
  video_id: string;
  chapters?: VideoChapter[];
}

// POST /api/learning/content/interactive
interface InteractiveContentRequest {
  session_id: string;
  interactive_type: 'drag_drop' | 'simulation' | 'calculator';
  title: string;
  config: InteractiveConfig;
}
```

#### クイズ管理API拡張
```typescript
// POST /api/learning/quiz/score-essay
interface EssayScoreRequest {
  quiz_id: string;
  user_answer: string;
  scoring_method: 'keyword' | 'ai' | 'hybrid';
}

interface EssayScoreResponse {
  total_score: number;
  max_score: number;
  percentage: number;
  keyword_breakdown?: { keyword: string, scored: boolean, points: number }[];
  ai_evaluation?: {
    criteria_scores: { criterion: string, score: number }[];
    feedback: string;
    improvement_suggestions: string[];
  };
  final_feedback: string;
}

// GET /api/learning/quiz/analytics?session_id=123
interface QuizAnalyticsResponse {
  question_performance: Array<{
    question_id: string;
    correct_rate: number;
    average_response_time: number;
    common_wrong_answers: Array<{ answer: string, frequency: number }>;
  }>;
  user_performance: {
    accuracy_trend: number[];
    difficulty_progression: number[];
    learning_velocity: number;
  };
}
```

### データ移行スクリプト（Phase 1実装）

```sql
-- 1. session_contents ID紐付け修正（249件対象）
UPDATE session_contents 
SET session_id = (
  SELECT ls.id 
  FROM learning_sessions ls 
  WHERE ls.theme_id = (
    SELECT lt.id
    FROM learning_themes lt
    WHERE lt.id IN (
      SELECT theme_id FROM session_contents sc WHERE sc.id = session_contents.id
    )
  )
  ORDER BY ls.display_order
  LIMIT 1
)
WHERE session_id IS NULL 
   OR session_id NOT IN (SELECT id FROM learning_sessions);

-- 2. session_quizzes ID紐付け修正（2件のmultiple_choice対象）
UPDATE session_quizzes 
SET quiz_type = 'single_choice',
    correct = CASE 
      WHEN quiz_type = 'multiple_choice' THEN 
        CASE 
          WHEN correct::text ~ '^\[.*\]$' THEN (correct::jsonb->>0)::int
          ELSE correct::int
        END
      ELSE correct::int
    END,
    options = CASE 
      WHEN quiz_type = 'multiple_choice' AND jsonb_array_length(options::jsonb) > 1 THEN 
        jsonb_build_array(options::jsonb->>0, options::jsonb->>1)
      ELSE options::jsonb
    END
WHERE quiz_type = 'multiple_choice';

-- 3. course_completions データ移行
INSERT INTO course_session_completions (
  user_id, course_id, session_id, genre_id, theme_id, 
  is_first_completion, completed_at, created_at
)
SELECT 
  cc.user_id, 
  cc.course_id, 
  cc.session_id, 
  ls.genre_id,
  ls.theme_id,
  true, 
  cc.completed_at, 
  cc.created_at
FROM course_completions cc
JOIN learning_sessions ls ON cc.session_id = ls.id
WHERE cc.session_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM course_session_completions csc 
    WHERE csc.user_id = cc.user_id 
      AND csc.session_id = cc.session_id
  );
```

---

## 📊 品質保証・テスト戦略

### 段階別テスト方針

#### Phase 1: 基盤テスト
```typescript
// 既存機能回帰テスト
describe('Course Learning - Backward Compatibility', () => {
  test('Existing 249 learning contents load correctly', async () => {
    const courses = await getLearningCourseDetails('all');
    expect(courses).toHaveLength(12);

    const totalSessions = courses.flatMap(c =>
      c.genres.flatMap(g =>
        g.themes.flatMap(t => t.sessions)
      )
    ).length;
    expect(totalSessions).toBe(54);
  });

  test('Single quiz per session constraint maintained', async () => {
    const allSessions = await getAllLearningSessions();
    allSessions.forEach(session => {
      expect(session.quiz).toHaveLength(1);
      expect(['single_choice', 'multiple_choice']).toContain(session.quiz[0].type);
    });
  });
});

// API統合テスト
describe('Session Management API', () => {
  test('Session CRUD operations work correctly', async () => {
    // 新規作成
    const createResponse = await fetch('/api/admin/sessions', {
      method: 'POST',
      body: JSON.stringify({
        theme_id: 'test_theme',
        title: 'Test Session',
        session_type: 'knowledge'
      })
    });
    expect(createResponse.ok).toBe(true);

    // 編集（統一API使用）
    const editResponse = await fetch('/api/admin/sessions', {
      method: 'PATCH',
      body: JSON.stringify({
        id: newSession.id,
        title: 'Updated Session'
      })
    });
    expect(editResponse.ok).toBe(true);
  });
});
```

#### Phase 2: 拡張機能テスト
```typescript
// 復習システムテスト
describe('Review System', () => {
  test('Review sessions auto-generated based on schedule', async () => {
    const user = await createTestUser();
    await completeSession(user.id, 'mece_basics');

    // 1日後のスケジュール確認
    const schedule = await getReviewSchedule(user.id, addDays(new Date(), 1));
    expect(schedule.due_today).toHaveLength(1);
    expect(schedule.due_today[0].session_type).toBe('review');
  });

  test('Spaced repetition intervals calculated correctly', () => {
    const intervals = calculateSpacedIntervals(0, 85); // 1回目、85点
    expect(intervals).toEqual([1, 3, 7, 14, 30]);

    const lowScoreIntervals = calculateSpacedIntervals(1, 60); // 2回目、60点
    expect(lowScoreIntervals[1]).toBeLessThan(3); // 間隔短縮
  });
});

// メディアコンテンツテスト
describe('Media Content', () => {
  test('Image content displays with annotations', async () => {
    const imageContent = await createImageContent({
      image_url: '/test/mece_diagram.svg',
      annotations: [{ x: 50, y: 50, text: 'Central concept' }]
    });

    const rendered = render(<ImageContentRenderer content={imageContent} />);
    expect(rendered.getByAltText('MECE diagram')).toBeInTheDocument();
    expect(rendered.getByText('Central concept')).toBeInTheDocument();
  });

  test('Video chapters navigation works', async () => {
    const videoContent = await createVideoContent({
      chapters: [
        { time: 0, title: 'Introduction' },
        { time: 120, title: 'Main content' }
      ]
    });

    const rendered = render(<VideoContentRenderer content={videoContent} />);
    fireEvent.click(rendered.getByText('Main content'));
    // Video should seek to 2:00
  });
});
```

#### Phase 3: 高度機能テスト
```typescript
// AI採点テスト
describe('AI Scoring System', () => {
  test('Essay scoring accuracy meets threshold', async () => {
    const testCases = await loadEssayTestCases(); // 人間が採点済み
    let totalAccuracy = 0;

    for (const testCase of testCases) {
      const aiScore = await scoreEssayWithAI(testCase.quiz, testCase.answer);
      const humanScore = testCase.expected_score;
      const accuracy = 1 - Math.abs(aiScore - humanScore) / 100;
      totalAccuracy += accuracy;
    }

    const averageAccuracy = totalAccuracy / testCases.length;
    expect(averageAccuracy).toBeGreaterThan(0.85); // 85%以上
  });
});

// Assessment セッションテスト
describe('Assessment Sessions', () => {
  test('Balanced quiz selection from multiple themes', async () => {
    const genre = await getGenreWithThemes('consulting_thinking_basics');
    const assessment = await generateAssessmentSession(genre);

    // テーマ間バランス確認
    const themeDistribution = getThemeDistribution(assessment.quizzes);
    const themes = Object.keys(themeDistribution);
    expect(themes).toHaveLength(genre.themes.length);

    // 難易度分布確認
    const difficultyDistribution = getDifficultyDistribution(assessment.quizzes);
    expect(difficultyDistribution.basic).toBe(8);
    expect(difficultyDistribution.intermediate).toBe(8);
    expect(difficultyDistribution.advanced).toBe(4);
  });
});
```

### パフォーマンステスト

```typescript
// 大量データ処理テスト
describe('Performance Tests', () => {
  test('Course loading performance under load', async () => {
    const startTime = performance.now();

    // 同時100ユーザーでコース読み込み
    const promises = Array(100).fill(0).map(() =>
      getLearningCourseDetails('ai_literacy_fundamentals')
    );

    await Promise.all(promises);
    const endTime = performance.now();

    expect(endTime - startTime).toBeLessThan(2000); // 2秒以内
  });

  test('Interactive content rendering performance', async () => {
    const largeInteractiveContent = createLargeDragDropContent(100); // 100アイテム

    const startRender = performance.now();
    const rendered = render(<InteractiveContentRenderer content={largeInteractiveContent} />);
    const endRender = performance.now();

    expect(endRender - startRender).toBeLessThan(500); // 500ms以内
    expect(rendered.getAllByTestId('drag-item')).toHaveLength(100);
  });
});
```

---

## 📈 監視・運用戦略

### 学習効果測定

```typescript
interface LearningEffectiveness {
  // 基本指標
  completion_rate: number;          // セッション完了率
  quiz_accuracy: number;            // クイズ正解率
  retention_rate: number;           // 知識定着率（復習時の成績）
  progression_speed: number;        // 学習進捗速度

  // 詳細指標
  engagement_metrics: {
    avg_session_duration: number;   // 平均セッション時間
    content_interaction_rate: number; // コンテンツ操作率
    video_completion_rate: number;  // 動画視聴完了率
    interactive_completion_rate: number; // インタラクティブ完了率
  };

  // 品質指標
  satisfaction_scores: {
    content_quality: number;        // コンテンツ品質評価
    difficulty_appropriateness: number; // 難易度適切性
    learning_path_effectiveness: number; // 学習パス有効性
  };
}

// 実装例
const measureLearningEffectiveness = async (userId: string, courseId: string): Promise<LearningEffectiveness> => {
  const completions = await getSessionCompletions(userId, courseId);
  const quizResults = await getQuizResults(userId, courseId);
  const reviewResults = await getReviewResults(userId, courseId);

  return {
    completion_rate: completions.length / getTotalSessions(courseId),
    quiz_accuracy: calculateAverageScore(quizResults),
    retention_rate: calculateRetentionRate(reviewResults),
    progression_speed: calculateProgressionSpeed(completions),
    // ... その他指標
  };
}
```

### システム監視

```typescript
// リアルタイム監視指標
interface SystemMonitoring {
  // API パフォーマンス
  api_metrics: {
    session_load_time: number;      // セッション読み込み時間
    content_render_time: number;    // コンテンツ描画時間
    quiz_response_time: number;     // クイズ応答時間
    ai_scoring_latency: number;     // AI採点遅延
  };

  // リソース使用量
  resource_usage: {
    database_connection_count: number;
    memory_usage_mb: number;
    cpu_usage_percent: number;
    storage_usage_gb: number;
  };

  // エラー率
  error_rates: {
    session_load_failure_rate: number;
    content_render_failure_rate: number;
    ai_scoring_failure_rate: number;
    data_corruption_rate: number;
  };
}

// アラート設定
const monitoringThresholds = {
  session_load_time: { warning: 2000, critical: 5000 }, // ms
  ai_scoring_latency: { warning: 10000, critical: 30000 }, // ms
  error_rate: { warning: 0.01, critical: 0.05 }, // 1%, 5%
  cpu_usage: { warning: 70, critical: 90 }, // %
  memory_usage: { warning: 80, critical: 95 } // %
};
```

---

## 🔄 マイグレーション・デプロイ計画

### Phase 1 → Phase 2 マイグレーション

```sql
-- 1. スキーマ拡張（ダウンタイムなし）
BEGIN;

-- セッションテーブル拡張
ALTER TABLE learning_sessions
ADD COLUMN review_data JSONB,
ADD COLUMN assessment_data JSONB;

-- コンテンツテーブル拡張
ALTER TABLE session_contents
ADD COLUMN image_data JSONB,
ADD COLUMN video_data JSONB,
ADD COLUMN interactive_data JSONB;

-- クイズテーブル拡張
ALTER TABLE session_quizzes
ADD COLUMN items JSONB,
ADD COLUMN scoring_method VARCHAR(20) DEFAULT 'fixed',
ADD COLUMN keyword_points JSONB,
ADD COLUMN ai_criteria JSONB;

-- 新テーブル作成
CREATE TABLE user_review_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  original_session_id VARCHAR REFERENCES learning_sessions(id),
  scheduled_date DATE NOT NULL,
  completed_date DATE,
  repetition_count INTEGER DEFAULT 0,
  retention_score INTEGER,
  next_review_date DATE,
  created_at TIMESTAMP DEFAULT now()
);

-- インデックス作成
CREATE INDEX idx_sessions_review_data ON learning_sessions USING gin(review_data);
CREATE INDEX idx_contents_image_data ON session_contents USING gin(image_data);
CREATE INDEX idx_review_schedule_user_date ON user_review_schedules(user_id, scheduled_date);

COMMIT;
```

```typescript
// 2. アプリケーション段階デプロイ
const migrationSteps = [
  {
    step: '2.1',
    description: 'API拡張デプロイ（後方互換性維持）',
    actions: [
      'New review API endpoints deployment',
      'Extended content type support',
      'New quiz type handlers',
      'Backward compatibility validation'
    ]
  },
  {
    step: '2.2',
    description: 'フロントエンド段階リリース（フィーチャーフラグ使用）',
    actions: [
      'Review session UI behind feature flag',
      'Image/video content renderer deployment',
      'New quiz type components',
      'A/B testing setup'
    ]
  },
  {
    step: '2.3',
    description: '段階的機能有効化',
    actions: [
      'Review feature beta test (10% users)',
      'Media content pilot test (specific courses)',
      'New quiz types limited rollout',
      'Performance monitoring'
    ]
  },
  {
    step: '2.4',
    description: 'Full rollout',
    actions: [
      'Enable for all users',
      'Update documentation',
      'Training materials',
      'Success metrics validation'
    ]
  }
];
```

### Phase 2 → Phase 3 マイグレーション

```typescript
// AI採点インフラ準備
const aiInfrastructureSetup = {
  '3.1_ai_service_setup': {
    description: 'AI採点サービス基盤構築',
    tasks: [
      'OpenAI API integration setup',
      'Prompt template management system',
      'AI response caching layer',
      'Fallback scoring system (keyword-based)'
    ]
  },

  '3.2_assessment_engine': {
    description: '総合評価エンジン実装',
    tasks: [
      'Question pool management system',
      'Adaptive question selection algorithm',
      'Assessment session generator',
      'Performance analytics dashboard'
    ]
  },

  '3.3_interactive_platform': {
    description: 'インタラクティブプラットフォーム',
    tasks: [
      'Drag-and-drop framework',
      'Simulation engine',
      'Calculator components library',
      'Progress tracking system'
    ]
  },

  '3.4_performance_optimization': {
    description: 'パフォーマンス最適化',
    tasks: [
      'Content delivery optimization',
      'Database query optimization',
      'Caching strategy implementation',
      'Load balancing setup'
    ]
  }
};
```

---

## 🎯 成果指標・KPI

### Phase別成功指標

#### Phase 1 KPI
```typescript
const phase1KPIs = {
  technical_stability: {
    typescript_errors: 0,
    eslint_errors: 0,
    build_success_rate: 1.0,
    test_coverage: '>= 80%'
  },

  functional_integrity: {
    backward_compatibility: '100% (249件データ)',
    session_crud_success_rate: '>= 99.9%',
    quiz_functionality: '100% working',
    performance_regression: '< 5%'
  },

  user_experience: {
    session_load_time: '< 2 seconds',
    error_rate: '< 1%',
    user_satisfaction: '>= 4.0/5.0'
  }
};
```

#### Phase 2 KPI
```typescript
const phase2KPIs = {
  feature_adoption: {
    review_session_usage: '>= 30% of active users',
    media_content_engagement: '>= 80% completion rate',
    new_quiz_type_usage: '>= 50% of sessions'
  },

  learning_effectiveness: {
    retention_improvement: '>= 15% vs Phase 1',
    completion_rate: '>= 85%',
    quiz_accuracy_improvement: '>= 10%'
  },

  system_performance: {
    media_load_time: '< 3 seconds',
    review_generation_time: '< 1 second',
    storage_usage_efficiency: '>= 90%'
  }
};
```

#### Phase 3 KPI
```typescript
const phase3KPIs = {
  advanced_features: {
    ai_scoring_accuracy: '>= 85% vs human scoring',
    assessment_completion_rate: '>= 75%',
    interactive_engagement: '>= 90% completion'
  },

  learning_outcomes: {
    knowledge_retention: '>= 80% after 30 days',
    skill_application: '>= 70% practical success',
    certification_value: '>= 4.5/5.0 employer rating'
  },

  business_metrics: {
    user_engagement_time: '+25% vs baseline',
    course_completion_rate: '>= 80%',
    user_satisfaction_nps: '>= 50'
  }
};
```

---

## 📋 まとめ・次のアクション

### 設計書の位置づけ

本設計書により、以下を実現する：

1. **既存データ保護**: 249件の学習コンテンツを完全保護
2. **段階的拡張**: リスクを最小化した3段階の機能拡張
3. **技術的整合性**: API・UI・DB間の不整合解消
4. **教育効果向上**: 科学的根拠に基づく学習機能強化

### 即座の次アクション

#### Phase 1: 基盤強化 (今すぐ開始)

1. **セッション型定義統一**
   - [ ] `/lib/types/learning.ts` の SessionType 統一
   - [ ] APIレスポンス型の統一
   - [ ] モーダル選択肢の統一

2. **existing multiple_choice 実装確認**
   - [ ] 既存2件の `multiple_choice` クイズ動作確認
   - [ ] UI実装状況の詳細調査
   - [ ] 不具合があれば修正実装

3. **型安全性強化**
   - [ ] TypeScript strict mode 有効化
   - [ ] 全ファイルでの型エラー解消
   - [ ] 自動テスト整備

**優先度**: 🔥 最高（今日開始）

この設計書に基づいて、まずPhase 1の基盤強化から開始することを推奨します。