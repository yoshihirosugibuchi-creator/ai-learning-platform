# ケーススタディ学習機能 要件定義・設計仕様書

**作成日**: 2026年1月26日
**ステータス**: 設計完了・実装準備中
**バージョン**: 1.0

---

## 目次

1. [コンセプト](#1-コンセプト)
2. [画面構成・権限](#2-画面構成権限)
3. [既存テーブルとの連携仕様](#3-既存テーブルとの連携仕様)
4. [新規テーブル定義](#4-新規テーブル定義)
5. [XP/SKP計算ロジック](#5-xpskp計算ロジック)
6. [AI採点システム](#6-ai採点システム)
7. [API設計](#7-api設計)
8. [実装ロードマップ](#8-実装ロードマップ)
9. [付録](#9-付録)

---

## 1. コンセプト

### 1.1 機能概要

AIが指示に基づきケーススタディ問題（選択式・記述式・ハイブリッド式）を自動生成し、学習者がそれを学習すると**既存のXP/SKP管理システム**を通じて学習成果が記録される。さらに、学習中の**思考プロセスをデータ化**し、AIによる個別フィードバックと学習分析を可能にする。

### 1.2 システム構成図

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ケーススタディ学習システム                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 管理者パネル（/admin/case-study）                             │   │
│  │ - AI問題生成                                                 │   │
│  │ - 問題編集・管理                                             │   │
│  │ - 公開/非公開設定                                            │   │
│  └───────────────────────────┬─────────────────────────────────┘   │
│                              ▼                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────────┐ │
│  │ 問題マスタ   │───▶│ ユーザー画面 │───▶│ 学習セッション           │ │
│  │ (DBテーブル) │    │(/case-study)│    │ (case_study_sessions)  │ │
│  └─────────────┘    └─────────────┘    └───────────┬─────────────┘ │
│                                                     │               │
│                                                     ▼               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    回答記録（2層構造）                        │   │
│  │  ┌─────────────────────┐    ┌─────────────────────────────┐ │   │
│  │  │ quiz_answers (既存)  │◀──▶│ case_study_step_details    │ │   │
│  │  │ session_type=        │1:1 │ (記述回答・AI採点詳細)       │ │   │
│  │  │ 'case_study'         │    │                            │ │   │
│  │  └──────────┬──────────┘    └─────────────────────────────┘ │   │
│  └─────────────┼───────────────────────────────────────────────┘   │
│                │                                                    │
│                ▼                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              既存XP/SKP統計システム（そのまま活用）            │   │
│  │  user_xp_stats_v2 / user_category_xp_stats_v2 /             │   │
│  │  user_subcategory_xp_stats_v2 / daily_xp_records            │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              思考プロセスデータ（新規）                        │   │
│  │  case_study_thinking_logs（ステップ単位で保管）               │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 学習フロー

```
【管理者】
1. 管理者パネルでAI問題生成 or 手動作成
2. 問題をレビュー・編集
3. 公開設定（active）

【学習者】
1. /case-study でケース選択（レコメンド/検索/チャレンジ）
2. ケース本文を読む
3. Step 1〜N を順番に回答（5〜8ステップ）
4. 全ステップ完了後、AI採点実行
5. 結果表示（10軸評価 + フィードバック）
6. XP/SKP付与（初回のみ）
```

---

## 2. 画面構成・権限

### 2.1 管理者パネル（問題生成・管理）

| 項目 | 内容 |
|------|------|
| **URL** | `/admin/case-study` |
| **権限** | `admin`, `system_admin` のみ |
| **機能** | AI問題生成、問題一覧、問題編集、公開/非公開管理、統計確認 |

#### 管理画面の構成

```
/admin/case-study
├── /admin/case-study                    # 問題一覧（フィルター・検索）
├── /admin/case-study/new                # 新規作成（AI生成 or 手動）
├── /admin/case-study/[id]               # 問題詳細・編集
├── /admin/case-study/[id]/steps         # ステップ編集
└── /admin/case-study/analytics          # 利用統計
```

#### AI問題生成フォーム

```typescript
interface GenerationForm {
  // 必須
  category_id: string           // カテゴリー
  difficulty: Difficulty        // 難易度

  // オプション
  subcategory_id?: string       // サブカテゴリー
  industry?: string             // 業界（manufacturing, finance, etc.）
  scenario_type?: string        // problem_solving, decision_making, strategy
  step_count?: number           // 5〜8（デフォルト5）
  custom_prompt?: string        // 追加指示
}
```

### 2.2 ユーザー画面（学習）

| 項目 | 内容 |
|------|------|
| **URL** | `/case-study` |
| **権限** | ログインユーザー全員 |
| **ナビゲーション** | メインタブに追加（Home, Course, Quiz と同列） |

#### ユーザー画面の構成

```
/case-study
├── /case-study                          # トップ（レコメンド・一覧）
├── /case-study/[problem_id]             # ケース詳細・学習開始
├── /case-study/session/[session_id]     # 学習中画面
└── /case-study/result/[session_id]      # 結果画面
```

#### トップページUI構成

```
┌─────────────────────────────────────────────────────────────┐
│  ケーススタディ                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  【今日のチャレンジ】                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 製造業の生産性向上ケース（中級・30分）         [挑戦する] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  【あなたへのおすすめ】                     [クイックスタート]│
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                      │
│  │ケース1   │ │ケース2   │ │ケース3   │                      │
│  │コンサル  │ │PM       │ │マーケ    │                      │
│  │中級      │ │上級      │ │基礎      │                      │
│  └─────────┘ └─────────┘ └─────────┘                      │
│                                                             │
│  【すべてのケーススタディ】                                   │
│  [カテゴリー▼] [難易度▼] [業界▼] [検索...]                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ タイトル        │ カテゴリー │ 難易度 │ 時間 │ 状態   │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ 歩留まり改善... │ コンサル   │ 中級   │ 30分 │ 未学習 │   │
│  │ 新規事業立案... │ 戦略      │ 上級   │ 45分 │ 完了   │   │
│  │ ...             │           │        │      │        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 問題発見・選択方法

| 方法 | 説明 | 実装優先度 |
|------|------|------------|
| **レコメンド** | 弱点カテゴリー・直近の学習履歴に基づく推薦（3〜5件） | Phase 1 |
| **一覧検索** | カテゴリー/難易度/業界でフィルター、キーワード検索 | Phase 1 |
| **今日のチャレンジ** | 毎日1問おすすめをピックアップ | Phase 2 |
| **クイックスタート** | ランダム1問で気軽に開始 | Phase 2 |
| **学習パス連動** | コース完了後に関連ケーススタディを推薦 | Phase 3 |

#### レコメンドロジック

```typescript
async function getRecommendations(userId: string, limit: number = 5) {
  // 1. ユーザーの弱点カテゴリーを取得
  const weakCategories = await getWeakCategories(userId)

  // 2. 未完了のケーススタディを取得
  const uncompletedProblems = await getUncompletedProblems(userId)

  // 3. スコアリング
  const scored = uncompletedProblems.map(p => ({
    ...p,
    score: calculateRecommendScore(p, weakCategories, userId)
  }))

  // 4. 上位N件を返す
  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}
```

---

## 3. 既存テーブルとの連携仕様

### 3.1 quiz_answers テーブルの活用

**目的**: 既存のXP集計・統計クエリをそのまま再利用するため、ケーススタディの各ステップ回答を`quiz_answers`に記録する。

#### 3.1.1 カラムマッピング（1ステップ = 1レコード）

| quiz_answers カラム | 型 | ケーススタディでの使用方法 |
|---------------------|-----|---------------------------|
| `id` | UUID | 自動生成 |
| `user_id` | UUID | 学習者のユーザーID |
| `quiz_session_id` | UUID | **`case_study_sessions.id`を格納** |
| `question_id` | string | **`case_study_steps.id`を格納** |
| `session_type` | string | **`'case_study'`固定** |
| `user_answer` | number \| null | 選択式: 選択肢インデックス(0-3)、記述式: `null` |
| `is_correct` | boolean | **ステップスコア60%以上（6点/10点満点）で`true`** |
| `time_spent` | number | そのステップの回答時間（**ミリ秒**） |
| `is_timeout` | boolean | 制限時間超過フラグ |
| `category_id` | string | **そのステップのカテゴリーID** |
| `subcategory_id` | string | **そのステップのサブカテゴリーID** |
| `difficulty` | string | 問題の難易度 |
| `earned_xp` | number | そのステップで獲得したXP（**初回のみ、再学習時は0**） |
| `hint_used` | boolean | ヒント使用有無 |
| `max_hint_level` | number | **0または1（ステップ単位で1つのヒントのみ）** |
| `hint_usage_details` | JSON | `{"used": true}` または `null` |
| `review_needed` | boolean | 復習が必要か（is_correct=falseの場合true） |
| `review_reason` | string | 復習理由 |
| `confidence_level` | number | 自己評価（1-5段階、任意） |
| `course_id` | string \| null | `null` |
| `course_session_id` | string \| null | `null` |
| `genre_id` | string \| null | ジャンルID（任意） |
| `theme_id` | string \| null | テーマID（任意） |

#### 3.1.2 FK制約の対応

**現状**: `quiz_answers.quiz_session_id` には `quiz_sessions` テーブルへのFK制約あり

**対応**: FK制約を削除

```sql
ALTER TABLE quiz_answers DROP CONSTRAINT quiz_answers_quiz_session_id_fkey;
```

**理由**: `session_type` カラムで論理的に区別するため、FK制約は不要。

#### 3.1.3 データ例（5ステップのケーススタディ）

```sql
-- 1件のケーススタディ学習 = 5件のquiz_answersレコード
-- quiz_session_id は全て同じ（case_study_sessions.id）
-- question_id は各ステップのID（case_study_steps.id）
-- time_spent の単位はミリ秒

INSERT INTO quiz_answers (
  user_id, quiz_session_id, question_id, session_type,
  user_answer, is_correct, time_spent, category_id, subcategory_id,
  difficulty, earned_xp, hint_used, max_hint_level
) VALUES
-- Step1: 状況把握（スコア8点/10点→is_correct=true、XP=16）
('user-uuid', 'cs-session-001', 'step-001', 'case_study',
 2, true, 45000,   -- 45秒
 'consulting', 'case_analysis', 'intermediate', 16, false, 0),

-- Step2: 問題設定（スコア7点/10点→is_correct=true、XP=14）
('user-uuid', 'cs-session-001', 'step-002', 'case_study',
 1, true, 60000,   -- 1分
 'consulting', 'problem_solving', 'intermediate', 14, false, 0),

-- Step3: 仮説立案（スコア8点/10点→is_correct=true、ヒント使用、XP=16）
('user-uuid', 'cs-session-001', 'step-003', 'case_study',
 null, true, 180000,   -- 3分（記述式なのでuser_answer=null）
 'consulting', 'hypothesis', 'intermediate', 16, true, 1),

-- Step4: 分析プラン（スコア5点/10点→is_correct=false、XP=10）
('user-uuid', 'cs-session-001', 'step-004', 'case_study',
 0, false, 120000,   -- 2分
 'project_management', 'planning', 'intermediate', 10, false, 0),

-- Step5: 提言策定（スコア9点/10点→is_correct=true、XP=18）
('user-uuid', 'cs-session-001', 'step-005', 'case_study',
 null, true, 240000,   -- 4分（記述式なのでuser_answer=null）
 'consulting', 'presentation', 'intermediate', 18, false, 0);

-- 合計: 5ステップ、合計XP=74、合計時間=645秒（約11分）
```

### 3.2 再学習時のXP付与ルール

| 学習回数 | XP付与 | SKP付与 |
|----------|--------|---------|
| 初回 | あり | あり |
| 2回目以降 | **なし** | **なし** |

**判定方法**: 同一ユーザー・同一problem_idの`case_study_sessions`で`status='completed'`のレコードが存在すれば再学習。

### 3.3 既存テーブルへのカラム追加

#### daily_xp_records

```sql
ALTER TABLE daily_xp_records ADD COLUMN IF NOT EXISTS
  case_study_sessions INTEGER DEFAULT 0;
ALTER TABLE daily_xp_records ADD COLUMN IF NOT EXISTS
  case_study_xp_earned INTEGER DEFAULT 0;
ALTER TABLE daily_xp_records ADD COLUMN IF NOT EXISTS
  case_study_time_seconds INTEGER DEFAULT 0;
```

#### user_xp_stats_v2

```sql
ALTER TABLE user_xp_stats_v2 ADD COLUMN IF NOT EXISTS
  case_study_xp INTEGER DEFAULT 0;
ALTER TABLE user_xp_stats_v2 ADD COLUMN IF NOT EXISTS
  case_study_skp INTEGER DEFAULT 0;
ALTER TABLE user_xp_stats_v2 ADD COLUMN IF NOT EXISTS
  case_study_sessions_completed INTEGER DEFAULT 0;
ALTER TABLE user_xp_stats_v2 ADD COLUMN IF NOT EXISTS
  case_study_average_score NUMERIC(5,2) DEFAULT 0;
```

### 3.4 xp_level_skp_settings テーブルへの追加

**ステップ単価方式（確定）**:

| setting_category | setting_key | setting_value | 説明 |
|------------------|-------------|---------------|------|
| `xp_case_study_step` | `basic` | 10 | 1ステップあたりXP（基礎） |
| `xp_case_study_step` | `intermediate` | 20 | 1ステップあたりXP（中級） |
| `xp_case_study_step` | `advanced` | 30 | 1ステップあたりXP（上級） |
| `xp_case_study_step` | `expert` | 40 | 1ステップあたりXP（エキスパート） |
| `xp_bonus` | `case_study_high_score` | 30 | 高スコア（80%以上）ボーナス |
| `xp_bonus` | `case_study_no_hint` | 20 | ヒント未使用ボーナス |
| `xp_bonus` | `case_study_quick` | 15 | 20分以内完了ボーナス |
| `skp` | `case_study_base` | 50 | ケーススタディ基本SKP |
| `skp` | `case_study_high_score_bonus` | 30 | 高スコアSKPボーナス |

---

## 4. 新規テーブル定義

### 4.1 case_study_problems（問題マスタ）

```sql
CREATE TABLE case_study_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本情報
  title VARCHAR(200) NOT NULL,
  case_text TEXT NOT NULL,              -- ケース本文（Markdown形式）

  -- カテゴリー（検索・表示用。XP計上は各ステップで指定）
  primary_category_id VARCHAR(100) NOT NULL,
  primary_subcategory_id VARCHAR(100) NOT NULL,

  -- 難易度
  difficulty VARCHAR(20) NOT NULL DEFAULT 'intermediate'
    CHECK (difficulty IN ('basic', 'intermediate', 'advanced', 'expert')),

  -- メタデータ
  industry VARCHAR(100),                -- 業界
  scenario_type VARCHAR(50),            -- シナリオタイプ
  estimated_minutes INTEGER DEFAULT 30,
  step_count INTEGER NOT NULL DEFAULT 5
    CHECK (step_count >= 5 AND step_count <= 8),

  -- XP設定（上書き用）
  custom_base_xp_per_step INTEGER,      -- NULL=設定テーブルの値を使用

  -- AI生成情報
  is_ai_generated BOOLEAN DEFAULT FALSE,
  generation_prompt TEXT,
  generation_model VARCHAR(50),
  generation_parameters JSONB,

  -- ステータス管理
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'review', 'active', 'archived')),

  -- 監査情報
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_csp_category ON case_study_problems(primary_category_id);
CREATE INDEX idx_csp_status ON case_study_problems(status);
CREATE INDEX idx_csp_difficulty ON case_study_problems(difficulty);
```

### 4.2 case_study_steps（ステップ定義）

```sql
CREATE TABLE case_study_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES case_study_problems(id) ON DELETE CASCADE,

  -- ステップ情報
  step_number INTEGER NOT NULL
    CHECK (step_number >= 1 AND step_number <= 8),
  step_name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,

  -- このステップのカテゴリー（XP計上先）
  category_id VARCHAR(100) NOT NULL,
  subcategory_id VARCHAR(100) NOT NULL,

  -- 問題タイプ
  question_type VARCHAR(20) NOT NULL
    CHECK (question_type IN ('single', 'multiple', 'ordering', 'text', 'hybrid')),

  -- 選択肢（選択式・ハイブリッド式の場合）
  options JSONB,
  /*
    例:
    [
      {"id": "A", "text": "選択肢A", "is_correct": true, "partial_score": 1.0},
      {"id": "B", "text": "選択肢B", "is_correct": false, "partial_score": 0},
      {"id": "C", "text": "選択肢C", "is_correct": true, "partial_score": 0.5},
      {"id": "D", "text": "選択肢D", "is_correct": false, "partial_score": 0}
    ]
  */

  -- 模範解答・採点基準
  model_answer JSONB NOT NULL,
  /*
    例:
    {
      "ideal_choices": ["A", "C"],
      "acceptable_choices": ["A"],
      "essential_points": ["歩留まり", "原因特定", "データ分析"],
      "good_examples": ["優秀回答例1...", "優秀回答例2..."],
      "common_mistakes": ["よくある間違い1..."],
      "scoring_anchors": {
        "5": "すべての必須ポイントを網羅し、独自の視点も含む",
        "4": "必須ポイントを概ね網羅",
        "3": "必須ポイントの半数以上をカバー",
        "2": "一部のポイントのみ言及",
        "1": "ほとんど的外れ"
      }
    }
  */

  -- ヒント（ステップ単位で1つのみ）
  hint TEXT,

  -- 評価対象スキル軸（10軸から該当するものを指定）
  target_skills JSONB NOT NULL,
  -- 例: ["problem_setting", "structuring_logic"]

  -- 配点
  max_score INTEGER DEFAULT 10,

  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(problem_id, step_number)
);

CREATE INDEX idx_css_problem ON case_study_steps(problem_id);
```

### 4.3 case_study_sessions（学習セッション）

```sql
CREATE TABLE case_study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  problem_id UUID NOT NULL REFERENCES case_study_problems(id),

  -- セッション状態
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  current_step INTEGER DEFAULT 1,

  -- 再学習フラグ
  is_retry BOOLEAN DEFAULT FALSE,

  -- 時間記録
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_time_seconds INTEGER,

  -- ヒント使用（全ステップ合計）
  hint_count INTEGER DEFAULT 0,

  -- AI採点結果（完了時に格納）
  scoring_result JSONB,
  /*
    例:
    {
      "step_scores": [
        {"step": 1, "score": 8, "max": 10, "feedback": "..."},
        {"step": 2, "score": 7, "max": 10, "feedback": "..."}
      ],
      "skill_scores": {
        "problem_setting": 4,
        "structuring_logic": 3,
        "hypothesis_thinking": 4
      },
      "overall_feedback": "総合フィードバック..."
    }
  */

  total_score INTEGER,                  -- 合計スコア
  max_possible_score INTEGER,           -- 満点（step_count × 10）
  score_percentage NUMERIC(5,2),        -- スコア率（%）

  -- XP/SKP獲得結果
  xp_earned INTEGER DEFAULT 0,
  skp_earned INTEGER DEFAULT 0,
  bonus_details JSONB,
  -- 例: {"high_score": 30, "no_hint": 20}

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_csess_user ON case_study_sessions(user_id);
CREATE INDEX idx_csess_problem ON case_study_sessions(problem_id);
CREATE INDEX idx_csess_status ON case_study_sessions(status);
CREATE INDEX idx_csess_user_problem ON case_study_sessions(user_id, problem_id);
```

### 4.4 case_study_step_details（回答詳細）

```sql
CREATE TABLE case_study_step_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- quiz_answersとの1:1関連（アプリケーションレベルで管理）
  quiz_answer_id UUID NOT NULL UNIQUE,
  session_id UUID NOT NULL REFERENCES case_study_sessions(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES case_study_steps(id),
  step_number INTEGER NOT NULL,

  -- 詳細回答データ
  selected_choices JSONB,               -- 複数選択: ["A", "C"]
  reasoning_text TEXT,                  -- 記述回答テキスト

  -- ステップ別AI採点結果
  step_scoring JSONB,
  /*
    例:
    {
      "score": 8,
      "max_score": 10,
      "skill_scores": {"problem_setting": 4, "structuring_logic": 4},
      "keyword_match": {"found": ["歩留まり", "原因"], "missing": ["データ"]},
      "feedback": "詳細フィードバック...",
      "improvement_points": ["改善点1", "改善点2"]
    }
  */

  -- 時間詳細
  step_started_at TIMESTAMPTZ,
  step_answered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cssd_session ON case_study_step_details(session_id);
CREATE INDEX idx_cssd_quiz_answer ON case_study_step_details(quiz_answer_id);
```

### 4.5 case_study_thinking_logs（思考プロセスログ）

```sql
CREATE TABLE case_study_thinking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES case_study_sessions(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,

  -- 行動ログ
  action_type VARCHAR(50) NOT NULL,
  /*
    'choice_selected'   - 選択肢を選んだ
    'choice_changed'    - 選択肢を変更した
    'reasoning_typed'   - 記述を入力した
    'reasoning_edited'  - 記述を編集した
    'hint_requested'    - ヒントを表示した
    'step_submitted'    - ステップを提出した
  */

  action_data JSONB,
  /*
    choice_selected: {"choice": "A"}
    choice_changed: {"from": "A", "to": "B"}
    reasoning_typed: {"text_length": 150, "word_count": 25}
    hint_requested: {}
  */

  -- タイムスタンプ
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  time_since_step_start_ms INTEGER,     -- ミリ秒

  -- その時点での状態
  choices_at_action JSONB,              -- ["A", "C"]
  reasoning_length_at_action INTEGER
);

CREATE INDEX idx_cstl_session ON case_study_thinking_logs(session_id);
CREATE INDEX idx_cstl_session_step ON case_study_thinking_logs(session_id, step_number);
```

---

## 5. XP/SKP計算ロジック

### 5.1 ステップ単価方式

| 難易度 | 1ステップあたりXP |
|--------|-------------------|
| basic | 10 |
| intermediate | 20 |
| advanced | 30 |
| expert | 40 |

### 5.2 計算フロー

```typescript
async function calculateCaseStudyReward(
  session: CaseStudySession,
  problem: CaseStudyProblem,
  xpSettings: XPSettings,
  isRetry: boolean
): Promise<{earnedXP: number, earnedSKP: number, bonusDetails: object}> {

  // 再学習の場合はXP/SKP = 0
  if (isRetry) {
    return { earnedXP: 0, earnedSKP: 0, bonusDetails: {} }
  }

  const difficulty = problem.difficulty
  const stepCount = problem.step_count

  // 1. 基本XP（ステップ単価 × ステップ数 × スコア率）
  const xpPerStep = problem.custom_base_xp_per_step
    ?? xpSettings.xp_case_study_step[difficulty]
  const scoreRatio = session.total_score / session.max_possible_score
  let earnedXP = Math.round(xpPerStep * stepCount * scoreRatio)

  // 2. ボーナス計算
  const bonusDetails: Record<string, number> = {}

  // 高スコアボーナス（80%以上）
  if (scoreRatio >= 0.8) {
    const bonus = xpSettings.xp_bonus.case_study_high_score  // 30
    earnedXP += bonus
    bonusDetails.high_score = bonus
  }

  // ヒント未使用ボーナス
  if (session.hint_count === 0) {
    const bonus = xpSettings.xp_bonus.case_study_no_hint  // 20
    earnedXP += bonus
    bonusDetails.no_hint = bonus
  }

  // 20分以内完了ボーナス
  if (session.total_time_seconds <= 1200) {
    const bonus = xpSettings.xp_bonus.case_study_quick  // 15
    earnedXP += bonus
    bonusDetails.quick = bonus
  }

  // 3. SKP計算
  let earnedSKP = xpSettings.skp.case_study_base  // 50
  if (scoreRatio >= 0.8) {
    earnedSKP += xpSettings.skp.case_study_high_score_bonus  // 30
  }

  return { earnedXP, earnedSKP, bonusDetails }
}
```

### 5.3 ステップ別XP配分

各ステップの `earned_xp` はスコア比率に応じて配分:

```typescript
// 各ステップ: ステップ単価 × (そのステップのスコア / 満点)
// 例: intermediate、Step1スコア8点/10点
// earned_xp = 20 × (8/10) = 16
```

### 5.4 計算例

**条件**: 5ステップ・中級・合計スコア37点/50点（74%）

```
ステップ別XP:
  Step1: 20 × (8/10) = 16 XP
  Step2: 20 × (7/10) = 14 XP
  Step3: 20 × (8/10) = 16 XP
  Step4: 20 × (5/10) = 10 XP
  Step5: 20 × (9/10) = 18 XP
  ─────────────────────────
  合計: 74 XP

ボーナス（スコア率74%なので高スコアボーナスなし）:
  ヒント未使用: +20 XP（該当する場合）
  20分以内完了: +15 XP（該当する場合）
```

**条件**: 7ステップ・上級・合計スコア56点/70点（80%）

```
基本XP: 30 × 7 × 0.8 = 168 XP
ボーナス:
  高スコア（80%以上）: +30 XP
  ヒント未使用: +20 XP
  20分以内完了: +15 XP
─────────────────────────
合計: 最大233 XP
```

---

## 6. AI採点システム

### 6.1 is_correct 判定基準

| ステップスコア | is_correct |
|----------------|------------|
| 6点以上（60%以上） | `true` |
| 5点以下（60%未満） | `false` |

### 6.2 10軸ルーブリック評価

| # | 軸ID | 日本語名 | 評価観点 |
|---|------|----------|----------|
| 1 | `problem_setting` | 問題設定力 | 本質的課題の特定精度 |
| 2 | `structuring_logic` | ロジック構造化 | 論理展開の明確さ |
| 3 | `hypothesis_thinking` | 仮説思考 | 仮説の質と網羅性 |
| 4 | `analysis_design` | 分析設計 | 検証方法の妥当性 |
| 5 | `proposal_specificity` | 提案具体性 | 施策の実行可能性 |
| 6 | `perspective_diversity` | 視点の多様性 | 多角的検討の有無 |
| 7 | `feasibility` | 実現可能性 | 制約条件の考慮 |
| 8 | `impact` | インパクト | 期待効果の大きさ |
| 9 | `expression` | 表現力 | 記述の明確さ |
| 10 | `originality` | 独自性 | 創造的な視点 |

### 6.3 ステップ別の主要評価軸

| ステップ | 主な評価軸 |
|----------|-----------|
| 状況把握 | `problem_setting`, `structuring_logic` |
| 問題設定 | `problem_setting`, `perspective_diversity` |
| 仮説立案 | `hypothesis_thinking`, `originality` |
| 分析プラン | `analysis_design`, `feasibility` |
| 提言策定 | `proposal_specificity`, `impact`, `expression` |

### 6.4 採点プロンプト構造

```
あなたはケーススタディの採点者です。以下の基準に従って学習者の回答を評価してください。

【ケース本文】
{case_text}

【設問】
ステップ{step_number}: {step_name}
{description}

【学習者の回答】
選択: {selected_choices}
理由: {reasoning_text}

【模範解答】
正解選択肢: {ideal_choices}
必須キーワード: {essential_points}
優秀回答例: {good_examples}

【採点基準（スコアアンカー）】
5点: {scoring_anchors.5}
4点: {scoring_anchors.4}
3点: {scoring_anchors.3}
2点: {scoring_anchors.2}
1点: {scoring_anchors.1}

【評価対象スキル】
{target_skills}

以下の形式でJSONを出力してください:
{
  "score": 数値(1-10),
  "skill_scores": {"スキル名": 数値(1-5), ...},
  "keyword_match": {"found": [...], "missing": [...]},
  "feedback": "具体的なフィードバック",
  "improvement_points": ["改善点1", "改善点2"]
}
```

---

## 7. API設計

### 7.1 管理者API

| メソッド | エンドポイント | 説明 | 権限 |
|----------|----------------|------|------|
| POST | `/api/admin/case-study/generate` | AI問題生成 | admin, system_admin |
| GET | `/api/admin/case-study/problems` | 問題一覧 | admin, system_admin |
| GET | `/api/admin/case-study/problems/[id]` | 問題詳細 | admin, system_admin |
| PUT | `/api/admin/case-study/problems/[id]` | 問題更新 | admin, system_admin |
| DELETE | `/api/admin/case-study/problems/[id]` | 問題削除 | admin, system_admin |
| PUT | `/api/admin/case-study/problems/[id]/status` | ステータス変更 | admin, system_admin |

### 7.2 ユーザーAPI

| メソッド | エンドポイント | 説明 |
|----------|----------------|------|
| GET | `/api/case-study/problems` | 公開問題一覧（status='active'のみ） |
| GET | `/api/case-study/problems/[id]` | 問題詳細 |
| GET | `/api/case-study/recommendations` | レコメンド取得 |
| GET | `/api/case-study/daily-challenge` | 今日のチャレンジ |
| POST | `/api/case-study/sessions/start` | セッション開始 |
| POST | `/api/case-study/sessions/[id]/answer` | 回答提出 |
| POST | `/api/case-study/sessions/[id]/complete` | セッション完了・採点 |
| POST | `/api/case-study/sessions/[id]/thinking-log` | 思考ログ送信 |
| GET | `/api/case-study/sessions/[id]/result` | 結果取得 |

### 7.3 API詳細

#### セッション開始

**POST `/api/case-study/sessions/start`**

```typescript
// Request
{ problem_id: string }

// Response
{
  success: boolean,
  session_id: string,
  is_retry: boolean,        // 再学習かどうか（XP付与なし）
  problem: CaseStudyProblem,
  steps: CaseStudyStep[],
  current_step: 1
}
```

#### 回答提出

**POST `/api/case-study/sessions/[id]/answer`**

```typescript
// Request
{
  step_number: number,
  selected_choices?: string[],    // 選択式
  reasoning_text?: string,        // 記述式
  time_spent_ms: number,
  hint_used: boolean
}

// Response
{
  success: boolean,
  next_step?: number,             // nullなら最終ステップ完了
  is_last_step: boolean
}
```

#### セッション完了・採点

**POST `/api/case-study/sessions/[id]/complete`**

```typescript
// Response
{
  success: boolean,
  scoring_result: {
    total_score: number,
    max_possible_score: number,
    score_percentage: number,
    step_scores: Array<{step: number, score: number, feedback: string}>,
    skill_scores: Record<string, number>,
    overall_feedback: string
  },
  rewards: {
    xp_earned: number,            // 再学習時は0
    skp_earned: number,           // 再学習時は0
    is_retry: boolean,
    bonus_details: object
  }
}
```

---

## 8. 実装ロードマップ

### Phase 1: 基盤構築（MVP）

**バックエンド:**
- [ ] 新規テーブル作成（5テーブル）
- [ ] 既存テーブルへのカラム追加（daily_xp_records, user_xp_stats_v2）
- [ ] xp_level_skp_settingsへの設定追加
- [ ] quiz_answers FK制約削除
- [ ] 管理者API実装
- [ ] ユーザーAPI実装（基本CRUD、セッション管理）
- [ ] XP/SKP計算・保存ロジック
- [ ] 再学習判定ロジック

**フロントエンド:**
- [ ] 管理者パネル（問題一覧、新規作成、編集）
- [ ] ユーザー画面（一覧、検索、学習画面、結果画面）
- [ ] ナビゲーションにタブ追加

### Phase 2: AI機能

- [ ] AI問題生成API（Claude API連携）
- [ ] AI採点システム
- [ ] 模範解答管理UI
- [ ] レコメンド機能
- [ ] 今日のチャレンジ機能

### Phase 3: 分析・高度化

- [ ] 思考プロセスログ収集UI
- [ ] 学習分析ダッシュボード
- [ ] 学習パス連動レコメンド
- [ ] クイックスタート機能

---

## 9. 付録

### 9.1 session_type の値一覧

| 値 | 説明 |
|----|------|
| `'quiz'` | 通常クイズ（既存） |
| `'course_confirmation'` | コース確認テスト（既存） |
| `'case_study'` | ケーススタディ（**新規**） |

### 9.2 difficulty の値一覧

| 値 | 日本語 | ステップ単価XP |
|----|--------|----------------|
| `'basic'` | 基礎 | 10 |
| `'intermediate'` | 中級 | 20 |
| `'advanced'` | 上級 | 30 |
| `'expert'` | エキスパート | 40 |

### 9.3 question_type の値一覧

| 値 | 説明 | user_answer | selected_choices |
|----|------|-------------|------------------|
| `'single'` | 単一選択 | 選択肢index | null |
| `'multiple'` | 複数選択 | null | `["A", "C"]` |
| `'ordering'` | 順序付け | null | `[{"id":"B","order":1}]` |
| `'text'` | 記述式 | null | null |
| `'hybrid'` | 選択+記述 | 選択肢index | 追加選択あれば |

### 9.4 ステップ数の制約

| 項目 | 値 |
|------|-----|
| 最小ステップ数 | 5 |
| 最大ステップ数 | 8 |

### 9.5 権限一覧

| 画面 | 必要権限 |
|------|----------|
| `/admin/case-study/*` | `admin`, `system_admin` |
| `/case-study/*` | ログインユーザー全員 |

---

*本ドキュメントに基づき実装を進めてください。*
