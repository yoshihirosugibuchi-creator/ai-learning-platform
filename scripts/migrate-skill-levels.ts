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

// スキルレベルマスターデータ
const SKILL_LEVELS = [
  {
    id: 'basic',
    name: '基礎',
    display_name: 'Basic',
    description: '基本的な知識とスキルレベル',
    target_experience: '新人〜入社3年目',
    display_order: 1,
    color: '#22C55E'
  },
  {
    id: 'intermediate',
    name: '中級',
    display_name: 'Intermediate', 
    description: '実践的な知識とスキルレベル',
    target_experience: '入社3-7年目、チームリーダー',
    display_order: 2,
    color: '#3B82F6'
  },
  {
    id: 'advanced',
    name: '上級',
    display_name: 'Advanced',
    description: '専門的な知識とスキルレベル',
    target_experience: 'マネージャー、専門家',
    display_order: 3,
    color: '#F59E0B'
  },
  {
    id: 'expert',
    name: 'エキスパート',
    display_name: 'Expert',
    description: '高度な専門知識とスキルレベル',
    target_experience: 'シニアマネージャー、業界専門家',
    display_order: 4,
    color: '#EF4444'
  }
]

async function migrateSkillLevels() {
  console.log('🎯 スキルレベルマスターデータの初期化を開始します...\n')

  try {
    // 1. 既存データの確認
    console.log('📋 既存のスキルレベルデータを確認中...')
    const { data: existingData, error: selectError } = await supabase
      .from('skill_levels')
      .select('*')
      .order('display_order')

    if (selectError) {
      console.error('❌ Error checking existing data:', selectError)
      return
    }

    if (existingData && existingData.length > 0) {
      console.log(`✅ 既存データ発見: ${existingData.length}件`)
      existingData.forEach(level => {
        console.log(`  - ${level.skill_level_id}: ${level.name} (${level.name_en})`)
      })
      
      const readline = require('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('\n既存データを削除して再初期化しますか？ (y/N): ', resolve)
      })
      rl.close()
      
      if (answer.toLowerCase() !== 'y') {
        console.log('❌ 操作をキャンセルしました')
        return
      }
      
      // 既存データを削除
      console.log('\n🗑️ 既存データを削除中...')
      const { error: deleteError } = await supabase
        .from('skill_levels')
        .delete()
        .neq('id', '')  // 全削除
      
      if (deleteError) {
        console.error('❌ Error deleting existing data:', deleteError)
        return
      }
      console.log('✅ 既存データ削除完了')
    }

    // 2. 新しいスキルレベルデータを挿入
    console.log('\n📥 新しいスキルレベルデータを挿入中...')
    console.log('データ内容:', JSON.stringify(SKILL_LEVELS, null, 2))
    
    const { data: insertedData, error: insertError } = await supabase
      .from('skill_levels')
      .insert(SKILL_LEVELS)
      .select()

    if (insertError) {
      console.error('❌ Error inserting skill levels:', insertError)
      return
    }

    console.log('✅ スキルレベルデータ挿入完了')
    
    // 3. 挿入結果の確認
    console.log('\n📊 **挿入されたスキルレベルデータ**')
    console.log('=' .repeat(70))
    
    insertedData?.forEach(level => {
      console.log(`${level.id.padEnd(15)} | ${level.name.padEnd(10)} | ${level.display_name.padEnd(12)} | Order: ${level.display_order}`)
    })

    // 4. クイズデータとの対応確認
    console.log('\n🔍 **クイズデータの現在のdifficulty値との対応**')
    console.log('=' .repeat(70))
    
    const { data: difficultyStats, error: statsError } = await supabase
      .from('quiz_questions')
      .select('difficulty')
      .neq('is_deleted', true)

    if (statsError) {
      console.error('❌ Error fetching quiz difficulty stats:', statsError)
      return
    }

    // difficulty値を集計
    const stats: Record<string, number> = {}
    difficultyStats?.forEach(row => {
      if (row.difficulty) {
        stats[row.difficulty] = (stats[row.difficulty] || 0) + 1
      }
    })

    // 対応関係を表示
    const mappings = {
      '基礎': 'basic',
      '中級': 'intermediate', 
      '上級': 'advanced',
      'エキスパート': 'expert'
    }

    console.log('現在のクイズdifficulty → 新しいskill_level_id')
    Object.entries(stats).forEach(([difficulty, count]) => {
      const skillLevelId = mappings[difficulty as keyof typeof mappings] || '❓ 未対応'
      console.log(`"${difficulty}" (${count}件) → "${skillLevelId}"`)
    })

    // 5. 次のステップの案内
    console.log('\n📋 **次のステップ**')
    console.log('=' .repeat(70))
    console.log('1. ✅ スキルレベルマスターデータ初期化完了')
    console.log('2. 🔄 メインカテゴリーデータ移行 (Task 2.2)')
    console.log('3. 🔄 既存業界カテゴリーデータ移行 (Task 2.3)')
    console.log('4. 🔄 サブカテゴリーデータ移行 (Task 2.4)')
    console.log('5. 🔄 クイズデータdifficulty値正規化 (Task 2.6)')

    console.log('\n✅ スキルレベルマスターデータの初期化が完了しました！')

  } catch (error) {
    console.error('❌ Critical error:', error)
  }
}

// 実行
migrateSkillLevels().then(() => {
  console.log('\n🎯 スキルレベル初期化完了')
  process.exit(0)
}).catch(error => {
  console.error('❌ Script error:', error)
  process.exit(1)
})