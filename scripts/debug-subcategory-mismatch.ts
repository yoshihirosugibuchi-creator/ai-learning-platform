#!/usr/bin/env tsx

/**
 * サブカテゴリー不一致詳細調査スクリプト
 * 問題のサブカテゴリーIDを詳細に分析（legacy_id含む）
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// .env.local ファイルから環境変数を直接読み込み
function loadEnvFile(): Record<string, string> {
  const envPath = resolve(process.cwd(), '.env.local')
  const env: Record<string, string> = {}
  
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join('=')
        }
      }
    }
  }
  
  return env
}

const envVars = loadEnvFile()
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugSubcategoryMismatch() {
  console.log('🔍 サブカテゴリー不一致詳細調査開始...\n')

  // マスタデータ取得
  console.log('📋 マスタサブカテゴリー取得中...')
  const { data: subcategories } = await supabase
    .from('subcategories')
    .select('subcategory_id, name, parent_category_id')
    .order('subcategory_id')

  const masterSubcategoryIds = new Set((subcategories || []).map(s => s.subcategory_id))
  console.log(`✅ マスタサブカテゴリー: ${masterSubcategoryIds.size}件\n`)

  // まずはカラム構造を確認
  console.log('📋 クイズテーブル構造確認中...')
  const { data: sampleQuestions } = await supabase
    .from('quiz_questions')
    .select('*')
    .limit(1)

  if (sampleQuestions && sampleQuestions.length > 0) {
    console.log('✅ 利用可能なカラム:', Object.keys(sampleQuestions[0]))
  }

  // クイズデータ取得（legacy_id含む、正しいカラム名使用）
  console.log('📋 クイズデータ取得中（legacy_id含む）...')
  let { data: quizQuestions, error } = await supabase
    .from('quiz_questions')
    .select('id, legacy_id, category_id, subcategory, subcategory_id')

  // is_deletedカラムがある場合はフィルタ
  if (sampleQuestions && sampleQuestions.length > 0 && 'is_deleted' in sampleQuestions[0]) {
    console.log('📋 is_deletedフィルタ適用...')
    const result = await supabase
      .from('quiz_questions')
      .select('id, legacy_id, category_id, subcategory, subcategory_id, is_deleted')
      .eq('is_deleted', false)
    
    quizQuestions = result.data
    error = result.error
  }

  if (error) {
    console.error('❌ エラー:', error)
    return
  }

  if (!quizQuestions || quizQuestions.length === 0) {
    console.log('❌ クイズデータが取得できません')
    return
  }

  console.log(`✅ クイズデータ: ${quizQuestions.length}件\n`)

  // サブカテゴリーID分析
  const quizSubcategoryIds = new Set<string>()
  const subcategoryIdCounts = new Map<string, {count: number, questions: any[]}>()

  for (const question of quizQuestions) {
    const subcategoryId = question.subcategory_id
    if (subcategoryId && subcategoryId !== 'category_level') {
      quizSubcategoryIds.add(subcategoryId)
      if (!subcategoryIdCounts.has(subcategoryId)) {
        subcategoryIdCounts.set(subcategoryId, {count: 0, questions: []})
      }
      const entry = subcategoryIdCounts.get(subcategoryId)!
      entry.count++
      entry.questions.push(question)
    }
  }

  console.log(`📊 クイズデータ内ユニークサブカテゴリーID: ${quizSubcategoryIds.size}件\n`)

  // 不一致サブカテゴリーIDの詳細分析
  const missingSubcategoryIds = Array.from(quizSubcategoryIds).filter(id => !masterSubcategoryIds.has(id))
  
  console.log('🚨 不一致サブカテゴリーID詳細分析:')
  console.log(`合計不一致件数: ${missingSubcategoryIds.length}件\n`)

  if (missingSubcategoryIds.length > 0) {
    console.log('📋 不一致サブカテゴリーID一覧:')
    missingSubcategoryIds.forEach((id, index) => {
      const entry = subcategoryIdCounts.get(id)
      const count = entry?.count || 0
      console.log(`${(index + 1).toString().padStart(2, ' ')}. "${id}" (使用回数: ${count}回)`)
    })

    console.log('\n🔍 不一致サブカテゴリーを使用している問題の詳細:')
    for (const missingId of missingSubcategoryIds) {
      const entry = subcategoryIdCounts.get(missingId)
      if (!entry) continue

      console.log(`\n📝 subcategory_id: "${missingId}" (${entry.count}件)`)
      
      // 最初の3件を詳細表示
      const sampleQuestions = entry.questions.slice(0, 3)
      sampleQuestions.forEach((q, i) => {
        console.log(`  ${i+1}. ID: ${q.id}, legacy_id: ${q.legacy_id || 'null'}`)
        console.log(`     category_id: "${q.category_id}", subcategory: "${q.subcategory}"`)
        console.log(`     subcategory_id: "${q.subcategory_id}"`)
      })
      
      if (entry.count > 3) {
        console.log(`     ... 他${entry.count - 3}件`)
      }
    }
  } else {
    console.log('✅ 全てのサブカテゴリーIDが一致しています！')
  }

  // 特定のIDをピンポイントで調査
  console.log('\n🔍 指摘されたID個別調査:')
  const suspiciousIds = [
    'ai_machine_learning_application',
    'business_strategy_management', 
    'document_visualization_skills',
    'meeting_facilitation_management',
    'structured_thinking_mece_logic'
  ]

  for (const suspiciousId of suspiciousIds) {
    const existsInQuiz = quizSubcategoryIds.has(suspiciousId)
    const existsInMaster = masterSubcategoryIds.has(suspiciousId)
    const entry = subcategoryIdCounts.get(suspiciousId)
    
    console.log(`\n"${suspiciousId}":`)
    console.log(`  - クイズデータ内存在: ${existsInQuiz ? '✅' : '❌'}`)
    console.log(`  - マスタデータ内存在: ${existsInMaster ? '✅' : '❌'}`)
    
    if (existsInQuiz && entry) {
      console.log(`  - 使用回数: ${entry.count}回`)
      console.log(`  - 使用例: legacy_id=${entry.questions[0].legacy_id}, id=${entry.questions[0].id}`)
    }
  }

  console.log('\n📊 サマリー:')
  console.log(`- マスタサブカテゴリー: ${masterSubcategoryIds.size}件`)
  console.log(`- クイズ使用サブカテゴリー: ${quizSubcategoryIds.size}件`) 
  console.log(`- 不一致: ${missingSubcategoryIds.length}件`)
  if (quizSubcategoryIds.size > 0) {
    console.log(`- 一致率: ${((quizSubcategoryIds.size - missingSubcategoryIds.length) / quizSubcategoryIds.size * 100).toFixed(1)}%`)
  }
}

debugSubcategoryMismatch().catch(console.error)