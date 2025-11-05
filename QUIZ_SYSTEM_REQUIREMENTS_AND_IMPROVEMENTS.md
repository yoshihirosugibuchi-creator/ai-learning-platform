# クイズシステム要件整理・改善計画書

**プロジェクト**: AI学習プラットフォーム  
**対象**: 全クイズシステムの要件整理と修正項目特定  
**作成日**: 2025年10月28日  
**バージョン**: 1.0

---

## 📋 **概要**

現在のクイズシステムの実装状況を調査し、要件と実装の差異を特定。修正・追加が必要な項目を優先度別に整理して改善計画を策定する。

---

## 🎯 **1. ビジネスAIパーソナライズクイズ**

### **📝 要件定義**

#### **基本仕様**
- **対象**: 業界問わず全ビジネスマンが身に着けたいスキル（基本カテゴリー）
- **問題数**: 10問1セッション
- **報酬**: XP/SKP/ボーナスXP/SKP/格言カード全て付与対象

#### **AI最適化要件**
1. **スキルレベル対応難易度出題**: ユーザーの正答率に応じた動的難易度配分
2. **苦手分野克服**: 苦手カテゴリー、繰り返しミス、正解連続効果の分析・活用
3. **バランス学習**: 全学習ジャンルをまんべんなく学習する仕組み
4. **記憶定着サポート**: 忘却曲線計算（エビングハウス式、記憶強度閾値＆難易度別係数）

### **📊 現在の実装状況**

```
✅ 基本カテゴリー対象（メインカテゴリー限定）
✅ 10問1セッション・報酬システム完備
✅ 全体正答率ベース難易度調整（ただし期間制限なし）
❌ 苦手分野克服ロジック（復習システムと分離状態）
❌ バランス学習ロジック（カテゴリー配分未考慮）
❌ 忘却曲線統合（復習システムと分離状態）
❌ 期間限定正答率分析（全履歴ベースのみ）
❌ 難易度配分の管理者設定機能
```

### **🔧 修正・追加項目**

#### **Priority 1 (緊急)**
1. **期間限定正答率分析**
   ```typescript
   // 現在: 全履歴ベース
   const overallAccuracy = calculateMainCategoryAccuracy(categoryProgress, mainCategoryIds)
   
   // 修正: 期間優先分析
   const recentAccuracy = calculateAccuracyByPeriod(userId, {
     period: '1week',        // 1週間優先
     fallback: '1month',     // フォールバック: 1ヶ月
     minimum: 'all'          // 最終: 全期間
   })
   ```

#### **Priority 2 (短期)**
2. **苦手分野統合**: 復習ロジックの`getWeakCategoryQuestions`を通常クイズ選出に統合
3. **忘却曲線統合**: 復習ロジックの`getForgettingQuestions`を通常クイズ選出に統合
4. **難易度配分管理**: データベーステーブル管理による管理者設定機能

#### **Priority 3 (中期)**
5. **バランス学習**: カテゴリー配分最適化アルゴリズム
6. **繰り返しミス統合**: 復習ロジックの`getRepeatMistakeQuestions`を通常クイズ選出に統合

---

## 🛠️ **2. セルフパーソナライズクイズ**

### **📝 要件定義**

#### **基本仕様**
- **対象**: ユーザー選択カテゴリー・サブカテゴリー（基本・業界両方対象）
- **設定**: 学習レベル設定（指定難易度以上の問題対象）
- **問題数**: 10問1セッション
- **報酬**: XP/SKP/ボーナスXP/SKP/格言カード全て付与対象

#### **AI最適化要件**
- ビジネスAIパーソナライズクイズと同等の4機能を提供

### **📊 現在の実装状況**

```
✅ カテゴリー・サブカテゴリー・レベル選択UI完備
✅ 基本的なフィルタリング実装済み
✅ 10問1セッション・報酬システム完備
❌ 【重大バグ】複数カテゴリー選択なのに単一カテゴリー前提ロジック使用
❌ 固定配分（基礎4問・中級4問・その他2問）でユーザースキル無視
❌ AIパーソナライズ最適化（未統合）
❌ フォールバックルールの段階的改善
```

#### **🚨 重大問題: 設計ミス**

```typescript
// 現在の問題コード（components/quiz/QuizSession.tsx:393）
return optimizeQuestionsForUser(personalizedQuestions, user.id, profile, false)
//                                                                      ↑
//                                                              isRandomQuiz = false

// これにより以下の単一カテゴリー前提ロジックが動作
const categoryStats = categoryProgress.find((cp) => cp.category_id === category)
//                                                                        ↑
//                                                                  undefined
// 結果: 必ず初回学習者扱いで固定配分（基礎4問・中級4問・その他2問）
```

