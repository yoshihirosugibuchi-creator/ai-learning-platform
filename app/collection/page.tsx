'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bookmark, 
  Trophy, 
  Sparkles, 
  Filter,
  Star,
  Crown,
  Gem,
  Target,
  BookOpen,
  Brain
} from 'lucide-react'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import WisdomCard from '@/components/cards/WisdomCard'
import KnowledgeCard from '@/components/cards/KnowledgeCard'
import { useAuth } from '@/components/auth/AuthProvider'
import { getCategoryDisplayName, WisdomCard as WisdomCardType, getAllWisdomCardsFromDB } from '@/lib/cards'
import { 
  getUserWisdomCards, 
  getWisdomCardStats, 
  hasWisdomCard, 
  getWisdomCardCount,
  WisdomCardCollection
} from '@/lib/supabase-cards'
import {
  UserKnowledgeCard,
  getKnowledgeCardStats,
  getUserKnowledgeCollection
} from '@/lib/knowledge-cards-v2'
import {
  UserKnowledgeCollectionV2
} from '@/lib/types/knowledge-cards-v2'
import { getUserBadges } from '@/lib/supabase-badges'
import { UserBadge } from '@/lib/types/learning'
import { supabase } from '@/lib/supabase'

// Define constants outside component to avoid re-creation
const RARITIES = ['コモン', 'レア', 'エピック', 'レジェンダリー']

