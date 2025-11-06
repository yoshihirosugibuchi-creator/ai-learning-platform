# API修正メモ

## 新しい統合upsertロジック

```typescript
// 統合テーブルで一括upsert処理（既存・新規問題の区別不要）
console.log(`🚀 Admin: Starting unified upsert for ${validatedQuestions.length} questions`)

const dbRows = validatedQuestions.map(q => ({
  ...(q.id ? { id: q.id } : {}), // 既存問題のみid指定、新規は自動採番
  legacy_id: q.legacy_id as number, // CSV.legacy_id → DB.legacy_id (CSVの値をそのまま)
  category_id: q.category,
  subcategory: q.subcategory || '',
  subcategory_id: q.subcategory_id || '',
  question: q.question,
  option1: q.options[0],
  option2: q.options[1], 
  option3: q.options[2],
  option4: q.options[3],
  correct_answer: q.correct,
  explanation: q.explanation || '',
  difficulty: q.difficulty || '中級',
  time_limit: q.timeLimit || 45,
  related_topics: q.relatedTopics || [],
  source: q.source || '',
  is_deleted: q.deleted || false,
  // 統合テーブルのヒント列
  level1_hint: q.level1_hint || null,
  level2_hint: q.level2_hint || null,
  level3_hint: q.level3_hint || null,
  updated_at: new Date().toISOString()
}))

let totalProcessed = 0
const errors: string[] = []

// バッチ処理
const BATCH_SIZE = 50
for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
  const batch = dbRows.slice(i, i + BATCH_SIZE)
  const batchNum = Math.floor(i/BATCH_SIZE) + 1
  
  try {
    console.log(`⏳ Processing batch ${batchNum}/${Math.ceil(dbRows.length/BATCH_SIZE)}: ${batch.length} questions`)
    
    const { error } = await supabaseAdmin
      .from('quiz_questions')
      .upsert(batch, { 
        onConflict: 'id'
      })
    
    if (error) {
      errors.push(`Batch ${batchNum}: ${error.message}`)
      console.error(`❌ Batch ${batchNum} error:`, error)
    } else {
      totalProcessed += batch.length
      console.log(`✅ Batch ${batchNum} completed: ${batch.length} questions processed`)
    }
  } catch (batchError) {
    errors.push(`Batch ${batchNum}: ${(batchError as Error)?.message}`)
    console.error(`❌ Batch ${batchNum} exception:`, batchError)
  }
}

console.log(`✅ Admin: Questions processed (unified table) - ${totalProcessed} total`)

// 統合テーブルではヒント情報も同時に処理されるため、別途処理不要
const questionsWithHints = validatedQuestions.filter(q => 
  q.level1_hint || q.level2_hint || q.level3_hint
)

console.log(`🔍 Questions with hints: ${questionsWithHints.length}/${validatedQuestions.length}`)
```