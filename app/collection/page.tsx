'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import PageHeader from '@/components/layout/PageHeader'
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
import AppShell from '@/components/layout/AppShell'
import WisdomCard from '@/components/cards/WisdomCard'
import KnowledgeCard from '@/components/cards/KnowledgeCard'
import CourseFilterCombobox from '@/components/ui/course-filter-combobox'
import { useAuth } from '@/components/auth/AuthProvider'
import { getCategoryDisplayName, WisdomCard as WisdomCardType } from '@/lib/cards'
import { getUserBadges } from '@/lib/supabase-badges'
import { UserBadge } from '@/lib/types/learning'
import { useOfflineDB } from '@/lib/offline/provider'
import { loadCollectionData, WisdomCardWithStatus, KnowledgeCardWithStatus } from '@/lib/offline/queries/collection'

// Define constants outside component to avoid re-creation
const RARITIES = ['コモン', 'レア', 'エピック', 'レジェンダリー']

export default function CollectionPage() {
  // すべてのState Hooksを最初に宣言
  const [selectedRarity, setSelectedRarity] = useState<string>('all')
  const [selectedWisdomCategory, setSelectedWisdomCategory] = useState<string>('all')
  const [selectedKnowledgeCourse, setSelectedKnowledgeCourse] = useState<string>('all')
  const [selectedBadgeStatus, setSelectedBadgeStatus] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('wisdom')
  const { user } = useAuth()
  const { database } = useOfflineDB()

  // 格言カードデータ
  const [wisdomCollectionData, setWisdomCollectionData] = useState<{
    stats: { totalObtained: number; totalCards: number; uniqueCards: number }
    cardsWithStatus: WisdomCardWithStatus[]
  }>({
    stats: { totalObtained: 0, totalCards: 0, uniqueCards: 0 },
    cardsWithStatus: []
  })
  const [wisdomDataLoading, setWisdomDataLoading] = useState(true)

  // サブカテゴリーマスターデータ（subcategory_id → 日本語名の変換用）
  const [subcategories, setSubcategories] = useState<Array<{subcategory_id: string, name: string}>>([])

  // ナレッジカードデータ（学習コンテンツから獲得）
  const [knowledgeCollectionData, setKnowledgeCollectionData] = useState<{
    stats: { totalObtained: number; totalCards: number; uniqueCards: number }
    cardsWithStatus: KnowledgeCardWithStatus[]
  }>({
    stats: { totalObtained: 0, totalCards: 0, uniqueCards: 0 },
    cardsWithStatus: []
  })

  // バッジデータ
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [badgeLoading, setBadgeLoading] = useState(true)
  const [failedBadgeImages, setFailedBadgeImages] = useState<Set<string>>(new Set())

  // コレクションデータ一括読み込み（ローカルDB優先、N+1解消）
  useEffect(() => {
    if (user?.id) {
      const loadAllCards = async () => {
        try {
          setWisdomDataLoading(true)
          const data = await loadCollectionData(user.id, database)

          setSubcategories(data.subcategories)
          setWisdomCollectionData({
            stats: data.wisdomCards.stats,
            cardsWithStatus: data.wisdomCards.cardsWithStatus,
          })
          setKnowledgeCollectionData({
            stats: data.knowledgeCards.stats,
            cardsWithStatus: data.knowledgeCards.cardsWithStatus,
          })
        } catch (error) {
          console.error('Error loading collection data:', error)
        } finally {
          setWisdomDataLoading(false)
        }
      }

      loadAllCards()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

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

  // 格言カード用フィルタリング
  const filteredWisdomCards = useMemo(() => {
    return wisdomCollectionData.cardsWithStatus.filter(card => {
      const rarityMatch = selectedRarity === 'all' || card.rarity === selectedRarity
      const categoryMatch = selectedWisdomCategory === 'all' || card.categoryId === selectedWisdomCategory
      return rarityMatch && categoryMatch
    })
  }, [wisdomCollectionData.cardsWithStatus, selectedRarity, selectedWisdomCategory])

  // ナレッジカード：コース一覧を抽出（表示順でソート）
  const knowledgeCourses = useMemo(() => {
    const courseMap = new Map<string, { id: string; title: string; order: number }>()
    for (const card of knowledgeCollectionData.cardsWithStatus) {
      if (card.course_id && card.course_title && !courseMap.has(card.course_id)) {
        courseMap.set(card.course_id, {
          id: card.course_id,
          title: card.course_title,
          order: card.display_order?.course ?? 999,
        })
      }
    }
    return Array.from(courseMap.values()).sort((a, b) => a.order - b.order)
  }, [knowledgeCollectionData.cardsWithStatus])

  // ナレッジカード用フィルタリング
  const filteredKnowledgeCards = useMemo(() => {
    if (selectedKnowledgeCourse === 'all') {
      return knowledgeCollectionData.cardsWithStatus
    }
    return knowledgeCollectionData.cardsWithStatus.filter(
      card => card.course_id === selectedKnowledgeCourse
    )
  }, [knowledgeCollectionData.cardsWithStatus, selectedKnowledgeCourse])

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
      <AppShell>
        <div className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <p>ログインが必要です</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <PageHeader
            icon={Bookmark}
            title="カードコレクション"
            description="学習の成果として手に入れた知恵とスキル"
          />
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
                      card={card as unknown as WisdomCardType & { obtained?: boolean; count?: number }}
                      showDetails={true}
                      subcategories={subcategories}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="obtained">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {obtainedWisdomCards.map(card => (
                    <WisdomCard
                      key={card.id}
                      card={card as unknown as WisdomCardType & { obtained?: boolean; count?: number }}
                      showDetails={true}
                      subcategories={subcategories}
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
                      card={card as unknown as WisdomCardType & { obtained?: boolean; count?: number }}
                      showDetails={false}
                      subcategories={subcategories}
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
                      {knowledgeCollectionData.cardsWithStatus.length === 0 && knowledgeCollectionData.stats.totalObtained === 0 ? (
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
                      {knowledgeCollectionData.cardsWithStatus.length === 0 && knowledgeCollectionData.stats.totalObtained === 0 ? (
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

            {/* コースフィルター（PC: Popover / モバイル: ボトムシート） */}
            {knowledgeCourses.length > 1 && (
              <CourseFilterCombobox
                courses={knowledgeCourses}
                value={selectedKnowledgeCourse}
                onValueChange={setSelectedKnowledgeCourse}
              />
            )}

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
                        <Card key={badge.id} className={`relative overflow-hidden ${badge.isExpired ? 'opacity-60' : ''}`}>
                          <CardHeader className="text-center pb-3">
                            <div className="text-4xl mb-2">
                              {badge.badge.badgeImageUrl && !failedBadgeImages.has(badge.badge.badgeImageUrl) ? (
                                <div className="relative w-16 h-16 mx-auto">
                                  <Image
                                    src={badge.badge.badgeImageUrl}
                                    alt={badge.badge.title}
                                    width={64}
                                    height={64}
                                    className="object-contain"
                                    onError={() => {
                                      setFailedBadgeImages(prev => new Set(prev).add(badge.badge.badgeImageUrl!))
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
                              <div className="absolute top-2 right-2">
                                <Badge variant="outline" className="text-red-600 border-red-600 bg-white">
                                  期限切れ
                                </Badge>
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
                              {badge.badge.badgeImageUrl && !failedBadgeImages.has(badge.badge.badgeImageUrl) ? (
                                <div className="relative w-16 h-16 mx-auto">
                                  <Image
                                    src={badge.badge.badgeImageUrl}
                                    alt={badge.badge.title}
                                    width={64}
                                    height={64}
                                    className="object-contain"
                                    onError={() => {
                                      setFailedBadgeImages(prev => new Set(prev).add(badge.badge.badgeImageUrl!))
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
                        <Card key={badge.id} className="relative overflow-hidden opacity-60">
                          <CardHeader className="text-center pb-3">
                            <div className="text-4xl mb-2">
                              {badge.badge.badgeImageUrl && !failedBadgeImages.has(badge.badge.badgeImageUrl) ? (
                                <div className="relative w-16 h-16 mx-auto">
                                  <Image
                                    src={badge.badge.badgeImageUrl}
                                    alt={badge.badge.title}
                                    width={64}
                                    height={64}
                                    className="object-contain"
                                    onError={() => {
                                      setFailedBadgeImages(prev => new Set(prev).add(badge.badge.badgeImageUrl!))
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
                            <div className="absolute top-2 right-2">
                              <Badge variant="outline" className="text-red-600 border-red-600 bg-white">
                                期限切れ
                              </Badge>
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
      </div>
    </AppShell>
  )
}