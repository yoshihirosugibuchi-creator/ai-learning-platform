/**
 * 統一フォールバックデータ同期スクリプト
 * 
 * 実行方法:
 * npm run sync:all-fallback
 * または管理画面からワンクリック実行
 */

import { writeFileSync } from 'fs'
import { join } from 'path'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface SyncResult {
  success: boolean
  dataType: string
  recordCount: number
  filePath: string
  error?: string
  timestamp: string
  breakdown?: Record<string, number>
}

interface SyncSummary {
  totalSynced: number
  successful: number
  failed: number
  results: SyncResult[]
  executionTime: number
}

/**
 * 1. XP/SKP設定同期
 */
async function syncXPSettings(): Promise<SyncResult> {
  const dataType = 'XP/SKP設定'
  const timestamp = new Date().toISOString()
  
  try {
    console.log('🔄 XP/SKP設定同期中...')
    
    const { data: settings, error } = await supabaseAdmin
      .from('xp_level_skp_settings')
      .select('setting_category, setting_key, setting_value')
      .eq('is_active', true)
      .order('setting_category, setting_key')

    if (error) throw error
    if (!settings || settings.length === 0) throw new Error('XP設定が見つかりません')

    // 設定をカテゴリ別に整理
    const loadedSettings: Record<string, Record<string, number>> = {
      xp_quiz: {},
      xp_course: {},
      xp_bonus: {},
      level: {},
      skp: {}
    }

    settings.forEach((setting: { setting_category: string; setting_key: string; setting_value: number }) => {
      const { setting_category, setting_key, setting_value } = setting
      if (loadedSettings[setting_category]) {
        loadedSettings[setting_category][setting_key] = setting_value
      }
    })

    // TypeScriptファイル生成
    const fallbackFilePath = join(process.cwd(), 'lib', 'xp-settings-fallback.generated.ts')
    const fileContent = `/**
 * 動的生成XPフォールバック設定
 * 
 * ⚠️ 注意: このファイルは自動生成されます。手動で編集しないでください。
 * 
 * 生成時刻: ${timestamp}
 * データベース設定件数: ${settings.length}件
 * 
 * 生成元: scripts/sync-all-fallback-data.ts
 * データソース: xp_level_skp_settings テーブル
 */

import type { XPSettings } from './xp-settings'

export const DATABASE_FALLBACK_SETTINGS: XPSettings = {
  xp_quiz: {
    basic: ${loadedSettings.xp_quiz.basic},
    intermediate: ${loadedSettings.xp_quiz.intermediate},
    advanced: ${loadedSettings.xp_quiz.advanced},
    expert: ${loadedSettings.xp_quiz.expert}
  },
  xp_course: {
    basic: ${loadedSettings.xp_course.basic},
    intermediate: ${loadedSettings.xp_course.intermediate},
    advanced: ${loadedSettings.xp_course.advanced},
    expert: ${loadedSettings.xp_course.expert}
  },
  xp_bonus: {
    quiz_accuracy_80: ${loadedSettings.xp_bonus.quiz_accuracy_80},
    quiz_accuracy_100: ${loadedSettings.xp_bonus.quiz_accuracy_100},
    course_completion: ${loadedSettings.xp_bonus.course_completion}
  },
  level: {
    overall_threshold: ${loadedSettings.level.overall_threshold},
    main_category_threshold: ${loadedSettings.level.main_category_threshold},
    industry_category_threshold: ${loadedSettings.level.industry_category_threshold},
    industry_subcategory_threshold: ${loadedSettings.level.industry_subcategory_threshold}
  },
  skp: {
    quiz_correct: ${loadedSettings.skp.quiz_correct},
    quiz_incorrect: ${loadedSettings.skp.quiz_incorrect},
    quiz_perfect_bonus: ${loadedSettings.skp.quiz_perfect_bonus},
    course_correct: ${loadedSettings.skp.course_correct},
    course_incorrect: ${loadedSettings.skp.course_incorrect},
    course_complete_bonus: ${loadedSettings.skp.course_complete_bonus},
    daily_streak_bonus: ${loadedSettings.skp.daily_streak_bonus},
    ten_day_streak_bonus: ${loadedSettings.skp.ten_day_streak_bonus}
  }
}

export const FALLBACK_METADATA = {
  generatedAt: '${timestamp}',
  sourceRecordCount: ${settings.length},
  databaseSource: 'xp_level_skp_settings',
  generatorScript: 'scripts/sync-all-fallback-data.ts'
}
`

    writeFileSync(fallbackFilePath, fileContent, 'utf8')

    return {
      success: true,
      dataType,
      recordCount: settings.length,
      filePath: fallbackFilePath,
      timestamp
    }

  } catch (error) {
    return {
      success: false,
      dataType,
      recordCount: 0,
      filePath: '',
      error: error instanceof Error ? error.message : String(error),
      timestamp
    }
  }
}

/**
 * 2. クイズ問題同期
 */