### **🔧 修正・追加項目**

#### **Priority 1 (緊急修正)**
1. **【重大】複数カテゴリー対応ロジック実装**
   ```typescript
   // 新規実装が必要
   const optimizeMultiCategoryQuestions = (
     personalizedQuestions: Question[],
     userId: string,
     userProfile: UserProfileWithProgress | null,
     selectedCategories: string[]
   ): Question[] => {
     // 選択カテゴリー全体の正答率計算
     const multiCategoryAccuracy = calculateMultiCategoryAccuracy(
       userProfile.categoryProgress, 
       selectedCategories
     )
     
     // 正答率ベース配分適用
     const distribution = getDifficultyDistributionByAccuracy(multiCategoryAccuracy)
     return optimizeByDistribution(personalizedQuestions, distribution)
   }
   ```

#### **Priority 2 (短期実装)**
2. **フォールバック改善**: 段階的緩和ルール
   ```typescript
   // 現在の単純フォールバック
   if (filteredQuestions.length < 5) {
     filteredQuestions = questions // 全問題
   }
   
   // 修正: 段階的フォールバック
   if (filteredQuestions.length < 10) {
     // Step 1: 学習レベル制限緩和
     const relaxedQuestions = questions.filter(q => 
       selectedCategories.includes(q.category)
       // learningLevel制限除去
     )
     
     if (relaxedQuestions.length >= 10) {
       filteredQuestions = relaxedQuestions
     } else {
       // Step 2: カテゴリー制限も緩和
       filteredQuestions = questions
     }
   }
   ```

#### **Priority 3 (中期実装)**
3. **AIパーソナライズ統合**: ビジネスAIと同等の最適化機能統合
4. **サブカテゴリー活用強化**: より細かい学習進度分析

---

## 🔄 **3. 復習AI推奨クイズ**

### **📝 要件定義**

#### **基本仕様**
- **対象**: 過去クイズで復習必要と判定された問題
- **問題数**: 10問基本（設定画面で1-30問に変更可能）
- **報酬**: XP/SKP対象、ボーナスXP/SKP/格言カード対象外

#### **復習対象判定要件**
1. **クイズ不正解**
2. **ヒントLv2以上使用**
3. **自信レベル1-2**
4. **復習完了後は条件解除で復習対象から除外**

#### **復習実施判定要件**
1. **復習対象が3日以上経過**
2. **まだ復習未実施**
3. **対象問題1問以上存在**

#### **設定要件**
1. **復習問題実施数設定**: デフォルト10、1-30問まで設定可能
2. **復習通知頻度**: デフォルト毎日(1)、2-7日で変更可能
3. **リアルタイム通知**: ヘッダー通知アラート、画面オレンジ表示

### **📊 現在の実装状況**

```
✅ review_needed フィールド実装済み
✅ 基本的な復習ロジック（忘却曲線・苦手・繰り返しミス）
✅ 復習通知間隔設定（7日間隔、2-7日変更可能）
❌ ヒント使用による復習対象判定（未実装）
❌ 自信レベルによる復習対象判定（未実装）
❌ 復習問題数設定（1-30問）
❌ 復習実施後の状態変更ロジック
❌ 復習設定UI（プロフィール画面）
❌ ヘッダー通知バッジ（リアルタイム変化）
❌ 復習専用報酬システム（ボーナス除外）
```

### **🔧 修正・追加項目**

#### **Priority 1 (緊急実装)**
1. **復習対象判定拡張**
   ```typescript
   // 現在の復習判定拡張
   export async function determineReviewNeed(
     userId: string,
     questionId: string,
     isCorrect: boolean,
     responseTime: number,
     difficulty: string,
     maxHintLevel?: number,      // 新規追加
     confidenceLevel?: number    // 新規追加
   ): Promise<boolean> {
     
     // 既存条件
     if (!isCorrect) return true
     if (responseTime > (timeLimit * 0.8 * 1000)) return true
     
     // 新規条件1: ヒント使用
     if (maxHintLevel && maxHintLevel >= 2) {
       return true
     }
     
     // 新規条件2: 自信レベル
     if (confidenceLevel && confidenceLevel <= 2) {
       return true
     }
     
     // 既存: 繰り返しミス判定
     const hasRepeatMistakes = await checkRepeatMistakes(userId, questionId, difficulty)
     return hasRepeatMistakes
   }
   ```

2. **復習設定データ構造拡張**
   ```typescript
   // 現在の設定
   export interface ReviewSettings {
     notificationEnabled: boolean
     notificationIntervalDays: number
     createdAt: string
     updatedAt: string
   }
   
   // 拡張設定
   export interface ExtendedReviewSettings extends ReviewSettings {
     reviewQuestionsCount: number  // 復習問題数（1-30、デフォルト10）
   }
   ```

