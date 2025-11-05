#!/bin/bash

# テーブル分類スクリプト
DB_TYPES_FILE="/home/yoshi/projects/quiz-game-app/ai-learning-platform-next/lib/database-types-official.ts"

echo "=== RLS設定のための包括的テーブル分析 ==="
echo ""

# 全テーブル取得
ALL_TABLES=$(awk -f /home/yoshi/projects/quiz-game-app/ai-learning-platform-next/extract_tables.awk "$DB_TYPES_FILE" | sort)
TOTAL_COUNT=$(echo "$ALL_TABLES" | wc -l)

echo "📊 合計テーブル数: $TOTAL_COUNT"
echo ""

# user_idを持つテーブル（必須フィールド）
echo "🔐 user_idを持つテーブル（RLS適用必須）:"
USER_ID_TABLES=$(awk '
/^      [a-z_]+: {$/ && !/analyze_|calculate_|detect_|get_|initialize_|optimize_|predict_|process_|provide_|recalculate_|update_|add_to_/ { 
  table=$1; gsub(/:/, "", table); gsub(/^ +/, "", table) 
}
/user_id: string$/ { 
  print table 
}' "$DB_TYPES_FILE" | sort -u)

echo "$USER_ID_TABLES" | while read table; do
  echo "  ✓ $table"
done
USER_ID_COUNT=$(echo "$USER_ID_TABLES" | wc -l)
echo "  小計: $USER_ID_COUNT テーブル"
echo ""

# user_id nullable を持つテーブル
echo "🔓 user_id(nullable)を持つテーブル（部分的RLS適用）:"
USER_ID_NULL_TABLES=$(awk '
/^      [a-z_]+: {$/ && !/analyze_|calculate_|detect_|get_|initialize_|optimize_|predict_|process_|provide_|recalculate_|update_|add_to_/ { 
  table=$1; gsub(/:/, "", table); gsub(/^ +/, "", table) 
}
/user_id: string \| null/ { 
  print table 
}' "$DB_TYPES_FILE" | sort -u)

echo "$USER_ID_NULL_TABLES" | while read table; do
  echo "  ⚠️  $table"
done
USER_ID_NULL_COUNT=$(echo "$USER_ID_NULL_TABLES" | wc -l)
echo "  小計: $USER_ID_NULL_COUNT テーブル"
echo ""

# user_idを持たないテーブル（マスタデータ）
echo "📚 user_idを持たないテーブル（マスタデータ - 読み取り専用RLS）:"
MASTER_TABLES=$(echo "$ALL_TABLES" | while read table; do
  # user_idを持つかチェック
  HAS_USER_ID=$(echo "$USER_ID_TABLES $USER_ID_NULL_TABLES" | grep -w "$table" || true)
  if [ -z "$HAS_USER_ID" ]; then
    echo "$table"
  fi
done)

echo "$MASTER_TABLES" | while read table; do
  echo "  📖 $table"
done
MASTER_COUNT=$(echo "$MASTER_TABLES" | wc -l)
echo "  小計: $MASTER_COUNT テーブル"
echo ""

# 特殊テーブル（users）
echo "👤 特殊テーブル:"
echo "  🔑 users (id = auth.uid())"
echo "  小計: 1 テーブル"
echo ""

# 合計確認
CALC_TOTAL=$((USER_ID_COUNT + USER_ID_NULL_COUNT + MASTER_COUNT + 1))
echo "📋 分類確認: $USER_ID_COUNT + $USER_ID_NULL_COUNT + $MASTER_COUNT + 1 = $CALC_TOTAL"
if [ "$CALC_TOTAL" -eq "$TOTAL_COUNT" ]; then
  echo "✅ 分類完了: 全 $TOTAL_COUNT テーブルを分類しました"
else
  echo "❌ 分類エラー: 合計が一致しません ($CALC_TOTAL vs $TOTAL_COUNT)"
fi

# 出力ファイルに保存
{
  echo "USER_ID_TABLES=\"$USER_ID_TABLES\""
  echo "USER_ID_NULL_TABLES=\"$USER_ID_NULL_TABLES\""
  echo "MASTER_TABLES=\"$MASTER_TABLES\""
} > /home/yoshi/projects/quiz-game-app/ai-learning-platform-next/table_classification.env