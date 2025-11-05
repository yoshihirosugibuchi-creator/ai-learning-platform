# クイズシステム完全要件・実装設計書

**プロジェクト**: AI学習プラットフォーム  
**対象**: 全クイズシステムの完全要件定義と実装設計  
**作成日**: 2025年10月30日  
**バージョン**: 2.0  
**ベース**: Claude Code セッション分析結果  

---

## 📋 **概要**

本文書は、AI学習プラットフォームにおける4つのクイズタイプ（ビジネスAIパーソナライズ、セルフパーソナライズ、カテゴリー指定+難易度指定、復習AI推奨）の完全な要件定義と実装設計を包括的にまとめたものです。

### **対象クイズタイプ**
1. **ビジネスAIパーソナライズクイズ**: 全ビジネスマン向け基本スキル学習
2. **セルフパーソナライズクイズ**: ユーザー選択カテゴリー・レベル学習
3. **カテゴリー指定+難易度指定クイズ**: 特定分野集中学習
4. **復習AI推奨クイズ**: 過去学習の復習・定着化

---

## 🎯 **1. ビジネスAIパーソナライズクイズ**

### **📝 基本仕様**

#### **対象・制約**
- **対象問題**: 基本カテゴリー（`categories.type = 'main'`）のみ
- **問題数**: 10問固定
- **実行条件**: 認証済みユーザーのみ
- **アクセス**: ホーム画面から「ビジネスAIパーソナライズクイズ」選択

#### **問題セレクション条件**
```typescript
// Phase 1: 事前フィルタリング（呼び出し側）
const filteredQuestions = allQuestions.filter(question =>
  question.category_type === 'main' // 基本カテゴリーのみ
)

// Phase 2: 統合AI最適化エンジン適用
const optimizedQuestions = await optimizeQuestionsWithAI(
  filteredQuestions,
  userId,
  'business-ai',
  userProfile,
  undefined // userSettingsは不要
)
```

### **🤖 AI最適化機能（4機能フル適用）**

#### **1. スキルレベル対応難易度出題**
- **実装**: 期間限定正答率分析（1週間→1ヶ月→全期間）による動的配分
- **ロジック**: `getDifficultyDistributionByAccuracy(recentAccuracy)`
- **配分例**: 正答率70% → basic:20%, intermediate:50%, advanced:25%, expert:5%

#### **2. 苦手分野克服**
- **苦手カテゴリー検出**: 直近50問で正解率60%未満かつ5問以上のサブカテゴリー
- **繰り返しミス検出**: 同一サブカテゴリー・難易度で直近3問中2問以上不正解
- **正解連続効果**: 連続正解回数による記憶定着度考慮

#### **3. バランス学習**
- **実装**: ユーザー学習記録ベースのカテゴリー配分最適化
- **優先基準**:
  - 学習回数少ないカテゴリー優先
  - 正解率低いカテゴリー優先
  - 最終学習日から長期間経過カテゴリー優先

#### **4. 記憶定着サポート**
- **実装**: 忘却曲線計算（エビングハウス式）
- **パラメータ**: 記憶強度閾値30%＋難易度別係数
- **対象**: 過去正解問題で記憶強度が低下したもの

### **📊 問題配分ロジック（AI特別枠先行方式）**

```typescript
// Step 1: AI特別枠を先行選出（4問）
const specialQuestions = [
  ...selectWeakCategoryQuestions(2),    // 苦手分野強化 2問
  ...selectForgettingQuestions(1),      // 忘却曲線対象 1問
  ...selectRepeatMistakeQuestions(1)    // 繰り返しミス対策 1問
]

// Step 2: 特別枠の難易度分布を計算
const specialDifficultyCount = countDifficultyDistribution(specialQuestions)

// Step 3: 目標分布から特別枠分を差し引いて残り6問の配分を計算
const targetDistribution = getDifficultyDistributionByAccuracy(userAccuracy)
const remainingNeeded = adjustForSpecialQuestions(targetDistribution, specialDifficultyCount)

// Step 4: 残り6問を調整された配分で選出
const remainingQuestions = selectByAdjustedDistribution(availableQuestions, remainingNeeded, 6)

// 最終結果: specialQuestions(4) + remainingQuestions(6) = 10問
```

### **💰 報酬システム**
- **✅ XP付与**: スキルレベル・正解率に応じた基本XP
- **✅ SKP付与**: 基本SKP
- **✅ ボーナスXP**: 連続正解・高正解率ボーナス
- **✅ ボーナスSKP**: 完走・高スコアボーナス
- **✅ 格言カード**: ランダム付与対象

