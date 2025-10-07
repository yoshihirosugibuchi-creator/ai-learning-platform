/**
 * quiz_answersテーブルのuser_id設定状況確認スクリプト
 * 
 * 目的:
 * - user_idが設定されているレコード数を確認
 * - user_idがNULLのレコード数を確認
 * - 全ユーザーデータ削除時の対応方針を決定
 */

import 'dotenv/config'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface QuizAnswersAnalysis {
  totalRecords: number
  withUserId: number
  withoutUserId: number
  userIdPercentage: number
  sampleNullRecords: any[]
  distinctUsers: string[]
}

async function analyzeQuizAnswersUserIdStatus(): Promise<QuizAnswersAnalysis> {
  console.log('🔍 quiz_answersテーブルのuser_id設定状況を分析中...')
  
  try {
    // 全レコード数を取得
    const { count: totalCount, error: totalError } = await supabaseAdmin
      .from('quiz_answers')
      .select('*', { count: 'exact', head: true })
    
    if (totalError) {
      throw new Error(`Total count error: ${totalError.message}`)
    }
    
    // user_idが設定されているレコード数
    const { count: withUserIdCount, error: withUserIdError } = await supabaseAdmin
      .from('quiz_answers')
      .select('*', { count: 'exact', head: true })
      .not('user_id', 'is', null)
    
    if (withUserIdError) {
      throw new Error(`With user_id count error: ${withUserIdError.message}`)
    }
    
    // user_idがNULLのレコード数
    const { count: withoutUserIdCount, error: withoutUserIdError } = await supabaseAdmin
      .from('quiz_answers')
      .select('*', { count: 'exact', head: true })
      .is('user_id', null)
    
    if (withoutUserIdError) {
      throw new Error(`Without user_id count error: ${withoutUserIdError.message}`)
    }
    
    // サンプルのNULLレコードを取得（詳細分析用）
    const { data: sampleNullRecords, error: sampleError } = await supabaseAdmin
      .from('quiz_answers')
      .select('id, created_at, session_type, quiz_session_id')
      .is('user_id', null)
      .limit(5)
    
    if (sampleError) {
      console.warn('サンプル取得エラー:', sampleError.message)
    }
    
    // 設定されているユーザーIDの一覧を取得
    const { data: distinctUserData, error: distinctUserError } = await supabaseAdmin
      .from('quiz_answers')
      .select('user_id')
      .not('user_id', 'is', null)
    
    if (distinctUserError) {
      throw new Error(`Distinct users error: ${distinctUserError.message}`)
    }
    
    const distinctUsers = [...new Set(distinctUserData?.map(d => d.user_id).filter(Boolean))] as string[]
    
    const totalRecords = totalCount || 0
    const withUserId = withUserIdCount || 0
    const withoutUserId = withoutUserIdCount || 0
    const userIdPercentage = totalRecords > 0 ? Math.round((withUserId / totalRecords) * 100 * 100) / 100 : 0
    
    return {
      totalRecords,
      withUserId,
      withoutUserId,
      userIdPercentage,
      sampleNullRecords: sampleNullRecords || [],
      distinctUsers
    }
    
  } catch (error) {
    console.error('❌ 分析エラー:', error)
    throw error
  }
}

async function runAnalysis() {
  console.log('🔍 quiz_answersテーブル分析開始')
  console.log('=' .repeat(50))
  
  try {
    const analysis = await analyzeQuizAnswersUserIdStatus()
    
    console.log('📊 分析結果:')
    console.log(`📝 総レコード数: ${analysis.totalRecords.toLocaleString()}件`)
    console.log(`✅ user_id設定済み: ${analysis.withUserId.toLocaleString()}件 (${analysis.userIdPercentage}%)`)
    console.log(`❌ user_id未設定: ${analysis.withoutUserId.toLocaleString()}件 (${(100 - analysis.userIdPercentage).toFixed(2)}%)`)
    console.log(`👥 設定済みユーザー数: ${analysis.distinctUsers.length}人`)
    
    console.log('\n👥 設定済みユーザーID一覧:')
    analysis.distinctUsers.forEach((userId, index) => {
      console.log(`  ${index + 1}. ${userId.substring(0, 8)}...`)
    })
    
    console.log('\n📋 user_id未設定レコードサンプル:')
    analysis.sampleNullRecords.forEach((record, index) => {
      console.log(`  ${index + 1}. ID:${record.id}, 作成日:${record.created_at?.split('T')[0]}, セッション:${record.quiz_session_id || 'なし'}`)
    })
    
    console.log('\n🎯 推奨対応方針:')
    if (analysis.userIdPercentage < 50) {
      console.log('⚠️ user_id未設定データが多数存在します')
      console.log('📝 推奨: 全削除スクリプトではuser_idの有無に関わらず全削除')
    } else {
      console.log('✅ user_id設定データが主体です')
      console.log('📝 推奨: user_id指定削除 + 未設定データの一括削除')
    }
    
    return analysis
    
  } catch (error) {
    console.error('❌ 分析実行エラー:', error)
    throw error
  }
}

// スクリプト実行
if (require.main === module) {
  runAnalysis()
    .then(() => {
      console.log('\n✅ quiz_answersテーブル分析完了')
    })
    .catch(error => {
      console.error('❌ 分析実行エラー:', error)
      process.exit(1)
    })
}