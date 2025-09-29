import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { userId, courseId } = await request.json()

    if (!userId || !courseId) {
      return NextResponse.json(
        { error: 'userId and courseId are required' },
        { status: 400 }
      )
    }

    console.log(`🔄 Resetting course progress for user ${userId}, course ${courseId}`)

    // 1. learning_progressテーブルからコース完了記録を削除
    const { error: progressError } = await supabase
      .from('learning_progress')
      .delete()
      .eq('user_id', userId)
      .eq('course_id', courseId)

    if (progressError) {
      console.error('❌ Error deleting learning progress:', progressError)
      return NextResponse.json(
        { error: 'Failed to delete learning progress' },
        { status: 500 }
      )
    }

    // 2. user_badgesテーブルからコース関連バッジを削除（存在する場合）
    try {
      const { error: badgeError } = await supabase
        .from('user_badges')
        .delete()
        .eq('user_id', userId)
        .eq('course_id', courseId)

      if (badgeError) {
        console.warn('⚠️ Error deleting badges (table may not exist):', badgeError)
      } else {
        console.log('✅ Course badges deleted')
      }
    } catch (badgeErr) {
      console.warn('⚠️ Badge deletion failed (table may not exist):', badgeErr)
    }

    // 3. user_xp_statsからコース関連のXPを削除（セッション記録をリセット）
    try {
      const { error: xpError } = await supabase
        .from('user_xp_stats')
        .update({
          course_sessions_completed: 0,
          course_total_xp: 0
        })
        .eq('user_id', userId)

      if (xpError) {
        console.warn('⚠️ Error resetting XP stats:', xpError)
      } else {
        console.log('✅ XP stats reset')
      }
    } catch (xpErr) {
      console.warn('⚠️ XP reset failed:', xpErr)
    }

    console.log('🎉 Course progress reset completed')

    return NextResponse.json({
      success: true,
      message: `Course progress reset for user ${userId}, course ${courseId}`
    })

  } catch (error) {
    console.error('❌ Unexpected error resetting course progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}