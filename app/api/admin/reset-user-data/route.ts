import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    console.log(`🔄 Resetting ALL data for user ${userId}`)

    const deletedTables: string[] = []
    const errors: string[] = []

    // 1. learning_progress - 学習進捗を全削除
    try {
      const { error: progressError, count: _count } = await supabaseAdmin
        .from('learning_progress')
        .delete()
        .eq('user_id', userId)

      if (progressError) {
        console.error('❌ Error deleting learning_progress:', progressError)
        errors.push('learning_progress: ' + progressError.message)
      } else {
        console.log('✅ learning_progress deleted')
        deletedTables.push('learning_progress')
      }
    } catch (err) {
      errors.push('learning_progress: ' + (err as Error).message)
    }

    // 2. user_badges - バッジを全削除
    try {
      const { error: badgeError } = await supabaseAdmin
        .from('user_badges')
        .delete()
        .eq('user_id', userId)

      if (badgeError) {
        console.warn('⚠️ Error deleting user_badges:', badgeError)
        errors.push('user_badges: ' + badgeError.message)
      } else {
        console.log('✅ user_badges deleted')
        deletedTables.push('user_badges')
      }
    } catch (err) {
      errors.push('user_badges: ' + (err as Error).message)
    }

    // 3. user_xp_stats_v2 - XP統計を全削除（v2テーブル）
    try {
      const { error: xpV2Error } = await supabaseAdmin
        .from('user_xp_stats_v2')
        .delete()
        .eq('user_id', userId)

      if (xpV2Error) {
        console.warn('⚠️ Error deleting user_xp_stats_v2:', xpV2Error)
        errors.push('user_xp_stats_v2: ' + xpV2Error.message)
      } else {
        console.log('✅ user_xp_stats_v2 deleted')
        deletedTables.push('user_xp_stats_v2')
      }
    } catch (err) {
      errors.push('user_xp_stats_v2: ' + (err as Error).message)
    }

    // 4. user_category_xp_stats_v2 - カテゴリ別XP統計を全削除（v2テーブル）
    try {
      const { error: categoryXpV2Error } = await supabaseAdmin
        .from('user_category_xp_stats_v2')
        .delete()
        .eq('user_id', userId)

      if (categoryXpV2Error) {
        console.warn('⚠️ Error deleting user_category_xp_stats_v2:', categoryXpV2Error)
        errors.push('user_category_xp_stats_v2: ' + categoryXpV2Error.message)
      } else {
        console.log('✅ user_category_xp_stats_v2 deleted')
        deletedTables.push('user_category_xp_stats_v2')
      }
    } catch (err) {
      errors.push('user_category_xp_stats_v2: ' + (err as Error).message)
    }

    // 5. user_subcategory_xp_stats_v2 - サブカテゴリ別XP統計を全削除（v2テーブル）
    try {
      const { error: subcategoryXpV2Error } = await supabaseAdmin
        .from('user_subcategory_xp_stats_v2')
        .delete()
        .eq('user_id', userId)

      if (subcategoryXpV2Error) {
        console.warn('⚠️ Error deleting user_subcategory_xp_stats_v2:', subcategoryXpV2Error)
        errors.push('user_subcategory_xp_stats_v2: ' + subcategoryXpV2Error.message)
      } else {
        console.log('✅ user_subcategory_xp_stats_v2 deleted')
        deletedTables.push('user_subcategory_xp_stats_v2')
      }
    } catch (err) {
      errors.push('user_subcategory_xp_stats_v2: ' + (err as Error).message)
    }

    // 6. quiz_answers - クイズ回答データを削除（特別処理: user_id有無両方に対応）
    try {
      // user_id指定での削除
      const { error: quizAnswersError } = await supabaseAdmin
        .from('quiz_answers')
        .delete()
        .eq('user_id', userId)

      if (quizAnswersError) {
        console.warn('⚠️ Error deleting quiz_answers with user_id:', quizAnswersError)
        errors.push('quiz_answers (user_id): ' + quizAnswersError.message)
      } else {
        console.log('✅ quiz_answers (with user_id) deleted')
        deletedTables.push('quiz_answers (with user_id)')
      }

      // 注意: user_idがNULLのレコード（96.5%）は個別ユーザーリセットでは削除されません
      console.log('ℹ️ quiz_answersのuser_id=NULLレコードは削除されませんでした（全削除APIを使用してください）')
      
    } catch (err) {
      errors.push('quiz_answers: ' + (err as Error).message)
    }

    // 7. course_session_completions - コースセッション完了履歴を削除
    try {
      const { error: courseSessionError } = await supabaseAdmin
        .from('course_session_completions')
        .delete()
        .eq('user_id', userId)

      if (courseSessionError) {
        console.warn('⚠️ Error deleting course_session_completions:', courseSessionError)
        errors.push('course_session_completions: ' + courseSessionError.message)
      } else {
        console.log('✅ course_session_completions deleted')
        deletedTables.push('course_session_completions')
      }
    } catch (err) {
      errors.push('course_session_completions: ' + (err as Error).message)
    }

    // 8. course_theme_completions - コーステーマ完了履歴を削除
    try {
      const { error: courseThemeError } = await supabaseAdmin
        .from('course_theme_completions')
        .delete()
        .eq('user_id', userId)

      if (courseThemeError) {
        console.warn('⚠️ Error deleting course_theme_completions:', courseThemeError)
        errors.push('course_theme_completions: ' + courseThemeError.message)
      } else {
        console.log('✅ course_theme_completions deleted')
        deletedTables.push('course_theme_completions')
      }
    } catch (err) {
      errors.push('course_theme_completions: ' + (err as Error).message)
    }

    // 9. course_completions - コース完了履歴を削除
    try {
      const { error: courseCompletionError } = await supabaseAdmin
        .from('course_completions')
        .delete()
        .eq('user_id', userId)

      if (courseCompletionError) {
        console.warn('⚠️ Error deleting course_completions:', courseCompletionError)
        errors.push('course_completions: ' + courseCompletionError.message)
      } else {
        console.log('✅ course_completions deleted')
        deletedTables.push('course_completions')
      }
    } catch (err) {
      errors.push('course_completions: ' + (err as Error).message)
    }

    // 10. user_progress - レガシーテーブル（削除済み）
    // Note: user_progressテーブルは削除済みのため処理をスキップ

    // 11. quiz_results - レガシーテーブル（削除済み）
    // Note: quiz_resultsテーブルは削除済みのため処理をスキップ

    // 12. detailed_quiz_data - レガシーテーブル（削除済み）
    // Note: detailed_quiz_dataテーブルは削除済みのため処理をスキップ

    // 13. knowledge_card_collection - ナレッジカード収集を削除
    try {
      const { error: knowledgeCardError } = await supabaseAdmin
        .from('knowledge_card_collection')
        .delete()
        .eq('user_id', userId)

      if (knowledgeCardError) {
        console.warn('⚠️ Error deleting knowledge_card_collection:', knowledgeCardError)
        errors.push('knowledge_card_collection: ' + knowledgeCardError.message)
      } else {
        console.log('✅ knowledge_card_collection deleted')
        deletedTables.push('knowledge_card_collection')
      }
    } catch (err) {
      errors.push('knowledge_card_collection: ' + (err as Error).message)
    }

    // 14. wisdom_card_collection - 格言カード収集を削除
    try {
      const { error: wisdomCardError } = await supabaseAdmin
        .from('wisdom_card_collection')
        .delete()
        .eq('user_id', userId)

      if (wisdomCardError) {
        console.warn('⚠️ Error deleting wisdom_card_collection:', wisdomCardError)
        errors.push('wisdom_card_collection: ' + wisdomCardError.message)
      } else {
        console.log('✅ wisdom_card_collection deleted')
        deletedTables.push('wisdom_card_collection')
      }
    } catch (err) {
      errors.push('wisdom_card_collection: ' + (err as Error).message)
    }

    // 15. user_settings - ユーザー設定を削除
    try {
      const { error: userSettingsError } = await supabaseAdmin
        .from('user_settings')
        .delete()
        .eq('user_id', userId)

      if (userSettingsError) {
        console.warn('⚠️ Error deleting user_settings:', userSettingsError)
        errors.push('user_settings: ' + userSettingsError.message)
      } else {
        console.log('✅ user_settings deleted')
        deletedTables.push('user_settings')
      }
    } catch (err) {
      errors.push('user_settings: ' + (err as Error).message)
    }

    // 16. SKP取引履歴を削除
    try {
      const { error: skpError } = await supabaseAdmin
        .from('skp_transactions')
        .delete()
        .eq('user_id', userId)

      if (skpError) {
        console.warn('⚠️ Error deleting skp_transactions:', skpError)
        errors.push('skp_transactions: ' + skpError.message)
      } else {
        console.log('✅ skp_transactions deleted')
        deletedTables.push('skp_transactions')
      }
    } catch (err) {
      errors.push('skp_transactions: ' + (err as Error).message)
    }

    // 17. daily_xp_records - 日別XP記録を削除（連続学習日数計算用）
    try {
      const { error: dailyXpError } = await supabaseAdmin
        .from('daily_xp_records')
        .delete()
        .eq('user_id', userId)

      if (dailyXpError) {
        console.warn('⚠️ Error deleting daily_xp_records:', dailyXpError)
        errors.push('daily_xp_records: ' + dailyXpError.message)
      } else {
        console.log('✅ daily_xp_records deleted')
        deletedTables.push('daily_xp_records')
      }
    } catch (err) {
      errors.push('daily_xp_records: ' + (err as Error).message)
    }

    // 18. quiz_sessions - クイズセッション履歴を削除
    try {
      const { error: quizError } = await supabaseAdmin
        .from('quiz_sessions')
        .delete()
        .eq('user_id', userId)

      if (quizError) {
        console.warn('⚠️ Error deleting quiz_sessions:', quizError)
        errors.push('quiz_sessions: ' + quizError.message)
      } else {
        console.log('✅ quiz_sessions deleted')
        deletedTables.push('quiz_sessions')
      }
    } catch (err) {
      errors.push('quiz_sessions: ' + (err as Error).message)
    }

    // 19. learning_analytics_summary - 学習分析サマリーを削除
    try {
      const { error: analyticsError } = await supabaseAdmin
        .from('learning_analytics_summary')
        .delete()
        .eq('user_id', userId)

      if (analyticsError) {
        console.warn('⚠️ Error deleting learning_analytics_summary:', analyticsError)
        errors.push('learning_analytics_summary: ' + analyticsError.message)
      } else {
        console.log('✅ learning_analytics_summary deleted')
        deletedTables.push('learning_analytics_summary')
      }
    } catch (err) {
      errors.push('learning_analytics_summary: ' + (err as Error).message)
    }

    // 20. learning_effectiveness_tracking - 学習効果追跡データを削除
    try {
      const { error: effectivenessError } = await supabaseAdmin
        .from('learning_effectiveness_tracking')
        .delete()
        .eq('user_id', userId)

      if (effectivenessError) {
        console.warn('⚠️ Error deleting learning_effectiveness_tracking:', effectivenessError)
        errors.push('learning_effectiveness_tracking: ' + effectivenessError.message)
      } else {
        console.log('✅ learning_effectiveness_tracking deleted')
        deletedTables.push('learning_effectiveness_tracking')
      }
    } catch (err) {
      errors.push('learning_effectiveness_tracking: ' + (err as Error).message)
    }

    // 21. learning_recommendations - 学習推奨データを削除
    try {
      const { error: recommendationsError } = await supabaseAdmin
        .from('learning_recommendations')
        .delete()
        .eq('user_id', userId)

      if (recommendationsError) {
        console.warn('⚠️ Error deleting learning_recommendations:', recommendationsError)
        errors.push('learning_recommendations: ' + recommendationsError.message)
      } else {
        console.log('✅ learning_recommendations deleted')
        deletedTables.push('learning_recommendations')
      }
    } catch (err) {
      errors.push('learning_recommendations: ' + (err as Error).message)
    }

    // 22. unified_learning_session_analytics - 統合学習セッション分析データを削除
    try {
      const { error: unifiedAnalyticsError } = await supabaseAdmin
        .from('unified_learning_session_analytics')
        .delete()
        .eq('user_id', userId)

      if (unifiedAnalyticsError) {
        console.warn('⚠️ Error deleting unified_learning_session_analytics:', unifiedAnalyticsError)
        errors.push('unified_learning_session_analytics: ' + unifiedAnalyticsError.message)
      } else {
        console.log('✅ unified_learning_session_analytics deleted')
        deletedTables.push('unified_learning_session_analytics')
      }
    } catch (err) {
      errors.push('unified_learning_session_analytics: ' + (err as Error).message)
    }

    // 23. user_learning_profiles - ユーザー学習プロファイルを削除
    try {
      const { error: learningProfilesError } = await supabaseAdmin
        .from('user_learning_profiles')
        .delete()
        .eq('user_id', userId)

      if (learningProfilesError) {
        console.warn('⚠️ Error deleting user_learning_profiles:', learningProfilesError)
        errors.push('user_learning_profiles: ' + learningProfilesError.message)
      } else {
        console.log('✅ user_learning_profiles deleted')
        deletedTables.push('user_learning_profiles')
      }
    } catch (err) {
      errors.push('user_learning_profiles: ' + (err as Error).message)
    }

    // 24. spaced_repetition_schedule - 間隔反復学習スケジュールを削除
    try {
      const { error: spacedRepetitionError } = await supabaseAdmin
        .from('spaced_repetition_schedule')
        .delete()
        .eq('user_id', userId)

      if (spacedRepetitionError) {
        console.warn('⚠️ Error deleting spaced_repetition_schedule:', spacedRepetitionError)
        errors.push('spaced_repetition_schedule: ' + spacedRepetitionError.message)
      } else {
        console.log('✅ spaced_repetition_schedule deleted')
        deletedTables.push('spaced_repetition_schedule')
      }
    } catch (err) {
      errors.push('spaced_repetition_schedule: ' + (err as Error).message)
    }

    console.log('🎉 User data reset completed')
    console.log('Deleted from tables:', deletedTables)
    if (errors.length > 0) {
      console.log('Errors encountered:', errors)
    }

    return NextResponse.json({
      success: true,
      message: `All data reset for user ${userId}`,
      deletedTables,
      errors: errors.length > 0 ? errors : null
    })

  } catch (error) {
    console.error('❌ Unexpected error resetting user data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}