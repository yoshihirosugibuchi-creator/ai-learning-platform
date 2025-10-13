#!/usr/bin/env tsx

/**
 * learning_progress → course_session_completions データ移行スクリプト
 * 目的: 過去データの時間情報を新システムに移行
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../lib/database-types-official'

// 環境変数を直接設定
const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

interface LearningProgressRecord {
  user_id: string
  session_id: string | null
  course_id: string
  session_start_time: string | null
  session_end_time: string | null
  duration_seconds: number | null
  created_at: string | null
}

interface CourseSessionCompletion {
  user_id: string
  session_id: string
  course_id: string
  session_start_time: string | null
  session_end_time: string | null
  duration_seconds: number | null
  created_at: string | null
}

async function migrateLearningProgressData() {
  console.log('🚀 learning_progress → course_session_completions データ移行開始\n')

  try {
    // Step 1: 現在のデータ状況を調査
    console.log('📊 Step 1: データ状況調査')
    
    const { data: learningProgressRecords, error: lpError } = await supabaseAdmin
      .from('learning_progress')
      .select('user_id, session_id, course_id, session_start_time, session_end_time, duration_seconds, created_at')
      .not('session_id', 'is', null)
      .order('created_at', { ascending: true })

    if (lpError) {
      console.error('❌ learning_progress取得エラー:', lpError)
      return
    }

    const { data: courseSessionRecords, error: csError } = await supabaseAdmin
      .from('course_session_completions')
      .select('user_id, session_id, course_id, session_start_time, session_end_time, duration_seconds, created_at')
      .order('created_at', { ascending: true })

    if (csError) {
      console.error('❌ course_session_completions取得エラー:', csError)
      return
    }

    console.log(`📈 learning_progress レコード数: ${learningProgressRecords?.length || 0}`)
    console.log(`📈 course_session_completions レコード数: ${courseSessionRecords?.length || 0}`)

    // Step 2: 時間データが欠けているcourse_session_completionsレコードを特定
    console.log('\n📊 Step 2: 時間データ欠損分析')
    
    const missingTimeData = courseSessionRecords?.filter(record => 
      !record.session_start_time || !record.session_end_time || !record.duration_seconds
    ) || []

    console.log(`⚠️ 時間データが欠けているレコード数: ${missingTimeData.length}`)

    if (missingTimeData.length > 0) {
      console.log('\n🔍 欠損データサンプル:')
      missingTimeData.slice(0, 3).forEach((record, index) => {
        console.log(`${index + 1}. session_id: ${record.session_id}`)
        console.log(`   user_id: ${record.user_id?.substring(0, 8)}...`)
        console.log(`   session_start_time: ${record.session_start_time || 'NULL'}`)
        console.log(`   session_end_time: ${record.session_end_time || 'NULL'}`)
        console.log(`   duration_seconds: ${record.duration_seconds || 'NULL'}`)
        console.log('')
      })
    }

    // Step 3: マッチング可能なlearning_progressレコードを検索
    console.log('\n📊 Step 3: マッチング分析')
    
    let matchedCount = 0
    let updatedCount = 0
    const updateResults: Array<{sessionId: string, success: boolean, error?: string}> = []

    for (const missingRecord of missingTimeData) {
      // session_id, user_id, course_idでマッチング
      const matchingLearningProgress = learningProgressRecords?.find(lp => 
        lp.session_id === missingRecord.session_id &&
        lp.user_id === missingRecord.user_id &&
        lp.course_id === missingRecord.course_id
      )

      if (matchingLearningProgress) {
        matchedCount++
        
        console.log(`🔗 マッチ発見: session_id ${missingRecord.session_id}`)
        console.log(`   LP時間: ${matchingLearningProgress.session_start_time} → ${matchingLearningProgress.session_end_time}`)
        console.log(`   LP duration: ${matchingLearningProgress.duration_seconds}s`)
        
        // データ移行実行
        try {
          const { error: updateError } = await supabaseAdmin
            .from('course_session_completions')
            .update({
              session_start_time: matchingLearningProgress.session_start_time,
              session_end_time: matchingLearningProgress.session_end_time,
              duration_seconds: matchingLearningProgress.duration_seconds
            })
            .eq('user_id', missingRecord.user_id)
            .eq('session_id', missingRecord.session_id)
            .eq('course_id', missingRecord.course_id)

          if (updateError) {
            console.error(`❌ 更新エラー (session_id: ${missingRecord.session_id}):`, updateError)
            updateResults.push({ sessionId: missingRecord.session_id, success: false, error: updateError.message })
          } else {
            console.log(`✅ 更新成功: session_id ${missingRecord.session_id}`)
            updatedCount++
            updateResults.push({ sessionId: missingRecord.session_id, success: true })
          }
        } catch (error) {
          console.error(`❌ 更新処理エラー (session_id: ${missingRecord.session_id}):`, error)
          updateResults.push({ 
            sessionId: missingRecord.session_id, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }
    }

    // Step 4: 結果サマリー
    console.log('\n📊 Step 4: 移行結果サマリー')
    console.log('='.repeat(50))
    console.log(`📈 時間データ欠損レコード数: ${missingTimeData.length}`)
    console.log(`🔗 learning_progressとマッチしたレコード数: ${matchedCount}`)
    console.log(`✅ 正常に更新されたレコード数: ${updatedCount}`)
    console.log(`❌ 更新に失敗したレコード数: ${updateResults.filter(r => !r.success).length}`)
    console.log(`⚠️ マッチしなかったレコード数: ${missingTimeData.length - matchedCount}`)

    // 失敗詳細
    const failures = updateResults.filter(r => !r.success)
    if (failures.length > 0) {
      console.log('\n❌ 更新失敗詳細:')
      failures.forEach(failure => {
        console.log(`   session_id: ${failure.sessionId} - ${failure.error}`)
      })
    }

    // Step 5: 移行後検証
    if (updatedCount > 0) {
      console.log('\n📊 Step 5: 移行後検証')
      
      const { data: updatedRecords } = await supabaseAdmin
        .from('course_session_completions')
        .select('session_id, session_start_time, session_end_time, duration_seconds')
        .not('session_start_time', 'is', null)
        .not('session_end_time', 'is', null)
        .not('duration_seconds', 'is', null)

      console.log(`✅ 時間データが完全なレコード数: ${updatedRecords?.length || 0}`)
      
      // サンプル表示
      if (updatedRecords && updatedRecords.length > 0) {
        console.log('\n🔍 更新後データサンプル:')
        updatedRecords.slice(0, 3).forEach((record, index) => {
          console.log(`${index + 1}. session_id: ${record.session_id}`)
          console.log(`   session_start_time: ${record.session_start_time}`)
          console.log(`   session_end_time: ${record.session_end_time}`)
          console.log(`   duration_seconds: ${record.duration_seconds}s`)
          console.log('')
        })
      }
    }

    console.log('\n🎉 データ移行完了!')

  } catch (error) {
    console.error('❌ 移行処理エラー:', error)
  }
}

// 実行
migrateLearningProgressData()
  .then(() => {
    console.log('\n✅ スクリプト実行完了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ スクリプト実行エラー:', error)
    process.exit(1)
  })