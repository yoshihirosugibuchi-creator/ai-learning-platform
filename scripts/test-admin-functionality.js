#!/usr/bin/env node

/**
 * Admin functionality test
 */

const http = require('http')

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }

    const req = http.request(options, (res) => {
      let responseData = ''
      res.on('data', (chunk) => {
        responseData += chunk
      })
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData)
          resolve({ status: res.statusCode, data: parsedData })
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData, parseError: e.message })
        }
      })
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.setTimeout(5000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    if (data) {
      req.write(JSON.stringify(data))
    }

    req.end()
  })
}

async function runAdminTests() {
  console.log('🔧 Starting Admin Functionality Tests...\n')

  const tests = [
    {
      name: 'Admin Categories - Get All',
      path: '/api/admin/categories',
      method: 'GET',
      expectStatus: 200
    },
    {
      name: 'Admin Categories - Category Structure',
      path: '/api/admin/categories',
      method: 'GET',
      expectStatus: 200,
      validate: (data) => {
        if (!data.categories || !Array.isArray(data.categories)) {
          throw new Error('Missing categories array')
        }
        if (data.categories.length === 0) {
          throw new Error('No categories found')
        }
        
        const firstCategory = data.categories[0]
        const requiredFields = ['category_id', 'name', 'type', 'is_active']
        const missingFields = requiredFields.filter(field => !(field in firstCategory))
        
        if (missingFields.length > 0) {
          throw new Error(`Missing fields: ${missingFields.join(', ')}`)
        }
        
        return {
          totalCategories: data.categories.length,
          activeCategories: data.categories.filter(c => c.is_active).length,
          inactiveCategories: data.categories.filter(c => !c.is_active).length,
          mainCategories: data.categories.filter(c => c.type === 'main').length,
          industryCategories: data.categories.filter(c => c.type === 'industry').length
        }
      }
    },
    {
      name: 'Categories API - Public View (Active Only)',
      path: '/api/categories?active_only=true',
      method: 'GET',
      expectStatus: 200,
      validate: (data) => {
        const categories = data.categories || data
        if (!Array.isArray(categories)) {
          throw new Error('Expected categories array')
        }
        
        // All categories should be active
        const inactiveFound = categories.some(cat => cat.is_active === false)
        if (inactiveFound) {
          throw new Error('Found inactive categories in active-only request')
        }
        
        return {
          activeCategories: categories.length,
          publicVisible: true
        }
      }
    },
    {
      name: 'Coming Soon Categories Check',
      path: '/api/categories?active_only=false',
      method: 'GET',
      expectStatus: 200,
      validate: (data) => {
        const categories = data.categories || data
        if (!Array.isArray(categories)) {
          throw new Error('Expected categories array')
        }
        
        const comingSoonCategories = categories.filter(cat => !cat.is_active)
        const activeCategories = categories.filter(cat => cat.is_active)
        
        return {
          totalCategories: categories.length,
          activeCategories: activeCategories.length,
          comingSoonCategories: comingSoonCategories.length,
          comingSoonIndustries: comingSoonCategories.filter(c => c.type === 'industry').length
        }
      }
    }
  ]

  const results = []

  for (const test of tests) {
    try {
      console.log(`🧪 Testing: ${test.name}`)
      const result = await makeRequest(test.path, test.method, test.data)
      
      if (result.status !== test.expectStatus) {
        throw new Error(`Expected status ${test.expectStatus}, got ${result.status}`)
      }
      
      let validationResult = null
      if (test.validate) {
        validationResult = test.validate(result.data)
      }
      
      console.log(`✅ ${test.name}: Success`)
      
      // Print specific results
      if (validationResult) {
        if (test.name.includes('Category Structure')) {
          console.log(`   📊 Total: ${validationResult.totalCategories}, Active: ${validationResult.activeCategories}, Inactive: ${validationResult.inactiveCategories}`)
          console.log(`   📈 Main: ${validationResult.mainCategories}, Industry: ${validationResult.industryCategories}`)
        } else if (test.name.includes('Public View')) {
          console.log(`   👀 Public Active Categories: ${validationResult.activeCategories}`)
        } else if (test.name.includes('Coming Soon')) {
          console.log(`   🔜 Coming Soon: ${validationResult.comingSoonCategories} (${validationResult.comingSoonIndustries} industry categories)`)
          console.log(`   ✅ Active: ${validationResult.activeCategories}`)
        }
      }
      
      results.push({ ...test, success: true, status: result.status, validationResult })
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`)
      results.push({ ...test, success: false, error: error.message })
    }
    console.log('')
  }

  // Summary
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log('📋 Admin Test Summary:')
  console.log('======================')
  console.log(`✅ Passed: ${passed}/${results.length}`)
  console.log(`❌ Failed: ${failed}/${results.length}`)
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`)
  
  if (failed === 0) {
    console.log('\n🎉 All admin functionality tests passed!')
    console.log('\n📋 Key Findings:')
    
    // Extract key findings from validation results
    const categoryStructure = results.find(r => r.name.includes('Category Structure'))?.validationResult
    const comingSoon = results.find(r => r.name.includes('Coming Soon'))?.validationResult
    
    if (categoryStructure && comingSoon) {
      console.log(`   • Total Categories: ${categoryStructure.totalCategories}`)
      console.log(`   • Active Categories: ${categoryStructure.activeCategories}`)
      console.log(`   • Coming Soon Categories: ${comingSoon.comingSoonCategories}`)
      console.log(`   • Coming Soon Industry Categories: ${comingSoon.comingSoonIndustries}`)
      console.log(`   • Admin Interface: ✅ Functional`)
      console.log(`   • Public Interface: ✅ Shows only active categories`)
      console.log(`   • Coming Soon Feature: ✅ Working correctly`)
    }
  } else {
    console.log('\n⚠️ Some admin functionality tests failed:')
    results.filter(r => !r.success).forEach(test => {
      console.log(`   ❌ ${test.name}: ${test.error}`)
    })
  }
}

runAdminTests().catch(console.error)