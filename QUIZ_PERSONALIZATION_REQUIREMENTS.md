# クイズ出題パーソナライゼーション（簡易版）要件書

## 📋 概要

現在のクイズ出題システムの問題点を解決し、学習効果を向上させるためのパーソナライゼーション機能を実装する。段階的改善により、ユーザーの学習レベルに応じた最適な問題選択を実現する。

## 🚨 現在の問題点

### 1. ランダムクイズの問題
- **問題**: カテゴリー選択時に `category` が undefined のため、正答率による最適化が無効
- **影響**: 常に初心者向けの固定配分（基礎4問、中級4問、その他2問）
- **対象**: `mode=random` でのクイズ実行時

### 2. 正答率計算の課題
- **問題**: 学習開始からの累計データのため、直近の成長が反映されない
- **影響**: 長期ユーザーの古いデータが新しい学習成果を覆い隠す
- **対象**: 全てのカテゴリー別クイズ

### 3. 難易度複数選択時の最適化無効
- **問題**: 難易度を複数選択すると、正答率ベースの最適化が完全に無効化
- **影響**: 学習効率の大幅低下（初心者に上級問題、上級者に基礎問題）
- **対象**: カテゴリー選択クイズで複数難易度指定時

### 4. カテゴリー選択の非最適化
- **問題**: ランダムクイズで全カテゴリーから完全ランダム選択
- **影響**: 弱点分野の重点学習ができない
- **対象**: ランダムクイズでのカテゴリー配分

### 5. シャッフルアルゴリズムの偏り
- **問題**: `Array.sort(() => 0.5 - Math.random())` による偏ったランダム化
- **影響**: 真のランダム性が担保されない
- **対象**: 全ての問題選択処理

## 🎯 簡易版要件定義

### Phase 1: 基本修正（即効性重視）

#### 1.1 ランダムクイズの修正
**要件:**
- ランダムクイズでも正答率ベースの難易度最適化を適用
- 出題カテゴリーを `type='main'` の基本カテゴリーに限定
- 全体的な正答率を参考にした難易度配分

**動作仕様:**
```typescript
// ランダムクイズでの処理フロー
1. type='main' カテゴリーのみに問題を限定
2. ユーザーの全体正答率を計算（クイズ + コース学習）
3. 正答率に応じた難易度配分を決定
4. 各難易度から指定数の問題を選択
```

#### 1.2 Fisher-Yates Shuffle 導入
**要件:**
- 全ての問題選択処理で真のランダム化を実現
- 条件合致問題からの選択時とプレゼンテーション順の両方に適用

**技術仕様:**
```typescript
// Fisher-Yates Shuffle実装
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
```

#### 1.3 難易度選択UI改善
**要件:**
- 複数難易度選択を単一選択に変更
- 難易度未選択時は正答率ベース最適化を適用

### Phase 2: 直近データ重視システム

#### 2.1 直近7学習日数の正答率計算
**要件:**
- 学習日ベースでの正答率計算（カレンダー日ではなく実際の学習実施日）
- クイズ・コース学習・業界クイズの全てを統合
- データ信頼度に応じたフォールバック機能

**データ取得仕様:**
```sql
-- 直近7学習日数の取得
WITH learning_days AS (
  SELECT DISTINCT DATE(created_at) as learning_date
  FROM quiz_answers 
  WHERE user_id = ? 
  ORDER BY learning_date DESC 
  LIMIT 7
)
SELECT qa.* FROM quiz_answers qa
INNER JOIN learning_days ld ON DATE(qa.created_at) = ld.learning_date
WHERE qa.user_id = ?
```

#### 2.2 データ信頼度判定システム
**要件:**
- 回答数・学習日数・期間に基づく信頼度判定
- 信頼度に応じたフォールバック戦略の自動適用

**信頼度基準:**
- **High**: 50問以上 かつ 5日以上
- **Medium**: 20問以上 かつ 3日以上  
- **Low**: 上記未満

#### 2.3 フォールバック戦略
**要件:**
- 段階的データ活用による最適化精度の向上
- ユーザーへの透明性確保

**戦略仕様:**
1. 直近7学習日数（優先）
2. 直近30日間（重み付き平均）
3. 全期間データ（最終手段）
4. デフォルト配分（新規ユーザー）

### Phase 3: カテゴリー選択最適化

#### 3.1 ランダムクイズのカテゴリー配分
**要件:**
- 学習履歴に基づく優先順位システム
- 弱点分野の重点出題

**優先順位:**
1. **復習問題**: 3日前の間違い問題から最大2問
2. **重点カテゴリー**: ユーザー設定により2倍の出題確率
3. **弱点強化**: XP低順カテゴリーの優先出題

## 🔧 実装修正案

### 修正対象ファイル

#### 1. `components/quiz/QuizSession.tsx`

**修正箇所1: ランダムクイズの正答率適用**
```typescript
// 現在のコード（問題）
const categoryStats = categoryProgress.find((cp: CategoryProgress) => cp.category_id === category)
// category が undefined の場合、categoryStats も undefined

// 修正後
const categoryStats = category 
  ? categoryProgress.find((cp: CategoryProgress) => cp.category_id === category)
  : calculateOverallStats(categoryProgress) // 全体統計を計算
```

