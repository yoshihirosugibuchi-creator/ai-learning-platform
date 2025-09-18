# 本番リリース前チェックリスト

## ❗ 重要：セキュリティ設定

### Row Level Security (RLS) の有効化

現在開発効率のためRLSが**全12テーブル**で無効化されています。**本番リリース前に必ず以下を実行してください。**

#### 1. 全テーブルでRLSの有効化

```sql
-- 全12テーブルのRLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE detailed_quiz_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE skp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_card_collection ENABLE ROW LEVEL SECURITY;
ALTER TABLE wisdom_card_collection ENABLE ROW LEVEL SECURITY;
```

**⚠️ 重要**: 開発中は上記**全12テーブル**のRLSが無効化されています。

#### 2. 全12テーブルのセキュリティポリシー設定

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

#### 3. 動作確認手順

1. 上記SQLを実行
2. **基本機能の動作確認**：
   - [ ] ユーザー登録・ログイン・ログアウト
   - [ ] クイズ実行・結果保存
   - [ ] カード収集機能
   - [ ] コース学習・バッジ獲得
   - [ ] コレクションページ表示
   - [ ] 学習進捗保存

3. **🆕 サブカテゴリーベースXPシステムの動作確認**：
   - [ ] チャレンジクイズでのサブカテゴリー別XP分配
   - [ ] カテゴリー別クイズでのXP取得
   - [ ] 業界カテゴリーレベルの正確な集計表示
   - [ ] プロフィールページのレベル・XP表示
   - [ ] SKP取引記録の正常な保存
   - [ ] カテゴリー進捗データの正常な更新

#### 4. 開発中に無効化されたテーブルの確認

本番リリース前に、開発中にRLSを無効化した**全12テーブル**のRLS状態を確認：

```sql
-- 全12テーブルのRLS状態を確認するクエリ
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'users', 'quiz_results', 'category_progress', 'detailed_quiz_data', 
  'skp_transactions', 'learning_sessions', 'learning_progress', 
  'user_progress', 'user_settings', 'user_badges', 
  'knowledge_card_collection', 'wisdom_card_collection'
)
ORDER BY tablename;
```

**期待される結果**: 全テーブルで `rowsecurity = true` であること。

#### 5. 開発モードの無効化

本番環境では開発用のテストユーザー機能を無効化：

```typescript
// components/auth/AuthProvider.tsx で以下をコメントアウト
// Development mode: Allow test login
if (email === 'test@example.com' && password === 'test123') {
  // この部分をコメントアウトまたは削除
}
```

#### 5. 問題発生時の対処

もしRLS有効化後に406エラーや403エラーが発生した場合：

1. ポリシーの再確認
2. auth.uid()が正しく動作しているか確認
3. テーブル構造とポリシーの整合性確認
4. 開発中に無効化したテーブルの見落としがないか確認

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

- [ ] **Supabaseクイズデータ移行**
  - 現在：ローカルJSONファイル（`/public/questions.json`）での問題管理
  - 課題：CSV更新後のデプロイ必須、リアルタイム更新不可
  - 改善：Supabaseのquestionsテーブルに移行してリアルタイム更新対応
  - API：`/api/admin/questions` を Supabase API に変更
  - メリット：デプロイなしでの問題追加・更新、バックアップ自動化、スケーラビリティ

### その他の改善項目

- [ ] 管理者ダッシュボード
- [ ] コース作成・編集機能
- [ ] SNS共有機能
- [ ] 通知システム
- [ ] モバイルアプリ対応

---

**📝 注意：このチェックリストは本番リリース時に必ず実行してください。**