#### **Priority 2 (短期実装)**
3. **復習状態管理システム**
   ```typescript
   // 復習完了後の状態更新
   export async function updateReviewStatus(
     userId: string,
     sessionId: string,
     completedAnswers: QuestionAnswer[]
   ): Promise<void> {
     
     for (const answer of completedAnswers) {
       const stillNeedsReview = await determineReviewNeed(
         userId,
         answer.questionId,
         answer.isCorrect,
         answer.responseTime,
         answer.difficulty,
         answer.maxHintLevel,
         answer.confidenceLevel
       )
       
       // review_needed状態を更新
       await supabaseAdmin
         .from('quiz_answers')
         .update({ 
           review_needed: stillNeedsReview,
           reviewed_at: stillNeedsReview ? null : new Date().toISOString()
         })
         .eq('user_id', userId)
         .eq('question_id', answer.questionId)
         .eq('review_needed', true)
     }
   }
   ```

4. **復習専用報酬システム**
   ```typescript
   // XP計算API修正
   const calculateRewards = (answers: QuestionAnswer[], isReviewMode: boolean) => {
     const baseXP = calculateBaseXP(answers)
     const baseSKP = calculateBaseSKP(answers)
     
     if (isReviewMode) {
       return {
         xp: baseXP,           // 基本XPのみ
         skp: baseSKP,         // 基本SKPのみ
         bonusXP: 0,           // ボーナスXP無し
         bonusSKP: 0,          // ボーナスSKP無し
         wisdomCard: null      // 格言カード無し
       }
     }
     
     return calculateFullRewards(answers)
   }
   ```

#### **Priority 3 (中期実装)**
5. **復習設定UI**: プロフィール画面の復習管理セクション
6. **ヘッダー通知システム**: リアルタイム通知バッジ

---

## 🏗️ **4. 共通基盤システム**

### **📝 統合AI最適化エンジン（新規実装）**

#### **必要な新機能**

1. **期間限定正答率分析**
   ```typescript
   interface AccuracyAnalysis {
     period: '1week' | '1month' | 'all'
     accuracy: number
     confidence: 'high' | 'medium' | 'low'
     sampleSize: number
     hasData: boolean
   }
   
   export async function calculateRecentAccuracy(
     userId: string,
     preferredPeriod: '1week' | '1month' = '1week'
   ): Promise<AccuracyAnalysis>
   ```

2. **難易度配分管理テーブル**
   ```sql
   CREATE TABLE difficulty_distribution_settings (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     accuracy_range_min INTEGER NOT NULL,  -- 60, 75, 90
     accuracy_range_max INTEGER NOT NULL,  -- 74, 89, 100
     basic_percent DECIMAL(5,2) NOT NULL,
     intermediate_percent DECIMAL(5,2) NOT NULL,
     advanced_percent DECIMAL(5,2) NOT NULL,
     expert_percent DECIMAL(5,2) NOT NULL,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW(),
     created_by UUID REFERENCES users(id),
     
     CONSTRAINT check_percentage_sum 
       CHECK (basic_percent + intermediate_percent + advanced_percent + expert_percent = 100.00)
   );
   ```

3. **統合最適化エンジン**
   ```typescript
   export async function optimizeQuestionsWithAI(
     questions: Question[],
     userId: string,
     mode: 'business-ai' | 'self-personalized',
     userSettings?: QuizPersonalizationSettings
   ): Promise<Question[]> {
     
     // 1. 基本フィルタリング（モード別）
     let filteredQuestions = questions
     if (mode === 'business-ai') {
       filteredQuestions = filterByMainCategories(questions)
     } else {
       filteredQuestions = filterQuestionsForPersonalizedQuiz(questions, userSettings!)
     }
     
     // 2. 期間限定正答率分析
     const recentAccuracy = await calculateRecentAccuracy(userId, '1week')
     
     // 3. 苦手分野分析（復習ロジック統合）
     const weakCategories = await analyzeWeakCategories(userId, filteredQuestions)
     
     // 4. 繰り返しミス分析（復習ロジック統合）
     const repeatMistakes = await analyzeRepeatMistakes(userId, filteredQuestions)
     
     // 5. 忘却曲線分析（復習ロジック統合）
     const forgettingQuestions = await analyzeForgettingCurve(userId, filteredQuestions)
     
     // 6. バランス配分計算
     const distribution = calculateOptimalDistribution({
       accuracy: recentAccuracy,
       weakCategories,
       repeatMistakes,
       forgettingQuestions,
       mode
     })
     
     // 7. 最終選出
     return selectOptimalQuestions(filteredQuestions, distribution, 10)
   }
   ```

