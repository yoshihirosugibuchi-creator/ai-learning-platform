#!/bin/bash
set -e

# 🚨 厳密ビルドチェック - 型エラー・ESLintエラー検出時強制失敗
# 使用法: npm run build:strict

echo "🔍 Starting STRICT Next.js build..."
echo "📁 Project: AI Learning Platform"
echo "🕒 $(date)"
echo "----------------------------------------"

# 1. 事前クリーンアップ
echo "🧹 Cleaning previous build..."
rm -rf .next
rm -rf out
npm cache clean --force > /dev/null 2>&1

# 2. 厳密ビルド実行
echo "🔨 Running Next.js build with strict error checking..."
START_TIME=$(date +%s)

# next.config.tsの設定により、TypeScript・ESLintエラーでビルド失敗
if npm run build; then
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo "✅ PASS: Build completed successfully!"
    echo "⏱️ Duration: ${DURATION}s"
    exit 0
else
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo "❌ FAIL: Build failed due to errors!"
    echo "⏱️ Duration: ${DURATION}s"
    echo ""
    echo "🚨 CRITICAL: Fix all build errors before proceeding"
    echo "💡 Run individual checks:"
    echo "   - npm run typecheck:strict"
    echo "   - npm run lint:strict"
    exit 1
fi