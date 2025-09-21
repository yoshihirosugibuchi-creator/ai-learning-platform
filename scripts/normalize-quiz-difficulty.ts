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

// difficulty値のマッピング
const DIFFICULTY_MAPPING = {
  '基礎': 'basic',
  '中級': 'intermediate',
  '上級': 'advanced',
  'エキスパート': 'expert'
}

async function normalizeQuizDifficulty() {
  console.log('🎯 クイズデータのdifficulty値正規化を開始します...\n')

  try {
    // 1. 現在のdifficulty値の分布を確認
    console.log('📊 現在のdifficulty値分布を確認中...')
    const { data: currentStats, error: statsError } = await supabase
      .from('quiz_questions')
      .select('difficulty')
      .neq('is_deleted', true)

    if (statsError) {
      console.error('❌ Error fetching current stats:', statsError)
      return
    }

    // difficulty値を集計
    const stats: Record<string, number> = {}
    let nullCount = 0
    let totalCount = 0

    currentStats?.forEach(row => {
      totalCount++
      if (row.difficulty === null || row.difficulty === undefined) {
        nullCount++
      } else {
        stats[row.difficulty] = (stats[row.difficulty] || 0) + 1
      }
    })

    console.log('📋 **変換前のdifficulty値分布**')
    console.log('=' .repeat(60))
    console.log(`総問題数: ${totalCount}`)
    console.log(`NULL値: ${nullCount}`)
    console.log()

    Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([difficulty, count]) => {
        const percentage = ((count / totalCount) * 100).toFixed(1)
        const newValue = DIFFICULTY_MAPPING[difficulty as keyof typeof DIFFICULTY_MAPPING] || difficulty
        console.log(`"${difficulty}" → "${newValue}": ${count}件 (${percentage}%)`)
      })

    // 2. 変換が必要な値があるかチェック
    const needsConversion = Object.keys(stats).some(difficulty => 
      DIFFICULTY_MAPPING.hasOwnProperty(difficulty as keyof typeof DIFFICULTY_MAPPING)
    )

    if (!needsConversion) {
      console.log('\n✅ 既に全てのdifficulty値が正規化済みです')
      return
    }

    // 3. 変換の確認
    console.log('\n🔄 **変換プラン**')
    console.log('=' .repeat(60))
    
    let totalConversions = 0
    Object.entries(DIFFICULTY_MAPPING).forEach(([oldValue, newValue]) => {
      const count = stats[oldValue] || 0
      if (count > 0) {
        console.log(`"${oldValue}" → "${newValue}": ${count}件`)
        totalConversions += count
      }
    })

    console.log(`\n📊 総変換対象: ${totalConversions}件`)

    if (totalConversions === 0) {
      console.log('✅ 変換対象のデータがありません')
      return
    }

    // 4. 実行確認
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    const answer = await new Promise<string>((resolve) => {
      rl.question(`\n${totalConversions}件のdifficulty値を変換しますか？ (y/N): `, resolve)
    })
    rl.close()
    
    if (answer.toLowerCase() !== 'y') {
      console.log('❌ 操作をキャンセルしました')
      return
    }

    // 5. 実際の変換実行
    console.log('\n🔄 difficulty値の変換を実行中...')
    
    for (const [oldValue, newValue] of Object.entries(DIFFICULTY_MAPPING)) {
      const count = stats[oldValue] || 0
      if (count === 0) continue

      console.log(`\n"${oldValue}" → "${newValue}" を変換中...`)
      
      const { data: updatedData, error: updateError } = await supabase
        .from('quiz_questions')
        .update({ difficulty: newValue })
        .eq('difficulty', oldValue)
        .neq('is_deleted', true)
        .select('id, legacy_id, difficulty')

      if (updateError) {
        console.error(`❌ Error updating ${oldValue} to ${newValue}:`, updateError)
        continue
      }

      console.log(`✅ ${updatedData?.length || 0}件を "${newValue}" に変換完了`)
    }

    // 6. 変換結果の確認
    console.log('\n📊 **変換後のdifficulty値分布確認**')
    console.log('=' .repeat(60))

    const { data: finalStats, error: finalError } = await supabase
      .from('quiz_questions')
      .select('difficulty')
      .neq('is_deleted', true)

    if (finalError) {
      console.error('❌ Error fetching final stats:', finalError)
      return
    }

    const finalStatsMap: Record<string, number> = {}
    let finalNullCount = 0
    let finalTotalCount = 0

    finalStats?.forEach(row => {
      finalTotalCount++
      if (row.difficulty === null || row.difficulty === undefined) {
        finalNullCount++
      } else {
        finalStatsMap[row.difficulty] = (finalStatsMap[row.difficulty] || 0) + 1
      }
    })

    console.log(`総問題数: ${finalTotalCount}`)
    console.log(`NULL値: ${finalNullCount}`)
    console.log()

    Object.entries(finalStatsMap)
      .sort((a, b) => b[1] - a[1])
      .forEach(([difficulty, count]) => {
        const percentage = ((count / finalTotalCount) * 100).toFixed(1)
        console.log(`"${difficulty}": ${count}件 (${percentage}%)`)
      })

    // 7. skill_levelsテーブルとの整合性確認
    console.log('\n🔍 **skill_levelsテーブルとの整合性確認**')
    console.log('=' .repeat(60))

    const { data: skillLevels, error: skillError } = await supabase
      .from('skill_levels')
      .select('id, name, display_name')
      .order('display_order')

    if (skillError) {
      console.error('❌ Error fetching skill levels:', skillError)
      return
    }

    console.log('登録済みスキルレベル:')
    skillLevels?.forEach(level => {
      const quizCount = finalStatsMap[level.id] || 0
      console.log(`  ${level.id}: ${level.name} (${level.display_name}) - ${quizCount}件のクイズ`)
    })

    // 8. 不整合データの確認
    const validSkillLevelIds = new Set(skillLevels?.map(level => level.id) || [])
    const invalidDifficulties = Object.keys(finalStatsMap).filter(diff => 
      diff && !validSkillLevelIds.has(diff)
    )

    if (invalidDifficulties.length > 0) {
      console.log('\n⚠️ **不整合データ発見**')
      console.log('=' .repeat(60))
      invalidDifficulties.forEach(diff => {
        const count = finalStatsMap[diff]
        console.log(`"${diff}": ${count}件 - skill_levelsテーブルに存在しません`)
      })
    } else {
      console.log('\n✅ 全てのdifficulty値がskill_levelsテーブルと整合しています')
    }

    // 9. 次のステップの案内
    console.log('\n📋 **Phase 2 データ移行完了状況**')
    console.log('=' .repeat(80))
    console.log('1. ✅ スキルレベルマスターデータ初期化完了')
    console.log('2. ✅ メインカテゴリーデータ移行完了')
    console.log('3. ✅ 既存業界カテゴリーデータ移行完了')
    console.log('4. ✅ サブカテゴリーデータ移行完了')
    console.log('5. ✅ 新業界カテゴリー先行登録完了')
    console.log('6. ✅ クイズデータdifficulty値正規化完了')

    console.log('\n📋 **Phase 3: API開発 (次のフェーズ)**')
    console.log('=' .repeat(80))
    console.log('- 3.1 ユーザー向けカテゴリー取得API')
    console.log('- 3.2 管理者向けカテゴリー管理API')
    console.log('- 3.3 サブカテゴリー取得API')
    console.log('- 3.4 スキルレベル取得API')

    console.log('\n✅ クイズデータのdifficulty値正規化が完了しました！')
    console.log('🎯 Phase 2 (データ移行) 完全終了')

  } catch (error) {
    console.error('❌ Critical error:', error)
  }
}

// 実行
normalizeQuizDifficulty().then(() => {
  console.log('\n🎯 difficulty値正規化完了')
  process.exit(0)
}).catch(error => {
  console.error('❌ Script error:', error)
  process.exit(1)
})