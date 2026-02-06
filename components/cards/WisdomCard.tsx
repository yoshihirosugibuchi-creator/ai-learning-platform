'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WisdomCard as WisdomCardType, getCategoryIcon, getRarityConfig, getCategoryDisplayName, getSubcategoryDisplayName } from '@/lib/cards'
import { cn } from '@/lib/utils'
import { Lock, Sparkles } from 'lucide-react'
import { getWisdomCardVisualInfo } from '@/lib/wisdom-card-themes'

interface WisdomCardProps {
  card: WisdomCardType & { obtained?: boolean; count?: number }
  className?: string
  onClick?: () => void
  showDetails?: boolean
  subcategories?: Array<{subcategory_id: string, name: string}>
}

export default function WisdomCard({
  card,
  className,
  onClick,
  showDetails = false,
  subcategories
}: WisdomCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const rarityConfig = getRarityConfig(card.rarity)
  const categoryDisplayName = getCategoryDisplayName(card.categoryId)
  // サブカテゴリー名の取得：DBから取得したsubcategoriesを使用（フォールバックあり）
  const subcategoryDisplayName = card.subcategoryId ? getSubcategoryDisplayName(card.subcategoryId, subcategories) : ''
  const categoryIcon = getCategoryIcon(categoryDisplayName)

  // 統一ビジュアルシステム
  const visualInfo = getWisdomCardVisualInfo(card.rarity, card.author)

  // 統一ビジュアルフレームワークCSSを動的読み込み
  useEffect(() => {
    if (card.obtained) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = '/images/wisdom-cards/css/wisdom-card-framework.css'
      link.id = 'wisdom-card-framework'
      
      if (!document.getElementById('wisdom-card-framework')) {
        document.head.appendChild(link)
      }
    }
  }, [card.obtained])

  const handleCardClick = () => {
    if (card.obtained && showDetails) {
      setIsFlipped(!isFlipped)
    }
    onClick?.()
  }

  return (
    <div 
      className={cn(
        "group perspective-1000 cursor-pointer transition-all duration-300 hover:scale-105",
        card.obtained && visualInfo.cssClasses,
        className
      )}
      onClick={handleCardClick}
    >
      <div className={cn(
        "relative w-full h-80 transform-style-preserve-3d transition-transform duration-700",
        isFlipped && showDetails && "rotate-y-180"
      )}>
        {/* Front of Card */}
        <Card className={cn(
          "absolute inset-0 backface-hidden overflow-hidden",
          "transition-all duration-300",
          "wisdom-card-frame", // 常に統一フレームを適用
          card.obtained ? [
            "shadow-lg hover:shadow-xl"
          ] : [
            "border-2 border-gray-300 bg-gray-100",
            "shadow-sm"
          ]
        )}>
          <div className="relative h-full flex flex-col">
            {/* Card Header */}
            <div className="relative p-4 pb-2">
              <div className="flex items-center justify-between mb-2">
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "font-semibold text-xs px-2 py-1",
                    card.obtained ? rarityConfig.textColor : "text-gray-500"
                  )}
                >
                  <span className="mr-1">{card.obtained ? rarityConfig.symbol : '🔒'}</span>
                  {card.rarity}
                </Badge>
                {card.obtained && card.count && card.count > 1 && (
                  <Badge variant="outline" className="text-xs">
                    ×{card.count}
                  </Badge>
                )}
              </div>
              
              {/* Category */}
              <div className="flex items-center space-x-2">
                <span className="text-lg">{categoryIcon}</span>
                <div className={cn(
                  "text-sm font-medium",
                  card.obtained ? "text-gray-700" : "text-gray-500"
                )}>
                  <div>{categoryDisplayName}</div>
                  {subcategoryDisplayName && (
                    <div className="text-xs text-gray-500 mt-1">{subcategoryDisplayName}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Card Body */}
            <div className="flex-1 px-4">
              {card.obtained ? (
                <div className="h-full flex flex-col justify-center">
                  {/* Quote */}
                  <div className="relative">
                    <div className="absolute -top-2 -left-1 text-3xl opacity-30 leading-none">
                      &ldquo;
                    </div>
                    <blockquote className={cn(
                      "text-center italic leading-tight mb-4 pl-3",
                      card.rarity === 'レジェンダリー' ? 'text-lg' : 'text-base',
                      card.obtained && "wisdom-quote-enhanced"
                    )}>
                      {card.quote}
                    </blockquote>
                    <div className="absolute -bottom-2 -right-1 text-3xl opacity-30 leading-none">
                      &rdquo;
                    </div>
                  </div>
                  
                  {/* Author */}
                  <div className="text-center">
                    <div className="text-sm font-bold text-gray-800 mb-1">
                      {card.author}
                    </div>
                    {card.rarity === 'レジェンダリー' && (
                      <div className="flex justify-center">
                        <Sparkles className="h-4 w-4 text-yellow-500 animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <Lock className="h-12 w-12 mb-3 opacity-50" />
                  <div className="text-2xl font-bold mb-2">???</div>
                  <div className="text-sm text-center px-2">
                    クイズをクリアして<br />格言を獲得しよう
                  </div>
                </div>
              )}
            </div>

            {/* Card Footer */}
            {card.obtained && (
              <div className="px-4 py-3 border-t border-gray-200/50">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-gray-600">
                    {rarityConfig.stars}
                  </div>
                  {showDetails && (
                    <div className="text-xs text-gray-500">
                      クリックで詳細表示
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Unified Particle Effects */}
            {card.obtained && (
              <div className="wisdom-particles">
                {Array.from({ length: visualInfo.particleCount }, (_, index) => (
                  <div 
                    key={index}
                    className="wisdom-particle"
                    style={{
                      width: '4px',
                      height: '4px',
                      top: `${20 + (index * 30)}%`,
                      left: `${10 + (index * 25)}%`,
                      animationDelay: `${index * 2}s`
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Back of Card (Details) */}
        {showDetails && card.obtained && (
          <Card className={cn(
            "absolute inset-0 backface-hidden rotate-y-180 overflow-hidden",
            "border-2 transition-all duration-300",
            rarityConfig.borderColor,
            rarityConfig.bgColor,
            "shadow-lg"
          )}>
            <div className="h-full p-4 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <Badge 
                  variant="secondary" 
                  className={cn("font-semibold text-xs", rarityConfig.textColor)}
                >
                  詳細情報
                </Badge>
                <div className="text-xs text-gray-500">
                  クリックで戻る
                </div>
              </div>

              <div className="flex-1 space-y-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">背景・文脈</h4>
                  <p className="text-gray-600 leading-relaxed">
                    {card.context}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-1">活用分野</h4>
                  <p className="text-gray-600">
                    {card.applicationArea}
                  </p>
                </div>

                <div className="border-t pt-3 mt-auto">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-600">
                      影響力: {rarityConfig.stars}
                    </div>
                    <div className="text-xs text-gray-500">
                      {subcategoryDisplayName || categoryDisplayName}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

// Animation keyframes for the card flip
const styles = `
  .perspective-1000 {
    perspective: 1000px;
  }
  
  .transform-style-preserve-3d {
    transform-style: preserve-3d;
  }
  
  .backface-hidden {
    backface-visibility: hidden;
  }
  
  .rotate-y-180 {
    transform: rotateY(180deg);
  }
`

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.type = 'text/css'
  styleSheet.innerText = styles
  document.head.appendChild(styleSheet)
}