#!/bin/bash
set -e

# 🚨 厳密ESLintチェック - 全ファイル強制検証
# 使用法: npm run lint:strict

echo "🔍 Starting STRICT ESLint check..."
echo "📁 Project: AI Learning Platform"
echo "🕒 $(date)"
echo "----------------------------------------"

# 1. 対象ファイル数確認
LINT_FILES=$(find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | grep -v node_modules | grep -v .next | grep -v backups | wc -l)
echo "📊 Total lint target files: $LINT_FILES"

# 2. 厳密ESLintチェック実行
echo "🔍 Running comprehensive ESLint check..."
START_TIME=$(date +%s)

if npx eslint . --ext .ts,.tsx,.js,.jsx --max-warnings 0; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo "✅ PASS: No ESLint errors or warnings found!"
    echo "⏱️ Duration: ${DURATION}s"
    echo "📊 Files checked: $LINT_FILES"
    exit 0
else
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo "❌ FAIL: ESLint errors/warnings detected!"
    echo "⏱️ Duration: ${DURATION}s"
    echo ""
    echo "🚨 CRITICAL: Fix all ESLint errors/warnings before proceeding"
    echo "💡 Auto fix: npx eslint . --ext .ts,.tsx,.js,.jsx --fix"
    exit 1
fi