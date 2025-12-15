#!/bin/bash
set -e

# 🚨 プロジェクトコードのみ厳密TypeScriptチェック - 外部ライブラリエラー除外
# 使用法: npm run typecheck:project

echo "🔍 Starting PROJECT-ONLY TypeScript check..."
echo "📁 Project: AI Learning Platform"
echo "🕒 $(date)"
echo "----------------------------------------"

# 1. プロジェクトTypeScriptファイル数確認（外部ライブラリ除外）
PROJECT_TS_FILES=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next | grep -v backups | wc -l)
echo "📊 Project TypeScript files: $PROJECT_TS_FILES"

# 2. プロジェクトコードのみの型チェック実行
echo "🔍 Running project code type check..."
START_TIME=$(date +%s)

# プロジェクトファイルのみをチェック（外部ライブラリスキップ）
PROJECT_FILES=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next | grep -v backups)
ERROR_COUNT=0

# プロジェクト全体をチェック（tsconfig.json設定使用）
if ! npx tsc --noEmit --project . > /dev/null 2>&1; then
    echo ""
    echo "❌ PROJECT CODE ERRORS FOUND:"
    echo "----------------------------------------"
    # エラー詳細を表示
    npx tsc --noEmit --project . 2>&1 | head -20
    ERROR_COUNT=1
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

if [ $ERROR_COUNT -eq 0 ]; then
    echo "✅ PASS: No TypeScript errors in project code!"
    echo "⏱️ Duration: ${DURATION}s"
    echo "📊 Project files checked: $PROJECT_TS_FILES"
    exit 0
else
    echo ""
    echo "❌ FAIL: $ERROR_COUNT TypeScript errors in project code!"
    echo "⏱️ Duration: ${DURATION}s"
    echo ""
    echo "🚨 CRITICAL: Fix project TypeScript errors before proceeding"
    echo "💡 Check specific file: npx tsc --noEmit --skipLibCheck true [file_path]"
    exit 1
fi