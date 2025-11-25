import { NextRequest, NextResponse } from 'next/server'

export async function GET(_request: NextRequest) {
  try {
    console.log('🔍 Debug: Starting course check...')
    
    const { getCourseDetailsFromDB } = await import('@/lib/learning/supabase-data')
    const courseId = 'finance_basics_course'
    
    console.log('🔍 Debug: About to call getCourseDetailsFromDB with:', courseId)
    const result = await getCourseDetailsFromDB(courseId)
    console.log('🔍 Debug: Got result:', result ? 'SUCCESS' : 'NULL')
    
    return NextResponse.json({
      success: true,
      courseId,
      found: result !== null,
      courseTitle: result?.title || 'N/A',
      genresCount: result?.genres?.length || 0,
      hasResult: !!result
    })
  } catch (error) {
    console.error('❌ Debug API error:', error)
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack')
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    }, { status: 500 })
  }
}