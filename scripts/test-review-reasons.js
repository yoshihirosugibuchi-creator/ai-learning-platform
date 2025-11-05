/**
 * Test script for database-stored review reasons system
 * Run: node scripts/test-review-reasons.js
 */

const BASE_URL = 'http://localhost:3000'

async function fetchWithAuth(url, options = {}) {
  // In a real test, you would need proper authentication
  // For now, this is a placeholder for testing structure
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': 'Bearer YOUR_TOKEN_HERE',
      ...options.headers
    }
  })
}

async function testDatabaseReviewReasons() {
  console.log('🧪 Testing Database-Stored Review Reasons System')
  console.log('='.repeat(60))
  
  try {
    // Test 1: Check quiz answers debug API
    console.log('\n📊 Test 1: Checking current review reasons in database...')
    const debugResponse = await fetchWithAuth(`${BASE_URL}/api/debug/quiz-answers-reasons`)
    
    if (debugResponse.ok) {
      const debugData = await debugResponse.json()
      console.log('✅ Debug API successful')
      console.log('📈 Stats:', debugData.stats)
      console.log('🏷️ Reason types:', debugData.reasonTypes)
      console.log('📝 Sample answers:', debugData.sampleAnswersWithReasons?.slice(0, 3))
    } else {
      console.log('❌ Debug API failed:', debugResponse.status)
    }
    
    // Test 2: Test review questions API
    console.log('\n📚 Test 2: Testing review questions retrieval...')
    const reviewResponse = await fetchWithAuth(`${BASE_URL}/api/review/questions?count=5`)
    
    if (reviewResponse.ok) {
      const reviewData = await reviewResponse.json()
      console.log('✅ Review questions API successful')
      console.log('📊 Questions retrieved:', reviewData.selectedCount)
      console.log('🔍 Review reasons analyzed:', reviewData.reviewReasonsAnalyzed)
      console.log('📝 Sample questions with reasons:', 
        reviewData.questions?.slice(0, 2).map(q => ({
          id: q.id,
          reviewReason: q.reviewReason ? {
            type: q.reviewReason.type,
            icon: q.reviewReason.icon,
            label: q.reviewReason.label
          } : null
        }))
      )
    } else {
      console.log('❌ Review questions API failed:', reviewResponse.status)
    }
    
    console.log('\n🎯 Next Steps:')
    console.log('1. Take a quiz with various answer types to test reason storage')
    console.log('2. Check that new reasons are properly saved to database')
    console.log('3. Verify that stored reasons are displayed in review quiz UI')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testDatabaseReviewReasons()