### **🔄 REVIEW_NEEDED設定**
各回答で以下5条件をチェック→該当時にフラグ設定：
1. 不正解
2. ヒントLv2以上使用
3. 自信レベル1-2
4. 回答時間過多（制限時間80%超）
5. 繰り返しミスパターン検出

---

## 👤 **2. セルフパーソナライズクイズ**

### **📝 基本仕様**

#### **対象・制約**
- **対象問題**: ユーザー選択カテゴリー・サブカテゴリー（基本・業界両方対象）
- **設定条件**: 学習レベル設定（指定難易度以上の問題対象）
- **問題数**: 10問固定
- **アクセス**: ホーム画面から「セルフパーソナライズクイズ」選択

#### **問題セレクション条件**
```typescript
// Phase 1: 事前フィルタリング（呼び出し側）
const filteredQuestions = allQuestions.filter(question => {
  // ユーザー選択カテゴリー・サブカテゴリー判定
  const categoryMatch = userSettings.basicCategories.includes(question.category) ||
                       userSettings.industryCategories.includes(question.category) ||
                       userSettings.industrySubcategories.includes(question.subcategory)

  // 設定スキルレベル以上の問題対象
  const levelMatch = getDifficultyLevel(question.difficulty) >=
                     getDifficultyLevel(userSettings.learningLevel)

  return categoryMatch && levelMatch
})

// Phase 2: 統合AI最適化エンジン適用
const optimizedQuestions = await optimizeQuestionsWithAI(
  filteredQuestions,
  userId,
  'self-personalized',
  userProfile,
  userSettings
)
```

### **🤖 AI最適化機能（4機能フル適用）**
1. **✅ スキルレベル対応難易度**: ユーザー設定learningLevel + 期間限定正答率分析
2. **✅ 苦手分野克服**: 選択カテゴリー内での苦手分析・繰り返しミス・正解連続効果
3. **✅ バランス学習**: 選択カテゴリー間でのパーソナライズ配分最適化
4. **✅ 記憶定着サポート**: 忘却曲線統合（選択範囲内）

### **🔧 難易度分布調整（learningLevel制限対応）**
```typescript
// learningLevel制限時の配分調整
function adjustDistributionForLearningLevel(
  baseDistribution: DifficultyDistribution,
  minLevel: 'basic' | 'intermediate' | 'advanced' | 'expert'
): DifficultyDistribution {

  const levels = ['basic', 'intermediate', 'advanced', 'expert']
  const minLevelIndex = levels.indexOf(minLevel)

  // 指定レベル以上のみ抽出
  const availableLevels = levels.slice(minLevelIndex)
  const availableDistribution = availableLevels.reduce((acc, level) => {
    acc[level] = baseDistribution[level] || 0
    return acc
  }, {} as Record<string, number>)

  // 合計値で正規化（100%になるよう調整）
  const total = Object.values(availableDistribution).reduce((sum, val) => sum + val, 0)
  if (total === 0) {
    return { [minLevel]: 1.0 } as DifficultyDistribution
  }

  const normalizedDistribution = {} as DifficultyDistribution
  for (const [level, ratio] of Object.entries(availableDistribution)) {
    normalizedDistribution[level] = ratio / total
  }

  return normalizedDistribution
}

// 使用例: learningLevel = 'intermediate' の場合
// original: { basic: 0.4, intermediate: 0.4, advanced: 0.2 }
// adjusted: { intermediate: 0.67, advanced: 0.33 } (basic除外・正規化)
```

### **📈 段階的フォールバック処理**
```typescript
// 問題不足時の段階的緩和ルール
if (filteredQuestions.length < 10) {
  // Step 1: learningLevel制限緩和
  const relaxedByLevel = questions.filter(q =>
    selectedCategories.includes(q.category)
    // レベル制限除去
  )

  if (relaxedByLevel.length < 10) {
    // Step 2: カテゴリー制限も緩和
    return getRandomQuestions(allQuestions, 10)
  }
}
```

### **💰 報酬システム**
- **✅ XP付与**: スキルレベル・正解率に応じた基本XP
- **✅ SKP付与**: 基本SKP
- **✅ ボーナスXP**: 連続正解・高正解率ボーナス
- **✅ ボーナスSKP**: 完走・高スコアボーナス
- **✅ 格言カード**: ランダム付与対象

### **🔄 REVIEW_NEEDED設定**
ビジネスAIパーソナライズと同一の5条件チェック

---

## 📂 **3. カテゴリー指定+難易度指定クイズ**

### **📝 基本仕様**

