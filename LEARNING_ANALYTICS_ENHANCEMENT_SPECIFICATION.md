# 学習分析システム強化仕様書

**プロジェクト**: AI学習プラットフォーム  
**作成日**: 2025年10月21日  
**目的**: unused daily_xp_records フィールド活用による学習分析機能強化  
**対象**: 思考時間分析・ピーク時間特定・学習品質評価システム

---

## 📋 **概要**

### 目的
現在未使用の `daily_xp_records` テーブルの3つのフィールドを活用し、既存のAI学習パターン分析を強化する：
- `study_time_minutes`: 実際の思考時間集計
- `peak_study_hour`: 最高効率学習時間
- `learning_quality_score`: 学習品質総合評価

### 基本方針
- **既存UI統合**: 新しいタブは作らず「学習パターン（AI）」タブ内に機能追加
- **データ活用**: `quiz_answers.time_spent` を集計して思考時間ベースの分析を実現
- **ユーザー価値**: 正答率重視 vs 時間効率重視の多角的学習パターン分析
- **説明充実**: 各指標の意味と活用方法を詳細にガイド

---

## 🛠 **技術仕様**

### データベース設計

#### A. daily_xp_records テーブル拡張

```sql
-- hourly_efficiency_data JSONB フィールド追加
ALTER TABLE daily_xp_records 
ADD COLUMN hourly_efficiency_data JSONB DEFAULT '{}'::jsonb;

-- JSONB構造仕様
{
  "timezone": "Asia/Tokyo",
  "hourly_stats": {
    "00": {"quiz_time": 0, "xp_earned": 0, "efficiency": 0, "session_count": 0},
    "01": {"quiz_time": 0, "xp_earned": 0, "efficiency": 0, "session_count": 0},
    ...
    "23": {"quiz_time": 180, "xp_earned": 45, "efficiency": 0.25, "session_count": 3}
  },
  "peak_hours": [20, 21, 19],
  "total_thinking_time": 1250,
  "daily_session_count": 8,
  "last_updated_jst": "2025-10-21T20:45:00+09:00"
}
```

#### B. バッチ処理管理テーブル新規作成

```sql
-- 日次分析バッチ履歴管理
CREATE TABLE daily_analytics_batch_log (
  id BIGSERIAL PRIMARY KEY,
  process_date DATE NOT NULL,
  process_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  processed_users INTEGER DEFAULT 0,
  error_message TEXT,
  force_reprocess BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(process_date, process_type)
);

CREATE INDEX idx_batch_log_process_date ON daily_analytics_batch_log(process_date);
CREATE INDEX idx_batch_log_status ON daily_analytics_batch_log(status);
```

#### C. フィールド活用仕様

```sql
-- study_time_minutes: quiz_answers.time_spent の日次集計（分単位）
-- peak_study_hour: hourly_efficiency_data から算出される最効率時間（0-23）
-- learning_quality_score: 5要素の加重平均による品質スコア（0-100）
```

### データ処理システム

#### A. リアルタイム記録システム

```typescript
// app/api/xp-save/quiz/route.ts への統合
async function updateHourlyEfficiencyData(userId: string, sessionData: QuizSessionData) {
  const hourJST = getCurrentHourJST()
  const dateJST = getDateJST()
  const thinkingTime = sessionData.answers.reduce((sum, answer) => sum + answer.time_spent, 0)
  const xpEarned = sessionData.total_xp
  
  // 既存データ取得・更新
  const existingData = await getExistingHourlyData(userId, dateJST)
  const updatedData = calculateUpdatedHourlyData(existingData, hourJST, thinkingTime, xpEarned)
  
  // daily_xp_records 更新
  await supabase
    .from('daily_xp_records')
    .upsert({
      user_id: userId,
      date: dateJST,
      study_time_minutes: Math.round(updatedData.total_thinking_time / 60),
      peak_study_hour: calculatePeakHour(updatedData.hourly_stats),
      hourly_efficiency_data: updatedData
    })
}

// 日本時間対応関数
function getCurrentHourJST(): number {
  return parseInt(new Date().toLocaleString('ja-JP', { 
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    hour12: false 
  }).split(':')[0])
}

function getDateJST(): string {
  return new Date().toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).replace(/\//g, '-')
}
```

#### B. バッチ処理システム