4. **復習ロジック統合活用**
   ```typescript
   // 既存復習ロジックを通常クイズ選出に統合
   // - getForgettingQuestions() → 忘却曲線分析
   // - getWeakCategoryQuestions() → 苦手分野分析  
   // - getRepeatMistakeQuestions() → 繰り返しミス分析
   
   // review_needed判定は復習専用に特化
   export async function getReviewQuestions(userId: string): Promise<Question[]> {
     return await supabaseAdmin
       .from('quiz_answers')
       .select('question_id')
       .eq('user_id', userId)
       .eq('review_needed', true)
       .gte('created_at', threeDaysAgo)
   }
   ```

5. **バランス学習アルゴリズム**
   ```typescript
   function ensureCategoryBalance(
     selectedQuestions: Question[],
     availableQuestions: Question[],
     targetCount: number = 10
   ): Question[] {
     
     const categoryCount = new Map<string, number>()
     const maxPerCategory = Math.ceil(targetCount / 4) // 想定カテゴリー数
     
     const balanced: Question[] = []
     const remaining = [...selectedQuestions]
     
     // カテゴリーバランスを保ちながら選出
     while (balanced.length < targetCount && remaining.length > 0) {
       for (const question of remaining) {
         const currentCount = categoryCount.get(question.category) || 0
         
         if (currentCount < maxPerCategory) {
           balanced.push(question)
           categoryCount.set(question.category, currentCount + 1)
           remaining.splice(remaining.indexOf(question), 1)
           
           if (balanced.length >= targetCount) break
         }
       }
     }
     
     return balanced
   }
   ```

---

## 🎯 **5. 実装優先度・ロードマップ**

### **🚨 Phase 1: 緊急修正（1週間）**

#### **Week 1: 重大バグ修正**
- [ ] **セルフパーソナライズの設計ミス修正**
  - 複数カテゴリー対応ロジック実装
  - 固定配分から正答率ベース配分への変更
  
- [ ] **復習対象判定拡張**
  - ヒント使用レベル対応
  - 自信レベル対応
  - 復習状態管理の基本実装

- [ ] **期間限定正答率分析**
  - 1週間優先の分析ロジック実装
  - フォールバック機能（1ヶ月→全期間）

### **⚡ Phase 2: 基盤強化（2週間）**

#### **Week 2-3: 統合システム構築**
- [ ] **統合最適化エンジン構築**
  - 共通AIパーソナライズロジック実装
  - 復習ロジックの統合活用
  
- [ ] **復習システムUI実装**
  - プロフィール画面設定セクション
  - ヘッダー通知バッジ
  - 復習問題数設定（1-30問）

- [ ] **難易度配分管理システム**
  - データベーステーブル実装
  - 管理者画面での設定機能

### **📈 Phase 3: 高度機能（3週間）**

#### **Week 4-6: 最適化・完成**
- [ ] **バランス学習アルゴリズム**
  - カテゴリー配分最適化
  - 忘却曲線統合

- [ ] **フォールバック改善**
  - セルフパーソナライズの段階的緩和ルール
  - より柔軟な問題選出

- [ ] **パフォーマンス最適化**
  - キャッシュ機能実装
  - 高速化・メモリ最適化

### **🔍 Phase 4: 分析・監視（継続）**

#### **継続的改善**
- [ ] **学習効果分析**
  - A/Bテスト機能
  - 学習効果測定

- [ ] **システム監視**
  - パフォーマンス監視
  - エラー率監視
  - ユーザー満足度調査

---

## 📊 **6. 成功指標・KPI**

### **技術指標**
- **バグ修正率**: Phase 1で重大バグ100%解決
- **応答時間**: クイズ開始まで2秒以内
- **正答率向上**: AI最適化により学習効果+15%向上

### **ユーザー指標**
- **継続率**: 週次アクティブユーザー+20%向上
- **満足度**: クイズ体験満足度4.5/5.0以上
- **復習完了率**: 推奨復習の70%以上完了

### **システム指標**
- **データ一貫性**: 復習状態管理100%正確
- **設定反映率**: ユーザー設定100%反映
- **通知精度**: 復習通知95%以上の精度

---

## 🛠️ **7. 技術実装指針**

### **開発原則**
1. **段階的実装**: 既存機能を壊さない漸進的改善
2. **後方互換性**: 既存データ・設定の完全保持
3. **テスト駆動**: 各機能の包括的テスト実装
4. **パフォーマンス重視**: ユーザー体験を最優先

### **品質管理**
- **コードレビュー**: 全変更の必須レビュー
- **自動テスト**: CI/CDでの自動品質チェック
- **段階的デプロイ**: フィーチャーフラグによる安全なリリース

---

**実装開始準備完了** ✅  
この要件書に基づき、Phase 1から段階的に実装を開始できます。