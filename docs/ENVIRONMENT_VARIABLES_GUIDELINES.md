# 環境変数管理ガイドライン

## 🚨 重要：作業開始前の必須確認事項

このドキュメントは**すべての開発・デバッグ作業開始前に必ず確認**してください。

## 📋 環境変数エラー防止チェックリスト

### ✅ 新しいAPIルート作成時
- [ ] 環境変数を直接参照する際は必ず存在確認を実装
- [ ] ビルド時とランタイム時の両方でエラーハンドリングを考慮
- [ ] 本番専用の環境変数（SERVICE_ROLE_KEYなど）は適切な分岐処理を実装

### ✅ 管理者専用API作成時
- [ ] `SUPABASE_SERVICE_ROLE_KEY`使用時は環境変数バリデーション関数を使用
- [ ] ビルド時に存在しない環境変数でもエラーにならない構造にする
- [ ] 本番環境でのみ利用可能なAPIである旨をコメントで明記

### ✅ デバッグスクリプト作成時
- [ ] 開発環境と本番環境の差異を考慮した設計
- [ ] 環境変数が不足している場合の適切なフォールバック処理
- [ ] エラーメッセージは運用担当者にとって理解しやすい内容

## 🛠️ 推奨実装パターン

### 1. 環境変数バリデーション関数（管理者API用）

```typescript
// ❌ 悪い例：直接参照でビルドエラーの原因
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ビルド時にエラー
  { /* config */ }
)

// ✅ 良い例：バリデーション関数を使用
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing required Supabase environment variables')
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
```

### 2. APIルートでの環境変数エラーハンドリング

```typescript
export async function POST(request: NextRequest) {
  try {
    // 環境変数チェック
    let supabaseAdmin
    try {
      supabaseAdmin = createAdminClient()
    } catch (envError) {
      console.error('❌ Environment error:', envError)
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      )
    }

    // 実際の処理...
  } catch (error) {
    // エラーハンドリング...
  }
}
```

### 3. 開発・本番環境分岐パターン

```typescript
function getEnvironmentConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'
  
  return {
    // 開発環境では代替手段を提供
    adminFeaturesEnabled: isProduction && !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    // フォールバック設定
    debugMode: isDevelopment || process.env.DEBUG_MODE === 'true'
  }
}
```

## 🔍 環境変数分類と対処法

### パブリック環境変数（常に利用可能）
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **対処法**: 直接参照OK、ただし存在確認推奨

### プライベート環境変数（本番のみ）
- `SUPABASE_SERVICE_ROLE_KEY`
- **対処法**: 必ずバリデーション関数経由で使用

### オプション環境変数（機能拡張用）
- `DEBUG_MODE`
- `FEATURE_FLAG_*`
- **対処法**: デフォルト値を設定してフォールバック

## 🚦 デプロイ前チェック項目

### ビルドテスト
```bash
# 環境変数なしでビルドテスト
npm run build
```

### 環境変数確認
```bash
# 必要な環境変数がVercelに設定されているか確認
# 1. NEXT_PUBLIC_SUPABASE_URL
# 2. NEXT_PUBLIC_SUPABASE_ANON_KEY  
# 3. SUPABASE_SERVICE_ROLE_KEY（本番のみ）
```

### TypeScript/ESLintチェック
```bash
npx tsc --noEmit
npm run lint
```

## 📝 コード品質チェックポイント

1. **環境変数の型安全性**
   - TypeScriptで適切な型定義
   - undefinedの可能性を考慮

2. **エラーハンドリング**
   - 環境変数不足時の適切なレスポンス
   - ログ出力で原因特定しやすい形式

3. **セキュリティ**
   - 機密情報を含む環境変数の適切な管理
   - クライアントサイドでの機密情報露出防止

## 🎯 作業フロー

1. **作業開始時**: このドキュメントを確認
2. **API作成時**: 環境変数パターンを選択
3. **ビルド前**: 環境変数チェック実行
4. **デプロイ前**: 完全ビルドテスト実行

## 📚 関連ドキュメント

- [CODE_QUALITY_WORKFLOW.md](./CODE_QUALITY_WORKFLOW.md)
- [DEPLOYMENT_MASTER_GUIDE.md](./DEPLOYMENT_MASTER_GUIDE.md)
- [DATABASE_GUIDELINES.md](../DATABASE_GUIDELINES.md)

---

**⚠️ 重要：このガイドラインに従わない場合、デプロイエラーが発生し、本番サービスに影響を与える可能性があります。**