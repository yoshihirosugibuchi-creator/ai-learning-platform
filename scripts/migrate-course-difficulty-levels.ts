#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

// 環境変数読み込み
config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function migrateCourseSkillLevels() {
  console.log('🔄 コース学習スキルレベル統一開始...\n')

  try {
    // 1. 現在のコースデータを確認
    console.log('📊 **1. 現在のコースデータ確認**')
    console.log('='.repeat(60))

    const { data: currentCourses, error: fetchError } = await supabase
      .from('learning_courses')
      .select('id, title, difficulty')
      .order('display_order')

    if (fetchError) {
      throw fetchError
    }

    if (!currentCourses || currentCourses.length === 0) {
      console.log('⚠️ コースデータが見つかりませんでした')
      return
    }

    console.log(`✅ ${currentCourses.length}件のコースを発見`)
    currentCourses.forEach(course => {
      console.log(`  - ${course.title}: ${course.difficulty}`)
    })

    // 2. スキルレベル変換マッピング
    console.log('\n🔄 **2. スキルレベル変換マッピング**')
    console.log('='.repeat(60))

    const difficultyMapping: Record<string, string> = {
      'beginner': 'basic',
      'intermediate': 'intermediate', // 変更なし
      'advanced': 'advanced', // 変更なし
      'expert': 'expert' // 既存の場合は変更なし
    }

    console.log('変換ルール:')
    Object.entries(difficultyMapping).forEach(([old, new_val]) => {
      console.log(`  ${old} → ${new_val}`)
    })

    // 3. 変換が必要なコースを特定
    const coursesToUpdate = currentCourses.filter(course => 
      course.difficulty === 'beginner' || !['basic', 'intermediate', 'advanced', 'expert'].includes(course.difficulty)
    )

    console.log(`\n📝 変換対象: ${coursesToUpdate.length}件`)
    coursesToUpdate.forEach(course => {
      const newDifficulty = difficultyMapping[course.difficulty] || 'basic'
      console.log(`  - ${course.title}: ${course.difficulty} → ${newDifficulty}`)
    })

    if (coursesToUpdate.length === 0) {
      console.log('✅ 変換が必要なコースはありません')
      return
    }

    // 4. データ更新実行
    console.log('\n⚡ **3. データ更新実行**')
    console.log('='.repeat(60))

    let updateCount = 0
    let errorCount = 0

    for (const course of coursesToUpdate) {
      const newDifficulty = difficultyMapping[course.difficulty] || 'basic'
      
      try {
        const { error: updateError } = await supabase
          .from('learning_courses')
          .update({ 
            difficulty: newDifficulty,
            updated_at: new Date().toISOString()
          })
          .eq('id', course.id)

        if (updateError) {
          console.error(`❌ ${course.title}: ${updateError.message}`)
          errorCount++
        } else {
          console.log(`✅ ${course.title}: ${course.difficulty} → ${newDifficulty}`)
          updateCount++
        }
      } catch (error) {
        console.error(`❌ ${course.title}: ${error}`)
        errorCount++
      }
    }

    // 5. 更新結果確認
    console.log('\n📊 **4. 更新結果確認**')
    console.log('='.repeat(60))

    const { data: updatedCourses, error: confirmError } = await supabase
      .from('learning_courses')
      .select('id, title, difficulty')
      .order('display_order')

    if (confirmError) {
      throw confirmError
    }

    console.log('更新後のコースデータ:')
    updatedCourses?.forEach(course => {
      console.log(`  - ${course.title}: ${course.difficulty}`)
    })

    // 6. サマリー
    console.log('\n🎯 **更新サマリー**')
    console.log('='.repeat(60))
    console.log(`✅ 成功: ${updateCount}件`)
    console.log(`❌ エラー: ${errorCount}件`)
    console.log(`📊 総コース数: ${updatedCourses?.length || 0}件`)

    if (errorCount === 0) {
      console.log('\n🎉 **コーススキルレベル統一完了！**')
      console.log('💡 すべてのコースがDB統一スキルレベル（基礎、中級、上級、エキスパート）に対応しました')
    } else {
      console.log(`\n⚠️ ${errorCount}件のエラーがありました。ログを確認してください。`)
    }

  } catch (error) {
    console.error('❌ 移行エラー:', error)
    process.exit(1)
  }
}

migrateCourseSkillLevels().then(() => {
  console.log('\n🔄 コーススキルレベル統一完了')
  process.exit(0)
}).catch(error => {
  console.error('❌ Migration error:', error)
  process.exit(1)
})