async function syncQuizQuestions(): Promise<SyncResult> {
  const dataType = 'クイズ問題'
  const timestamp = new Date().toISOString()
  
  try {
    console.log('🔄 クイズ問題同期中...')
    
    const { data: questions, error } = await supabaseAdmin
      .from('quiz_questions')
      .select('*')
      .is('is_deleted', false)
      .order('id')

    if (error) {
      console.error('❌ クイズ問題取得エラー:', error)
      throw error
    }
    if (!questions || questions.length === 0) throw new Error('クイズ問題が見つかりません')

    console.log(`📊 クイズ問題取得成功: ${questions.length}件`)

    const fallbackFilePath = join(process.cwd(), 'public', 'questions.json')
    const fallbackData = {
      questions,
      metadata: {
        generatedAt: timestamp,
        sourceRecordCount: questions.length,
        databaseSource: 'quiz_questions',
        generatorScript: 'scripts/sync-all-fallback-data.ts'
      }
    }

    writeFileSync(fallbackFilePath, JSON.stringify(fallbackData, null, 2), 'utf8')
    console.log(`✅ クイズ問題ファイル作成完了: ${fallbackFilePath}`)

    return {
      success: true,
      dataType,
      recordCount: questions.length,
      filePath: fallbackFilePath,
      timestamp
    }

  } catch (error) {
    console.error(`❌ ${dataType}同期エラー:`, error)
    return {
      success: false,
      dataType,
      recordCount: 0,
      filePath: '',
      error: error instanceof Error ? error.message : String(error),
      timestamp
    }
  }
}

/**
 * 3. コース学習データ同期
 */
async function syncLearningCourses(): Promise<SyncResult> {
  const dataType = 'コース学習データ'
  const timestamp = new Date().toISOString()
  
  try {
    console.log('🔄 コース学習データ同期中...')
    
    // コース、ジャンル、テーマ、セッションコンテンツ、セッションクイズを並列取得
    const [coursesResult, genresResult, themesResult, sessionContentsResult, sessionQuizzesResult] = await Promise.all([
      supabaseAdmin
        .from('learning_courses')
        .select('*')
        .eq('status', 'active')
        .order('display_order'),
      supabaseAdmin
        .from('learning_genres')
        .select('*')
        .order('course_id, display_order'),
      supabaseAdmin
        .from('learning_themes')
        .select('*')
        .order('genre_id, display_order'),
      supabaseAdmin
        .from('session_contents')
        .select('*')
        .order('session_id, display_order'),
      supabaseAdmin
        .from('session_quizzes')
        .select('*')
        .order('session_id, display_order')
    ])

    if (coursesResult.error) {
      console.error('❌ コース取得エラー:', coursesResult.error)
      throw coursesResult.error
    }
    if (genresResult.error) {
      console.error('❌ ジャンル取得エラー:', genresResult.error)
      throw genresResult.error
    }
    if (themesResult.error) {
      console.error('❌ テーマ取得エラー:', themesResult.error)
      throw themesResult.error
    }
    if (sessionContentsResult.error) {
      console.error('❌ セッションコンテンツ取得エラー:', sessionContentsResult.error)
      throw sessionContentsResult.error
    }
    if (sessionQuizzesResult.error) {
      console.error('❌ セッションクイズ取得エラー:', sessionQuizzesResult.error)
      throw sessionQuizzesResult.error
    }

    const courses = coursesResult.data || []
    const genres = genresResult.data || []
    const themes = themesResult.data || []
    const sessionContents = sessionContentsResult.data || []
    const sessionQuizzes = sessionQuizzesResult.data || []

    console.log(`📊 取得データ: コース${courses.length}件, ジャンル${genres.length}件, テーマ${themes.length}件, セッションコンテンツ${sessionContents.length}件, セッションクイズ${sessionQuizzes.length}件`)

    const totalRecords = courses.length + genres.length + themes.length + sessionContents.length + sessionQuizzes.length

    if (totalRecords === 0) throw new Error('コース学習データが見つかりません')

    const fallbackFilePath = join(process.cwd(), 'public', 'data', 'learning-courses-fallback.json')
    const fallbackData = {
      courses,
      genres,
      themes,
      sessionContents,
      sessionQuizzes,
      metadata: {
        generatedAt: timestamp,
        sourceRecordCount: totalRecords,
        breakdown: {
          courses: courses.length,
          genres: genres.length,
          themes: themes.length,
          sessionContents: sessionContents.length,
          sessionQuizzes: sessionQuizzes.length
        },
        databaseSource: 'learning_courses, learning_genres, learning_themes, session_contents, session_quizzes',
        generatorScript: 'scripts/sync-all-fallback-data.ts'
      }
    }

    writeFileSync(fallbackFilePath, JSON.stringify(fallbackData, null, 2), 'utf8')
    console.log(`✅ コース学習ファイル作成完了: ${fallbackFilePath}`)

    return {
      success: true,
      dataType,
      recordCount: totalRecords,
      filePath: fallbackFilePath,
      timestamp,
      breakdown: {
        'コース': courses.length,
        'ジャンル': genres.length,
        'テーマ': themes.length,
        'セッションコンテンツ': sessionContents.length,
        'セッションクイズ': sessionQuizzes.length
      }
    }

  } catch (error) {
    console.error(`❌ ${dataType}同期エラー:`, error)
    return {
      success: false,
      dataType,
      recordCount: 0,
      filePath: '',
      error: error instanceof Error ? error.message : String(error),
      timestamp
    }
  }
}

