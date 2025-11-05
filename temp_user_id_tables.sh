#!/bin/bash

# user_idを持つテーブルを抽出
echo "=== user_idを持つテーブル ==="
awk '/^      [a-z_]+: {$/ { table=$1; gsub(/:/, "", table); gsub(/^ +/, "", table) } /user_id: string/ { print table }' /home/yoshi/projects/quiz-game-app/ai-learning-platform-next/lib/database-types-official.ts | sort -u

echo ""
echo "=== user_id: string | nullを持つテーブル ==="
awk '/^      [a-z_]+: {$/ { table=$1; gsub(/:/, "", table); gsub(/^ +/, "", table) } /user_id: string \| null/ { print table }' /home/yoshi/projects/quiz-game-app/ai-learning-platform-next/lib/database-types-official.ts | sort -u

echo ""
echo "=== 全テーブル一覧 ==="
grep -E "^      [a-z_]+: {$" /home/yoshi/projects/quiz-game-app/ai-learning-platform-next/lib/database-types-official.ts | grep -v -E "analyze_|calculate_|detect_|get_|initialize_|optimize_|predict_|process_|provide_|recalculate_|update_|add_to_" | sed 's/.*\([a-z_]*\): {.*/\1/' | sort