```typescript
// app/api/admin/daily-analytics-batch/route.ts
export async function POST(request: Request) {
  const { process_date, force_reprocess = false } = await request.json()
  
  try {
    // 重複実行チェック
    const existingLog = await checkExistingProcess(process_date, 'quality_score')
    if (existingLog && !force_reprocess) {
      return NextResponse.json({ error: '処理済みです' }, { status: 400 })
    }
    
    // バッチ開始ログ
    const batchLog = await createBatchLog(process_date, 'quality_score')
    
    // 処理対象ユーザー取得・処理
    const targetUsers = await getTargetUsers(process_date)
    let processedCount = 0
    
    for (const userRecord of targetUsers) {
      const qualityScore = await calculateLearningQualityScore(userRecord.user_id, process_date)
      const peakHour = calculatePeakStudyHour(userRecord.hourly_efficiency_data)
      
      await updateDailyRecord(userRecord.user_id, process_date, qualityScore, peakHour)
      processedCount++
    }
    
    // バッチ完了ログ
    await completeBatchLog(batchLog.id, processedCount)
    
    return NextResponse.json({
      success: true,
      processed_users: processedCount
    })
    
  } catch (error) {
    await failBatchLog(process_date, error.message)
    throw error
  }
}
```

#### C. 学習品質スコア算出ロジック

```typescript
function calculateLearningQualityScore(data: LearningData): number {
  const components = {
    consistency: calculateConsistencyScore(data.streak),      // 25% 継続性
    accuracy: calculateAccuracyScore(data.correctRate),      // 30% 正確性
    efficiency: calculateEfficiencyScore(data.timeVsXP),     // 20% 効率性
    diversity: calculateDiversityScore(data.categories),     // 15% 多様性
    depth: calculateDepthScore(data.difficultyProgression)   // 10% 深度
  }
  
  return Math.round(
    components.consistency * 0.25 +
    components.accuracy * 0.30 +
    components.efficiency * 0.20 +
    components.diversity * 0.15 +
    components.depth * 0.10
  )
}

// 各構成要素の算出例
function calculateConsistencyScore(streakData: StreakData): number {
  const dailyRate = streakData.activeDays / 30 // 過去30日での学習日率
  return Math.min(100, dailyRate * 100)
}

function calculateAccuracyScore(correctRate: number): number {
  return Math.round(correctRate * 100)
}

function calculateEfficiencyScore(timeVsXP: TimeVsXPData): number {
  const averageEfficiency = timeVsXP.totalXP / (timeVsXP.totalTime / 60) // XP/分
  const normalizedScore = Math.min(100, (averageEfficiency / 2) * 100) // 2XP/分で100点
  return Math.round(normalizedScore)
}
```

---

## 🎨 **UI/UX設計**

### Analytics ページ統合設計

#### A. 学習パターン（AI）タブ構成（修正版）

```typescript
<TabsContent value="patterns" className="space-y-6">
  {/* 🆕 学習ガイドセクション */}
  <LearningGuideSection />

  {/* 🔄 カード1: 拡張された学習パターン多角分析 */}
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Brain className="h-5 w-5" />
        学習パターン多角分析
        <InfoTooltip content="あなたの学習データを複数の観点から分析し、最適な学習方法を見つけます" />
      </CardTitle>
      <ExplanationBox type="pattern-analysis" />
    </CardHeader>
    <CardContent>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <LearningFrequencyWidget />          // 既存
        <AccuracyFocusedWidget />            // 既存（名称変更）
        <TimeEfficiencyWidget />             // 🆕 新規
      </div>
    </CardContent>
  </Card>

  {/* 🔄 カード2: 既存レコメンデーション（説明強化） */}
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5" />
        学習最適化レコメンデーション
        <InfoTooltip content="あなたの学習パターンから導き出された具体的な改善提案です" />
      </CardTitle>
      <OptimalTimeExplanationBox />
    </CardHeader>
    <CardContent>
      {/* 既存のレコメンデーション内容 */}
    </CardContent>
  </Card>

  {/* 🆕 カード3: 学習品質総合評価 */}
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Star className="h-5 w-5" />
        学習品質総合評価
        <InfoTooltip content="5つの要素から算出される、あなたの学習の質を示すスコアです" />
      </CardTitle>
      <QualityScoreExplanationBox />
    </CardHeader>
    <CardContent>
      <LearningQualityDashboard />
    </CardContent>
  </Card>
</TabsContent>
```

#### B. 新規ウィジェット詳細設計

