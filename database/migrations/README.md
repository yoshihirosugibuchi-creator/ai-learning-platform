# データベースマイグレーション実行ガイド

## 📋 **実行手順**

### **Step 1: Supabase Dashboard でのスクリプト実行**

1. **Supabase Dashboard にアクセス**
   - URL: https://supabase.com/dashboard/projects
   - プロジェクト: `bddqkmnbbvllpvsynklr` を選択

2. **SQL Editor を開く**
   - 左サイドバー → `SQL Editor`
   - `New query` をクリック

3. **マイグレーションスクリプト実行**
   ```sql
   -- 20251030_quiz_ai_optimization_schema_changes.sql の内容をコピー＆ペースト
   -- 「Run」ボタンをクリックして実行
   ```

4. **実行結果確認**
   - エラーがないことを確認
   - 確認クエリセクションのコメントアウトを解除して実行

### **Step 2: 実行後の確認**

#### **新カラム確認**
```sql
-- quiz_answers.reviewed_at カラム確認
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'quiz_answers' AND column_name = 'reviewed_at';
```

#### **新テーブル確認**
```sql
-- review_settings テーブル構造確認
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'review_settings' 
ORDER BY ordinal_position;
```

#### **インデックス確認**
```sql
-- 新規インデックス確認
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('quiz_answers', 'review_settings')
  AND indexname LIKE '%review%';
```

#### **RLSポリシー確認**
```sql
-- review_settings のRLSポリシー確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'review_settings';
```

### **Step 3: database-types-official.ts 再生成**

マイグレーション完了後、型定義ファイルを再生成：

```bash
# プロジェクトルートで実行
cd /home/yoshi/projects/quiz-game-app/ai-learning-platform-next

# バックアップ作成
cp lib/database-types-official.ts lib/database-types-official-backup-$(date +%Y%m%d_%H%M%S).ts

# 型定義再生成
SUPABASE_ACCESS_TOKEN="$(grep 'sbp_' SUPABASE_ACCESS_TOKENS.md | cut -d'`' -f2 | head -1)" \
npx supabase gen types typescript --project-id bddqkmnbbvllpvsynklr > lib/database-types-official-new.ts

# エイリアス型保持・置き換え
# （詳細は CLAUDE.md の手順に従う）
```

---

## ⚠️ **注意事項**

### **実行前確認**
- [ ] 本番データベースへの影響を理解している
- [ ] 実行時間帯が適切（ユーザー影響最小限）
- [ ] バックアップ体制確認済み

### **実行中注意**
- [ ] エラーメッセージがないか確認
- [ ] 実行時間が想定範囲内
- [ ] 他の処理への影響がないか監視

### **実行後確認**
- [ ] 全ての新カラム・テーブルが作成済み
- [ ] インデックスが正常作成済み
- [ ] RLSポリシーが適用済み
- [ ] TypeScript型定義が最新

---

## 🔄 **ロールバック手順（緊急時のみ）**

問題が発生した場合のロールバック用SQL：

```sql
-- 緊急ロールバック（慎重に実行）
-- review_settings テーブル削除
DROP TABLE IF EXISTS review_settings;

-- 関数削除
DROP FUNCTION IF EXISTS update_review_settings_updated_at();

-- インデックス削除
DROP INDEX IF EXISTS idx_quiz_answers_review_lookup;
DROP INDEX IF EXISTS idx_quiz_answers_review_stats;

-- reviewed_at カラム削除（データ消失注意）
-- ALTER TABLE quiz_answers DROP COLUMN IF EXISTS reviewed_at;
```

⚠️ **警告**: ロールバックは既存データの消失を伴う可能性があります。実行前に十分な検討を行ってください。

---

## 📞 **トラブルシューティング**

### **よくある問題**

1. **権限エラー**
   - Supabase Dashboard の管理者権限確認
   - プロジェクトアクセス権限確認

2. **既存データとの競合**
   - `IF NOT EXISTS` により重複実行は安全
   - 既存データには影響なし

3. **型定義エラー**
   - database-types-official.ts 再生成必須
   - 既存エイリアス型の保持確認

### **サポート**
問題が発生した場合は、CLAUDE.md の手順に従って対処してください。

---

**マイグレーション準備完了** ✅  
*上記手順に従ってSupabase Dashboardでスクリプトを実行してください。*