import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { confirmationCode } = await request.json()

    // 安全確認: 特定の確認コードを要求
    if (confirmationCode !== 'RESET_ALL_USERS_CONFIRMED_2025') {
      return NextResponse.json(
        { error: 'Invalid confirmation code. Use "RESET_ALL_USERS_CONFIRMED_2025" to confirm.' },
        { status: 400 }
      )
    }

    console.log('🚨 全ユーザーデータリセット開始')
    console.log('⚠️  警告: 全ユーザーの全データが削除されます')

    const deletedTables: string[] = []
    const errors: string[] = []
    const deletedCounts: Record<string, number> = {}

    // 1. learning_progress - 学習進捗を全削除
    try {
      const { error: progressError, count } = await supabaseAdmin
        .from('learning_progress')
        .delete()
        .neq('user_id', '') // 全削除（user_idが空文字でないもの = 全て）

      if (progressError) {
        console.error('❌ Error deleting learning_progress:', progressError)
        errors.push('learning_progress: ' + progressError.message)
      } else {
        console.log('✅ learning_progress deleted')
        deletedTables.push('learning_progress')
        deletedCounts['learning_progress'] = count || 0
      }
    } catch (err) {
      errors.push('learning_progress: ' + (err as Error).message)
    }

    // 2. user_badges - バッジを全削除
    try {
      const { error: badgeError, count } = await supabaseAdmin
        .from('user_badges')
        .delete()
        .neq('user_id', '')

      if (badgeError) {
        console.warn('⚠️ Error deleting user_badges:', badgeError)
        errors.push('user_badges: ' + badgeError.message)
      } else {
        console.log('✅ user_badges deleted')
        deletedTables.push('user_badges')
        deletedCounts['user_badges'] = count || 0
      }
    } catch (err) {
      errors.push('user_badges: ' + (err as Error).message)
    }

    // 3. user_xp_stats_v2 - XP統計を全削除（v2テーブル）
    try {
      const { error: xpV2Error, count } = await supabaseAdmin
        .from('user_xp_stats_v2')
        .delete()
        .neq('user_id', '')

      if (xpV2Error) {
        console.warn('⚠️ Error deleting user_xp_stats_v2:', xpV2Error)
        errors.push('user_xp_stats_v2: ' + xpV2Error.message)
      } else {
        console.log('✅ user_xp_stats_v2 deleted')
        deletedTables.push('user_xp_stats_v2')
        deletedCounts['user_xp_stats_v2'] = count || 0
      }
    } catch (err) {
      errors.push('user_xp_stats_v2: ' + (err as Error).message)
    }

    // 4. user_category_xp_stats_v2 - カテゴリ別XP統計を全削除（v2テーブル）
    try {
      const { error: categoryXpV2Error, count } = await supabaseAdmin
        .from('user_category_xp_stats_v2')
        .delete()
        .neq('user_id', '')

      if (categoryXpV2Error) {
        console.warn('⚠️ Error deleting user_category_xp_stats_v2:', categoryXpV2Error)
        errors.push('user_category_xp_stats_v2: ' + categoryXpV2Error.message)
      } else {
        console.log('✅ user_category_xp_stats_v2 deleted')
        deletedTables.push('user_category_xp_stats_v2')
        deletedCounts['user_category_xp_stats_v2'] = count || 0
      }
    } catch (err) {
      errors.push('user_category_xp_stats_v2: ' + (err as Error).message)
    }

    // 5. user_subcategory_xp_stats_v2 - サブカテゴリ別XP統計を全削除（v2テーブル）
    try {
      const { error: subcategoryXpV2Error, count } = await supabaseAdmin
        .from('user_subcategory_xp_stats_v2')
        .delete()
        .neq('user_id', '')

      if (subcategoryXpV2Error) {
        console.warn('⚠️ Error deleting user_subcategory_xp_stats_v2:', subcategoryXpV2Error)
        errors.push('user_subcategory_xp_stats_v2: ' + subcategoryXpV2Error.message)
      } else {
        console.log('✅ user_subcategory_xp_stats_v2 deleted')
        deletedTables.push('user_subcategory_xp_stats_v2')
        deletedCounts['user_subcategory_xp_stats_v2'] = count || 0
      }
    } catch (err) {
      errors.push('user_subcategory_xp_stats_v2: ' + (err as Error).message)
    }

    // 6. quiz_answers - クイズ回答データを全削除（修正版）
    try {
      // 全quiz_answersを削除（created_atベースで確実に削除）
      const { error: quizAnswersError, count } = await supabaseAdmin
        .from('quiz_answers')
        .delete()
        .gte('created_at', '2020-01-01') // 2020年以降全削除（実質全削除）

      if (quizAnswersError) {
        console.warn('⚠️ Error deleting quiz_answers:', quizAnswersError)
        errors.push('quiz_answers: ' + quizAnswersError.message)
      } else {
        console.log('✅ quiz_answers (all records) deleted')
        deletedTables.push('quiz_answers')
        deletedCounts['quiz_answers'] = count || 0
      }
    } catch (err) {
      errors.push('quiz_answers: ' + (err as Error).message)
    }

    // 7. course_session_completions - コースセッション完了履歴を削除
    try {
      const { error: courseSessionError, count } = await supabaseAdmin
        .from('course_session_completions')
        .delete()
        .neq('user_id', '')

      if (courseSessionError) {
        console.warn('⚠️ Error deleting course_session_completions:', courseSessionError)
        errors.push('course_session_completions: ' + courseSessionError.message)
      } else {
        console.log('✅ course_session_completions deleted')
        deletedTables.push('course_session_completions')
        deletedCounts['course_session_completions'] = count || 0
      }
    } catch (err) {
      errors.push('course_session_completions: ' + (err as Error).message)
    }

    // 8. course_theme_completions - コーステーマ完了履歴を削除
    try {
      const { error: courseThemeError, count } = await supabaseAdmin
        .from('course_theme_completions')
        .delete()
        .neq('user_id', '')

      if (courseThemeError) {
        console.warn('⚠️ Error deleting course_theme_completions:', courseThemeError)
        errors.push('course_theme_completions: ' + courseThemeError.message)
      } else {
        console.log('✅ course_theme_completions deleted')
        deletedTables.push('course_theme_completions')
        deletedCounts['course_theme_completions'] = count || 0
      }
    } catch (err) {
      errors.push('course_theme_completions: ' + (err as Error).message)
    }

    // 9. course_completions - コース完了履歴を削除
    try {
      const { error: courseCompletionError, count } = await supabaseAdmin
        .from('course_completions')
        .delete()
        .neq('user_id', '')

      if (courseCompletionError) {
        console.warn('⚠️ Error deleting course_completions:', courseCompletionError)
        errors.push('course_completions: ' + courseCompletionError.message)
      } else {
        console.log('✅ course_completions deleted')
        deletedTables.push('course_completions')
        deletedCounts['course_completions'] = count || 0
      }
    } catch (err) {
      errors.push('course_completions: ' + (err as Error).message)
    }

    // 10. knowledge_card_collection - ナレッジカード収集を削除（レガシーテーブル）
    try {
      const { error: knowledgeCardError, count } = await supabaseAdmin
        .from('knowledge_card_collection')
        .delete()
        .neq('user_id', '')

      if (knowledgeCardError) {
        console.warn('⚠️ Error deleting knowledge_card_collection:', knowledgeCardError)
        errors.push('knowledge_card_collection: ' + knowledgeCardError.message)
      } else {
        console.log('✅ knowledge_card_collection deleted')
        deletedTables.push('knowledge_card_collection')
        deletedCounts['knowledge_card_collection'] = count || 0
      }
    } catch (err) {
      errors.push('knowledge_card_collection: ' + (err as Error).message)
    }

    // 11. user_knowledge_collection_v2 - ナレッジカード収集V2を削除
    try {
      const { error: knowledgeCardV2Error, count } = await supabaseAdmin
        .from('user_knowledge_collection_v2')
        .delete()
        .neq('user_id', '')

      if (knowledgeCardV2Error) {
        console.warn('⚠️ Error deleting user_knowledge_collection_v2:', knowledgeCardV2Error)
        errors.push('user_knowledge_collection_v2: ' + knowledgeCardV2Error.message)
      } else {
        console.log('✅ user_knowledge_collection_v2 deleted')
        deletedTables.push('user_knowledge_collection_v2')
        deletedCounts['user_knowledge_collection_v2'] = count || 0
      }
    } catch (err) {
      errors.push('user_knowledge_collection_v2: ' + (err as Error).message)
    }

    // 12. wisdom_card_collection - 格言カード収集を削除
    try {
      const { error: wisdomCardError, count } = await supabaseAdmin
        .from('wisdom_card_collection')
        .delete()
        .neq('user_id', '')

      if (wisdomCardError) {
        console.warn('⚠️ Error deleting wisdom_card_collection:', wisdomCardError)
        errors.push('wisdom_card_collection: ' + wisdomCardError.message)
      } else {
        console.log('✅ wisdom_card_collection deleted')
        deletedTables.push('wisdom_card_collection')
        deletedCounts['wisdom_card_collection'] = count || 0
      }
    } catch (err) {
      errors.push('wisdom_card_collection: ' + (err as Error).message)
    }

    // 13. user_settings - ユーザー設定を削除
    try {
      const { error: userSettingsError, count } = await supabaseAdmin
        .from('user_settings')
        .delete()
        .neq('user_id', '')

      if (userSettingsError) {
        console.warn('⚠️ Error deleting user_settings:', userSettingsError)
        errors.push('user_settings: ' + userSettingsError.message)
      } else {
        console.log('✅ user_settings deleted')
        deletedTables.push('user_settings')
        deletedCounts['user_settings'] = count || 0
      }
    } catch (err) {
      errors.push('user_settings: ' + (err as Error).message)
    }

    // 14. SKP取引履歴を削除
    try {
      const { error: skpError, count } = await supabaseAdmin
        .from('skp_transactions')
        .delete()
        .neq('user_id', '')

      if (skpError) {
        console.warn('⚠️ Error deleting skp_transactions:', skpError)
        errors.push('skp_transactions: ' + skpError.message)
      } else {
        console.log('✅ skp_transactions deleted')
        deletedTables.push('skp_transactions')
        deletedCounts['skp_transactions'] = count || 0
      }
    } catch (err) {
      errors.push('skp_transactions: ' + (err as Error).message)
    }

    // 15. daily_xp_records - 日別XP記録を削除（連続学習日数計算用）
    try {
      const { error: dailyXpError, count } = await supabaseAdmin
        .from('daily_xp_records')
        .delete()
        .neq('user_id', '')

      if (dailyXpError) {
        console.warn('⚠️ Error deleting daily_xp_records:', dailyXpError)
        errors.push('daily_xp_records: ' + dailyXpError.message)
      } else {
        console.log('✅ daily_xp_records deleted')
        deletedTables.push('daily_xp_records')
        deletedCounts['daily_xp_records'] = count || 0
      }
    } catch (err) {
      errors.push('daily_xp_records: ' + (err as Error).message)
    }

    // 16. quiz_sessions - クイズセッション履歴を削除
    try {
      const { error: quizError, count } = await supabaseAdmin
        .from('quiz_sessions')
        .delete()
        .neq('user_id', '')

      if (quizError) {
        console.warn('⚠️ Error deleting quiz_sessions:', quizError)
        errors.push('quiz_sessions: ' + quizError.message)
      } else {
        console.log('✅ quiz_sessions deleted')
        deletedTables.push('quiz_sessions')
        deletedCounts['quiz_sessions'] = count || 0
      }
    } catch (err) {
      errors.push('quiz_sessions: ' + (err as Error).message)
    }

    // 17. learning_analytics_summary - 学習分析サマリーを削除
    try {
      const { error: analyticsError, count } = await supabaseAdmin
        .from('learning_analytics_summary')
        .delete()
        .neq('user_id', '')

      if (analyticsError) {
        console.warn('⚠️ Error deleting learning_analytics_summary:', analyticsError)
        errors.push('learning_analytics_summary: ' + analyticsError.message)
      } else {
        console.log('✅ learning_analytics_summary deleted')
        deletedTables.push('learning_analytics_summary')
        deletedCounts['learning_analytics_summary'] = count || 0
      }
    } catch (err) {
      errors.push('learning_analytics_summary: ' + (err as Error).message)
    }

    // 18. learning_effectiveness_tracking - 学習効果追跡データを削除
    try {
      const { error: effectivenessError, count } = await supabaseAdmin
        .from('learning_effectiveness_tracking')
        .delete()
        .neq('user_id', '')

      if (effectivenessError) {
        console.warn('⚠️ Error deleting learning_effectiveness_tracking:', effectivenessError)
        errors.push('learning_effectiveness_tracking: ' + effectivenessError.message)
      } else {
        console.log('✅ learning_effectiveness_tracking deleted')
        deletedTables.push('learning_effectiveness_tracking')
        deletedCounts['learning_effectiveness_tracking'] = count || 0
      }
    } catch (err) {
      errors.push('learning_effectiveness_tracking: ' + (err as Error).message)
    }

    // 19. learning_recommendations - 学習推奨データを削除
    try {
      const { error: recommendationsError, count } = await supabaseAdmin
        .from('learning_recommendations')
        .delete()
        .neq('user_id', '')

      if (recommendationsError) {
        console.warn('⚠️ Error deleting learning_recommendations:', recommendationsError)
        errors.push('learning_recommendations: ' + recommendationsError.message)
      } else {
        console.log('✅ learning_recommendations deleted')
        deletedTables.push('learning_recommendations')
        deletedCounts['learning_recommendations'] = count || 0
      }
    } catch (err) {
      errors.push('learning_recommendations: ' + (err as Error).message)
    }

    // 20. unified_learning_session_analytics - 統合学習セッション分析データを削除
    try {
      const { error: unifiedAnalyticsError, count } = await supabaseAdmin
        .from('unified_learning_session_analytics')
        .delete()
        .neq('user_id', '')

      if (unifiedAnalyticsError) {
        console.warn('⚠️ Error deleting unified_learning_session_analytics:', unifiedAnalyticsError)
        errors.push('unified_learning_session_analytics: ' + unifiedAnalyticsError.message)
      } else {
        console.log('✅ unified_learning_session_analytics deleted')
        deletedTables.push('unified_learning_session_analytics')
        deletedCounts['unified_learning_session_analytics'] = count || 0
      }
    } catch (err) {
      errors.push('unified_learning_session_analytics: ' + (err as Error).message)
    }

    // 21. user_learning_profiles - ユーザー学習プロファイルを削除
    try {
      const { error: learningProfilesError, count } = await supabaseAdmin
        .from('user_learning_profiles')
        .delete()
        .neq('user_id', '')

      if (learningProfilesError) {
        console.warn('⚠️ Error deleting user_learning_profiles:', learningProfilesError)
        errors.push('user_learning_profiles: ' + learningProfilesError.message)
      } else {
        console.log('✅ user_learning_profiles deleted')
        deletedTables.push('user_learning_profiles')
        deletedCounts['user_learning_profiles'] = count || 0
      }
    } catch (err) {
      errors.push('user_learning_profiles: ' + (err as Error).message)
    }

    // 22. spaced_repetition_schedule - 間隔反復学習スケジュールを削除
    try {
      const { error: spacedRepetitionError, count } = await supabaseAdmin
        .from('spaced_repetition_schedule')
        .delete()
        .neq('user_id', '')

      if (spacedRepetitionError) {
        console.warn('⚠️ Error deleting spaced_repetition_schedule:', spacedRepetitionError)
        errors.push('spaced_repetition_schedule: ' + spacedRepetitionError.message)
      } else {
        console.log('✅ spaced_repetition_schedule deleted')
        deletedTables.push('spaced_repetition_schedule')
        deletedCounts['spaced_repetition_schedule'] = count || 0
      }
    } catch (err) {
      errors.push('spaced_repetition_schedule: ' + (err as Error).message)
    }

    // 総削除レコード数を計算
    const totalDeletedRecords = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0)

    console.log('🎉 全ユーザーデータリセット完了')
    console.log('Deleted from tables:', deletedTables)
    console.log('Total deleted records:', totalDeletedRecords)
    if (errors.length > 0) {
      console.log('Errors encountered:', errors)
    }

    return NextResponse.json({
      success: true,
      message: `All user data reset completed`,
      deletedTables,
      deletedCounts,
      totalDeletedRecords,
      errors: errors.length > 0 ? errors : null,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Unexpected error during full user data reset:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}