```typescript
// 時間効率ウィジェット
function TimeEfficiencyWidget({ data }: { data: TimeEfficiencyData }) {
  return (
    <div className="p-4 bg-orange-50 rounded-lg">
      <h4 className="font-medium text-orange-900 mb-3 flex items-center">
        <Zap className="h-4 w-4 mr-2" />
        最高効率時間（時間効率重視）
        <InfoTooltip content="実際に問題を考えている時間から算出した、時間あたりのXP獲得効率です" />
      </h4>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>最高効率時間帯:</span>
          <span className="font-medium">{data.peakHour}時台</span>
        </div>
        <div className="flex justify-between">
          <span>時間効率:</span>
          <span className="font-medium">{data.efficiency} XP/分</span>
        </div>
        <div className="flex justify-between">
          <span>平均思考時間:</span>
          <span className="font-medium">{Math.round(data.totalThinkingTime / data.sessionCount)}分</span>
        </div>
      </div>

      <WidgetExplanation 
        title="💡 この時間帯の特徴"
        description="短時間で多くのXPを獲得できる時間帯です。日常的な学習や復習に最適です。"
        actions={[
          "毎日の習慣として、この時間帯に15-20分学習",
          "軽い復習や新しい分野の導入に利用"
        ]}
      />
    </div>
  )
}

// 学習品質ダッシュボード
function LearningQualityDashboard({ userId }: { userId: string }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* スコア表示部分 */}
      <div className="text-center">
        <div className="text-3xl font-bold text-emerald-600 mb-2">
          {qualityScore}/100
        </div>
        <div className="text-sm text-muted-foreground mb-4">
          学習品質スコア
        </div>
        <ProgressBar score={qualityScore} />
        <ScoreBadge score={qualityScore} />
      </div>

      {/* 構成要素詳細 */}
      <div className="space-y-3">
        <QualityComponent label="継続性" score={consistencyScore} weight="25%" />
        <QualityComponent label="正確性" score={accuracyScore} weight="30%" />
        <QualityComponent label="効率性" score={efficiencyScore} weight="20%" />
        <QualityComponent label="多様性" score={diversityScore} weight="15%" />
        <QualityComponent label="深度" score={depthScore} weight="10%" />
      </div>
    </div>

    {/* アクション提案 */}
    <ImprovementSuggestions score={qualityScore} components={components} />
  )
}
```

#### C. 説明・ガイダンスコンポーネント

```typescript
// 学習ガイドセクション
function LearningGuideSection() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h3 className="font-medium text-blue-900 mb-3 flex items-center">
        <BookOpen className="h-5 w-5 mr-2" />
        学習パターン分析の活用方法
      </h3>
      <div className="grid gap-4 md:grid-cols-3 text-sm text-blue-800">
        <GuideCard 
          title="📊 分析結果の見方"
          content="正答率重視は試験対策、時間効率重視は日常学習に活用。両方を組み合わせて最適な学習計画を立てましょう。"
        />
        <GuideCard 
          title="⏰ 時間の使い分け"
          content="集中力が高い時間は重要な学習に、効率的な時間は復習や新分野の導入に使い分けます。"
        />
        <GuideCard 
          title="📈 継続的な改善"
          content="学習品質スコアを定期的に確認し、弱い要素を意識的に改善していきましょう。"
        />
      </div>
    </div>
  )
}

// 最適学習時間の説明ボックス
function OptimalTimeExplanationBox() {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
      <h5 className="font-medium text-green-900 mb-2">最適学習時間とは？</h5>
      <div className="text-sm text-green-800">
        <p className="mb-2">あなたの過去の学習データから統計的に算出された、最も効果的な学習時間帯です。</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ExplanationCard 
            icon="📈"
            title="計算方法"
            content="正答率70% × 時間効率30%の加重平均"
          />
          <ExplanationCard 
            icon="🎯"
            title="活用方法"
            content="重要な学習はこの時間帯に集中"
          />
        </div>
      </div>
    </div>
  )
}

// 学習品質スコア説明ボックス
function QualityScoreExplanationBox() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
      <h5 className="font-medium text-amber-900 mb-2">スコアの見方とアクション</h5>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-amber-800">
        <div>
          <p className="font-medium mb-1">📊 スコア区分</p>
          <ScoreGuideList />
        </div>
        <div>
          <p className="font-medium mb-1">🔍 5つの構成要素</p>
          <ComponentGuideList />
        </div>
      </div>
    </div>
  )
}
```

### ユーザビリティ向上要素

#### A. ツールチップシステム