#### **対象・制約**
- **対象問題**: 指定カテゴリー + 指定難易度（単一のみ）
- **問題数**: 10問固定
- **選択UI**: カテゴリー選択 → 難易度選択（単一選択）
- **アクセス**: カテゴリー画面から各カテゴリー選択

#### **問題セレクション条件（単一難易度のみ）**
```typescript
// Phase 1: 事前フィルタリング（呼び出し側）
const filteredQuestions = allQuestions.filter(question => {
  const categoryMatch = question.category === selectedCategory
  const difficultyMatch = question.difficulty === selectedDifficulty // 単一のみ
  return categoryMatch && difficultyMatch
})

// Phase 2: 統合AI最適化エンジン適用
const optimizedQuestions = await optimizeQuestionsWithAI(
  filteredQuestions,
  userId,
  'category-specific',
  userProfile,
  { selectedCategory, selectedDifficulty, mode: 'single-difficulty' }
)
```

### **🤖 AI最適化機能（4機能フル適用）**
1. **✅ スキルレベル対応難易度**: 指定難易度内での正答率ベース微調整
2. **✅ 苦手分野克服**: 指定カテゴリー内での苦手サブカテゴリー・繰り返しミス分析
3. **✅ バランス学習**: サブカテゴリー間でのバランス配分
4. **✅ 記憶定着サポート**: 指定範囲内での忘却曲線適用

### **🔧 フォールバック処理**
```typescript
// 指定難易度の問題が10問に満たない場合
if (filteredQuestions.length < 10) {
  // 同カテゴリーの他難易度も含める
  const expandedQuestions = allQuestions.filter(q => q.category === selectedCategory)
  const paddedQuestions = [
    ...filteredQuestions,
    ...expandedQuestions.slice(0, 10 - filteredQuestions.length)
  ]
  return getRandomQuestions(paddedQuestions, 10)
}
```

### **💰 報酬システム**
- **✅ XP付与**: 難易度・正解率に応じた基本XP
- **✅ SKP付与**: 基本SKP
- **✅ ボーナスXP**: 連続正解・高正解率ボーナス
- **✅ ボーナスSKP**: 完走・高スコアボーナス
- **✅ 格言カード**: ランダム付与対象

### **🔄 REVIEW_NEEDED設定**
他のクイズタイプと同一の5条件チェック

---

## 🔄 **4. 復習AI推奨クイズ**

### **📝 基本仕様**

#### **対象・制約**
- **対象問題**: REVIEW_NEEDEDフラグ = true の問題
- **問題数**: 1-30問設定可能（デフォルト10問）
- **実行条件**: 復習対象問題が3日以上経過＋未復習＋1問以上
- **アクセス**: ホーム画面復習通知またはヘッダー通知から

#### **問題セレクション条件**
```typescript
// 事前フィルタリング（専用API経由）
const reviewQuestions = await supabaseAdmin
  .from('quiz_answers')
  .select(`
    question_id,
    created_at,
    quiz_questions!inner(*)
  `)
  .eq('user_id', userId)
  .eq('review_needed', true)        // REVIEW_NEEDEDフラグ = true
  .is('reviewed_at', null)          // 未復習
  .limit(userSettings.reviewQuestionsCount) // ユーザー設定問題数（1-30）

// 3日以上経過チェック
const eligibleQuestions = reviewQuestions.filter(answer => {
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(answer.created_at).getTime()) / (1000 * 60 * 60 * 24)
  )
  return daysSinceCreated >= 3 // 各問題の出題から3日以上経過
})
```

### **🤖 AI最適化機能（統合エンジン不使用）**
```typescript
// 復習クイズは統合AI最適化エンジンを使用しない
// 理由：復習理由（苦手・忘却・ミス）が既に問題選定に組み込み済み

if (quizType === 'review') {
  // REVIEW_NEEDEDフラグベースで直接取得
  const reviewQuestions = await fetch('/api/review/questions', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  })
  return reviewQuestions // 最適化処理なし
} else {
  // 他のクイズタイプのみ統合AI最適化適用
  const optimizedQuestions = await optimizeQuestionsWithAI(...)
  return optimizedQuestions
}
```

### **📋 復習対象判定条件（REVIEW_NEEDED=true設定）**
```typescript
// クイズ回答時に以下5条件をチェック
const reviewNeeded =
  !isCorrect ||                                    // 1. 不正解
  (maxHintLevel && maxHintLevel >= 2) ||           // 2. ヒントLv2以上使用
  (confidenceLevel && confidenceLevel <= 2) ||    // 3. 自信レベル1-2
  (responseTime > timeLimit * 0.8) ||              // 4. 回答時間過多（両方とも秒単位）
  await checkRepeatMistakes(userId, questionId)    // 5. 繰り返しミス
```

