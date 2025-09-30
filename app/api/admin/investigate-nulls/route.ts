import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    console.log('🔍 Investigating null values in quiz_questions table...')
    
    // 全レコード数と各フィールドのnull状況を調査
    const { data: allQuestions, error } = await supabaseAdmin
      .from('quiz_questions')
      .select('id, explanation, difficulty, source, time_limit, related_topics, subcategory, subcategory_id')
      .limit(1000)
    
    if (error) {
      console.error('❌ Error fetching questions:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
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
    
    // difficultyの値の分布も調査
    const difficultyValues = new Map()
    allQuestions?.forEach(q => {
      const value = q.difficulty || 'null'
      difficultyValues.set(value, (difficultyValues.get(value) || 0) + 1)
    })
    
    const difficultyDistribution = Array.from(difficultyValues.entries())
      .sort(([,a], [,b]) => b - a)
      .map(([value, count]) => ({
        value,
        count,
        percentage: ((count / total) * 100).toFixed(1)
      }))
    
    // サンプル表示
    const nullExplanationSamples = allQuestions?.filter(q => q.explanation === null).slice(0, 5) || []
    const nullDifficultySamples = allQuestions?.filter(q => q.difficulty === null).slice(0, 5) || []
    
    const result = {
      summary: {
        total_questions: total,
        null_statistics: Object.entries(nullStats).map(([field, nullCount]) => ({
          field,
          null_count: nullCount,
          percentage: total > 0 ? ((nullCount / total) * 100).toFixed(1) : '0'
        }))
      },
      difficulty_distribution: difficultyDistribution,
      samples: {
        null_explanation: nullExplanationSamples.map(q => ({
          id: q.id,
          difficulty: q.difficulty,
          source: q.source,
          subcategory: q.subcategory
        })),
        null_difficulty: nullDifficultySamples.map(q => ({
          id: q.id,
          explanation_present: !!q.explanation,
          source: q.source,
          subcategory: q.subcategory
        }))
      }
    }
    
    console.log('📊 Investigation results:', JSON.stringify(result, null, 2))
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Investigation failed:', error)
    return NextResponse.json(
      { error: 'Investigation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}