// 学習分析システムのテストスクリプト
// 使用方法: npx tsx scripts/test-learning-analytics.ts

import { supabaseAdmin } from '../lib/supabase-admin'

async function testLearningAnalyticsSystem() {
  console.log('🔍 学習分析システムテスト開始...\n')

  try {
    // 1. データベーステーブル存在確認
    console.log('1. データベーステーブル確認中...')
    
    const tables = [
      'learning_analytics_summary',
      'learning_recommendations', 
      'learning_effectiveness_tracking'
    ]

    for (const table of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table as 'learning_analytics_summary' | 'learning_recommendations' | 'learning_effectiveness_tracking')
          .select('id')
          .limit(1)
        
        if (error && error.code === '42P01') {
          console.log(`❌ テーブル "${table}" が存在しません`)
        } else {
          console.log(`✅ テーブル "${table}" 正常`)
        }
      } catch (err) {
        console.log(`❌ テーブル "${table}" エラー:`, err)
      }
    }

    // 2. 既存テーブルのカラム拡張確認
    console.log('\n2. 既存テーブル拡張確認中...')
    
    try {
      const { data: quizAnswers } = await supabaseAdmin
        .from('quiz_answers')
        .select('confidence_level, hint_used, review_needed')
        .limit(1)
      console.log('✅ quiz_answers 拡張カラム確認済み')
    } catch (err) {
      console.log('❌ quiz_answers 拡張カラムなし:', err)
    }

    try {
      const { data: dailyXP } = await supabaseAdmin
        .from('daily_xp_records')
        .select('study_time_minutes, peak_study_hour, learning_quality_score')
        .limit(1)
      console.log('✅ daily_xp_records 拡張カラム確認済み')
    } catch (err) {
      console.log('❌ daily_xp_records 拡張カラムなし:', err)
    }

    // 3. サンプルユーザーでテストデータ作成
    console.log('\n3. テストデータ確認中...')
    
    const { data: users } = await supabaseAdmin
      .from('user_xp_stats_v2')
      .select('user_id')
      .limit(1)

    if (users && users.length > 0) {
      const testUserId = users[0].user_id
      console.log(`📊 テストユーザー: ${testUserId.substring(0, 8)}...`)

      // XP統計確認
      const { data: xpStats } = await supabaseAdmin
        .from('user_xp_stats_v2')
        .select('*')
        .eq('user_id', testUserId)
        .single()

      if (xpStats) {
        console.log(`✅ XP統計: ${xpStats.total_xp}XP, レベル${xpStats.current_level}`)
      }

      // クイズセッション確認
      const { data: quizSessions } = await supabaseAdmin
        .from('quiz_sessions')
        .select('*')
        .eq('user_id', testUserId)
        .limit(5)

      console.log(`✅ クイズセッション: ${quizSessions?.length || 0}件`)

      // カテゴリー別統計確認
      const { data: categoryStats } = await supabaseAdmin
        .from('user_category_xp_stats_v2')
        .select('category_id, total_xp, quiz_average_accuracy')
        .eq('user_id', testUserId)

      console.log(`✅ カテゴリー統計: ${categoryStats?.length || 0}カテゴリー`)
      if (categoryStats && categoryStats.length > 0) {
        categoryStats.slice(0, 3).forEach(cat => {
          console.log(`   - ${cat.category_id}: ${cat.total_xp}XP (${cat.quiz_average_accuracy}%)`)
        })
      }

      // 4. 分析サマリー作成テスト
      console.log('\n4. 分析サマリー作成テスト...')
      
      const today = new Date().toISOString().split('T')[0]
      
      const testSummary = {
        user_id: testUserId,
        calculation_date: today,
        total_study_time_minutes: 60,
        session_count: 3,
        average_session_duration: 20,
        learning_streak_days: 5,
        overall_accuracy: 75.5,
        quiz_accuracy: 75.5,
        course_completion_rate: 90.0,
        total_xp: xpStats?.total_xp || 0,
        current_level: xpStats?.current_level || 1
      }

      const { data: summaryResult, error: summaryError } = await supabaseAdmin
        .from('learning_analytics_summary')
        .upsert(testSummary, { onConflict: 'user_id,calculation_date' })
        .select()

      if (summaryError) {
        console.log('❌ 分析サマリー作成失敗:', summaryError)
      } else {
        console.log('✅ 分析サマリー作成成功')
      }

      // 5. レコメンデーション作成テスト
      console.log('\n5. レコメンデーション作成テスト...')
      
      const testRecommendation = {
        user_id: testUserId,
        recommendation_type: 'test',
        priority: 1,
        title: 'テストレコメンデーション',
        description: 'システムテスト用の推奨事項です',
        recommended_content_type: 'quiz',
        recommended_content_id: 'test_quiz_001',
        reasoning: 'システム動作テストのため',
        confidence_score: 0.8,
        status: 'active'
      }

      const { data: recResult, error: recError } = await supabaseAdmin
        .from('learning_recommendations')
        .insert(testRecommendation)
        .select()

      if (recError) {
        console.log('❌ レコメンデーション作成失敗:', recError)
      } else {
        console.log('✅ レコメンデーション作成成功')
      }

      return testUserId
    } else {
      console.log('❌ テスト用ユーザーが見つかりません')
      return null
    }

  } catch (error) {
    console.error('❌ テスト実行エラー:', error)
    return null
  }
}

// APIエンドポイントテスト
async function testAPIEndpoints(userId: string) {
  console.log('\n🌐 APIエンドポイントテスト開始...')
  
  const baseUrl = 'http://localhost:3000'
  
  const endpoints = [
    `/api/learning-analytics/overview?userId=${userId}&period=30d`,
    `/api/learning-analytics/detailed?userId=${userId}`,
    `/api/recommendations/learning-path?userId=${userId}`
  ]

  for (const endpoint of endpoints) {
    try {
      console.log(`🔗 テスト中: ${endpoint}`)
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log(`✅ ${endpoint} - ステータス: ${response.status}`)
        
        // レスポンス構造の簡易チェック
        if (endpoint.includes('overview')) {
          console.log(`   メトリクス: ${data.metrics ? 'あり' : 'なし'}`)
        } else if (endpoint.includes('detailed')) {
          console.log(`   カテゴリー分析: ${data.categoryBreakdown?.length || 0}件`)
        } else if (endpoint.includes('recommendations')) {
          console.log(`   即時推奨: ${data.immediate?.length || 0}件`)
        }
      } else {
        console.log(`❌ ${endpoint} - ステータス: ${response.status}`)
        const error = await response.text()
        console.log(`   エラー: ${error}`)
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - 接続エラー:`, (error as Error).message)
    }
  }
}

// メイン実行
async function main() {
  console.log('🚀 学習分析システム総合テスト\n')
  
  const testUserId = await testLearningAnalyticsSystem()
  
  if (testUserId) {
    console.log('\n' + '='.repeat(60))
    await testAPIEndpoints(testUserId)
  }
  
  console.log('\n✨ テスト完了')
}

main().catch(console.error)