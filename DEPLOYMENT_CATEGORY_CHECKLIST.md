# デプロイメントチェックリスト: カテゴリー・サブカテゴリー管理

## ⚠️ 重要な開発原則

### 🚫 絶対にやってはいけないこと
1. **ハードコードのごまかし**: 「フォールバック」という名目でハードコードを残すこと
2. **不完全なキャッシュ化**: DB読み込みをせずにハードコードだけで済ませること
3. **手動更新の放置**: DB変更時にハードコードの更新を忘れること

### ✅ 正しい実装方針
1. **DB優先**: 常にDBから最新データを取得
2. **フォールバック**: DB障害時のみハードコード使用
3. **自動同期**: デプロイ前にDB→ハードコード自動更新

## 📋 デプロイ前チェックリスト

### Phase 1: DB変更チェック
```bash
# 1. 最新のカテゴリー・サブカテゴリーマッピングを生成
npm run generate:category-mapping

# 2. 差分確認（出力を確認）
# - "既存ファイルと一致しています" → 変更なし、そのまま進行
# - "差分が検出されました" → Phase 2へ進む
```

### Phase 2: ハードコード更新（差分がある場合のみ）
```bash
# 1. 生成されたファイルで既存ファイルを更新
cp lib/category-mapping-generated.ts lib/category-mapping.ts

# 2. TypeScript コンパイルチェック
npx tsc --noEmit

# 3. テスト実行
npm run test:category-cache

# 4. Git コミット
git add lib/category-mapping.ts
git commit -m "Update category mapping from database

🤖 Auto-generated from database on $(date)
- Categories: XX件 (Main: XX, Industry: XX)  
- Subcategories: XX件

🔧 Generated with [Claude Code](https://claude.ai/code)"
```

### Phase 3: デプロイ実行
```bash
# 通常のデプロイ手順を実行
npm run build
npm run deploy
```

## 🔧 package.json スクリプト追加

以下のスクリプトを `package.json` に追加してください：

```json
{
  "scripts": {
    "generate:category-mapping": "npx tsx scripts/generate-category-mapping.ts",
    "test:category-cache": "npx tsx scripts/test-simple-cache.ts",
    "pre-deploy:check": "npm run generate:category-mapping && npx tsc --noEmit"
  }
}
```

## 🎯 キャッシュシステムの動作確認

### 正常動作パターン
1. **初回アクセス**: フォールバック（最新ハードコード）で即座表示
2. **3秒後**: DBから読み込み完了、キャッシュ更新
3. **2回目以降**: キャッシュから瞬時取得（0ms）

### 異常動作の検出方法
```typescript
// ブラウザコンソールで確認
import { getCacheStats } from '@/lib/category-cache-simple'
console.log(getCacheStats())

// 正常: { categoriesLoaded: true, categoriesCount: 24, subcategoriesLoaded: true, subcategoriesCount: 145 }
// 異常: categoriesCount が 0 や極端に少ない値
```

## 📊 運用監視指標

### DB正常時
- キャッシュ読み込み時間: < 500ms
- キャッシュ件数: Categories 24件, Subcategories 145件程度

### DB障害時
- フォールバック発動: `console.warn` でログ出力
- 表示継続: フォールバックにより正常表示される

## 🚨 トラブルシューティング

### 問題: 新規追加したカテゴリーが表示されない
**原因**: ハードコードが古い
**解決**: `npm run generate:category-mapping` を実行してデプロイ

### 問題: DB障害でサイトが表示されない  
**原因**: フォールバック機能の不具合
**解決**: `lib/category-mapping.ts` の存在と内容を確認

### 問題: キャッシュが更新されない
**原因**: Supabase接続問題
**解決**: 環境変数 `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` を確認

## 🔄 継続的改善

### 月次レビュー
1. DB統計の確認（カテゴリー・サブカテゴリー件数）
2. キャッシュヒット率の確認
3. フォールバック発動頻度の確認

### 将来的な完全DB化
現在はDB優先+フォールバック方式ですが、将来的には：
1. DB安定性の確認
2. 段階的フォールバック削除
3. 完全DBベースへの移行

---
**最終更新**: 2025-09-24  
**担当**: Claude Code AI Assistant  
**レビュー**: 定期的にこのチェックリストの有効性を確認してください