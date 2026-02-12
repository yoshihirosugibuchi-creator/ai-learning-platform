/**
 * XP統計テーブル完全再計算スクリプト
 *
 * 全ユーザーの user_subcategory_xp_stats_v2 と user_category_xp_stats_v2 を
 * quiz_answers から再計算します。
 *
 * 使用方法:
 *   node scripts/fix-xp-stats-all-users.js --dry-run   # プレビュー
 *   node scripts/fix-xp-stats-all-users.js --execute   # 実行
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const isDryRun = process.argv.includes('--dry-run')
const isExecute = process.argv.includes('--execute')

if (!isDryRun && !isExecute) {
  console.log('使用方法:')
  console.log('  node scripts/fix-xp-stats-all-users.js --dry-run   # プレビュー')
  console.log('  node scripts/fix-xp-stats-all-users.js --execute   # 実行')
  process.exit(0)
}

async function getAllUsers() {
  // ページネーションで全ユーザーを取得
  const allUsers = new Set()
  let offset = 0
  const pageSize = 1000

  while (true) {
    const { data, error } = await supabase
      .from('quiz_answers')
      .select('user_id')
      .range(offset, offset + pageSize - 1)

    if (error) throw new Error(`ユーザー取得エラー: ${error.message}`)
    if (!data || data.length === 0) break

    for (const row of data) {
      allUsers.add(row.user_id)
    }

    if (data.length < pageSize) break
    offset += pageSize
  }

  return [...allUsers]
}

async function main() {
  console.log('='.repeat(60))
  console.log(isDryRun ? '🔍 ドライラン（プレビュー）モード' : '⚡ 実行モード')
  console.log('='.repeat(60))
  console.log('')

  try {
    // 全ユーザーを取得
    const allUsers = await getAllUsers()
    console.log(`📊 対象ユーザー: ${allUsers.length} 人`)

    if (isDryRun) {
      // プレビュー: 最初のユーザーのデータを見せる
      for (const userId of allUsers.slice(0, 3)) {
        console.log('')
        console.log(`📋 ユーザー (${userId.substring(0, 8)}...) のプレビュー:`)

        const { data: answers, count } = await supabase
          .from('quiz_answers')
          .select('category_id, subcategory_id, earned_xp, is_correct', { count: 'exact' })
          .eq('user_id', userId)

        console.log(`   回答数: ${count}`)

        // サブカテゴリー別集計
        const subStats = {}
        for (const a of (answers || [])) {
          const key = `${a.category_id}|${a.subcategory_id}`
          if (!subStats[key]) {
            subStats[key] = { category_id: a.category_id, subcategory_id: a.subcategory_id, xp: 0, answered: 0, correct: 0 }
          }
          subStats[key].xp += a.earned_xp || 0
          subStats[key].answered += 1
          subStats[key].correct += a.is_correct ? 1 : 0
        }

        console.log('   サブカテゴリー別XP (上位5件):')
        const sorted = Object.values(subStats).sort((a, b) => b.xp - a.xp).slice(0, 5)
        for (const s of sorted) {
          console.log(`     ${s.subcategory_id}: ${s.xp} XP (${s.answered}問)`)
        }
      }

      console.log('')
      console.log('='.repeat(60))
      console.log('🔍 ドライランモードのため、ここで終了します')
      console.log('='.repeat(60))
      return
    }

    // 実行モード
    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < allUsers.length; i++) {
      const userId = allUsers[i]
      try {
        // quiz_answersから全回答を取得（ページネーション対応）
        let allAnswers = []
        let offset = 0
        const pageSize = 1000

        while (true) {
          const { data: answers, error: aError } = await supabase
            .from('quiz_answers')
            .select('category_id, subcategory_id, earned_xp, is_correct, created_at')
            .eq('user_id', userId)
            .not('subcategory_id', 'is', null)
            .neq('subcategory_id', '')
            .range(offset, offset + pageSize - 1)

          if (aError) throw aError
          if (!answers || answers.length === 0) break

          allAnswers = allAnswers.concat(answers)
          if (answers.length < pageSize) break
          offset += pageSize
        }

        // サブカテゴリー別集計
        const subStats = new Map()
        const catStats = new Map()

        for (const a of allAnswers) {
          // サブカテゴリー
          const subKey = `${a.category_id}|${a.subcategory_id}`
          if (!subStats.has(subKey)) {
            subStats.set(subKey, {
              user_id: userId,
              category_id: a.category_id,
              subcategory_id: a.subcategory_id,
              total_xp: 0,
              quiz_xp: 0,
              course_xp: 0,
              quiz_questions_answered: 0,
              quiz_questions_correct: 0,
              updated_at: null
            })
          }
          const sub = subStats.get(subKey)
          sub.total_xp += a.earned_xp || 0
          sub.quiz_xp += a.earned_xp || 0
          sub.quiz_questions_answered += 1
          sub.quiz_questions_correct += a.is_correct ? 1 : 0
          if (!sub.updated_at || a.created_at > sub.updated_at) {
            sub.updated_at = a.created_at
          }

          // カテゴリー
          if (!catStats.has(a.category_id)) {
            catStats.set(a.category_id, {
              user_id: userId,
              category_id: a.category_id,
              total_xp: 0,
              quiz_xp: 0,
              course_xp: 0,
              quiz_questions_answered: 0,
              quiz_questions_correct: 0,
              updated_at: null
            })
          }
          const cat = catStats.get(a.category_id)
          cat.total_xp += a.earned_xp || 0
          cat.quiz_xp += a.earned_xp || 0
          cat.quiz_questions_answered += 1
          cat.quiz_questions_correct += a.is_correct ? 1 : 0
          if (!cat.updated_at || a.created_at > cat.updated_at) {
            cat.updated_at = a.created_at
          }
        }

        // サブカテゴリー統計を更新（UPSERT）
        for (const [, stats] of subStats) {
          const accuracy = stats.quiz_questions_answered > 0
            ? (stats.quiz_questions_correct / stats.quiz_questions_answered) * 100
            : 0

          const { error: upsertError } = await supabase
            .from('user_subcategory_xp_stats_v2')
            .upsert({
              user_id: stats.user_id,
              category_id: stats.category_id,
              subcategory_id: stats.subcategory_id,
              total_xp: stats.total_xp,
              quiz_xp: stats.quiz_xp,
              course_xp: stats.course_xp,
              quiz_questions_answered: stats.quiz_questions_answered,
              quiz_questions_correct: stats.quiz_questions_correct,
              quiz_average_accuracy: accuracy,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,category_id,subcategory_id'
            })

          if (upsertError) {
            console.error(`   ❌ サブカテゴリーUPSERTエラー: ${upsertError.message}`)
            throw upsertError
          }
        }

        // カテゴリー統計を更新（UPSERT）
        for (const [, stats] of catStats) {
          const accuracy = stats.quiz_questions_answered > 0
            ? (stats.quiz_questions_correct / stats.quiz_questions_answered) * 100
            : 0

          const { error: upsertError } = await supabase
            .from('user_category_xp_stats_v2')
            .upsert({
              user_id: stats.user_id,
              category_id: stats.category_id,
              total_xp: stats.total_xp,
              quiz_xp: stats.quiz_xp,
              course_xp: stats.course_xp,
              quiz_questions_answered: stats.quiz_questions_answered,
              quiz_questions_correct: stats.quiz_questions_correct,
              quiz_average_accuracy: accuracy,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'user_id,category_id'
            })

          if (upsertError) {
            console.error(`   ❌ カテゴリーUPSERTエラー: ${upsertError.message}`)
            throw upsertError
          }
        }

        successCount++
        console.log(`   ✅ ${i + 1}/${allUsers.length}: ${userId.substring(0, 8)}... (${allAnswers.length}回答, ${subStats.size}サブカテゴリー)`)

      } catch (err) {
        console.error(`   ❌ ユーザー ${userId.substring(0, 8)}... エラー: ${err.message}`)
        errorCount++
      }
    }

    console.log('')
    console.log('='.repeat(60))
    console.log(`🎉 完了！ 成功: ${successCount}, エラー: ${errorCount}`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ エラー:', error.message)
    process.exit(1)
  }
}

main()