### **✅ 復習実施判定**
```typescript
// 復習クイズ実行可能条件
const canStartReview =
  reviewQuestions.length >= 1 &&           // 対象問題1問以上
  daysSinceFirstReviewFlag >= 3 &&         // 3日以上経過
  hasUnreviewedQuestions                   // 未復習問題存在
```

### **💰 報酬システム（制限あり）**
- **✅ XP付与**: 基本XPのみ（ボーナスなし）
- **✅ SKP付与**: 基本SKPのみ（ボーナスなし）
- **❌ ボーナスXP**: 対象外
- **❌ ボーナスSKP**: 対象外
- **❌ 格言カード**: 対象外

### **🔄 復習完了処理（詳細説明）**
```typescript
// 復習クイズ完了時の3段階処理
for (const answeredQuestion of body.answers) {
  // 1. 旧レコードの復習実施マーク
  await supabaseAdmin
    .from('quiz_answers')
    .update({ reviewed_at: new Date().toISOString() })
    .eq('question_id', answeredQuestion.question_id)
    .eq('user_id', userId)
    .eq('review_needed', true)

  // 2. 復習後の再判定（次回復習が必要か）
  const stillNeedsReview = await determineReviewNeed(
    userId,
    answeredQuestion.question_id,
    answeredQuestion.is_correct,      // 復習時の結果
    answeredQuestion.time_spent,
    answeredQuestion.difficulty,
    timeLimit,
    answeredQuestion.max_hint_level,
    answeredQuestion.confidence_level
  )

  // 3. 復習結果として新しいレコードを必ず作成（正解・不正解両方）
  await supabaseAdmin
    .from('quiz_answers')
    .insert({
      user_id: userId,
      question_id: answeredQuestion.question_id,
      quiz_session_id: sessionId,
      is_correct: answeredQuestion.is_correct,
      time_spent: answeredQuestion.time_spent,
      difficulty: answeredQuestion.difficulty,
      max_hint_level: answeredQuestion.max_hint_level || null,
      confidence_level: answeredQuestion.confidence_level || null,
      review_needed: stillNeedsReview, // 再判定結果
      reviewed_at: null,               // 新レコードなので未復習
      category_id: answeredQuestion.category_id,
      subcategory_id: answeredQuestion.subcategory_id,
      earned_xp: answeredQuestion.earned_xp,
      session_type: 'review',          // 復習セッション明記
      created_at: new Date().toISOString()
    })
}

// 💡 重要な設計理由：
// - 復習時も学習記録として残す必要がある（XP/SKP計算・統計・進捗管理）
// - 正解時も新レコード作成により一貫したデータ追跡が可能
// - 旧レコードのreviewed_at設定により復習実施履歴も保持
// - 新レコードのreview_needed設定により継続的な復習管理が可能
```

### **⚙️ ユーザー設定連携**
- **問題数**: 1-30問（デフォルト10問）
- **通知頻度**: 1-7日間隔（デフォルト毎日）
- **ヘッダー通知**: リアルタイム更新（オレンジ表示・アニメーション）
- **設定UI**: マイページ → 復習設定ボタン

---

## 📊 **5. クイズタイプ比較表**

| 機能/設定 | ビジネスAI | セルフパーソナライズ | カテゴリー指定 | 復習AI推奨 |
|-----------|------------|---------------------|---------------|------------|
| **対象問題** | 基本カテゴリー<br>(`type='main'`) | ユーザー選択<br>カテゴリー+レベル | 指定カテゴリー<br>+指定難易度（単一） | REVIEW_NEEDED<br>フラグベース |
| **問題数** | 10問固定 | 10問固定 | 10問固定 | 1-30問設定可能 |
| **フィルタリング** | 呼び出し側で事前実行 | 呼び出し側で事前実行 | 呼び出し側で事前実行 | 専用API経由 |
| **AI最適化** | 4機能フル適用 | 4機能フル適用 | 4機能フル適用 | 統合エンジン不使用 |
| **難易度調整** | 期間限定正答率ベース | learningLevel制限対応 | 指定難易度内微調整 | 適用なし |
| **バランス学習** | 学習記録ベース配分 | 選択カテゴリー間配分 | サブカテゴリー間配分 | 適用なし |
| **XP/SKP** | 基本+ボーナス | 基本+ボーナス | 基本+ボーナス | 基本のみ |
| **格言カード** | ✅ 付与対象 | ✅ 付与対象 | ✅ 付与対象 | ❌ 対象外 |
| **REVIEW設定** | ✅ 5条件チェック | ✅ 5条件チェック | ✅ 5条件チェック | ✅ 完了マーク |

