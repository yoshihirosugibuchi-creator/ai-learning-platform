'use client'

import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, BarChart3, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { DifficultyLabels, DifficultyColors } from '@/lib/types/learning'

interface CaseStudyCardProps {
  problem: {
    id: string
    title: string
    primary_category_id: string
    difficulty: 'basic' | 'intermediate' | 'advanced' | 'expert'
    industry?: string | null
    industry_name?: string | null
    estimated_minutes: number
    step_count: number
    user_completed?: boolean
    user_best_score?: number | null
    avg_score?: number | null
    recommendation_reason?: string
  }
  showRecommendation?: boolean
}

export default function CaseStudyCard({ problem, showRecommendation = false }: CaseStudyCardProps) {
  const difficultyLabel = (DifficultyLabels as Record<string, string>)[problem.difficulty] || '中級'
  const difficultyColor = (DifficultyColors as Record<string, string>)[problem.difficulty] || '#F59E0B'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-medium text-base line-clamp-2">{problem.title}</h3>
          {problem.user_completed && (
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <Badge
            variant="secondary"
            style={{ backgroundColor: difficultyColor, color: 'white' }}
          >
            {difficultyLabel}
          </Badge>
          {(problem.industry_name || problem.industry) && (
            <Badge variant="outline">{problem.industry_name || problem.industry}</Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>約{problem.estimated_minutes}分</span>
          </div>
          <div className="flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            <span>{problem.step_count}ステップ</span>
          </div>
        </div>

        {problem.user_completed && problem.user_best_score !== null && (
          <div className="mt-3 text-sm">
            <span className="text-muted-foreground">最高スコア: </span>
            <span className="font-medium text-primary">{problem.user_best_score}%</span>
          </div>
        )}

        {!problem.user_completed && problem.avg_score != null && problem.avg_score > 0 && (
          <div className="mt-3 text-sm text-muted-foreground">
            平均スコア: {problem.avg_score}%
          </div>
        )}

        {showRecommendation && problem.recommendation_reason && (
          <div className="mt-3 text-sm text-primary">
            {problem.recommendation_reason}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0">
        <Link href={`/case-study/${problem.id}`} className="w-full">
          <Button className="w-full" variant={problem.user_completed ? 'outline' : 'default'}>
            {problem.user_completed ? '再挑戦' : '詳細を見る'}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}
