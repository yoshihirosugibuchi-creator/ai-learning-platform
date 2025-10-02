# AI学習分析機能強化仕様書

**プロジェクト**: AI Learning Platform Next.js  
**機能名**: 学習パターン分析・業界別分析の強化  
**作成日**: 2025年10月1日  
**ステータス**: 仕様検討段階  

---

## 📋 **要件概要**

### **学習パターン分析の強化項目**

#### **1. 学習頻度分析 (analyzeLearningFrequency)**
- **目的**: 学習の継続性とペースの特定
- **活用**: 最適な学習頻度の推奨、継続性の改善
- **データ**: 日別問題数（クイズの1セッションではなく各問題の数、コース学習のセッション終わりのセッション確認問題の数）、活動日数、曜日別パターン

**強化ポイント**:
- その日の解答問題数とその翌日の関係（休んでしまう、解答数がむしろ増える、解答数が減る）
- 継続性と解答数（学習の数）の相関性をチェック
- 有効な違いを見極めるためのデータ蓄積要件の明確化

#### **2. 時間パターン分析 (analyzeTimePatterns)**
- **目的**: 最適な学習時間帯の特定
- **活用**: 個人の集中力ピーク時間の推奨
- **データ**: 時間別活動量と正答率の組み合わせ

**強化ポイント**:
- ビジネスマン向け時間帯制限を考慮
- 一定期間の学習傾向として、特定の時間帯で一貫して良好または不良なパフォーマンスが見られる場合の検出
- 良好なパフォーマンス傾向の時間帯は推奨、不良な傾向の時間帯は見直しを提案
- 統計的に有意な傾向を判定するために必要なデータ量の見極め

#### **3. 科目別強み分析 (analyzeSubjectStrengths)**
- **目的**: 得意・不得意分野の特定
- **活用**: パーソナライズ学習推奨
- **データ**: カテゴリー別正答率と回答時間

**強化ポイント**:
- カテゴリー別、サブカテゴリー別の正答率分析
- 正解時の回答時間と不正解時の回答時間の相関性分析
- 継続的な傾向として強み・弱みを判定するために必要なデータ量の見極め
- 正答率、経験値XP、回答時間すべてが高い傾向の場合を強みとする

#### **4. 難易度進捗分析 (analyzeDifficultyProgression)**
- **目的**: 学習レベルの進捗追跡
- **活用**: 適切な難易度問題の推奨
- **データ**: 難易度別正答率

**強化ポイント**:
- （ランダム、もしくはカテゴリー指定）クイズの各問題難易度と正答率
- コース学習のコース難易度とセッションクイズ正答率
- サブカテゴリー別XP、カテゴリー別XPと正答率の学習成長性評価
- ユーザープロフィールの学習設定レベル（自己申告）の適性評価
- パーソナライズ最適化ロジックのインプット

#### **5. 学習速度・改善傾向**
- **確認事項**: UI上の「学習速度・改善傾向」の分析目的と仕様の明確化が必要

### **業界別分析の新機能**

#### **業界別スキル分析（準備中）として実装**
- 業界選択（XP > 0の業界のみ選択表示）
- 業界レベル選択（basic/intermediate/advanced/expert - プロフィールの学習者レベル連動）
- 選択した業界、選択したレベルのサブカテゴリー別レーダーチャート表示
- 当面サブカテゴリーXP値による表示
- 各レベルの目標XPレベルをデータで作成し、比較表示
- DB化して管理者が変更可能なマスタデータ管理
- サブカテゴリーメンテナンス時の自動反映システム

---

## 🔧 **技術仕様設計**

### **1. 強化された学習パターン分析**

#### **学習頻度分析の拡張**
```typescript
interface EnhancedLearningFrequencyAnalysis {
  // 現在の基本データ
  averageDailyQuestions: number
  activeDays: number
  consistency: number
  
  // 新規追加: 翌日の関係性分析
  nextDayCorrelation: {
    highVolumeNextDay: number    // 多く解答した翌日の継続率
    lowVolumeNextDay: number     // 少なく解答した翌日の継続率
    restDayRecovery: number      // 休んだ翌日の解答数増加率
    burnoutThreshold: number     // バーンアウト閾値（連続日数）
  }
  
  // データ蓄積状況
  dataAdequacy: {
    sufficientData: boolean      // 分析に十分なデータがあるか
    minimumDataDays: number      // 有効分析に必要な最小日数
    currentDataDays: number      // 現在の蓄積日数
    reliabilityScore: number     // 分析信頼度 (0-100)
  }
  
  // 曜日別パターン
  weeklyPattern: {
    dayOfWeek: string
    averageQuestions: number
    completionRate: number
    performanceScore: number
  }[]
}
```

