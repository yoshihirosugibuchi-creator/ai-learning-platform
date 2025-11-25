import { supabase } from './supabase'

// セルフパーソナライズクイズ設定の型定義
export interface QuizPersonalizationSettings {
  learningLevel: 'basic' | 'intermediate' | 'advanced' | 'expert' // 指定レベル以上
  basicCategories: string[] // 基本カテゴリーID配列
  industryCategories: string[] // 業界カテゴリーID配列  
  industrySubcategories: string[] // 業界サブカテゴリーID配列
  createdAt: string
  updatedAt: string
}

// user_settingsテーブルの設定キー
const QUIZ_PERSONALIZATION_KEY = 'quiz_personalization'

/**
 * デフォルト設定を取得（基本カテゴリーIDリストはオプション）
 * 基本カテゴリー全選択、レベル初級
 */
export function getDefaultQuizSettings(basicCategoryIds?: string[]): QuizPersonalizationSettings {
  return {
    learningLevel: 'basic',
    basicCategories: basicCategoryIds || [], // 提供されない場合は空配列
    industryCategories: [],
    industrySubcategories: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * ユーザーのクイズ設定を取得
 */
export async function getUserQuizSettings(userId: string): Promise<QuizPersonalizationSettings & { isFirstTime?: boolean }> {
  try {
    console.log('🔍 [getUserQuizSettings] Starting fetch for userId:', userId)
    
    const { data, error } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('user_id', userId)
      .eq('setting_key', QUIZ_PERSONALIZATION_KEY)
      .single()

    console.log('🔍 [getUserQuizSettings] Raw query result:', { data, error })

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows returned
      console.error('❌ [getUserQuizSettings] Error fetching quiz settings:', error)
      return { ...getDefaultQuizSettings(), isFirstTime: true }
    }

    // データが存在しない場合はデフォルト設定を返す（初回フラグ付き）
    if (!data || !data.setting_value) {
      console.log('📝 [getUserQuizSettings] No quiz settings found, returning default')
      return { ...getDefaultQuizSettings(), isFirstTime: true }
    }

    // JSON データをパース（既存の設定）
    const settings = data.setting_value as unknown as QuizPersonalizationSettings
    console.log('✅ [getUserQuizSettings] Quiz settings loaded - Raw data:', JSON.stringify(data.setting_value, null, 2))
    console.log('✅ [getUserQuizSettings] Parsed settings:', JSON.stringify(settings, null, 2))
    console.log('✅ [getUserQuizSettings] basicCategories array:', settings.basicCategories)
    console.log('✅ [getUserQuizSettings] industryCategories array:', settings.industryCategories)
    
    const result = { ...settings, isFirstTime: false }
    console.log('✅ [getUserQuizSettings] Final result with isFirstTime=false:', JSON.stringify(result, null, 2))
    
    return result

  } catch (error) {
    console.error('❌ [getUserQuizSettings] Exception:', error)
    return { ...getDefaultQuizSettings(), isFirstTime: true }
  }
}

/**
 * ユーザーのクイズ設定を保存
 */
export async function saveUserQuizSettings(
  userId: string, 
  settings: Omit<QuizPersonalizationSettings, 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString()
    
    // 既存設定を取得して作成日時を保持
    const currentSettingsWithFlag = await getUserQuizSettings(userId)
    const { isFirstTime: _isFirstTime, ...currentSettings } = currentSettingsWithFlag
    
    const settingsToSave: QuizPersonalizationSettings = {
      ...settings,
      createdAt: currentSettings.createdAt || now,
      updatedAt: now
    }

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        setting_key: QUIZ_PERSONALIZATION_KEY,
        setting_value: JSON.parse(JSON.stringify(settingsToSave)),
        updated_at: now
      }, {
        onConflict: 'user_id,setting_key'
      })

    if (error) {
      console.error('❌ Error saving quiz settings:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ Quiz settings saved successfully')
    return { success: true }

  } catch (error) {
    console.error('❌ Exception in saveUserQuizSettings:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * ユーザー登録時に初期設定を作成
 */
export async function initializeUserQuizSettings(userId: string): Promise<void> {
  try {
    // 既存設定があるかチェック
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .eq('setting_key', QUIZ_PERSONALIZATION_KEY)
      .single()

    // 既に設定が存在する場合はスキップ
    if (existing) {
      console.log('📝 Quiz settings already exist for user:', userId)
      return
    }

    // 初期設定を保存
    const defaultSettings = getDefaultQuizSettings()
    await saveUserQuizSettings(userId, defaultSettings)
    
    console.log('✅ Initial quiz settings created for user:', userId)

  } catch (error) {
    console.error('❌ Error initializing quiz settings:', error)
  }
}

/**
 * 設定が初期設定かどうかを判定
 * isFirstTimeフラグがある場合はそれを使用、ない場合は従来のロジック
 */
export function isDefaultSettings(settings: QuizPersonalizationSettings & { isFirstTime?: boolean }): boolean {
  // isFirstTimeフラグがある場合はそれを優先
  if (settings.isFirstTime !== undefined) {
    return settings.isFirstTime
  }
  
  // 従来のロジック（後方互換性のため）
  // カテゴリーが1つでも選択されていれば非デフォルト設定
  const hasSelectedCategories = settings.basicCategories.length > 0 ||
                                settings.industryCategories.length > 0 ||
                                settings.industrySubcategories.length > 0
  
  // カテゴリーが選択されていない、かつ学習レベルがbasicの場合のみデフォルト設定
  return !hasSelectedCategories && settings.learningLevel === 'basic'
}