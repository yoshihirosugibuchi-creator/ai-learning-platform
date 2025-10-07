import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Types
interface OverviewMetrics {
  totalXP: number
  studyStreak: number
  averageAccuracy: number
  totalStudyTime: number
  courseCompletions: number
  quizSessionsCompleted: number
}

interface CategoryBreakdown {
  categoryId: string
  categoryName: string
  totalXP: number
  accuracyRate: number
  masteryLevel: number
  skillLevel: string
}

interface LearningPatterns {
  optimalStudyTime: string
  optimalAccuracy?: number
  weeklyConsistency: number
  averageSessionDuration: number
  studyStreakQuality: string
  hourlyPerformance?: Array<{
    hour: number
    averageAccuracy: number
    sessionCount: number
    performance: number
  }>
  dailyConsistency?: Array<{
    dayOfWeek: number
    sessionCount: number
    averageAccuracy: number
    dayName: string
  }>
}

interface WeaknessAnalysis {
  categoryId: string
  categoryName: string
  weaknessType: string
  currentAccuracy: number
  targetAccuracy: number
}

interface Recommendation {
  type: string
  title: string
  description: string
  priority: number
  estimatedTime: number
  categoryId?: string
  reason?: string
  confidence?: number
}

interface DetailedAnalytics {
  categoryBreakdown: CategoryBreakdown[]
  learningPatterns: LearningPatterns
  weaknessAnalysis: WeaknessAnalysis[]
  recommendations: Recommendation[]
}

// interface RecommendationData {
//   immediate: Recommendation[]
//   shortTerm: {
//     goals: string[]
//     recommendedCourses: Array<{
//       id: string
//       title: string
//       description: string
//       estimatedTime: string
//       difficulty: string
//     }>
//     timeframe: string
//   }
//   longTerm: {
//     careerObjective: string
//     skillGaps: string[]
//     learningRoadmap: Array<{
//       phase: number
//       duration: string
//       focus: string
//       activities: string[]
//     }>
//   }
// }

interface RealTimeUpdateData {
  userId: string
  sessionId: string
  eventType: 'quiz_completion' | 'course_session_end'
  data: {
    accuracy?: number
    duration?: number
    completionRate?: number
    categoryId?: string
    subcategoryId?: string
  }
}

// Query keys for cache management
export const learningAnalyticsKeys = {
  all: ['learning-analytics'] as const,
  overview: (userId: string, period: string) => [...learningAnalyticsKeys.all, 'overview', userId, period] as const,
  detailed: (userId: string) => [...learningAnalyticsKeys.all, 'detailed', userId] as const,
  recommendations: (userId: string) => [...learningAnalyticsKeys.all, 'recommendations', userId] as const,
}

// Hook for overview analytics with caching
export function useLearningAnalyticsOverview(userId: string, period: '7d' | '30d' | '90d' = '30d') {
  return useQuery({
    queryKey: learningAnalyticsKeys.overview(userId, period),
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`/api/learning-analytics/overview?userId=${userId}&period=${period}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load overview analytics')
      }

      return response.json()
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
    retry: (failureCount: number, error: Error) => {
      // Don't retry on auth errors
      if (error.message.includes('authentication')) return false
      return failureCount < 2
    }
  })
}

// Hook for detailed analytics with caching
export function useLearningAnalyticsDetailed(userId: string) {
  return useQuery({
    queryKey: learningAnalyticsKeys.detailed(userId),
    queryFn: async (): Promise<DetailedAnalytics> => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`/api/learning-analytics/detailed?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load detailed analytics')
      }

      return response.json()
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes (detailed data changes less frequently)
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
  })
}

// Hook for learning recommendations with caching
export function useLearningRecommendations(userId: string) {
  return useQuery({
    queryKey: learningAnalyticsKeys.recommendations(userId),
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`/api/recommendations/learning-path?userId=${userId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load recommendations')
      }

      return response.json()
    },
    enabled: !!userId,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  })
}

// Mutation for real-time analytics updates
export function useRealTimeAnalyticsUpdate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: RealTimeUpdateData) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch('/api/learning-analytics/real-time-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        throw new Error('Failed to update real-time analytics')
      }

      return response.json()
    },
    onSuccess: (_, variables) => {
      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ 
        queryKey: learningAnalyticsKeys.overview(variables.userId, '30d') 
      })
      queryClient.invalidateQueries({ 
        queryKey: learningAnalyticsKeys.detailed(variables.userId) 
      })
      
      // Potentially update recommendations as well
      queryClient.invalidateQueries({ 
        queryKey: learningAnalyticsKeys.recommendations(variables.userId) 
      })
    },
    onError: (error) => {
      console.error('Real-time analytics update failed:', error)
    }
  })
}

// Combined hook for all analytics data
export function useFullLearningAnalytics(userId: string, period: '7d' | '30d' | '90d' = '30d') {
  const overview = useLearningAnalyticsOverview(userId, period)
  const detailed = useLearningAnalyticsDetailed(userId)
  const recommendations = useLearningRecommendations(userId)

  return {
    overview,
    detailed,
    recommendations,
    isLoading: overview.isLoading || detailed.isLoading || recommendations.isLoading,
    isError: overview.isError || detailed.isError || recommendations.isError,
    error: overview.error || detailed.error || recommendations.error,
    refetchAll: () => {
      overview.refetch()
      detailed.refetch()
      recommendations.refetch()
    }
  }
}

// Utility function to manually update cache
export function updateAnalyticsCache(queryClient: QueryClient, userId: string, updates: Partial<OverviewMetrics>) {
  queryClient.setQueryData(
    learningAnalyticsKeys.overview(userId, '30d'),
    (oldData: OverviewMetrics | undefined) => oldData ? { ...oldData, ...updates } : undefined
  )
}

// Prefetch function for performance optimization  
export async function prefetchLearningAnalytics(queryClient: QueryClient, userId: string) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return

  // Prefetch overview data
  await queryClient.prefetchQuery({
    queryKey: learningAnalyticsKeys.overview(userId, '30d'),
    queryFn: async () => {
      const response = await fetch(`/api/learning-analytics/overview?userId=${userId}&period=30d`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!response.ok) throw new Error('Failed to prefetch overview')
      return response.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  // Prefetch detailed data
  await queryClient.prefetchQuery({
    queryKey: learningAnalyticsKeys.detailed(userId),
    queryFn: async () => {
      const response = await fetch(`/api/learning-analytics/detailed?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!response.ok) throw new Error('Failed to prefetch detailed')
      return response.json()
    },
    staleTime: 10 * 60 * 1000,
  })
}