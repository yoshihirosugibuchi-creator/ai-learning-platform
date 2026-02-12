/**
 * ワークフロー状態修正スクリプト
 * - published_course_id を 'aig' に設定
 * - current_step を '5' に更新
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const WORKFLOW_ID = 'e98790b8-9c9d-4a75-8dda-3fb23f01c0e6'
const COURSE_ID = 'aig'

async function fixWorkflowState() {
  console.log('========================================')
  console.log('🔧 ワークフロー状態修正')
  console.log('========================================')

  // 修正前の状態確認
  const { data: before, error: beforeError } = await supabase
    .from('ai_course_workflows')
    .select('id, title, status, current_step, published_course_id')
    .eq('id', WORKFLOW_ID)
    .single()

  if (beforeError) {
    console.error('❌ ワークフロー取得エラー:', beforeError)
    return
  }

  console.log('\n📋 修正前:')
  console.log(`  ID: ${before.id}`)
  console.log(`  タイトル: ${before.title}`)
  console.log(`  ステータス: ${before.status}`)
  console.log(`  現在ステップ: ${before.current_step}`)
  console.log(`  公開コースID: ${before.published_course_id || '(未設定)'}`)

  // 修正実行
  // Step 5のステータスは 'content_draft'
  const { error: updateError } = await supabase
    .from('ai_course_workflows')
    .update({
      published_course_id: COURSE_ID,
      current_step: '5',
      status: 'content_draft',
      updated_at: new Date().toISOString()
    })
    .eq('id', WORKFLOW_ID)

  if (updateError) {
    console.error('❌ 更新エラー:', updateError)
    return
  }

  // 修正後の状態確認
  const { data: after } = await supabase
    .from('ai_course_workflows')
    .select('id, title, status, current_step, published_course_id')
    .eq('id', WORKFLOW_ID)
    .single()

  console.log('\n✅ 修正後:')
  console.log(`  ID: ${after.id}`)
  console.log(`  タイトル: ${after.title}`)
  console.log(`  ステータス: ${after.status}`)
  console.log(`  現在ステップ: ${after.current_step}`)
  console.log(`  公開コースID: ${after.published_course_id}`)

  console.log('\n========================================')
  console.log('✅ 修正完了')
  console.log('========================================')
}

fixWorkflowState().catch(console.error)
