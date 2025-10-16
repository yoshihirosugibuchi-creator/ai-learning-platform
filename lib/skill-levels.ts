import { supabase } from './supabase'

export interface SkillLevel {
  id: string
  name: string // 日本語名
  display_name: string // 英語名
  description: string
  target_experience: string
  display_order: number
  color: string
  created_at: string
  updated_at: string
}

// スキルレベルのキャッシュ
let skillLevelsCache: SkillLevel[] | null = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5分

// 全てのスキルレベルを取得
export async function getSkillLevels(): Promise<SkillLevel[]> {
  const now = Date.now()
  
  // キャッシュが有効な場合はそれを返す
  if (skillLevelsCache && (now - lastFetchTime) < CACHE_DURATION) {
    return skillLevelsCache
  }

  try {
    const { data, error } = await supabase
      .from('skill_levels')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching skill levels:', error)
      return []
    }

    skillLevelsCache = data as SkillLevel[]
    lastFetchTime = now
    return skillLevelsCache
  } catch (error) {
    console.error('Exception fetching skill levels:', error)
    return []
  }
}

// 特定のスキルレベルを取得
export async function getSkillLevel(levelId: string): Promise<SkillLevel | null> {
  const skillLevels = await getSkillLevels()
  return skillLevels.find(level => level.id === levelId) || null
}

// スキルレベルの日本語名を取得
export async function getSkillLevelName(levelId: string): Promise<string> {
  const skillLevel = await getSkillLevel(levelId)
  return skillLevel?.name || levelId
}

// スキルレベルの色を取得
export async function getSkillLevelColor(levelId: string): Promise<string> {
  const skillLevel = await getSkillLevel(levelId)
  return skillLevel?.color || '#6B7280'
}

// スキルレベルをIDから表示用オブジェクトに変換
export async function formatSkillLevel(levelId: string): Promise<{
  id: string
  name: string
  color: string
  displayName: string
}> {
  const skillLevel = await getSkillLevel(levelId)
  
  return {
    id: levelId,
    name: skillLevel?.name || levelId,
    color: skillLevel?.color || '#6B7280',
    displayName: skillLevel?.display_name || levelId
  }
}

// 全てのスキルレベルを表示用に変換
export async function getAllFormattedSkillLevels(): Promise<Array<{
  id: string
  name: string
  color: string
  displayName: string
  displayOrder: number
}>> {
  const skillLevels = await getSkillLevels()
  
  return skillLevels.map(level => ({
    id: level.id,
    name: level.name,
    color: level.color,
    displayName: level.display_name,
    displayOrder: level.display_order
  }))
}