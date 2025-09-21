# 本番リリース前チェックリスト

**最終更新**: 2025-09-20
**プロジェクト状況**: TypeScript修正完了、カテゴリーDB移行進行中

## ❗ 重要：セキュリティ設定

### Row Level Security (RLS) の有効化

**🔍 確認済み**: Supabaseに**30個のテーブル**が存在。**19個が開発のためRLS無効化**されています。

**⚠️ 注意**: カテゴリー管理システムのデータ移行のため、**categories, subcategories, skill_levels** の3テーブルを追加でRLS無効化しました（2025-09-20）。

#### 1. 開発中RLS無効テーブルの本番前有効化（19個）

```sql
-- 🔧 現在RLS無効な19テーブルを本番前に有効化（必須）
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE detailed_quiz_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_card_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE wisdom_card_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE skp_transactions ENABLE ROW LEVEL SECURITY;
-- 🆕 カテゴリー管理システム（データ移行完了後に有効化）
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_levels ENABLE ROW LEVEL SECURITY;
```

#### 2. 既にRLS有効なテーブル（14個）

**✅ 状況**: 以下14テーブルは既にRLS有効で追加対応不要
```sql
-- 📋 既にセキュア設定済み（対応不要）
-- profiles, sessions, auth_users, public_users, content_items, 
-- courses, lessons, achievements, notifications, analytics, 
-- feedback, cards, question_categories, learning_paths
```

#### 3. 開発中のRLS一時無効化方法（参考用）

**⚠️ 開発環境でのみ使用可能**
```sql
-- 🔧 開発効率のためのRLS無効化（本番環境では絶対実行禁止）
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results DISABLE ROW LEVEL SECURITY;
ALTER TABLE detailed_quiz_data DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE category_progress DISABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_card_collection DISABLE ROW LEVEL SECURITY;
ALTER TABLE wisdom_card_collection DISABLE ROW LEVEL SECURITY;
ALTER TABLE skp_transactions DISABLE ROW LEVEL SECURITY;
-- 🆕 カテゴリー管理システム（データ移行時のみ無効化済み）
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories DISABLE ROW LEVEL SECURITY;
ALTER TABLE skill_levels DISABLE ROW LEVEL SECURITY;
```

#### 3. 既存12テーブルのセキュリティポリシー設定（本番前必須）

```sql
-- users テーブルのポリシー
CREATE POLICY "Users can manage own profile" ON users
  FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- quiz_results のポリシー
CREATE POLICY "Users can manage own quiz results" ON quiz_results
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- category_progress のポリシー (新規XPシステム用)
CREATE POLICY "Users can manage own category progress" ON category_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- detailed_quiz_data のポリシー
CREATE POLICY "Users can manage own detailed quiz data" ON detailed_quiz_data
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- skp_transactions のポリシー (新規SKPシステム用)
CREATE POLICY "Users can manage own SKP transactions" ON skp_transactions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- learning_sessions のポリシー
CREATE POLICY "Users can manage own sessions" ON learning_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- learning_progress のポリシー
CREATE POLICY "Users can manage own learning progress" ON learning_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_progress のポリシー
CREATE POLICY "Users can manage own progress" ON user_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_settings のポリシー
CREATE POLICY "Users can manage own settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_badges のポリシー
CREATE POLICY "Users can manage own badges" ON user_badges
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- knowledge_card_collection のポリシー
CREATE POLICY "Users can manage own knowledge cards" ON knowledge_card_collection
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- wisdom_card_collection のポリシー
CREATE POLICY "Users can manage own wisdom cards" ON wisdom_card_collection
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

#### 4. 動作確認手順

1. 上記SQLを実行
2. **基本機能の動作確認**：
   - [ ] ユーザー登録・ログイン・ログアウト
   - [ ] クイズ実行・結果保存
   - [ ] カード収集機能
   - [ ] コース学習・バッジ獲得
   - [ ] コレクションページ表示
   - [ ] 学習進捗保存

3. **✅ 完了済み - サブカテゴリーベースXPシステム**：
   - [x] チャレンジクイズでのサブカテゴリー別XP分配
   - [x] カテゴリー別クイズでのXP取得
   - [x] 業界カテゴリーレベルの正確な集計表示
   - [x] プロフィールページのレベル・XP表示
   - [x] SKP取引記録の正常な保存
   - [x] カテゴリー進捗データの正常な更新

4. **🆕 カテゴリー管理システム（Phase 2進行中）**：
   - [x] データベーススキーマ作成（categories, subcategories, skill_levels）
   - [x] スキルレベルマスターデータ初期化（4レベル）
   - [x] メインカテゴリーデータ移行（10カテゴリー）
   - [x] 業界カテゴリーデータ移行（3業界）
   - [ ] サブカテゴリーデータ移行（全サブカテゴリー）
   - [ ] 動的カテゴリー管理機能
   - [ ] 有効・無効制御機能
   - [ ] 管理者ダッシュボード
   - [ ] 新業界カテゴリー表示

#### 5. 全テーブルのRLS状態確認

```sql
-- 全テーブルのRLS状態を確認するクエリ
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  -- 既存12テーブル（本番前にRLS有効化必要）
  'users', 'quiz_results', 'category_progress', 'detailed_quiz_data', 
  'skp_transactions', 'learning_sessions', 'learning_progress', 
  'user_progress', 'user_settings', 'user_badges', 
  'knowledge_card_collection', 'wisdom_card_collection',
  -- 新規3テーブル（データ移行のため現在RLS無効、移行完了後に有効化予定）
  'categories', 'subcategories', 'skill_levels'
)
ORDER BY tablename;
```

**期待される結果**: 
- **現在（開発中）**: 既存16テーブル + 新規3テーブル = 19テーブルで `rowsecurity = false`
- **本番後**: 全19テーブルで `rowsecurity = true`

**⚠️ カテゴリー管理システム移行状況**:
- categories: データ移行完了（13件のカテゴリー）
- subcategories: データ移行進行中
- skill_levels: データ移行完了（4レベル）

#### 6. テストユーザー確認

**⚠️ 重要**: 開発中のテストユーザー `test@example.com` は実際のSupabaseに存在しません。

```typescript
// components/auth/AuthProvider.tsx 確認事項
// - テストユーザー機能は既に削除済み
// - 現在は通常のSupabase認証のみ使用
// - 疑似テストユーザーによる不安定動作は解決済み
```

**本番チェック項目**:
- [ ] テストユーザー関連コードが完全に削除されている
- [ ] 実際のSupabaseユーザーでの認証テストが完了している

#### 7. 問題発生時の対処

もしRLS有効化後に406エラーや403エラーが発生した場合：

1. ポリシーの再確認
2. auth.uid()が正しく動作しているか確認
3. テーブル構造とポリシーの整合性確認
4. 開発中に無効化したテーブルの見落としがないか確認
5. learning_progressテーブルが正しく作成・設定されているか確認

---

## その他の本番設定

### 環境変数の確認

- [ ] `NEXT_PUBLIC_SUPABASE_URL` が本番環境用に設定済み
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` が本番環境用に設定済み
- [ ] その他のSupabase設定が本番用に更新済み

