#!/usr/bin/env node

/**
 * API Performance Test
 */

const http = require('http')

function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
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
        const endTime = Date.now()
        const responseTime = endTime - startTime
        
        try {
          const parsedData = JSON.parse(data)
          resolve({ 
            status: res.statusCode, 
            data: parsedData, 
            responseTime,
            size: Buffer.byteLength(data, 'utf8')
          })
        } catch (e) {
          resolve({ 
            status: res.statusCode, 
            data: data, 
            responseTime,
            size: Buffer.byteLength(data, 'utf8'),
            parseError: e.message 
          })
        }
      })
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.setTimeout(10000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    req.end()
  })
}

async function performanceTest(endpoint, iterations = 5) {
  console.log(`⚡ Testing ${endpoint} (${iterations} iterations)...`)
  
  const results = []
  
  for (let i = 0; i < iterations; i++) {
    try {
      const result = await makeRequest(endpoint)
      if (result.status === 200) {
        results.push({
          iteration: i + 1,
          responseTime: result.responseTime,
          size: result.size,
          success: true
        })
        process.stdout.write(`✓`)
      } else {
        results.push({
          iteration: i + 1,
          responseTime: result.responseTime,
          size: result.size,
          success: false,
          status: result.status
        })
        process.stdout.write(`✗`)
      }
    } catch (error) {
      results.push({
        iteration: i + 1,
        success: false,
        error: error.message
      })
      process.stdout.write(`✗`)
    }
    
    // Small delay between requests
    if (i < iterations - 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  console.log('') // New line after progress indicators
  
  // Calculate statistics
  const successfulResults = results.filter(r => r.success)
  const failedResults = results.filter(r => !r.success)
  
  if (successfulResults.length === 0) {
    return {
      endpoint,
      success: false,
      successRate: 0,
      failedCount: failedResults.length
    }
  }
  
  const responseTimes = successfulResults.map(r => r.responseTime)
  const sizes = successfulResults.map(r => r.size)
  
  const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
  const minResponseTime = Math.min(...responseTimes)
  const maxResponseTime = Math.max(...responseTimes)
  const avgSize = sizes.reduce((sum, size) => sum + size, 0) / sizes.length
  
  return {
    endpoint,
    success: true,
    successRate: (successfulResults.length / iterations) * 100,
    iterations,
    avgResponseTime: Math.round(avgResponseTime),
    minResponseTime,
    maxResponseTime,
    avgSize: Math.round(avgSize),
    failedCount: failedResults.length
  }
}

async function runPerformanceTests() {
  console.log('🚀 Starting API Performance Tests...\n')
  
  const endpoints = [
    '/api/categories',
    '/api/categories?active_only=true',
    '/api/categories?type=main',
    '/api/categories?type=industry',
    '/api/skill-levels',
    '/api/admin/categories',
    '/api/subcategories'
  ]
  
  const results = []
  
  for (const endpoint of endpoints) {
    const result = await performanceTest(endpoint, 5)
    results.push(result)
    
    if (result.success) {
      console.log(`   📊 Avg: ${result.avgResponseTime}ms, Range: ${result.minResponseTime}-${result.maxResponseTime}ms, Size: ${(result.avgSize/1024).toFixed(1)}KB`)
    } else {
      console.log(`   ❌ Failed: ${result.failedCount}/${result.iterations} requests`)
    }
    console.log('')
  }
  
  // Performance Summary
  console.log('📋 Performance Summary:')
  console.log('=======================')
  
  const successfulTests = results.filter(r => r.success)
  const failedTests = results.filter(r => !r.success)
  
  if (successfulTests.length > 0) {
    console.log('\n✅ Successful Endpoints:')
    successfulTests.forEach(result => {
      const performance = result.avgResponseTime <= 500 ? '🟢' : result.avgResponseTime <= 1000 ? '🟡' : '🔴'
      console.log(`   ${performance} ${result.endpoint}: ${result.avgResponseTime}ms avg (${result.successRate}% success)`)
    })
    
    // Overall statistics
    const allResponseTimes = successfulTests.map(r => r.avgResponseTime)
    const overallAvg = allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length
    const fastestEndpoint = successfulTests.reduce((fastest, current) => 
      current.avgResponseTime < fastest.avgResponseTime ? current : fastest
    )
    const slowestEndpoint = successfulTests.reduce((slowest, current) => 
      current.avgResponseTime > slowest.avgResponseTime ? current : slowest
    )
    
    console.log('\n📈 Performance Metrics:')
    console.log(`   🏃 Fastest: ${fastestEndpoint.endpoint} (${fastestEndpoint.avgResponseTime}ms)`)
    console.log(`   🐌 Slowest: ${slowestEndpoint.endpoint} (${slowestEndpoint.avgResponseTime}ms)`)
    console.log(`   📊 Overall Average: ${Math.round(overallAvg)}ms`)
    
    // Performance rating
    const rating = overallAvg <= 300 ? 'Excellent' : 
                   overallAvg <= 500 ? 'Good' :
                   overallAvg <= 1000 ? 'Acceptable' : 'Needs Improvement'
    console.log(`   🎯 Performance Rating: ${rating}`)
  }
  
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Endpoints:')
    failedTests.forEach(result => {
      console.log(`   ❌ ${result.endpoint}: ${result.failedCount} failures`)
    })
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:')
  const overallAvg = successfulTests.length > 0 ? 
    allResponseTimes.reduce((sum, time) => sum + time, 0) / allResponseTimes.length : 0
  
  if (overallAvg <= 500) {
    console.log('   ✅ API performance is good for production use')
    console.log('   ✅ Response times are within acceptable limits')
  } else if (overallAvg <= 1000) {
    console.log('   ⚠️ Consider optimizing database queries')
    console.log('   ⚠️ Monitor performance under higher load')
  } else {
    console.log('   🚨 API performance needs improvement')
    console.log('   🚨 Consider adding caching or database optimization')
  }
  
  if (successfulTests.some(r => r.avgSize > 100 * 1024)) {
    console.log('   💾 Some responses are large - consider pagination')
  }
  
  const overallSuccessRate = (successfulTests.length / results.length) * 100
  console.log(`\n🎯 Overall Success Rate: ${overallSuccessRate.toFixed(1)}%`)
  
  if (overallSuccessRate === 100) {
    console.log('🎉 All API endpoints are performing well!')
  }
}

runPerformanceTests().catch(console.error)