/**
 * 4. 既存の静的データ同期（カテゴリー等）
 */
async function syncStaticData(): Promise<SyncResult> {
  const dataType = 'カテゴリー・静的データ'
  const timestamp = new Date().toISOString()
  
  try {
    console.log('🔄 カテゴリー・静的データ同期中...')
    
    const [categoriesResult, subcategoriesResult, skillLevelsResult] = await Promise.all([
      supabaseAdmin
        .from('categories')
        .select('*')
        .eq('is_visible', true)
        .order('type, display_order'),
      supabaseAdmin
        .from('subcategories')
        .select('*')
        .eq('is_visible', true)
        .order('parent_category_id, display_order'),
      supabaseAdmin
        .from('skill_levels')
        .select('*')
        .order('display_order')
    ])

    if (categoriesResult.error) throw categoriesResult.error
    if (subcategoriesResult.error) throw subcategoriesResult.error
    if (skillLevelsResult.error) throw skillLevelsResult.error

    const categories = categoriesResult.data || []
    const subcategories = subcategoriesResult.data || []
    const skillLevels = skillLevelsResult.data || []

    const totalRecords = categories.length + subcategories.length + skillLevels.length

    // 各ファイルに保存
    const publicDataDir = join(process.cwd(), 'public', 'data')
    
    writeFileSync(
      join(publicDataDir, 'categories-fallback.json'), 
      JSON.stringify({ categories, generatedAt: timestamp }, null, 2)
    )
    writeFileSync(
      join(publicDataDir, 'subcategories-fallback.json'), 
      JSON.stringify({ subcategories, generatedAt: timestamp }, null, 2)
    )
    writeFileSync(
      join(publicDataDir, 'skill-levels-fallback.json'), 
      JSON.stringify({ skillLevels, generatedAt: timestamp }, null, 2)
    )

    return {
      success: true,
      dataType,
      recordCount: totalRecords,
      filePath: publicDataDir,
      timestamp,
      breakdown: {
        'カテゴリー': categories.length,
        'サブカテゴリー': subcategories.length,
        'スキルレベル': skillLevels.length
      }
    }

  } catch (error) {
    return {
      success: false,
      dataType,
      recordCount: 0,
      filePath: '',
      error: error instanceof Error ? error.message : String(error),
      timestamp
    }
  }
}

/**
 * メイン実行関数 - 全データ統一同期
 */
async function syncAllFallbackData(): Promise<SyncSummary> {
  console.log('🚀 統一フォールバックデータ同期開始')
  console.log('=' .repeat(60))
  
  const startTime = Date.now()
  const results: SyncResult[] = []

  // 並列実行で効率化
  const syncPromises = [
    syncXPSettings(),
    syncQuizQuestions(), 
    syncLearningCourses(),
    syncStaticData()
  ]

  const syncResults = await Promise.allSettled(syncPromises)
  
  syncResults.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      results.push(result.value)
    } else {
      const dataTypes = ['XP/SKP設定', 'クイズ問題', 'コース学習データ', 'カテゴリー・静的データ']
      results.push({
        success: false,
        dataType: dataTypes[index],
        recordCount: 0,
        filePath: '',
        error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        timestamp: new Date().toISOString()
      })
    }
  })

  const executionTime = Date.now() - startTime
  const successful = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  const summary: SyncSummary = {
    totalSynced: results.length,
    successful,
    failed,
    results,
    executionTime
  }

  // 結果レポート出力
  console.log('\\n📊 === 統一フォールバック同期結果 ===')
  console.log(`⏱️ 実行時間: ${executionTime}ms`)
  console.log(`✅ 成功: ${successful}件`)
  console.log(`❌ 失敗: ${failed}件`)
  console.log('\\n📋 詳細結果:')
  
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌'
    console.log(`  ${index + 1}. ${status} ${result.dataType}: ${result.recordCount}件 ${result.error ? `(${result.error})` : ''}`)
  })

  if (failed === 0) {
    console.log('\\n🎉 全フォールバックデータ同期完了!')
  } else {
    console.log(`\\n⚠️ ${failed}件のデータ同期に失敗しました`)
  }

  return summary
}

// CLI実行時はmain()を実行
if (require.main === module) {
  syncAllFallbackData()
    .then((summary) => {
      process.exit(summary.failed === 0 ? 0 : 1)
    })
    .catch((error) => {
      console.error('💥 統一同期スクリプト実行エラー:', error)
      process.exit(1)
    })
}

export { syncAllFallbackData, syncXPSettings, syncQuizQuestions, syncLearningCourses, syncStaticData }