#### **時間パターン分析の精密化**
```typescript
interface PreciseTimePatternAnalysis {
  hourlyPerformance: {
    hour: number
    questionCount: number
    averageAccuracy: number
    averageResponseTime: number
    confidenceLevel: number      // この時間帯のデータ信頼度
  }[]
  
  // 一貫した傾向のある時間帯の検出
  consistentTimeSlots: {
    hour: number
    performanceType: 'consistently_excellent' | 'consistently_poor' | 'average'
    trendStrength: number        // 傾向の一貫性 (0-1)
    averageAccuracy: number      // 平均正答率
    sessionCount: number         // セッション数
    recommendation: 'focus_learning' | 'avoid_learning' | 'neutral'
    confidenceLevel: 'high' | 'medium' | 'low'
  }[]
  
  // ビジネスパーソン特化分析
  businessHourAnalysis: {
    earlyMorning: { hours: number[], performance: number, recommendation: string }
    lunchBreak: { hours: number[], performance: number, recommendation: string }
    evening: { hours: number[], performance: number, recommendation: string }
    lateNight: { hours: number[], performance: number, recommendation: string }
  }
  
  dataRequirement: {
    minimumSessionsPerHour: number  // 一貫した傾向判定に必要な最小セッション数
    hoursWithSufficientData: number[]
    analysisReliability: 'high' | 'medium' | 'low' | 'insufficient'
    recommendedDataPeriod: number   // 信頼性の高い分析に必要な期間（日数）
  }
}
```

#### **科目別強み分析の拡張**
```typescript
interface ComprehensiveSubjectAnalysis {
  categoryAnalysis: {
    categoryId: string
    categoryName: string
    
    // 基本指標
    accuracy: number
    averageResponseTime: number
    xpEarned: number
    
    // 相関分析
    timeAccuracyCorrelation: number    // 回答時間と正答率の相関
    fastCorrectRatio: number           // 素早く正解した割合
    slowCorrectRatio: number           // 遅いが正解した割合
    
    // 強み判定基準（継続的傾向として）
    strengthIndicators: {
      highAccuracy: boolean            // 正答率 > 80%
      highXP: boolean                 // XP > 平均+1σ
      optimalResponseTime: boolean     // 回答時間が適切
      overallStrength: 'strong' | 'developing' | 'weak'
      trendStability: number          // 傾向の安定性 (0-1)
    }
    
    subcategoryBreakdown: {
      subcategoryId: string
      subcategoryName: string
      performance: SubjectPerformanceMetrics
    }[]
  }[]
  
  dataAdequacy: {
    categoriesWithSufficientData: string[]
    minimumQuestionsPerCategory: number
    recommendedDataCollectionPeriod: number // days
    trendAnalysisThreshold: number          // 傾向分析に必要な最小問題数
  }
}
```

#### **統合難易度分析**
```typescript
interface IntegratedDifficultyAnalysis {
  // 現在のレベル適性評価
  currentLevelAssessment: {
    userReportedLevel: 'basic' | 'intermediate' | 'advanced' | 'expert'
    systemCalculatedLevel: 'basic' | 'intermediate' | 'advanced' | 'expert'
    levelAccuracy: number           // 自己申告レベルの適性度
    recommendedLevel: 'basic' | 'intermediate' | 'advanced' | 'expert'
    adjustmentReason: string
  }
  
  // カテゴリー別成長性
  categoryGrowthAnalysis: {
    categoryId: string
    currentXP: number
    growthRate: number              // XP獲得速度
    difficultyProgression: number   // 難易度上昇への適応度
    learningVelocity: number        // 学習速度スコア
    predictedMastery: number        // 習得予測期間（日）
  }[]
  
  // パーソナライズ最適化のためのデータ
  optimizationInput: {
    optimalDifficultyRange: [number, number]  // 最適難易度範囲
    challengeToleranceLevel: number           // チャレンジ耐性
    frustractionThreshold: number             // フラストレーション閾値
    motivationFactors: string[]               // モチベーション要因
  }
}
```

### **2. 業界別分析システム**

