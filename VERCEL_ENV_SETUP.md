# Vercel環境変数設定手順

## 🚨 重要な問題: ANON KEYのスペース

**現在の問題:** ANON KEYに不正なスペースが含まれています
```
❌ 現在（スペース有り）: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9
  sZSI6ImFub24iLCJpYXQiOjE3NTgwMTUyNDMsImV4cCI6MjA3MzU5MTI0M30.vf-At7yXtqbnUvcylDOnqzm4mSzoNTcJifcfgkBWn0A

✅ 正しい値（スペース無し）: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTUyNDMsImV4cCI6MjA3MzU5MTI0M30.vf-At7yXtqbnUvcylDOnqzm4mSzoNTcJifcfgkBWn0A
```

## 必要な環境変数

以下の環境変数をVercel Dashboardで設定してください：

### 1. Supabase設定（修正版）
```
NEXT_PUBLIC_SUPABASE_URL=https://bddqkmnbbvllpvsynklr.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTUyNDMsImV4cCI6MjA3MzU5MTI0M30.vf-At7yXtqbnUvcylDOnqzm4mSzoNTcJifcfgkBWn0A
```

### 2. サイトURL設定（新規追加）
```
NEXT_PUBLIC_SITE_URL=https://ai-learning-platform-ochre.vercel.app
```

## 🛠️ Vercel Dashboard修正手順

### Step 1: ANON KEY修正（最重要）
1. **Vercel Dashboard** → **プロジェクト** → **Settings** → **Environment Variables**
2. **NEXT_PUBLIC_SUPABASE_ANON_KEY**を見つけて **Edit** をクリック
3. **⚠️ 重要:** 既存の値を完全に削除
4. 新しい値をコピー＆ペースト（スペース無し）:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTUyNDMsImV4cCI6MjA3MzU5MTI0M30.vf-At7yXtqbnUvcylDOnqzm4mSzoNTcJifcfgkBWn0A
   ```
5. **Save** をクリック

### Step 2: サイトURL追加
1. **Add New** ボタンをクリック
2. **Name:** `NEXT_PUBLIC_SITE_URL`
3. **Value:** `https://ai-learning-platform-ochre.vercel.app`
4. **Environment:** Production, Preview, Development すべてチェック
5. **Save** をクリック

## 🔧 Supabase認証設定

### 1. Supabase Dashboard設定

1. **Supabase Dashboard** アクセス: https://supabase.com/dashboard
2. **プロジェクト選択:** bddqkmnbbvllpvsynklr

### 2. URL Configuration設定
**Authentication** → **URL Configuration**

**Site URL:**
```
https://ai-learning-platform-ochre.vercel.app
```

**Redirect URLs:**
```
https://ai-learning-platform-ochre.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

### 3. Email Auth確認（最新版）

**Supabase Dashboard** → **Authentication** → 以下のいずれかを確認：

**パターンA: Configuration**
- **Authentication** → **Configuration** → **Email**
- **Enable email confirmations** が有効になっていることを確認

**パターンB: Providers**  
- **Authentication** → **Providers** → **Email**
- **Email provider** が有効になっていることを確認
- **Confirm email** が有効になっていることを確認

**パターンC: Settings（古いバージョン）**
- **Authentication** → **Settings**（存在する場合）

## ✅ 修正後の確認手順

### 1. デプロイ確認
- Vercelで自動再デプロイが実行される
- ビルドログで正しい値が表示されることを確認:
  ```
  ✅ Supabase URL: https://bddqkmnbbvllpvsynklr.supabase.co
  ✅ Supabase Key (first 10 chars): eyJhbGciOi
  ```

### 2. 認証フロー確認
1. **新規ユーザー登録**を実行
2. **確認メールが届く**ことを確認
3. **メール内のリンク**をクリック
4. **エラーなく本番サイト**にリダイレクトされることを確認
5. **ログイン成功**を確認

## 🚨 解決される問題

### Before（問題あり）
- ❌ ANON KEYにスペースが含まれている
- ❌ Supabase認証が失敗
- ❌ メール確認でlocalhostエラー
- ❌ ユーザー登録後のログインができない

### After（修正後）
- ✅ ANON KEYが正しい形式
- ✅ Supabase認証が正常動作
- ✅ メール確認が本番環境にリダイレクト
- ✅ ユーザー登録・ログインが完全動作

## 📋 チェックリスト

- [ ] Vercel ANON KEY修正完了
- [ ] Vercel SITE_URL追加完了
- [ ] Supabase Site URL設定完了
- [ ] Supabase Redirect URLs設定完了
- [ ] 再デプロイ完了
- [ ] 新規登録テスト成功
- [ ] メール確認テスト成功
- [ ] ログインテスト成功

## 💡 今後の注意点

1. **環境変数のコピペ時はスペース除去**を必ず確認
2. **JWTトークンは連続文字列**でなければならない
3. **本番・開発の両環境**でリダイレクトURL設定が必要

これで localhost エラーと認証問題が完全に解決されます！