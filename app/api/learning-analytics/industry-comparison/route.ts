import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const targetRole = searchParams.get('targetRole') || 'frontend_developer'

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Get user's current skills
    const { data: userStats } = await supabaseAdmin
      .from('user_category_xp_stats_v2')
      .select('*')
      .eq('user_id', userId)
      .order('total_xp', { ascending: false })

    // Industry benchmarks (これは実際のデータから算出するが、今回は代表的な値を使用)
    const industryBenchmarks = {
      frontend_developer: {
        javascript: { beginner: 300, intermediate: 800, advanced: 1500, expert: 2500 },
        react: { beginner: 250, intermediate: 600, advanced: 1200, expert: 2000 },
        html_css: { beginner: 200, intermediate: 500, advanced: 1000, expert: 1800 },
        typescript: { beginner: 400, intermediate: 900, advanced: 1600, expert: 2200 },
        node_js: { beginner: 350, intermediate: 750, advanced: 1400, expert: 2100 },
        testing: { beginner: 300, intermediate: 700, advanced: 1300, expert: 1900 }
      },
      full_stack_developer: {
        javascript: { beginner: 400, intermediate: 1000, advanced: 1800, expert: 3000 },
        react: { beginner: 300, intermediate: 800, advanced: 1500, expert: 2500 },
        node_js: { beginner: 500, intermediate: 1200, advanced: 2000, expert: 3200 },
        databases: { beginner: 300, intermediate: 700, advanced: 1300, expert: 2000 },
        api_development: { beginner: 250, intermediate: 600, advanced: 1100, expert: 1800 }
      }
    }

    const targetBenchmarks = industryBenchmarks[targetRole as keyof typeof industryBenchmarks] || industryBenchmarks.frontend_developer

    // Calculate user's position vs industry
    const skillComparison = (userStats || []).map(stat => {
      const categoryKey = stat.category_id.toLowerCase()
      let benchmark = targetBenchmarks[categoryKey as keyof typeof targetBenchmarks]
      
      // If no exact match, use general benchmarks based on category type
      if (!benchmark) {
        // General skill benchmarks for any professional development
        benchmark = { beginner: 100, intermediate: 300, advanced: 600, expert: 1000 }
      }

      const userXP = stat.total_xp || 0
      const userAccuracy = stat.quiz_average_accuracy || 0

      // Determine user's level
      let userLevel = 'beginner'
      if (userXP >= benchmark.expert) userLevel = 'expert'
      else if (userXP >= benchmark.advanced) userLevel = 'advanced'
      else if (userXP >= benchmark.intermediate) userLevel = 'intermediate'

      // Calculate percentile (simplified)
      const percentile = Math.min(95, Math.max(5, 
        userLevel === 'expert' ? 85 + (userAccuracy - 80) / 4 :
        userLevel === 'advanced' ? 70 + Math.min(15, (userXP - benchmark.advanced) / (benchmark.expert - benchmark.advanced) * 15) :
        userLevel === 'intermediate' ? 40 + Math.min(30, (userXP - benchmark.intermediate) / (benchmark.advanced - benchmark.intermediate) * 30) :
        Math.min(40, userXP / benchmark.intermediate * 40)
      ))

      // Calculate gap to next level
      let nextLevel = 'intermediate'
      let nextLevelXP = benchmark.intermediate
      let gapXP = Math.max(0, benchmark.intermediate - userXP)

      if (userLevel === 'intermediate') {
        nextLevel = 'advanced'
        nextLevelXP = benchmark.advanced
        gapXP = Math.max(0, benchmark.advanced - userXP)
      } else if (userLevel === 'advanced') {
        nextLevel = 'expert'
        nextLevelXP = benchmark.expert
        gapXP = Math.max(0, benchmark.expert - userXP)
      } else if (userLevel === 'expert') {
        nextLevel = 'master'
        nextLevelXP = benchmark.expert * 1.5
        gapXP = 0
      }

      return {
        categoryId: stat.category_id,
        categoryName: stat.category_id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        userXP: userXP,
        userAccuracy: Math.round(userAccuracy * 100) / 100,
        userLevel,
        industryPercentile: Math.round(percentile),
        nextLevel,
        nextLevelXP,
        gapXP,
        gapPercentage: Math.round((gapXP / nextLevelXP) * 100),
        estimatedTimeToNextLevel: gapXP > 0 ? Math.ceil(gapXP / 50) : 0, // Assuming 50 XP per week
        benchmark: {
          beginner: benchmark.beginner,
          intermediate: benchmark.intermediate,
          advanced: benchmark.advanced,
          expert: benchmark.expert
        }
      }
    }) // Keep all categories now

    // Calculate overall career readiness
    const totalSkills = skillComparison.length
    const expertSkills = skillComparison.filter(s => s.userLevel === 'expert').length
    const advancedSkills = skillComparison.filter(s => s.userLevel === 'advanced').length
    const intermediateSkills = skillComparison.filter(s => s.userLevel === 'intermediate').length

    const careerReadiness = {
      targetRole: targetRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      overallPercentile: Math.round(
        skillComparison.reduce((sum, s) => sum + s.industryPercentile, 0) / Math.max(1, totalSkills)
      ),
      skillDistribution: {
        expert: expertSkills,
        advanced: advancedSkills,
        intermediate: intermediateSkills,
        beginner: totalSkills - expertSkills - advancedSkills - intermediateSkills
      },
      readinessScore: Math.round(
        (expertSkills * 100 + advancedSkills * 75 + intermediateSkills * 50) / (totalSkills * 100) * 100
      ),
      topStrengths: skillComparison
        .filter(s => s.userLevel === 'expert' || s.industryPercentile >= 80)
        .sort((a, b) => b.industryPercentile - a.industryPercentile)
        .slice(0, 3)
        .map(s => ({
          skill: s.categoryName,
          level: s.userLevel,
          percentile: s.industryPercentile
        })),
      priorityGaps: skillComparison
        .filter(s => s.userLevel === 'beginner' || s.industryPercentile < 40)
        .sort((a, b) => a.industryPercentile - b.industryPercentile)
        .slice(0, 3)
        .map(s => ({
          skill: s.categoryName,
          currentLevel: s.userLevel,
          targetLevel: s.nextLevel,
          gapXP: s.gapXP,
          estimatedWeeks: s.estimatedTimeToNextLevel
        }))
    }

    // Generate career advancement recommendations
    const careerRecommendations = []

    if (careerReadiness.readinessScore < 60) {
      careerRecommendations.push({
        type: 'foundation_building',
        title: 'Build Core Skills Foundation',
        description: `Focus on ${careerReadiness.priorityGaps.slice(0, 2).map(g => g.skill).join(' and ')} to reach industry standards`,
        priority: 1,
        estimatedWeeks: Math.max(...careerReadiness.priorityGaps.slice(0, 2).map(g => g.estimatedWeeks)),
        impact: 'high'
      })
    } else if (careerReadiness.readinessScore < 80) {
      careerRecommendations.push({
        type: 'skill_advancement',
        title: 'Advance Key Skills',
        description: `Strengthen your ${careerReadiness.priorityGaps[0]?.skill || 'weakest areas'} to stand out`,
        priority: 1,
        estimatedWeeks: careerReadiness.priorityGaps[0]?.estimatedWeeks || 8,
        impact: 'medium'
      })
    } else {
      careerRecommendations.push({
        type: 'specialization',
        title: 'Develop Specialization',
        description: `Consider specializing in ${careerReadiness.topStrengths[0]?.skill || 'your strongest area'} for expert-level mastery`,
        priority: 1,
        estimatedWeeks: 12,
        impact: 'high'
      })
    }

    const response = {
      targetRole,
      skillComparison,
      careerReadiness,
      careerRecommendations,
      lastUpdated: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching industry comparison:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}