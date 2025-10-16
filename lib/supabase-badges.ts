import { supabase } from './supabase'
import { UserBadge, LearningBadge } from './types/learning'
import { getSkillLevel } from './skill-levels'

// バッジ関連の型定義
export interface BadgeAwardData {
  userId: string
  courseId: string
  courseName: string
  badge: LearningBadge
}

// デバッグ用：Supabaseデータベース接続とテーブル確認
export async function testDatabaseConnection(): Promise<void> {
  console.log('🔍 Testing database connection and tables...')
  
  // Test existing table first
  try {
    const { data: _progressData, error: progressError } = await supabase
      .from('learning_progress')
      .select('id')
      .limit(1)
    
    if (progressError) {
      console.error('❌ learning_progress table access failed:', progressError)
    } else {
      console.log('✅ learning_progress table accessible')
    }
  } catch (error) {
    console.error('❌ Exception accessing learning_progress:', error)
  }
  
  // Test user_badges table
  try {
    const { data: _badgesData, error: badgesError } = await supabase
      .from('user_badges')
      .select('id')
      .limit(1)
    
    if (badgesError) {
      console.error('❌ user_badges table access failed:', badgesError)
      console.error('❌ Badge error details:', {
        code: badgesError.code,
        message: badgesError.message,
        details: badgesError.details,
        hint: badgesError.hint
      })
    } else {
      console.log('✅ user_badges table accessible')
    }
  } catch (error) {
    console.error('❌ Exception accessing user_badges:', error)
  }
}

// デバッグ用：user_badgesテーブルの存在確認
export async function testUserBadgesTableAccess(): Promise<boolean> {
  try {
    const { data: _data, error } = await supabase
      .from('user_badges')
      .select('id')
      .limit(1)
    
    if (error) {
      console.error('❌ user_badges table access failed:', error)
      return false
    }
    
    console.log('✅ user_badges table accessible')
    return true
  } catch (error) {
    console.error('❌ Exception testing user_badges table:', error)
    return false
  }
}

// コース完了時にバッジを授与
export async function awardCourseBadge(data: BadgeAwardData): Promise<UserBadge | null> {
  try {
    console.log('🏆 Awarding badge:', data.badge.title, 'for course:', data.courseId)
    
    // テーブル存在確認
    const tableExists = await testUserBadgesTableAccess()
    if (!tableExists) {
      console.warn('⚠️ user_badges table not accessible, skipping badge award')
      return null
    }

    const now = new Date()
    let expiresAt: Date | null = null
    
    // 有効期限の計算
    if (data.badge.validityPeriodMonths) {
      expiresAt = new Date(now)
      expiresAt.setMonth(expiresAt.getMonth() + data.badge.validityPeriodMonths)
    }

    const badgeData = {
      user_id: data.userId,
      course_id: data.courseId,
      course_name: data.courseName,
      badge_id: data.badge.id,
      badge_title: data.badge.title,
      badge_description: data.badge.description,
      badge_image_url: data.badge.badgeImageUrl,
      badge_color: data.badge.color,
      difficulty: data.badge.difficulty,
      earned_at: now.toISOString(),
      expires_at: expiresAt?.toISOString() || null,
      validity_period_months: data.badge.validityPeriodMonths || null
    }

    // Check for existing badge
    const { data: existingBadges, error: readError } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', data.userId)
      .eq('course_id', data.courseId)

    if (readError) {
      console.error('❌ Error checking existing badges:', readError)
      return null
    }

    if (existingBadges && existingBadges.length > 0) {
      console.log('ℹ️ Badge already exists for this course')
    }

    const { data: result, error } = await supabase
      .from('user_badges')
      .upsert(badgeData, {
        onConflict: 'user_id,course_id'
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error awarding badge:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        data: badgeData
      })
      return null
    }

    console.log('🎉 Badge awarded successfully!')

    return {
      id: result.id,
      badge: data.badge,
      earnedAt: new Date(result.earned_at),
      expiresAt: result.expires_at ? new Date(result.expires_at) : undefined,
      isExpired: result.expires_at ? new Date(result.expires_at) < new Date() : false,
      courseId: result.course_id,
      courseName: result.course_name
    }
  } catch (error) {
    console.error('Exception in awardCourseBadge:', {
      error: error,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : 'No stack',
      badgeData: data
    })
    return null
  }
}

