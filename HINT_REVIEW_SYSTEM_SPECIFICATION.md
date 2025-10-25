# ヒント・復習システム実装設計書

**プロジェクト**: AI学習プラットフォーム  
**対象機能**: quiz_answers.hint_used / review_needed 活用システム  
**作成日**: 2025年10月23日  
**バージョン**: 1.0

---

## 📋 **概要**

現在未使用の`quiz_answers`テーブルの`hint_used`と`review_needed`フィールドを活用し、学習効果を最大化するヒント機能と復習推奨システムを実装する。

### **主要機能**
1. **段階的ヒント機能**: 3レベルのヒント提供とXPペナルティ管理
2. **AI復習推奨システム**: 忘却曲線・苦手分野・繰り返しミス分析
3. **統合UI/UX**: 既存画面への自然な機能統合
4. **管理者メンテナンス**: ヒント・問題内容の編集機能

---

## 🎯 **1. ヒント機能システム**

### **A. ヒントデータ生成**

#### **AI自動生成（メイン手法）**
```typescript
interface HintGenerationRequest {
  questionId: string
  question: string
  correctAnswer: string
  options: string[]
  explanation: string
  category: string
  subcategory: string
  difficulty: string
}

interface HintData {
  level1: string  // アプローチ・分野ヒント（XP-5%）
  level2: string  // 選択肢絞り込みヒント（XP-15%）
  level3: string  // 正解に近い具体的ヒント（XP-30%）
}
```

**AI生成プロンプト設計:**
```typescript
const generateHintPrompt = (questionData: HintGenerationRequest) => `
問題: ${questionData.question}
正解: ${questionData.correctAnswer}
選択肢: ${questionData.options.join(', ')}
解説: ${questionData.explanation}
カテゴリー: ${questionData.category} > ${questionData.subcategory}
難易度: ${questionData.difficulty}

以下の3段階でヒントを生成してください：

**Level1 (軽微ヒント)**
- 問題のアプローチ方法や考え方の方向性を示す
- 直接的な答えは含めない
- 学習者の思考を正しい方向に導く程度
- XP減額: 5%

**Level2 (中程度ヒント)**  
- 選択肢の一部を絞り込めるヒント
- 明らかに間違いな選択肢の特徴を示す
- まだ正解は特定できない程度
- XP減額: 15%

**Level3 (詳細ヒント)**
- 正解に非常に近い具体的な情報
- 正解を特定しやすい決定的なヒント
- 学習効果を保つため完全な答えは避ける
- XP減額: 30%

JSON出力形式:
{
  "level1": "Level1ヒント内容",
  "level2": "Level2ヒント内容", 
  "level3": "Level3ヒント内容"
}
`
```

#### **管理者による手動メンテナンス**
- **新規画面**: `/admin/question-maintenance` 
- **機能**: 問題・ヒント編集（正解INDEX、ID、legacy_id、難易度は変更不可）
- **対象**: AI生成結果のレビュー・修正・新規ヒント追加

### **B. データベース設計**

#### **quiz_hintsテーブル（新規作成）**
```sql
CREATE TABLE quiz_hints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id INTEGER NOT NULL REFERENCES quiz_questions(id),
  level1_hint TEXT,
  level2_hint TEXT, 
  level3_hint TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  UNIQUE(question_id)
);

-- インデックス作成
CREATE INDEX idx_quiz_hints_question_id ON quiz_hints(question_id);
```

