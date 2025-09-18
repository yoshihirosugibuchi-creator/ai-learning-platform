import { getLearningProgress } from './learning/data'
import { getLearningCourseDetails } from './learning/data'
import { awardCourseBadge, testUserBadgesTableAccess, getUserBadges } from './supabase-badges'
import { LearningBadge } from './types/learning'

// コース完了を検知してバッジを授与
export async function checkAndAwardCourseBadge(
  userId: string,
  courseId: string,
  genreId: string,
  themeId: string,
  sessionId: string
): Promise<{ completed: boolean; badge?: any }> {
  try {
    console.log('🏆 Checking course completion for badge award...', { courseId, userId })
    
    // コース詳細を取得
    const courseDetails = await getLearningCourseDetails(courseId)
    if (!courseDetails) {
      console.warn('Course details not found:', courseId)
      return { completed: false }
    }

    // ユーザーの学習進捗を取得
    const progress = await getLearningProgress(userId)
    
    // コース内の全セッションをリストアップ
    const allSessions: string[] = []
    courseDetails.genres.forEach(genre => {
      genre.themes.forEach(theme => {
        theme.sessions.forEach(session => {
          allSessions.push(`${courseId}_${genre.id}_${theme.id}_${session.id}`)
        })
      })
    })

    console.log('📊 Total sessions in course:', allSessions.length)
    
    // 完了済みセッションを確認
    const completedSessions = allSessions.filter(sessionKey => {
      const progressData = progress[sessionKey]
      return progressData && progressData.completed
    })

    console.log('✅ Completed sessions:', completedSessions.length)
    console.log('📊 Completion details:', {
      completedCount: completedSessions.length,
      totalCount: allSessions.length,
      completedSessions: completedSessions,
      allSessions: allSessions
    })
    
    // 全セッション完了チェック
    const isCompleted = completedSessions.length === allSessions.length
    
    console.log('🔍 Course completion check:', {
      isCompleted,
      completedCount: completedSessions.length,
      totalCount: allSessions.length
    })
    
    if (isCompleted) {
      console.log('🎉 Course completed! Awarding badge...')
      
      // テーブルアクセステスト
      const tableAccessible = await testUserBadgesTableAccess()
      if (!tableAccessible) {
        console.error('❌ Cannot access user_badges table - skipping badge award')
        return { completed: true }
      }

      // 既存バッジをチェック（重複防止）
      console.log('🔍 Checking for existing badges...')
      const existingBadges = await getUserBadges(userId)
      const existingCourseBadge = existingBadges.find(badge => badge.courseId === courseId)
      
      if (existingCourseBadge) {
        console.log('ℹ️ Badge already exists for this course:', existingCourseBadge.badge.title)
        console.log('📅 Badge earned at:', existingCourseBadge.earnedAt.toLocaleDateString('ja-JP'))
        
        if (existingCourseBadge.expiresAt) {
          const isExpired = existingCourseBadge.isExpired
          const isExpiringSoon = existingCourseBadge.expiresAt < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30日以内
          
          console.log('⏰ Badge expiry status:', {
            expiresAt: existingCourseBadge.expiresAt.toLocaleDateString('ja-JP'),
            isExpired,
            isExpiringSoon
          })
          
          // TODO: 将来的に期限切れ・近い場合の更新ロジック
          if (isExpired) {
            console.log('⚠️ Badge is expired - renewal system not yet implemented')
          } else if (isExpiringSoon) {
            console.log('⚠️ Badge expires soon - renewal system not yet implemented')
          }
        }
        
        // 既存バッジがある場合はスキップ
        return { completed: true, badge: existingCourseBadge }
      }
      
      // コースのバッジ情報を取得（コースデータから）
      const courseBadge: LearningBadge = courseDetails.badge ? {
        id: courseDetails.badge.id,
        title: courseDetails.badge.title,
        description: courseDetails.badge.description,
        icon: courseDetails.badge.icon,
        color: courseDetails.badge.color,
        badgeImageUrl: courseDetails.badge.badgeImageUrl,
        difficulty: courseDetails.difficulty,
        validityPeriodMonths: courseDetails.badge.validityPeriodMonths
      } : {
        // フォールバック（古いコースデータ用）
        id: `badge_${courseId}`,
        title: `${courseDetails.title} 修了証`,
        description: `${courseDetails.title}コースを完了しました`,
        icon: '🏆',
        color: getCourseColor(courseDetails.difficulty),
        badgeImageUrl: `/badges/${courseId}.svg`,
        difficulty: courseDetails.difficulty,
        validityPeriodMonths: getValidityPeriod(courseDetails.difficulty)
      }

      // 新しいバッジを授与
      console.log('🆕 Awarding new badge for first-time course completion')
      console.log('🎯 Badge details:', {
        title: courseBadge.title,
        difficulty: courseBadge.difficulty,
        hasExpiry: !!courseBadge.validityPeriodMonths
      })
      
      const awardedBadge = await awardCourseBadge({
        userId,
        courseId,
        courseName: courseDetails.title,
        badge: courseBadge
      })

      if (awardedBadge) {
        console.log('🏅 Badge awarded successfully!', awardedBadge)
        return { completed: true, badge: awardedBadge }
      } else {
        console.warn('⚠️ Badge award failed but course was completed')
        return { completed: true }
      }
    }

    return { completed: isCompleted }
  } catch (error) {
    console.error('Error in checkAndAwardCourseBadge:', error)
    return { completed: false }
  }
}

