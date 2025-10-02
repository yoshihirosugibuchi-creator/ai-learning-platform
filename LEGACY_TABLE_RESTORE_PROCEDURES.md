# レガシーテーブル リストア手順書

**作成日**: 2025年10月1日  
**バックアップ日**: 2025年10月1日 14:10:03  
**対象**: AI学習プラットフォーム レガシーテーブル復旧  

## 📋 概要

本手順書は、誤ってまたは問題発生時にレガシーテーブルを緊急復旧するための手順を示します。

### バックアップファイル情報
- **保存場所**: `./database/backup/legacy_tables_backup_20251001/`
- **総レコード数**: 708件
- **バックアップ形式**: JSON（構造化データ）
- **対象テーブル**: 8テーブル

## 🚨 緊急復旧手順

### ステップ1: 状況確認

```bash
# 1. バックアップファイルの存在確認
ls -la ./database/backup/legacy_tables_backup_20251001/

# 2. 削除されたテーブルの確認（エラーが出ることを確認）
# 例: category_progressテーブルの存在確認
npx ts-node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
supabase.from('category_progress').select('count').then(r => console.log('テーブル存在:', !r.error))
"
```

### ステップ2: テーブル再作成

**⚠️ 注意**: テーブル構造の再作成は複雑です。以下はサンプルであり、実際のスキーマは元のSupabaseバックアップから確認してください。

```sql
-- Supabase SQLエディタで実行

-- 1. category_progress テーブル
CREATE TABLE IF NOT EXISTS category_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id text NOT NULL,
  current_level integer DEFAULT 1,
  total_xp integer DEFAULT 0,
  correct_answers integer DEFAULT 0,
  total_answers integer DEFAULT 0,
  last_answered_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 2. quiz_results テーブル
CREATE TABLE IF NOT EXISTS quiz_results (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id text NOT NULL,
  subcategory_id text,
  questions jsonb NOT NULL,
  answers jsonb NOT NULL,
  score integer NOT NULL,
  total_questions integer NOT NULL,
  time_taken integer NOT NULL,
  completed_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- 3. detailed_quiz_data テーブル
CREATE TABLE IF NOT EXISTS detailed_quiz_data (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_result_id uuid,
  question_id text NOT NULL,
  question_text text,
  selected_answer text,
  correct_answer text,
  is_correct boolean NOT NULL,
  response_time integer,
  confidence_level text,
  category text,
  difficulty text,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. user_progress テーブル
CREATE TABLE IF NOT EXISTS user_progress (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id text NOT NULL,
  subcategory_id text NOT NULL,
  correct_answers integer DEFAULT 0,
  total_attempts integer DEFAULT 0,
  last_accessed timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- 5. user_xp_stats (v1) テーブル
CREATE TABLE IF NOT EXISTS user_xp_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp integer DEFAULT 0,
  quiz_xp integer DEFAULT 0,
  course_xp integer DEFAULT 0,
  bonus_xp integer DEFAULT 0,
  quiz_sessions_completed integer DEFAULT 0,
  course_sessions_completed integer DEFAULT 0,
  current_level integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 6. user_category_xp_stats (v1) テーブル
CREATE TABLE IF NOT EXISTS user_category_xp_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id text NOT NULL,
  total_xp integer DEFAULT 0,
  quiz_xp integer DEFAULT 0,
  course_xp integer DEFAULT 0,
  current_level integer DEFAULT 1,
  quiz_sessions_completed integer DEFAULT 0,
  course_sessions_completed integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 7. user_subcategory_xp_stats (v1) テーブル
CREATE TABLE IF NOT EXISTS user_subcategory_xp_stats (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id text NOT NULL,
  subcategory_id text NOT NULL,
  total_xp integer DEFAULT 0,
  quiz_xp integer DEFAULT 0,
  course_xp integer DEFAULT 0,
  current_level integer DEFAULT 1,
  quiz_sessions_completed integer DEFAULT 0,
  course_sessions_completed integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 8. xp_settings テーブル
CREATE TABLE IF NOT EXISTS xp_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  setting_description text,
  setting_type text DEFAULT 'string',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
```

