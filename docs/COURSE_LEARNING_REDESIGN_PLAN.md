# コース学習システム再設計・実装計画書

**作成日**: 2025年10月12日  
**作成者**: Claude AI Assistant  
**目的**: コース学習システムの根本的再設計による複雑性解消とデータ整合性確保

---

## 🎯 **1. 設計方針**

### **完了判定方式: セッション数ベース**
```typescript
// ✅ 採用する方式
セッション完了率 = 完了セッション数 / 総セッション数
コース完了条件 = セッション完了率 === 100%

// 理由:
// - テーマ3/4完了でも残りテーマに2セッションあれば、実際にはコース未完了
// - セッション数（最大100）での直接判定が効率的
// - コース表示時に既に取得する情報で判定可能
```

### **データソース統一**
```typescript
// ✅ 唯一のデータソース
course_session_completions (is_first_completion=true) 
    ↓ 集計
テーマ完了判定 → ナレッジカード表示
    ↓ 集計  
コース完了判定 → 修了証表示

// ❌ 廃止するソース
user_settings (lp_*) - 学習進捗管理から除外
learning_progress - テーブル削除対象
```

---

## 🔍 **2. 現状分析**

### **2.1 learning_progress 参照箇所**

#### **実コード使用箇所**:
| ファイル | 用途 | 影響度 |
|---------|------|--------|
| `lib/supabase-learning.ts` | INSERT/SELECT/UPDATE | 🔴 高 |
| `lib/supabase-badges.ts` | テーブル存在確認 | 🟡 中 |
| `app/api/admin/reset-*-data/route.ts` | データ削除API | 🟡 中 |
| `app/api/admin/reset-course-progress/route.ts` | コース進捗削除 | 🟡 中 |

#### **影響を受ける機能**:
1. **学習セッション記録**: `saveLearningSession()` 
2. **学習履歴取得**: `getUserLearningSessions()`
3. **セッション更新**: `updateLearningSession()`
4. **管理系削除API**: 全4箇所

### **2.2 user_settings (lp_*) 参照箇所**

#### **実コード使用箇所**:
| ファイル | 用途 | 影響度 |
|---------|------|--------|
| `app/api/xp-save/course/route.ts` | 初回完了判定 | 🔴 高 |
| `components/learning/LearningSession.tsx` | 進捗保存 | 🔴 高 |
| `app/learning/[courseId]/page.tsx` | 開始/復習判定 | 🔴 高 |

---

## 🗃️ **3. バックアップ戦略**

### **3.1 データベースバックアップ**

#### **重要テーブル（必須バックアップ）**:
```sql
-- セッション・進捗関連
course_session_completions (116件)
course_theme_completions (15件) 
course_completions (0件)
learning_progress (データあり)
user_settings (lp_* キー)

-- 統計・XP関連
user_xp_stats_v2 (3件)
user_category_xp_stats_v2 
user_subcategory_xp_stats_v2
daily_xp_records

-- その他連携テーブル
quiz_answers, quiz_sessions
knowledge_card_collection, user_badges
skp_transactions
```

#### **バックアップコマンド**:
```bash
# 実装前フルバックアップ
curl -X POST "http://localhost:3000/api/admin/backup-database" \
  -H "Content-Type: application/json" \
  -d '{"backup_type": "course_redesign_pre", "description": "コース学習再設計前バックアップ"}'
```

### **3.2 ファイルバックアップ**

#### **修正対象ファイル**:
```bash
# コアロジック
app/api/xp-save/course/route.ts
lib/supabase-learning.ts
components/learning/LearningSession.tsx
app/learning/[courseId]/page.tsx

# データベース関連
lib/database-types-official.ts
database/ (マイグレーションファイル)

# 影響を受ける管理API
app/api/admin/reset-*-data/route.ts
```

### **3.3 設定ファイルバックアップ**
```bash
# 環境・設定
.env.local
CLAUDE.md
package.json (依存関係変更時)
```

---

## 🔄 **4. 段階的実装計画**

### **Phase 1: 準備・バックアップ (1日)**
1. ✅ 設計文書作成・レビュー
2. ⏳ フルデータベースバックアップ実行
3. ⏳ 重要ファイルのバックアップ作成
4. ⏳ テスト環境での動作確認

### **Phase 2: テーブル構造変更 (0.5日)**
1. ⏳ `course_session_completions.duration_seconds` 追加
2. ⏳ 必要インデックス追加
3. ⏳ database-types-official.ts 再生成

### **Phase 3: コア機能実装 (1.5日)**
1. ⏳ `app/api/xp-save/course/route.ts` 完全書き換え
   - `user_settings` 依存除去
   - `learning_progress` 更新除去
   - セッション数ベース完了判定実装
2. ⏳ `app/learning/[courseId]/page.tsx` 修正
   - `course_session_completions` ベース判定
   - `user_settings` 参照除去
3. ⏳ `components/learning/LearningSession.tsx` 修正
   - 進捗保存ロジック削除
   - 完了判定ロジック簡素化

### **Phase 4: 代替機能実装 (1日)**
1. ⏳ `lib/supabase-learning.ts` 書き換え
   - `learning_progress` → `course_session_completions` 移行
   - 新API関数実装
2. ⏳ 管理API修正 (4ファイル)
   - 削除対象テーブル変更
   - 新テーブル構造対応

