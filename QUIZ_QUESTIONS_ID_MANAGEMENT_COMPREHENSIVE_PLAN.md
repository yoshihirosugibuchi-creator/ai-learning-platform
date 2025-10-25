# Quiz Questions ID管理システム包括的修正計画

**作成日**: 2025年10月16日  
**目的**: quiz_questions ID管理問題の根本解決と再発防止  
**重要度**: 🚨 CRITICAL - システム全体の参照整合性に関わる根本修正  

---

## 📊 **問題の全体把握**

### **発見された根本問題**

#### **問題1: ID参照の不整合**
- **現状**: quiz_answersがlegacy_idを参照（371, 370, 365等）
- **原因**: `/api/questions/route.ts:26` で `id: dbRow.legacy_id` と設定
- **影響**: quiz_answersとquiz_questionsの参照が論理的に不正

#### **問題2: CSV取込のデグレ**
- **現状**: `/app/admin/quiz-management/page.tsx:295` がJSON APIを呼び出し
- **原因**: `/app/settings/quiz-csv/page.tsx`（DB API使用）が削除され、JSON更新に退化
- **影響**: CSV取込がDBに反映されない

### **詳細調査結果**

#### **データフロー追跡結果**
```
1. /api/questions → id: dbRow.legacy_id (❌ 問題の根源)
2. QuizSession → currentQuestion.id.toString() 
3. quiz_answers → legacy_idが保存される (❌ 参照不整合)
```

#### **影響範囲特定結果**
- **quiz_answers**: question_id (string) - 唯一のID書き込みテーブル
- **get_question_history_stats**: 読み取り専用関数（念のため確認対象）
- **JSON同期**: legacy_idをidとして使用（設計確認必要）

---

## 🎯 **修正方針**

### **ID管理の基本設計**
- **quiz_questions.id**: 永続的SERIAL番号（システム内参照用）
- **quiz_questions.legacy_id**: 表示・ソート用管理番号
- **参照ルール**: quiz_answersは必ずidで紐づけ（legacy_id使用禁止）

### **データ移行方針**
- **quiz_questions**: delete_flag=trueを除外して新テーブル作成
- **quiz_answers**: 修正完了後に全ユーザーデータ削除（履歴クリア）
- **JSON**: id, legacy_id両方含む新形式検討

---

## 📋 **修正作業計画**

### **Phase 1: データ基盤修正**

#### **Task 1-1: quiz_questionsデータ作り直し**
```sql
-- 1. 有効データのバックアップ
CREATE TABLE quiz_questions_backup AS 
SELECT * FROM quiz_questions WHERE is_deleted = false;

-- 2. テーブル再作成（IDリセット）
TRUNCATE quiz_questions RESTART IDENTITY;

-- 3. 有効データの再投入
INSERT INTO quiz_questions (legacy_id, category_id, ...) 
SELECT legacy_id, category_id, ... FROM quiz_questions_backup;
```

#### **Task 1-2: ID参照修正**
```typescript
// /app/api/questions/route.ts:26
- id: dbRow.legacy_id as number,
+ id: dbRow.id as number,

// /app/api/admin/questions/db/route.ts:31  
- id: row.legacy_id,
+ id: row.id,
```

#### **Task 1-3: get_question_history_stats確認**
- 関数内でのquestion_id参照方式確認
- 必要に応じてid参照に修正

### **Phase 2: CSV・JSON機能修正**

#### **Task 2-1: CSV取込のDB API修正（デグレ解決）**
```typescript
// /app/admin/quiz-management/page.tsx:295
- const response = await fetch('/api/admin/questions', {
+ const response = await fetch('/api/admin/questions/db', {
```

#### **Task 2-2: CSV出力・取込でのID管理**
- **出力**: id, legacy_id両方をCSVに含める
- **取込**: idによるUPSERT（一括削除・更新の廃止）
- **競合解決**: legacy_idではなくidベースに変更

#### **Task 2-3: JSON形式の見直し**
```json
// 新JSON形式案
{
  "questions": [
    {
      "id": 123,           // quiz_questions.id (システム参照用)
      "legacy_id": 456,    // quiz_questions.legacy_id (表示・ソート用)
      "question": "...",
      ...
    }
  ]
}
```

### **Phase 3: 同期・検証**

#### **Task 3-1: DB→JSON同期処理検証**
- 新形式でのJSON生成確認
- フォールバック機能の動作確認
- id/legacy_id両方の正しい設定確認

#### **Task 3-2: 全データ削除・初期化**
```sql
-- 修正完了後実行
DELETE FROM quiz_answers;  -- 全ユーザー回答履歴削除
-- その他ユーザー学習データの初期化
```

---

## 🛡️ **再発防止策（問題2対応）**

### **1. 重要API変更の検出システム**

#### **A. コードレビューチェックリスト**
**場所**: 新規作成 `docs/CODE_REVIEW_CHECKLIST.md`

