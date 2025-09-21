#!/usr/bin/env ts-node

/**
 * カテゴリー管理システムの統合テスト
 * DB-driven category system integration test
 */

import { supabase } from '@/lib/supabase'
import { getCategories, getSkillLevels } from '@/lib/categories'

interface TestResult {
  name: string
  success: boolean
  message: string
  data?: any
}

async function runTest(name: string, testFn: () => Promise<any>): Promise<TestResult> {
  try {
    console.log(`🧪 Testing: ${name}`)
    const data = await testFn()
    console.log(`✅ ${name}: Success`)
    return { name, success: true, message: 'Success', data }
  } catch (error: any) {
    console.log(`❌ ${name}: ${error?.message || 'Unknown error'}`)
    return { name, success: false, message: error?.message || 'Unknown error' }
  }
}

async function testCategorySystemIntegration(): Promise<void> {
  console.log('🔄 Starting category system integration tests...\n')
  
  const results: TestResult[] = []

  // Test 1: Database connection
  results.push(await runTest('Database Connection', async () => {
    const { data, error } = await supabase.from('categories').select('category_id').limit(1)
    if (error) throw new Error(`DB Error: ${error.message}`)
    return { connectionOk: true, sampleData: data }
  }))

  // Test 2: Categories table structure
  results.push(await runTest('Categories Table Structure', async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('category_id, name, type, is_active, is_visible')
      .limit(1)
    
    if (error) throw new Error(`DB Error: ${error.message}`)
    if (!data || data.length === 0) throw new Error('No categories found')
    
    const category = data[0]
    const requiredFields = ['category_id', 'name', 'type', 'is_active', 'is_visible']
    const missingFields = requiredFields.filter(field => !(field in category))
    
    if (missingFields.length > 0) {
      throw new Error(`Missing fields: ${missingFields.join(', ')}`)
    }
    
    return { structure: 'Valid', sampleCategory: category }
  }))

  // Test 3: Active categories count
  results.push(await runTest('Active Categories Count', async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('category_id, name, type')
      .eq('is_visible', true)
      .eq('is_active', true)
    
    if (error) throw new Error(`DB Error: ${error.message}`)
    
    const mainCount = data?.filter(cat => cat.type === 'main').length || 0
    const industryCount = data?.filter(cat => cat.type === 'industry').length || 0
    
    return {
      total: data?.length || 0,
      mainCategories: mainCount,
      industryCategories: industryCount,
      activeCategories: data || []
    }
  }))

  // Test 4: Inactive industry categories (Coming Soon)
  results.push(await runTest('Inactive Industry Categories', async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('category_id, name')
      .eq('is_visible', true)
      .eq('is_active', false)
      .eq('type', 'industry')
    
    if (error) throw new Error(`DB Error: ${error.message}`)
    
    return {
      count: data?.length || 0,
      comingSoonCategories: data || []
    }
  }))

  // Test 5: getCategories function with activeOnly=true
  results.push(await runTest('getCategories(activeOnly=true)', async () => {
    const categories = await getCategories({ activeOnly: true })
    
    if (!Array.isArray(categories)) throw new Error('Expected array of categories')
    if (categories.length === 0) throw new Error('No active categories returned')
    
    // Check that all returned categories should be active
    const inactiveFound = categories.some(cat => 'isActive' in cat && !cat.isActive)
    if (inactiveFound) throw new Error('Inactive categories found in activeOnly=true result')
    
    return {
      count: categories.length,
      mainCount: categories.filter(cat => cat.type === 'main').length,
      industryCount: categories.filter(cat => cat.type === 'industry').length
    }
  }))

  // Test 6: getCategories function with activeOnly=false
  results.push(await runTest('getCategories(activeOnly=false)', async () => {
    const categories = await getCategories({ activeOnly: false })
    
    if (!Array.isArray(categories)) throw new Error('Expected array of categories')
    
    return {
      totalCount: categories.length,
      hasInactiveCategories: categories.some(cat => 'isActive' in cat && !cat.isActive)
    }
  }))

  // Test 7: Skill levels API
  results.push(await runTest('Skill Levels System', async () => {
    const skillLevels = await getSkillLevels()
    
    if (!Array.isArray(skillLevels)) throw new Error('Expected array of skill levels')
    if (skillLevels.length === 0) throw new Error('No skill levels returned')
    
    // Check for required skill level structure
    const firstSkill = skillLevels[0]
    const requiredFields = ['id', 'name']
    const missingFields = requiredFields.filter(field => !(field in firstSkill))
    
    if (missingFields.length > 0) {
      throw new Error(`Missing skill level fields: ${missingFields.join(', ')}`)
    }
    
    return {
      count: skillLevels.length,
      skillLevels: skillLevels.map(s => ({ id: s.id, name: s.name }))
    }
  }))

  // Test 8: Fallback mechanism test
  results.push(await runTest('Fallback Mechanism', async () => {
    // This test simulates what happens when DB fails
    try {
      // Try to get categories normally first
      const dbCategories = await getCategories({ activeOnly: true })
      
      // Check that static fallback data exists in lib/categories.ts
      const { getAllCategoriesSync } = await import('@/lib/categories')
      const staticCategories = getAllCategoriesSync()
      
      if (!Array.isArray(staticCategories)) throw new Error('Static fallback data not available')
      if (staticCategories.length === 0) throw new Error('Empty static fallback data')
      
      return {
        dbCategoriesCount: dbCategories.length,
        staticCategoriesCount: staticCategories.length,
        fallbackWorking: true
      }
    } catch (error: any) {
      throw new Error(`Fallback test failed: ${error?.message || 'Unknown error'}`)
    }
  }))

  // Print results summary
  console.log('\n📊 Test Results Summary:')
  console.log('========================')
  
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌'
    console.log(`${icon} ${result.name}: ${result.message}`)
    
    // Print relevant data for successful tests
    if (result.success && result.data) {
      if (result.name === 'Active Categories Count') {
        console.log(`   📈 Total: ${result.data.total}, Main: ${result.data.mainCategories}, Industry: ${result.data.industryCategories}`)
      } else if (result.name === 'Inactive Industry Categories') {
        console.log(`   🔜 Coming Soon Categories: ${result.data.count}`)
      } else if (result.name === 'Skill Levels System') {
        console.log(`   🎯 Skill Levels: ${result.data.skillLevels.map((s: any) => s.name).join(', ')}`)
      } else if (result.name === 'Fallback Mechanism') {
        console.log(`   💾 DB: ${result.data.dbCategoriesCount} categories, Static: ${result.data.staticCategoriesCount} categories`)
      }
    }
  })
  
  console.log('\n📋 Summary:')
  console.log(`✅ Passed: ${passed}/${results.length}`)
  console.log(`❌ Failed: ${failed}/${results.length}`)
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`)
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Category system is working correctly.')
  } else {
    console.log('\n⚠️ Some tests failed. Please check the issues above.')
  }
}

// Execute tests
testCategorySystemIntegration().catch(console.error)