---

## 🛠️ **6. 実装アーキテクチャ**

### **📋 コンポーネント構成**

#### **フロントエンド**
```
components/quiz/
├── QuizSession.tsx              # メインクイズ実行コンポーネント
├── QuizTypeSelector.tsx         # クイズタイプ選択UI
└── ReviewQuizBanner.tsx         # 復習通知バナー

components/profile/
├── QuizSettingsModal.tsx        # セルフパーソナライズ設定
└── ReviewSettingsModal.tsx      # 復習設定

components/layout/
├── Header.tsx                   # 復習通知表示
└── MobileNav.tsx                # モバイルナビゲーション
```

#### **バックエンド**
```
app/api/
├── quiz/
│   ├── questions/route.ts       # 問題取得API
│   └── accuracy-analysis/route.ts # 期間限定正答率分析
├── xp-save/
│   └── quiz/route.ts           # クイズ結果保存・REVIEW_NEEDED設定
└── review/
    ├── questions/route.ts      # 復習問題取得
    └── stats/route.ts         # 復習統計

lib/
├── unified-optimization-engine.ts # 統合AI最適化エンジン
├── review-logic.ts               # 復習ロジック
├── review-settings.ts            # 復習設定管理
├── learning-stats.ts             # 学習統計計算
└── quiz-type-filtering.ts        # クイズタイプ別フィルタリング
```

### **🗄️ データベース設計**

#### **主要テーブル**
```sql
-- クイズ回答テーブル（REVIEW_NEEDED対応）
quiz_answers (
  id, user_id, question_id, quiz_session_id,
  is_correct, time_spent, difficulty,
  max_hint_level,           -- ヒントレベル
  confidence_level,         -- 自信レベル
  review_needed BOOLEAN,    -- 復習必要フラグ（✅ 既存）
  reviewed_at TIMESTAMP,    -- 復習実施日時（❌ 追加必要）
  created_at, updated_at
)

-- クイズセッションテーブル（タイプ管理）
quiz_sessions (
  id, user_id, category_id, subcategory_id,
  quiz_type TEXT,           -- 'business-ai', 'self-personalized', 'category', 'review'（✅ 既存）
  total_questions, correct_answers, accuracy_rate,
  session_start_time, session_end_time,
  created_at, updated_at
)

-- 復習設定テーブル（❌ 新規作成必要）
review_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  review_questions_count INTEGER DEFAULT 10 CHECK (review_questions_count >= 1 AND review_questions_count <= 30),
  notification_enabled BOOLEAN DEFAULT true,
  notification_interval_days INTEGER DEFAULT 1 CHECK (notification_interval_days >= 1 AND notification_interval_days <= 7),
  streak_reminder_enabled BOOLEAN DEFAULT true,
  weekly_summary_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

#### **🚨 必須データベース変更作業**

##### **1. quiz_answers テーブル - reviewed_at カラム追加**
```sql
-- reviewed_at カラム追加（復習実施日時記録用）
ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- インデックス追加（復習問題取得の高速化）
CREATE INDEX IF NOT EXISTS idx_quiz_answers_review_lookup 
  ON quiz_answers (user_id, review_needed, reviewed_at) 
  WHERE review_needed = true;
```

##### **2. review_settings テーブル新規作成**
```sql
-- 復習設定テーブル作成
CREATE TABLE IF NOT EXISTS review_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  review_questions_count INTEGER DEFAULT 10 CHECK (review_questions_count >= 1 AND review_questions_count <= 30),
  notification_enabled BOOLEAN DEFAULT true,
  notification_interval_days INTEGER DEFAULT 1 CHECK (notification_interval_days >= 1 AND notification_interval_days <= 7),
  streak_reminder_enabled BOOLEAN DEFAULT true,
  weekly_summary_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) ポリシー設定
ALTER TABLE review_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own review settings" ON review_settings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own review settings" ON review_settings
  FOR ALL USING (auth.uid() = user_id);

-- 更新時間自動更新トリガー
CREATE OR REPLACE FUNCTION update_review_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_review_settings_updated_at
  BEFORE UPDATE ON review_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_review_settings_updated_at();
```

##### **3. database-types-official.ts 再生成**
```bash
# Supabaseアクセストークン設定
export SUPABASE_ACCESS_TOKEN="$(grep 'sbp_' SUPABASE_ACCESS_TOKENS.md | cut -d'`' -f2 | head -1)"

