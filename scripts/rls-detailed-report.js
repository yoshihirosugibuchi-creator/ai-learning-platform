const { createClient } = require('@supabase/supabase-js')

// 環境変数を読み込み
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAnon = createClient(supabaseUrl, anonKey)
const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function generateDetailedReport() {
  console.log('🚨 RLS詳細セキュリティレポート')
  console.log('=' .repeat(80))
  console.log('実行日時:', new Date().toLocaleString('ja-JP'))
  console.log('プロジェクト:', 'AI Learning Platform Next')
  console.log('データベース:', supabaseUrl)
  console.log('=' .repeat(80))
  console.log('')

  // 重大な問題の一覧
  const criticalTables = [
    { name: 'users', risk: 'CRITICAL', reason: 'ユーザーの個人情報・認証情報が誰でもアクセス可能' },
    { name: 'quiz_sessions', risk: 'HIGH', reason: 'ユーザーの学習履歴が誰でも閲覧・変更可能' },
    { name: 'quiz_answers', risk: 'HIGH', reason: 'ユーザーの回答履歴が誰でも閲覧・変更可能' },
    { name: 'user_xp_stats_v2', risk: 'HIGH', reason: 'ユーザーのXP統計が誰でも閲覧・変更可能' },
    { name: 'user_category_xp_stats_v2', risk: 'HIGH', reason: 'カテゴリー別統計が誰でも閲覧・変更可能' },
    { name: 'user_subcategory_xp_stats_v2', risk: 'HIGH', reason: 'サブカテゴリー別統計が誰でも閲覧・変更可能' },
    { name: 'daily_xp_records', risk: 'HIGH', reason: 'ユーザーの日別活動記録が誰でもアクセス可能' },
    { name: 'skp_transactions', risk: 'CRITICAL', reason: 'SKP取引履歴が誰でも閲覧・操作可能（金銭価値）' },
    { name: 'course_session_completions', risk: 'HIGH', reason: 'コース完了履歴が誰でも閲覧・変更可能' },
    { name: 'wisdom_card_collection', risk: 'MEDIUM', reason: 'ユーザーのコレクション情報が誰でもアクセス可能' }
  ]

  console.log('🚨 【緊急】セキュリティ上の重大な問題')
  console.log('─'.repeat(80))
  console.log('❌ 全てのユーザーデータテーブルでRLS（Row Level Security）が無効')
  console.log('❌ 匿名ユーザーが他のユーザーのデータに無制限でアクセス可能')
  console.log('❌ データの改ざん・削除・不正取得のリスクが非常に高い')
  console.log('')

  console.log('🔍 影響を受けるテーブルの詳細:')
  console.log('─'.repeat(80))
  
  for (const table of criticalTables) {
    const riskIcon = table.risk === 'CRITICAL' ? '🔴' : 
                     table.risk === 'HIGH' ? '🟠' : '🟡'
    
    console.log(`${riskIcon} ${table.name}`)
    console.log(`   リスクレベル: ${table.risk}`)
    console.log(`   問題内容: ${table.reason}`)
    
    // 実際のデータアクセステスト
    try {
      const { data, error } = await supabaseAnon
        .from(table.name)
        .select('*')
        .limit(3)
      
      if (!error && data) {
        console.log(`   ⚠️ 匿名アクセステスト: ${data.length}件のデータが取得可能`)
        if (data.length > 0) {
          const columns = Object.keys(data[0])
          console.log(`   📊 取得可能なカラム: ${columns.slice(0, 5).join(', ')}${columns.length > 5 ? '...' : ''}`)
        }
      } else {
        console.log('   ✅ 匿名アクセス: 拒否されました')
      }
    } catch (e) {
      console.log('   ⚠️ アクセステストエラー:', e.message)
    }
    console.log('')
  }

  console.log('📊 セキュリティ影響度評価:')
  console.log('─'.repeat(80))
  console.log('🔴 CRITICAL (2テーブル): 即座に修正が必要')
  console.log('🟠 HIGH (7テーブル): 緊急対応が必要')
  console.log('🟡 MEDIUM (1テーブル): 可及的速やかに対応')
  console.log('')
  console.log('総合リスクレベル: 🚨 CRITICAL')
  console.log('')

  console.log('🔧 緊急対応策:')
  console.log('─'.repeat(80))
  console.log('1. 【最優先】全ユーザーデータテーブルでRLSを有効化')
  console.log('2. 適切なRLSポリシーを設定（user_id = auth.uid()）')
  console.log('3. 匿名アクセスの無効化確認')
  console.log('4. データ整合性の確認（不正アクセスの痕跡調査）')
  console.log('5. セキュリティ監査の実施')
  console.log('')

  console.log('📋 具体的なRLS設定コマンド例:')
  console.log('─'.repeat(80))
  
  for (const table of criticalTables) {
    console.log(`-- ${table.name}テーブル`)
    console.log(`ALTER TABLE ${table.name} ENABLE ROW LEVEL SECURITY;`)
    if (table.name !== 'users') {
      console.log(`CREATE POLICY "${table.name}_user_access" ON ${table.name}`)
      console.log(`  FOR ALL USING (user_id = auth.uid());`)
    } else {
      console.log(`CREATE POLICY "users_own_data" ON users`)
      console.log(`  FOR ALL USING (id = auth.uid());`)
    }
    console.log('')
  }

  console.log('⚠️ 注意事項:')
  console.log('─'.repeat(80))
  console.log('• RLS有効化により、現在のアプリケーションが正常に動作しなくなる可能性')
  console.log('• supabaseAdminクライアントの使用箇所を事前に確認')
  console.log('• APIエンドポイントでの認証処理の確認')
  console.log('• 段階的な適用とテストを推奨')
  console.log('')

  console.log('🔍 現在のアプリケーション動作への影響予測:')
  console.log('─'.repeat(80))
  await analyzeApplicationImpact()

  console.log('')
  console.log('=' .repeat(80))
  console.log('🚨 このレポートは機密情報です。適切なセキュリティ対策を講じてください。')
  console.log('=' .repeat(80))
}

async function analyzeApplicationImpact() {
  // APIエンドポイントでの影響を分析
  const apiEndpoints = [
    '/api/auth/user',
    '/api/xp-stats-admin', 
    '/api/questions',
    '/api/quiz/category-init',
    '/api/xp-save/quiz'
  ]

  console.log('📱 アプリケーション影響分析:')
  console.log('')
  
  console.log('✅ 正常動作すると予想される機能:')
  console.log('• 匿名でのカテゴリー・問題閲覧')
  console.log('• 認証済みユーザーの自分のデータへのアクセス')
  console.log('• 管理者権限でのデータアクセス（supabaseAdmin使用）')
  console.log('')
  
  console.log('⚠️ 動作しなくなる可能性がある機能:')
  console.log('• 認証なしでのユーザー統計表示')
  console.log('• 他のユーザーデータへの参照')
  console.log('• クライアントサイドでの直接データベースアクセス')
  console.log('')
  
  console.log('🔧 修正が必要になる可能性があるコード:')
  console.log('• lib/supabase-user.ts - ユーザーデータアクセス')
  console.log('• hooks/useXPStats.ts - XP統計取得')
  console.log('• components/profile/ - プロフィール関連')
  console.log('• app/api/ - API認証処理')
}

// 実行
generateDetailedReport().catch(console.error)