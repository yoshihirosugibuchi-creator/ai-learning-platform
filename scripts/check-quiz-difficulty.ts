#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

// 環境変数読み込み
config({ path: path.join(process.cwd(), '.env.local') })

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface QuizDifficultyStats {
  difficulty: string
  count: number
}

async function checkQuizDifficulty() {
  console.log('🔍 クイズデータのdifficulty値を確認しています...\n')

  try {
    // difficulty値の分布を確認
    const { data: difficultyStats, error: statsError } = await supabase
      .from('quiz_questions')
      .select('difficulty')
      .neq('is_deleted', true)

    if (statsError) {
      console.error('❌ Error fetching difficulty stats:', statsError)
      return
    }

    // difficulty値を集計
    const stats: Record<string, number> = {}
    let nullCount = 0
    let totalCount = 0

    difficultyStats?.forEach(row => {
      totalCount++
      if (row.difficulty === null || row.difficulty === undefined) {
        nullCount++
      } else {
        stats[row.difficulty] = (stats[row.difficulty] || 0) + 1
      }
    })

    console.log('📊 **現在のクイズデータのdifficulty値分布**')
    console.log('=' .repeat(50))
    console.log(`総問題数: ${totalCount}`)
    console.log(`NULL値: ${nullCount}`)
    console.log()

    // difficulty値別の件数を表示
    Object.entries(stats)
      .sort((a, b) => b[1] - a[1]) // 件数順でソート
      .forEach(([difficulty, count]) => {
        const percentage = ((count / totalCount) * 100).toFixed(1)
        console.log(`"${difficulty}": ${count}件 (${percentage}%)`)
      })

    console.log()

    // 具体的なサンプルデータを確認
    console.log('📝 **サンプルデータ（各difficulty値から5件ずつ）**')
    console.log('=' .repeat(50))

    for (const difficulty of Object.keys(stats)) {
      console.log(`\n【${difficulty}】`)
      const { data: sampleData, error: sampleError } = await supabase
        .from('quiz_questions')
        .select('legacy_id, question, difficulty, category_id')
        .eq('difficulty', difficulty)
        .neq('is_deleted', true)
        .limit(3)

      if (sampleError) {
        console.error(`Error fetching sample for ${difficulty}:`, sampleError)
        continue
      }

      sampleData?.forEach(row => {
        const shortQuestion = row.question.length > 60 
          ? row.question.substring(0, 60) + '...' 
          : row.question
        console.log(`  ID:${row.legacy_id} [${row.category_id}] ${shortQuestion}`)
      })
    }

    // スキルレベル統一の推奨案
    console.log('\n🎯 **スキルレベル統一の推奨案**')
    console.log('=' .repeat(50))
    console.log('現在の値 → 統一後の値')
    
    const unificationMap = {
      '基礎': 'basic',
      '中級': 'intermediate', 
      '上級': 'advanced',
      'エキスパート': 'expert'
    }

    Object.entries(stats).forEach(([current, count]) => {
      const suggested = unificationMap[current as keyof typeof unificationMap] || current
      if (suggested !== current) {
        console.log(`"${current}" (${count}件) → "${suggested}"`)
      } else {
        console.log(`"${current}" (${count}件) → そのまま`)
      }
    })

    // 次のステップの提案
    console.log('\n📋 **次のステップ**')
    console.log('=' .repeat(50))
    console.log('1. スキルレベルマスターテーブルにデータを登録')
    console.log('2. quiz_questionsテーブルのdifficulty値を統一形式に更新')
    console.log('3. コース学習のスキルレベル表記も統一')

  } catch (error) {
    console.error('❌ Critical error:', error)
  }
}

// 実行
checkQuizDifficulty().then(() => {
  console.log('\n✅ difficulty値確認完了')
  process.exit(0)
}).catch(error => {
  console.error('❌ Script error:', error)
  process.exit(1)
})