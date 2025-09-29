# ユーザー学習データリセット手順書

## 概要
特定ユーザーの学習履歴・進捗データを完全削除し、アカウント情報（プロファイル）は保持する手順書です。
テスト環境でのデータリセット、バッジ授与テスト、学習進捗リセットなどに使用します。

## 対象データ

### ✅ 削除対象（19テーブル）
| カテゴリ | テーブル名 | 説明 |
|---------|-----------|------|
| **学習進捗系** | learning_progress | 学習進捗記録 |
| | course_session_completions | コースセッション完了履歴 |
| | course_theme_completions | コーステーマ完了履歴 |
| | course_completions | コース完了記録 |
| | category_progress | カテゴリ進捗 |
| | user_progress | ユーザー進捗 |
| **クイズ系** | quiz_sessions | クイズセッション履歴 |
| | quiz_answers | クイズ回答詳細（quiz_sessions削除時に自動削除） |
| | quiz_results | クイズ結果 |
| | detailed_quiz_data | 詳細クイズデータ |
| **XP・統計系** | user_xp_stats | XP統計（v1） |
| | user_xp_stats_v2 | XP統計（v2） |
| | user_category_xp_stats | カテゴリ別XP統計（v1） |
| | user_category_xp_stats_v2 | カテゴリ別XP統計（v2） |
| | user_subcategory_xp_stats | サブカテゴリ別XP統計（v1） |
| | user_subcategory_xp_stats_v2 | サブカテゴリ別XP統計（v2） |
| | daily_xp_records | 日別XP記録・連続学習日数 |
| **その他** | skp_transactions | SKP取引履歴 |
| | user_badges | 獲得バッジ |
| | knowledge_card_collection | ナレッジカード収集 |
| | wisdom_card_collection | 格言カード収集 |
| | user_settings | ユーザー設定・パーソナライゼーション |

### ❌ 保持対象
| テーブル名 | 説明 | 理由 |
|-----------|------|------|
| users | アカウント情報・プロファイル | 再入力を避けるため |
| learning_sessions | 学習コンテンツ定義 | 静的データ |

## 実行方法

### 方法1: 強制リセットAPI（最も確実・推奨）

```bash
# サービスロールキー使用・RLSバイパス・最も確実
curl -X POST http://localhost:3001/api/admin/force-reset \
  -H "Content-Type: application/json" \
  -d '{"userId": "ユーザーID"}'
```

**メリット：**
- RLSバイパスで確実にデータ削除
- 20テーブル対応（v1/v2両方）
- 詳細な検証レポート付き
- ブラウザキャッシュに影響されない

### 方法2: 通常のリセットAPI

```bash
# 開発サーバー起動状態で実行
curl -X POST http://localhost:3001/api/admin/reset-user-data \
  -H "Content-Type: application/json" \
  -d '{"userId": "ユーザーID"}'
```

**メリット：**
- エラーハンドリング付き
- 削除結果の詳細レポート
- 安全性が高い

### 方法3: SQLファイル直接実行

1. **SQLファイル準備**
   ```bash
   # database/reset-user-learning-data.sql をコピー
   cp database/reset-user-learning-data.sql /tmp/reset-user-data.sql
   ```

2. **ユーザーID置換**
   ```bash
   # USER_ID_PLACEHOLDERを実際のユーザーIDに置換
   sed -i 's/USER_ID_PLACEHOLDER/2a4849d1-7d6f-401b-bc75-4e9418e75c07/g' /tmp/reset-user-data.sql
   ```

3. **Supabaseで実行**
   - Supabase Dashboard → SQL Editor
   - `/tmp/reset-user-data.sql`の内容をペースト
   - 実行

### 方法4: Node.jsスクリプト

```bash
# scripts/reset-current-user.js を使用
node scripts/reset-current-user.js "ユーザーID"
```

## 実行前チェックリスト

- [ ] 対象ユーザーIDの確認
- [ ] バックアップが不要であることの確認
- [ ] 開発環境での実行であることの確認（本番環境では実行しない）

## 実行後確認事項

### 1. 強制リセットAPI（方法1）の場合
レスポンスで以下を確認：
```json
{
  "success": true,
  "deletedTables": ["learning_progress", "user_badges", ...],
  "verification": {"user_xp_stats_v2": 0, "daily_xp_records": 0, ...},
  "errors": ["category_xp_stats: Could not find table..."]
}
```
- `verification`で全テーブルのカウントが0であることを確認
- `category_xp_stats`のエラーは正常（テーブルが存在しないため）

### 2. 通常リセットAPI（方法2）の場合
レスポンスで以下を確認：
```json
{
  "success": true,
  "deletedTables": ["learning_progress", "user_badges", ...],
  "errors": null
}
```

### 3. SQL直接実行の場合
最後のSELECT文で全テーブルのカウントが0になることを確認

