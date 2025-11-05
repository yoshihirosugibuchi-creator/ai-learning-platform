#!/bin/bash

# =================================================================
# database-types-aliases.txt 自動更新スクリプト
# 
# 現在のdatabase-types-official.tsからエイリアス型を抽出して
# database/database-types-aliases.txt を最新化する
# =================================================================

echo "🔄 エイリアス型リスト自動更新開始..."

# Step 1: 現在のエイリアス型を抽出
echo "📋 現在のエイリアス型抽出中..."
CURRENT_ALIASES=$(grep "export type.*Database\['public'\]" lib/database-types-official.ts)
ALIAS_COUNT=$(echo "$CURRENT_ALIASES" | wc -l)

if [ $ALIAS_COUNT -eq 0 ]; then
    echo "❌ エイリアス型が見つかりません"
    exit 1
fi

echo "✅ エイリアス型抽出完了: ${ALIAS_COUNT}個"

# Step 2: バックアップ作成（既存ファイルがある場合）
if [ -f "database/database-types-aliases.txt" ]; then
    echo "📦 既存ファイルバックアップ作成中..."
    cp database/database-types-aliases.txt database/database-types-aliases-backup-$(date +%Y%m%d_%H%M%S).txt
    echo "✅ バックアップ作成完了"
fi

# Step 3: 新しいエイリアス型リストファイル作成
echo "📝 新しいエイリアス型リストファイル作成中..."
cat > database/database-types-aliases.txt << EOF
// ============= Complete Type Aliases (All ${ALIAS_COUNT} Types - Updated $(date +%Y.%m.%d)) =============
$CURRENT_ALIASES
EOF

echo "✅ 新しいエイリアス型リストファイル作成完了"

# Step 4: 確認
echo "🔍 更新結果確認:"
echo "  - エイリアス型数: ${ALIAS_COUNT}個"
echo "  - ファイル: database/database-types-aliases.txt"
echo "  - 更新日時: $(date)"

# Step 5: regenerate-database-types.sh の型数も更新
if [ -f "scripts/regenerate-database-types.sh" ]; then
    echo "🔄 再生成スクリプトの型数コメント更新中..."
    # 型数のコメント部分を更新（例：49個 → 新しい数）
    sed -i "s/All [0-9]\+ Types/All ${ALIAS_COUNT} Types/g" scripts/regenerate-database-types.sh
    echo "✅ 再生成スクリプト更新完了"
fi

echo ""
echo "🎉 エイリアス型リスト自動更新完了！"
echo "📁 バックアップファイル: database/database-types-aliases-backup-*"
echo "📊 最新のエイリアス型数: ${ALIAS_COUNT}個"