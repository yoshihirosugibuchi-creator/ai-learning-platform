#!/bin/bash

# Phase 4: XP_SKP_HARDCODE_ELIMINATION_PROJECT データ修正実行スクリプト
# 
# 実行順序:
# 1. quiz_answersのearned_xp修正
# 2. 統計テーブルの再集計
# 3. 検証・整合性チェック
#
# 使用方法:
# chmod +x scripts/run-xp-data-fix.sh
# ./scripts/run-xp-data-fix.sh

# .env.local から環境変数を読み込み
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

echo "🚀 XP_SKP_HARDCODE_ELIMINATION_PROJECT Phase 4 データ修正開始"
echo "========================================================"
echo ""

# 環境変数チェック
if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" || -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    echo "❌ エラー: 必要な環境変数が設定されていません"
    echo "   NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:0:30}..."
    echo "   SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:30}..."
    echo ""
    echo "💡 .env.local ファイルを確認してください"
    exit 1
fi

echo "✅ 環境変数確認OK"
echo "   SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL:0:50}..."
echo "   SERVICE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:30}..."
echo ""

# TypeScript コンパイルチェック
echo "🔍 TypeScript コンパイルチェック..."
npm run typecheck
if [ $? -ne 0 ]; then
    echo "❌ TypeScript エラーがあります。修正してから再実行してください。"
    exit 1
fi
echo "✅ TypeScript OK"
echo ""

# 実行確認
echo "⚠️  重要な注意事項:"
echo "   - このスクリプトは本番データベースの既存データを変更します"
echo "   - 必ずデータベースのバックアップを事前に取得してください"
echo "   - 実行には数分〜数十分かかる場合があります"
echo ""

read -p "🤔 続行しますか？ (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 実行をキャンセルしました"
    exit 1
fi

echo ""
echo "🎯 Step 1: quiz_answers earned_xp 修正実行中 (全件対象)..."
echo "========================================================"

# Step 1: quiz_answers修正 (全件)
npx tsx scripts/fix-quiz-answers-earned-xp.ts

if [ $? -ne 0 ]; then
    echo "❌ quiz_answers修正でエラーが発生しました"
    echo "   ログを確認して問題を解決してから再実行してください"
    exit 1
fi

echo ""
echo "🎯 Step 2: course_session_completions earned_xp 修正実行中 (全件対象)..."
echo "========================================================"

# Step 2: course_session_completions修正 (全件)
npx tsx scripts/fix-course-earned-xp.ts

if [ $? -ne 0 ]; then
    echo "❌ course_session_completions修正でエラーが発生しました"
    echo "   ログを確認して問題を解決してから再実行してください"
    exit 1
fi

echo ""
echo "🎯 Step 3: 統計テーブル再集計実行中..."
echo "========================================================"

# Step 3: 統計再集計
npx tsx scripts/recalculate-user-statistics.ts

if [ $? -ne 0 ]; then
    echo "❌ 統計再集計でエラーが発生しました"
    echo "   ログを確認して問題を解決してください"
    exit 1
fi

echo ""
echo "🎯 Step 3: 整合性検証実行中..."
echo "========================================================"

# Step 3: 検証用API呼び出し (開発サーバーが起動している場合)
if curl -s http://localhost:3000/api/debug/xp-settings-raw > /dev/null 2>&1; then
    echo "📊 検証用データ取得中..."
    
    # 検証データを取得してファイルに保存
    curl -s http://localhost:3000/api/debug/xp-settings-raw > verification_results.json
    echo "✅ 検証結果を verification_results.json に保存しました"
    echo ""
    
    # 基本的な検証結果を表示
    echo "🔍 基本検証結果:"
    echo "   最新のクイズXP値: $(cat verification_results.json | grep -o '"quiz_earned_xp_values":\[[^]]*\]' | head -1)"
    echo "   最新のコースXP値: $(cat verification_results.json | grep -o '"course_xp_values":\[[^]]*\]' | head -1)"
    echo ""
else
    echo "⚠️  開発サーバーが起動していないため、API検証をスキップします"
    echo "   手動で以下を確認してください:"
    echo "   1. 新しいクイズ実行 → 難易度別XPが正しく付与されること"
    echo "   2. プロフィール画面 → 統計値が正しく表示されること"
    echo ""
fi

echo "🎉 Phase 4 データ修正完了!"
echo "========================================================"
echo ""
echo "📋 実行完了サマリ:"
echo "   ✅ quiz_answers earned_xp 修正完了"
echo "   ✅ 統計テーブル再集計完了"
echo "   ✅ 基本検証実行完了"
echo ""
echo "📝 次のステップ:"
echo "   1. クイズ・コース学習を実際に実行してXP付与をテスト"
echo "   2. プロフィール画面で統計値の表示を確認"
echo "   3. 問題がなければ Phase 2 (フォールバック設定) の実装"
echo ""
echo "🎯 XP_SKP_HARDCODE_ELIMINATION_PROJECT Phase 4 完了!"