```typescript
function InfoTooltip({ content }: { content: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="ml-1 text-gray-400 hover:text-gray-600">
            <HelpCircle className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

#### B. スコア区分ガイド

```typescript
const qualityScoreGuide = {
  "90-100": {
    badge: "🏆 素晴らしい",
    color: "emerald",
    message: "新しい分野にチャレンジしましょう",
    actions: ["高難易度問題への挑戦", "新しいカテゴリーの開拓"]
  },
  "70-89": {
    badge: "👍 良好",
    color: "blue", 
    message: "苦手分野を強化しましょう",
    actions: ["継続的な学習習慣", "弱点分野の集中学習"]
  },
  "50-69": {
    badge: "💪 改善の余地あり",
    color: "orange",
    message: "継続が重要です",
    actions: ["毎日少しずつの継続", "基礎問題の反復"]
  },
  "0-49": {
    badge: "📚 基礎固め",
    color: "red",
    message: "基礎から見直しましょう",
    actions: ["基本概念の理解", "易しい問題からスタート"]
  }
}
```

---

## 🔧 **管理者機能**

### 日次分析バッチ管理

#### A. 管理者メニュー統合

```typescript
// app/admin/analytics-batch/page.tsx
function AnalyticsBatchManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">日次分析処理管理</h1>
        <RefreshButton onClick={handleRefresh} />
      </div>

      {/* 実行セクション */}
      <Card>
        <CardHeader>
          <CardTitle>日次分析処理実行</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchExecutionForm />
        </CardContent>
      </Card>

      {/* 履歴セクション */}
      <Card>
        <CardHeader>
          <CardTitle>処理履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchHistoryTable />
        </CardContent>
      </Card>

      {/* 統計セクション */}
      <Card>
        <CardHeader>
          <CardTitle>処理統計</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchStatistics />
        </CardContent>
      </Card>
    </div>
  )
}
```

#### B. バッチ実行フォーム

```typescript
function BatchExecutionForm() {
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [forceReprocess, setForceReprocess] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleExecute = async () => {
    setIsProcessing(true)
    try {
      const response = await fetch('/api/admin/daily-analytics-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          process_date: selectedDate,
          force_reprocess: forceReprocess
        })
      })
      
      if (response.ok) {
        toast({ title: '処理が開始されました' })
      } else {
        const error = await response.json()
        toast({ title: 'エラー', description: error.error, variant: 'destructive' })
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="date">処理対象日</Label>
          <Input 
            id="date"
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
        
        <div className="flex items-center space-x-2 mt-6">
          <Checkbox 
            id="force"
            checked={forceReprocess}
            onCheckedChange={setForceReprocess}
          />
          <Label htmlFor="force">強制再処理</Label>
        </div>
        
        <div className="mt-6">
          <Button 
            onClick={handleExecute}
            disabled={!selectedDate || isProcessing}
            className="w-full"
          >
            {isProcessing ? '処理中...' : '実行'}
          </Button>
        </div>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <p className="text-sm text-yellow-800">
          💡 通常は前日分のデータを夜間に自動処理します。
          手動実行は過去データの再計算や問題修正後の再処理用です。
        </p>
      </div>
    </div>
  )
}
```

---

## 📊 **データAPI仕様**

### 新規API エンドポイント

#### A. 時間効率分析取得API

```typescript
// app/api/analytics/time-efficiency/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const days = parseInt(searchParams.get('days') || '30')
  
  try {
    const { data: records } = await supabase
      .from('daily_xp_records')
      .select('date, hourly_efficiency_data, study_time_minutes, peak_study_hour')
      .eq('user_id', userId)
      .gte('date', getDateNDaysAgo(days))
      .order('date', { ascending: false })
    
    const analysis = analyzeTimeEfficiency(records)
    
    return NextResponse.json({
      peakHour: analysis.peakHour,
      efficiency: analysis.averageEfficiency,
      totalThinkingTime: analysis.totalThinkingTime,
      sessionCount: analysis.totalSessions,
      dailyTrend: analysis.dailyTrend
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get time efficiency data' }, { status: 500 })
  }
}
```

#### B. 学習品質スコア取得API

```typescript
// app/api/analytics/quality-score/route.ts
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const days = parseInt(searchParams.get('days') || '7')
  
  try {
    const qualityData = await getQualityScoreData(userId, days)
    const improvementSuggestions = generateImprovementSuggestions(qualityData)
    
    return NextResponse.json({
      totalScore: qualityData.totalScore,
      components: {
        consistency: qualityData.consistency,
        accuracy: qualityData.accuracy,
        efficiency: qualityData.efficiency,
        diversity: qualityData.diversity,
        depth: qualityData.depth
      },
      trend: qualityData.trend,
      improvementSuggestions
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to get quality score' }, { status: 500 })
  }
}
```

---

## 🚀 **実装計画**

### Phase 1: データ基盤構築（1週間）

```markdown
## Day 1-2: データベース設計・準備
- [ ] hourly_efficiency_data JSONB フィールド追加
- [ ] daily_analytics_batch_log テーブル作成
- [ ] 日本時間対応ユーティリティ関数作成
- [ ] migration script作成・テスト

## Day 3-4: リアルタイム記録システム
- [ ] quiz API での hourly_efficiency_data 更新機能
- [ ] study_time_minutes 自動計算・更新
- [ ] peak_study_hour リアルタイム算出
- [ ] エラーハンドリング・ログ強化

## Day 5-7: バッチ処理システム
- [ ] 日次分析バッチ API 実装
- [ ] learning_quality_score 算出ロジック
- [ ] バッチ重複防止・履歴管理
- [ ] 管理者メニュー基本機能
```

### Phase 2: UI統合実装（1週間）

```markdown
## Day 8-10: 新規コンポーネント作成
- [ ] TimeEfficiencyWidget 実装
- [ ] LearningQualityCard 実装
- [ ] InfoTooltip システム実装
- [ ] 説明ボックス各種実装

## Day 11-12: 既存UI統合・修正
- [ ] OptimizedAnalyticsPage の修正
- [ ] 既存ウィジェットの説明強化
- [ ] レスポンシブ対応・グリッド調整
- [ ] データ取得の並列処理統合

## Day 13-14: UX向上・ガイダンス
- [ ] 学習ガイドセクション実装
- [ ] スコア区分・アクション指針システム
- [ ] ツールチップ・ヘルプシステム
- [ ] エラーハンドリング・ローディング状態
```

### Phase 3: 管理者機能・API（5日間）

```markdown
## Day 15-16: API エンドポイント
- [ ] /api/analytics/time-efficiency 実装
- [ ] /api/analytics/quality-score 実装
- [ ] データ集計・分析ロジック最適化
- [ ] キャッシュ戦略・パフォーマンス調整

## Day 17-19: 管理者機能
- [ ] 日次バッチ管理画面実装
- [ ] バッチ実行フォーム・履歴表示
- [ ] 処理統計・監視機能
- [ ] エラー通知・アラート機能
```

### Phase 4: 品質調整・テスト（3日間）

```markdown
## Day 20-21: 包括テスト・調整
- [ ] 全機能の統合テスト
- [ ] パフォーマンステスト・負荷確認
- [ ] ユーザビリティテスト・UI調整
- [ ] エラーケース・エッジケース確認

## Day 22: 最終調整・ドキュメント
- [ ] 算出ロジック最終調整
- [ ] ユーザー向けヘルプ・ガイド完成
- [ ] コードレビュー・品質確認
- [ ] デプロイ準備・本番確認
```

---

## 🎯 **成功指標**

### 機能面
- [ ] 3つの未使用フィールドが全て有効活用されている
- [ ] 学習パターン（AI）タブに新機能が統合されている
- [ ] ユーザーが各指標の意味と活用方法を理解できる
- [ ] 管理者が日次分析処理を適切に管理できる

### 技術面
- [ ] TypeScript/ESLint エラー 0個維持
- [ ] ビルド・テスト全通過
- [ ] 日本時間での正確な時間帯分析
- [ ] バッチ処理の重複防止・エラーハンドリング

### UX面
- [ ] 既存UIの自然な拡張（新規タブなし）
- [ ] 分かりやすい説明・ガイダンス
- [ ] 実用的なアクション指針
- [ ] レスポンシブ・アクセシビリティ対応

### 運用面
- [ ] 管理者による適切な運用が可能
- [ ] エラー監視・アラート機能
- [ ] パフォーマンス問題なし
- [ ] 段階的なロールバック可能

---

## 📚 **参考資料**

### 関連ドキュメント
- `CLAUDE.md` - プロジェクト開発ガイドライン
- `lib/ai-analytics.ts` - 既存AI学習パターン分析実装
- `components/analytics/OptimizedAnalyticsPage.tsx` - 統合対象コンポーネント
- `app/api/xp-save/quiz/route.ts` - XP保存API（修正対象）

### データベーススキーマ
- `daily_xp_records` テーブル - 拡張対象
- `quiz_answers` テーブル - データソース
- `user_xp_stats_v2` テーブル - 関連統計

### UI/UXリファレンス  
- 既存の学習パターン（AI）タブデザイン
- Shadcn/ui コンポーネントライブラリ
- プロジェクト共通のカラーパレット・スタイリング

---

**本仕様書に基づき、段階的かつ確実に学習分析システムの強化を実装していきます。**

**作成者**: Claude Code Assistant  
**承認**: プロジェクトチーム  
**版数**: v1.0