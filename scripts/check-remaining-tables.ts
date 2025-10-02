import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRemainingTables() {
  console.log('🔍 未チェック18テーブルのnullフィールド検証')
  console.log('='.repeat(60))
  
  const remainingTables = [
    'categories',
    'category_stats', 
    'course_completions',
    'course_theme_completions',
    'knowledge_card_collection',
    'learning_courses',
    'learning_genres',
    'learning_progress',
    'learning_sessions',
    'learning_themes',
    'quiz_questions',
    'session_contents',
    'session_quizzes', 
    'skill_levels',
    'subcategories',
    'user_badges',
    'user_settings',
    'wisdom_card_collection'
  ]
  
  const problemTables: string[] = []
  
  for (const tableName of remainingTables) {
    try {
      console.log(`\n📋 ${tableName}:`)
      
      // サンプルデータ取得
      const { data: sampleData, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`❌ アクセスエラー: ${error.message}`)
        continue
      }
      
      if (!sampleData || sampleData.length === 0) {
        console.log(`⚠️ データが空`)
        continue
      }
      
      const sample = sampleData[0]
      
      // nullフィールドを検出
      const nullFields = Object.entries(sample)
        .filter(([_, value]) => value === null)
        .map(([key, _]) => key)
      
      if (nullFields.length > 0) {
        console.log(`🔶 NULL値フィールド (${nullFields.length}個): ${nullFields.join(', ')}`)
        problemTables.push(`${tableName} (${nullFields.length}個)`)
      } else {
        console.log(`✅ 全フィールド非null`)
      }
      
    } catch (error) {
      console.log(`❌ ${tableName}: 検証エラー - ${error}`)
    }
  }
  
  console.log('\n📊 チェック結果サマリー:')
  console.log(`✅ チェック完了テーブル: ${remainingTables.length}`)
  
  if (problemTables.length > 0) {
    console.log(`🔶 null値を含むテーブル (${problemTables.length}個):`)
    problemTables.forEach(table => {
      console.log(`   - ${table}`)
    })
    
    console.log('\n🔧 要対応: Database型定義でnull許可が必要な可能性があります')
  } else {
    console.log('🎉 すべてのテーブルでnull値なし - 型定義修正不要')
  }
  
  console.log('\n✅ 残りテーブルチェック完了')
}

checkRemainingTables()