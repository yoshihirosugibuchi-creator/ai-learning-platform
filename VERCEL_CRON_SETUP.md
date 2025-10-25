# Vercel Cron 自動バッチ設定手順

日次分析バッチシステムの自動実行を開始するためのVercel設定手順です。

## 📋 **設定概要**

- **自動実行時間**: 毎日午前2時(JST)
- **処理内容**: 前日の学習品質スコア・ピーク時間・思考時間の自動計算
- **通知**: 失敗時のメール通知（オプション）
- **監視**: 管理画面でリアルタイム監視

---

## 🔧 **Step 1: Vercel環境変数設定**

### **Vercelダッシュボードにアクセス**
1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. プロジェクト `ai-learning-platform-next` を選択
3. **Settings** タブ → **Environment Variables** を選択

### **必須環境変数（4つ）**

#### **1. CRON_SECRET** ⭐ 必須
```
Name: CRON_SECRET
Value: your-secure-random-string-32-chars
Environments: ✅ Production ✅ Preview ✅ Development
```
**生成方法**: 
```bash
# ランダム文字列生成（32文字）
openssl rand -hex 16
# または
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

#### **2. SYSTEM_AUTH_TOKEN** ⭐ 必須
```
Name: SYSTEM_AUTH_TOKEN
Value: your-system-user-auth-token
Environments: ✅ Production ✅ Preview ✅ Development
```
**取得方法**: システム管理者アカウントでログイン後、ブラウザ開発者ツールで以下を実行
```javascript
// ローカルストレージからSupabaseトークン取得
JSON.parse(localStorage.getItem('sb-bddqkmnbbvllpvsynklr-auth-token'))?.access_token
```

#### **3. NEXT_PUBLIC_APP_URL** ⭐ 必須
```
Name: NEXT_PUBLIC_APP_URL
Value: https://your-app.vercel.app
Environments: ✅ Production ✅ Preview ✅ Development
```
**設定値**: Vercelデプロイ後のURLを設定

#### **4. 既存のSupabase環境変数確認** ⭐ 必須
以下が既に設定されていることを確認:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  
SUPABASE_SERVICE_ROLE_KEY
```

### **オプション環境変数（メール通知用）**

#### **5. EMAIL_NOTIFICATIONS_ENABLED** (オプション)
```
Name: EMAIL_NOTIFICATIONS_ENABLED
Value: true
Environments: ✅ Production
```

#### **6. ADMIN_NOTIFICATION_EMAIL** (オプション)
```
Name: ADMIN_NOTIFICATION_EMAIL
Value: admin@yourcompany.com
Environments: ✅ Production
```