// ユーザーの獲得バッジ一覧を取得
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  try {
    // まずuser_badgesのデータを取得
    const { data, error } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })

    if (error) {
      console.error('Error fetching user badges:', error)
      return []
    }

    // 各バッジの難易度情報をskill_levelsから取得し、コース情報も取得
    const badgesWithSkillInfo = await Promise.all(
      data.map(async (item) => {
        const [skillLevel, courseInfo] = await Promise.all([
          getSkillLevel(item.difficulty || 'intermediate'),
          // コース情報を取得してdisplay_orderを取得
          supabase
            .from('learning_courses')
            .select('display_order, title')
            .eq('id', item.course_id)
            .single()
        ])
        
        return {
          id: item.id,
          badge: {
            id: item.badge_id,
            title: item.badge_title,
            description: item.badge_description || '',
            icon: '🏆', // デフォルトアイコン
            color: item.badge_color || '#FFD700',
            badgeImageUrl: item.badge_image_url || undefined,
            difficulty: (item.difficulty as 'basic' | 'intermediate' | 'advanced' | 'expert') || 'intermediate',
            validityPeriodMonths: item.validity_period_months || undefined,
            // skill_levelsからの追加情報
            difficultyName: skillLevel?.name || item.difficulty || '中級',
            difficultyColor: skillLevel?.color || '#3B82F6'
          },
          earnedAt: new Date(item.earned_at),
          expiresAt: item.expires_at ? new Date(item.expires_at) : undefined,
          isExpired: item.expires_at ? new Date(item.expires_at) < new Date() : false,
          courseId: item.course_id,
          courseName: courseInfo.data?.title || item.course_name,
          // コース順ソート用
          _courseDisplayOrder: courseInfo.data?.display_order || 999
        }
      })
    )

    // コースのdisplay_orderで並び替え
    badgesWithSkillInfo.sort((a, b) => {
      const orderA = (a as UserBadge & { _courseDisplayOrder?: number })._courseDisplayOrder || 999
      const orderB = (b as UserBadge & { _courseDisplayOrder?: number })._courseDisplayOrder || 999
      return orderA - orderB
    })

    // _courseDisplayOrderを削除してから返す
    const sortedBadges = badgesWithSkillInfo.map(badge => {
      const { _courseDisplayOrder, ...cleanBadge } = badge as UserBadge & { _courseDisplayOrder?: number }
      return cleanBadge
    })

    return sortedBadges as UserBadge[]
  } catch (error) {
    console.error('Exception in getUserBadges:', error)
    return []
  }
}

// 有効期限が近いバッジを取得（30日以内）
export async function getExpiringBadges(userId: string): Promise<UserBadge[]> {
  try {
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const { data, error } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .not('expires_at', 'is', null)
      .lte('expires_at', thirtyDaysFromNow.toISOString())
      .gte('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: true })

    if (error) {
      console.error('Error fetching expiring badges:', error)
      return []
    }

    return (data || []).map(item => ({
      id: item.id,
      badge: {
        id: item.badge_id,
        title: item.badge_title,
        description: item.badge_description || '',
        icon: '🏆',
        color: item.badge_color || '#FFD700',
        badgeImageUrl: item.badge_image_url || undefined,
        difficulty: (item.difficulty as 'basic' | 'intermediate' | 'advanced' | 'expert') || 'intermediate',
        validityPeriodMonths: item.validity_period_months || undefined
      },
      earnedAt: new Date(item.earned_at),
      expiresAt: item.expires_at ? new Date(item.expires_at) : new Date(),
      isExpired: false,
      courseId: item.course_id,
      courseName: item.course_name
    })) as UserBadge[]
  } catch (error) {
    console.error('Exception in getExpiringBadges:', error)
    return []
  }
}

// 期限切れバッジを取得
export async function getExpiredBadges(userId: string): Promise<UserBadge[]> {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString())
      .order('expires_at', { ascending: false })

    if (error) {
      console.error('Error fetching expired badges:', error)
      return []
    }

    return data.map(item => ({
      id: item.id,
      badge: {
        id: item.badge_id,
        title: item.badge_title,
        description: item.badge_description || '',
        icon: '🏆',
        color: item.badge_color || '#999999',
        badgeImageUrl: item.badge_image_url || undefined,
        difficulty: (item.difficulty as 'basic' | 'intermediate' | 'advanced' | 'expert') || 'intermediate',
        validityPeriodMonths: item.validity_period_months || undefined
      },
      earnedAt: new Date(item.earned_at),
      expiresAt: item.expires_at ? new Date(item.expires_at) : new Date(),
      isExpired: true,
      courseId: item.course_id,
      courseName: item.course_name
    }))
  } catch (error) {
    console.error('Exception in getExpiredBadges:', error)
    return []
  }
}

// バッジ統計を取得
export async function getBadgeStats(userId: string): Promise<{
  total: number
  active: number
  expired: number
  expiringSoon: number
}> {
  try {
    const badges = await getUserBadges(userId)
    const now = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const stats = {
      total: badges.length,
      active: 0,
      expired: 0,
      expiringSoon: 0
    }

    badges.forEach(badge => {
      if (badge.expiresAt) {
        if (badge.expiresAt < now) {
          stats.expired++
        } else if (badge.expiresAt <= thirtyDaysFromNow) {
          stats.expiringSoon++
          stats.active++
        } else {
          stats.active++
        }
      } else {
        stats.active++
      }
    })

    return stats
  } catch (error) {
    console.error('Exception in getBadgeStats:', error)
    return { total: 0, active: 0, expired: 0, expiringSoon: 0 }
  }
}