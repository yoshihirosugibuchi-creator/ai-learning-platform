import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyDatabaseTypes() {
  console.log('🔍 Database型定義とスキーマの整合性チェック')
  console.log('='.repeat(60))
  
  const tablesToCheck = [
    'users',
    'user_xp_stats_v2',
    'user_category_xp_stats_v2', 
    'user_subcategory_xp_stats_v2',
    'daily_xp_records',
    'quiz_sessions',
    'quiz_answers',
    'course_session_completions',
    'skp_transactions'
  ]
  
  for (const tableName of tablesToCheck) {
    console.log(`\n📋 ${tableName} テーブル検証:`)
    
    try {
      // 実際のデータを1件取得してスキーマ分析
      const { data: sampleData, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
      if (error) {
        console.log(`❌ ${tableName}: アクセスエラー - ${error.message}`)
        continue
      }
      
      if (!sampleData || sampleData.length === 0) {
        console.log(`⚠️ ${tableName}: データが空 - スキーマ確認不可`)
        continue
      }
      
      const sample = sampleData[0]
      console.log(`✅ ${tableName}: データ取得成功`)
      
      // nullフィールドの検出
      const nullFields: string[] = []
      const nonNullFields: string[] = []
      
      Object.entries(sample).forEach(([key, value]) => {
        if (value === null) {
          nullFields.push(key)
        } else {
          nonNullFields.push(key)
        }
      })
      
      if (nullFields.length > 0) {
        console.log(`🔶 NULL値フィールド (${nullFields.length}個):`)
        nullFields.forEach(field => {
          const fieldType = typeof sample[field]
          console.log(`  - ${field}: ${fieldType} (null)`)
        })
      }
      
      console.log(`📊 非NULL値フィールド (${nonNullFields.length}個):`)
      nonNullFields.slice(0, 5).forEach(field => {
        const value = sample[field]
        const type = Array.isArray(value) ? 'array' : typeof value
        const displayValue = type === 'string' ? 
          (value.length > 30 ? value.substring(0, 30) + '...' : value) : 
          String(value)
        console.log(`  - ${field}: ${type} (${displayValue})`)
      })
      
      if (nonNullFields.length > 5) {
        console.log(`  ... 他${nonNullFields.length - 5}個のフィールド`)
      }
      
    } catch (error) {
      console.log(`❌ ${tableName}: 検証エラー - ${error}`)
    }
  }
  
  console.log('\n📋 型定義見直しが必要な可能性があるテーブル:')
  console.log('💡 推奨アクション:')
  console.log('1. 各テーブルの実データでnullが存在するフィールドを特定')
  console.log('2. Database型定義でnull許可されていないフィールドを修正')
  console.log('3. データアクセス層でのnull安全処理を統一')
  console.log('4. TypeScript strict null checkの完全対応')
  
  console.log('\n✅ 検証完了')
}

verifyDatabaseTypes()