#### **xp_level_skp_settingsテーブル拡張**
```sql
-- ヒントペナルティ設定追加
ALTER TABLE xp_level_skp_settings ADD COLUMN IF NOT EXISTS 
  hint_level1_penalty_percent DECIMAL(5,2) DEFAULT 5.0;
ALTER TABLE xp_level_skp_settings ADD COLUMN IF NOT EXISTS 
  hint_level2_penalty_percent DECIMAL(5,2) DEFAULT 15.0;
ALTER TABLE xp_level_skp_settings ADD COLUMN IF NOT EXISTS 
  hint_level3_penalty_percent DECIMAL(5,2) DEFAULT 30.0;

COMMENT ON COLUMN xp_level_skp_settings.hint_level1_penalty_percent IS 'ヒントLevel1使用時のXP減額率(%)';
COMMENT ON COLUMN xp_level_skp_settings.hint_level2_penalty_percent IS 'ヒントLevel2使用時のXP減額率(%)';
COMMENT ON COLUMN xp_level_skp_settings.hint_level3_penalty_percent IS 'ヒントLevel3使用時のXP減額率(%)';
```

### **C. UI/UX実装**

#### **QuizCard.tsx 拡張**
```typescript
interface QuizCardProps {
  // 既存プロパティ...
  hintsAvailable?: boolean
  onHintUsed?: (level: number, hint: string) => void
}

// ヒント機能コンポーネント
const HintSection = ({ question, onHintUsed, currentLevel }) => {
  const [hints, setHints] = useState<HintData | null>(null)
  const [shownHints, setShownHints] = useState<string[]>([])
  const [currentHintLevel, setCurrentHintLevel] = useState(0)

  const loadHints = async () => {
    const response = await fetch(`/api/questions/${question.id}/hints`)
    setHints(await response.json())
  }

  const showNextHint = () => {
    const nextLevel = currentHintLevel + 1
    if (nextLevel <= 3 && hints) {
      const hintText = hints[`level${nextLevel}`]
      setShownHints([...shownHints, hintText])
      setCurrentHintLevel(nextLevel)
      onHintUsed(nextLevel, hintText)
    }
  }

  return (
    <div className="hint-section space-y-3">
      {/* ヒントボタン */}
      <Button
        variant="outline"
        size="sm"
        onClick={showNextHint}
        disabled={currentHintLevel >= 3}
        className="w-full"
      >
        <Lightbulb className="h-4 w-4 mr-2" />
        💡 ヒント {currentHintLevel + 1}/3
        {currentHintLevel > 0 && (
          <Badge variant="secondary" className="ml-2">
            XP-{getHintPenalty(currentHintLevel + 1)}%
          </Badge>
        )}
      </Button>

      {/* ヒント表示エリア */}
      {shownHints.map((hint, index) => (
        <div key={index} className="hint-display p-3 bg-blue-50 rounded-lg border">
          <div className="flex items-center mb-2">
            <Badge variant="secondary">
              ヒント Level {index + 1}
            </Badge>
            <Badge variant="outline" className="ml-2">
              XP-{getHintPenalty(index + 1)}%
            </Badge>
          </div>
          <p className="text-sm">{hint}</p>
        </div>
      ))}
    </div>
  )
}
```

#### **XP計算ロジック修正**
```typescript
// app/api/xp-save/quiz/route.ts 内
const calculateHintPenalty = (baseXP: number, maxHintLevel: number) => {
  if (maxHintLevel === 0) return baseXP
  
  // 設定テーブルからペナルティ率取得
  const penalties = await getHintPenaltySettings()
  const penaltyPercent = penalties[`level${maxHintLevel}`] || 0
  
  // 四捨五入で整数化
  const penaltyAmount = Math.round(baseXP * (penaltyPercent / 100))
  return Math.max(1, baseXP - penaltyAmount) // 最低1XPは保証
}

// ボーナスXPには適用しない
const finalXP = calculateHintPenalty(baseXP, maxHintLevelUsed) + bonusXP
```

---

## 🔄 **2. 復習推奨システム**

### **A. 復習判定アルゴリズム**

