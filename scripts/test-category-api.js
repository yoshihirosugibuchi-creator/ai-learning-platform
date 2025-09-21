#!/usr/bin/env node

/**
 * Simple API test for category system
 */

const http = require('http')

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    }

    const req = http.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(data)
          resolve({ status: res.statusCode, data: parsedData })
        } catch (e) {
          resolve({ status: res.statusCode, data: data, parseError: e.message })
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

    req.end()
  })
}

async function runTests() {
  console.log('🧪 Starting Category System API Tests...\n')

  const tests = [
    {
      name: 'Categories API (All)',
      path: '/api/categories'
    },
    {
      name: 'Categories API (Active Only)',
      path: '/api/categories?active_only=true'
    },
    {
      name: 'Categories API (Main Categories)',
      path: '/api/categories?type=main'
    },
    {
      name: 'Categories API (Industry Categories)',
      path: '/api/categories?type=industry'
    },
    {
      name: 'Skill Levels API',
      path: '/api/skill-levels'
    },
    {
      name: 'Admin Categories API',
      path: '/api/admin/categories'
    }
  ]

  const results = []

  for (const test of tests) {
    try {
      console.log(`🔍 Testing: ${test.name}`)
      const result = await makeRequest(test.path)
      
      if (result.status === 200) {
        console.log(`✅ ${test.name}: Success`)
        
        // Analyze response data
        if (result.data && typeof result.data === 'object') {
          if (test.path.includes('/api/categories') && !test.path.includes('/admin/')) {
            const categories = result.data.categories || result.data
            const meta = result.data.meta
            
            if (Array.isArray(categories)) {
              console.log(`   📊 Categories: ${categories.length}`)
              if (meta) {
                console.log(`   📈 Main: ${meta.main_count}, Industry: ${meta.industry_count}`)
                console.log(`   🟢 Active: ${meta.active_count}, 🔴 Inactive: ${meta.inactive_count}`)
              }
            }
          } else if (test.path.includes('/api/skill-levels')) {
            const skillLevels = result.data.skillLevels || result.data
            if (Array.isArray(skillLevels)) {
              console.log(`   🎯 Skill Levels: ${skillLevels.length}`)
              console.log(`   📝 Levels: ${skillLevels.map(s => s.name || s.label).join(', ')}`)
            }
          } else if (test.path.includes('/admin/categories')) {
            const adminData = result.data
            if (adminData.categories) {
              console.log(`   👑 Admin Categories: ${adminData.categories.length}`)
            }
          }
        }
        
        results.push({ ...test, success: true, status: result.status })
      } else {
        console.log(`❌ ${test.name}: HTTP ${result.status}`)
        console.log(`   Error: ${result.data}`)
        results.push({ ...test, success: false, status: result.status, error: result.data })
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`)
      results.push({ ...test, success: false, error: error.message })
    }
    console.log('')
  }

  // Summary
  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  
  console.log('📋 Test Summary:')
  console.log('================')
  console.log(`✅ Passed: ${passed}/${results.length}`)
  console.log(`❌ Failed: ${failed}/${results.length}`)
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`)
  
  if (failed === 0) {
    console.log('\n🎉 All API tests passed! Category system APIs are working correctly.')
  } else {
    console.log('\n⚠️ Some API tests failed. Details:')
    results.filter(r => !r.success).forEach(test => {
      console.log(`   ❌ ${test.name}: ${test.error || `HTTP ${test.status}`}`)
    })
  }
}

runTests().catch(console.error)