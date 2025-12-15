#!/bin/bash
set -e

# 🚨 品質フルチェック - デプロイ前必須実行
# 使用法: npm run quality:full-check

echo "🎯 Starting FULL QUALITY CHECK..."
echo "📁 Project: AI Learning Platform"
echo "🕒 $(date)"
echo "========================================"

TOTAL_START=$(date +%s)
FAILED_CHECKS=()

# 1. TypeScript厳密チェック
echo ""
echo "🔍 Phase 1: TypeScript Strict Check"
echo "----------------------------------------"
if bash scripts/typecheck-strict.sh; then
    echo "✅ TypeScript: PASS"
else
    echo "❌ TypeScript: FAIL"
    FAILED_CHECKS+=("TypeScript")
fi

# 2. ESLint厳密チェック
echo ""
echo "🔍 Phase 2: ESLint Strict Check"
echo "----------------------------------------"
if bash scripts/lint-strict.sh; then
    echo "✅ ESLint: PASS"
else
    echo "❌ ESLint: FAIL"
    FAILED_CHECKS+=("ESLint")
fi

# 3. 厳密ビルドチェック
echo ""
echo "🔍 Phase 3: Build Strict Check"
echo "----------------------------------------"
if bash scripts/build-strict.sh; then
    echo "✅ Build: PASS"
else
    echo "❌ Build: FAIL"
    FAILED_CHECKS+=("Build")
fi

# 4. 結果サマリー
echo ""
echo "📊 QUALITY CHECK SUMMARY"
echo "========================================"
TOTAL_END=$(date +%s)
TOTAL_DURATION=$((TOTAL_END - TOTAL_START))

if [ ${#FAILED_CHECKS[@]} -eq 0 ]; then
    echo "🎉 ALL CHECKS PASSED!"
    echo "✅ TypeScript: 0 errors"
    echo "✅ ESLint: 0 errors/warnings"
    echo "✅ Build: Success"
    echo "⏱️ Total time: ${TOTAL_DURATION}s"
    echo ""
    echo "🚀 READY FOR DEPLOYMENT!"
    exit 0
else
    echo "💥 QUALITY CHECK FAILED!"
    echo "❌ Failed checks: ${FAILED_CHECKS[*]}"
    echo "⏱️ Total time: ${TOTAL_DURATION}s"
    echo ""
    echo "🚨 DO NOT DEPLOY - Fix all errors first!"
    exit 1
fi