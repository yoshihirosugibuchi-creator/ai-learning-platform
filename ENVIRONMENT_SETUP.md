# 環境設定ガイド

**目的**: AI Learning Platformの開発環境を正しく設定し、環境変数関連のエラーを防ぐ  
**最終更新**: 2025年9月22日  
**対象**: 開発者・デプロイ担当者

---

## 📋 **環境変数の全体概要**

### **必須環境変数**
| 変数名 | 用途 | 取得方法 | 例 |
|--------|------|----------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトURL | Supabaseダッシュボード > Settings > API | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 匿名アクセス用キー | Supabaseダッシュボード > Settings > API > anon public | `eyJhbG...` |
| `SUPABASE_SERVICE_ROLE_KEY` | 管理者権限用キー | Supabaseダッシュボード > Settings > API > service_role | `eyJhbG...` |

### **任意環境変数**
| 変数名 | 用途 | 設定タイミング |
|--------|------|---------------|
| `NEXT_PUBLIC_SITE_URL` | 本番サイトURL | 本番デプロイ時のみ必須 |

---

## 🚀 **環境設定手順**

### **Step 1: .env.local ファイルの作成**

プロジェクトルートに `.env.local` ファイルを作成：

```bash
# プロジェクトルートで実行
touch .env.local
```

### **Step 2: 環境変数の設定**

`.env.local` に以下をコピー＆ペーストし、実際の値に置換：

```env
# Supabase 設定（必須）
NEXT_PUBLIC_SUPABASE_URL=https://あなたのプロジェクトID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# サイトURL設定（本番環境用）
NEXT_PUBLIC_SITE_URL=https://ai-learning-platform-ochre.vercel.app
```

### **Step 3: 環境変数の取得方法**