#### **業界別スキル分析**
```typescript
interface IndustrySkillAnalysisSystem {
  // 業界選択システム
  industrySelection: {
    availableIndustries: {
      industryId: string
      industryName: string
      totalXP: number              // この業界での総XP
      categoryCount: number        // 関連カテゴリー数
      userRank: number            // ユーザーの業界内ランク（将来実装）
    }[]
    selectedIndustry: string
    userDefaultIndustry: string    // プロフィールの業界
  }
  
  // レベル選択システム
  levelSelection: {
    availableLevels: {
      levelId: 'basic' | 'intermediate' | 'advanced' | 'expert'
      levelName: string
      targetExperience: string
      description: string
    }[]
    selectedLevel: 'basic' | 'intermediate' | 'advanced' | 'expert'
    userCurrentLevel: 'basic' | 'intermediate' | 'advanced' | 'expert'  // プロフィールから
  }
  
  // サブカテゴリー別レーダーチャート
  skillRadarData: {
    subcategoryId: string
    subcategoryName: string
    currentXP: number
    targetXP: number             // 選択レベルでの目標XP
    completionRatio: number      // 目標達成率 (0-1)
    industryAverage: number      // 業界平均XP（将来実装）
  }[]
  
  // 目標XPマスタデータ
  targetXPMaster: {
    subcategoryId: string
    industryId: string
    basicTargetXP: number
    intermediateTargetXP: number
    advancedTargetXP: number
    expertTargetXP: number
    lastUpdated: Date
    updatedBy: string           // 管理者ID
  }[]
}
```

#### **新規データベーステーブル設計**
```sql
-- 業界別サブカテゴリー目標XPマスター
CREATE TABLE industry_subcategory_xp_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_id VARCHAR(100) NOT NULL,
  subcategory_id VARCHAR(100) NOT NULL,
  skill_level_id VARCHAR(20) NOT NULL,  -- 'basic', 'intermediate', 'advanced', 'expert'
  target_xp INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  FOREIGN KEY (skill_level_id) REFERENCES skill_levels(id),
  UNIQUE KEY unique_industry_subcategory_level (industry_id, subcategory_id, skill_level_id)
);
```

---

## 📊 **データ要件・分析基準**

### **データ蓄積要件**
- **学習頻度分析**: 最低30日間のデータ、信頼性分析には60日推奨
- **時間帯傾向分析**: 各時間帯最低15セッション、一貫した傾向判定には各時間帯30セッション以上
- **科目別傾向分析**: カテゴリーごと最低30問、安定した傾向分析には100問推奨
- **難易度分析**: レベルごと最低50問、適性評価には150問推奨

### **統計的信頼性基準**
- **高信頼度**: 十分なサンプル数、傾向の一貫性確認、統計的有意性あり
- **中信頼度**: 中程度のサンプル数、参考程度の傾向分析
- **低信頼度**: サンプル数不足、データ蓄積を促す表示

### **傾向判定基準**
- **一貫した傾向**: 同じ時間帯・カテゴリーで複数回にわたって同様のパフォーマンス
- **偶発的な結果**: 単発または少数回の結果は傾向として扱わない
- **統計的検定**: 母平均との差の検定、信頼区間による評価

---

## 🔄 **実装計画**

### **Phase 1: データ収集基盤強化（2週間）**
- 学習セッション詳細ログの拡張
- 時間帯・曜日・継続性データの体系的収集
- 統計的信頼性を考慮したデータ品質管理

### **Phase 2: AI分析エンジン開発（2週間）**
- EnhancedAIAnalytics クラス実装
- 翌日関係性分析アルゴリズム
- 時間帯一貫性傾向判定ロジック
- データ信頼度評価システム

### **Phase 3: UI/UX実装（2週間）**
- 学習パターンタブの刷新
- データ信頼度の可視化
- インタラクティブチャート実装
- レスポンシブ対応

### **Phase 4: 業界分析システム（2週間）**
- industry_subcategory_xp_targets テーブル作成
- 業界別目標XP管理API実装
- レーダーチャート実装
- 管理者用マスタデータ管理画面

---

## ⚠️ **技術的考慮事項**

### **パフォーマンス最適化**
- キャッシュ戦略: Redis活用で分析結果を1時間キャッシュ
- 非同期処理: 重い分析処理はバックグラウンドで実行
- データベース最適化: 適切なインデックス設計

### **データ品質管理**
- 最小データ要件の明示化
- 信頼度スコアの可視化
- 段階的分析機能の有効化

### **セキュリティ・プライバシー**
- 個人データの匿名化処理
- 管理者権限の適切な管理
- GDPR準拠のデータ削除機能

---

## 🔍 **未調査・検討事項**

1. **「学習速度・改善傾向」の仕様明確化**: 現在のUI上の表示目的と分析内容の詳細確認が必要
2. **スキルレベル統一**: basic/beginner の不整合解決が先行必要
3. **ALE_TIME_MANAGEMENT_AI_ANALYSIS_SPECIFICATION**: 科学的根拠に基づく実装への反映方法
4. **既存データとの整合性**: 新分析システムと現在のデータ構造の互換性確保

---

**次回作業**: スキルレベル統一対応後、詳細仕様の再検討と実装優先度の決定

**最終更新**: 2025年10月1日  
**ステータス**: 仕様書作成完了、実装待機中