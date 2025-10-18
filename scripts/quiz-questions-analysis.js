#!/usr/bin/env node

/**
 * Quiz Questions Database Analysis Script
 * Analyzes current state of quiz_questions table for redesign planning
 */

const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
})

async function analyzeQuizQuestions() {
  console.log('🔍 Quiz Questions Database Analysis')
  console.log('=====================================\n')

  try {
    // Basic statistics
    console.log('📊 Basic Statistics:')
    const { data: basicStats, error: basicError } = await supabase
      .from('quiz_questions')
      .select('id, legacy_id, is_deleted, created_at, updated_at')
      .order('id', { ascending: true })

    if (basicError) throw basicError

    const totalCount = basicStats.length
    const activeCount = basicStats.filter(q => !q.is_deleted).length
    const deletedCount = basicStats.filter(q => q.is_deleted).length
    
    const ids = basicStats.map(q => q.id)
    const legacyIds = basicStats.map(q => q.legacy_id)
    
    const minId = Math.min(...ids)
    const maxId = Math.max(...ids)
    const minLegacyId = Math.min(...legacyIds)
    const maxLegacyId = Math.max(...legacyIds)
    
    const uniqueIds = new Set(ids).size
    const uniqueLegacyIds = new Set(legacyIds).size

    console.log(`  総問題数: ${totalCount}`)
    console.log(`  有効問題: ${activeCount}`)
    console.log(`  削除問題: ${deletedCount}`)
    console.log(`  ID範囲: ${minId} - ${maxId}`)
    console.log(`  Legacy ID範囲: ${minLegacyId} - ${maxLegacyId}`)
    console.log(`  ユニークID数: ${uniqueIds}`)
    console.log(`  ユニークLegacy ID数: ${uniqueLegacyIds}`)

    // ID conflicts analysis
    console.log('\n🔍 ID Conflicts Analysis:')
    
    // Duplicate IDs
    const idCounts = {}
    ids.forEach(id => {
      idCounts[id] = (idCounts[id] || 0) + 1
    })
    const duplicateIds = Object.entries(idCounts).filter(([id, count]) => count > 1)
    
    // Duplicate Legacy IDs
    const legacyIdCounts = {}
    legacyIds.forEach(id => {
      legacyIdCounts[id] = (legacyIdCounts[id] || 0) + 1
    })
    const duplicateLegacyIds = Object.entries(legacyIdCounts).filter(([id, count]) => count > 1)

    if (duplicateIds.length > 0) {
      console.log(`  ❌ 重複ID検出: ${duplicateIds.length}個`)
      duplicateIds.forEach(([id, count]) => {
        console.log(`    ID ${id}: ${count}回`)
      })
    } else {
      console.log(`  ✅ ID重複なし`)
    }

    if (duplicateLegacyIds.length > 0) {
      console.log(`  ❌ 重複Legacy ID検出: ${duplicateLegacyIds.length}個`)
      duplicateLegacyIds.forEach(([id, count]) => {
        console.log(`    Legacy ID ${id}: ${count}回`)
      })
    } else {
      console.log(`  ✅ Legacy ID重複なし`)
    }

    // Gap analysis
    console.log('\n📋 Gap Analysis:')
    
    // ID gaps
    const idGaps = []
    for (let i = minId; i <= maxId; i++) {
      if (!ids.includes(i)) {
        idGaps.push(i)
      }
    }
    
    // Legacy ID gaps
    const legacyIdGaps = []
    for (let i = minLegacyId; i <= maxLegacyId; i++) {
      if (!legacyIds.includes(i)) {
        legacyIdGaps.push(i)
      }
    }

    console.log(`  ID欠番: ${idGaps.length}個 ${idGaps.length > 0 ? `(例: ${idGaps.slice(0, 5).join(', ')}...)` : ''}`)
    console.log(`  Legacy ID欠番: ${legacyIdGaps.length}個 ${legacyIdGaps.length > 0 ? `(例: ${legacyIdGaps.slice(0, 5).join(', ')}...)` : ''}`)

    // Test data identification (heuristics)
    console.log('\n🔬 Test Data Identification:')
    
    const { data: testCandidates, error: testError } = await supabase
      .from('quiz_questions')
      .select('id, legacy_id, question, category_id, is_deleted, created_at, updated_at')
      .order('id', { ascending: true })

    if (testError) throw testError

    // Heuristics for test data identification
    const testDataPatterns = testCandidates.filter(q => {
      const question = q.question.toLowerCase()
      return (
        question.includes('テスト') ||
        question.includes('test') ||
        question.includes('sample') ||
        question.includes('サンプル') ||
        question.includes('ダミー') ||
        question.includes('dummy') ||
        question.includes('example') ||
        question.includes('例題') ||
        question.length < 10 ||
        q.category_id === 'test' ||
        q.category_id === 'sample'
      )
    })

    const alreadyDeleted = testCandidates.filter(q => q.is_deleted)
    const suspiciousGaps = testCandidates.filter(q => Math.abs(q.id - q.legacy_id) > 1000)

    console.log(`  テストデータ候補: ${testDataPatterns.length}個`)
    console.log(`  既削除データ: ${alreadyDeleted.length}個`)
    console.log(`  ID/Legacy ID大幅ずれ: ${suspiciousGaps.length}個`)

    if (testDataPatterns.length > 0) {
      console.log('\n  テストデータ候補例:')
      testDataPatterns.slice(0, 5).forEach(q => {
        console.log(`    ID:${q.id}/L:${q.legacy_id} - ${q.question.slice(0, 50)}...`)
      })
    }

    // Category analysis
    console.log('\n📂 Category Analysis:')
    const categoryStats = {}
    testCandidates.forEach(q => {
      if (!q.is_deleted) {
        categoryStats[q.category_id] = (categoryStats[q.category_id] || 0) + 1
      }
    })

    const sortedCategories = Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)

    console.log('  主要カテゴリー (Top 10):')
    sortedCategories.forEach(([category, count]) => {
      console.log(`    ${category}: ${count}問`)
    })

    // Database sequence analysis
    console.log('\n🔢 Database Sequence Analysis:')
    try {
      const { data: sequenceData, error: seqError } = await supabase
        .rpc('get_sequence_info', { sequence_name: 'quiz_questions_id_seq' })
        .single()

      if (seqError) throw seqError
      console.log(`  現在のSequence値: ${sequenceData.last_value}`)
      console.log(`  実際の最大ID: ${maxId}`)
      console.log(`  Sequence差分: ${sequenceData.last_value - maxId}`)
    } catch (seqError) {
      console.log(`  ⚠️ Sequence情報取得不可: ${seqError.message}`)
    }

    // Summary and recommendations
    console.log('\n📋 Summary & Recommendations:')
    console.log('=====================================')
    
    if (duplicateIds.length > 0 || duplicateLegacyIds.length > 0) {
      console.log('🚨 CRITICAL: ID重複問題あり - 即座修正が必要')
    }
    
    if (testDataPatterns.length > 10) {
      console.log('⚠️ WARNING: 大量のテストデータ候補 - クリーンアップ推奨')
    }
    
    if (idGaps.length > totalCount * 0.3) {
      console.log('⚠️ WARNING: 大量のID欠番 - リナンバリング推奨')
    }

    console.log('\n推奨アクション:')
    if (testDataPatterns.length > 0) {
      console.log(`1. テストデータ${testDataPatterns.length}個の論理削除`)
    }
    if (idGaps.length > 0) {
      console.log(`2. ID欠番${idGaps.length}個の整理とリナンバリング`)
    }
    console.log('3. ID/Legacy IDの役割明確化')
    console.log('4. CSV取込機能のDB API切り替え')

    console.log('\n✅ Analysis completed successfully')

  } catch (error) {
    console.error('❌ Analysis failed:', error.message)
    process.exit(1)
  }
}

// Execute analysis
analyzeQuizQuestions()