// 難易度別の色を取得
function getCourseColor(difficulty: 'beginner' | 'intermediate' | 'advanced'): string {
  switch (difficulty) {
    case 'beginner':
      return '#10B981' // green
    case 'intermediate':
      return '#F59E0B' // amber
    case 'advanced':
      return '#EF4444' // red
    default:
      return '#6B7280' // gray
  }
}

// 難易度別の有効期限を取得（暫定実装）
function getValidityPeriod(difficulty: 'beginner' | 'intermediate' | 'advanced'): number | undefined {
  switch (difficulty) {
    case 'beginner':
      return undefined // 永続
    case 'intermediate':
      return 24 // 2年
    case 'advanced':
      return 12 // 1年（資格のように）
    default:
      return undefined
  }
}

// 特定のジャンル完了チェック
export async function checkGenreCompletion(
  userId: string,
  courseId: string,
  genreId: string
): Promise<{ completed: boolean; totalSessions: number; completedSessions: number }> {
  try {
    const courseDetails = await getLearningCourseDetails(courseId)
    if (!courseDetails) {
      return { completed: false, totalSessions: 0, completedSessions: 0 }
    }

    const genre = courseDetails.genres.find(g => g.id === genreId)
    if (!genre) {
      return { completed: false, totalSessions: 0, completedSessions: 0 }
    }

    const progress = await getLearningProgress(userId)
    
    // ジャンル内の全セッション
    const genreSessions: string[] = []
    genre.themes.forEach(theme => {
      theme.sessions.forEach(session => {
        genreSessions.push(`${courseId}_${genreId}_${theme.id}_${session.id}`)
      })
    })

    // 完了済みセッション
    const completedSessions = genreSessions.filter(sessionKey => {
      const progressData = progress[sessionKey]
      return progressData && progressData.completed
    })

    return {
      completed: completedSessions.length === genreSessions.length,
      totalSessions: genreSessions.length,
      completedSessions: completedSessions.length
    }
  } catch (error) {
    console.error('Error checking genre completion:', error)
    return { completed: false, totalSessions: 0, completedSessions: 0 }
  }
}

// 特定のテーマ完了チェック
export async function checkThemeCompletion(
  userId: string,
  courseId: string,
  genreId: string,
  themeId: string
): Promise<{ completed: boolean; totalSessions: number; completedSessions: number }> {
  try {
    const courseDetails = await getLearningCourseDetails(courseId)
    if (!courseDetails) {
      return { completed: false, totalSessions: 0, completedSessions: 0 }
    }

    const genre = courseDetails.genres.find(g => g.id === genreId)
    const theme = genre?.themes.find(t => t.id === themeId)
    if (!theme) {
      return { completed: false, totalSessions: 0, completedSessions: 0 }
    }

    const progress = await getLearningProgress(userId)
    
    // テーマ内の全セッション
    const themeSessions = theme.sessions.map(session => 
      `${courseId}_${genreId}_${themeId}_${session.id}`
    )

    // 完了済みセッション
    const completedSessions = themeSessions.filter(sessionKey => {
      const progressData = progress[sessionKey]
      return progressData && progressData.completed
    })

    return {
      completed: completedSessions.length === themeSessions.length,
      totalSessions: themeSessions.length,
      completedSessions: completedSessions.length
    }
  } catch (error) {
    console.error('Error checking theme completion:', error)
    return { completed: false, totalSessions: 0, completedSessions: 0 }
  }
}