**修正箇所2: 最適化関数の改善**
```typescript
// 現在のoptimizeQuestionsForUser関数を拡張
const optimizeQuestionsForUser = useCallback((
  questions: Question[], 
  userId: string, 
  userProfile: UserProfileWithProgress | null,
  isRandomQuiz: boolean = false
): Question[] => {
  // ランダムクイズ用の処理を追加
  if (isRandomQuiz) {
    // type='main'のカテゴリーのみフィルタ
    const mainCategoryQuestions = questions.filter(q => 
      getCategories().find(c => c.id === q.category)?.type === 'main'
    )
    
    // 全体正答率による最適化
    const overallStats = calculateOverallStats(userProfile?.categoryProgress || [])
    return optimizeByOverallAccuracy(mainCategoryQuestions, overallStats)
  }
  
  // 既存のカテゴリー別最適化
  // ...
})
```

#### 2. `lib/questions.ts`

**修正箇所: Fisher-Yates Shuffle導入**
```typescript
// 現在のコード（問題）
const shuffled = [...activeQuestions].sort(() => 0.5 - Math.random())

// 修正後
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function getRandomQuestions(questions: Question[], count = 10): Question[] {
  const activeQuestions = questions.filter(q => !q.deleted)
  const shuffled = fisherYatesShuffle(activeQuestions)
  return shuffled.slice(0, count)
}
```

#### 3. 新規ファイル: `lib/recent-accuracy-calculator.ts`

**Phase 2で追加するファイル**
```typescript
export interface RecentAccuracyResult {
  accuracy: number
  confidence: 'high' | 'medium' | 'low'
  sampleSize: number
  learningDays: string[]
  fallbackUsed: boolean
  explanation: string
}

export class RecentAccuracyCalculator {
  async getRecent7LearningDaysAccuracy(userId: string): Promise<RecentAccuracyResult>
  async getOverallAccuracyWithFallback(userId: string): Promise<RecentAccuracyResult>
  private analyzeDataConfidence(data: any): ConfidenceLevel
  private applyFallbackStrategy(userId: string, confidence: ConfidenceLevel): Promise<RecentAccuracyResult>
}
```

#### 4. UI修正: 難易度選択の単一化

**対象ファイル: 難易度選択UI コンポーネント**
```typescript
// 複数選択（checkboxes）から単一選択（radio buttons）に変更
// difficulties: string[] → difficulty: string | undefined
```

### 新規APIエンドポイント

#### 1. `app/api/user-stats/recent-accuracy/route.ts`
```typescript
// GET /api/user-stats/recent-accuracy?user_id=xxx&days=7&type=learning_days
export async function GET(request: Request) {
  // 直近学習日数ベースの正答率計算
  // フォールバック戦略の適用
  // 信頼度レベルの判定
}
```

#### 2. `app/api/categories/priority/route.ts`
```typescript
// GET /api/categories/priority?user_id=xxx
export async function GET(request: Request) {
  // カテゴリー選択優先順位の計算
  // 復習問題の特定
  // 弱点カテゴリーの判定
}
```

### データベース拡張

#### 1. user_learning_profiles テーブル拡張
```sql
ALTER TABLE user_learning_profiles ADD COLUMN preferred_difficulty_level VARCHAR(20);
ALTER TABLE user_learning_profiles ADD COLUMN focus_categories TEXT[]; -- 重点学習カテゴリー
ALTER TABLE user_learning_profiles ADD COLUMN override_auto_adjustment BOOLEAN DEFAULT FALSE;
```

#### 2. 新テーブル: difficulty_adjustment_alerts
```sql
CREATE TABLE difficulty_adjustment_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  current_setting VARCHAR(20),
  recommended_setting VARCHAR(20),
  recent_accuracy DECIMAL(5,2),
  trigger_reason VARCHAR(20), -- 'too_easy' | 'too_hard'
  shown_at TIMESTAMP,
  dismissed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 📊 成功指標

### 定量的指標
1. **学習効率向上**: セッション当たりの平均正答率 15%向上
2. **継続率向上**: 週次アクティブユーザー 20%向上  
3. **レスポンス性能**: 問題選択処理時間 500ms以内維持

### 定性的指標
1. **ユーザー満足度**: 「問題の難易度が適切」評価 80%以上
2. **学習体験**: 「成長を実感できる」評価 75%以上

## 🚀 実装スケジュール

### Phase 1: 基本修正（1-2週間）
- [ ] ランダムクイズの正答率適用修正
- [ ] Fisher-Yates Shuffle導入
- [ ] 難易度選択UI変更
- [ ] type='main'カテゴリー限定

### Phase 2: 直近データ重視（2-3週間）
- [ ] 直近7学習日数計算システム
- [ ] データ信頼度判定
- [ ] フォールバック戦略実装
- [ ] 新APIエンドポイント作成

### Phase 3: カテゴリー最適化（1-2週間）
- [ ] カテゴリー選択優先順位システム
- [ ] 復習問題特定機能
- [ ] 弱点分野重点出題
- [ ] ユーザー設定画面拡張

### Phase 4: 検証・改善（1週間）
- [ ] A/Bテスト実施
- [ ] 性能測定・最適化
- [ ] ユーザーフィードバック収集
- [ ] 最終調整

## 💡 将来拡張予定

### 中期（3-6ヶ月）
- SuperMemo アルゴリズム統合
- 忘却曲線ベースの復習スケジューリング
- 学習時間帯最適化

### 長期（6ヶ月以上）
- 認知負荷リアルタイム調整
- 学習スタイル別パーソナライゼーション
- AI による動的難易度調整

---

*この要件書は段階的実装により、システムの安定性を保ちながら学習効果の最大化を目指しています。*