### パフォーマンス最適化

- [ ] 画像の最適化
- [ ] バンドルサイズの確認
- [ ] キャッシュ設定の確認

### ユーザビリティ

- [ ] エラーハンドリングの最終確認
- [ ] ローディング表示の最適化
- [ ] レスポンシブデザインの確認

---

## 📋 機能追加・改善項目

### コード品質・型安全性の改善

- [x] **ESLint警告111件の解決** ✅ **完了 (2025-09-20)**
  - 未使用変数・imports削除 (@typescript-eslint/no-unused-vars: 60-70件)
  - React Hook依存関係最適化 (react-hooks/exhaustive-deps: 10-15件)
  - その他警告の修正 (25-35件)
  - **結果**: 0 errors, 0 warnings

- [x] **TypeScript型エラー126件の修正** ✅ **完了 (2025-09-20)**
  - 全app/コンポーネントの型安全性改善
  - any型の適切なキャスト・型定義
  - **結果**: Next.js buildが型チェック含めて完全成功

### カテゴリーページの機能拡張

- [ ] **カテゴリー詳細ページからの学習機能**
  - カテゴリー詳細ページから該当分野のクイズに直接アクセス
  - カテゴリー詳細ページから関連コース学習セッションに直接アクセス
  - 現在：概要・学習分野の表示のみ
  - 改善：実際の学習コンテンツへの導線追加

### 学習分析ページの機能追加

- [ ] **カテゴリー別統計の移行**
  - カテゴリーページから削除したクイズ消化率の表示
  - カテゴリー別の学習進捗詳細分析
  - カテゴリー別の学習時間統計

### データ管理システムの改善

- [x] **Supabaseクイズデータ移行** ✅ **完了済み**
  - ✅ Supabaseの`quiz_questions`テーブルでリアルタイム管理
  - ✅ `/api/questions` エンドポイントでSupabase API使用
  - ✅ `/public/questions.json`はフォールバック用に保持
  - **メリット**: デプロイなしでの問題追加・更新、自動バックアップ

- [ ] **🆕 カテゴリー管理システムのDB移行** 🚧 **進行中 (2025-09-20)**
  - 現在：`lib/categories.ts`での静的定義
  - 改善：Supabaseの`categories`/`subcategories`テーブルで動的管理
  - 新機能：有効・無効制御、管理者UI、業界カテゴリー段階的追加
  - 進捗：Phase 1 (DB設計) 完了、Phase 2 (データ移行) 進行中

### その他の改善項目

- [ ] 管理者ダッシュボード
- [ ] コース作成・編集機能
- [ ] SNS共有機能
- [ ] 通知システム
- [ ] モバイルアプリ対応

---

**📝 注意：このチェックリストは本番リリース時に必ず実行してください。**