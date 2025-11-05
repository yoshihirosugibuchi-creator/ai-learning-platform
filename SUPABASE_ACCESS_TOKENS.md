# Supabase アクセストークン管理

## 🔑 現在のアクセストークン

### TypeScript型生成用トークン
- **トークン**: `sbp_d0a7eab84c104eee4d6399aff563ce9df891bed7`
- **用途**: Supabase CLI型生成 (`npx supabase gen types typescript`)
- **生成日**: 2025年10月31日
- **有効期限**: 30日 (2025年11月30日まで)
- **権限**: Read access to organizations, projects, tables

## 📝 使用コマンド

```bash
# 環境変数設定
export SUPABASE_ACCESS_TOKEN="sbp_d0a7eab84c104eee4d6399aff563ce9df891bed7"

# 型定義生成
npx supabase gen types typescript --project-id "bddqkmnbbvllpvsynklr" > lib/database-types-official.ts
```

## 🔄 更新履歴

| 日付 | アクション | 詳細 |
|------|------------|------|
| 2025-09-30 | 初回生成 | TypeScriptエラー409個解決のため初回生成 |
| 2025-10-31 | トークン更新 | 期限切れのため新トークン生成・UnifiedQuizType統一後の型定義更新 |

## ⚠️ 注意事項

- **有効期限**: トークンは30日で自動失効
- **更新必要**: 2025年11月30日頃に新しいトークン生成が必要
- **セキュリティ**: このトークンは開発用途のみ、本番環境では使用しない
- **権限**: 最小限の読み取り権限のみ付与

## 🔗 関連リンク

- Supabaseトークン管理: https://supabase.com/dashboard/account/tokens
- プロジェクトダッシュボード: https://supabase.com/dashboard/project/bddqkmnbbvllpvsynklr

---
*最終更新: 2025年10月31日*