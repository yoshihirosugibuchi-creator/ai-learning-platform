/**
 * XP統計整合性チェックスクリプト
 *
 * quiz_answers と user_category_xp_stats_v2 / user_subcategory_xp_stats_v2 の
 * 整合性を確認します。
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('='.repeat(60))
  console.log('📊 XP統計整合性チェック')
  console.log('='.repeat(60))

  // 全ユーザーのquiz_answersを取得（ページネーション対応）
  let allAnswers = []
  let offset = 0
  const pageSize = 1000

  while (true) {
    const { data: answers } = await supabase
      .from('quiz_answers')
      .select('user_id, category_id, subcategory_id, earned_xp, is_correct')
      .range(offset, offset + pageSize - 1)

    if (!answers || answers.length === 0) break
    allAnswers = allAnswers.concat(answers)
    if (answers.length < pageSize) break
    offset += pageSize
  }

  const users = [...new Set((allAnswers || []).map(a => a.user_id))]
  console.log(`\n対象ユーザー数: ${users.length}`)

  let categoryMismatches = []
  let subcategoryMismatches = []
  let orphanedGeneralStats = []

  for (const userId of users) {
    const userAnswers = allAnswers.filter(a => a.user_id === userId)

    // === カテゴリー別集計（quiz_answersから） ===
    const catFromAnswers = {}
    for (const a of userAnswers) {
      if (!catFromAnswers[a.category_id]) {
        catFromAnswers[a.category_id] = { xp: 0, answered: 0, correct: 0 }
      }
      catFromAnswers[a.category_id].xp += a.earned_xp || 0
      catFromAnswers[a.category_id].answered += 1
      catFromAnswers[a.category_id].correct += a.is_correct ? 1 : 0
    }

    // === サブカテゴリー別集計（quiz_answersから） ===
    const subFromAnswers = {}
    for (const a of userAnswers) {
      const key = `${a.category_id}|${a.subcategory_id}`
      if (!subFromAnswers[key]) {
        subFromAnswers[key] = { category_id: a.category_id, subcategory_id: a.subcategory_id, xp: 0, answered: 0, correct: 0 }
      }
      subFromAnswers[key].xp += a.earned_xp || 0
      subFromAnswers[key].answered += 1
      subFromAnswers[key].correct += a.is_correct ? 1 : 0
    }

    // === カテゴリー統計テーブルと比較 ===
    const { data: catStats } = await supabase
      .from('user_category_xp_stats_v2')
      .select('category_id, total_xp, quiz_xp, quiz_questions_answered, quiz_questions_correct')
      .eq('user_id', userId)

    for (const stat of (catStats || [])) {
      const fromAnswers = catFromAnswers[stat.category_id]
      if (!fromAnswers) {
        // 統計にあるがanswersにない（孤立データ）
        categoryMismatches.push({
          user_id: userId,
          category_id: stat.category_id,
          issue: 'orphaned',
          stats_xp: stat.quiz_xp,
          answers_xp: 0
        })
      } else if (Math.abs(stat.quiz_xp - fromAnswers.xp) > 1) {
        categoryMismatches.push({
          user_id: userId,
          category_id: stat.category_id,
          issue: 'xp_mismatch',
          stats_xp: stat.quiz_xp,
          answers_xp: fromAnswers.xp
        })
      }
    }

    // === サブカテゴリー統計テーブルと比較 ===
    const { data: subStats } = await supabase
      .from('user_subcategory_xp_stats_v2')
      .select('category_id, subcategory_id, total_xp, quiz_xp, quiz_questions_answered, quiz_questions_correct')
      .eq('user_id', userId)

    for (const stat of (subStats || [])) {
      const key = `${stat.category_id}|${stat.subcategory_id}`
      const fromAnswers = subFromAnswers[key]

      if (!fromAnswers) {
        // 統計にあるがanswersにない（孤立データ）
        if (stat.subcategory_id === 'general') {
          orphanedGeneralStats.push({
            user_id: userId,
            category_id: stat.category_id,
            subcategory_id: stat.subcategory_id,
            quiz_xp: stat.quiz_xp
          })
        } else {
          subcategoryMismatches.push({
            user_id: userId,
            category_id: stat.category_id,
            subcategory_id: stat.subcategory_id,
            issue: 'orphaned',
            stats_xp: stat.quiz_xp,
            answers_xp: 0
          })
        }
      } else if (Math.abs(stat.quiz_xp - fromAnswers.xp) > 1) {
        subcategoryMismatches.push({
          user_id: userId,
          category_id: stat.category_id,
          subcategory_id: stat.subcategory_id,
          issue: 'xp_mismatch',
          stats_xp: stat.quiz_xp,
          answers_xp: fromAnswers.xp
        })
      }
    }
  }

  // === 結果表示 ===
  console.log('\n' + '='.repeat(60))
  console.log('📋 チェック結果')
  console.log('='.repeat(60))

  console.log(`\n【カテゴリー統計の不整合】: ${categoryMismatches.length}件`)
  if (categoryMismatches.length > 0) {
    for (const m of categoryMismatches.slice(0, 10)) {
      console.log(`  ${m.user_id.substring(0, 8)}... | ${m.category_id} | ${m.issue} | stats: ${m.stats_xp} vs answers: ${m.answers_xp}`)
    }
    if (categoryMismatches.length > 10) {
      console.log(`  ... 他 ${categoryMismatches.length - 10}件`)
    }
  }

  console.log(`\n【サブカテゴリー統計の不整合】: ${subcategoryMismatches.length}件`)
  if (subcategoryMismatches.length > 0) {
    for (const m of subcategoryMismatches.slice(0, 10)) {
      console.log(`  ${m.user_id.substring(0, 8)}... | ${m.category_id}/${m.subcategory_id} | ${m.issue} | stats: ${m.stats_xp} vs answers: ${m.answers_xp}`)
    }
    if (subcategoryMismatches.length > 10) {
      console.log(`  ... 他 ${subcategoryMismatches.length - 10}件`)
    }
  }

  console.log(`\n【孤立したgeneral統計】: ${orphanedGeneralStats.length}件`)
  if (orphanedGeneralStats.length > 0) {
    let totalOrphanedXP = 0
    for (const o of orphanedGeneralStats) {
      console.log(`  ${o.user_id.substring(0, 8)}... | ${o.category_id} | general | ${o.quiz_xp} XP`)
      totalOrphanedXP += o.quiz_xp
    }
    console.log(`  合計孤立XP: ${totalOrphanedXP}`)
  }

  // === 結論 ===
  console.log('\n' + '='.repeat(60))
  if (categoryMismatches.length === 0 && subcategoryMismatches.length === 0) {
    console.log('✅ 整合性チェック合格（generalの孤立データ以外に不整合なし）')

    if (orphanedGeneralStats.length > 0) {
      console.log(`\n🗑️ 削除推奨: ${orphanedGeneralStats.length}件のgeneral孤立データ`)
    }
  } else {
    console.log('⚠️ 不整合が検出されました')
  }
  console.log('='.repeat(60))

  // 削除対象のIDを出力（次のスクリプトで使用）
  if (orphanedGeneralStats.length > 0) {
    console.log('\n📝 孤立general統計の削除用データ:')
    console.log(JSON.stringify(orphanedGeneralStats, null, 2))
  }
}

main()