export default function CollectionPage() {
  // すべてのState Hooksを最初に宣言
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [selectedRarity, setSelectedRarity] = useState<string>('all')
  const [selectedWisdomCategory, setSelectedWisdomCategory] = useState<string>('all')
  // selectedKnowledgeCategory removed - V2システムではカテゴリーフィルター不要
  const [selectedBadgeStatus, setSelectedBadgeStatus] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('wisdom')
  const { user } = useAuth()

  // 格言カード（従来のカード）データ - Supabase版
  const [wisdomCollectionData, setWisdomCollectionData] = useState<{
    collection: WisdomCardCollection[]
    stats: { totalObtained: number; totalCards: number; uniqueCards: number }
    cardsWithStatus: Array<{ obtained: boolean; count: number; id: number; author: string; quote: string; categoryId: string; subcategoryId?: string; rarity: string; context: string; applicationArea: string }>
  }>({
    collection: [],
    stats: { totalObtained: 0, totalCards: 0, uniqueCards: 0 },
    cardsWithStatus: [] // DB版データで初期化予定
  })
  const [wisdomDataLoading, setWisdomDataLoading] = useState(true)

  // 古いnewKnowledgeCards関連の状態は削除（knowledgeCollectionDataに統合）

  // ナレッジカードコレクション表示用の型定義
  interface KnowledgeCardWithStatus extends UserKnowledgeCard {
    obtained: boolean
    course_title?: string
    genre_title?: string
    display_order?: {
      course: number
      genre: number
      theme: number
    }
    created_at?: string | null
  }

  // ナレッジカードデータ（学習コンテンツから獲得） - V2システム対応
  const [knowledgeCollectionData, setKnowledgeCollectionData] = useState<{
    collection: UserKnowledgeCollectionV2[]
    stats: { totalObtained: number; totalCards: number; uniqueCards: number; totalReviews?: number }
    cardsWithStatus: KnowledgeCardWithStatus[]
  }>({
    collection: [],
    stats: { totalObtained: 0, totalCards: 0, uniqueCards: 0, totalReviews: 0 },
    cardsWithStatus: []
  })

  // バッジデータ
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [badgeLoading, setBadgeLoading] = useState(true)

  // すべてのuseEffectを一箇所に集約
  useEffect(() => {
    if (user?.id) {
      const loadWisdomCards = async () => {
        try {
          setWisdomDataLoading(true)
          
          // 最初に基本データを取得
          const [collection, stats] = await Promise.all([
            getUserWisdomCards(user.id),
            getWisdomCardStats(user.id)
          ])

          // 初期状態をセット（数値が確定してから表示）
          setWisdomCollectionData(prev => ({
            ...prev,
            collection,
            stats
          }))

          // DB版: 全カードを取得してから取得状況を並列取得
          console.log('🎴 Loading wisdom cards from DB with fallback...')
          const allWisdomCards = await getAllWisdomCardsFromDB()
          
          console.log(`🔍 [Collection] Loading wisdom cards for user ${user.id}...`)
          const cardsWithStatus = await Promise.all(
            allWisdomCards.map(async (card) => {
              try {
                const [obtained, count] = await Promise.all([
                  hasWisdomCard(user.id, card.id),
                  getWisdomCardCount(user.id, card.id)
                ])
                
                const cardWithStatus = { ...card, obtained, count }
                console.log(`🔍 [Collection] Card ${card.id} (${card.author}):`, {
                  categoryId: cardWithStatus.categoryId,
                  rarity: cardWithStatus.rarity,
                  obtained: cardWithStatus.obtained,
                  count: cardWithStatus.count
                })
                
                return cardWithStatus
              } catch (error) {
                console.error(`Error loading card ${card.id}:`, error)
                return { ...card, obtained: false, count: 0 }
              }
            })
          )
          console.log(`🔍 [Collection] Total cards loaded: ${cardsWithStatus.length}`)

          // 最終データをセット
          setWisdomCollectionData({
            collection,
            stats,
            cardsWithStatus
          })
        } catch (error) {
          console.error('Error loading wisdom cards:', error)
        } finally {
          setWisdomDataLoading(false)
        }
      }

      loadWisdomCards()
    }
  }, [user])

  useEffect(() => {
    const fetchBadges = async () => {
      if (!user?.id) return
      
      setBadgeLoading(true)
      try {
        const badges = await getUserBadges(user.id)
        setUserBadges(badges)
      } catch (error) {
        console.error('Error fetching badges:', error)
      } finally {
        setBadgeLoading(false)
      }
    }

    fetchBadges()
  }, [user?.id])

  useEffect(() => {
    if (user?.id) {
      const loadKnowledgeCards = async () => {
        try {
          console.log(`🔄 LOADING KNOWLEDGE CARDS for user: ${user.id}`)
          
          // Step 1: Get user's acquired cards
          const [userCollection, v2Stats] = await Promise.all([
            getUserKnowledgeCollection(user.id),
            getKnowledgeCardStats(user.id)
          ])

          // Adapt V2 stats to V1 format for compatibility
          const stats = {
            totalObtained: v2Stats.totalCards,
            totalCards: v2Stats.totalCards,
            uniqueCards: v2Stats.totalCards
          }

          console.log(`📚 USER COLLECTION LOADED for user ${user?.id}:`, userCollection)
          console.log('📊 Knowledge card stats:', stats)
          
          // Step 2: Get ALL themes with simpler query to avoid complex JOIN errors
          const { data: allThemes, error: themesError } = await supabase
            .from('learning_themes')
            .select('id, title, reward_card_data, genre_id, display_order')
            .order('display_order', { ascending: true })
          
          if (themesError) {
            console.error('❌ Failed to fetch all themes:', themesError)
            console.error('Error details:', themesError)
            return
          }
          
          if (!allThemes || allThemes.length === 0) {
            console.log('⚠️ No themes found in database')
            setKnowledgeCollectionData({
              collection: [],
              stats,
              cardsWithStatus: []
            })
            return
          }
          
          console.log(`🗂️ ALL THEMES LOADED: ${allThemes?.length || 0} themes`)
          
          // Step 3: Get additional data for each theme and create cards with status
          const cardsWithStatus = await Promise.all(
            allThemes.map(async (theme) => {
              try {
                // Check if user has this card
                const userCard = userCollection.find(card => card.theme_id === theme.id)
                const isObtained = !!userCard
                
                const rewardCardData = (theme.reward_card_data as Record<string, unknown>) || {}
                
                // Get genre information separately for better error handling
                const { data: genreInfo } = await supabase
                  .from('learning_genres')
                  .select('id, title, course_id, display_order')
                  .eq('id', theme.genre_id)
                  .single()
                
                // Get course information if genre exists
                let courseInfo = null
                if (genreInfo?.course_id) {
                  const { data: courseData } = await supabase
                    .from('learning_courses')
                    .select('id, title, display_order')
                    .eq('id', genreInfo.course_id)
                    .single()
                  courseInfo = courseData
                }
                
                // Get first session for direct navigation
                const { data: sessions } = await supabase
                  .from('learning_sessions')
                  .select('id, display_order')
                  .eq('theme_id', theme.id)
                  .order('display_order', { ascending: true })
                  .limit(1)
                
                const firstSession = sessions?.[0] || null
                
                const courseId = genreInfo?.course_id || null
                const courseTitle = courseInfo?.title || 'Unknown Course'
                const genreTitle = genreInfo?.title || 'Unknown Genre'
                
                const enrichedCard: KnowledgeCardWithStatus = {
                  id: userCard?.id || `placeholder_${theme.id}`,
                  user_id: user.id,
                  theme_id: theme.id,
                  obtained_at: userCard?.obtained_at || null,
                  created_at: userCard?.created_at || null,
                  obtained: isObtained,
                  card_data: {
                    id: theme.id,
                    title: (rewardCardData.title as string) || theme.title || 'ナレッジカード',
                    summary: (rewardCardData.description as string) || (rewardCardData.summary as string) || 'テーマ完了により獲得',
                    icon: (rewardCardData.icon as string) || '📚',
                    color: (rewardCardData.color as string) || '#3B82F6',
                    keyPoints: (rewardCardData.keyPoints as string[]) || (rewardCardData.key_points as string[]) || []
                  },
                  course_id: courseId || undefined,
                  genre_id: theme.genre_id,
                  theme_title: theme.title,
                  first_session_id: firstSession?.id,
                  // Display info
                  course_title: courseTitle,
                  genre_title: genreTitle,
                  display_order: {
                    course: courseInfo?.display_order || 999,
                    genre: genreInfo?.display_order || 999,
                    theme: theme.display_order || 999
                  }
                }
                
                return enrichedCard
              } catch (enrichError) {
                console.error(`❌ Error enriching theme ${theme.id}:`, enrichError)
                return null
              }
            })
          )
          
          const validCards = cardsWithStatus.filter((card): card is KnowledgeCardWithStatus => card !== null)
          
          // 階層ソート: コース > ジャンル > テーマの順番でソート
          validCards.sort((a, b) => {
            // 第1キー: コースの表示順
            if (a.display_order!.course !== b.display_order!.course) {
              return a.display_order!.course - b.display_order!.course
            }
            // 第2キー: ジャンルの表示順
            if (a.display_order!.genre !== b.display_order!.genre) {
              return a.display_order!.genre - b.display_order!.genre
            }
            // 第3キー: テーマの表示順
            return a.display_order!.theme - b.display_order!.theme
          })
          
          console.log('✨ All cards with status created and sorted:', validCards.length)
          console.log('🎯 Sample card:', validCards[0])
          console.log('🔢 Sort order sample:', validCards.slice(0, 3).map(card => ({ 
            course: card.display_order?.course, 
            genre: card.display_order?.genre, 
            theme: card.display_order?.theme, 
            title: card.card_data?.title 
          })))

          // 獲得済みカードをUserKnowledgeCollectionV2形式に変換
          const obtainedCardsAsV2: UserKnowledgeCollectionV2[] = validCards
            .filter(card => card.obtained)
            .map(card => ({
              id: card.id,
              user_id: card.user_id,
              theme_id: card.theme_id,
              obtained_at: card.obtained_at,
              created_at: card.created_at || null
            }))

          setKnowledgeCollectionData({
            collection: obtainedCardsAsV2,
            stats,
            cardsWithStatus: validCards
          })
        } catch (error) {
          console.error('❌ Error loading knowledge cards:', error)
        }
      }

      loadKnowledgeCards()
    }

    // 新システムのデータ読み込みは上記のloadKnowledgeCardsに統合済み
  }, [user])

  // ナレッジカードデータのログ出力
  useMemo(() => {
    console.log('🎴 Processing enriched knowledge cards...')
    console.log(`📊 Enriched cards loaded: ${knowledgeCollectionData.collection.length}`)
    console.log(`📈 Collection stats:`, knowledgeCollectionData.stats)
    console.log(`✅ Processed ${knowledgeCollectionData.collection.length} enriched knowledge cards`)
    if (knowledgeCollectionData.collection.length > 0) {
      console.log('🎯 Sample enriched card:', knowledgeCollectionData.collection[0])
    }
  }, [knowledgeCollectionData])

  // 格言カード用フィルタリング
  const filteredWisdomCards = useMemo(() => {
    return wisdomCollectionData.cardsWithStatus.filter(card => {
      const rarityMatch = selectedRarity === 'all' || card.rarity === selectedRarity
      const categoryMatch = selectedWisdomCategory === 'all' || card.categoryId === selectedWisdomCategory
      return rarityMatch && categoryMatch
    })
  }, [wisdomCollectionData.cardsWithStatus, selectedRarity, selectedWisdomCategory])

  // ナレッジカード用フィルタリング（格言カードと同様の仕組み）
  const filteredKnowledgeCards = useMemo(() => {
    // cardsWithStatusを使用（全てのカード：取得済み・未取得含む）
    return knowledgeCollectionData.cardsWithStatus
  }, [knowledgeCollectionData.cardsWithStatus])

  const obtainedWisdomCards = filteredWisdomCards.filter(card => card.obtained)
  const lockedWisdomCards = filteredWisdomCards.filter(card => !card.obtained)
  const obtainedKnowledgeCards = filteredKnowledgeCards.filter(card => card.obtained)
  const lockedKnowledgeCards = filteredKnowledgeCards.filter(card => !card.obtained)

  // バッジフィルタリング
  const filteredBadges = useMemo(() => {
    if (!userBadges) return []
    
    return userBadges.filter(badge => {
      if (selectedBadgeStatus === 'all') return true
      if (selectedBadgeStatus === 'active') return !badge.isExpired
      if (selectedBadgeStatus === 'expired') return badge.isExpired
      return true
    })
  }, [userBadges, selectedBadgeStatus])

  const activeBadges = userBadges.filter(badge => !badge.isExpired)
  const expiredBadges = userBadges.filter(badge => badge.isExpired)

  // 格言カードのカテゴリー（10基本カテゴリー全てを表示）
  const wisdomCategories = [
    'communication_presentation',
    'logical_thinking_problem_solving',
    'strategy_management',
    'finance',
    'marketing_sales',
    'leadership_hr',
    'ai_digital_utilization',
    'project_operations',
    'business_process_analysis',
    'risk_crisis_management'
  ]
  
  // knowledgeCategories removed - V2システムではカテゴリーフィルター不要

  const rarityStats = useMemo(() => {
    return RARITIES.map(rarity => {
      const totalInRarity = wisdomCollectionData.cardsWithStatus.filter(card => card.rarity === rarity).length
      const obtainedInRarity = wisdomCollectionData.cardsWithStatus
        .filter(card => card.rarity === rarity && card.obtained).length
      
      return {
        rarity,
        obtained: obtainedInRarity,
        total: totalInRarity,
        percentage: totalInRarity > 0 ? Math.round((obtainedInRarity / totalInRarity) * 100) : 0
      }
    })
  }, [wisdomCollectionData.cardsWithStatus])

  const wisdomCollectionRate = wisdomDataLoading ? 0 : Math.round((wisdomCollectionData.stats.uniqueCards / wisdomCollectionData.cardsWithStatus.length) * 100)

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
        <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p>ログインが必要です</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMobileMenuToggle={() => setMobileNavOpen(!mobileNavOpen)} />
      <MobileNav isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div className="mb-4 md:mb-0">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold flex items-center space-x-2">
              <Bookmark className="h-8 w-8 text-primary" />
              <span>カードコレクション</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              学習の成果として手に入れた知恵とスキル
            </p>
          </div>
        </div>

        {/* Main Collection Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 h-auto sm:h-12 gap-1 p-1">
            <TabsTrigger value="wisdom" className="flex items-center justify-center space-x-1 text-xs sm:text-sm py-2">
              <Crown className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">格言カード</span>
              <span className="sm:hidden">格言</span>
              <Badge variant="secondary" className="text-xs px-1">
                {obtainedWisdomCards.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center justify-center space-x-1 text-xs sm:text-sm py-2">
              <Brain className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">ナレッジカード</span>
              <span className="sm:hidden">ナレッジ</span>
              <Badge variant="secondary" className="text-xs px-1">
                {obtainedKnowledgeCards.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center justify-center space-x-1 text-xs sm:text-sm py-2">
              <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>修了証</span>
              <Badge variant="secondary" className="text-xs px-1">
                {activeBadges.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* 格言カードタブ */}
          <TabsContent value="wisdom" className="space-y-6">
            {/* Collection Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    <div className="text-2xl font-bold">
                      {wisdomDataLoading ? (
                        <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                      ) : (
                        `${wisdomCollectionRate}%`
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">コレクション率</p>
                  <Progress value={wisdomDataLoading ? 0 : wisdomCollectionRate} className="mt-2 h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <div className="text-2xl font-bold">
                      {wisdomDataLoading ? (
                        <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                      ) : (
                        wisdomCollectionData.stats.uniqueCards
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">獲得種類数</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <Star className="h-4 w-4 text-blue-500" />
                    <div className="text-2xl font-bold">
                      {wisdomDataLoading ? (
                        <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                      ) : (
                        wisdomCollectionData.stats.totalCards
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">獲得総枚数</p>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Rarity Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Crown className="h-5 w-5" />
                  <span>レア度別進捗</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {rarityStats.map(({ rarity, obtained, total, percentage }) => (
                    <div key={rarity} className="text-center">
                      <div className="flex items-center justify-center mb-2">
                        {rarity === 'レジェンダリー' && <Crown className="h-5 w-5 text-yellow-500 mr-1" />}
                        {rarity === 'エピック' && <Gem className="h-5 w-5 text-purple-500 mr-1" />}
                        {rarity === 'レア' && <Star className="h-5 w-5 text-blue-500 mr-1" />}
                        {rarity === 'コモン' && <Target className="h-5 w-5 text-gray-500 mr-1" />}
                        <Badge variant="outline" className="text-xs">
                          {rarity}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium mb-1">
                        {obtained}/{total}
                      </div>
                      <Progress value={percentage} className="h-2" />
                      <div className="text-xs text-muted-foreground mt-1">
                        {percentage}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">レア度</label>
                    <select
                      value={selectedRarity}
                      onChange={(e) => setSelectedRarity(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="all">全てのレア度</option>
                      {RARITIES.map(rarity => (
                        <option key={rarity} value={rarity}>{rarity}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">カテゴリー</label>
                    <select
                      value={selectedWisdomCategory}
                      onChange={(e) => setSelectedWisdomCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="all">全てのカテゴリー</option>
                      {wisdomCategories.map(categoryId => (
                        <option key={categoryId} value={categoryId}>{getCategoryDisplayName(categoryId)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card Collection Tabs */}
            <Tabs defaultValue="all" className="space-y-6">
              <TabsList className="grid grid-cols-1 md:grid-cols-3 h-auto">
                <TabsTrigger value="all" className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4" />
                  <span>全て ({wisdomDataLoading ? '...' : filteredWisdomCards.length})</span>
                </TabsTrigger>
                <TabsTrigger value="obtained" className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4" />
                  <span>獲得済み ({wisdomDataLoading ? '...' : obtainedWisdomCards.length})</span>
                </TabsTrigger>
                <TabsTrigger value="locked" className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>未獲得 ({wisdomDataLoading ? '...' : lockedWisdomCards.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredWisdomCards.map(card => (
                    <WisdomCard 
                      key={card.id} 
                      card={card as WisdomCardType & { obtained?: boolean; count?: number }}
                      showDetails={true}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="obtained">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {obtainedWisdomCards.map(card => (
                    <WisdomCard 
                      key={card.id} 
                      card={card as WisdomCardType & { obtained?: boolean; count?: number }}
                      showDetails={true}
                    />
                  ))}
                </div>
                {obtainedWisdomCards.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>まだ格言カードを獲得していません</p>
                    <p className="text-sm mt-2">クイズに挑戦して偉人の知恵を集めましょう！</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="locked">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {lockedWisdomCards.map(card => (
                    <WisdomCard 
                      key={card.id} 
                      card={card as WisdomCardType & { obtained?: boolean; count?: number }}
                      showDetails={false}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* ナレッジカードタブ */}
          <TabsContent value="knowledge" className="space-y-6">
            {/* Knowledge Cards Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="h-4 w-4 text-blue-500" />
                    <div className="text-2xl font-bold">
                      {knowledgeCollectionData.collection.length === 0 && knowledgeCollectionData.stats.totalObtained === 0 ? (
                        <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                      ) : (
                        `${knowledgeCollectionData.cardsWithStatus.length > 0 ? Math.round((obtainedKnowledgeCards.length / knowledgeCollectionData.cardsWithStatus.length) * 100) : 0}%`
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">習得率</p>
                  <Progress value={knowledgeCollectionData.cardsWithStatus.length > 0 ? Math.round((obtainedKnowledgeCards.length / knowledgeCollectionData.cardsWithStatus.length) * 100) : 0} className="mt-2 h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <BookOpen className="h-4 w-4 text-green-500" />
                    <div className="text-2xl font-bold">
                      {knowledgeCollectionData.collection.length === 0 && knowledgeCollectionData.stats.totalObtained === 0 ? (
                        <div className="animate-pulse bg-gray-200 h-8 w-12 rounded mx-auto"></div>
                      ) : (
                        obtainedKnowledgeCards.length
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">獲得カード数</p>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* V2システムではカテゴリーフィルターは不要 */}

            {/* Knowledge Cards Collection */}
            <Tabs defaultValue="all" className="space-y-6">
              <TabsList className="grid grid-cols-1 md:grid-cols-3 h-auto">
                <TabsTrigger value="all" className="flex items-center space-x-2">
                  <Sparkles className="h-4 w-4" />
                  <span>全て ({filteredKnowledgeCards.length})</span>
                </TabsTrigger>
                <TabsTrigger value="obtained" className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4" />
                  <span>獲得済み ({obtainedKnowledgeCards.length})</span>
                </TabsTrigger>
                <TabsTrigger value="locked" className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>未獲得 ({lockedKnowledgeCards.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredKnowledgeCards.map(card => (
                    <KnowledgeCard 
                      key={card.theme_id} 
                      card={card} 
                      showDetails={true}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="obtained">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {obtainedKnowledgeCards.map(card => (
                    <KnowledgeCard 
                      key={card.theme_id} 
                      card={card} 
                      showDetails={true}
                    />
                  ))}
                </div>
                {obtainedKnowledgeCards.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>まだナレッジカードを獲得していません</p>
                    <p className="text-sm mt-2">学習コンテンツを完了してスキルカードを集めましょう！</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="locked">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {lockedKnowledgeCards.map(card => (
                    <KnowledgeCard 
                      key={card.theme_id} 
                      card={card} 
                      showDetails={false}
                    />
                  ))}
                </div>
                {lockedKnowledgeCards.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Crown className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
                    <p>おめでとうございます！</p>
                    <p className="text-sm mt-2">すべてのナレッジカードを獲得しました！</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* バッジ（修了証）タブ */}
          <TabsContent value="badges" className="space-y-6">
            {/* Badge Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    <span className="font-semibold">総修了証数</span>
                  </div>
                  <div className="text-2xl font-bold">
                    {badgeLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-8 rounded"></div>
                    ) : (
                      userBadges.length
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="h-5 w-5 text-green-500" />
                    <span className="font-semibold">有効な修了証</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {badgeLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-8 rounded"></div>
                    ) : (
                      activeBadges.length
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <Target className="h-5 w-5 text-gray-500" />
                    <span className="font-semibold">期限切れ</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-600">
                    {badgeLoading ? (
                      <div className="animate-pulse bg-gray-200 h-8 w-8 rounded"></div>
                    ) : (
                      expiredBadges.length
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Badge Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>フィルター</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedBadgeStatus} onValueChange={setSelectedBadgeStatus} className="w-full">
                  <TabsList className="grid grid-cols-1 md:grid-cols-3 h-auto">
                    <TabsTrigger value="all" className="flex items-center space-x-2">
                      <Sparkles className="h-4 w-4" />
                      <span>全て ({filteredBadges.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="active" className="flex items-center space-x-2">
                      <Trophy className="h-4 w-4" />
                      <span>有効 ({activeBadges.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="expired" className="flex items-center space-x-2">
                      <Target className="h-4 w-4" />
                      <span>期限切れ ({expiredBadges.length})</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                      {filteredBadges.map(badge => (
                        <Card key={badge.id} className={`relative overflow-hidden ${badge.isExpired ? 'opacity-70' : ''}`}>
                          <CardHeader className="text-center pb-3">
                            <div className="text-4xl mb-2">
                              {badge.badge.badgeImageUrl ? (
                                <div className="relative w-16 h-16 mx-auto">
                                  <Image 
                                    src={badge.badge.badgeImageUrl} 
                                    alt={badge.badge.title}
                                    width={64}
                                    height={64}
                                    className="object-contain"
                                    onError={() => {
                                      // 画像読み込み失敗時のフォールバック
                                      console.warn(`Failed to load badge image: ${badge.badge.badgeImageUrl}`);
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="text-4xl">
                                  🏆
                                </div>
                              )}
                            </div>
                            <CardTitle className="text-lg" style={{ color: badge.badge.color || '#FFD700' }}>
                              {badge.badge.title}
                            </CardTitle>
                            <div className="flex items-center justify-center space-x-2">
                              <Badge 
                                variant={badge.badge.difficulty === 'basic' ? 'default' : badge.badge.difficulty === 'intermediate' ? 'secondary' : 'destructive'}
                                style={{ backgroundColor: badge.badge.difficultyColor, color: 'white' }}
                              >
                                {badge.badge.difficultyName || badge.badge.difficulty}
                              </Badge>
                              {badge.isExpired && (
                                <Badge variant="outline" className="text-red-600 border-red-600">
                                  期限切れ
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">{badge.badge.description}</p>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>コース: {badge.courseName}</div>
                              <div>獲得日: {badge.earnedAt.toLocaleDateString('ja-JP')}</div>
                              {badge.expiresAt && (
                                <div className={badge.isExpired ? 'text-red-600' : ''}>
                                  有効期限: {badge.expiresAt.toLocaleDateString('ja-JP')}
                                </div>
                              )}
                            </div>
                            {badge.isExpired && (
                              <div className="absolute inset-0 bg-gray-900 bg-opacity-20 flex items-center justify-center">
                                <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold transform rotate-12">
                                  期限切れ
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {filteredBadges.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>修了証がありません</p>
                        <p className="text-sm mt-2">コースを完了して修了証を獲得しましょう！</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="active">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                      {activeBadges.map(badge => (
                        <Card key={badge.id} className="relative overflow-hidden">
                          <CardHeader className="text-center pb-3">
                            <div className="text-4xl mb-2">
                              {badge.badge.badgeImageUrl ? (
                                <div className="relative w-16 h-16 mx-auto">
                                  <Image 
                                    src={badge.badge.badgeImageUrl} 
                                    alt={badge.badge.title}
                                    width={64}
                                    height={64}
                                    className="object-contain"
                                    onError={() => {
                                      console.warn(`Failed to load badge image: ${badge.badge.badgeImageUrl}`);
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="text-4xl">
                                  🏆
                                </div>
                              )}
                            </div>
                            <CardTitle className="text-lg" style={{ color: badge.badge.color || '#FFD700' }}>
                              {badge.badge.title}
                            </CardTitle>
                            <Badge 
                              variant={badge.badge.difficulty === 'basic' ? 'default' : badge.badge.difficulty === 'intermediate' ? 'secondary' : 'destructive'}
                              style={{ backgroundColor: badge.badge.difficultyColor, color: 'white' }}
                            >
                              {badge.badge.difficultyName || badge.badge.difficulty}
                            </Badge>
                          </CardHeader>
                          <CardContent className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">{badge.badge.description}</p>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>コース: {badge.courseName}</div>
                              <div>獲得日: {badge.earnedAt.toLocaleDateString('ja-JP')}</div>
                              {badge.expiresAt && (
                                <div>有効期限: {badge.expiresAt.toLocaleDateString('ja-JP')}</div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {activeBadges.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>有効な修了証がありません</p>
                        <p className="text-sm mt-2">コースを完了して修了証を獲得しましょう！</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="expired">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                      {expiredBadges.map(badge => (
                        <Card key={badge.id} className="relative overflow-hidden opacity-70">
                          <CardHeader className="text-center pb-3">
                            <div className="text-4xl mb-2">
                              {badge.badge.badgeImageUrl ? (
                                <div className="relative w-16 h-16 mx-auto">
                                  <Image 
                                    src={badge.badge.badgeImageUrl} 
                                    alt={badge.badge.title}
                                    width={64}
                                    height={64}
                                    className="object-contain grayscale"
                                    onError={() => {
                                      console.warn(`Failed to load badge image: ${badge.badge.badgeImageUrl}`);
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="text-4xl">
                                  🏆
                                </div>
                              )}
                            </div>
                            <CardTitle className="text-lg" style={{ color: badge.badge.color || '#999999' }}>
                              {badge.badge.title}
                            </CardTitle>
                            <div className="flex items-center justify-center space-x-2">
                              <Badge 
                                variant={badge.badge.difficulty === 'basic' ? 'default' : badge.badge.difficulty === 'intermediate' ? 'secondary' : 'destructive'}
                                style={{ backgroundColor: badge.badge.difficultyColor, color: 'white' }}
                              >
                                {badge.badge.difficultyName || badge.badge.difficulty}
                              </Badge>
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                期限切れ
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="text-center space-y-2">
                            <p className="text-sm text-muted-foreground">{badge.badge.description}</p>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <div>コース: {badge.courseName}</div>
                              <div>獲得日: {badge.earnedAt.toLocaleDateString('ja-JP')}</div>
                              <div className="text-red-600">
                                有効期限: {badge.expiresAt?.toLocaleDateString('ja-JP')}
                              </div>
                            </div>
                            <div className="absolute inset-0 bg-gray-900 bg-opacity-20 flex items-center justify-center">
                              <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold transform rotate-12">
                                期限切れ
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {expiredBadges.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>期限切れの修了証はありません</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}