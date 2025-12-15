/**
 * Skill Levels Helper - skill_levelsテーブルからの動的取得
 * ハードコード回避のためのヘルパー関数群
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

// キャッシュを使用してDBアクセスを最適化
let cachedSkillLevels: string[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分間キャッシュ

/**
 * skill_levelsテーブルから全難易度IDを取得
 * @returns 難易度ID配列 ['basic', 'intermediate', 'advanced', 'expert']
 */
export async function getSkillLevelIds(): Promise<string[]> {
  try {
    // キャッシュチェック
    if (cachedSkillLevels && Date.now() - cacheTimestamp < CACHE_DURATION) {
      return cachedSkillLevels
    }

    const { data: skillLevels, error } = await supabaseAdmin
      .from('skill_levels')
      .select('id')
      .order('display_order')

    if (error) {
      console.warn('⚠️ [getSkillLevelIds] Error fetching skill levels:', error)
      // フォールバック：既知の値を返す
      return ['basic', 'intermediate', 'advanced', 'expert']
    }

    const skillLevelIds = skillLevels?.map(level => level.id) || []
    
    // キャッシュ更新
    cachedSkillLevels = skillLevelIds
    cacheTimestamp = Date.now()

    console.log('📋 [getSkillLevelIds] Loaded skill levels:', skillLevelIds)
    return skillLevelIds

  } catch (error) {
    console.error('❌ [getSkillLevelIds] Error:', error)
    // フォールバック：既知の値を返す
    return ['basic', 'intermediate', 'advanced', 'expert']
  }
}

/**
 * 指定されたユーザー学習レベル以上の難易度IDを取得
 * @param userLevel ユーザーの学習レベル
 * @returns ユーザーレベル以上の難易度ID配列
 */
export async function getAllowedDifficulties(userLevel: string): Promise<string[]> {
  try {
    const allSkillLevels = await getSkillLevelIds()
    const userLevelIndex = allSkillLevels.indexOf(userLevel)
    
    // ユーザーレベル以上の難易度を返す
    if (userLevelIndex >= 0) {
      return allSkillLevels.slice(userLevelIndex)
    } else {
      // 無効なレベルの場合はすべて返す
      console.warn(`⚠️ [getAllowedDifficulties] Invalid user level: ${userLevel}`)
      return allSkillLevels
    }
  } catch (error) {
    console.error('❌ [getAllowedDifficulties] Error:', error)
    // フォールバック
    return ['basic', 'intermediate', 'advanced', 'expert']
  }
}

/**
 * クイズ問題取得用の一般的な難易度フィルター（'expert'を除く）
 * @returns basic, intermediate, advancedの配列
 */
export async function getStandardDifficulties(): Promise<string[]> {
  try {
    const allSkillLevels = await getSkillLevelIds()
    // 'expert'を除いた標準的な難易度を返す
    return allSkillLevels.filter(level => level !== 'expert')
  } catch (error) {
    console.error('❌ [getStandardDifficulties] Error:', error)
    return ['basic', 'intermediate', 'advanced']
  }
}

/**
 * 特定の難易度が有効かチェック
 * @param difficulty チェックする難易度
 * @returns 有効な難易度かどうか
 */
export async function isValidDifficulty(difficulty: string): Promise<boolean> {
  try {
    const allSkillLevels = await getSkillLevelIds()
    return allSkillLevels.includes(difficulty)
  } catch (error) {
    console.error('❌ [isValidDifficulty] Error:', error)
    // フォールバック：既知の値をチェック
    return ['basic', 'intermediate', 'advanced', 'expert'].includes(difficulty)
  }
}

/**
 * キャッシュをクリア（テスト時やスキーマ変更後に使用）
 */
export function clearSkillLevelsCache(): void {
  cachedSkillLevels = null
  cacheTimestamp = 0
  console.log('🧹 [clearSkillLevelsCache] Cache cleared')
}

/**
 * 難易度IDを検証し、無効な場合はデフォルト値を返す
 * @param difficulty チェックする難易度文字列
 * @returns 有効な難易度 または 'basic'
 */
export async function validateDifficulty(difficulty: string | undefined): Promise<string> {
  if (!difficulty) return 'basic'
  
  try {
    const validDifficulties = await getSkillLevelIds()
    return validDifficulties.includes(difficulty) ? difficulty : 'basic'
  } catch (error) {
    console.error('❌ [validateDifficulty] Error:', error)
    return 'basic'
  }
}