#### **Supabaseダッシュボードからの取得**
1. [Supabase](https://supabase.com) にログイン
2. プロジェクトを選択
3. 左サイドバー > Settings > API
4. 以下の値をコピー：
   - **URL**: `NEXT_PUBLIC_SUPABASE_URL` に使用
   - **anon public**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` に使用
   - **service_role**: `SUPABASE_SERVICE_ROLE_KEY` に使用（⚠️ 機密情報）

### **Step 4: 設定検証**

環境変数が正しく設定されているか確認：

```bash
# 基本検証
npm run validate:env

# 本番環境向け検証
npm run validate:env:production
```

---

## 🔧 **開発環境別の設定**

### **ローカル開発環境**
```bash
# 必須コマンド実行順序
npm install              # 依存関係インストール
npm run validate:env     # 環境変数検証
npm run dev             # 開発サーバー起動
```

### **本番デプロイ環境**
```bash
# デプロイ前完全検証
npm run deploy:validate

# または段階的検証
npm run validate:env:production
npm run typecheck
npm run build
npm run lint
```

---

## ⚠️ **よくある問題と解決法**

### **Problem 1: 環境変数が読み込まれない**
```bash
❌ エラー: 環境変数が設定されていません: NEXT_PUBLIC_SUPABASE_URL
```

**解決法**:
```bash
# 1. ファイル存在確認
ls -la .env.local

# 2. 内容確認
cat .env.local

# 3. 権限確認
chmod 600 .env.local

# 4. 再起動
npm run dev
```

### **Problem 2: Invalid API key エラー**
```bash
❌ エラー: Invalid API key (hint: Double check your Supabase service_role API key)
```

**解決法**:
1. Supabaseダッシュボードで新しいキーを生成
2. `.env.local` の該当キーを更新
3. 検証テスト実行:
```bash
npm run validate:env
```

### **Problem 3: デプロイスクリプトの失敗**
```bash
❌ エラー: npm run deploy:sync で同期失敗
```

**解決法**:
```bash
# 1. 環境変数チェック
npm run deploy:check-env

# 2. dotenv設定確認
head -5 scripts/deploy-sync-fallback-data.ts

# 3. 手動環境変数設定（一時的）
export NEXT_PUBLIC_SUPABASE_URL="https://..."
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

### **Problem 4: TypeScript エラーでビルド失敗**
```bash
❌ エラー: Failed to compile (TypeScript errors)
```

**解決法**:
```bash
# 1. 現在のTypeScript設定確認
grep -A3 -B3 "ignoreBuildErrors" next.config.ts

# 2. TypeScript詳細エラー確認
npm run typecheck 2>&1 | head -20

# 3. 緊急時の一時的回避（推奨しない）
# next.config.ts で ignoreBuildErrors: true
```

---

## 🛠️ **トラブルシューティング コマンド一覧**

### **環境変数関連**
```bash
# 環境変数の確認
npm run validate:env                    # 開発環境検証
npm run validate:env:production         # 本番環境検証
cat .env.local                         # 直接確認

# 環境変数の修正後
npm run validate:env && npm run dev     # 検証 + 起動
```

### **デプロイ関連**
```bash
# 段階的チェック
npm run deploy:check-env               # 環境変数のみ
npm run deploy:validate                # 完全検証
npm run deploy:pre                     # デプロイ前最終チェック

# 個別テスト
npm run typecheck                      # TypeScript
npm run build                          # ビルド
npm run lint                          # リント
```

### **緊急時対応**
```bash
# キャッシュクリア
rm -rf .next node_modules package-lock.json
npm install

# 環境変数リセット
rm .env.local
# 上記Step 2に従って再作成

# Gitリセット（最終手段）
git status                             # 変更確認
git restore .env.local                 # 環境変数のみ復元
```

---

## 📊 **環境変数検証スクリプトの詳細**

新しく追加された `scripts/validate-env.ts` の機能：

### **検証項目**
1. ✅ **必須環境変数の存在確認**
2. ✅ **Supabase接続テスト** (匿名・管理者権限)
3. ✅ **環境設定ファイルの確認**
4. ✅ **デプロイ準備状況チェック**
5. ✅ **TypeScript/Lint設定確認**

### **出力例**
```bash
🚀 環境変数検証開始 (development environment)
📅 実行時刻: 2025/09/22 14:30:15
────────────────────────────────────────────────────────────────────────────────
✅ NEXT_PUBLIC_SUPABASE_URL: 設定済み (https://bddqkm...co)
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY: 設定済み (eyJhbGciOi...4 chars)
✅ SUPABASE_SERVICE_ROLE_KEY: 設定済み (eyJhbGciOi...43 chars)
✅ Supabase Anon Client: 接続成功
⚠️  Supabase Service Client: 接続警告: Invalid API key
📈 総計: 成功 4, 警告 1, エラー 0
🟡 検証完了（警告あり): デプロイ可能ですが推奨設定を確認してください
```

---

## 🔐 **セキュリティ注意事項**

### **機密情報の扱い**
- ✅ `.env.local` は `.gitignore` に含まれている
- ❌ **絶対禁止**: 環境変数をコードに直接記載
- ❌ **絶対禁止**: `SUPABASE_SERVICE_ROLE_KEY` をパブリックリポジトリにコミット

### **キーの管理**
- 🔄 定期的にSupabaseキーを再生成（推奨：月1回）
- 🔍 不正アクセスの兆候がある場合は即座にキー無効化
- 📝 チームメンバー向けには暗号化されたパスワードマネージャーで共有

---

## 📞 **サポート・問い合わせ**

### **環境設定で問題が発生した場合**
1. **第一選択**: `npm run validate:env` で詳細エラーを確認
2. **第二選択**: このガイドのトラブルシューティングセクションを確認
3. **第三選択**: `TYPESCRIPT_ERROR_INVESTIGATION.md` で既知問題を確認
4. **最終手段**: 環境をリセットして最初からセットアップ

### **関連ドキュメント**
- `TYPESCRIPT_ERROR_INVESTIGATION.md`: TypeScriptエラー詳細
- `DEPLOY_DEBUG_CHECKLIST.md`: デプロイ手順詳細
- `PRODUCTION_CHECKLIST.md`: 本番環境設定

---

**📌 重要**: このガイドは環境変数エラーの根本解決を目的として作成されました。新しい環境変数追加時は必ずこのドキュメントを更新してください。