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
 * デフォルト設定を取得（空の状態で返す - 実際のカテゴリーIDは動的に設定される）
 * 基本カテゴリー全選択、レベル初級〜
 */
export function getDefaultQuizSettings(): QuizPersonalizationSettings {
  return {
    learningLevel: 'basic',
    basicCategories: [], // 動的に設定される（全選択）
    industryCategories: [],
    industrySubcategories: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

/**
 * ユーザーのクイズ設定を取得
 */
export async function getUserQuizSettings(userId: string): Promise<QuizPersonalizationSettings> {
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('setting_value')
      .eq('user_id', userId)
      .eq('setting_key', QUIZ_PERSONALIZATION_KEY)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows returned
      console.error('❌ Error fetching quiz settings:', error)
      return getDefaultQuizSettings()
    }

    // データが存在しない場合はデフォルト設定を返す
    if (!data || !data.setting_value) {
      console.log('📝 No quiz settings found, returning default')
      return getDefaultQuizSettings()
    }

    // JSON データをパース
    const settings = data.setting_value as unknown as QuizPersonalizationSettings
    console.log('✅ Quiz settings loaded:', settings)
    return settings

  } catch (error) {
    console.error('❌ Exception in getUserQuizSettings:', error)
    return getDefaultQuizSettings()
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
    const currentSettings = await getUserQuizSettings(userId)
    
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
 */
export function isDefaultSettings(settings: QuizPersonalizationSettings): boolean {
  const defaultSettings = getDefaultQuizSettings()
  
  return settings.learningLevel === defaultSettings.learningLevel &&
         settings.basicCategories.length === defaultSettings.basicCategories.length &&
         settings.industryCategories.length === 0 &&
         settings.industrySubcategories.length === 0
}