### 4. アプリケーション動作確認（重要）

⚠️ **ブラウザキャッシュ問題に注意**

データリセット後は**必ず**以下のいずれかを実行：

#### A. 新しいシークレット/プライベートウィンドウ（推奨）
1. 新しいシークレット/プライベートウィンドウを開く
2. `http://localhost:3001` でアクセス
3. ログイン
4. XP=0, SKP=0, レベル=1 であることを確認

#### B. 完全キャッシュクリア
1. `Ctrl+Shift+Delete` (Chrome/Edge) または `Cmd+Shift+Delete` (Mac)
2. **すべての期間** を選択
3. **すべてのアイテム** を選択（Cookie、キャッシュ、サイトデータ、履歴）
4. 削除実行
5. ブラウザ再起動
6. 再ログイン

#### C. ブラウザ完全再起動
1. ブラウザを完全に閉じる
2. ブラウザを再起動
3. 再ログイン

### 5. 正常なリセット確認項目
- [ ] XP: 0
- [ ] SKP: 0  
- [ ] レベル: 1
- [ ] 連続学習日数: 0
- [ ] バッジ: なし
- [ ] カテゴリー統計: なし
- [ ] 学習履歴: なし
- [ ] プロファイル情報: 保持されている

## 使用ケース

### 1. バッジ授与テスト
```bash
# 1. 強制データリセット
curl -X POST http://localhost:3001/api/admin/force-reset \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id"}'

# 2. ブラウザをシークレットモードで再起動
# 3. コース学習実行
# 4. バッジ授与エラーの詳細確認
```

### 2. 学習進捗リセット
- 連続学習日数のリセット
- XP・レベルの初期化
- カード収集の初期化

### 3. パーソナライゼーション初期化
- クイズ設定のリセット
- 問題記憶強度の初期化
- 学習効率データの初期化

## 注意事項

⚠️ **重要な注意点**
- **本番環境では実行しない**
- **ユーザーIDの確認を必ず行う**
- **削除は取り消せない**
- **アカウント情報は保持される**

⚠️ **関連する影響**
- SKP残高も削除される
- 学習統計も削除される
- 獲得バッジも削除される

## トラブルシューティング

### ❌ 問題: データリセット後もXP/SKPが表示される
**原因：** ブラウザキャッシュ・セッション問題  
**対処法：** 
1. **シークレット/プライベートウィンドウで再開**（最も確実）
2. 完全キャッシュクリア + ブラウザ再起動
3. 強制リセットAPI（`/api/admin/force-reset`）の使用

### ❌ 問題: 通常リセットAPIでデータが残る
**原因：** RLSポリシーまたは認証問題  
**対処法：** 強制リセットAPI（`/api/admin/force-reset`）を使用

### ❌ エラー: テーブルが見つからない
```
Could not find the table 'public.category_xp_stats' in the schema cache
```
**対処法：** このエラーは正常（`category_xp_stats`は存在せず、正しくは`user_category_xp_stats`）

### ❌ エラー: カラムが存在しない
```
column quiz_answers.user_id does not exist
```
**対処法：** このエラーは正常（quiz_answersテーブルにuser_idカラムは存在せず、quiz_sessions削除時に外部キー制約で自動削除される設計のため）

### ❌ エラー: RLS Policy違反
```
new row violates row-level security policy
```
**対処法：** 強制リセットAPI（RLSバイパス）を使用

### ❌ 問題: 削除が完了しない
**対処法：** 
1. 強制リセットAPIを使用
2. 外部キー制約の確認
3. 依存関係の順序確認

### ⚠️ 重要な注意点
- **ポート番号**: localhost:3001 を使用（3000ではない）
- **ブラウザキャッシュ**: データリセット後は必ずシークレットモード使用
- **検証方法**: APIレスポンスの`verification`セクションで確認

## ファイル構成

```
database/
  ├── reset-user-learning-data.sql      # メインSQLファイル
  └── verify-user-data-reset.sql        # 検証SQLファイル
docs/
  └── USER_DATA_RESET_PROCEDURE.md      # 本ドキュメント
app/api/admin/
  ├── reset-user-data/route.ts          # 通常リセットAPI
  ├── force-reset/route.ts              # 強制リセットAPI（RLSバイパス）
  ├── debug-user-data/route.ts          # データ状況デバッグAPI
  └── debug-xp-stats/route.ts           # XP Stats APIデバッグ
scripts/
  └── reset-current-user.js             # 実行スクリプト
```

## 更新履歴

| 日付 | 変更内容 |
|------|---------|
| 2025-09-29 | 初版作成、19テーブル対応 |
| 2025-09-29 | 強制リセットAPI追加、ブラウザキャッシュ問題対策、完全版手順書 |
| 2025-09-29 | テーブル名修正（category_xp_stats→user_category_xp_stats）、quiz_answers自動削除説明追加 |