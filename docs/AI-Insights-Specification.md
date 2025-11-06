# AIインサイト（AI）タブ仕様書

## 概要

学習分析ページの「インサイト（AI）」タブは、ユーザーの学習パターン分析結果に基づいて、AIが生成したパーソナライズされた学習改善提案とヒントを提供する機能です。継続的な学習効果向上を目指すための具体的なアクションプランを提供します。

## 機能構成

### 1. タブレイアウト
- **場所**: 学習分析ページの4番目のタブ「インサイト（AI）」
- **アイコン**: Lightbulb（電球）アイコン
- **カラーテーマ**: 緑から黄色のグラデーション（`bg-gradient-to-r from-green-50 to-yellow-50`）

### 2. データ取得プロセス

#### 2.1 データソース
- **プライマリデータソース**: `quiz_answers` テーブル
  - ユーザーの回答履歴（問題ID、正誤、回答時間、カテゴリー、難易度、作成日時）
  - 直近500件のデータを使用
- **フォールバックデータソース**: `course_session_completions` テーブル
  - コース学習完了記録から推定データを生成
- **最終フォールバック**: localStorage の学習進捗データ

#### 2.2 キャッシュ機能
- **キャッシュ時間**: 5分間（`CACHE_DURATION = 5 * 60 * 1000`）
- **キャッシュキー**: `insights_${userId}`
- **更新条件**: タブ切り替え時または手動更新時にキャッシュが無効な場合のみ再取得

### 3. AI分析ロジック

#### 3.1 学習パターン分析（`analyzeLearningPatterns`）
以下の8つの観点から総合的に分析：

1. **学習頻度パターン** (`learningFrequency`)
   - 平均日次問題数
   - 活動日数
   - 曜日別傾向
   - 継続性指標（標準偏差ベース）

2. **時間帯パターン** (`timeOfDayPatterns`)
   - 最も活発な時間帯
   - パフォーマンスが良い時間帯
   - ピーク集中時間
   - 統計的信頼度計算（最低10問のサンプル必要）

3. **科目別強弱分析** (`subjectStrengths`)
   - 得意分野（正答率80%以上、5問以上）
   - 苦手分野（正答率60%未満、3問以上）
   - 全体正答率

4. **難易度進行度** (`difficultyProgression`)
   - 現在のレベル評価
   - 各難易度での成績
   - 次レベル準備状況

5. **継続性パターン** (`streakPatterns`)
   - 現在の連続学習日数
   - 最長連続記録
   - 平均連続日数

6. **エラーパターン** (`errorPatterns`)
   - よくある間違いのパターン
   - 総エラー数と率

7. **学習速度** (`learningVelocity`)
   - 正答率の向上傾向
   - 学習効率スコア
   - 改善判定

8. **定着率** (`retentionRate`)
   - 直近7日間の正答率
   - トレンド評価

#### 3.2 個人化ヒント生成（`generatePersonalizedHints`）

**一般的なヒント** (`generalTips`)
- **最適時間帯の提案**: パフォーマンスデータに基づく最適学習時間の案内
  ```
  条件: patterns.timeOfDayPatterns.bestPerformanceHours.length > 0
  メッセージ例: "午前の時間帯（10時頃）が最も集中できる時間です"
  ```

- **継続性改善の提案**: 継続性が低い場合の改善アドバイス
  ```
  条件: patterns.learningFrequency.consistency < 0.5
  メッセージ例: "毎日少しずつでも継続することで、学習効果が大幅に向上します"
  ```

- **進捗励ましメッセージ**: 学習効率が向上している場合
  ```
  条件: patterns.learningVelocity.isImproving
  メッセージ例: "学習効率が向上しています！この調子で継続しましょう"
  ```

**パフォーマンス向上のコツ** (`performanceTips`)
- **レベルアップ通知**: 次の難易度に進む準備ができている場合
  ```
  条件: patterns.difficultyProgression.readyForNext
  メッセージ例: "難易度を上げる準備ができています！"
  ```

- **復習推奨**: 学習効率が低い場合
  ```
  条件: patterns.learningVelocity.velocityScore < 50
  メッセージ例: "復習を増やして定着率を向上させましょう"
  ```

**科目別ヒント** (`subjectSpecificTips`)
- **強み活用の提案**: 得意分野がある場合
  ```
  条件: subjectStrengths.strengths.length > 0
  メッセージ例: "コミュニケーション・プレゼンテーションが得意分野です。この強みを活かして他の分野にも挑戦してみましょう"
  ```

