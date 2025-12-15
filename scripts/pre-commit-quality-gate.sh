#!/bin/bash
set -e

# 🚨 Git pre-commit品質ゲート - エラー1個でもコミット禁止
# 使用法: .git/hooks/pre-commit (自動実行)

echo "🛡️ Pre-commit Quality Gate Activated"
echo "📁 Project: AI Learning Platform"
echo "🕒 $(date)"
echo "========================================"

# 1. ステージングされたファイルをチェック
STAGED_TS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|tsx)$' || true)
STAGED_JS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(js|jsx)$' || true)

if [[ -z "$STAGED_TS_FILES" && -z "$STAGED_JS_FILES" ]]; then
    echo "ℹ️ No TypeScript/JavaScript files staged, skipping quality checks"
    exit 0
fi

echo "📊 Staged TypeScript files: $(echo "$STAGED_TS_FILES" | wc -l | tr -d ' ')"
echo "📊 Staged JavaScript files: $(echo "$STAGED_JS_FILES" | wc -l | tr -d ' ')"

FAILED_CHECKS=()

# 2. TypeScript厳密チェック
echo ""
echo "🔍 Checking TypeScript..."
if npm run typecheck:strict > /dev/null 2>&1; then
    echo "✅ TypeScript: PASS"
else
    echo "❌ TypeScript: FAIL"
    FAILED_CHECKS+=("TypeScript errors detected")
fi

# 3. ESLint厳密チェック  
echo ""
echo "🔍 Checking ESLint..."
if npm run lint:strict > /dev/null 2>&1; then
    echo "✅ ESLint: PASS"
else
    echo "❌ ESLint: FAIL"
    FAILED_CHECKS+=("ESLint errors/warnings detected")
fi

# 4. 結果判定
echo ""
echo "📊 PRE-COMMIT CHECK SUMMARY"
echo "========================================"

if [ ${#FAILED_CHECKS[@]} -eq 0 ]; then
    echo "🎉 ALL PRE-COMMIT CHECKS PASSED!"
    echo "✅ Ready to commit"
    exit 0
else
    echo "💥 PRE-COMMIT CHECK FAILED!"
    echo "❌ Issues found:"
    for issue in "${FAILED_CHECKS[@]}"; do
        echo "   - $issue"
    done
    echo ""
    echo "🚨 COMMIT BLOCKED - Fix all errors first!"
    echo "💡 Run: npm run quality:full-check"
    exit 1
fi