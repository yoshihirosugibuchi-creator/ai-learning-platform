# ケーススタディ学習機能 要件定義・設計仕様書

**作成日**: 2026年1月26日
**更新日**: 2026年1月27日
**ステータス**: 設計完了・実装準備中
**バージョン**: 2.0

---

## 変更履歴

| バージョン | 日付 | 変更内容 |
|------------|------|----------|
| 1.0 | 2026-01-26 | 初版作成 |
| 2.0 | 2026-01-27 | 10軸ルーブリック詳細化、ルーブリック管理テーブル追加、AI採点プロンプト構造明確化、レコメンド・検索・復習ロジック詳細化、多軸分析設計追加 |

---

## 目次

1. [コンセプト](#1-コンセプト)
2. [画面構成・権限](#2-画面構成権限)
3. [既存テーブルとの連携仕様](#3-既存テーブルとの連携仕様)
4. [新規テーブル定義](#4-新規テーブル定義)
5. [10軸ルーブリック評価システム](#5-10軸ルーブリック評価システム)
6. [XP/SKP計算ロジック](#6-xpskp計算ロジック)
7. [AI採点システム](#7-ai採点システム)
8. [標準5ステップフレームワーク](#8-標準5ステップフレームワーク)
9. [レコメンド・検索・発見機能](#9-レコメンド検索発見機能)
10. [復習機能](#10-復習機能)
11. [API設計](#11-api設計)
12. [UI概要](#12-ui概要)
13. [多軸分析・タグシステム設計（Phase 3）](#13-多軸分析タグシステム設計phase-3)
14. [実装ロードマップ](#14-実装ロードマップ)
15. [付録](#15-付録)

---

## 1. コンセプト

### 1.1 機能概要

AIが指示に基づきケーススタディ問題（選択式・記述式・ハイブリッド式）を自動生成し、学習者がそれを学習すると**既存のXP/SKP管理システム**を通じて学習成果が記録される。さらに、学習中の**思考プロセスをデータ化**し、AIによる**10軸ルーブリック評価**と個別フィードバックを可能にする。

### 1.2 v2での主な追加・変更点

| 項目 | v1 | v2 |
|------|-----|-----|
| 10軸ルーブリック | 基本定義のみ | 5グループ分類、1-5スコアアンカー詳細定義 |
| ルーブリック管理 | ハードコード前提 | `case_study_rubric_axes`テーブルで管理 |
| AI採点プロンプト | 概念のみ | 問題生成用・回答評価用の2種類を明確化 |
| ヒント | 動的生成可能 | 問題作成時に生成・保存（静的） |
| レコメンド | 概念のみ | 弱点カテゴリー+難易度+学習履歴のスコアリングロジック |
| 復習機能 | 未定義 | クイズ同様の復習判定・復習モード追加 |
| 多軸分析 | 未定義 | Phase 3でskill_tagsシステム実装予定 |
| UI仕様 | 画面構成のみ | 別ドキュメント（case-study-ui-design.md）に詳細化 |

### 1.3 システム構成図

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ケーススタディ学習システム                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ 管理者パネル（/admin/case-study）                             │   │
│  │ - AI問題生成（プロンプト: 問題生成用）                         │   │
│  │ - 問題編集・管理                                             │   │
│  │ - ルーブリック軸管理                                          │   │
│  │ - 今日のおすすめ設定                                          │   │
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
│  │       AI採点エンジン（プロンプト: 回答評価用）                  │   │
│  │  - 10軸ルーブリック評価                                       │   │
│  │  - ステップ別フィードバック生成                                │   │
│  │  - 総合フィードバック生成                                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
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

### 1.4 学習フロー

```
【管理者】
1. 管理者パネルでAI問題生成 or 手動作成
   - AI生成時: 問題本文 + 5〜8ステップ + ヒント（各ステップ）を一括生成
2. 問題をレビュー・編集
3. コース連動設定（任意）
4. 今日のおすすめ設定（任意）
5. 公開設定（active）

【学習者】
1. /case-study でケース選択（レコメンド/検索/チャレンジ）
2. ケース本文を読む
3. Step 1〜N を順番に回答（5〜8ステップ）
   - 各ステップ: ハイブリッド形式（選択式 + 記述式）
   - ヒント: 問題作成時に生成済みのものを表示
4. 全ステップ完了後、AI採点実行（1回のAPI呼び出し）
5. 結果表示（10軸評価 + ステップ別フィードバック + 総合フィードバック）
6. XP/SKP付与（初回のみ）
7. 復習対象フラグ設定（条件に該当する場合）
```

---

## 2. 画面構成・権限

### 2.1 管理者パネル（問題生成・管理）

| 項目 | 内容 |
|------|------|
| **URL** | `/admin/case-study` |
| **権限** | `admin`, `system_admin` のみ |
| **機能** | AI問題生成、問題一覧、問題編集、ルーブリック管理、コース連動設定、今日のおすすめ設定、公開/非公開管理、統計確認 |

#### 管理画面の構成

```
/admin/case-study
├── /admin/case-study                    # 問題一覧（フィルター・検索）
├── /admin/case-study/new                # 新規作成（AI生成 or 手動）
├── /admin/case-study/[id]               # 問題詳細・編集
├── /admin/case-study/[id]/steps         # ステップ編集
├── /admin/case-study/[id]/course-link   # コース連動設定
├── /admin/case-study/rubric             # ルーブリック軸管理
├── /admin/case-study/daily-featured     # 今日のおすすめ管理
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
├── /case-study/result/[session_id]      # 結果画面
└── /case-study?mode=review              # 復習モード
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
| `user_answer` | number \| null | 選択式: 選択肢インデックス(0-3)、記述式/ハイブリッド: `null` |
| `is_correct` | boolean | **ステップスコア ≥ max_score × 60% で`true`** |
| `time_spent` | number | そのステップの回答時間（**ミリ秒**） |
| `is_timeout` | boolean | 制限時間超過フラグ |
| `category_id` | string | **そのステップのカテゴリーID** |
| `subcategory_id` | string | **そのステップのサブカテゴリーID** |
| `difficulty` | string | 問題の難易度 |
| `earned_xp` | number | そのステップで獲得したXP（**初回のみ、再学習時は0**） |
| `hint_used` | boolean | ヒント使用有無 |
| `max_hint_level` | number | **0（未使用）または1（使用）** |
| `hint_usage_details` | JSON | `{"used": true}` または `null` |
| `review_needed` | boolean | 復習が必要か |
| `review_reason` | string | 復習理由（後述） |
| `confidence_level` | number | 自己評価（1-5段階、任意） |
| `course_id` | string \| null | `null` |
| `course_session_id` | string \| null | `null` |
| `genre_id` | string \| null | ジャンルID（任意） |
| `theme_id` | string \| null | テーマID（任意） |

#### 3.1.2 is_correct 判定基準

| 条件 | is_correct |
|------|------------|
| ステップスコア ≥ max_score × 60% | `true` |
| ステップスコア < max_score × 60% | `false` |

**例**: max_score=10の場合、6点以上で`true`。max_score=20の場合、12点以上で`true`。

#### 3.1.3 hint_used と max_hint_level の使用方法

**クイズシステムとの比較**:

| システム | max_hint_level | 復習対象条件 |
|----------|----------------|-------------|
| クイズ | 0-3（3段階ヒント） | 2以上で復習対象 |
| ケーススタディ | 0または1（1つのヒントのみ） | 1で復習対象 |

**ケーススタディでの運用**:
- `hint_used = false`, `max_hint_level = 0`: ヒント未使用
- `hint_used = true`, `max_hint_level = 1`: ヒント使用 → **復習対象**

既存システムとの一貫性のため、`hint_used`と`max_hint_level`の両方を記録します。

#### 3.1.4 review_reason（ケーススタディ用）

| review_reason | 説明 | 条件 |
|---------------|------|------|
| `low_score` | 低スコア | ステップスコア < max_score × 60% |
| `hint_used` | ヒント使用 | hint_used = true |
| `low_confidence` | 低自信 | confidence_level ≤ 2 |
| `slow_response` | 長時間回答 | time_spent > 推定時間 × 80% |
| `weak_skill_axis` | 弱点スキル軸 | 特定スキル軸が2点以下 |

#### 3.1.5 confidence_level の使用

各ステップ回答後に任意で自己評価を入力可能:
- 1: 全く自信がない
- 2: あまり自信がない
- 3: 普通
- 4: まあまあ自信がある
- 5: とても自信がある

1-2の場合は復習対象にフラグを設定。

#### 3.1.6 FK制約の対応

**対応**: FK制約を削除（マイグレーション済み）

```sql
ALTER TABLE quiz_answers DROP CONSTRAINT quiz_answers_quiz_session_id_fkey;
```

### 3.2 再学習時のXP付与ルール

| 学習回数 | XP付与 | SKP付与 |
|----------|--------|---------|
| 初回 | あり | あり |
| 2回目以降 | **なし** | **なし** |

**判定方法**: 同一ユーザー・同一problem_idの`case_study_sessions`で`status='completed'`のレコードが存在すれば再学習。

### 3.3 既存テーブルへのカラム追加（マイグレーション済み）

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

### 3.4 xp_level_skp_settings テーブルへの追加（マイグレーション済み）

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

### 4.1 case_study_problems（問題マスタ）【マイグレーション済み】

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
```

### 4.2 case_study_problems 追加カラム【Phase 1で追加】

```sql
-- 今日のおすすめ設定用
ALTER TABLE case_study_problems ADD COLUMN
  featured_date DATE;  -- この日に「今日のおすすめ」として表示
```

### 4.3 case_study_course_links（コース連動）【Phase 1で追加】

```sql
CREATE TABLE case_study_course_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES case_study_problems(id) ON DELETE CASCADE,
  course_id VARCHAR(100) NOT NULL,      -- learning_sessions.id
  display_after_session INTEGER,        -- 何セッション目以降に表示するか（NULL=コース完了後）
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(problem_id, course_id)
);

CREATE INDEX idx_cscl_course ON case_study_course_links(course_id);
CREATE INDEX idx_cscl_problem ON case_study_course_links(problem_id);
```

### 4.4 case_study_steps（ステップ定義）【マイグレーション済み】

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

  -- 模範解答・採点基準
  model_answer JSONB NOT NULL,

  -- ヒント（問題作成時にAI生成、ステップ単位で1つのみ）
  hint TEXT,

  -- 評価対象スキル軸（10軸から該当するものを指定）
  target_skills JSONB NOT NULL,

  -- 配点（変更可能）
  max_score INTEGER DEFAULT 10,

  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(problem_id, step_number)
);
```

### 4.5 case_study_sessions（学習セッション）【マイグレーション済み】

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

  total_score INTEGER,                  -- 合計スコア
  max_possible_score INTEGER,           -- 満点（各ステップのmax_scoreの合計）
  score_percentage NUMERIC(5,2),        -- スコア率（%）

  -- XP/SKP獲得結果
  xp_earned INTEGER DEFAULT 0,
  skp_earned INTEGER DEFAULT 0,
  bonus_details JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.6 case_study_step_details（回答詳細）【マイグレーション済み】

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

  -- 時間詳細
  step_started_at TIMESTAMPTZ,
  step_answered_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.7 case_study_thinking_logs（思考プロセスログ）【マイグレーション済み】

```sql
CREATE TABLE case_study_thinking_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES case_study_sessions(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,

  -- 行動ログ
  action_type VARCHAR(50) NOT NULL,
  action_data JSONB,

  -- タイムスタンプ
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  time_since_step_start_ms INTEGER,

  -- その時点での状態
  choices_at_action JSONB,
  reasoning_length_at_action INTEGER
);
```

### 4.8 case_study_rubric_axes（ルーブリック軸定義）【Phase 1で追加】

```sql
CREATE TABLE case_study_rubric_axes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 軸識別
  axis_code VARCHAR(50) NOT NULL UNIQUE,  -- 'problem_setting', 'structuring_logic', etc.
  axis_name VARCHAR(100) NOT NULL,        -- '問題設定力', 'ロジック構造化', etc.

  -- グループ分類
  rubric_group_code VARCHAR(10) NOT NULL, -- 'A', 'B', 'C', 'D', 'E'
  rubric_group_name VARCHAR(50) NOT NULL, -- '思考基盤', '価値創造', etc.

  -- 定義・説明
  definition TEXT NOT NULL,               -- 軸の定義（AIプロンプトに使用）
  evaluation_points TEXT[],               -- 評価ポイント（配列）

  -- 1-5スコアアンカー
  score_anchors JSONB NOT NULL,
  /*
    {
      "1": "○○ができていない",
      "2": "○○が不十分",
      "3": "○○が概ねできている",
      "4": "○○が十分にできている",
      "5": "○○が卓越している"
    }
  */

  -- 表示順
  display_order INTEGER NOT NULL,

  -- ステータス
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_csra_group ON case_study_rubric_axes(rubric_group_code);
CREATE INDEX idx_csra_active ON case_study_rubric_axes(is_active);
```

---

## 5. 10軸ルーブリック評価システム

### 5.1 5グループ × 2軸 = 10軸構成

| グループ | グループコード | グループ名 | 軸1 | 軸2 |
|----------|----------------|------------|-----|-----|
| A | `A` | 思考基盤 | 問題設定力 | ロジック構造化 |
| B | `B` | 価値創造 | 仮説思考 | 提案具体性 |
| C | `C` | 分析・検証 | 分析設計 | 実現可能性 |
| D | `D` | 実務適用 | 視点の多様性 | インパクト |
| E | `E` | コミュニケーション | 表現力 | 独自性 |

### 5.2 各軸の詳細定義

#### グループA: 思考基盤

**軸1: 問題設定力（problem_setting）**

| 項目 | 内容 |
|------|------|
| 定義 | 事象や課題の本質を見抜き、解くべき問いを適切に設定する力 |
| 評価ポイント | ・表層的な現象と本質的な課題の区別<br>・因果関係の正確な把握<br>・優先順位の妥当性 |

| スコア | 基準 |
|--------|------|
| 5 | 本質的課題を正確に特定し、独自の視点で問題を再定義している |
| 4 | 本質的課題を概ね特定し、適切な問いを設定している |
| 3 | 課題を認識しているが、本質への掘り下げが不足 |
| 2 | 表層的な現象のみに着目し、本質を捉えていない |
| 1 | 課題の認識が曖昧または的外れ |

**軸2: ロジック構造化（structuring_logic）**

| 項目 | 内容 |
|------|------|
| 定義 | 情報や論点を整理し、論理的に構造化・展開する力 |
| 評価ポイント | ・MECE（漏れなくダブりなく）の徹底<br>・論理の一貫性<br>・構造の明確さ |

| スコア | 基準 |
|--------|------|
| 5 | MECEかつ一貫した論理展開で、複雑な事象を明快に構造化 |
| 4 | 論理的な構造化ができており、展開に一貫性がある |
| 3 | 構造化を試みているが、一部に漏れや重複がある |
| 2 | 論理の飛躍や矛盾が目立つ |
| 1 | 構造化されておらず、論理が追えない |

#### グループB: 価値創造

**軸3: 仮説思考（hypothesis_thinking）**

| 項目 | 内容 |
|------|------|
| 定義 | 限られた情報から仮説を立て、検証・修正していく力 |
| 評価ポイント | ・仮説の蓋然性<br>・検証可能性の考慮<br>・代替仮説の検討 |

| スコア | 基準 |
|--------|------|
| 5 | 蓋然性の高い仮説を複数立て、優先順位と検証方法を明示 |
| 4 | 妥当な仮説を立て、検証アプローチを示している |
| 3 | 仮説を立てているが、根拠や検証方法が不明確 |
| 2 | 仮説が単純すぎる、または根拠が薄い |
| 1 | 仮説を立てられていない、または非現実的 |

**軸4: 提案具体性（proposal_specificity）**

| 項目 | 内容 |
|------|------|
| 定義 | 実行可能な施策・解決策を具体的に提案する力 |
| 評価ポイント | ・施策の具体性（Who/What/When/How）<br>・実行ステップの明確さ<br>・成功指標の設定 |

| スコア | 基準 |
|--------|------|
| 5 | 5W1Hが明確で、実行ステップとKPIまで具体化されている |
| 4 | 具体的な施策が提示され、実行イメージが描ける |
| 3 | 施策の方向性は示されているが、詳細が不足 |
| 2 | 抽象的な提案に留まり、実行可能性が低い |
| 1 | 具体的な提案ができていない |

#### グループC: 分析・検証

**軸5: 分析設計（analysis_design）**

| 項目 | 内容 |
|------|------|
| 定義 | 仮説を検証するための分析アプローチを設計する力 |
| 評価ポイント | ・分析手法の妥当性<br>・必要データの特定<br>・分析の実行可能性 |

| スコア | 基準 |
|--------|------|
| 5 | 仮説検証に最適な分析手法を選択し、データ要件まで具体化 |
| 4 | 適切な分析アプローチが設計されている |
| 3 | 分析の方向性は示されているが、手法の選択理由が不明確 |
| 2 | 分析アプローチが仮説検証に適していない |
| 1 | 分析設計ができていない |

**軸6: 実現可能性（feasibility）**

| 項目 | 内容 |
|------|------|
| 定義 | 提案の実行における制約条件を考慮し、現実的な計画を立てる力 |
| 評価ポイント | ・リソース制約の考慮<br>・リスク認識と対策<br>・段階的アプローチ |

| スコア | 基準 |
|--------|------|
| 5 | 制約条件を網羅的に考慮し、リスク対策を含む実行計画を提示 |
| 4 | 主要な制約を考慮した現実的な計画になっている |
| 3 | 実現可能性を意識しているが、考慮が不十分 |
| 2 | 制約条件の認識が甘く、計画が現実離れしている |
| 1 | 実現可能性が全く考慮されていない |

#### グループD: 実務適用

**軸7: 視点の多様性（perspective_diversity）**

| 項目 | 内容 |
|------|------|
| 定義 | 複数のステークホルダーや視点から課題を検討する力 |
| 評価ポイント | ・ステークホルダー分析<br>・異なる立場の考慮<br>・トレードオフの認識 |

| スコア | 基準 |
|--------|------|
| 5 | 多様なステークホルダーの視点を統合し、バランスの取れた提案 |
| 4 | 複数の視点から検討し、主要なトレードオフを認識 |
| 3 | 複数視点を意識しているが、深掘りが不足 |
| 2 | 単一の視点に偏っている |
| 1 | 他者の視点が全く考慮されていない |

**軸8: インパクト（impact）**

| 項目 | 内容 |
|------|------|
| 定義 | 提案がもたらす効果の大きさと範囲を見極める力 |
| 評価ポイント | ・定量的効果の見積もり<br>・波及効果の考慮<br>・持続性の検討 |

| スコア | 基準 |
|--------|------|
| 5 | 定量的なインパクトを試算し、波及効果と持続性まで言及 |
| 4 | インパクトを具体的に示し、効果の根拠がある |
| 3 | インパクトに言及しているが、定量化や根拠が不足 |
| 2 | インパクトの認識が曖昧 |
| 1 | インパクトへの言及がない |

#### グループE: コミュニケーション

**軸9: 表現力（expression）**

| 項目 | 内容 |
|------|------|
| 定義 | 考えを明確かつ簡潔に伝える力 |
| 評価ポイント | ・文章の明瞭さ<br>・要点の絞り込み<br>・専門用語の適切な使用 |

| スコア | 基準 |
|--------|------|
| 5 | 簡潔かつ明瞭で、読み手を意識した構成になっている |
| 4 | 要点が整理され、理解しやすい表現になっている |
| 3 | 意図は伝わるが、冗長または説明不足な箇所がある |
| 2 | 表現が曖昧で、意図が読み取りにくい |
| 1 | 何を言いたいか理解できない |

**軸10: 独自性（originality）**

| 項目 | 内容 |
|------|------|
| 定義 | 既存の枠にとらわれない創造的なアイデアを生み出す力 |
| 評価ポイント | ・新規性のある視点<br>・創造的な解決策<br>・固定観念への挑戦 |

| スコア | 基準 |
|--------|------|
| 5 | 独創的かつ実現可能なアイデアで、新しい価値を提示 |
| 4 | 既存の枠を超えた視点や提案が含まれている |
| 3 | 一部に独自の視点があるが、全体は定型的 |
| 2 | ほぼテンプレート的な回答に留まる |
| 1 | 独自性が全く見られない |

### 5.3 ステップ別の主要評価軸マッピング

| ステップ | 主な評価軸 | 補助評価軸 |
|----------|-----------|-----------|
| Step 1: 状況把握 | 問題設定力、ロジック構造化 | 視点の多様性 |
| Step 2: 課題定義 | 問題設定力、視点の多様性 | 仮説思考 |
| Step 3: 仮説立案 | 仮説思考、独自性 | ロジック構造化 |
| Step 4: 分析プラン | 分析設計、実現可能性 | 仮説思考 |
| Step 5: 提言策定 | 提案具体性、インパクト、表現力 | 実現可能性、独自性 |

---

## 6. XP/SKP計算ロジック

### 6.1 ステップ単価方式

| 難易度 | 1ステップあたりXP |
|--------|-------------------|
| basic | 10 |
| intermediate | 20 |
| advanced | 30 |
| expert | 40 |

### 6.2 計算フロー

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

### 6.3 ステップ別XP配分

各ステップの `earned_xp` はスコア比率に応じて配分:

```typescript
// 各ステップ: ステップ単価 × (そのステップのスコア / max_score)
// 例: intermediate、Step1スコア8点/10点満点
// earned_xp = 20 × (8/10) = 16

// 例: intermediate、Step2スコア16点/20点満点（max_score=20の場合）
// earned_xp = 20 × (16/20) = 16
```

---

## 7. AI採点システム

### 7.1 AIプロンプト構成

ケーススタディ機能では**2種類のAIプロンプト**を使用:

| プロンプト種別 | 用途 | 呼び出しタイミング |
|----------------|------|-------------------|
| 問題生成プロンプト | ケーススタディ問題（本文+ステップ+ヒント）の生成 | 管理者による問題作成時 |
| 回答評価プロンプト | 全ステップの一括採点+フィードバック生成 | セッション完了時（1回のAPI呼び出し） |

### 7.2 問題生成プロンプト

```
あなたはビジネスケーススタディの作成者です。以下の条件に基づいて、学習用のケーススタディ問題を作成してください。

【作成条件】
カテゴリー: {category_name}
サブカテゴリー: {subcategory_name}
難易度: {difficulty}（{difficulty_description}）
業界: {industry}
シナリオタイプ: {scenario_type}
ステップ数: {step_count}

【出力形式】
以下のJSON形式で出力してください:

{
  "title": "ケースタイトル（30文字以内）",
  "case_text": "ケース本文（Markdown形式、800〜1500文字）",
  "steps": [
    {
      "step_number": 1,
      "step_name": "状況把握",
      "description": "設問文（100〜200文字）",
      "question_type": "hybrid",
      "options": [
        {"id": "A", "text": "選択肢A", "is_correct": true, "partial_score": 1.0},
        {"id": "B", "text": "選択肢B", "is_correct": false, "partial_score": 0},
        {"id": "C", "text": "選択肢C", "is_correct": true, "partial_score": 0.5},
        {"id": "D", "text": "選択肢D", "is_correct": false, "partial_score": 0}
      ],
      "model_answer": {
        "ideal_choices": ["A", "C"],
        "essential_points": ["キーワード1", "キーワード2", "キーワード3"],
        "good_examples": ["優秀回答例（100〜150文字）"],
        "common_mistakes": ["よくある間違い"],
        "scoring_anchors": {
          "5": "5点の基準",
          "4": "4点の基準",
          "3": "3点の基準",
          "2": "2点の基準",
          "1": "1点の基準"
        }
      },
      "hint": "ヒント文（50〜100文字）",
      "target_skills": ["problem_setting", "structuring_logic"],
      "category_id": "{step_category_id}",
      "subcategory_id": "{step_subcategory_id}",
      "max_score": 10
    }
    // ... 残りのステップ
  ]
}

【ステップ構成ガイドライン】
- Step 1: 状況把握 - 与えられた情報から重要なポイントを抽出
- Step 2: 課題定義 - 本質的な課題を特定し、問いを設定
- Step 3: 仮説立案 - 課題解決に向けた仮説を構築
- Step 4: 分析プラン - 仮説検証のための分析アプローチを設計
- Step 5: 提言策定 - 具体的な施策と実行計画を提案
（6ステップ以上の場合は適宜追加）

【ハイブリッド形式について】
各ステップは「選択式（4択）+ 記述式（理由説明）」のハイブリッド形式とする。
- 選択肢は4つ、正解は1〜2つ、部分点ありの選択肢も可
- 記述は「選択した理由を100〜200文字で説明」の形式

【ヒントについて】
各ステップのヒントは、直接的な答えを示さず、思考の方向性を示唆する内容とする。
```

### 7.3 回答評価プロンプト

```
あなたはケーススタディの採点者です。以下の学習者の回答を、10軸ルーブリックに基づいて評価してください。

【ケース本文】
{case_text}

【ルーブリック軸定義】
{rubric_axes_json}
// case_study_rubric_axesテーブルから取得した軸定義を展開

【学習者の回答】
{steps_and_answers}
/*
  [
    {
      "step_number": 1,
      "step_name": "状況把握",
      "description": "設問文",
      "selected_choices": ["A", "C"],
      "reasoning_text": "学習者の記述回答",
      "model_answer": { ... },
      "target_skills": ["problem_setting", "structuring_logic"],
      "max_score": 10
    },
    // ... 全ステップ
  ]
*/

【評価指示】
1. 各ステップについて、以下を評価してください:
   - スコア（1〜max_score点）
   - 対象スキル軸のスコア（1〜5点）
   - キーワードマッチ（見つかった/不足）
   - ステップ別フィードバック（具体的な改善点を含む）

2. 全体評価として、以下を生成してください:
   - 全10軸の総合スコア（各軸1〜5点）
   - 総合フィードバック（強みと改善点を含む300〜500文字）

【出力形式】
{
  "step_scores": [
    {
      "step": 1,
      "score": 8,
      "max": 10,
      "skill_scores": {
        "problem_setting": 4,
        "structuring_logic": 4
      },
      "keyword_match": {
        "found": ["キーワード1", "キーワード2"],
        "missing": ["キーワード3"]
      },
      "feedback": "ステップ1のフィードバック（100〜150文字）",
      "improvement_points": ["改善点1", "改善点2"]
    }
    // ... 全ステップ
  ],
  "skill_scores": {
    "problem_setting": 4,
    "structuring_logic": 4,
    "hypothesis_thinking": 3,
    "analysis_design": 4,
    "proposal_specificity": 4,
    "perspective_diversity": 3,
    "feasibility": 4,
    "impact": 3,
    "expression": 4,
    "originality": 3
  },
  "overall_feedback": "総合フィードバック（強み、改善点、次回への提案を含む300〜500文字）"
}

【評価の注意点】
- 選択肢の正誤だけでなく、記述回答の論理性・具体性も重視する
- 部分点を適切に付与し、努力を評価する
- フィードバックは建設的かつ具体的に
- 学習者のレベルに合わせた表現を使用する
```

---

## 8. 標準5ステップフレームワーク

### 8.1 フレームワーク概要

すべてのケーススタディは、以下の5ステップ（または拡張6〜8ステップ）で構成される:

| Step | 名称 | 目的 | 主要評価軸 |
|------|------|------|-----------|
| 1 | 状況把握 | 与えられた情報から重要なポイントを抽出する | 問題設定力、ロジック構造化 |
| 2 | 課題定義 | 本質的な課題を特定し、解くべき問いを設定する | 問題設定力、視点の多様性 |
| 3 | 仮説立案 | 課題解決に向けた仮説を構築する | 仮説思考、独自性 |
| 4 | 分析プラン | 仮説検証のための分析アプローチを設計する | 分析設計、実現可能性 |
| 5 | 提言策定 | 具体的な施策と実行計画を提案する | 提案具体性、インパクト、表現力 |

### 8.2 拡張ステップ（6〜8ステップの場合）

| Step | 名称 | 目的 |
|------|------|------|
| 6 | リスク評価 | 施策実行時のリスクと対策を検討する |
| 7 | 実行計画詳細 | タイムライン、マイルストーン、KPIを設定する |
| 8 | モニタリング設計 | 効果測定と改善サイクルの仕組みを設計する |

---

## 9. レコメンド・検索・発見機能

### 9.1 問題発見・選択方法

| 方法 | 説明 | 実装フェーズ |
|------|------|------------|
| **レコメンド** | 弱点カテゴリー・直近の学習履歴に基づく推薦（3〜5件） | Phase 1 |
| **一覧検索** | カテゴリー/難易度/業界/フリーワードでフィルター | Phase 1 |
| **今日のチャレンジ** | 管理者設定 or アルゴリズムで1問ピックアップ | Phase 2 |
| **クイックスタート** | 未実施+適正難易度からランダム1問 | Phase 2 |
| **学習パス連動** | コース完了後に関連ケーススタディを推薦 | Phase 2 |

### 9.2 レコメンドロジック

```typescript
async function getRecommendations(userId: string, limit: number = 5): Promise<CaseStudyProblem[]> {
  // 1. 弱点カテゴリー分析（quiz_answers + case_study_step_detailsから）
  const weakCategories = await getWeakCategories(userId)
  // 条件: 正解率60%未満 かつ 5問以上回答したサブカテゴリー

  // 2. ユーザーの学習履歴取得
  const recentActivity = await getRecentActivity(userId)
  const daysSinceLastActivity = calculateDaysSince(recentActivity.lastCaseStudyDate)

  // 3. ユーザーの適正難易度を算出
  const userPreferredDifficulty = await calculateTargetDifficulty(userId)

  // 4. 未完了ケーススタディ取得
  const completedIds = await getCompletedProblemIds(userId)
  const uncompletedProblems = await supabase
    .from('case_study_problems')
    .select('*')
    .eq('status', 'active')
    .not('id', 'in', completedIds)

  // 5. スコアリング
  const scored = uncompletedProblems.map(p => ({
    ...p,
    score:
      (weakCategories.includes(p.primary_subcategory_id) ? 50 : 0) +  // 弱点カテゴリー一致
      (p.difficulty === userPreferredDifficulty ? 20 : 0) +           // 難易度一致
      (daysSinceLastActivity > 7 ? 30 : 0)                            // 久しぶり学習ボーナス
  }))

  // 6. 上位N件を返す
  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}

async function getWeakCategories(userId: string): Promise<string[]> {
  // 直近50問での正解率分析
  const recentAnswers = await supabase
    .from('quiz_answers')
    .select('subcategory_id, is_correct')
    .eq('user_id', userId)
    .in('session_type', ['quiz', 'case_study'])
    .order('created_at', { ascending: false })
    .limit(50)

  // サブカテゴリー別集計
  const categoryStats = recentAnswers.reduce((acc, answer) => {
    const subcat = answer.subcategory_id
    if (!acc[subcat]) acc[subcat] = { correct: 0, total: 0 }
    acc[subcat].total++
    if (answer.is_correct) acc[subcat].correct++
    return acc
  }, {})

  // 正解率60%未満かつ5問以上で苦手判定
  return Object.entries(categoryStats)
    .filter(([_, stats]) => stats.correct / stats.total < 0.6 && stats.total >= 5)
    .map(([subcategory]) => subcategory)
}
```

### 9.3 一覧検索ロジック（フリーワード対応）

```typescript
interface SearchParams {
  category_id?: string
  subcategory_id?: string
  difficulty?: string
  industry?: string
  keyword?: string  // フリーワード検索
}

async function searchProblems(params: SearchParams): Promise<CaseStudyProblem[]> {
  let query = supabase
    .from('case_study_problems')
    .select('*')
    .eq('status', 'active')

  if (params.category_id) {
    query = query.eq('primary_category_id', params.category_id)
  }
  if (params.subcategory_id) {
    query = query.eq('primary_subcategory_id', params.subcategory_id)
  }
  if (params.difficulty) {
    query = query.eq('difficulty', params.difficulty)
  }
  if (params.industry) {
    query = query.eq('industry', params.industry)
  }
  if (params.keyword) {
    // タイトルまたはケース本文でフリーワード検索
    query = query.or(`title.ilike.%${params.keyword}%,case_text.ilike.%${params.keyword}%`)
  }

  const { data } = await query.order('created_at', { ascending: false })
  return data
}
```

### 9.4 今日のチャレンジロジック

```typescript
async function getDailyChallenge(userId: string): Promise<CaseStudyProblem | null> {
  const today = new Date().toISOString().split('T')[0]

  // 1. 管理者設定があればそれを優先（全員一律）
  const { data: featured } = await supabase
    .from('case_study_problems')
    .select('*')
    .eq('status', 'active')
    .eq('featured_date', today)
    .single()

  if (featured) return featured

  // 2. なければアルゴリズムで選定（パーソナライズ）
  const recommendations = await getRecommendations(userId, 1)
  return recommendations[0] || null
}
```

### 9.5 クイックスタートロジック

```typescript
async function getQuickStartProblem(userId: string): Promise<CaseStudyProblem | null> {
  // 1. 完了済みケーススタディを取得
  const completedIds = await getCompletedProblemIds(userId)

  // 2. ユーザーの適正難易度を算出（直近10問の正解率から）
  const targetDifficulty = await calculateTargetDifficulty(userId)

  // 3. 条件に合う問題を取得
  const { data: candidates } = await supabase
    .from('case_study_problems')
    .select('*')
    .eq('status', 'active')
    .eq('difficulty', targetDifficulty)
    .not('id', 'in', completedIds)
    .limit(10)

  if (!candidates || candidates.length === 0) return null

  // 4. ランダムに1問選択
  return candidates[Math.floor(Math.random() * candidates.length)]
}

async function calculateTargetDifficulty(userId: string): Promise<string> {
  // 直近10問の正解率から適正難易度を算出
  const { data: recentAnswers } = await supabase
    .from('quiz_answers')
    .select('is_correct, difficulty')
    .eq('user_id', userId)
    .eq('session_type', 'case_study')
    .order('created_at', { ascending: false })
    .limit(10)

  if (!recentAnswers || recentAnswers.length < 5) {
    return 'intermediate'  // デフォルト
  }

  const accuracy = recentAnswers.filter(a => a.is_correct).length / recentAnswers.length

  if (accuracy >= 0.8) return 'advanced'
  if (accuracy >= 0.6) return 'intermediate'
  return 'basic'
}
```

### 9.6 学習パス連動ロジック

```typescript
async function getCourseLinkedProblems(
  userId: string,
  courseId: string
): Promise<CaseStudyProblem[]> {
  // 1. コースの完了セッション数を取得
  const { data: completions } = await supabase
    .from('course_session_completions')
    .select('session_id')
    .eq('user_id', userId)
    .eq('course_id', courseId)

  const completedSessionCount = completions?.length || 0

  // 2. 条件に合う連動ケーススタディを取得
  const { data: links } = await supabase
    .from('case_study_course_links')
    .select('problem_id, display_after_session')
    .eq('course_id', courseId)

  const eligibleProblemIds = links
    ?.filter(link =>
      link.display_after_session === null ||
      completedSessionCount >= link.display_after_session
    )
    .map(link => link.problem_id)

  if (!eligibleProblemIds || eligibleProblemIds.length === 0) return []

  // 3. 問題詳細を取得
  const { data: problems } = await supabase
    .from('case_study_problems')
    .select('*')
    .in('id', eligibleProblemIds)
    .eq('status', 'active')

  return problems || []
}
```

---

## 10. 復習機能

### 10.1 復習対象判定ロジック

```typescript
function determineCaseStudyReviewNeed(
  stepDetail: CaseStudyStepDetail,
  step: CaseStudyStep
): { reviewNeeded: boolean; reviewReason: string | null } {

  // 条件1: 低スコア（60%未満）
  if (stepDetail.step_scoring?.score < step.max_score * 0.6) {
    return { reviewNeeded: true, reviewReason: 'low_score' }
  }

  // 条件2: ヒント使用
  if (stepDetail.hint_used) {
    return { reviewNeeded: true, reviewReason: 'hint_used' }
  }

  // 条件3: 低自信（1-2）
  if (stepDetail.confidence_level && stepDetail.confidence_level <= 2) {
    return { reviewNeeded: true, reviewReason: 'low_confidence' }
  }

  // 条件4: 長時間回答（推定時間の80%以上）
  const estimatedTimePerStep = (step.problem.estimated_minutes * 60 * 1000) / step.problem.step_count
  if (stepDetail.time_spent > estimatedTimePerStep * 0.8) {
    return { reviewNeeded: true, reviewReason: 'slow_response' }
  }

  // 条件5: 弱点スキル軸（2点以下）
  const skillScores = stepDetail.step_scoring?.skill_scores || {}
  const hasWeakSkill = Object.values(skillScores).some(score => score <= 2)
  if (hasWeakSkill) {
    return { reviewNeeded: true, reviewReason: 'weak_skill_axis' }
  }

  return { reviewNeeded: false, reviewReason: null }
}
```

### 10.2 復習問題選定

```typescript
async function selectCaseStudyReviewSteps(
  userId: string,
  limit: number = 10
): Promise<CaseStudyStepForReview[]> {
  // 1. review_needed=true かつ reviewed_at=null の回答を取得
  const { data: reviewNeededAnswers } = await supabase
    .from('quiz_answers')
    .select(`
      id,
      question_id,
      quiz_session_id,
      review_reason,
      created_at,
      case_study_step_details!inner (
        step_id,
        step_number,
        selected_choices,
        reasoning_text
      )
    `)
    .eq('user_id', userId)
    .eq('session_type', 'case_study')
    .eq('review_needed', true)
    .is('reviewed_at', null)
    .order('created_at', { ascending: false })
    .limit(limit * 2)

  // 2. 3日以上経過したものをフィルター
  const now = Date.now()
  const eligibleAnswers = reviewNeededAnswers?.filter(answer => {
    const daysSince = (now - new Date(answer.created_at).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince >= 3
  })

  // 3. ステップ詳細を取得して返す
  return eligibleAnswers?.slice(0, limit).map(answer => ({
    quizAnswerId: answer.id,
    stepId: answer.case_study_step_details.step_id,
    stepNumber: answer.case_study_step_details.step_number,
    sessionId: answer.quiz_session_id,
    reviewReason: answer.review_reason
  })) || []
}
```

### 10.3 復習モード画面

`/case-study?mode=review`で復習モードに入る:

1. 復習対象ステップのみを抽出
2. 元のケース本文を表示しつつ、該当ステップのみ再回答
3. 再採点後、`quiz_answers.reviewed_at`を更新
4. 復習時はXP/SKP付与なし

---

## 11. API設計

### 11.1 管理者API

| メソッド | エンドポイント | 説明 | 権限 |
|----------|----------------|------|------|
| POST | `/api/admin/case-study/generate` | AI問題生成 | admin, system_admin |
| GET | `/api/admin/case-study/problems` | 問題一覧 | admin, system_admin |
| GET | `/api/admin/case-study/problems/[id]` | 問題詳細 | admin, system_admin |
| PUT | `/api/admin/case-study/problems/[id]` | 問題更新 | admin, system_admin |
| DELETE | `/api/admin/case-study/problems/[id]` | 問題削除 | admin, system_admin |
| PUT | `/api/admin/case-study/problems/[id]/status` | ステータス変更 | admin, system_admin |
| PUT | `/api/admin/case-study/problems/[id]/featured` | 今日のおすすめ設定 | admin, system_admin |
| GET | `/api/admin/case-study/rubric-axes` | ルーブリック軸一覧 | admin, system_admin |
| PUT | `/api/admin/case-study/rubric-axes/[id]` | ルーブリック軸更新 | admin, system_admin |
| POST | `/api/admin/case-study/course-links` | コース連動設定 | admin, system_admin |
| DELETE | `/api/admin/case-study/course-links/[id]` | コース連動削除 | admin, system_admin |

### 11.2 ユーザーAPI

| メソッド | エンドポイント | 説明 |
|----------|----------------|------|
| GET | `/api/case-study/problems` | 公開問題一覧（検索・フィルター対応） |
| GET | `/api/case-study/problems/[id]` | 問題詳細 |
| GET | `/api/case-study/recommendations` | レコメンド取得 |
| GET | `/api/case-study/daily-challenge` | 今日のチャレンジ |
| GET | `/api/case-study/quick-start` | クイックスタート |
| GET | `/api/case-study/course-linked/[courseId]` | コース連動問題取得 |
| POST | `/api/case-study/sessions/start` | セッション開始 |
| POST | `/api/case-study/sessions/[id]/answer` | 回答提出 |
| POST | `/api/case-study/sessions/[id]/complete` | セッション完了・採点 |
| POST | `/api/case-study/sessions/[id]/thinking-log` | 思考ログ送信 |
| GET | `/api/case-study/sessions/[id]/result` | 結果取得 |
| GET | `/api/case-study/review/steps` | 復習対象ステップ取得 |
| POST | `/api/case-study/review/submit` | 復習回答提出 |

### 11.3 API詳細

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
  hint_used: boolean,
  confidence_level?: number       // 1-5（任意）
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
    step_scores: Array<{
      step: number,
      score: number,
      max: number,
      skill_scores: Record<string, number>,
      keyword_match: { found: string[], missing: string[] },
      feedback: string,
      improvement_points: string[]
    }>,
    skill_scores: Record<string, number>,  // 10軸すべて
    overall_feedback: string
  },
  rewards: {
    xp_earned: number,            // 再学習時は0
    skp_earned: number,           // 再学習時は0
    is_retry: boolean,
    bonus_details: object
  },
  review_steps: number[]          // 復習対象になったステップ番号
}
```

---

## 12. UI概要

**詳細なUIデザイン仕様は `case-study-ui-design.md` を参照**

### 12.1 主要画面一覧

| 画面 | URL | 概要 |
|------|-----|------|
| トップページ | `/case-study` | レコメンド、今日のチャレンジ、一覧、検索 |
| 問題詳細 | `/case-study/[id]` | ケース概要、学習開始ボタン |
| 学習画面 | `/case-study/session/[id]` | ステップ進行、回答入力、自信度入力 |
| 結果画面 | `/case-study/result/[id]` | 採点結果、10軸レーダーチャート、復習対象表示 |
| 復習モード | `/case-study?mode=review` | 復習対象ステップの再挑戦 |

---

## 13. 多軸分析・タグシステム設計（Phase 3）

### 13.1 概要

Phase 3で実装する多軸分析・タグシステムの設計方針。現在のカテゴリー/サブカテゴリーによるXP集計（Layer 1）に加え、スキルタグによる分析用レイヤー（Layer 2）を追加する。

### 13.2 2層アーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 1: XP集計用（既存維持）                                        │
│ - quiz_answers.category_id / subcategory_id                        │
│ - user_category_xp_stats_v2 / user_subcategory_xp_stats_v2         │
│ → 変更なし、既存クエリ互換                                           │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ Layer 2: 分析・レコメンド用（Phase 3で追加）                          │
│ - skill_tags: スキルタグマスター                                     │
│ - content_skill_tags: コンテンツ×タグ関連                           │
│ - user_skill_stats: ユーザースキル統計                               │
│ → 多軸分析、パーソナライズドレコメンド、問題生成に活用               │
└─────────────────────────────────────────────────────────────────────┘
```

### 13.3 新規テーブル設計（Phase 3）

```sql
-- スキルタグマスター
CREATE TABLE skill_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_code VARCHAR(50) NOT NULL UNIQUE,       -- 'logical_thinking', 'data_analysis'
  tag_name VARCHAR(100) NOT NULL,             -- '論理的思考', 'データ分析'
  tag_type VARCHAR(20) NOT NULL,              -- 'skill', 'domain', 'industry'
  dimension VARCHAR(50),                      -- 'cognitive', 'interpersonal', 'execution'
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- コンテンツ×タグ関連（多対多）
CREATE TABLE content_skill_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(50) NOT NULL,          -- 'quiz_question', 'case_study_step', 'course_session'
  content_id UUID NOT NULL,
  skill_tag_id UUID NOT NULL REFERENCES skill_tags(id),
  tag_source VARCHAR(20) DEFAULT 'manual',    -- 'manual', 'ai_generated', 'category_mapped'
  relevance_score DECIMAL(3,2) DEFAULT 1.0,   -- 関連度 0-1
  is_primary BOOLEAN DEFAULT FALSE,           -- 主要スキルかどうか
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(content_type, content_id, skill_tag_id)
);

CREATE INDEX idx_cst_content ON content_skill_tags(content_type, content_id);
CREATE INDEX idx_cst_tag ON content_skill_tags(skill_tag_id);

-- ユーザースキル統計
CREATE TABLE user_skill_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  skill_tag_id UUID NOT NULL REFERENCES skill_tags(id),

  -- 統計
  total_xp INTEGER DEFAULT 0,
  proficiency_level INTEGER DEFAULT 1,        -- 1-5
  questions_answered INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  accuracy_rate DECIMAL(5,2),

  -- 時間
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, skill_tag_id)
);

CREATE INDEX idx_uss_user ON user_skill_stats(user_id);
CREATE INDEX idx_uss_tag ON user_skill_stats(skill_tag_id);
```

### 13.4 活用ユースケース

1. **多軸学習分析**
   - スキル別の強み/弱み分析（カテゴリー横断）
   - スキルレーダーチャートの表示

2. **パーソナライズド問題生成**
   - 弱点スキル強化型のケーススタディ生成
   - クロスドメイン問題生成

3. **高度なレコメンド**
   - スキルギャップベースの学習推奨
   - 目標ロール（コンサルタント、PM等）に必要なスキルとのマッチング

4. **AIによる自動タグ付け**
   - 新規問題作成時に自動でスキルタグを付与
   - 既存コンテンツへのバッチタグ付け

---

## 14. 実装ロードマップ

### Phase 1: 基盤構築（MVP）

**バックエンド:**
- [x] 新規テーブル作成（5テーブル）- マイグレーション済み
- [x] 既存テーブルへのカラム追加 - マイグレーション済み
- [x] xp_level_skp_settingsへの設定追加 - マイグレーション済み
- [x] quiz_answers FK制約削除 - マイグレーション済み
- [ ] case_study_rubric_axes テーブル作成・初期データ投入
- [ ] case_study_course_links テーブル作成
- [ ] case_study_problems.featured_date カラム追加
- [ ] 管理者API実装
- [ ] ユーザーAPI実装（基本CRUD、セッション管理、検索）
- [ ] XP/SKP計算・保存ロジック
- [ ] 再学習判定ロジック
- [ ] 復習判定ロジック

**フロントエンド:**
- [ ] 管理者パネル（問題一覧、新規作成、編集、ルーブリック管理）
- [ ] ユーザー画面（一覧、検索、学習画面、結果画面）
- [ ] 自信度入力UI
- [ ] ナビゲーションにタブ追加

### Phase 2: AI機能・拡張

- [ ] AI問題生成API（問題生成プロンプト連携）
- [ ] AI採点システム（回答評価プロンプト連携）
- [ ] 10軸レーダーチャート表示
- [ ] レコメンド機能
- [ ] 今日のチャレンジ機能（管理者設定+アルゴリズム）
- [ ] クイックスタート機能
- [ ] コース連動機能
- [ ] 復習モードUI

### Phase 3: 分析・高度化・多軸システム

- [ ] 思考プロセスログ収集UI
- [ ] 学習分析ダッシュボード
- [ ] skill_tags テーブル作成
- [ ] content_skill_tags テーブル作成
- [ ] user_skill_stats テーブル作成
- [ ] スキルタグ管理画面
- [ ] AIによる自動タグ付け
- [ ] 多軸分析ダッシュボード
- [ ] スキルギャップベースレコメンド

---

## 15. 付録

### 15.1 session_type の値一覧

| 値 | 説明 |
|----|------|
| `'quiz'` | 通常クイズ（既存） |
| `'course_confirmation'` | コース確認テスト（既存） |
| `'case_study'` | ケーススタディ（**新規**） |

### 15.2 difficulty の値一覧

| 値 | 日本語 | ステップ単価XP |
|----|--------|----------------|
| `'basic'` | 基礎 | 10 |
| `'intermediate'` | 中級 | 20 |
| `'advanced'` | 上級 | 30 |
| `'expert'` | エキスパート | 40 |

### 15.3 question_type の値一覧

| 値 | 説明 | user_answer | selected_choices |
|----|------|-------------|------------------|
| `'single'` | 単一選択 | 選択肢index | null |
| `'multiple'` | 複数選択 | null | `["A", "C"]` |
| `'ordering'` | 順序付け | null | `[{"id":"B","order":1}]` |
| `'text'` | 記述式 | null | null |
| `'hybrid'` | 選択+記述 | null | `["A", "C"]` |

### 15.4 rubric_group_code の値一覧

| コード | 日本語名 | 含まれる軸 |
|--------|----------|-----------|
| `'A'` | 思考基盤 | 問題設定力、ロジック構造化 |
| `'B'` | 価値創造 | 仮説思考、提案具体性 |
| `'C'` | 分析・検証 | 分析設計、実現可能性 |
| `'D'` | 実務適用 | 視点の多様性、インパクト |
| `'E'` | コミュニケーション | 表現力、独自性 |

### 15.5 review_reason の値一覧（ケーススタディ用）

| 値 | 説明 | 条件 |
|----|------|------|
| `'low_score'` | 低スコア | ステップスコア < max_score × 60% |
| `'hint_used'` | ヒント使用 | hint_used = true |
| `'low_confidence'` | 低自信 | confidence_level ≤ 2 |
| `'slow_response'` | 長時間回答 | time_spent > 推定時間 × 80% |
| `'weak_skill_axis'` | 弱点スキル軸 | 特定スキル軸が2点以下 |

### 15.6 action_type の値一覧（思考ログ）

| 値 | 説明 | action_data例 |
|----|------|--------------|
| `'choice_selected'` | 選択肢を選んだ | `{"choice": "A"}` |
| `'choice_changed'` | 選択肢を変更した | `{"from": "A", "to": "B"}` |
| `'reasoning_typed'` | 記述を入力した | `{"text_length": 150}` |
| `'reasoning_edited'` | 記述を編集した | `{"text_length": 180}` |
| `'hint_requested'` | ヒントを表示した | `{}` |
| `'step_submitted'` | ステップを提出した | `{}` |
| `'confidence_set'` | 自信度を設定した | `{"level": 3}` |

### 15.7 権限一覧

| 画面 | 必要権限 |
|------|----------|
| `/admin/case-study/*` | `admin`, `system_admin` |
| `/case-study/*` | ログインユーザー全員 |

---

*本ドキュメントに基づき実装を進めてください。*
*UIの詳細仕様は `case-study-ui-design.md` を参照してください。*
