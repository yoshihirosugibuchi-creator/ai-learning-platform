'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Eye, 
  EyeOff, 
  ChevronDown, 
  ChevronRight,
  Bookmark,
  Clock,
  Star
} from 'lucide-react'
import { KnowledgeCard, getDifficultyColor, reviewKnowledgeCard } from '@/lib/knowledge-cards'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUserContext } from '@/contexts/UserContext'

interface KnowledgeCardProps {
  card: KnowledgeCard
  showDetails?: boolean
  onReview?: (cardId: string) => void
}

export default function KnowledgeCard({ 
  card, 
  showDetails = true, 
  onReview 
}: KnowledgeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const router = useRouter()
  const { user } = useUserContext()

  const handleReview = () => {
    // 復習回数をカウントアップ
    reviewKnowledgeCard(card.id, user?.id)
    onReview?.(card.id)
    
    // 学習セッションにナビゲート
    if (card.source) {
      const { courseId, genreId, themeId } = card.source
      // テーマの最初のセッションに移動。実際のセッションIDはコースデータから取得する必要がある
      // 今は簡易的にコースページに移動
      router.push(`/learning/${courseId}`)
    } else {
      console.warn('Card source information not available for navigation')
    }
  }

  const difficultyColor = getDifficultyColor(card.difficulty)
  const difficultyLabels = {
    beginner: '初級',
    intermediate: '中級', 
    advanced: '上級'
  }

  if (!card.obtained && !showDetails) {
    // 未獲得カードの場合はロック表示（格言カード同様のブランク表示）
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-300">
        <CardContent className="p-6 text-center">
          <div className="space-y-4">
            {/* ロックアイコン */}
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
              <EyeOff className="h-8 w-8 text-gray-400" />
            </div>
            
            {/* プレースホルダーテキスト */}
            <div className="space-y-3">
              <div className="h-5 bg-gray-200 rounded-md w-3/4 mx-auto animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3 mx-auto animate-pulse"></div>
            </div>
            
            {/* ステータスバッジ */}
            <div className="space-y-2">
              <Badge variant="outline" className="text-xs bg-white border-gray-300">
                ？？？
              </Badge>
              <div className="text-xs text-gray-500">
                学習コンテンツをクリアして獲得
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      className="overflow-hidden transition-all duration-200 hover:shadow-lg"
      style={{ borderTop: `4px solid ${card.color}` }}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="text-2xl p-2 rounded-full bg-opacity-10 flex items-center justify-center w-12 h-12"
              style={{ backgroundColor: `${card.color}20` }}
            >
              {card.icon}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg leading-tight">{card.title}</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="secondary" 
                  className="text-xs"
                  style={{ 
                    backgroundColor: difficultyColor,
                    color: 'white'
                  }}
                >
                  {difficultyLabels[card.difficulty]}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {card.category}
                </Badge>
              </div>
            </div>
          </div>
          
          {card.obtained && (
            <div className="flex flex-col items-end space-y-1">
              <Bookmark className="h-4 w-4 text-primary" />
              {card.obtainedAt && (
                <div className="text-xs text-muted-foreground">
                  <Clock className="h-3 w-3 inline mr-1" />
                  {new Date(card.obtainedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {card.summary}
        </p>

        {/* Key Points Toggle */}
        {card.keyPoints.length > 0 && (
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-2 p-0 h-auto text-sm font-medium text-primary hover:bg-transparent"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              <span>重要ポイント ({card.keyPoints.length})</span>
            </Button>
            
            {isExpanded && (
              <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                {card.keyPoints.map((point, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <Star className="h-3 w-3 text-primary mt-1 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{point}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Source Information */}
        <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
          学習コンテンツより獲得
        </div>

        {/* Action Button */}
        {card.obtained && showDetails && (
          <Button
            onClick={handleReview}
            variant="outline"
            size="sm"
            className="w-full"
            style={{ borderColor: card.color, color: card.color }}
          >
            <Eye className="h-4 w-4 mr-2" />
            復習する
          </Button>
        )}
      </CardContent>
    </Card>
  )
}