#### **忘却曲線ベース判定**
```typescript
interface MemoryStrengthCalculation {
  lastCorrectDate: Date
  daysSinceLastReview: number
  correctStreak: number
  categoryDifficulty: string
}

const calculateMemoryStrength = (params: MemoryStrengthCalculation): boolean => {
  const { daysSinceLastReview, correctStreak, categoryDifficulty } = params
  
  // 難易度別基本忘却率
  const difficultyMultiplier = {
    'basic': 0.4,        // 基礎は忘れにくい
    'intermediate': 0.5,  // 標準
    'advanced': 0.6,     // 上級は忘れやすい
    'expert': 0.7        // エキスパートは最も忘れやすい
  }
  
  const baseForgettingRate = (difficultyMultiplier[categoryDifficulty] || 0.5) 
    * Math.pow(0.7, correctStreak) // 正解連続で記憶定着
  
  const memoryStrength = Math.exp(-daysSinceLastReview * baseForgettingRate)
  
  return memoryStrength < 0.3 // 30%以下で復習推奨
}
```

#### **カテゴリー別苦手分野判定**
```typescript
const analyzeWeakCategories = async (userId: string): Promise<string[]> => {
  // 直近50問での正解率分析
  const recentAnswers = await supabaseAdmin
    .from('quiz_answers')
    .select('subcategory_id, is_correct, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  // サブカテゴリー別集計
  const categoryStats = recentAnswers.reduce((acc, answer) => {
    const subcat = answer.subcategory_id
    if (!acc[subcat]) {
      acc[subcat] = { correct: 0, total: 0 }
    }
    acc[subcat].total++
    if (answer.is_correct) acc[subcat].correct++
    return acc
  }, {})

  // 正解率60%未満かつ5問以上で苦手判定
  return Object.entries(categoryStats)
    .filter(([_, stats]) => 
      stats.accuracy < 0.6 && stats.total >= 5
    )
    .map(([subcategory]) => subcategory)
}
```

#### **繰り返しミス判定**
```typescript
const detectRepeatMistakes = async (
  userId: string, 
  subcategoryId: string, 
  difficulty: string
): Promise<boolean> => {
  // 同一サブカテゴリー・難易度での直近5問を分析
  const recentAnswers = await supabaseAdmin
    .from('quiz_answers')
    .select('is_correct, created_at')
    .eq('user_id', userId)
    .eq('subcategory_id', subcategoryId)
    .eq('difficulty', difficulty)
    .order('created_at', { ascending: false })
    .limit(5)

  if (recentAnswers.length < 3) return false
  
  // 直近3問中2問以上不正解で繰り返しミス判定
  const recent3 = recentAnswers.slice(0, 3)
  const incorrectCount = recent3.filter(a => !a.is_correct).length
  
  return incorrectCount >= 2
}
```

### **B. 復習対象問題選定**

```typescript
const selectReviewQuestions = async (userId: string, requestedCount: number) => {
  // 1. 忘却曲線ベース（優先度最高）
  const forgettingQuestions = await getForgettingQuestions(userId)
  
  // 2. 苦手カテゴリー問題
  const weakCategoryQuestions = await getWeakCategoryQuestions(userId)
  
  // 3. 繰り返しミス問題  
  const repeatMistakeQuestions = await getRepeatMistakeQuestions(userId)

  // 優先度順で結合・重複除去
  const allCandidates = [
    ...forgettingQuestions.map(q => ({ ...q, priority: 1 })),
    ...weakCategoryQuestions.map(q => ({ ...q, priority: 2 })),
    ...repeatMistakeQuestions.map(q => ({ ...q, priority: 3 }))
  ]

  // 重複除去・優先度順ソート・指定数まで選択
  const uniqueQuestions = Array.from(
    new Map(allCandidates.map(q => [q.id, q])).values()
  )
  .sort((a, b) => a.priority - b.priority)
  .slice(0, requestedCount)

  return uniqueQuestions
}
```

### **C. 復習設定管理**

#### **ユーザー設定テーブル拡張**
```sql
-- user_quiz_settingsテーブルに復習設定追加
ALTER TABLE user_quiz_settings ADD COLUMN IF NOT EXISTS 
  review_notification_interval_days INTEGER DEFAULT 7;
ALTER TABLE user_quiz_settings ADD COLUMN IF NOT EXISTS 
  review_notification_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN user_quiz_settings.review_notification_interval_days IS '復習通知間隔（日数）';
COMMENT ON COLUMN user_quiz_settings.review_notification_enabled IS '復習通知有効フラグ';
```

