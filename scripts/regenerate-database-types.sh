#!/bin/bash

# =================================================================
# database-types-official.ts 再生成スクリプト
# 
# 使用方法: bash scripts/regenerate-database-types.sh
# =================================================================

echo "🔄 database-types-official.ts 再生成開始..."

# Step 1: バックアップ作成
echo "📦 バックアップ作成中..."
cp lib/database-types-official.ts lib/database-types-official-backup-$(date +%Y%m%d_%H%M%S).ts
echo "✅ バックアップ作成完了"

# Step 2: Supabase CLI確認
echo "🔧 Supabase CLI確認中..."
if ! npx supabase --version > /dev/null 2>&1; then
    echo "❌ Supabase CLIが見つかりません"
    exit 1
fi
echo "✅ Supabase CLI確認完了"

# Step 3: アクセストークン設定
echo "🔑 アクセストークン設定中..."
if [ ! -f "SUPABASE_ACCESS_TOKENS.md" ]; then
    echo "❌ SUPABASE_ACCESS_TOKENS.md が見つかりません"
    exit 1
fi

export SUPABASE_ACCESS_TOKEN=$(grep 'sbp_' SUPABASE_ACCESS_TOKENS.md | cut -d'`' -f2 | head -1)
echo "✅ アクセストークン設定完了"

# Step 4: 型定義生成
echo "⚙️ 型定義生成中..."
npx supabase gen types typescript --project-id bddqkmnbbvllpvsynklr > lib/database-types-official-new.ts

if [ $? -ne 0 ]; then
    echo "❌ 型定義生成に失敗しました"
    exit 1
fi

echo "✅ 型定義生成完了"

# Step 5: エイリアス型追加
echo "🔗 エイリアス型追加中..."
if [ ! -f "database/database-types-aliases.txt" ]; then
    echo "❌ database/database-types-aliases.txt が見つかりません"
    echo "🔄 エイリアス型リストを自動生成します..."
    bash scripts/update-database-aliases.sh
fi

echo "" >> lib/database-types-official-new.ts
cat database/database-types-aliases.txt >> lib/database-types-official-new.ts

# エイリアス型数確認
ALIAS_COUNT=$(grep "export type.*Database\['public'\]" lib/database-types-official-new.ts | wc -l)
echo "✅ エイリアス型追加完了: ${ALIAS_COUNT}個"

# エイリアス型リストの最新化チェック
echo "🔍 エイリアス型リスト最新化チェック中..."
CURRENT_TYPES_COUNT=$(grep "export type.*Database\['public'\]" lib/database-types-official.ts | wc -l)
ALIASES_FILE_COUNT=$(grep "export type.*Database\['public'\]" database/database-types-aliases.txt | wc -l)

if [ $CURRENT_TYPES_COUNT -ne $ALIASES_FILE_COUNT ]; then
    echo "⚠️ エイリアス型リストが古い可能性があります（現在:${CURRENT_TYPES_COUNT}個 vs リスト:${ALIASES_FILE_COUNT}個）"
    echo "🔄 エイリアス型リストを自動更新します..."
    bash scripts/update-database-aliases.sh
    
    # 再度追加
    echo "" >> lib/database-types-official-new.ts
    cat database/database-types-aliases.txt >> lib/database-types-official-new.ts
    
    ALIAS_COUNT=$(grep "export type.*Database\['public'\]" lib/database-types-official-new.ts | wc -l)
    echo "✅ 最新化されたエイリアス型追加完了: ${ALIAS_COUNT}個"
fi

# Step 6: ファイル置き換え
echo "🔄 ファイル置き換え中..."
mv lib/database-types-official-new.ts lib/database-types-official.ts
echo "✅ ファイル置き換え完了"

# Step 7: 品質確認
echo "🔍 品質確認中..."
npm run typecheck
if [ $? -eq 0 ]; then
    echo "✅ TypeScript確認: エラーなし"
else
    echo "❌ TypeScript確認: エラーあり"
    exit 1
fi

npm run lint
if [ $? -eq 0 ]; then
    echo "✅ ESLint確認: エラーなし"
else
    echo "❌ ESLint確認: エラーあり"
    exit 1
fi

echo ""
echo "🎉 database-types-official.ts 再生成完了！"
echo "📁 バックアップファイル: lib/database-types-official-backup-*"
echo "📊 エイリアス型: ${ALIAS_COUNT}個"