#### **7. RESEND_API_KEY** (オプション)
```
Name: RESEND_API_KEY
Value: re_xxxxxxxxxxxxxxxxx
Environments: ✅ Production
```
**取得方法**: [Resend](https://resend.com/api-keys) でAPIキー作成

#### **8. EMAIL_FROM** (オプション)
```
Name: EMAIL_FROM
Value: noreply@yourdomain.com
Environments: ✅ Production
```

---

## ⏰ **Step 2: Vercel Cron Jobs設定**

### **Cron Jobs画面にアクセス**
1. Vercelダッシュボード → プロジェクト選択
2. **Functions** タブ → **Cron Jobs** を選択
3. **Add Cron Job** をクリック

### **Cron Job設定値**
```
Function Path: /api/cron/daily-analytics
Schedule: 0 17 * * *
Description: 日次分析バッチ自動実行（毎日午前2時JST）
```

**📝 スケジュール説明**:
- `0 17 * * *` = 毎日17:00 UTC = 日本時間 午前2:00
- UTC と JST の時差（9時間）を考慮済み

### **設定確認**
- ✅ Function Path: `/api/cron/daily-analytics`
- ✅ Schedule: `0 17 * * *`  
- ✅ Status: `Enabled`

---

## 🧪 **Step 3: 動作テスト**

### **手動テスト実行**
```bash
# 本番環境でのテスト実行
curl -X GET "https://your-app.vercel.app/api/cron/daily-analytics" \
  -H "Authorization: Bearer your-cron-secret"
```

### **期待される結果**
```json
{
  "success": true,
  "message": "日次バッチ完了: 50人処理, 45秒",
  "execution_summary": {
    "target_date": "2025-10-20",
    "processed_users": 50,
    "execution_time_seconds": 45,
    "success_count": 1,
    "error_count": 0
  }
}
```

### **管理画面での確認**
1. `https://your-app.vercel.app/admin/batch-analytics` にアクセス
2. システム健康状態が 🟢 正常 であることを確認
3. バッチ実行履歴にテスト実行ログが表示されることを確認

---

## 📊 **Step 4: 監視・運用**

### **日次確認ポイント**
- **管理画面**: `/admin/batch-analytics` で毎日の実行状況確認
- **システム状態**: 🟢 正常 / 🟡 注意 / 🔴 異常
- **処理ユーザー数**: 前日アクティブユーザー数と一致するか
- **実行時間**: 通常30-60秒程度

### **障害対応**
1. **失敗通知受信時**: 管理画面でエラー詳細確認
2. **手動復旧**: 日付指定で再実行
3. **連続失敗時**: システム管理者にエスカレーション

### **メール通知設定時の確認**
- **失敗時**: 連続2回失敗で自動メール送信
- **送信間隔**: 同種エラーは6時間間隔制限
- **宛先**: `ADMIN_NOTIFICATION_EMAIL` で指定されたアドレス

---

## 🔍 **トラブルシューティング**

### **よくある問題と解決法**

#### **❌ 401 Unauthorized**
```
原因: CRON_SECRET が不正
解決: 環境変数 CRON_SECRET を再確認・再設定
```

#### **❌ 認証トークンエラー**
```
原因: SYSTEM_AUTH_TOKEN が無効・期限切れ
解決: 新しいトークンを取得して環境変数更新
```

#### **❌ Cron Jobが実行されない**
```
原因: Vercel Cron Jobs設定エラー
解決: Function Path・Schedule設定を再確認
```

#### **❌ 処理対象ユーザー0人**
```
原因: 前日アクティブユーザーなし、またはデータ不整合
解決: daily_xp_records テーブルのデータ確認
```

### **ログ確認方法**
1. **Vercel Function Logs**: ダッシュボード → Functions → View Function Logs
2. **管理画面**: バッチ実行履歴でエラー詳細確認
3. **Supabase Logs**: Auth・Database・API のログ確認

---

## 📈 **運用開始後の流れ**

### **初日（設定完了日）**
- [ ] 環境変数設定完了
- [ ] Cron Jobs設定完了  
- [ ] 手動テスト実行・成功確認
- [ ] 管理画面アクセス確認

### **翌日午前（初回自動実行後）**
- [ ] 午前2時頃の自動実行ログ確認
- [ ] 処理ユーザー数・実行時間確認
- [ ] エラーがないことを確認
- [ ] メール通知設定時は受信テスト

### **1週間後**
- [ ] 7日間の実行履歴レビュー
- [ ] 成功率・平均実行時間の確認
- [ ] 異常値・パターンの有無確認

### **1ヶ月後**
- [ ] 月次統計レビュー
- [ ] パフォーマンス最適化検討
- [ ] 運用改善点の洗い出し

---

## 🎯 **完了チェックリスト**

運用開始前の最終確認:

### **Vercel設定**
- [ ] CRON_SECRET 設定完了
- [ ] SYSTEM_AUTH_TOKEN 設定完了  
- [ ] NEXT_PUBLIC_APP_URL 設定完了
- [ ] Supabase環境変数確認完了
- [ ] Cron Jobs設定完了（0 17 * * *）

### **機能テスト**
- [ ] 手動API呼び出しテスト成功
- [ ] 管理画面アクセス・表示確認
- [ ] バッチ履歴表示確認
- [ ] 手動実行機能テスト成功

### **オプション設定**
- [ ] メール通知設定（必要時）
- [ ] 通知テスト実行（必要時）

### **運用準備**
- [ ] システム管理者への運用手順共有
- [ ] 障害対応手順確認
- [ ] 監視体制確立

---

**🚀 設定完了後、毎日午前2時に前日データの自動処理が開始されます！**

## 📞 **サポート情報**

### **関連ドキュメント**
- [Vercel Cron Jobs](https://vercel.com/docs/concepts/functions/serverless-functions/cron-jobs)
- [CLAUDE.md](./CLAUDE.md) - 開発ガイドライン
- [管理画面アクセス](https://your-app.vercel.app/admin/batch-analytics)

### **重要ファイル**
- `app/api/cron/daily-analytics/route.ts` - Cron実行API
- `app/admin/batch-analytics/page.tsx` - 管理画面
- `lib/batch-management.ts` - バッチ管理機能
- `lib/learning-quality-calculator.ts` - 品質スコア計算

---
*最終更新: 2025年10月21日*
*作成者: Claude Code AI Assistant*