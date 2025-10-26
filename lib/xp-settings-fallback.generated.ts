/**
 * 動的生成XPフォールバック設定
 * 
 * ⚠️ 注意: このファイルは自動生成されます。手動で編集しないでください。
 * 
 * 生成時刻: 2025-10-26T02:30:48.012Z
 * データベース設定件数: 26件
 * 
 * 生成元: scripts/sync-all-fallback-data.ts
 * データソース: xp_level_skp_settings テーブル
 */

import type { XPSettings } from './xp-settings'

export const DATABASE_FALLBACK_SETTINGS: XPSettings = {
  xp_quiz: {
    basic: 10,
    intermediate: 20,
    advanced: 30,
    expert: 50
  },
  xp_course: {
    basic: 15,
    intermediate: 25,
    advanced: 35,
    expert: 55
  },
  xp_bonus: {
    quiz_accuracy_80: 20,
    quiz_accuracy_100: 30,
    course_completion: 50
  },
  level: {
    overall_threshold: 1000,
    main_category_threshold: 500,
    industry_category_threshold: 1000,
    industry_subcategory_threshold: 500
  },
  skp: {
    quiz_correct: 10,
    quiz_incorrect: 2,
    quiz_perfect_bonus: 50,
    course_correct: 10,
    course_incorrect: 2,
    course_complete_bonus: 50,
    daily_streak_bonus: 10,
    ten_day_streak_bonus: 100
  }
}

export const FALLBACK_METADATA = {
  generatedAt: '2025-10-26T02:30:48.012Z',
  sourceRecordCount: 26,
  databaseSource: 'xp_level_skp_settings',
  generatorScript: 'scripts/sync-all-fallback-data.ts'
}
