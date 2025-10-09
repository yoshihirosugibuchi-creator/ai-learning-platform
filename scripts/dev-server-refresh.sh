#!/bin/bash

# 開発サーバー完全リフレッシュスクリプト
# マニフェストエラー・メモリエラー解決用

echo "🔄 Starting development server refresh..."
echo "📅 $(date)"
echo ""

# Step 1: 既存プロセスの確認と停止
echo "🛑 Step 1: Stopping existing processes..."
pkill -f "next dev" 2>/dev/null && echo "   ✅ Stopped Next.js dev processes" || echo "   ℹ️  No Next.js processes running"
pkill -f "npm run dev" 2>/dev/null && echo "   ✅ Stopped npm dev processes" || echo "   ℹ️  No npm dev processes running"

# 少し待機
sleep 2

# Step 2: キャッシュの完全削除
echo ""
echo "🧹 Step 2: Complete cache cleanup..."
echo "   🗑️  Removing .next directory..."
rm -rf .next
echo "   🗑️  Removing node_modules cache..."
rm -rf node_modules/.cache
echo "   🗑️  Clearing npm cache..."
npm cache clean --force 2>/dev/null
echo "   🗑️  Removing temporary files..."
rm -rf .next/static/development/_buildManifest.js.tmp.*
echo "   ✅ Cache cleanup completed"

# Step 3: メモリ使用状況確認
echo ""
echo "💾 Step 3: Memory status..."
if command -v free >/dev/null 2>&1; then
    echo "   Memory usage:"
    free -h | head -2
else
    echo "   Memory check not available on this system"
fi

# Step 4: ポート確認とクリーンアップ
echo ""
echo "🔌 Step 4: Port cleanup..."
PORT_3000=$(lsof -ti:3000 2>/dev/null)
if [ ! -z "$PORT_3000" ]; then
    echo "   🔍 Found process on port 3000: $PORT_3000"
    kill -9 $PORT_3000 2>/dev/null
    echo "   ✅ Killed process on port 3000"
else
    echo "   ✅ Port 3000 is free"
fi

# Step 5: TypeScript/ESLint確認（オプション）
echo ""
echo "🔍 Step 5: Code quality check (optional)..."

# 環境変数でコード品質チェックを制御（デフォルトはスキップ）
if [ "${DEV_REFRESH_CHECK_CODE:-}" = "true" ]; then
    echo "   🔍 Running TypeScript check..."
    npm run typecheck
    if [ $? -eq 0 ]; then
        echo "   ✅ TypeScript check passed"
        echo "   🔍 Running ESLint check..."
        npm run lint
        if [ $? -eq 0 ]; then
            echo "   ✅ ESLint check passed"
        else
            echo "   ⚠️  ESLint warnings found (continuing anyway)"
        fi
    else
        echo "   ❌ TypeScript errors found (continuing anyway)"
    fi
else
    echo "   ⏭️  Skipping code quality check"
fi

# Step 6: 新しい開発サーバー起動
echo ""
echo "🚀 Step 6: Starting fresh development server..."
echo "   📦 Using Next.js with Turbopack"
echo "   🌐 Will be available at: http://localhost:3000"
echo ""
echo "   Starting in 3 seconds..."
sleep 1
echo "   Starting in 2 seconds..."
sleep 1
echo "   Starting in 1 second..."
sleep 1
echo ""

# 開発サーバー起動
echo "🔥 Launching development server..."
npm run dev

# このスクリプトがCtrl+Cで終了された場合の処理
trap 'echo ""; echo "🛑 Development server stopped"; exit 0' INT

echo "✅ Development server refresh completed!"