---

## 🖥️ **3. UI/UX統合設計**

### **A. ホームページ改修**

#### **復習推奨クイズパネル追加**
```typescript
// app/page.tsx 内
const ReviewQuizPanel = ({ reviewCount }: { reviewCount: number }) => {
  const hasUrgentReview = reviewCount >= 10

  return (
    <Link href="/quiz?mode=review">
      <Card className={`hover:shadow-lg transition-shadow cursor-pointer ${
        hasUrgentReview ? 'border-orange-400 bg-orange-50' : ''
      }`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RotateCcw className="h-5 w-5 text-orange-600" />
              <span>復習AI推奨クイズ</span>
            </div>
            {hasUrgentReview && (
              <Badge variant="destructive" className="animate-pulse">
                <AlertTriangle className="h-3 w-3 mr-1" />
                緊急
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-orange-600">
              {reviewCount}問
            </div>
            <p className="text-sm text-muted-foreground">
              AIが分析した復習推奨問題
            </p>
            {hasUrgentReview && (
              <p className="text-xs text-orange-600 font-medium">
                10問以上蓄積：早めの復習をお勧めします
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
```

#### **ヘッダー通知システム活用**
```typescript
// components/layout/Header.tsx 内
const NotificationBell = ({ user }: { user: User }) => {
  const [reviewCount, setReviewCount] = useState(0)
  const [shouldNotify, setShouldNotify] = useState(false)

  useEffect(() => {
    const checkReviewNeeded = async () => {
      const response = await fetch('/api/review/count')
      const { count, shouldNotify: notify } = await response.json()
      setReviewCount(count)
      setShouldNotify(notify)
    }
    
    checkReviewNeeded()
  }, [user])

  return (
    <Button variant="ghost" size="sm" className="relative">
      <Bell className="h-4 w-4" />
      {shouldNotify && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs animate-pulse"
        >
          {reviewCount > 99 ? '99+' : reviewCount}
        </Badge>
      )}
    </Button>
  )
}
```

### **B. プロフィールページ拡張**

