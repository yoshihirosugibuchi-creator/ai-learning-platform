#!/usr/bin/env tsx

/**
 * 学習実績XP集計機能の確認
 * サブカテゴリー・カテゴリー単位での集計が可能かテスト
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// .env.local ファイルから環境変数を直接読み込み
function loadEnvFile(): Record<string, string> {
  const envPath = resolve(process.cwd(), '.env.local')
  const env: Record<string, string> = {}
  
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join('=')
        }
      }
    }
  }
  
  return env
}

const envVars = loadEnvFile()
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkLearningXPAggregation() {
  console.log('🔍 学習実績XP集計機能の確認...\n')

  try {
    // 1. learning_progressの現在の構造詳細確認
    console.log('📊 learning_progressの詳細構造:')
    const { data: progressSamples, error: progressError } = await supabase
      .from('learning_progress')
      .select('*')
      .limit(5)
.order('id')

    if (progressError) {
      console.log('❌ learning_progress取得エラー:', progressError)
      return
    }

    if (progressSamples && progressSamples.length > 0) {
      console.log(`   件数: ${progressSamples.length}件（サンプル）`)
      progressSamples.forEach((progress, index) => {
        console.log(`\n   [${index + 1}] Progress ID: ${progress.id}`)
        console.log(`       User: ${progress.user_id?.substring(0, 12)}...`)
        console.log(`       Course: ${progress.course_id}`)
        console.log(`       Session: ${progress.session_id}`)
        console.log(`       Completion: ${progress.completion_percentage}%`)
        console.log(`       Progress Data:`, JSON.stringify(progress.progress_data, null, 2))
        console.log(`       Completed At: ${progress.completed_at || 'Not completed'}`)
      })
    }

    // 2. カテゴリー・サブカテゴリー情報を結合して集計テスト
    console.log('\n🔗 カテゴリー結合集計テスト:')
    
    // learning_progressから、関連するカテゴリー情報を結合クエリで取得
    const { data: progressWithCategories, error: joinError } = await supabase
      .from('learning_progress')
      .select(`
        id,
        user_id,
        course_id,
        session_id,
        completion_percentage,
        progress_data,
        completed_at,
        learning_sessions!inner (
          id,
          theme_id,
          learning_themes!inner (
            id,
            genre_id,
            learning_genres!inner (
              id,
              title,
              category_id,
              subcategory_id
            )
          )
        )
      `)
      .not('completed_at', 'is', null)
      .limit(10)
.order('id desc')

    if (joinError) {
      console.log('❌ 結合クエリエラー:', joinError)
    } else if (progressWithCategories && progressWithCategories.length > 0) {
      console.log(`   ✅ カテゴリー情報付き進捗: ${progressWithCategories.length}件`)
      
      // 集計テスト
      const categoryAggregation: Record<string, {
        category_id: string,
        sessions_completed: number,
        total_completion: number,
        subcategories: Record<string, {
          subcategory_id: string,
          sessions_completed: number,
          total_completion: number
        }>
      }> = {}

      progressWithCategories.forEach((progress: any) => {
        const categoryId = progress.learning_sessions?.learning_themes?.learning_genres?.category_id
        const subcategoryId = progress.learning_sessions?.learning_themes?.learning_genres?.subcategory_id
        
        if (categoryId && subcategoryId) {
          // カテゴリー集計
          if (!categoryAggregation[categoryId]) {
            categoryAggregation[categoryId] = {
              category_id: categoryId,
              sessions_completed: 0,
              total_completion: 0,
              subcategories: {}
            }
          }
          
          categoryAggregation[categoryId].sessions_completed++
          categoryAggregation[categoryId].total_completion += progress.completion_percentage

          // サブカテゴリー集計
          if (!categoryAggregation[categoryId].subcategories[subcategoryId]) {
            categoryAggregation[categoryId].subcategories[subcategoryId] = {
              subcategory_id: subcategoryId,
              sessions_completed: 0,
              total_completion: 0
            }
          }
          
          categoryAggregation[categoryId].subcategories[subcategoryId].sessions_completed++
          categoryAggregation[categoryId].subcategories[subcategoryId].total_completion += progress.completion_percentage
        }
      })

      console.log('\n📈 集計結果サマリー:')
      Object.entries(categoryAggregation).forEach(([categoryId, data]) => {
        const avgCompletion = Math.round(data.total_completion / data.sessions_completed)
        console.log(`\n   🎯 カテゴリー: ${categoryId}`)
        console.log(`       完了セッション: ${data.sessions_completed}件`)
        console.log(`       平均完了率: ${avgCompletion}%`)
        
        Object.entries(data.subcategories).forEach(([subcategoryId, subData]) => {
          const subAvgCompletion = Math.round(subData.total_completion / subData.sessions_completed)
          console.log(`       └── ${subcategoryId}: ${subData.sessions_completed}件 (${subAvgCompletion}%)`)
        })
      })
    }

    // 3. XPポイント計算の仕組み確認
    console.log('\n🎮 XPポイント計算の仕組み確認:')
    
    // progress_dataにXP情報があるかチェック
    const xpDataSamples = progressSamples?.filter(p => 
      p.progress_data && 
      (p.progress_data.xp || p.progress_data.points || p.progress_data.score)
    )

    if (xpDataSamples && xpDataSamples.length > 0) {
      console.log('   ✅ XPデータが含まれる進捗を発見:')
      xpDataSamples.forEach((progress, index) => {
        console.log(`     [${index + 1}] ${progress.session_id}: XP=${progress.progress_data.xp || progress.progress_data.points || progress.progress_data.score}`)
      })
    } else {
      console.log('   ❓ XPデータが見つかりません - 新しいXPシステムの実装が必要かもしれません')
      
      // 代替案: completion_percentageベースのXP計算
      console.log('\n   💡 代替案: 完了率ベースXP計算シミュレーション')
      if (progressSamples && progressSamples.length > 0) {
        progressSamples.forEach((progress, index) => {
          // 完了率100%で10XP、部分完了は比例計算の例
          const simulatedXP = Math.round((progress.completion_percentage || 0) * 0.1)
          console.log(`     [${index + 1}] ${progress.session_id}: 完了率${progress.completion_percentage}% → ${simulatedXP}XP`)
        })
      }
    }

    // 4. 既存のuser_learning_statsテーブルの確認
    console.log('\n📊 user_learning_stats統計テーブル確認:')
    try {
      const { data: statsData, error: statsError } = await supabase
        .from('user_learning_stats')
        .select('*')
        .limit(3)

      if (statsError) {
        if (statsError.message.includes('does not exist')) {
          console.log('   ❌ user_learning_statsテーブルが存在しません')
          console.log('   💡 新しい統計テーブルの作成が必要です')
        } else {
          console.log('   ❌ user_learning_stats確認エラー:', statsError)
        }
      } else if (statsData && statsData.length > 0) {
        console.log(`   ✅ user_learning_statsテーブル存在 (${statsData.length}件のサンプル)`)
        statsData.forEach((stats, index) => {
          console.log(`     [${index + 1}] User: ${stats.user_id?.substring(0, 12)}...`)
          console.log(`        統計データ:`, JSON.stringify(stats, null, 2).substring(0, 200) + '...')
        })
      }
    } catch (error) {
      console.log('   ❌ user_learning_stats確認エラー:', error)
    }

  } catch (error) {
    console.error('❌ 学習XP集計確認エラー:', error)
  }
}

checkLearningXPAggregation().catch(console.error)