- **弱点克服の提案**: 苦手分野がある場合
  ```
  条件: subjectStrengths.weaknesses.length > 0
  メッセージ例: "論理思考・問題解決の理解を深めるため、基礎から復習することをお勧めします"
  ```

**励ましメッセージ** (`motivationalMessage`)
- 学習効率向上時: "学習効率が向上しています！素晴らしい成長です"
- 通常時: ランダム選択
  - "継続は力なり！毎日の積み重ねが成果につながります"
  - "素晴らしい学習ペースです！この調子で頑張りましょう"
  - "新しいことを学ぶ喜びを大切に、一歩ずつ前進しましょう"

### 4. 表示ロジック

#### 4.1 ローディング状態
```typescript
isTabLoading = !currentTabData.loaded && !isRefreshing
```
- 3つのスケルトンアニメーション表示
- 各スケルトンは48px幅のタイトルと64px高さのコンテンツエリア

#### 4.2 データ有無判定
```typescript
tabCache.insights.hints ? (表示) : (データなしメッセージ)
```

**データありの場合:**
- **一般的なヒント**: 青色背景カード（`bg-blue-50 border-blue-200`）
- **パフォーマンス向上のコツ**: 緑色背景カード（`bg-green-50 border-green-200`）
- 各ヒントは箇条書きで表示（`•` を使用）

**データなしの場合:**
```
アイコン: Lightbulb（12x12px、グレー）
タイトル: "インサイトなし"
説明: "学習データを蓄積してインサイトを表示しましょう"
```

### 5. 更新メカニズム

#### 5.1 自動更新条件
- タブ初回アクセス時
- キャッシュ期限切れ（5分経過）時
- 手動更新ボタン押下時

#### 5.2 更新プロセス
1. `loadInsightsData()` 関数実行
2. `aiAnalytics.generatePersonalizedHints(user.id)` 呼び出し
3. 結果をキャッシュに保存
4. UI更新

### 6. エラーハンドリング

#### 6.1 データ取得エラー
- コンソールエラーログ出力: `"Error loading insights data:"`
- UIには影響せず、データなし状態として表示

#### 6.2 分析エラー
- デフォルトパターンにフォールバック（`getDefaultPattern()`）
- 空のヒント配列を返す

### 7. パフォーマンス最適化

#### 7.1 遅延ローディング
- タブクリック時にのみデータ取得
- 他タブ表示時はメモリ解放

#### 7.2 データ制限
- 分析対象: 直近500件の回答データ
- 時間帯分析: 直近30日のデータのみ使用
- 最低サンプル数: 各分析で3-10問の最低閾値設定

### 8. カテゴリーマッピング

AIインサイト機能では、以下のカテゴリーマッピングシステムを使用：

#### 8.1 メインカテゴリー
- `communication_presentation` - コミュニケーション・プレゼンテーション
- `logical_thinking_problem_solving` - 論理思考・問題解決
- `strategy_management` - 戦略・経営
- `finance` - 財務
- `marketing_sales` - マーケティング・営業
- `leadership_hr` - リーダーシップ・人事
- `ai_digital_utilization` - AI・デジタル活用
- `project_operations` - プロジェクト・業務
- `business_process_analysis` - ビジネスプロセス分析
- `risk_crisis_management` - リスク・危機管理

#### 8.2 サブカテゴリーからメインカテゴリーへの推定マッピング
- 部分一致による自動マッピング
- 不明な場合は `logical_thinking_problem_solving` をデフォルト使用

## 技術的詳細

### API呼び出し
```typescript
const hints = await aiAnalytics.generatePersonalizedHints(user.id)
```

### データ構造
```typescript
interface PersonalizedHints {
  generalTips: string[]
  subjectSpecificTips: string[]
  performanceTips: string[]
  motivationalMessage: string
  questionSpecific?: string[]
}
```

### キャッシュ構造
```typescript
insights: {
  hints: PersonalizedHints | null
  loaded: boolean
  lastRefresh: number
}
```

## セキュリティとプライバシー

- ユーザーIDによる個人データ分離
- クライアントサイドでの分析（個人データサーバー送信なし）
- ローカルキャッシュによるパフォーマンス向上
- ROW LEVEL SECURITY による DB アクセス制御

---
*最終更新: 2025年11月6日*