#### **復習管理セクション**
```typescript
// app/profile/page.tsx 内
const ReviewManagementSection = ({ userId }: { userId: string }) => {
  const [reviewStats, setReviewStats] = useState(null)
  const [settings, setSettings] = useState(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <RotateCcw className="h-5 w-5" />
          <span>復習管理</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 復習統計 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-2xl font-bold text-orange-600">
              {reviewStats?.totalReviewNeeded || 0}
            </div>
            <div className="text-sm text-muted-foreground">復習推奨問題</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {reviewStats?.todayCompleted || 0}
            </div>
            <div className="text-sm text-muted-foreground">今日の復習完了</div>
          </div>
        </div>

        {/* 復習開始ボタン */}
        <Button 
          className="w-full" 
          onClick={() => router.push('/quiz?mode=review')}
          disabled={reviewStats?.totalReviewNeeded === 0}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          復習開始 ({reviewStats?.totalReviewNeeded || 0}問)
        </Button>

        {/* 復習設定 */}
        <div className="pt-4 border-t">
          <Label className="text-sm font-medium">復習通知設定</Label>
          <div className="space-y-2 mt-2">
            <div className="flex items-center space-x-2">
              <Switch
                checked={settings?.reviewNotificationEnabled}
                onCheckedChange={(checked) => updateReviewSettings({ enabled: checked })}
              />
              <span className="text-sm">復習通知を有効にする</span>
            </div>
            <div className="flex items-center space-x-2">
              <Label className="text-sm">通知間隔:</Label>
              <Select
                value={settings?.notificationInterval?.toString()}
                onValueChange={(value) => updateReviewSettings({ interval: parseInt(value) })}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1日</SelectItem>
                  <SelectItem value="3">3日</SelectItem>
                  <SelectItem value="7">7日</SelectItem>
                  <SelectItem value="14">14日</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

### **C. アナリティクス画面拡張**

```typescript
// app/analytics/page.tsx 内のタブに追加
const HintAndReviewAnalytics = ({ userId }: { userId: string }) => {
  return (
    <div className="space-y-6">
      {/* ヒント使用傾向分析 */}
      <Card>
        <CardHeader>
          <CardTitle>ヒント使用傾向</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* ヒント使用率グラフ */}
            <LineChart 
              data={hintUsageOverTime}
              xDataKey="date"
              yDataKey="hintUsageRate"
              title="ヒント使用率の推移"
            />
            
            {/* レベル別使用分布 */}
            <BarChart
              data={hintLevelDistribution}
              xDataKey="level"
              yDataKey="count"
              title="ヒントレベル別使用回数"
            />
          </div>
        </CardContent>
      </Card>

      {/* 復習効果分析 */}
      <Card>
        <CardHeader>
          <CardTitle>復習効果分析</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Before/After正解率比較 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500">
                  {reviewEffectStats.beforeAccuracy}%
                </div>
                <div className="text-sm text-muted-foreground">復習前正解率</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-500">
                  {reviewEffectStats.afterAccuracy}%
                </div>
                <div className="text-sm text-muted-foreground">復習後正解率</div>
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">
                +{reviewEffectStats.improvement}%
              </div>
              <div className="text-sm text-muted-foreground">正解率向上</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## 🛠️ **4. 管理者機能**

### **A. 問題メンテナンス画面**

#### **新規画面: `/admin/question-maintenance`**
```typescript
// app/admin/question-maintenance/page.tsx
const QuestionMaintenancePage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">クイズ問題メンテナンス</h1>
        <p className="text-muted-foreground">
          問題内容・ヒントの編集を行います（正解INDEX・ID・難易度は変更不可）
        </p>
      </div>

      {/* 問題検索・フィルター */}
      <Card>
        <CardHeader>
          <CardTitle>問題検索</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>カテゴリー</Label>
              <CategorySelect onValueChange={setCategoryFilter} />
            </div>
            <div>
              <Label>難易度</Label>
              <DifficultySelect onValueChange={setDifficultyFilter} />
            </div>
            <div>
              <Label>ヒント状態</Label>
              <Select onValueChange={setHintStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全て</SelectItem>
                  <SelectItem value="with_hints">ヒント有り</SelectItem>
                  <SelectItem value="without_hints">ヒント無し</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 問題一覧 */}
      <Card>
        <CardHeader>
          <CardTitle>問題一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={questionMaintenanceColumns}
            data={filteredQuestions}
            onRowClick={handleQuestionEdit}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// 問題編集モーダル
const QuestionEditModal = ({ question, isOpen, onClose }) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>問題編集 - ID: {question.id}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* 基本情報（編集不可項目の表示） */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
            <div>
              <Label className="text-sm font-medium text-gray-600">問題ID</Label>
              <div className="text-sm">{question.id}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">正解INDEX</Label>
              <div className="text-sm">{question.correct} (変更不可)</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">難易度</Label>
              <div className="text-sm">{question.difficulty} (変更不可)</div>
            </div>
          </div>

          {/* 編集可能フィールド */}
          <div className="space-y-4">
            <div>
              <Label>問題文</Label>
              <Textarea
                value={editData.question}
                onChange={(e) => setEditData({...editData, question: e.target.value})}
                rows={3}
              />
            </div>

            <div>
              <Label>選択肢</Label>
              {editData.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <Badge variant={index === question.correct ? "default" : "outline"}>
                    {String.fromCharCode(65 + index)}
                  </Badge>
                  <Input
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div>
              <Label>解説</Label>
              <Textarea
                value={editData.explanation}
                onChange={(e) => setEditData({...editData, explanation: e.target.value})}
                rows={3}
              />
            </div>
          </div>

          {/* ヒント編集セクション */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-medium">ヒント設定</Label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={generateHintsWithAI}
                disabled={isGeneratingHints}
              >
                {isGeneratingHints ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                AI生成
              </Button>
            </div>

            {[1, 2, 3].map(level => (
              <div key={level}>
                <Label>ヒント Level {level}</Label>
                <Textarea
                  value={hintData[`level${level}`] || ''}
                  onChange={(e) => setHintData({
                    ...hintData,
                    [`level${level}`]: e.target.value
                  })}
                  rows={2}
                  placeholder={`Level ${level}ヒントを入力...`}
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>キャンセル</Button>
          <Button onClick={handleSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

### **B. 既存問題への一括ヒント生成**

```typescript
// 管理者用一括ヒント生成スクリプト
const generateHintsForAllQuestions = async () => {
  // ヒント未設定の全問題取得
  const questionsWithoutHints = await supabaseAdmin
    .from('quiz_questions')
    .select('*')
    .not('id', 'in', 
      supabaseAdmin.from('quiz_hints').select('question_id')
    )
    .limit(100) // バッチ処理

  for (const question of questionsWithoutHints) {
    try {
      const hints = await generateHintsWithAI(question)
      await saveQuestionHints(question.id, hints)
      console.log(`✅ Generated hints for question ${question.id}`)
    } catch (error) {
      console.error(`❌ Failed to generate hints for question ${question.id}:`, error)
    }
    
    // API制限回避のため少し待機
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}
```

---

## 🚀 **5. 技術実装詳細**

### **A. 新規APIエンドポイント**

#### **ヒント取得API**
```typescript
// app/api/questions/[id]/hints/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: hints, error } = await supabaseAdmin
      .from('quiz_hints')
      .select('level1_hint, level2_hint, level3_hint')
      .eq('question_id', params.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({
      level1: hints?.level1_hint || null,
      level2: hints?.level2_hint || null,
      level3: hints?.level3_hint || null
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch hints' },
      { status: 500 }
    )
  }
}
```

#### **復習問題取得API**
```typescript
// app/api/review/questions/route.ts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const count = parseInt(searchParams.get('count') || '10')
    const userId = await getCurrentUserId(request)

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const reviewQuestions = await selectReviewQuestions(userId, count)
    
    return NextResponse.json({
      questions: reviewQuestions,
      totalAvailable: await getTotalReviewQuestionsCount(userId)
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch review questions' },
      { status: 500 }
    )
  }
}
```

#### **復習統計API**
```typescript
// app/api/review/stats/route.ts
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const stats = await calculateReviewStats(userId)
    
    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch review stats' },
      { status: 500 }
    )
  }
}

