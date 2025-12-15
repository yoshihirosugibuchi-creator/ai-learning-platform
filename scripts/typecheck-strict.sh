#!/bin/bash
set -e

# 🚨 厳密TypeScriptチェック - 全ファイル強制検証
# 使用法: npm run typecheck:strict

echo "🔍 Starting STRICT TypeScript check..."
echo "📁 Project: AI Learning Platform"
echo "🕒 $(date)"
echo "----------------------------------------"

# 1. TypeScriptファイル数確認
TS_FILES=$(find . -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v .next | grep -v backups | wc -l)
echo "📊 Total TypeScript files: $TS_FILES"

# 2. 厳密型チェック実行
echo "🔍 Running comprehensive type check..."
START_TIME=$(date +%s)

# Next.jsビルド時の型チェックを無視し、直接tscで全ファイルチェック
if npx tsc --noEmit --skipLibCheck false --strict true; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo "✅ PASS: No TypeScript errors found!"
    echo "⏱️ Duration: ${DURATION}s"
    echo "📊 Files checked: $TS_FILES"
    exit 0
else
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo "❌ FAIL: TypeScript errors detected!"
    echo "⏱️ Duration: ${DURATION}s"
    echo ""
    echo "🚨 CRITICAL: Fix all TypeScript errors before proceeding"
    echo "💡 Individual file check: npx tsc --noEmit [file_path]"
    exit 1
fi