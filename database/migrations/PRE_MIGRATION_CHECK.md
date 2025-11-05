# UnifiedQuizType統一 - マイグレーション前チェック

## 📋 実行前必須確認事項

### 1. 現在のデータ確認
```sql
-- 既存quiz_typeの分布確認
SELECT quiz_type, COUNT(*) FROM quiz_sessions GROUP BY quiz_type;

-- 既存quiz_modeの分布確認  
SELECT quiz_mode, COUNT(*) FROM quiz_sessions GROUP BY quiz_mode;

-- 最新10件のレコード確認
SELECT id, quiz_type, quiz_mode, created_at FROM quiz_sessions ORDER BY created_at DESC LIMIT 10;
```

### 2. リスク評価

**LOW RISK:**
- ✅ quiz_type更新: 'main' → 'business-ai' (論理的に同じ意味)
- ✅ CHECK制約追加: 新しいデータの品質保証
- ✅ TypeScript側は既に対応済み

**MEDIUM RISK:**
- ⚠️ quiz_modeカラム削除: 既存アプリケーションでの参照がないことを確認済み

### 3. ロールバック計画
```sql
-- 緊急時ロールバック用SQL
-- Step 1: CHECK制約削除
ALTER TABLE quiz_sessions DROP CONSTRAINT IF EXISTS quiz_sessions_quiz_type_check;

-- Step 2: quiz_modeカラム復活（必要に応じて）
ALTER TABLE quiz_sessions ADD COLUMN quiz_mode TEXT;

-- Step 3: データ復元
UPDATE quiz_sessions SET quiz_type = 'main' WHERE quiz_type = 'business-ai';
```

### 4. 実行後確認
```sql
-- 制約確認
\d quiz_sessions

-- データ確認
SELECT DISTINCT quiz_type FROM quiz_sessions;
SELECT COUNT(*) FROM quiz_sessions WHERE quiz_type = 'business-ai';
```

## ✅ 実行準備完了チェックリスト
- [ ] データベースバックアップ取得済み
- [ ] TypeScript側UnifiedQuizType対応完了確認
- [ ] アプリケーション側quiz_mode参照削除確認
- [ ] ロールバック手順理解済み

**実行タイミング**: 低トラフィック時間帯推奨