# 型定義再生成
npx supabase gen types typescript --project-id bddqkmnbbvllpvsynklr > lib/database-types-official-new.ts

# 既存エイリアス型保持して置き換え
# （既存のエイリアス型定義を新ファイルに追加後）
mv lib/database-types-official-new.ts lib/database-types-official.ts
```

### **🔄 データフロー**

#### **通常クイズフロー**
```
1. ユーザーがクイズタイプ選択
   ↓
2. QuizSession.tsx でフィルタリング実行
   - ビジネスAI: categories.type = 'main'
   - セルフパーソナライズ: ユーザー設定ベース
   - カテゴリー指定: 指定条件ベース
   ↓
3. 統合AI最適化エンジン適用
   - 期間限定正答率分析
   - AI特別枠先行選出
   - 難易度バランス調整
   ↓
4. クイズ実行・回答収集
   ↓
5. 結果保存・REVIEW_NEEDED判定
   - /api/xp-save/quiz でXP/SKP計算
   - determineReviewNeed で復習判定
   ↓
6. ヘッダー通知・統計更新
```

#### **復習クイズフロー**
```
1. ヘッダー通知またはホーム画面から復習開始
   ↓
2. /api/review/questions で復習問題取得
   - REVIEW_NEEDED = true
   - 3日以上経過
   - 未復習（reviewed_at IS NULL）
   ↓
3. 復習クイズ実行（統合AI最適化なし）
   ↓
4. 復習完了処理
   - reviewed_at 設定
   - 復習後再判定
   - 必要に応じて新たな復習対象設定
   ↓
5. 復習統計更新・通知状態更新
```

---

## 🔧 **7. 修正実装計画**

### **Phase 1: データベース・基盤整備（最高優先度）**

#### **1.1 データベーススキーマ変更**
```sql
-- quiz_answers テーブル: reviewed_at カラム追加
ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

-- review_settings テーブル新規作成
CREATE TABLE IF NOT EXISTS review_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  review_questions_count INTEGER DEFAULT 10 CHECK (review_questions_count >= 1 AND review_questions_count <= 30),
  notification_enabled BOOLEAN DEFAULT true,
  notification_interval_days INTEGER DEFAULT 1 CHECK (notification_interval_days >= 1 AND notification_interval_days <= 7),
  streak_reminder_enabled BOOLEAN DEFAULT true,
  weekly_summary_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス・RLS設定
CREATE INDEX IF NOT EXISTS idx_quiz_answers_review_lookup 
  ON quiz_answers (user_id, review_needed, reviewed_at) 
  WHERE review_needed = true;

ALTER TABLE review_settings ENABLE ROW LEVEL SECURITY;
-- (RLSポリシー設定)
```

#### **1.2 database-types-official.ts 再生成**
```bash
# バックアップ作成
cp lib/database-types-official.ts lib/database-types-official-backup-$(date +%Y%m%d_%H%M%S).ts

# 型定義再生成
SUPABASE_ACCESS_TOKEN="$(grep 'sbp_' SUPABASE_ACCESS_TOKENS.md | cut -d'`' -f2 | head -1)" \
npx supabase gen types typescript --project-id bddqkmnbbvllpvsynklr > lib/database-types-official-new.ts

# エイリアス型追加・置き換え
# (既存エイリアス型定義を末尾に追加)
mv lib/database-types-official-new.ts lib/database-types-official.ts
```

### **Phase 2: REVIEW_NEEDEDフラグ管理（高優先度）**

#### **2.1 REVIEW_NEEDEDフラグ設定実装**
```typescript
// app/api/xp-save/quiz/route.ts に追加
import { determineReviewNeed } from '@/lib/review-logic'

