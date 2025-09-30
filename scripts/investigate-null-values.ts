import { supabaseAdmin } from '../lib/supabase-admin'

async function investigateNullValues() {
  console.log('🔍 Investigating null values in quiz_questions table...')
  
  try {
    // 全レコード数と各フィールドのnull状況を調査
    const { data: allQuestions, error } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, explanation, difficulty, source, time_limit, related_topics, subcategory, subcategory_id')
      .limit(1000)
    
    if (error) {
      console.error('❌ Error fetching questions:', error)
      return
    }
    
    const total = allQuestions?.length || 0
    const nullStats = {
      explanation: allQuestions?.filter(q => q.explanation === null).length || 0,
      difficulty: allQuestions?.filter(q => q.difficulty === null).length || 0,
      source: allQuestions?.filter(q => q.source === null).length || 0,
      time_limit: allQuestions?.filter(q => q.time_limit === null).length || 0,
      related_topics: allQuestions?.filter(q => q.related_topics === null).length || 0,
      subcategory: allQuestions?.filter(q => q.subcategory === null).length || 0,
      subcategory_id: allQuestions?.filter(q => q.subcategory_id === null).length || 0,
    }
    
    console.log(`📊 Total questions analyzed: ${total}`)
    console.log('📋 Null value statistics:')
    
    Object.entries(nullStats).forEach(([field, nullCount]) => {
      const percentage = total > 0 ? (nullCount / total * 100).toFixed(1) : '0'
      console.log(`  ${field}: ${nullCount}/${total} (${percentage}%)`)
    })
    
    // サンプル表示
    console.log('\n📝 Sample records with null values:')
    
    // explanationがnullのサンプル
    const nullExplanation = allQuestions?.filter(q => q.explanation === null).slice(0, 3)
    if (nullExplanation && nullExplanation.length > 0) {
      console.log('\n🔹 Questions with null explanation:')
      nullExplanation.forEach(q => {
        console.log(`  ID: ${q.id}, difficulty: ${q.difficulty}, source: ${q.source}`)
      })
    }
    
    // difficultyがnullのサンプル
    const nullDifficulty = allQuestions?.filter(q => q.difficulty === null).slice(0, 3)
    if (nullDifficulty && nullDifficulty.length > 0) {
      console.log('\n🔹 Questions with null difficulty:')
      nullDifficulty.forEach(q => {
        console.log(`  ID: ${q.id}, explanation: ${q.explanation ? 'present' : 'null'}, source: ${q.source}`)
      })
    }
    
    // difficultyの値の分布も調査
    const difficultyValues = new Map()
    allQuestions?.forEach(q => {
      const value = q.difficulty || 'null'
      difficultyValues.set(value, (difficultyValues.get(value) || 0) + 1)
    })
    
    console.log('\n📈 Difficulty value distribution:')
    Array.from(difficultyValues.entries())
      .sort(([,a], [,b]) => b - a)
      .forEach(([value, count]) => {
        const percentage = (count / total * 100).toFixed(1)
        console.log(`  "${value}": ${count} (${percentage}%)`)
      })
    
  } catch (error) {
    console.error('❌ Investigation failed:', error)
  }
}

investigateNullValues().then(() => {
  console.log('✅ Investigation completed')
  process.exit(0)
}).catch(error => {
  console.error('❌ Script failed:', error)
  process.exit(1)
})