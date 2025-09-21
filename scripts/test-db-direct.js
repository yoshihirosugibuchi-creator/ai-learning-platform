#!/usr/bin/env node

/**
 * Direct database test to check if tables exist and have data
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabase() {
  console.log('🔍 Testing direct database connectivity...\n')

  const tests = [
    {
      name: 'Categories Table Structure',
      test: async () => {
        const { data, error } = await supabase
          .from('categories')
          .select('category_id, name, type, is_active, is_visible')
          .limit(1)
        
        if (error) throw error
        return { sampleCount: data?.length || 0, structure: data?.[0] || null }
      }
    },
    {
      name: 'Categories Count',
      test: async () => {
        const { data, error } = await supabase
          .from('categories')
          .select('category_id, type, is_active')
        
        if (error) throw error
        
        const total = data?.length || 0
        const mainCount = data?.filter(cat => cat.type === 'main').length || 0
        const industryCount = data?.filter(cat => cat.type === 'industry').length || 0
        const activeCount = data?.filter(cat => cat.is_active).length || 0
        
        return { total, mainCount, industryCount, activeCount }
      }
    },
    {
      name: 'Skill Levels Table',
      test: async () => {
        const { data, error } = await supabase
          .from('skill_levels')
          .select('skill_level_id, name, label')
        
        if (error) throw error
        return { count: data?.length || 0, skillLevels: data || [] }
      }
    },
    {
      name: 'Subcategories Table',
      test: async () => {
        const { data, error } = await supabase
          .from('subcategories')
          .select('subcategory_id, name, parent_category_id')
          .limit(5)
        
        if (error) throw error
        return { sampleCount: data?.length || 0, sample: data || [] }
      }
    }
  ]

  const results = []

  for (const test of tests) {
    try {
      console.log(`🧪 ${test.name}...`)
      const result = await test.test()
      console.log(`✅ ${test.name}: Success`)
      
      // Print specific results
      if (test.name === 'Categories Count') {
        console.log(`   📊 Total: ${result.total}, Main: ${result.mainCount}, Industry: ${result.industryCount}, Active: ${result.activeCount}`)
      } else if (test.name === 'Skill Levels Table') {
        console.log(`   🎯 Skill Levels: ${result.count}`)
        console.log(`   📝 Names: ${result.skillLevels.map(s => s.name || s.label).join(', ')}`)
      } else if (test.name === 'Categories Table Structure') {
        console.log(`   🏗️ Sample Data: ${JSON.stringify(result.structure, null, 2)}`)
      } else if (test.name === 'Subcategories Table') {
        console.log(`   📁 Sample Subcategories: ${result.sampleCount}`)
      }
      
      results.push({ name: test.name, success: true, data: result })
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`)
      results.push({ name: test.name, success: false, error: error.message })
    }
    console.log('')
  }

  // Summary
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log('📋 Database Test Summary:')
  console.log('=========================')
  console.log(`✅ Passed: ${passed}/${results.length}`)
  console.log(`❌ Failed: ${failed}/${results.length}`)
  
  if (failed === 0) {
    console.log('\n🎉 All database tests passed! Tables exist and have data.')
  } else {
    console.log('\n⚠️ Some database tests failed. This might explain the API 500 errors.')
    results.filter(r => !r.success).forEach(test => {
      console.log(`   ❌ ${test.name}: ${test.error}`)
    })
  }
}

testDatabase().catch(console.error)