// 回答保存ループ内
for (const answer of body.answers) {
  const reviewNeeded = await determineReviewNeed(
    userId,
    answer.question_id,
    answer.is_correct,
    answer.time_spent,
    answer.difficulty,
    timeLimit,
    answer.max_hint_level,  // ヒントレベル
    answer.confidence_level // 自信レベル
  )

  const answerData = {
    ...existingAnswerData,
    review_needed: reviewNeeded
  }
}
```

#### **2.2 復習問題選定ロジック修正**
```typescript
// lib/review-logic.ts の selectReviewQuestions 完全書き換え
export async function selectReviewQuestions(
  userId: string,
  requestedCount: number = 10
): Promise<Question[]> {

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  // REVIEW_NEEDED=trueフラグベースで取得
  const { data: reviewAnswers, error } = await supabaseAdmin
    .from('quiz_answers')
    .select(`
      question_id,
      created_at,
      quiz_questions!inner(*)
    `)
    .eq('user_id', userId)
    .eq('review_needed', true)
    .gte('created_at', threeDaysAgo) // 3日以上経過
    .is('reviewed_at', null) // 未復習

  // 重複除去・問題詳細取得
  const uniqueQuestions = Array.from(
    new Map(reviewAnswers.map(a => [a.question_id, a.quiz_questions])).values()
  )

  return uniqueQuestions.slice(0, requestedCount)
}
```

### **Phase 3: フィルタリング分離（高優先度）**

#### **3.1 クイズタイプ別フィルタリング実装**
```typescript
// components/quiz/QuizSession.tsx に追加
const filterQuestionsByQuizType = async (
  allQuestions: Question[],
  quizType: string,
  categoryParam?: string,
  difficulties?: string[],
  userSettings?: QuizPersonalizationSettings
): Promise<Question[]> => {

  switch (quizType) {
    case 'business-ai':
      // categories.type = 'main' のみ対象
      return allQuestions.filter(q => q.category_type === 'main')

    case 'self-personalized':
      if (!userSettings) return []
      const selectedCategories = [
        ...(userSettings.basicCategories || []),
        ...(userSettings.industryCategories || [])
      ]
      const selectedSubcategories = userSettings.industrySubcategories || []
      const minLevel = getDifficultyLevel(userSettings.learningLevel)

      return allQuestions.filter(q => {
        const categoryMatch = selectedCategories.includes(q.category) ||
                             selectedSubcategories.includes(q.subcategory || '')
        const levelMatch = getDifficultyLevel(q.difficulty) >= minLevel
        return categoryMatch && levelMatch
      })

    case 'category':
      return allQuestions.filter(q => {
        const categoryMatch = q.category === categoryParam
        const difficultyMatch = difficulties ?
          difficulties.includes(q.difficulty) : true
        return categoryMatch && difficultyMatch
      })

    case 'review':
      // 復習クイズは別途API経由で取得
      return []
  }

  return allQuestions
}
```

#### **3.2 統合最適化エンジン修正**
```typescript
// lib/unified-optimization-engine.ts 修正
export async function optimizeQuestionsWithAI(
  filteredQuestions: Question[], // 既にフィルタリング済み
  userId: string,
  mode: 'business-ai' | 'self-personalized' | 'category-specific',
  userProfile?: UserProfileWithProgress | null,
  userSettings?: QuizPersonalizationSettings | { selectedCategory: string, selectedDifficulty: string }
): Promise<Question[]> {

  // フィルタリング処理を除去
  // filteredQuestionsを直接使用

  // 1. 期間限定正答率分析
  const recentAccuracy = await getRecentAccuracyAnalysis(userId, mode, userSettings)

  // 2. 復習ロジック統合による高度分析
  const advancedAnalysis = await performAdvancedAnalysis(userId, filteredQuestions)

  // 3. AI特別枠先行選出による最適配分計算
  const optimizedQuestions = await selectOptimalQuestionsWithSpecialPriority(
    filteredQuestions,
    recentAccuracy,
    advancedAnalysis,
    mode,
    10
  )

  return optimizedQuestions
}
```

### **Phase 4: バランス学習パーソナライズ（中優先度）**

#### **4.1 ユーザー学習統計取得**
```typescript
// lib/learning-stats.ts 新規作成
interface CategoryLearningStats {
  categoryId: string
  totalSessions: number    // 学習回数
  accuracy: number         // 正解率
  lastStudiedDays: number  // 最終学習からの経過日数
  priorityScore: number    // 算出優先度（低いほど優先）
}