const calculateReviewStats = async (userId: string) => {
  // 復習必要問題数
  const totalReviewNeeded = await getTotalReviewQuestionsCount(userId)
  
  // 今日の復習完了数
  const todayCompleted = await getTodayReviewCompletedCount(userId)
  
  // 復習効果分析
  const reviewEffectiveness = await calculateReviewEffectiveness(userId)
  
  return {
    totalReviewNeeded,
    todayCompleted,
    reviewEffectiveness,
    lastCalculated: new Date().toISOString()
  }
}
```

### **B. データベース更新処理**

#### **quiz_answers更新ロジック**
```typescript
// app/api/xp-save/quiz/route.ts の拡張
const saveQuizAnswer = async (answerData: QuestionAnswer, sessionId: string) => {
  // 復習判定ロジック実行
  const isReviewNeeded = await determineReviewNeed(
    answerData.userId,
    answerData.questionId,
    answerData.isCorrect,
    answerData.responseTime,
    answerData.difficulty
  )

  const { data, error } = await supabaseAdmin
    .from('quiz_answers')
    .insert({
      session_id: sessionId,
      question_id: answerData.questionId,
      user_id: answerData.userId,
      selected_answer: answerData.selectedAnswer,
      is_correct: answerData.isCorrect,
      time_spent: answerData.responseTime,
      hint_used: answerData.maxHintLevel > 0, // ヒント使用フラグ
      review_needed: isReviewNeeded,         // 復習必要フラグ
      category_id: answerData.categoryId,
      subcategory_id: answerData.subcategoryId,
      difficulty: answerData.difficulty,
      earned_xp: answerData.earnedXP
    })

  return { data, error }
}