### ステップ3: データ復旧スクリプト実行

```typescript
// scripts/restore-legacy-tables.ts
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'YOUR_SERVICE_ROLE_KEY' // 実際のキーに置換

const supabase = createClient(supabaseUrl, supabaseKey)

async function restoreLegacyTables() {
  const backupDir = './database/backup/legacy_tables_backup_20251001'
  const tables = [
    'category_progress',
    'detailed_quiz_data', 
    'quiz_results',
    'user_category_xp_stats',
    'user_progress',
    'user_subcategory_xp_stats',
    'user_xp_stats',
    'xp_settings'
  ]
  
  for (const tableName of tables) {
    try {
      const backupFile = path.join(backupDir, `${tableName}_backup.json`)
      const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'))
      
      console.log(`📥 ${tableName}: ${backupData.recordCount}件復旧中...`)
      
      if (backupData.data && backupData.data.length > 0) {
        const { error } = await supabase
          .from(tableName)
          .insert(backupData.data)
        
        if (error) {
          console.error(`❌ ${tableName}:`, error)
        } else {
          console.log(`✅ ${tableName}: 復旧完了`)
        }
      }
    } catch (err) {
      console.error(`❌ ${tableName} 復旧エラー:`, err)
    }
  }
}

restoreLegacyTables()
```

### ステップ4: 復旧確認

```bash
# データベース接続確認
npx ts-node -e "
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkTables() {
  const tables = ['category_progress', 'quiz_results', 'detailed_quiz_data', 'user_progress', 'user_xp_stats', 'user_category_xp_stats', 'user_subcategory_xp_stats', 'xp_settings'];
  
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(\`\${table}: \${error ? 'エラー' : count + '件'}\`);
  }
}

checkTables();
"
```

### ステップ5: アプリケーション修正

復旧後は、以下の修正済みファイルを元に戻す必要があります：

1. **`app/api/admin/reset-user-data/route.ts`**
   - レガシーテーブル削除処理のコメントを解除

2. **`app/api/admin/force-reset/route.ts`**
   - レガシーテーブルをtablesToResetに追加

3. **`lib/supabase-quiz.ts`**
   - getUserStats関数をレガシー版に戻す
   - レガシー関数のコメントを解除

4. **`lib/supabase-learning.ts`**
   - detailed_quiz_data関数を有効化

5. **`lib/ai-analytics.ts`**
   - detailed_quiz_dataテーブル参照に戻す

6. **`lib/database-types.ts`**
   - レガシーテーブル型定義のコメントを解除

## 📊 復旧後の確認事項

1. **ビルドテスト**: `npm run build`
2. **TypeScriptチェック**: `npx tsc --noEmit`
3. **ESLintチェック**: `npm run lint`
4. **機能テスト**: 
   - クイズ機能の動作確認
   - プロファイル統計の表示確認
   - 管理画面の動作確認

## 🔧 トラブルシューティング

### よくある問題

1. **テーブル作成エラー**
   - RLS (Row Level Security) の設定が必要な場合があります
   - 外部キー制約エラーが発生する可能性があります

2. **データ挿入エラー**
   - UUID重複エラー: id フィールドを除外して挿入
   - 型不一致エラー: バックアップデータの型を確認

3. **権限エラー**
   - SERVICE_ROLE_KEYが正しく設定されているか確認
   - Supabaseプロジェクトの権限設定を確認

### 緊急連絡先

- **開発者**: Claude Code AI Assistant
- **プロジェクト**: AI学習プラットフォーム
- **バックアップ作成日**: 2025年10月1日

---

**⚠️ 重要**: この手順書は緊急時用です。通常の運用では、v2テーブルシステムを使用してください。