```markdown
## 管理機能修正時の必須チェック項目

### API変更チェック
- [ ] `/api/admin/*` パスの変更有無
- [ ] DB更新 ⇔ JSON更新の変更有無  
- [ ] 変更理由の明記
- [ ] 影響範囲の説明

### CSV・データ管理機能
- [ ] CSV取込がDB反映されることの確認
- [ ] JSON同期処理への影響確認
- [ ] 参照整合性への影響確認
```

#### **B. CLAUDE.md追記**
```markdown
## 🚨 重要API修正時の必須確認事項

### 管理系API (`/api/admin/*`) 修正時
1. **DB更新とJSON更新の明確な区別**
   - `/api/admin/questions` → JSON更新専用
   - `/api/admin/questions/db` → DB更新専用
   - 用途を混同しない

2. **CSV取込機能**
   - 必ず `/api/admin/questions/db` を使用
   - JSON更新への変更は原則禁止

3. **ID参照ルール**
   - quiz_answersは quiz_questions.id で参照
   - legacy_id使用は表示・ソート目的のみ
```

### **2. 自動テスト強化**

#### **統合テスト追加**
```typescript
// tests/integration/csv-import.test.ts
describe('CSV Import Integration', () => {
  test('CSV取込がDBに正しく反映される', async () => {
    // CSV取込実行
    // DB変更確認
    // JSON同期確認
  })
  
  test('ID参照の整合性確認', async () => {
    // クイズ回答実行
    // quiz_answers.question_id確認
    // quiz_questions.id との一致確認
  })
})
```

### **3. Claude作業時の意識化システム**

#### **CLAUDE.md 作業前チェック追加**
```markdown
## 🔄 作業開始前必須確認（Claude向け）

### 管理機能・API修正時
- [ ] 影響範囲分析（Step 1-3）実行済み
- [ ] `/api/admin/*` 変更時は上記チェックリスト確認
- [ ] DB更新⇔JSON更新の明確化
- [ ] CSV機能への影響確認

### ID・参照関係修正時  
- [ ] quiz_questions.id vs legacy_id の用途確認
- [ ] quiz_answers参照整合性の確認
- [ ] 既存データへの影響評価
```

---

## 📝 **開発ルール策定**

### **ID管理基本ルール**
**記録場所**: `CLAUDE.md` および `docs/DEVELOPMENT_GUIDELINES.md`

```markdown
## Quiz Questions ID管理ルール

### 基本原則
1. **quiz_questions.id**: システム内参照専用（不変）
2. **quiz_questions.legacy_id**: 表示・ソート専用（変更可）
3. **quiz_answers.question_id**: 必ずquiz_questions.idを参照

### 禁止事項
- quiz_answersでlegacy_id参照
- 混在参照（一部id、一部legacy_id）
- 参照ルール例外の作成

### API設計ルール
- `/api/questions` → idベース返却
- `/api/admin/questions/db` → DB操作専用
- `/api/admin/questions` → JSON操作専用（用途限定）
```

---

## 🗓️ **実装スケジュール**

### **Week 1: データ基盤修正**
- [ ] quiz_questionsデータ作り直し
- [ ] ID参照修正（API 2箇所）
- [ ] get_question_history_stats確認・修正

### **Week 2: CSV・JSON機能修正**  
- [ ] CSV取込デグレ修正
- [ ] CSV出力でのid/legacy_id追加
- [ ] JSON形式見直し・同期確認

### **Week 3: 検証・データ初期化**
- [ ] 統合テスト実行
- [ ] 全ユーザーデータ削除
- [ ] 本番環境での動作確認

### **Week 4: 再発防止策実装**
- [ ] チェックリスト作成
- [ ] CLAUDE.md更新
- [ ] 開発ガイドライン策定

---

## ⚠️ **リスク管理**

### **高リスク作業**
1. **quiz_questionsテーブル再作成**
   - 影響: 全クイズ機能停止
   - 対策: 段階的移行とロールバック準備

2. **全ユーザーデータ削除**
   - 影響: 学習履歴消失
   - 対策: 事前告知とバックアップ

### **中リスク作業**
3. **API参照修正**
   - 影響: 一時的な参照エラー
   - 対策: 段階的デプロイと監視

### **低リスク作業**
4. **CSV機能修正**
   - 影響: 管理機能のみ
   - 対策: 事前テストで十分

---

## 📊 **成功指標**

### **技術指標**
- [ ] quiz_answers.question_id がすべてquiz_questions.id と一致
- [ ] CSV取込がDBに正しく反映される
- [ ] JSON同期でid/legacy_id両方が正しく出力される
- [ ] 統合テストが100%パス

### **運用指標**  
- [ ] 管理者がCSV取込を正常に実行できる
- [ ] クイズ機能が正常に動作する
- [ ] 新しい問題追加・編集が正常に動作する

---

## 🔄 **継続監視**

### **定期確認項目**
- ID参照整合性の確認（月次）
- CSV取込機能の動作確認（リリース時）
- 新機能追加時のID管理ルール遵守確認

### **アラート設定**
- quiz_answers.question_id参照エラー
- CSV取込失敗
- JSON同期エラー

---

*この計画書は実装中の発見事項により継続的に更新されます。重要な変更は必ず記録し、関係者に共有してください。*

**最終更新**: 2025年10月16日  
**次回見直し**: 実装完了後