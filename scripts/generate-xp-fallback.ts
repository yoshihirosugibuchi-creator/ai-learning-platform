/**
 * 動的XPフォールバックファイル生成スクリプト
 * 
 * 目的: xp_level_skp_settingsテーブルの値から動的にTypeScriptフォールバック設定ファイルを生成
 * 
 * 実行タイミング:
 * 1. データベース設定値が変更された時
 * 2. 定期的な同期処理として
 * 3. フォールバック検出時の自動修復として
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { join } from 'path'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

interface XPSettings {
  xp_quiz: {
    basic: number
    intermediate: number
    advanced: number
    expert: number
  }
  xp_course: {
    basic: number
    intermediate: number
    advanced: number
    expert: number
  }
  xp_bonus: {
    quiz_accuracy_80: number
    quiz_accuracy_100: number
    course_completion: number
  }
  level: {
    overall_threshold: number
    main_category_threshold: number
    industry_category_threshold: number
    industry_subcategory_threshold: number
  }
  skp: {
    quiz_correct: number
    quiz_incorrect: number
    quiz_perfect_bonus: number
    course_correct: number
    course_incorrect: number
    course_complete_bonus: number
    daily_streak_bonus: number
    ten_day_streak_bonus: number
  }
}

interface GenerationResult {
  success: boolean
  timestamp: string
  settings_count: number
  file_path: string
  error?: string
}

/**
 * データベースから現在のXP設定を取得してTypeScriptファイルを生成
 */
