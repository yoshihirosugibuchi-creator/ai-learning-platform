#!/bin/bash

# プリコミット検証スクリプト
# デグレ防止: 重要なAPIフィールドの存在確認

set -e

echo "🔍 Pre-commit regression prevention checks..."

# 1. TypeScript/ESLint チェック
echo "📋 Step 1: TypeScript and ESLint validation"
npm run typecheck
npm run lint

# 2. 重要APIフィールドの存在確認
echo "📋 Step 2: Critical API field validation"

# course completion API のセッション時間フィールド確認
COURSE_API_FILE="app/api/xp-save/course/route.ts"

if [ -f "$COURSE_API_FILE" ]; then
  echo "   🔍 Checking $COURSE_API_FILE for session time fields..."
  
  # session_start_time フィールド確認
  if ! grep -q "session_start_time.*body\.session_start_time" "$COURSE_API_FILE"; then
    echo "   ❌ ERROR: session_start_time field missing in $COURSE_API_FILE"
    echo "   This field is required to prevent session time recording regression!"
    exit 1
  fi
  
  # session_end_time フィールド確認  
  if ! grep -q "session_end_time.*body\.session_end_time" "$COURSE_API_FILE"; then
    echo "   ❌ ERROR: session_end_time field missing in $COURSE_API_FILE"
    echo "   This field is required to prevent session time recording regression!"
    exit 1
  fi
  
  # duration_seconds フィールド確認
  if ! grep -q "duration_seconds.*body\.duration_seconds" "$COURSE_API_FILE"; then
    echo "   ❌ ERROR: duration_seconds field missing in $COURSE_API_FILE"
    echo "   This field is required to prevent session time recording regression!"
    exit 1
  fi
  
  echo "   ✅ All session time fields present in $COURSE_API_FILE"
else
  echo "   ⚠️  WARNING: $COURSE_API_FILE not found"
fi

# 3. データベース型定義ファイル確認
echo "📋 Step 3: Database type definitions validation"

DB_TYPES_FILE="lib/database-types-official.ts"
if [ -f "$DB_TYPES_FILE" ]; then
  echo "   ✅ Database types file exists: $DB_TYPES_FILE"
  
  # 重要な型定義の存在確認
  if ! grep -q "course_session_completions" "$DB_TYPES_FILE"; then
    echo "   ❌ ERROR: course_session_completions table definition missing"
    exit 1
  fi
  
  echo "   ✅ Core table definitions present"
else
  echo "   ❌ ERROR: Database types file missing: $DB_TYPES_FILE"
  exit 1
fi

# 4. 重要設定ファイルの確認
echo "📋 Step 4: Configuration files validation"

ENV_FILE=".env.local"
if [ -f "$ENV_FILE" ]; then
  echo "   ✅ Environment file exists: $ENV_FILE"
else
  echo "   ⚠️  WARNING: Environment file missing: $ENV_FILE"
fi

# 5. CLAUDEガイドライン確認
CLAUDE_MD="CLAUDE.md"
if [ -f "$CLAUDE_MD" ]; then
  echo "   ✅ Claude development guide exists: $CLAUDE_MD"
else
  echo "   ⚠️  WARNING: Claude guide missing: $CLAUDE_MD"
fi

echo ""
echo "🎉 All pre-commit regression prevention checks passed!"
echo "✅ Ready to commit - no critical regressions detected"