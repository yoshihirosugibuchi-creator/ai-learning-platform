import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { confirmationCode } = await request.json()

    // 安全確認: 特定の確認コードを要求
    if (confirmationCode !== 'RESET_ALL_USERS_CONFIRMED_2025') {
      return NextResponse.json(
        { error: 'Invalid confirmation code. This operation requires explicit confirmation.' },
        { status: 400 }
      )
    }

    console.log('🔥 全ユーザーデータリセット開始')
    console.log('⚠️ この操作は全てのユーザーデータを削除します')

    const deletedTables: string[] = []
    const errors: string[] = []

    // 1. quiz_answers - 全削除（user_idの有無に関係なく）
    try {
      const { error: quizAnswersError } = await supabaseAdmin
        .from('quiz_answers')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // 全てのレコードを削除

      if (quizAnswersError) {
        console.error('❌ Error deleting quiz_answers:', quizAnswersError)
        errors.push('quiz_answers: ' + quizAnswersError.message)
      } else {
        console.log('✅ quiz_answers (all records) deleted')
        deletedTables.push('quiz_answers')
      }
    } catch (err) {
      errors.push('quiz_answers: ' + (err as Error).message)
    }

    // 2. quiz_sessions - 全削除
    try {
      const { error: quizSessionsError } = await supabaseAdmin
        .from('quiz_sessions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (quizSessionsError) {
        console.error('❌ Error deleting quiz_sessions:', quizSessionsError)
        errors.push('quiz_sessions: ' + quizSessionsError.message)
      } else {
        console.log('✅ quiz_sessions (all records) deleted')
        deletedTables.push('quiz_sessions')
      }
    } catch (err) {
      errors.push('quiz_sessions: ' + (err as Error).message)
    }

    // 3. learning_progress - 全削除
    try {
      const { error: progressError } = await supabaseAdmin
        .from('learning_progress')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (progressError) {
        console.error('❌ Error deleting learning_progress:', progressError)
        errors.push('learning_progress: ' + progressError.message)
      } else {
        console.log('✅ learning_progress (all records) deleted')
        deletedTables.push('learning_progress')
      }
    } catch (err) {
      errors.push('learning_progress: ' + (err as Error).message)
    }

    // 4. user_badges - 全削除
    try {
      const { error: badgeError } = await supabaseAdmin
        .from('user_badges')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (badgeError) {
        console.error('❌ Error deleting user_badges:', badgeError)
        errors.push('user_badges: ' + badgeError.message)
      } else {
        console.log('✅ user_badges (all records) deleted')
        deletedTables.push('user_badges')
      }
    } catch (err) {
      errors.push('user_badges: ' + (err as Error).message)
    }

    // 5. user_xp_stats_v2 - 全削除
    try {
      const { error: xpV2Error } = await supabaseAdmin
        .from('user_xp_stats_v2')
        .delete()
        .neq('user_id', '00000000-0000-0000-0000-000000000000')

      if (xpV2Error) {
        console.error('❌ Error deleting user_xp_stats_v2:', xpV2Error)
        errors.push('user_xp_stats_v2: ' + xpV2Error.message)
      } else {
        console.log('✅ user_xp_stats_v2 (all records) deleted')
        deletedTables.push('user_xp_stats_v2')
      }
    } catch (err) {
      errors.push('user_xp_stats_v2: ' + (err as Error).message)
    }

    // 6. user_category_xp_stats_v2 - 全削除
    try {
      const { error: categoryXpV2Error } = await supabaseAdmin
        .from('user_category_xp_stats_v2')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (categoryXpV2Error) {
        console.error('❌ Error deleting user_category_xp_stats_v2:', categoryXpV2Error)
        errors.push('user_category_xp_stats_v2: ' + categoryXpV2Error.message)
      } else {
        console.log('✅ user_category_xp_stats_v2 (all records) deleted')
        deletedTables.push('user_category_xp_stats_v2')
      }
    } catch (err) {
      errors.push('user_category_xp_stats_v2: ' + (err as Error).message)
    }

    // 7. user_subcategory_xp_stats_v2 - 全削除
    try {
      const { error: subcategoryXpV2Error } = await supabaseAdmin
        .from('user_subcategory_xp_stats_v2')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (subcategoryXpV2Error) {
        console.error('❌ Error deleting user_subcategory_xp_stats_v2:', subcategoryXpV2Error)
        errors.push('user_subcategory_xp_stats_v2: ' + subcategoryXpV2Error.message)
      } else {
        console.log('✅ user_subcategory_xp_stats_v2 (all records) deleted')
        deletedTables.push('user_subcategory_xp_stats_v2')
      }
    } catch (err) {
      errors.push('user_subcategory_xp_stats_v2: ' + (err as Error).message)
    }

    // 8. course_session_completions - 全削除
    try {
      const { error: courseSessionError } = await supabaseAdmin
        .from('course_session_completions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (courseSessionError) {
        console.error('❌ Error deleting course_session_completions:', courseSessionError)
        errors.push('course_session_completions: ' + courseSessionError.message)
      } else {
        console.log('✅ course_session_completions (all records) deleted')
        deletedTables.push('course_session_completions')
      }
    } catch (err) {
      errors.push('course_session_completions: ' + (err as Error).message)
    }

    // 9. course_theme_completions - 全削除
    try {
      const { error: courseThemeError } = await supabaseAdmin
        .from('course_theme_completions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (courseThemeError) {
        console.error('❌ Error deleting course_theme_completions:', courseThemeError)
        errors.push('course_theme_completions: ' + courseThemeError.message)
      } else {
        console.log('✅ course_theme_completions (all records) deleted')
        deletedTables.push('course_theme_completions')
      }
    } catch (err) {
      errors.push('course_theme_completions: ' + (err as Error).message)
    }

    // 10. course_completions - 全削除
    try {
      const { error: courseCompletionError } = await supabaseAdmin
        .from('course_completions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (courseCompletionError) {
        console.error('❌ Error deleting course_completions:', courseCompletionError)
        errors.push('course_completions: ' + courseCompletionError.message)
      } else {
        console.log('✅ course_completions (all records) deleted')
        deletedTables.push('course_completions')
      }
    } catch (err) {
      errors.push('course_completions: ' + (err as Error).message)
    }

    // 11. knowledge_card_collection - 全削除
    try {
      const { error: knowledgeCardError } = await supabaseAdmin
        .from('knowledge_card_collection')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (knowledgeCardError) {
        console.error('❌ Error deleting knowledge_card_collection:', knowledgeCardError)
        errors.push('knowledge_card_collection: ' + knowledgeCardError.message)
      } else {
        console.log('✅ knowledge_card_collection (all records) deleted')
        deletedTables.push('knowledge_card_collection')
      }
    } catch (err) {
      errors.push('knowledge_card_collection: ' + (err as Error).message)
    }

    // 12. wisdom_card_collection - 全削除
    try {
      const { error: wisdomCardError } = await supabaseAdmin
        .from('wisdom_card_collection')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (wisdomCardError) {
        console.error('❌ Error deleting wisdom_card_collection:', wisdomCardError)
        errors.push('wisdom_card_collection: ' + wisdomCardError.message)
      } else {
        console.log('✅ wisdom_card_collection (all records) deleted')
        deletedTables.push('wisdom_card_collection')
      }
    } catch (err) {
      errors.push('wisdom_card_collection: ' + (err as Error).message)
    }

    // 13. user_settings - 全削除
    try {
      const { error: userSettingsError } = await supabaseAdmin
        .from('user_settings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (userSettingsError) {
        console.error('❌ Error deleting user_settings:', userSettingsError)
        errors.push('user_settings: ' + userSettingsError.message)
      } else {
        console.log('✅ user_settings (all records) deleted')
        deletedTables.push('user_settings')
      }
    } catch (err) {
      errors.push('user_settings: ' + (err as Error).message)
    }

    // 14. skp_transactions - 全削除
    try {
      const { error: skpError } = await supabaseAdmin
        .from('skp_transactions')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (skpError) {
        console.error('❌ Error deleting skp_transactions:', skpError)
        errors.push('skp_transactions: ' + skpError.message)
      } else {
        console.log('✅ skp_transactions (all records) deleted')
        deletedTables.push('skp_transactions')
      }
    } catch (err) {
      errors.push('skp_transactions: ' + (err as Error).message)
    }

    // 15. daily_xp_records - 全削除
    try {
      const { error: dailyXpError } = await supabaseAdmin
        .from('daily_xp_records')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (dailyXpError) {
        console.error('❌ Error deleting daily_xp_records:', dailyXpError)
        errors.push('daily_xp_records: ' + dailyXpError.message)
      } else {
        console.log('✅ daily_xp_records (all records) deleted')
        deletedTables.push('daily_xp_records')
      }
    } catch (err) {
      errors.push('daily_xp_records: ' + (err as Error).message)
    }

    // 16. learning_analytics_summary - 全削除
    try {
      const { error: analyticsError } = await supabaseAdmin
        .from('learning_analytics_summary')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (analyticsError) {
        console.error('❌ Error deleting learning_analytics_summary:', analyticsError)
        errors.push('learning_analytics_summary: ' + analyticsError.message)
      } else {
        console.log('✅ learning_analytics_summary (all records) deleted')
        deletedTables.push('learning_analytics_summary')
      }
    } catch (err) {
      errors.push('learning_analytics_summary: ' + (err as Error).message)
    }

    // 17. learning_effectiveness_tracking - 全削除
    try {
      const { error: analyticsError } = await supabaseAdmin
        .from('learning_effectiveness_tracking')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (analyticsError) {
        console.error('❌ Error deleting learning_effectiveness_tracking:', analyticsError)
        errors.push('learning_effectiveness_tracking: ' + analyticsError.message)
      } else {
        console.log('✅ learning_effectiveness_tracking (all records) deleted')
        deletedTables.push('learning_effectiveness_tracking')
      }
    } catch (err) {
      errors.push('learning_effectiveness_tracking: ' + (err as Error).message)
    }

    // 18. learning_recommendations - 全削除
    try {
      const { error: analyticsError } = await supabaseAdmin
        .from('learning_recommendations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (analyticsError) {
        console.error('❌ Error deleting learning_recommendations:', analyticsError)
        errors.push('learning_recommendations: ' + analyticsError.message)
      } else {
        console.log('✅ learning_recommendations (all records) deleted')
        deletedTables.push('learning_recommendations')
      }
    } catch (err) {
      errors.push('learning_recommendations: ' + (err as Error).message)
    }

    // 19. unified_learning_session_analytics - 全削除
    try {
      const { error: analyticsError } = await supabaseAdmin
        .from('unified_learning_session_analytics')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (analyticsError) {
        console.error('❌ Error deleting unified_learning_session_analytics:', analyticsError)
        errors.push('unified_learning_session_analytics: ' + analyticsError.message)
      } else {
        console.log('✅ unified_learning_session_analytics (all records) deleted')
        deletedTables.push('unified_learning_session_analytics')
      }
    } catch (err) {
      errors.push('unified_learning_session_analytics: ' + (err as Error).message)
    }

    // 20. user_learning_profiles - 全削除
    try {
      const { error: analyticsError } = await supabaseAdmin
        .from('user_learning_profiles')
        .delete()
        .neq('user_id', '00000000-0000-0000-0000-000000000000')

      if (analyticsError) {
        console.error('❌ Error deleting user_learning_profiles:', analyticsError)
        errors.push('user_learning_profiles: ' + analyticsError.message)
      } else {
        console.log('✅ user_learning_profiles (all records) deleted')
        deletedTables.push('user_learning_profiles')
      }
    } catch (err) {
      errors.push('user_learning_profiles: ' + (err as Error).message)
    }

    // 21. spaced_repetition_schedule - 全削除
    try {
      const { error: analyticsError } = await supabaseAdmin
        .from('spaced_repetition_schedule')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (analyticsError) {
        console.error('❌ Error deleting spaced_repetition_schedule:', analyticsError)
        errors.push('spaced_repetition_schedule: ' + analyticsError.message)
      } else {
        console.log('✅ spaced_repetition_schedule (all records) deleted')
        deletedTables.push('spaced_repetition_schedule')
      }
    } catch (err) {
      errors.push('spaced_repetition_schedule: ' + (err as Error).message)
    }

    console.log('🎉 全ユーザーデータリセット完了')
    console.log('Deleted from tables:', deletedTables)
    if (errors.length > 0) {
      console.log('Errors encountered:', errors)
    }

    return NextResponse.json({
      success: true,
      message: 'All user data has been reset across the platform',
      deletedTables,
      totalTablesProcessed: deletedTables.length + errors.length,
      errors: errors.length > 0 ? errors : null,
      summary: {
        successful: deletedTables.length,
        failed: errors.length,
        completionRate: Math.round((deletedTables.length / (deletedTables.length + errors.length)) * 100) || 100
      }
    })

  } catch (error) {
    console.error('❌ Unexpected error during full user data reset:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}