const determineReviewNeed = async (
  userId: string,
  questionId: string,
  isCorrect: boolean,
  responseTime: number,
  difficulty: string
): Promise<boolean> => {
  // 即座に復習推奨の条件
  if (!isCorrect) return true
  
  // 制限時間の80%以上使用で復習推奨
  const question = await getQuestion(questionId)
  if (responseTime > (question.timeLimit * 0.8 * 1000)) return true
  
  // 繰り返しミス判定
  const hasRepeatMistakes = await detectRepeatMistakes(
    userId, 
    question.subcategory_id, 
    difficulty
  )
  if (hasRepeatMistakes) return true
  
  return false
}
```

---

## 📊 **6. 実装スケジュール**

### **Phase 1: 基本機能実装（2-3週間）**

#### **Week 1: データベース・API基盤**
- [ ] quiz_hintsテーブル作成・マイグレーション
- [ ] xp_level_skp_settings拡張
- [ ] ヒント取得API実装
- [ ] 復習問題選定ロジック実装
- [ ] quiz_answers更新処理修正

#### **Week 2: UI基本機能**
- [ ] QuizCard.tsxヒント機能追加
- [ ] XP計算ペナルティロジック実装
- [ ] 復習クイズモード追加
- [ ] ホームページ復習パネル追加

#### **Week 3: 管理者機能**
- [ ] 問題メンテナンス画面作成
- [ ] AI ヒント生成API実装
- [ ] 一括ヒント生成スクリプト
- [ ] 基本テスト・デバッグ

### **Phase 2: AI統合・高度機能（2-3週間）**

#### **Week 4-5: AI・分析強化**
- [ ] 高度復習判定アルゴリズム実装
- [ ] 忘却曲線ベース分析
- [ ] カテゴリー別苦手分野分析
- [ ] ヘッダー通知システム実装

#### **Week 6: UI/UX改善**
- [ ] プロフィール復習設定追加
- [ ] アナリティクス画面拡張
- [ ] 復習効果測定・可視化
- [ ] 通知・アラート機能

### **Phase 3: 分析・最適化（1-2週間）**

#### **Week 7-8: 最終調整**
- [ ] パフォーマンス最適化
- [ ] ユーザビリティテスト
- [ ] 本番デプロイ・監視
- [ ] ドキュメント整備

---

## 🎯 **7. 成功指標・KPI**

### **ユーザー指標**
- **ヒント使用率**: 全クイズ回答の30%以下（過度な依存回避）
- **復習完了率**: 推奨された復習問題の70%以上完了
- **復習効果**: 復習後正解率+15%以上向上
- **継続学習率**: ヒント・復習機能使用者の継続率+10%向上

### **システム指標**
- **AI生成品質**: ヒント満足度4.0/5.0以上
- **レスポンス時間**: ヒント表示500ms以内
- **復習判定精度**: 85%以上の復習推奨が実際に効果的
- **データ整合性**: hint_used, review_needed フィールド100%活用

---

## 🔧 **8. 運用・監視**

### **監視項目**
- ヒント使用頻度・レベル分布
- 復習完了率・効果測定
- AI生成エラー率・品質
- システムパフォーマンス

### **メンテナンス**
- 週次：ヒント品質レビュー
- 月次：復習判定アルゴリズム調整
- 四半期：成功指標評価・改善計画

---

**実装開始準備完了** ✅  
本設計書に基づき、Phase 1から段階的に実装を開始することができます。