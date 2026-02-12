/**
 * user_subcategory_xp_stats_v2 のサブカテゴリーID修正（マージ対応）
 *
 * 不正IDのレコードと正しいIDのレコードが同一ユーザーに存在する場合、
 * XPを統合して不正IDレコードを削除する
 */
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MAPPING = {
  'quantitative_analysis': 'quantitative_analysis_statistics',
  'structured_thinking': 'structured_thinking_mece',
  'business_strategy_management': 'business_strategy',
}

const isDryRun = process.argv.includes('--dry-run')
const isExecute = process.argv.includes('--execute')

if (!isDryRun && !isExecute) {
  console.log('使用方法:')
  console.log('  node scripts/fix-subcategory-xp-stats-merge.js --dry-run')
  console.log('  node scripts/fix-subcategory-xp-stats-merge.js --execute')
  process.exit(0)
}

async function fix() {
  console.log('='.repeat(70))
  console.log(isDryRun ? '🔍 ドライラン' : '⚡ 実行モード')
  console.log('='.repeat(70))
  console.log('\n【user_subcategory_xp_stats_v2 修正（マージ対応）】\n')

  for (const [fromSubcat, toSubcat] of Object.entries(MAPPING)) {
    // 古いサブカテゴリーのレコードを取得
    const { data: oldRecords } = await supabase
      .from('user_subcategory_xp_stats_v2')
      .select('*')
      .eq('subcategory_id', fromSubcat)

    if (!oldRecords || oldRecords.length === 0) {
      console.log(`スキップ: ${fromSubcat} (レコードなし)`)
      continue
    }

    console.log(`\n対象: ${fromSubcat} → ${toSubcat} : ${oldRecords.length}件`)

    for (const oldRec of oldRecords) {
      console.log(`  ユーザー: ${oldRec.user_id}`)
      console.log(`    古いレコード: XP=${oldRec.total_xp}, 質問数=${oldRec.quiz_questions_answered}`)

      // 同じユーザー・カテゴリーで正しいサブカテゴリーのレコードがあるか確認
      const { data: existingNew } = await supabase
        .from('user_subcategory_xp_stats_v2')
        .select('*')
        .eq('user_id', oldRec.user_id)
        .eq('category_id', oldRec.category_id)
        .eq('subcategory_id', toSubcat)
        .single()

      if (existingNew) {
        // マージが必要
        console.log(`    既存レコード: XP=${existingNew.total_xp}, 質問数=${existingNew.quiz_questions_answered}`)

        const mergedXp = existingNew.total_xp + oldRec.total_xp
        const mergedQuestions = existingNew.quiz_questions_answered + oldRec.quiz_questions_answered
        const mergedCorrect = existingNew.quiz_questions_correct + oldRec.quiz_questions_correct
        const mergedAccuracy = mergedQuestions > 0 ? (mergedCorrect / mergedQuestions * 100).toFixed(2) : 0

        console.log(`    → マージ後: XP=${mergedXp}, 質問数=${mergedQuestions}`)

        if (!isDryRun) {
          // 既存レコードを更新
          const { error: updateError } = await supabase
            .from('user_subcategory_xp_stats_v2')
            .update({
              total_xp: mergedXp,
              quiz_xp: existingNew.quiz_xp + oldRec.quiz_xp,
              quiz_questions_answered: mergedQuestions,
              quiz_questions_correct: mergedCorrect,
              quiz_average_accuracy: mergedAccuracy,
            })
            .eq('id', existingNew.id)

          if (updateError) {
            console.log(`    ❌ 更新エラー: ${updateError.message}`)
            continue
          }

          // 古いレコードを削除
          const { error: deleteError } = await supabase
            .from('user_subcategory_xp_stats_v2')
            .delete()
            .eq('id', oldRec.id)

          if (deleteError) {
            console.log(`    ❌ 削除エラー: ${deleteError.message}`)
          } else {
            console.log(`    ✅ マージ＆削除完了`)
          }
        }
      } else {
        // 単純に更新
        console.log(`    → 単純更新（重複なし）`)

        if (!isDryRun) {
          const { error } = await supabase
            .from('user_subcategory_xp_stats_v2')
            .update({ subcategory_id: toSubcat })
            .eq('id', oldRec.id)

          if (error) {
            console.log(`    ❌ エラー: ${error.message}`)
          } else {
            console.log(`    ✅ 更新完了`)
          }
        }
      }
    }
  }

  console.log('\n' + '='.repeat(70))
  console.log(isDryRun ? '🔍 ドライラン完了 - 実行には --execute を使用' : '🎉 完了!')
  console.log('='.repeat(70))
}

fix().catch(console.error)