### **Phase 5: テスト・検証 (1日)**
1. ⏳ 全機能動作テスト
2. ⏳ データ整合性確認
3. ⏳ パフォーマンステスト
4. ⏳ UI/UX確認

### **Phase 6: クリーンアップ (0.5日)**
1. ⏳ `user_settings` コース学習データ削除
2. ⏳ `learning_progress` テーブル削除
3. ⏳ 最終動作確認

---

## 📋 **5. 詳細技術仕様**

### **5.1 新しいコース完了判定ロジック**

#### **現在のコース表示時（③）**:
```typescript
// ✅ 新実装
const { data: completions } = await supabase
  .from('course_session_completions')
  .select('session_id, theme_id, genre_id, is_first_completion')
  .eq('user_id', userId)
  .eq('course_id', courseId)
  .eq('is_first_completion', true)

// セッション別: 開始/復習判定
const sessionStatus = sessions.map(session => ({
  ...session,
  isCompleted: completions.some(c => c.session_id === session.id),
  buttonType: completions.some(c => c.session_id === session.id) ? 'review' : 'start'
}))

// テーマ別: ナレッジカード表示判定
const themeStatus = themes.map(theme => {
  const themeCompletions = completions.filter(c => c.theme_id === theme.id)
  const themeSessions = sessions.filter(s => s.theme_id === theme.id)
  return {
    ...theme,
    completionRate: themeCompletions.length / themeSessions.length,
    isCompleted: themeCompletions.length === themeSessions.length,
    showCard: themeCompletions.length === themeSessions.length
  }
})

// コース全体: 修了証表示判定
const totalSessions = sessions.length
const totalCompletions = completions.length
const courseCompletionRate = totalCompletions / totalSessions
const showCertificate = courseCompletionRate === 1.0
```

#### **セッション完了時（⑪）**:
```typescript
// ✅ 新実装（初回完了時のみ）
if (isFirstCompletion) {
  // 1. course_session_completions INSERT (現在と同じ)
  await supabase.from('course_session_completions').insert(sessionData)
  
  // 2. テーマ完了判定（セッション数ベース）
  const themeCompletions = await getThemeCompletions(userId, courseId, themeId)
  const themeSessions = await getThemeSessions(themeId)
  const themeCompleted = themeCompletions.length + 1 >= themeSessions.length // +1は今回分
  
  if (themeCompleted) {
    // course_theme_completions INSERT
    // knowledge_card_collection INSERT
  }
  
  // 3. コース完了判定（セッション数ベース）
  const courseCompletions = await getCourseCompletions(userId, courseId)
  const courseSessions = await getCourseSessions(courseId)
  const courseCompleted = courseCompletions.length + 1 >= courseSessions.length // +1は今回分
  
  if (courseCompleted) {
    // course_completions INSERT
    // user_badges INSERT
  }
}
```

### **5.2 duration_seconds追加**

#### **テーブル変更**:
```sql
-- course_session_completions
ALTER TABLE course_session_completions 
ADD COLUMN duration_seconds INTEGER;

-- インデックス追加
CREATE INDEX idx_course_session_completions_user_course_first 
ON course_session_completions(user_id, course_id, is_first_completion);
```

#### **記録タイミング**:
```typescript
// ④開始 → ⑩完了 の時間を記録
const startTime = new Date() // ④
const endTime = new Date()   // ⑩
const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)
```

---

## ⚠️ **6. リスク・注意事項**

### **6.1 データ損失リスク**
- **対策**: 完全バックアップ + 段階的移行
- **ロールバック計画**: 各Phase完了時にチェックポイント作成

### **6.2 ダウンタイムリスク**
- **対策**: 新機能並行実装 → 切り替え → 旧機能削除
- **影響**: 最小限（数分程度の切り替え時間のみ）

### **6.3 データ整合性リスク**
- **対策**: 
  - 移行前後のデータ数突合
  - 統計情報の再計算・検証
  - ユーザー別データ整合性チェック

### **6.4 パフォーマンスリスク**
- **対策**: 
  - 適切なインデックス設計
  - クエリ最適化
  - N+1問題の回避

---

## ✅ **7. 成功基準**

### **7.1 機能要件**
- [ ] コース表示: 開始/復習ボタン正確表示
- [ ] テーマ完了: ナレッジカード適切表示・非表示
- [ ] コース完了: 修了証適切表示・非表示  
- [ ] セッション記録: 正確な時間・状態記録
- [ ] 復習機能: 完了判定に影響しない正常動作

### **7.2 非機能要件**
- [ ] 応答速度: コース表示2秒以内
- [ ] データ整合性: 100%（移行前後突合）
- [ ] 可用性: 99.9%（ダウンタイム最小化）

### **7.3 品質要件**
- [ ] TypeScript: エラー0個
- [ ] ESLint: エラー0個  
- [ ] ビルド: 成功
- [ ] テストカバレッジ: 主要パス100%

---

## 📞 **8. 次のアクション**

### **immediate (今すぐ)**
1. **設計レビュー**: この計画書の内容確認・承認
2. **バックアップ実行**: データ保護の確実実行

### **Phase 1開始条件**
- ✅ 設計承認
- ✅ バックアップ完了確認
- ✅ 開発環境準備完了

---

**レビュー完了後、Phase 1から実装開始**