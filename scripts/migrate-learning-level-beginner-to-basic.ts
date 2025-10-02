#!/usr/bin/env tsx

/**
 * ユーザープロフィールのlearning_levelフィールドで
 * 'beginner' を 'basic' に統一するマイグレーションスクリプト
 */

import { supabase } from '../lib/supabase-admin'

async function migrateLearningLevelBeginnerToBasic() {
  console.log('🔄 Learning Level Migration: beginner → basic')
  console.log('=' .repeat(60))

  try {
    // 1. 現在のlearning_levelの分布を確認
    console.log('\n📊 現在のlearning_level分布を確認中...')
    const { data: currentDistribution, error: distError } = await supabase
      .from('users')
      .select('learning_level')
      .not('learning_level', 'is', null)

    if (distError) {
      console.error('❌ 分布確認エラー:', distError)
      return
    }

    const distribution = currentDistribution?.reduce((acc: Record<string, number>, user) => {
      const level = user.learning_level || 'null'
      acc[level] = (acc[level] || 0) + 1
      return acc
    }, {}) || {}

    console.log('現在の分布:')
    Object.entries(distribution).forEach(([level, count]) => {
      console.log(`  ${level}: ${count}件`)
    })

    // 2. beginnerの件数を確認
    const beginnerCount = distribution['beginner'] || 0
    console.log(`\n🎯 更新対象: beginner → basic (${beginnerCount}件)`)

    if (beginnerCount === 0) {
      console.log('✅ 更新対象のbeginnerレコードはありません')
      return
    }

    // 3. beginnerをbasicに更新
    console.log('\n🔄 更新実行中...')
    const { data: updateResult, error: updateError } = await supabase
      .from('users')
      .update({ learning_level: 'basic' })
      .eq('learning_level', 'beginner')
      .select('id, email, learning_level')

    if (updateError) {
      console.error('❌ 更新エラー:', updateError)
      return
    }

    console.log(`✅ 更新完了: ${updateResult?.length || 0}件`)
    
    if (updateResult && updateResult.length > 0) {
      console.log('\n更新されたユーザー:')
      updateResult.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email} → learning_level: ${user.learning_level}`)
      })
    }

    // 4. 更新後の分布を確認
    console.log('\n📊 更新後のlearning_level分布を確認中...')
    const { data: afterDistribution, error: afterError } = await supabase
      .from('users')
      .select('learning_level')
      .not('learning_level', 'is', null)

    if (afterError) {
      console.error('❌ 更新後分布確認エラー:', afterError)
      return
    }

    const afterDist = afterDistribution?.reduce((acc: Record<string, number>, user) => {
      const level = user.learning_level || 'null'
      acc[level] = (acc[level] || 0) + 1
      return acc
    }, {}) || {}

    console.log('更新後の分布:')
    Object.entries(afterDist).forEach(([level, count]) => {
      console.log(`  ${level}: ${count}件`)
    })

    // 5. 検証: beginnerが0件になったことを確認
    const remainingBeginner = afterDist['beginner'] || 0
    if (remainingBeginner === 0) {
      console.log('\n✅ マイグレーション成功: beginnerレコードは0件になりました')
    } else {
      console.log(`\n⚠️ 注意: ${remainingBeginner}件のbeginnerレコードが残っています`)
    }

    console.log('\n🎉 Learning Level Migration 完了!')

  } catch (error) {
    console.error('❌ マイグレーション実行エラー:', error)
  }
}

// スクリプト実行
if (require.main === module) {
  migrateLearningLevelBeginnerToBasic()
    .then(() => {
      console.log('\n📝 次のステップ:')
      console.log('1. アプリケーションコード内のbeginner参照をbasicに更新')
      console.log('2. 動作テストの実施')
      console.log('3. プロダクション適用前の最終確認')
      process.exit(0)
    })
    .catch(error => {
      console.error('スクリプト実行エラー:', error)
      process.exit(1)
    })
}

export default migrateLearningLevelBeginnerToBasic