export async function getUserCategoryStats(userId: string): Promise<CategoryLearningStats[]> {
  const { data: stats } = await supabaseAdmin
    .from('quiz_sessions')
    .select(`
      category_id,
      created_at,
      correct_answers,
      total_questions
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  // カテゴリー別集計・優先度計算
  const categoryMap = new Map<string, {
    sessions: number
    totalCorrect: number
    totalQuestions: number
    lastStudied: Date
  }>()

  // 統計計算ロジック...

  return Array.from(categoryMap.entries()).map(([categoryId, data]) => {
    const accuracy = data.totalCorrect / data.totalQuestions
    const daysSinceStudy = Math.floor(
      (Date.now() - data.lastStudied.getTime()) / (1000 * 60 * 60 * 24)
    )

    // 優先度スコア計算（低いほど優先）
    const priorityScore = calculatePriorityScore({
      sessionCount: data.sessions,
      accuracy,
      daysSinceStudy
    })

    return {
      categoryId,
      totalSessions: data.sessions,
      accuracy,
      lastStudiedDays: daysSinceStudy,
      priorityScore
    }
  }).sort((a, b) => a.priorityScore - b.priorityScore) // 優先度順
}

function calculatePriorityScore(stats: {
  sessionCount: number
  accuracy: number
  daysSinceStudy: number
}): number {
  const countWeight = 0.4    // 学習回数重み
  const accuracyWeight = 0.3 // 正解率重み
  const timeWeight = 0.3     // 時間経過重み

  // 各要素を0-1の範囲で正規化
  const countScore = Math.max(0, 1 - (stats.sessionCount / 20)) // 20回を上限
  const accuracyScore = Math.max(0, 1 - stats.accuracy)         // 低い正解率ほど高スコア
  const timeScore = Math.min(1, stats.daysSinceStudy / 30)      // 30日を上限

  return countScore * countWeight +
         accuracyScore * accuracyWeight +
         timeScore * timeWeight
}
```

### **Phase 5: エラー修正・品質向上（並行実施）**

#### **5.1 マイページ復習設定ボタンエラー修正**
- エラーログの詳細調査
- API接続確認
- ローディング状態改善
- エラーハンドリング強化

#### **5.2 TypeScript・ESLintエラー解決**
- 全ファイルでのエラー0達成
- ビルド成功確認
- テスト実行確認

---

## 🧪 **8. テスト計画**

### **📋 リグレッションテスト項目**

#### **既存機能への影響確認**
1. **ランダムクイズ**: 動作変更なし確認
2. **カテゴリー指定クイズ**: 動作変更なし確認
3. **復習設定画面**: 既存動作維持確認
4. **ヘッダー通知**: 既存動作維持確認

#### **新機能のテスト**
1. **REVIEW_NEEDEDフラグ設定**: 5条件すべてテスト
2. **フィルタリング分離**: 各クイズタイプで正確性確認
3. **AI特別枠先行選出**: 難易度バランス確認
4. **バランス学習**: 学習記録反映確認

### **🎯 E2Eテストシナリオ**

#### **ビジネスAIパーソナライズクイズ**
```
1. ホーム画面から「ビジネスAIパーソナライズクイズ」選択
2. 基本カテゴリーのみが選出されることを確認
3. AI最適化による問題配分確認（特別枠4問+通常枠6問）
4. クイズ実行・回答
5. XP/SKP/ボーナス/格言カード付与確認
6. REVIEW_NEEDED適切設定確認
```

#### **復習AI推奨クイズ**
```
1. 通常クイズで復習対象問題を作成（不正解・ヒント使用等）
2. 3日経過後、ヘッダー通知表示確認
3. 復習クイズ開始・REVIEW_NEEDEDベース問題選出確認
4. 復習実行・基本XP/SKPのみ付与確認
5. 復習完了処理（reviewed_at設定・再判定）確認
```

### **📊 パフォーマンステスト**
- クイズ開始まで2秒以内
- AI最適化処理3秒以内
- 復習問題取得1秒以内
- データベースクエリ最適化確認

---

## 📈 **9. 成功指標・KPI**

### **技術指標**
- **バグ修正率**: Phase 1で重大バグ100%解決
- **応答時間**: クイズ開始まで2秒以内
- **正答率向上**: AI最適化により学習効果+15%向上
- **TypeScript/ESLintエラー**: 0個維持

### **ユーザー指標**
- **継続率**: 週次アクティブユーザー+20%向上
- **満足度**: クイズ体験満足度4.5/5.0以上
- **復習完了率**: 推奨復習の70%以上完了
- **学習効率**: 同一カテゴリーでの習熟速度向上

### **システム指標**
- **データ一貫性**: 復習状態管理100%正確
- **設定反映率**: ユーザー設定100%反映
- **通知精度**: 復習通知95%以上の精度
- **API可用性**: 99.9%以上の稼働率

---

## 🔄 **10. 継続改善・メンテナンス**

### **監視項目**
- 各クイズタイプの利用率・完了率
- AI最適化効果の測定
- 復習システムの効果測定
- エラー率・レスポンス時間監視

### **今後の拡張予定**
- 学習効果のA/Bテスト機能
- より高度なAI最適化アルゴリズム
- 協調フィルタリングによる推奨問題
- 学習進捗の可視化強化

---

**実装準備完了** ✅

*この設計書に基づいて段階的実装を開始し、各フェーズで品質確認を実施しながら確実にシステムを改善していきます。*