# Claude Code デバッグ・調査ガイドライン

**目的**: Claude Codeでの効率的なデバッグ・データ調査手順  
**作成日**: 2025年10月6日  
**重要**: 環境変数エラーの回避と効率的な調査手順

---

## 🚨 **環境変数エラー回避（絶対必須）**

### **問題**: 直接スクリプト実行での環境変数エラー
```bash
# ❌ 常にエラーになる
npx tsx scripts/debug-script.ts
# Error: Missing Supabase environment variables
```

### **解決策**: APIエンドポイント経由でのデバッグ

```typescript
// ✅ 正しいアプローチ：APIエンドポイント作成
// app/api/debug/[purpose]/route.ts

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin' // 環境変数は既に設定済み

export async function GET() {
  try {
    // デバッグロジック
    const { data, error } = await supabaseAdmin
      .from('table_name')
      .select('*')
    
    console.log('Debug result:', data) // サーバーログに出力
    return NextResponse.json({ data, timestamp: new Date().toISOString() })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### **アクセス方法**
```
http://localhost:3000/api/debug/[purpose]
```

---

## 🔍 **データベース調査の効率的手順**

### **1. テーブル存在・件数確認**
```typescript
// 総件数確認（RLS無効化済みの場合）
const { count } = await supabaseAdmin
  .from('table_name')
  .select('*', { count: 'exact', head: true })

console.log(`Total records: ${count}`)
```

### **2. ユーザー固有データ確認**
```typescript
// 特定ユーザーのデータ
const { data } = await supabaseAdmin
  .from('table_name')
  .select('*')
  .eq('user_id', USER_ID)
  .order('created_at', { ascending: false })
  // .limit(5) ← 調査時は制限しない
```

### **3. データ整合性チェック**
```typescript
// 複数テーブル間の整合性確認
const userStats = await supabaseAdmin.from('user_xp_stats_v2').select('*').eq('user_id', USER_ID).single()
const dailyRecords = await supabaseAdmin.from('daily_xp_records').select('*').eq('user_id', USER_ID)
const categoryStats = await supabaseAdmin.from('user_category_xp_stats_v2').select('*').eq('user_id', USER_ID)

// 整合性確認
const userTotal = userStats?.total_learning_time_seconds || 0
const dailyTotal = dailyRecords?.reduce((sum, r) => sum + (r.total_time_seconds || 0), 0) || 0
const categoryTotal = categoryStats?.reduce((sum, c) => sum + (c.total_learning_time_seconds || 0), 0) || 0

console.log('Time consistency check:', { userTotal, dailyTotal, categoryTotal })
```

---

## 📊 **学習時間データ調査テンプレート**

### **クイズ・コース学習データ統合分析**
```typescript
// 1. クイズセッション分析
const quizSessions = await supabaseAdmin
  .from('quiz_sessions')
  .select('id, session_start_time, session_end_time, total_questions')
  .eq('user_id', USER_ID)

// 2. 問題回答分析（クイズ+コース学習）
const quizAnswers = await supabaseAdmin
  .from('quiz_answers')
  .select('id, question_id, time_spent, category_id, subcategory_id, is_correct')
  .eq('user_id', USER_ID)

// 3. コース学習データ分析
const courseCompletions = await supabaseAdmin
  .from('course_session_completions')
  .select('id, duration_seconds, course_id')
  .eq('user_id', USER_ID)

// 4. 時間データ集計
const sessionTime = quizSessions?.reduce((sum, s) => {
  if (s.session_start_time && s.session_end_time) {
    return sum + Math.round((new Date(s.session_end_time).getTime() - new Date(s.session_start_time).getTime()) / 1000)
  }
  return sum
}, 0) || 0

const answerTime = quizAnswers?.reduce((sum, a) => sum + (a.time_spent || 0), 0) || 0
const courseTime = courseCompletions?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) || 0

console.log('Time analysis:', { sessionTime, answerTime, courseTime })
```

---

## ⚠️ **よくある問題と対策**

### **1. データが0件で表示される**
- **原因**: RLS設定、ユーザーID違い、テーブル名違い
- **確認**: Supabaseテーブルエディターで実際のデータ件数を確認
- **対策**: 全件取得クエリで総件数確認

### **2. 学習時間が一致しない**
- **原因**: 複数テーブルで異なる計算ロジック
- **確認**: 各テーブルの時間フィールドを全て調査
- **対策**: データソースの統一または計算ロジックの共通化

### **3. quiz_answersにコース学習データが混在**
- **確認**: `category_id`, `subcategory_id`, `question_id`でコース学習を識別
- **分離**: データ種別によるフィルタリング実装

---

## 📝 **デバッグAPI命名規則**

```
/api/debug/table-analysis          - テーブル構造・件数分析
/api/debug/data-consistency        - データ整合性チェック
/api/debug/time-calculation        - 学習時間計算分析
/api/debug/user-data/[userId]      - 特定ユーザーデータ分析
/api/debug/emergency-check         - 緊急時のデータ存在確認
```

---

## 🔧 **今後の改善方針**

1. **環境変数管理の統一**: 全てのデバッグをAPI経由に統一
2. **データ整合性の自動チェック**: 定期的な整合性確認システム
3. **学習時間計算の共通化**: 単一ソースでの時間計算ロジック
4. **デバッグAPIの体系化**: 目的別のAPI整備

---

**注意**: このドキュメントは作業効率化のため、必ず最新状態に保ってください。