async function generateXPFallbackFile(): Promise<GenerationResult> {
  const timestamp = new Date().toISOString()
  const fallbackFilePath = join(process.cwd(), 'lib', 'xp-settings-fallback.generated.ts')
  
  try {
    console.log('🔄 データベースからXP設定を取得中...')
    
    // データベースから全設定を取得
    const { data: settings, error } = await supabaseAdmin
      .from('xp_level_skp_settings')
      .select('setting_category, setting_key, setting_value')
      .eq('is_active', true)
      .order('setting_category, setting_key')

    if (error) {
      throw new Error(`データベース取得エラー: ${error.message}`)
    }

    if (!settings || settings.length === 0) {
      throw new Error('有効なXP設定が見つかりません')
    }

    console.log(`📋 ${settings.length}件の設定を取得`)

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

    // 必要な設定がすべて揃っているかチェック
    const requiredKeys = {
      xp_quiz: ['basic', 'intermediate', 'advanced', 'expert'],
      xp_course: ['basic', 'intermediate', 'advanced', 'expert'],
      xp_bonus: ['quiz_accuracy_80', 'quiz_accuracy_100', 'course_completion'],
      level: ['overall_threshold', 'main_category_threshold', 'industry_category_threshold', 'industry_subcategory_threshold'],
      skp: ['quiz_correct', 'quiz_incorrect', 'quiz_perfect_bonus', 'course_correct', 'course_incorrect', 'course_complete_bonus', 'daily_streak_bonus', 'ten_day_streak_bonus']
    }

    const missingKeys: string[] = []
    Object.entries(requiredKeys).forEach(([category, keys]) => {
      keys.forEach(key => {
        if (!(key in loadedSettings[category])) {
          missingKeys.push(`${category}.${key}`)
        }
      })
    })

    if (missingKeys.length > 0) {
      throw new Error(`必須設定が不足: ${missingKeys.join(', ')}`)
    }

    // TypeScriptファイル内容を生成
    const fileContent = `/**
 * 動的生成XPフォールバック設定
 * 
 * ⚠️ 注意: このファイルは自動生成されます。手動で編集しないでください。
 * 
 * 生成時刻: ${timestamp}
 * データベース設定件数: ${settings.length}件
 * 
 * 生成元: scripts/generate-xp-fallback.ts
 * データソース: xp_level_skp_settings テーブル
 */

import type { XPSettings } from './xp-settings'

// データベース取得失敗時のフォールバック設定 (100%データベース値と同期)
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

// フォールバック生成メタデータ
export const FALLBACK_METADATA = {
  generatedAt: '${timestamp}',
  sourceRecordCount: ${settings.length},
  databaseSource: 'xp_level_skp_settings',
  generatorScript: 'scripts/generate-xp-fallback.ts'
}

// フォールバック設定の有効性チェック
export function validateFallbackSettings(): boolean {
  try {
    // 基本的な数値チェック
    const settings = DATABASE_FALLBACK_SETTINGS
    
    // XP値が正の数であることを確認
    const xpValues = [
      ...Object.values(settings.xp_quiz),
      ...Object.values(settings.xp_course),
      ...Object.values(settings.xp_bonus)
    ]
    
    const skpValues = Object.values(settings.skp)
    const levelValues = Object.values(settings.level)
    
    return xpValues.every(v => v > 0) && 
           skpValues.every(v => v >= 0) && 
           levelValues.every(v => v > 0)
  } catch (error) {
    return false
  }
}
`

    // ファイルに書き込み
    writeFileSync(fallbackFilePath, fileContent, 'utf8')
    
    console.log(`✅ フォールバックファイル生成完了: ${fallbackFilePath}`)
    
    return {
      success: true,
      timestamp,
      settings_count: settings.length,
      file_path: fallbackFilePath
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('❌ フォールバックファイル生成エラー:', errorMessage)
    
    return {
      success: false,
      timestamp,
      settings_count: 0,
      file_path: fallbackFilePath,
      error: errorMessage
    }
  }
}

/**
 * フォールバックファイルが最新かチェック
 */
async function checkFallbackFileAge(): Promise<{ needsUpdate: boolean; reason: string }> {
  const fallbackFilePath = join(process.cwd(), 'lib', 'xp-settings-fallback.generated.ts')
  
  try {
    // ファイルの存在確認
    const fs = await import('fs')
    if (!fs.existsSync(fallbackFilePath)) {
      return { needsUpdate: true, reason: 'フォールバックファイルが存在しません' }
    }

    // ファイルの更新日時を確認
    const stats = fs.statSync(fallbackFilePath)
    const fileAge = Date.now() - stats.mtime.getTime()
    const maxAge = 24 * 60 * 60 * 1000 // 24時間

    if (fileAge > maxAge) {
      return { needsUpdate: true, reason: `ファイルが古すぎます (${Math.round(fileAge / (60 * 60 * 1000))}時間前)` }
    }

    // データベース設定の最終更新を確認
    const { data: latestSetting } = await supabaseAdmin
      .from('xp_level_skp_settings')
      .select('updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)

    if (latestSetting && latestSetting[0]) {
      const dbLastUpdate = new Date(latestSetting[0].updated_at).getTime()
      if (dbLastUpdate > stats.mtime.getTime()) {
        return { needsUpdate: true, reason: 'データベース設定がファイルより新しいです' }
      }
    }

    return { needsUpdate: false, reason: 'フォールバックファイルは最新です' }

  } catch (error) {
    return { needsUpdate: true, reason: `チェックエラー: ${error instanceof Error ? error.message : String(error)}` }
  }
}

/**
 * メイン実行関数
 */
async function main() {
  try {
    console.log('🚀 動的XPフォールバックファイル生成開始')
    
    // 更新の必要性をチェック
    const { needsUpdate, reason } = await checkFallbackFileAge()
    console.log(`📋 更新チェック: ${reason}`)
    
    if (!needsUpdate) {
      console.log('ℹ️ 更新は不要です')
      return
    }

    console.log('🔄 フォールバックファイルを生成中...')
    const result = await generateXPFallbackFile()
    
    if (result.success) {
      console.log('✅ フォールバックファイル生成成功!')
      console.log(`📁 ファイル: ${result.file_path}`)
      console.log(`📊 設定数: ${result.settings_count}件`)
      console.log(`⏰ 生成時刻: ${result.timestamp}`)
    } else {
      console.error('❌ フォールバックファイル生成失敗:', result.error)
      process.exit(1)
    }

  } catch (error) {
    console.error('💥 スクリプト実行エラー:', error)
    process.exit(1)
  }
}

// CLI実行時はmain()を実行
if (require.main === module) {
  main()
}

export { generateXPFallbackFile, checkFallbackFileAge }