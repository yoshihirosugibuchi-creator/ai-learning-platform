import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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
      const { error: progressError, count: _count } = await supabase
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
      const { error: badgeError } = await supabase
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

    // 3. user_xp_stats - XP統計を全削除（v1テーブル）
    try {
      const { error: xpError } = await supabase
        .from('user_xp_stats')
        .delete()
        .eq('user_id', userId)

      if (xpError) {
        console.warn('⚠️ Error deleting user_xp_stats:', xpError)
        errors.push('user_xp_stats: ' + xpError.message)
      } else {
        console.log('✅ user_xp_stats deleted')
        deletedTables.push('user_xp_stats')
      }
    } catch (err) {
      errors.push('user_xp_stats: ' + (err as Error).message)
    }

    // 3b. user_xp_stats_v2 - XP統計を全削除（v2テーブル）
    try {
      const { error: xpV2Error } = await supabase
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

    // 4. user_category_xp_stats - カテゴリ別XP統計を全削除（v1テーブル）
    try {
      const { error: categoryXpError } = await supabase
        .from('user_category_xp_stats')
        .delete()
        .eq('user_id', userId)

      if (categoryXpError) {
        console.warn('⚠️ Error deleting user_category_xp_stats:', categoryXpError)
        errors.push('user_category_xp_stats: ' + categoryXpError.message)
      } else {
        console.log('✅ user_category_xp_stats deleted')
        deletedTables.push('user_category_xp_stats')
      }
    } catch (err) {
      errors.push('user_category_xp_stats: ' + (err as Error).message)
    }

    // 4b. user_category_xp_stats_v2 - カテゴリ別XP統計を全削除（v2テーブル）
    try {
      const { error: categoryXpV2Error } = await supabase
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

    // 4c. user_subcategory_xp_stats_v2 - サブカテゴリ別XP統計を全削除（v2テーブル）
    try {
      const { error: subcategoryXpV2Error } = await supabase
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

    // quiz_answers は quiz_sessions 削除時に外部キー制約で自動削除される
    // 手動削除は不要（user_id カラムも存在しない）
    console.log('ℹ️ quiz_answers は quiz_sessions 削除時に自動削除されます')
    deletedTables.push('quiz_answers (auto-deleted)')

    // 6. course_session_completions - コースセッション完了履歴を削除
    try {
      const { error: courseSessionError } = await supabase
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

    // 7. course_theme_completions - コーステーマ完了履歴を削除
    try {
      const { error: courseThemeError } = await supabase
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

    // 8. course_completions - コース完了履歴を削除
    try {
      const { error: courseCompletionError } = await supabase
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

    // 9. user_progress - ユーザー進捗を削除
    try {
      const { error: userProgressError } = await supabase
        .from('user_progress')
        .delete()
        .eq('user_id', userId)

      if (userProgressError) {
        console.warn('⚠️ Error deleting user_progress:', userProgressError)
        errors.push('user_progress: ' + userProgressError.message)
      } else {
        console.log('✅ user_progress deleted')
        deletedTables.push('user_progress')
      }
    } catch (err) {
      errors.push('user_progress: ' + (err as Error).message)
    }

    // 10. quiz_results - クイズ結果を削除
    try {
      const { error: quizResultsError } = await supabase
        .from('quiz_results')
        .delete()
        .eq('user_id', userId)

      if (quizResultsError) {
        console.warn('⚠️ Error deleting quiz_results:', quizResultsError)
        errors.push('quiz_results: ' + quizResultsError.message)
      } else {
        console.log('✅ quiz_results deleted')
        deletedTables.push('quiz_results')
      }
    } catch (err) {
      errors.push('quiz_results: ' + (err as Error).message)
    }

    // 11. detailed_quiz_data - 詳細クイズデータを削除
    try {
      const { error: detailedQuizError } = await supabase
        .from('detailed_quiz_data')
        .delete()
        .eq('user_id', userId)

      if (detailedQuizError) {
        console.warn('⚠️ Error deleting detailed_quiz_data:', detailedQuizError)
        errors.push('detailed_quiz_data: ' + detailedQuizError.message)
      } else {
        console.log('✅ detailed_quiz_data deleted')
        deletedTables.push('detailed_quiz_data')
      }
    } catch (err) {
      errors.push('detailed_quiz_data: ' + (err as Error).message)
    }

    // 12. knowledge_card_collection - ナレッジカード収集を削除
    try {
      const { error: knowledgeCardError } = await supabase
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

    // 13. wisdom_card_collection - 格言カード収集を削除
    try {
      const { error: wisdomCardError } = await supabase
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

    // 14. user_settings - ユーザー設定を削除
    try {
      const { error: userSettingsError } = await supabase
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

    // 15. SKP取引履歴を削除
    try {
      const { error: skpError } = await supabase
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

    // 16. daily_xp_records - 日別XP記録を削除（連続学習日数計算用）
    try {
      const { error: dailyXpError } = await supabase
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

    // 17. quiz_sessions - クイズセッション履歴を削除
    try {
      const { error: quizError } = await supabase
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