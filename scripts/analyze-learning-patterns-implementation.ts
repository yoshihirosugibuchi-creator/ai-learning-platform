import { createClient } from '@supabase/supabase-js'

// 環境変数を設定
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://bddqkmnbbvllpvsynklr.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMTUyNDMsImV4cCI6MjA3MzU5MTI0M30.xCF3bLSqWqn2PEPFg6VKmFLO6H-1rOVLb3P7lCfJNOU'

import { getLearningAnalytics } from '../lib/supabase-analytics'
import { aiAnalytics } from '../lib/ai-analytics'

const supabaseUrl = 'https://bddqkmnbbvllpvsynklr.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkZHFrbW5iYnZsbHB2c3lua2xyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAxNTI0MywiZXhwIjoyMDczNTkxMjQzfQ.HRTpnBdsd0eceEIn5kXowMGdZLbSeutbCq2Kxx5EKcU'

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeLearningPatternsImplementation() {
  console.log('🔍 学習パターン実装仕様の詳細分析')
  console.log('='.repeat(70))
  
  const userId = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'

  try {
    console.log('\n📊 1. データソース分析')
    console.log('=' .repeat(50))
    
    // AIAnalyticsが参照するデータソースを調査
    console.log('\n🔍 AI Analytics参照データソース:')
    
    // detailed_quiz_dataテーブル確認
    const { data: detailedQuizData, error: detailedError } = await supabase
      .from('detailed_quiz_data')
      .select('*')
      .eq('user_id', userId)
      .limit(5)
    
    if (detailedError) {
      console.log('❌ detailed_quiz_data テーブル:', detailedError.message)
    } else {
      console.log(`✅ detailed_quiz_data: ${detailedQuizData?.length || 0}件のデータ`)
      if (detailedQuizData && detailedQuizData.length > 0) {
        console.log('  サンプル:', {
          question_id: detailedQuizData[0].question_id,
          category: detailedQuizData[0].category,
          difficulty: detailedQuizData[0].difficulty,
          is_correct: detailedQuizData[0].is_correct,
          response_time: detailedQuizData[0].response_time
        })
      }
    }
    
    // learning_sessionsテーブル確認（フォールバック）
    const { data: learningSessions } = await supabase
      .from('learning_sessions')
      .select('*')
      .eq('user_id', userId)
      .limit(5)
    
    console.log(`📋 learning_sessions: ${learningSessions?.length || 0}件のデータ`)
    
    // 実際のsupabase-analytics参照データ確認
    console.log('\n🔍 supabase-analytics参照データソース:')
    
    const { data: quizSessions } = await supabase
      .from('quiz_sessions')
      .select('*')
      .eq('user_id', userId)
    
    const { data: quizAnswers } = await supabase
      .from('quiz_answers')
      .select('*')
      .limit(10)
    
    console.log(`📊 quiz_sessions: ${quizSessions?.length || 0}件`)
    console.log(`📊 quiz_answers: ${quizAnswers?.length || 0}件`)

    console.log('\n📊 2. 各分析ロジック詳細調査')
    console.log('=' .repeat(50))

    // AI Analyticsを初期化して実行
    await aiAnalytics.init()
    const patterns = await aiAnalytics.analyzeLearningPatterns(userId)
    
    console.log('\n🧠 AI Analytics結果:')
    console.log('  学習頻度:', {
      平均日次問題数: patterns.learningFrequency.averageDailyQuestions,
      アクティブ日数: patterns.learningFrequency.activeDays,
      継続性: patterns.learningFrequency.consistency
    })
    
    console.log('  科目別強み:', {
      全体正答率: patterns.subjectStrengths.overallAccuracy + '%',
      強み: patterns.subjectStrengths.strengths.length + '科目',
      弱み: patterns.subjectStrengths.weaknesses.length + '科目'
    })
    
    console.log('  時間パターン:', {
      アクティブ時間数: patterns.timeOfDayPatterns.mostActiveHours.length,
      最高パフォーマンス時間数: patterns.timeOfDayPatterns.bestPerformanceHours.length,
      ピーク集中時間: patterns.timeOfDayPatterns.peakFocusTime
    })

    // supabase-analytics結果と比較
    const analytics = await getLearningAnalytics(userId)
    
    console.log('\n📈 supabase-analytics結果:')
    console.log('  基本統計:', {
      総セッション数: analytics.totalSessions,
      完了セッション数: analytics.completedSessions,
      総問題数: analytics.totalQuizQuestions,
      正答数: analytics.correctAnswers,
      正答率: analytics.accuracy + '%'
    })

    console.log('\n🔍 3. データ整合性分析')
    console.log('=' .repeat(50))
    
    console.log('❗ 正答率の比較:')
    console.log(`  AI Analytics全体正答率: ${patterns.subjectStrengths.overallAccuracy}%`)
    console.log(`  supabase-analytics正答率: ${analytics.accuracy}%`)
    console.log(`  差分: ${Math.abs(patterns.subjectStrengths.overallAccuracy - analytics.accuracy)}%`)
    
    if (Math.abs(patterns.subjectStrengths.overallAccuracy - analytics.accuracy) > 5) {
      console.log('⚠️ 正答率に大きな差異があります - データソースまたは計算ロジックが異なる可能性')
    }

    console.log('\n📊 4. データソース詳細比較')
    console.log('=' .repeat(50))
    
    // AI Analyticsの実際のデータソース確認（デバッグ用）
    console.log('\n🔍 AI Analyticsが実際に使用するデータ:')
    
    // detailed_quiz_dataとquiz_answersの比較
    const { data: actualQuizAnswers } = await supabase
      .from('quiz_answers')
      .select('*')
      .eq('quiz_session_id', quizSessions?.[0]?.id || '')
      .limit(10)
    
    if (actualQuizAnswers && actualQuizAnswers.length > 0) {
      const correctCount = actualQuizAnswers.filter(q => q.is_correct).length
      const actualAccuracy = Math.round((correctCount / actualQuizAnswers.length) * 100)
      
      console.log('📊 quiz_answersサンプル分析:')
      console.log(`  総問題数: ${actualQuizAnswers.length}`)
      console.log(`  正答数: ${correctCount}`)
      console.log(`  正答率: ${actualAccuracy}%`)
      console.log('  サンプルデータ:', {
        question_id: actualQuizAnswers[0].question_id,
        is_correct: actualQuizAnswers[0].is_correct,
        time_spent: actualQuizAnswers[0].time_spent,
        category_id: actualQuizAnswers[0].category_id,
        difficulty: actualQuizAnswers[0].difficulty
      })
    }

    console.log('\n📊 5. 分析目的と活用方法の評価')
    console.log('=' .repeat(50))
    
    console.log('🎯 現在の分析目的と活用シナリオ:')
    console.log('\n1. 学習頻度分析:')
    console.log('   目的: 学習の継続性とペースを分析')
    console.log('   活用: 最適な学習頻度の推奨')
    console.log('   データソース: quiz_answers + 推定データ')
    console.log('   有効性: ' + (patterns.learningFrequency.activeDays > 0 ? '✅ 有効' : '❌ データ不足'))
    
    console.log('\n2. 時間パターン分析:')
    console.log('   目的: 最適な学習時間帯の特定')
    console.log('   活用: 個人の集中力ピーク時間の推奨')
    console.log('   データソース: タイムスタンプ分析')
    console.log('   有効性: ' + (patterns.timeOfDayPatterns.bestPerformanceHours.length > 0 ? '✅ 有効' : '❌ データ不足'))
    
    console.log('\n3. 科目別強み分析:')
    console.log('   目的: 得意・不得意分野の特定')
    console.log('   活用: パーソナライズド学習推奨')
    console.log('   データソース: カテゴリー別正答率')
    console.log('   有効性: ' + (patterns.subjectStrengths.strengths.length > 0 || patterns.subjectStrengths.weaknesses.length > 0 ? '✅ 有効' : '❌ データ不足'))
    
    console.log('\n4. 難易度進捗分析:')
    console.log('   目的: 学習レベルの進捗追跡')
    console.log('   活用: 適切な難易度問題の推奨')
    console.log('   データソース: 難易度別正答率')
    console.log('   有効性: ' + (patterns.difficultyProgression.currentLevel !== 'beginner' ? '✅ 有効' : '❌ データ不足'))

    console.log('\n⚠️ 6. 発見された問題点')
    console.log('=' .repeat(50))
    
    const issues = []
    
    if (Math.abs(patterns.subjectStrengths.overallAccuracy - analytics.accuracy) > 5) {
      issues.push('正答率計算の不一致')
    }
    
    if (patterns.learningFrequency.activeDays === 0) {
      issues.push('学習頻度データの不足')
    }
    
    if (patterns.timeOfDayPatterns.bestPerformanceHours.length === 0) {
      issues.push('時間パターンデータの不足')
    }
    
    if (detailedError) {
      issues.push('detailed_quiz_dataテーブルの不存在')
    }
    
    if (issues.length > 0) {
      console.log('🚨 検出された問題:')
      issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`)
      })
    } else {
      console.log('✅ 主要な問題は検出されませんでした')
    }

    console.log('\n💡 7. 改善提案')
    console.log('=' .repeat(50))
    
    console.log('🔧 推奨する改善点:')
    
    if (detailedError) {
      console.log('1. データソースの統一:')
      console.log('   - quiz_answersテーブルを主データソースとして使用')
      console.log('   - detailed_quiz_dataの代わりにquiz_answersから分析')
    }
    
    if (Math.abs(patterns.subjectStrengths.overallAccuracy - analytics.accuracy) > 5) {
      console.log('2. 正答率計算の統一:')
      console.log('   - 両分析で同じデータソースを使用')
      console.log('   - 計算ロジックの統一')
    }
    
    console.log('3. 分析精度の向上:')
    console.log('   - 最小サンプル数の設定（現在10問 → 推奨20-30問）')
    console.log('   - 信頼区間の表示')
    console.log('   - 期間制限の適用（直近30-90日）')
    
    console.log('4. UI表示の改善:')
    console.log('   - データ不足時の明確なメッセージ')
    console.log('   - 分析結果の信頼度表示')
    console.log('   - サンプル数の表示')

  } catch (error) {
    console.error('❌ 分析エラー:', error)
  }
}

analyzeLearningPatternsImplementation()