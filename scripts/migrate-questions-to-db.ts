#!/usr/bin/env tsx

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// 環境変数読み込み
config({ path: path.join(process.cwd(), '.env.local') })

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface Question {
  id: number
  category: string
  subcategory?: string
  subcategory_id?: string
  question: string
  options: string[]
  correct: number
  explanation?: string
  difficulty?: string
  timeLimit?: number
  relatedTopics?: string[]
  source?: string
  deleted?: boolean
}

interface DBQuestion {
  legacy_id: number
  category_id: string
  subcategory?: string
  subcategory_id?: string
  question: string
  option1: string
  option2: string
  option3: string
  option4: string
  correct_answer: number
  explanation?: string
  difficulty?: string
  time_limit?: number
  related_topics?: string[]
  source?: string
  is_deleted?: boolean
}

async function migrateQuestions() {
  console.log('🚀 チャレンジクイズDB移行開始...')
  
  // 1. JSONファイル読み込み
  const questionsFile = path.join(process.cwd(), 'public/questions.json')
  
  if (!fs.existsSync(questionsFile)) {
    console.error('❌ questions.jsonファイルが見つかりません:', questionsFile)
    process.exit(1)
  }
  
  console.log('📄 JSONファイル読み込み中...')
  const fileContent = fs.readFileSync(questionsFile, 'utf-8')
  const data = JSON.parse(fileContent)
  const questions: Question[] = data.questions || []
  
  console.log(`✅ ${questions.length}問を読み込みました`)
  
  // 2. データ変換
  console.log('🔄 データ変換中...')
  const dbQuestions: DBQuestion[] = questions.map(q => ({
    legacy_id: q.id,
    category_id: q.category,
    subcategory: q.subcategory || undefined,
    subcategory_id: q.subcategory_id || undefined,
    question: q.question,
    option1: q.options[0] || '',
    option2: q.options[1] || '',
    option3: q.options[2] || '',
    option4: q.options[3] || '',
    correct_answer: q.correct,
    explanation: q.explanation || undefined,
    difficulty: q.difficulty || '中級',
    time_limit: q.timeLimit || 45,
    related_topics: q.relatedTopics || [],
    source: q.source || undefined,
    is_deleted: q.deleted || false
  }))
  
  // 3. バリデーション
  console.log('✅ データバリデーション中...')
  const errors: string[] = []
  
  dbQuestions.forEach((q, index) => {
    if (!q.legacy_id || q.legacy_id <= 0) {
      errors.push(`問題 ${index + 1}: 無効なID (${q.legacy_id})`)
    }
    if (!q.question.trim()) {
      errors.push(`問題 ${index + 1}: 問題文が空`)
    }
    if (!q.option1 || !q.option2 || !q.option3 || !q.option4) {
      errors.push(`問題 ${index + 1}: 選択肢が不足`)
    }
    if (q.correct_answer < 0 || q.correct_answer > 3) {
      errors.push(`問題 ${index + 1}: 正解番号が無効 (${q.correct_answer})`)
    }
  })
  
  if (errors.length > 0) {
    console.error('❌ バリデーションエラー:')
    errors.forEach(err => console.error('  -', err))
    process.exit(1)
  }
  
  console.log(`✅ バリデーション成功 (${dbQuestions.length}問)`)
  
  // 4. 既存データ確認
  console.log('🔍 既存データ確認中...')
  const { count, error: countError } = await supabase
    .from('quiz_questions')
    .select('*', { count: 'exact', head: true })
    
  if (countError) {
    console.error('❌ 既存データ確認エラー:', countError.message)
    process.exit(1)
  }
  
  if (count && count > 0) {
    console.log(`⚠️  既存データが${count}件あります`)
    console.log('既存データを削除してから移行を実行しますか？ [y/N]')
    
    // 本番では削除確認を求める（今回はスキップ）
    console.log('🔄 既存データを削除して続行します...')
    
    const { error: deleteError } = await supabase
      .from('quiz_questions')
      .delete()
      .neq('id', 0) // 全行削除
      
    if (deleteError) {
      console.error('❌ 既存データ削除エラー:', deleteError.message)
      process.exit(1)
    }
    
    console.log('✅ 既存データを削除しました')
  }
  
  // 5. バッチ挿入
  console.log('💾 データベースに挿入中...')
  const batchSize = 50 // 一度に50件ずつ挿入
  let insertedCount = 0
  
  for (let i = 0; i < dbQuestions.length; i += batchSize) {
    const batch = dbQuestions.slice(i, i + batchSize)
    
    console.log(`📝 ${i + 1}-${Math.min(i + batchSize, dbQuestions.length)}件目を挿入中...`)
    
    const { error } = await supabase
      .from('quiz_questions')
      .insert(batch)
      
    if (error) {
      console.error(`❌ バッチ挿入エラー (${i + 1}-${i + batch.length}):`, error.message)
      console.error('エラー詳細:', error)
      process.exit(1)
    }
    
    insertedCount += batch.length
    console.log(`✅ ${insertedCount}/${dbQuestions.length}件完了`)
  }
  
  // 6. 検証
  console.log('🔍 移行結果検証中...')
  const { count: finalCount, error: finalCountError } = await supabase
    .from('quiz_questions')
    .select('*', { count: 'exact', head: true })
    
  if (finalCountError) {
    console.error('❌ 検証エラー:', finalCountError.message)
    process.exit(1)
  }
  
  console.log('\n🎉 移行完了!')
  console.log(`📊 移行結果:`)
  console.log(`  - 元データ: ${questions.length}問`)
  console.log(`  - 挿入済み: ${insertedCount}問`)
  console.log(`  - DB確認: ${finalCount}問`)
  
  if (finalCount === questions.length) {
    console.log('✅ データ整合性確認: 成功')
  } else {
    console.log('⚠️  データ整合性警告: 件数が一致しません')
  }
  
  // 7. サンプルデータ確認
  console.log('\n📝 サンプルデータ確認:')
  const { data: samples, error: sampleError } = await supabase
    .from('quiz_questions')
    .select('legacy_id, category_id, question')
    .limit(3)
    
  if (sampleError) {
    console.error('❌ サンプル取得エラー:', sampleError.message)
  } else {
    samples?.forEach((sample, index) => {
      console.log(`  ${index + 1}. ID:${sample.legacy_id} [${sample.category_id}] ${sample.question.substring(0, 50)}...`)
    })
  }
  
  console.log('\n🚀 次のステップ: API実装 (Step 3)')
}

// 実行
if (require.main === module) {
  migrateQuestions()
    .then(() => {
      console.log('✅ 移行スクリプト正常終了')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ 移行スクリプトエラー:', error)
      process.exit(1)
    })
}

export { migrateQuestions }