# Database Types Management

## database-types-official.ts の再生成手順

### 🔄 自動スクリプト使用（推奨）

```bash
bash scripts/regenerate-database-types.sh
```

### 📋 手動実行の場合

1. **バックアップ作成**
   ```bash
   cp lib/database-types-official.ts lib/database-types-official-backup-$(date +%Y%m%d_%H%M%S).ts
   ```

2. **型定義生成**
   ```bash
   SUPABASE_ACCESS_TOKEN="$(grep 'sbp_' SUPABASE_ACCESS_TOKENS.md | cut -d'`' -f2 | head -1)" \
   npx supabase gen types typescript --project-id bddqkmnbbvllpvsynklr > lib/database-types-official-new.ts
   ```

3. **エイリアス型追加**
   ```bash
   echo "" >> lib/database-types-official-new.ts
   cat database/database-types-aliases.txt >> lib/database-types-official-new.ts
   ```

4. **ファイル置き換え**
   ```bash
   mv lib/database-types-official-new.ts lib/database-types-official.ts
   ```

5. **品質確認**
   ```bash
   npm run typecheck && npm run lint
   ```

## エイリアス型管理

### 📝 database-types-aliases.txt

現在のプロジェクトで使用している**49個**のエイリアス型定義が保存されています。

### 🔄 新しいエイリアス型を追加する場合

**🤖 自動方式（推奨）:**
```bash
# 現在のdatabase-types-official.tsからエイリアス型リストを自動更新
bash scripts/update-database-aliases.sh
```

**📝 手動方式:**
1. `database/database-types-aliases.txt` に新しい型を追加
2. 型数のコメントを更新
3. 再生成スクリプトを実行

### 🔄 エイリアス型の自動最新化

再生成スクリプト（`regenerate-database-types.sh`）は以下を自動実行：
- エイリアス型リストファイルの存在確認
- 型数の一致確認（現在ファイル vs リストファイル）
- 不一致の場合は自動更新
- 最新のエイリアス型で再生成

### ⚠️ 重要な注意事項

- **絶対に手動で型を追加しない** - 必ず `database-types-aliases.txt` を経由する
- **再生成のたびにエイリアス型が不足する問題を防ぐため** - 完全なリストを維持
- **型数の一致確認** - 再生成後は必ず型数をチェック

## ファイル構成

```
database/
├── database-types-aliases.txt  # エイリアス型定義（49個）
├── README.md                   # このファイル
└── migrations/                 # SQLマイグレーションファイル

scripts/
└── regenerate-database-types.sh  # 自動再生成スクリプト

lib/
├── database-types-official.ts     # メイン型定義ファイル
└── database-types-official-backup-* # バックアップファイル群
```

## 最終更新

- **型数**: 49個
- **最終更新日**: 2025.11.04
- **最新の変更**: データベース制約変更（precomputed_quiz_sets）対応