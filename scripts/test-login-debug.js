#!/usr/bin/env node

/**
 * Test login functionality and diagnose freeze issues
 */

const http = require('http')

function makeRequest(path, method, data) {
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

    req.setTimeout(10000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })

    if (data) {
      req.write(JSON.stringify(data))
    }

    req.end()
  })
}

async function testLoginFlow() {
  console.log('🧪 Testing login flow and debugging freeze issues...\n')

  // Test 1: Check if login page loads
  console.log('1. Testing login page accessibility...')
  try {
    const response = await makeRequest('/login', 'GET')
    console.log(`   Status: ${response.status}`)
    if (response.status === 200) {
      console.log('   ✅ Login page loads successfully')
    } else {
      console.log('   ❌ Login page failed to load')
      return
    }
  } catch (error) {
    console.log(`   ❌ Login page error: ${error.message}`)
    return
  }

  console.log('')

  // Test 2: Test Supabase connection
  console.log('2. Testing Supabase connection...')
  try {
    // Test if we can access a basic API endpoint
    const apiResponse = await makeRequest('/api/categories', 'GET')
    console.log(`   API Status: ${apiResponse.status}`)
    if (apiResponse.status === 200) {
      console.log('   ✅ Database connection working')
    } else {
      console.log('   ⚠️ Database connection issues detected')
    }
  } catch (error) {
    console.log(`   ❌ Database connection error: ${error.message}`)
  }

  console.log('')

  // Test 3: Test authentication endpoints
  console.log('3. Testing authentication endpoints...')
  
  // Since we can't directly test Supabase auth from here,
  // we'll check if the auth provider is loading correctly
  console.log('   📝 Note: Direct auth testing requires browser environment')
  console.log('   💡 Recommendations for debugging:')
  console.log('      - Check browser console for JavaScript errors')
  console.log('      - Check Network tab for hung requests')
  console.log('      - Check if Supabase URL/key are correct')
  console.log('      - Verify users table exists in Supabase')

  console.log('')

  // Test 4: Check development server health
  console.log('4. Testing development server health...')
  try {
    const healthResponse = await makeRequest('/', 'GET')
    console.log(`   Homepage Status: ${healthResponse.status}`)
    if (healthResponse.status === 200) {
      console.log('   ✅ Server is responsive')
    } else {
      console.log('   ⚠️ Server response issues')
    }
  } catch (error) {
    console.log(`   ❌ Server health error: ${error.message}`)
  }

  console.log('')
  console.log('🔍 Debugging suggestions:')
  console.log('================================')
  console.log('1. Open browser DevTools (F12)')
  console.log('2. Go to Console tab')
  console.log('3. Navigate to http://localhost:3000/login')
  console.log('4. Try logging in with test credentials')
  console.log('5. Check for JavaScript errors or network timeouts')
  console.log('6. Look for stuck promises or infinite loops')
  console.log('')
  console.log('🛠️ Common fixes:')
  console.log('- Clear browser cache and localStorage')
  console.log('- Check Supabase project status')
  console.log('- Verify environment variables')
  console.log('- Check for blocking network requests')
}

testLoginFlow().catch(console.error)