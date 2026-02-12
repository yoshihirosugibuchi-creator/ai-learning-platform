require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function main() {
  // generalのquiz_answersを全件取得
  const { data: generalAnswers } = await supabase
    .from('quiz_answers')
    .select('id, question_id, subcategory_id')
    .eq('subcategory_id', 'general')

  console.log('general回答数:', generalAnswers?.length)

  // question_idが数値形式かチェック
  const numericPattern = /^\d+$/
  const numericIds = generalAnswers?.filter(a => numericPattern.test(a.question_id)) || []
  const nonNumericIds = generalAnswers?.filter(a => !numericPattern.test(a.question_id)) || []

  console.log('数値形式のquestion_id:', numericIds.length)
  console.log('非数値形式のquestion_id:', nonNumericIds.length)

  // 非数値形式のサンプル
  console.log('')
  console.log('非数値形式のサンプル:')
  nonNumericIds.slice(0, 5).forEach(a => {
    console.log('  ', a.question_id)
  })

  // 数値形式のquestion_idsでquiz_questionsを確認
  if (numericIds.length > 0) {
    const questionIds = [...new Set(numericIds.map(a => parseInt(a.question_id, 10)))]
    console.log('')
    console.log('数値形式のquestion_id（ユニーク）:', questionIds.length)

    const { data: questions } = await supabase
      .from('quiz_questions')
      .select('id, subcategory_id')
      .in('id', questionIds)

    console.log('quiz_questionsで見つかった問題数:', questions?.length)

    // subcategory_idの状況
    const withSubcategory = questions?.filter(q => q.subcategory_id && q.subcategory_id !== '' && q.subcategory_id !== 'general') || []
    const withoutSubcategory = questions?.filter(q => !q.subcategory_id || q.subcategory_id === '' || q.subcategory_id === 'general') || []

    console.log('有効なsubcategory_idあり:', withSubcategory.length)
    console.log('有効なsubcategory_idなし:', withoutSubcategory.length)

    // 修正可能な回答数を計算
    const fixableQuestionIds = new Set(withSubcategory.map(q => q.id))
    const fixableAnswers = numericIds.filter(a => fixableQuestionIds.has(parseInt(a.question_id, 10)))
    console.log('')
    console.log('修正可能な回答数:', fixableAnswers.length)

    // サンプル表示
    if (fixableAnswers.length > 0) {
      console.log('')
      console.log('修正可能な回答サンプル:')
      for (const ans of fixableAnswers.slice(0, 10)) {
        const q = questions.find(qq => qq.id === parseInt(ans.question_id, 10))
        console.log(`  answer_id: ${ans.id.substring(0,8)}..., question_id: ${ans.question_id}, correct: ${q?.subcategory_id}`)
      }
    }
  }
}

main()
