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
import { type UserKnowledgeCard } from '@/lib/knowledge-cards-v2'
import { reviewKnowledgeCard } from '@/lib/supabase-cards'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthProvider'

interface KnowledgeCardProps {
  card: UserKnowledgeCard & { obtained?: boolean }
  showDetails?: boolean
  onReview?: (cardId: string) => void
}

export default function KnowledgeCard({ 
  card, 
  showDetails = true, 
  onReview 
}: KnowledgeCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const _router = useRouter()
  const { user } = useAuth()

  const handleReview = async () => {
    // 復習回数をカウントアップ
    if (user?.id) {
      // Use theme_id for card identification in V2 system
      await reviewKnowledgeCard(user.id, card.theme_id)
      onReview?.(card.theme_id)
    }
    
    // 優先度順でナビゲーション先を決定
    if (card.course_id && card.genre_id && card.first_session_id) {
      // Best: Direct navigation to first session of the theme
      const sessionUrl = `/learning/${card.course_id}/${card.genre_id}/${card.theme_id}/${card.first_session_id}`
      console.log('🎯 Navigating directly to first session:', sessionUrl)
      _router.push(sessionUrl)
    } else if (card.course_id) {
      // Fallback: Navigate to course page where user can select the theme
      const courseUrl = `/learning/${card.course_id}`
      console.log('🔗 Navigating to course page for theme review:', courseUrl)
      console.log('🎯 User can find theme:', card.theme_id, 'in the course')
      _router.push(courseUrl)
    } else {
      console.warn('⚠️ Cannot navigate: missing course_id for theme:', card.theme_id)
      
      // Last resort: Navigate to general learning page
      console.log('🔗 Navigating to learning page (fallback)')
      _router.push('/learning')
    }
  }

  // V2では難易度色をシンプルに（カード自体に色情報を使用）
  const difficultyColor = card.card_data?.color || '#3B82F6'

  // Show as locked if no acquisition record (check obtained status properly)
  const isLocked = !showDetails || card.obtained === false
  
  if (isLocked) {
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
      style={{ borderTop: `4px solid ${difficultyColor}` }}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="text-2xl p-2 rounded-full bg-opacity-10 flex items-center justify-center w-12 h-12"
              style={{ backgroundColor: `${difficultyColor}20` }}
            >
              {card.card_data?.icon || '📚'}
            </div>
            <div className="space-y-1">
              <CardTitle className="text-lg leading-tight">{card.card_data?.title || 'ナレッジカード'}</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {card.theme_id}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-1">
            <Bookmark className="h-4 w-4 text-primary" />
            {card.obtained_at && (
              <div className="text-xs text-muted-foreground">
                <Clock className="h-3 w-3 inline mr-1" />
                {new Date(card.obtained_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {card.card_data?.summary || 'ナレッジカードの説明'}
        </p>

        {/* Key Points Toggle */}
        {card.card_data?.keyPoints && Array.isArray(card.card_data.keyPoints) && card.card_data.keyPoints.length > 0 && (
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
              <span>重要ポイント ({card.card_data.keyPoints.length})</span>
            </Button>
            
            {isExpanded && (
              <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                {card.card_data.keyPoints.map((point, index) => (
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
        {showDetails && (
          <Button
            onClick={handleReview}
            variant="outline"
            size="sm"
            className="w-full"
            style={{ borderColor: difficultyColor, color: difficultyColor }}
          >
            <Eye className="h-4 w-4 mr-2" />
            復習する
          </Button>
        )}
      </CardContent>
    </Card>
  )
}