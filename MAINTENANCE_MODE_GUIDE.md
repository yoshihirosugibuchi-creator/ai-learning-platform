# メンテナンスモード設定ガイド

## 概要
Vercel環境でのメンテナンスモード実装とその使用方法について説明します。

---

## 🚀 **実装されたファイル**

### 1. `middleware.ts` - メンテナンス制御ロジック
- 全ページアクセスを監視
- 環境変数によるメンテナンスモード制御
- 管理者IP許可機能
- メンテナンスページへの自動リダイレクト

### 2. `app/maintenance/page.tsx` - メンテナンスページ
- リアルタイム時計表示
- カウントダウン機能
- カスタムメッセージ表示
- レスポンシブデザイン

---

## 🔧 **Vercel環境変数設定方法**

### Vercel Dashboard での設定

1. **Vercel Dashboard** にログイン
2. プロジェクトを選択
3. **Settings** → **Environment Variables** に移動
4. 以下の環境変数を追加：

#### **必須設定**
```bash
# メンテナンスモード ON/OFF
MAINTENANCE_MODE=true

# メンテナンス中メッセージ（オプション）
MAINTENANCE_MESSAGE=システムメンテナンス中です。しばらくお待ちください。

# メンテナンス終了予定時刻（オプション）
MAINTENANCE_END_TIME=2025-10-08 18:00

# 管理者アクセス許可IP（オプション）
ADMIN_IPS=192.168.1.100,203.0.113.0
```

#### **環境別設定**
- **Production**: 本番環境用
- **Preview**: プレビュー環境用
- **Development**: 開発環境用（通常は設定不要）

---

## 📋 **使用手順**

### **メンテナンス開始**

1. **Vercel Dashboard**で環境変数設定
   ```bash
   MAINTENANCE_MODE=true
   MAINTENANCE_MESSAGE=システムアップデート作業中です
   MAINTENANCE_END_TIME=2025-10-08 20:00
   ```

2. **Deploy**または**Redeploy**実行
   - 設定変更後は再デプロイが必要
   - 即座に全ユーザーがメンテナンスページにリダイレクト

### **メンテナンス終了**

1. **環境変数変更**
   ```bash
   MAINTENANCE_MODE=false
   ```

2. **再デプロイ実行**
   - 通常のアプリケーションアクセスが復旧

---

## 🛡️ **管理者アクセス設定**

### **IPアドレス許可設定**
```bash
# 単一IP
ADMIN_IPS=203.0.113.1

# 複数IP（カンマ区切り）
ADMIN_IPS=203.0.113.1,203.0.113.2,192.168.1.100
```

### **IP確認方法**
```bash
# 現在のIPアドレス確認
curl https://httpbin.org/ip
```

---

## ⚡ **Vercel CLI での設定**

### **コマンドライン設定**
```bash
# メンテナンス開始
vercel env add MAINTENANCE_MODE production
# 値: true

# メンテナンスメッセージ設定
vercel env add MAINTENANCE_MESSAGE production  
# 値: システムメンテナンス中です

# 設定確認
vercel env ls

# 再デプロイ
vercel --prod
```

### **一括設定用 .env.production**
```bash
# .env.production ファイル作成
MAINTENANCE_MODE=true
MAINTENANCE_MESSAGE=システムメンテナンス中です
MAINTENANCE_END_TIME=2025-10-08 20:00
ADMIN_IPS=203.0.113.1,192.168.1.100

# 一括アップロード
vercel env pull .env.production
```

---

## 🔍 **動作確認方法**

### **1. メンテナンスモードテスト**
```bash
# 環境変数設定後
curl -I https://your-app.vercel.app/
# -> 302 リダイレクト to /maintenance

# メンテナンスページ確認
curl https://your-app.vercel.app/maintenance
# -> メンテナンスページHTML
```

### **2. 管理者アクセステスト**
```bash
# 管理者IPからのアクセス
curl -H "X-Forwarded-For: 203.0.113.1" https://your-app.vercel.app/
# -> 通常ページ表示

# 一般ユーザーIPからのアクセス  
curl -H "X-Forwarded-For: 198.51.100.1" https://your-app.vercel.app/
# -> メンテナンスページにリダイレクト
```

---

## 🚨 **緊急時対応**

### **即座にメンテナンス解除**
1. **Vercel Dashboard** → **Environment Variables**
2. `MAINTENANCE_MODE` を `false` に変更
3. **Save** → **Redeploy**
4. 約1-2分で反映

### **Vercel CLI での緊急解除**
```bash
# 即座にメンテナンス解除
vercel env rm MAINTENANCE_MODE production
vercel --prod

# または値変更
vercel env add MAINTENANCE_MODE production
# 値: false
vercel --prod
```

---

## 📝 **カスタマイズオプション**

### **メッセージのカスタマイズ**
```bash
# カスタムメッセージ例
MAINTENANCE_MESSAGE=データベース最適化作業中です。30分程度で完了予定です。
MAINTENANCE_MESSAGE=新機能追加作業中です。しばらくお待ちください。
MAINTENANCE_MESSAGE=緊急メンテナンス中です。復旧までお待ちください。
```

### **時刻指定フォーマット**
```bash
# 日本時間での指定
MAINTENANCE_END_TIME=2025-10-08 18:30
MAINTENANCE_END_TIME=2025-10-08 20:00:00

# ISO形式（UTC）
MAINTENANCE_END_TIME=2025-10-08T11:00:00Z
```

---

## 🎨 **メンテナンスページのカスタマイズ**

### **デザイン変更**
`app/maintenance/page.tsx` を編集してデザインをカスタマイズ可能：

- **カラーテーマ変更**
- **ロゴ・画像追加**  
- **追加情報表示**
- **SNSリンク追加**

### **多言語対応**
```typescript
// URLパラメータで言語切り替え
const lang = searchParams.get('lang') || 'ja'
const messages = {
  ja: 'システムメンテナンス中です',
  en: 'System maintenance in progress'
}
```

---

## ⚠️ **注意事項**

### **設定時の重要ポイント**
- 環境変数変更後は**必ず再デプロイ**が必要
- **Production**環境での設定は本番に即座に反映
- **管理者IP**は慎重に設定（セキュリティリスク）

### **トラブルシューティング**
- メンテナンスが効かない → 再デプロイ実行
- 管理者アクセスできない → IP設定確認
- ページが表示されない → `maintenance`ページのビルドエラー確認

---

## 📞 **サポート情報**

### **設定確認コマンド**
```bash
# 現在の環境変数確認
vercel env ls

# デプロイ状況確認  
vercel ls

# ログ確認
vercel logs https://your-app.vercel.app
```

### **問題発生時**
1. **Vercel Dashboard**でビルドログ確認
2. **Environment Variables**設定確認
3. **Functions**タブでmiddleware実行ログ確認

---

*このガイドに従って安全にメンテナンスモードを運用してください。*