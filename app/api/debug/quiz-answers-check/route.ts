import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const USER_ID = '2a4849d1-7d6f-401b-bc75-4e9418e75c07'

export async function GET() {
  try {
    console.log('🔍 Quiz answers table investigation...')

    // Test 1: Get total count
    const { count, error: countError } = await supabaseAdmin
      .from('quiz_answers')
      .select('*', { count: 'exact', head: true })

    console.log('Total quiz_answers count:', count, 'Error:', countError?.message)

    // Test 2: Get sample records without user filter
    const { data: sampleData, error: sampleError } = await supabaseAdmin
      .from('quiz_answers')
      .select('*')
      .limit(3)

    console.log('Sample data count:', sampleData?.length, 'Error:', sampleError?.message)
    console.log('Sample records:', sampleData?.[0])

    // Test 3: Get with user filter
    const { data: userData, error: userError } = await supabaseAdmin
      .from('quiz_answers')
      .select('*')
      .eq('user_id', USER_ID)
      .limit(5)

    console.log('User data count:', userData?.length, 'Error:', userError?.message)
    console.log('User sample:', userData?.[0])

    // Test 4: Check distinct user_ids to see if our user exists
    // Note: user_id column not available in quiz_answers table
    const _userIds = null
    const userIdsError = new Error('user_id column not available in quiz_answers')

    const distinctUserIds: string[] = [] // user_id not available
    console.log('Distinct user IDs found:', distinctUserIds.length)
    console.log('Our user exists:', distinctUserIds.includes(USER_ID))

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      tests: {
        totalCount: count,
        sampleDataCount: sampleData?.length || 0,
        userDataCount: userData?.length || 0,
        ourUserExists: distinctUserIds.includes(USER_ID)
      },
      errors: {
        countError: countError?.message,
        sampleError: sampleError?.message,
        userError: userError?.message,
        userIdsError: userIdsError?.message
      },
      sampleData: sampleData?.[0],
      userData: userData?.[0],
      distinctUserIds: distinctUserIds.slice(0, 5)
    })

  } catch (error) {
    console.error('Quiz answers check error:', error)
    return NextResponse.json({ 
      error: 'Check failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}