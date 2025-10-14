'use client'

import { useState, useEffect, useMemo } from 'react'
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
  TrendingUp,
  BookOpen,
  Brain
} from 'lucide-react'
import Header from '@/components/layout/Header'
import MobileNav from '@/components/layout/MobileNav'
import WisdomCard from '@/components/cards/WisdomCard'
import KnowledgeCard from '@/components/cards/KnowledgeCard'
import { useAuth } from '@/components/auth/AuthProvider'
import { wisdomCards, getCategoryDisplayName, WisdomCard as WisdomCardType } from '@/lib/cards'
import { 
  getUserWisdomCards, 
  getWisdomCardStats, 
  hasWisdomCard, 
  getWisdomCardCount,
  getUserKnowledgeCards,
  getKnowledgeCardStats,
  getCardNumericId,
  WisdomCardCollection,
  KnowledgeCardCollection
} from '@/lib/supabase-cards'
import { 
  KnowledgeCard as KnowledgeCardType
} from '@/lib/knowledge-cards'
import { getUserBadges } from '@/lib/supabase-badges'
import { UserBadge } from '@/lib/types/learning'

// Define constants outside component to avoid re-creation
const RARITIES = ['コモン', 'レア', 'エピック', 'レジェンダリー']

export default function CollectionPage() {
  // すべてのState Hooksを最初に宣言
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [selectedRarity, setSelectedRarity] = useState<string>('all')
  const [selectedWisdomCategory, setSelectedWisdomCategory] = useState<string>('all')
  const [selectedKnowledgeCategory, setSelectedKnowledgeCategory] = useState<string>('all')
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
    cardsWithStatus: wisdomCards.map(card => ({ ...card, obtained: false, count: 0 }))
  })
  const [wisdomDataLoading, setWisdomDataLoading] = useState(true)

  // ナレッジカードデータ（学習コンテンツから獲得） - Supabase版
  const [knowledgeCollectionData, setKnowledgeCollectionData] = useState<{
    collection: KnowledgeCardCollection[]
    stats: { totalObtained: number; totalCards: number; uniqueCards: number; totalReviews?: number }
    cardsWithStatus: Array<{ obtained: boolean; count: number; id: number; title: string; category: string; rarity: string; description: string; applicationArea: string }>
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

          // 次に各カードの取得状況を並列取得
          const cardsWithStatus = await Promise.all(
            wisdomCards.map(async (card) => {
              try {
                const [obtained, count] = await Promise.all([
                  hasWisdomCard(user.id, card.id),
                  getWisdomCardCount(user.id, card.id)
                ])
                return { ...card, obtained, count }
              } catch (error) {
                console.error(`Error loading card ${card.id}:`, error)
                return { ...card, obtained: false, count: 0 }
              }
            })
          )

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
          
          const [collection, stats] = await Promise.all([
            getUserKnowledgeCards(user.id),
            getKnowledgeCardStats(user.id)
          ])

          console.log(`📚 KNOWLEDGE CARD COLLECTION LOADED for user ${user?.id}:`, collection)
          console.log('📊 Knowledge card stats:', stats)
          console.log(`🔢 Total cards in collection: ${collection.length}`)
          
          if (collection.length > 0) {
            console.log('🎯 All card IDs in collection:', collection.map(c => ({ 
              card_id: c.card_id, 
              obtained_at: c.obtained_at,
              count: c.count 
            })))
            
            // Log which predefined cards match the obtained cards
            const predefinedCardIds = ['ai_basic_concepts_card', 'ai_business_applications_card', 'ai_limitations_ethics_card']
            predefinedCardIds.forEach(cardId => {
              const numericId = getCardNumericId(cardId)
              const hasCard = collection.some(c => c.card_id === numericId)
              console.log(`🔍 Card ${cardId} (${numericId}) obtained: ${hasCard}`)
            })
            
            // Debug localStorage knowledge cards
            if (typeof window !== 'undefined' && window.localStorage) {
              const localCardKeys = Object.keys(localStorage).filter(key => key.startsWith('knowledge_card_'))
              console.log(`💾 LocalStorage knowledge cards found: ${localCardKeys.length}`)
              localCardKeys.forEach(key => {
                const cardData = localStorage.getItem(key)
                if (cardData) {
                  try {
                    const parsed = JSON.parse(cardData)
                    console.log(`💾 LocalStorage card: ${key} →`, parsed)
                  } catch {
                    console.error(`❌ Failed to parse localStorage card: ${key}`)
                  }
                }
              })
            }
          }

          setKnowledgeCollectionData(prev => ({
            ...prev,
            collection,
            stats
          }))
        } catch (error) {
          console.error('❌ Error loading knowledge cards:', error)
        }
      }

      loadKnowledgeCards()
    }
  }, [user])

  // Knowledge card data processing
  const knowledgeCardsProcessed = useMemo(() => {
    
    // サンプルナレッジカードリスト
    const knowledgeCards: KnowledgeCardType[] = [
      {
        id: 'conclusion_first_card',
        title: '結論ファースト',
        summary: 'まず結論、その後に根拠という情報構造でコミュニケーションの効率を上げる手法',
        keyPoints: [
          'PREP法（Point・Reason・Example・Point）の活用',
          '聞き手の理解負荷を軽減',
          '説得力のあるプレゼンテーション'
        ],
        icon: '🎯',
        color: '#3B82F6',
        category: '論理的思考・分析',
        difficulty: 'beginner',
        source: {
          courseId: 'consulting_thinking_basics',
          genreId: 'thinking_foundation', 
          themeId: 'conclusion_first'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_conclusion_first')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_conclusion_first'))?.obtained_at
      },
      {
        id: 'mece_thinking_card',
        title: 'MECE思考',
        summary: '複雑な問題を「漏れなく重複なく」整理して全体像を把握する思考技術',
        keyPoints: [
          'Mutually Exclusive（重複なく）',
          'Collectively Exhaustive（漏れなく）',
          '問題の全体像把握と優先順位付け'
        ],
        icon: '📊',
        color: '#10B981',
        category: '論理的思考・分析',
        difficulty: 'beginner',
        source: {
          courseId: 'consulting_thinking_basics',
          genreId: 'thinking_foundation',
          themeId: 'mece_thinking'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_mece_thinking')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_mece_thinking'))?.obtained_at
      },
      {
        id: 'so_what_card',
        title: 'So What?/Why So?',
        summary: '情報の本質を見抜き、deeper insightを得るための質問技術',
        keyPoints: [
          'So What? - それで何が言えるのか？',
          'Why So? - なぜそうなるのか？',
          '論理の飛躍を防ぐ検証プロセス'
        ],
        icon: '❓',
        color: '#F59E0B',
        category: '論理的思考・分析',
        difficulty: 'intermediate',
        source: {
          courseId: 'consulting_thinking_basics',
          genreId: 'thinking_foundation',
          themeId: 'so_what_why_so'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_so_what_why_so')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_so_what_why_so'))?.obtained_at
      },
      {
        id: 'logical_tree_card',
        title: 'ロジックツリー',
        summary: '問題を階層的に分解し、根本原因を特定する構造化思考ツール',
        keyPoints: [
          'イシューツリーとソリューションツリーの使い分け',
          'Why型とHow型の論理展開',
          '原因分析と対策立案の体系化'
        ],
        icon: '🌳',
        color: '#8B5CF6',
        category: '論理的思考・分析',
        difficulty: 'intermediate',
        source: {
          courseId: 'consulting_thinking_basics',
          genreId: 'thinking_foundation',
          themeId: 'logical_tree'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_logical_tree')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_logical_tree'))?.obtained_at
      },
      {
        id: 'hypothesis_thinking_card',
        title: '仮説思考',
        summary: '限られた情報から最も可能性の高い答えを設定し、効率的に検証する思考法',
        keyPoints: [
          '仮説設定→検証→修正のサイクル',
          'So What?による本質的課題の抽出',
          '情報収集の効率化と意思決定スピード向上'
        ],
        icon: '💡',
        color: '#F59E0B',
        category: '問題解決・思考法',
        difficulty: 'intermediate',
        source: {
          courseId: 'consulting_thinking_basics',
          genreId: 'problem_solving',
          themeId: 'hypothesis_thinking'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_hypothesis_thinking')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_hypothesis_thinking'))?.obtained_at
      },
      {
        id: '3c_analysis_card',
        title: '3C分析',
        summary: 'Customer（顧客）・Competitor（競合）・Company（自社）の3つの視点から事業環境を分析',
        keyPoints: [
          '顧客ニーズと市場動向の把握',
          '競合他社の戦略と強み弱みの分析',
          '自社の能力と資源の客観的評価'
        ],
        icon: '🎪',
        color: '#3B82F6',
        category: '事業戦略・企画',
        difficulty: 'intermediate',
        source: {
          courseId: 'consulting_thinking_basics',
          genreId: 'framework_application',
          themeId: '3c_analysis'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_3c_analysis')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_3c_analysis'))?.obtained_at
      },
      {
        id: 'market_analysis_card',
        title: '市場分析フレームワーク',
        summary: '3C分析、5Forces、SWOT分析を組み合わせた包括的な事業環境分析手法',
        keyPoints: [
          '顧客・競合・自社の3C分析',
          'ポーターの5Forces による業界構造分析',
          'SWOT分析による戦略オプション抽出'
        ],
        icon: '📈',
        color: '#EF4444',
        category: '事業戦略・企画',
        difficulty: 'advanced',
        source: {
          courseId: 'business_strategy_basics',
          genreId: 'strategy_analysis',
          themeId: 'market_analysis'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_market_analysis')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_market_analysis'))?.obtained_at
      },
      {
        id: 'value_chain_card',
        title: 'バリューチェーン分析',
        summary: '企業の価値創造プロセスを主活動と支援活動に分解し、競争優位性を特定',
        keyPoints: [
          '主活動（調達→製造→販売→サービス）の分析',
          '支援活動（技術・人事・インフラ）の役割理解',
          'コスト優位性と差別化要因の特定'
        ],
        icon: '⛓️',
        color: '#06B6D4',
        category: '事業戦略・企画',
        difficulty: 'advanced',
        source: {
          courseId: 'business_strategy_basics',
          genreId: 'strategy_analysis',
          themeId: 'value_chain'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_value_chain')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_value_chain'))?.obtained_at
      },
      {
        id: 'communication_basics_card',
        title: 'ビジネスコミュニケーション基礎',
        summary: '相手の立場を理解し、明確で効果的なメッセージを伝える技術',
        keyPoints: [
          'アクティブリスニングとエンパシー',
          'ノンバーバル・コミュニケーションの活用',
          '相手に応じたコミュニケーションスタイルの調整'
        ],
        icon: '💬',
        color: '#84CC16',
        category: 'コミュニケーション・対人関係',
        difficulty: 'beginner',
        source: {
          courseId: 'communication_skills',
          genreId: 'basic_communication',
          themeId: 'communication_basics'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_communication_basics')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_communication_basics'))?.obtained_at
      },
      {
        id: 'presentation_structure_card',
        title: 'プレゼンテーション構成法',
        summary: '聴衆を引き込み、メッセージを確実に伝える構造化プレゼンテーション技術',
        keyPoints: [
          'ピラミッド構造による論理展開',
          'ストーリーテリングの活用',
          '視覚的資料とスピーチの連携'
        ],
        icon: '🎤',
        color: '#A855F7',
        category: 'プレゼンテーション・提案',
        difficulty: 'intermediate',
        source: {
          courseId: 'presentation_skills',
          genreId: 'advanced_presentation',
          themeId: 'presentation_structure'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_presentation_structure')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_presentation_structure'))?.obtained_at
      },
      {
        id: 'data_visualization_card',
        title: 'データ可視化の原則',
        summary: '数字と事実を効果的なグラフィック表現で伝える技術',
        keyPoints: [
          'チャートタイプの適切な選択',
          'カラーパレットと視認性の最適化',
          'ストーリーを伝えるデザイン思考'
        ],
        icon: '📊',
        color: '#F97316',
        category: 'データ分析・可視化',
        difficulty: 'intermediate',
        source: {
          courseId: 'data_analysis_skills',
          genreId: 'visualization',
          themeId: 'data_visualization'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_data_visualization')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_data_visualization'))?.obtained_at
      },
      {
        id: 'project_management_card',
        title: 'プロジェクトマネジメント基礎',
        summary: '期限・予算・品質を管理し、プロジェクトを成功に導く体系的手法',
        keyPoints: [
          'WBS（Work Breakdown Structure）による作業分解',
          'クリティカルパス法によるスケジュール管理',
          'ステークホルダー・コミュニケーション'
        ],
        icon: '📋',
        color: '#14B8A6',
        category: 'プロジェクトマネジメント',
        difficulty: 'intermediate',
        source: {
          courseId: 'project_management',
          genreId: 'pm_basics',
          themeId: 'project_fundamentals'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_project_fundamentals')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_project_fundamentals'))?.obtained_at
      },
      // マーケティング実践コース
      {
        id: 'customer_journey_card',
        title: 'カスタマージャーニーマップ',
        summary: '顧客の購買プロセス全体を可視化し、各段階での課題と機会を特定する手法',
        keyPoints: [
          '認知→検討→購入→利用→推奨の各段階分析',
          'タッチポイントと感情の変化を可視化',
          '改善機会の優先順位付け'
        ],
        icon: '🗺️',
        color: '#3B82F6',
        category: 'マーケティング・営業',
        difficulty: 'intermediate',
        source: {
          courseId: 'marketing_practice',
          genreId: 'customer_understanding',
          themeId: 'customer_journey_mapping'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_customer_journey_mapping')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_customer_journey_mapping'))?.obtained_at
      },
      {
        id: 'persona_card',
        title: 'ペルソナ開発',
        summary: '定量・定性データを統合し、マーケティング戦略の核となる具体的な顧客像を構築',
        keyPoints: [
          'デモグラフィック＋心理的特性の統合',
          '実データに基づく仮説構築',
          'チーム内での顧客認識統一'
        ],
        icon: '👤',
        color: '#10B981',
        category: 'マーケティング・営業',
        difficulty: 'intermediate',
        source: {
          courseId: 'marketing_practice',
          genreId: 'customer_understanding',
          themeId: 'persona_development'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_persona_development')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_persona_development'))?.obtained_at
      },
      {
        id: 'segmentation_card',
        title: '市場セグメンテーション',
        summary: '多様な顧客を意味のある塊に分類し、最適なターゲティング戦略を構築',
        keyPoints: [
          'セグメンテーション軸の戦略的選択',
          'セグメント評価とターゲット選定',
          'セグメント別アプローチの最適化'
        ],
        icon: '🎯',
        color: '#F59E0B',
        category: 'マーケティング・営業',
        difficulty: 'intermediate',
        source: {
          courseId: 'marketing_practice',
          genreId: 'customer_understanding',
          themeId: 'market_segmentation'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_market_segmentation')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_market_segmentation'))?.obtained_at
      },
      {
        id: 'content_marketing_card',
        title: 'コンテンツマーケティング',
        summary: '顧客の課題解決に役立つ価値あるコンテンツを通じて信頼関係を構築し、ビジネス成果につなげる手法',
        keyPoints: [
          '顧客価値優先のコンテンツ設計',
          'カスタマージャーニーに応じた配信戦略',
          '効果測定と継続改善'
        ],
        icon: '📝',
        color: '#10B981',
        category: 'マーケティング・営業',
        difficulty: 'intermediate',
        source: {
          courseId: 'marketing_practice',
          genreId: 'digital_marketing',
          themeId: 'content_marketing'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_content_marketing')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_content_marketing'))?.obtained_at
      },
      {
        id: 'social_media_card',
        title: 'ソーシャルメディアマーケティング',
        summary: 'SNSプラットフォームの特性を活かし、顧客との双方向コミュニケーションを通じてブランド価値を向上させる手法',
        keyPoints: [
          'プラットフォーム別の最適化戦略',
          'コミュニティ構築とエンゲージメント',
          'インフルエンサー・UGC活用'
        ],
        icon: '📱',
        color: '#8B5CF6',
        category: 'マーケティング・営業',
        difficulty: 'intermediate',
        source: {
          courseId: 'marketing_practice',
          genreId: 'digital_marketing',
          themeId: 'social_media_marketing'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_social_media_marketing')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_social_media_marketing'))?.obtained_at
      },
      // AI活用リテラシー基礎コースのカード
      {
        id: 'ai_basic_concepts_card',
        title: 'AI基本概念',
        summary: 'AIの定義から機械学習、ディープラーニングまで、基本概念を理解',
        keyPoints: [
          'AI・機械学習・ディープラーニングの違い',
          'AIの得意分野と限界の理解',
          'ビジネスでのAI活用事例'
        ],
        icon: '🤖',
        color: '#7C3AED',
        category: 'AI・デジタル活用',
        difficulty: 'beginner',
        source: {
          courseId: 'ai_literacy_fundamentals',
          genreId: 'ai_fundamentals',
          themeId: 'ai_basic_concepts'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_ai_basic_concepts')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_ai_basic_concepts'))?.obtained_at
      },
      {
        id: 'ai_business_applications_card',
        title: 'AIビジネス活用',
        summary: '様々な業界でのAI活用事例と導入成功の鍵を理解',
        keyPoints: [
          '金融・小売・製造・医療での具体的活用例',
          'AI導入の成功要因と課題',
          'ROI設計と段階的導入アプローチ'
        ],
        icon: '💼',
        color: '#10B981',
        category: 'AI・デジタル活用',
        difficulty: 'beginner',
        source: {
          courseId: 'ai_literacy_fundamentals',
          genreId: 'ai_fundamentals',
          themeId: 'ai_business_applications'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_ai_business_applications')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_ai_business_applications'))?.obtained_at
      },
      {
        id: 'ai_limitations_ethics_card',
        title: 'AI倫理とリスク管理',
        summary: 'AIの限界を理解し、倫理的配慮とリスク管理の重要性を学習',
        keyPoints: [
          'AIの技術的限界とデータ依存性',
          'バイアス・プライバシー・透明性の課題',
          '責任あるAI活用のガイドライン'
        ],
        icon: '⚖️',
        color: '#EF4444',
        category: 'AI・デジタル活用',
        difficulty: 'beginner',
        source: {
          courseId: 'ai_literacy_fundamentals',
          genreId: 'ai_fundamentals',
          themeId: 'ai_limitations_ethics'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_ai_limitations_ethics')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_ai_limitations_ethics'))?.obtained_at
      },
      {
        id: 'prompt_basics_card',
        title: 'プロンプト基礎',
        summary: '明確で具体的なプロンプト設計により、生成AIから期待する回答を得る技術',
        keyPoints: [
          '明確性・具体性・文脈情報の提供',
          'ロールプレイとサンプル出力の活用',
          '段階的プロンプト改善手法'
        ],
        icon: '📝',
        color: '#059669',
        category: 'AI・デジタル活用',
        difficulty: 'beginner',
        source: {
          courseId: 'ai_literacy_fundamentals',
          genreId: 'prompt_engineering',
          themeId: 'prompt_basics'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_prompt_basics')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_prompt_basics'))?.obtained_at
      },
      {
        id: 'workflow_integration_card',
        title: 'AIワークフロー設計',
        summary: '既存の業務プロセスにAIを効果的に組み込み、生産性向上を実現する設計技術',
        keyPoints: [
          '業務プロセスの分析と改善点特定',
          'AIツールの適材適所での活用',
          '人とAIの役割分担設計'
        ],
        icon: '⚙️',
        color: '#DC2626',
        category: 'AI・デジタル活用',
        difficulty: 'intermediate',
        source: {
          courseId: 'ai_literacy_fundamentals',
          genreId: 'business_practice',
          themeId: 'ai_workflow_integration'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_ai_workflow_integration')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_ai_workflow_integration'))?.obtained_at
      },
      {
        id: 'ai_evaluation_card',
        title: 'AI成果評価',
        summary: 'AI導入の効果を適切に測定し、継続的な改善につなげる評価技術',
        keyPoints: [
          '定量・定性の両面での効果測定',
          'ROI・生産性向上指標の設定',
          '倫理・法的リスクの管理'
        ],
        icon: '📊',
        color: '#7C2D12',
        category: 'AI・デジタル活用',
        difficulty: 'advanced',
        source: {
          courseId: 'ai_literacy_fundamentals',
          genreId: 'evaluation_ethics',
          themeId: 'ai_performance_evaluation'
        },
        obtained: knowledgeCollectionData.collection.some(c => c.card_id === getCardNumericId('theme_ai_performance_evaluation')),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id === getCardNumericId('theme_ai_performance_evaluation'))?.obtained_at
      }
    ]
    
    console.log('🂯 Total knowledge cards defined:', knowledgeCards.length)
    console.log('🔄 AI course cards available:', knowledgeCards.filter(card => 
      card.source?.courseId === 'ai_literacy_fundamentals'
    ).map(card => ({ id: card.id, title: card.title, obtained: card.obtained })))
    
    console.log('🔍 Card ID mapping check:')
    knowledgeCards.slice(0, 3).forEach(card => {
      const numericId = getCardNumericId(card.id)
      const isObtained = knowledgeCollectionData.collection.some(c => c.card_id === numericId)
      console.log(`  Card: ${card.id} -> Numeric: ${numericId} -> Obtained: ${isObtained}`)
    })
    
    return {
      collection: knowledgeCollectionData.collection,
      stats: knowledgeCollectionData.stats,
      cardsWithStatus: knowledgeCards
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

  // ナレッジカード用フィルタリング
  const filteredKnowledgeCards = useMemo(() => {
    return knowledgeCardsProcessed.cardsWithStatus.filter(card => {
      const categoryMatch = selectedKnowledgeCategory === 'all' || card.category === selectedKnowledgeCategory
      return categoryMatch
    })
  }, [knowledgeCardsProcessed.cardsWithStatus, selectedKnowledgeCategory])

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
  
  // ナレッジカードのカテゴリー（全カテゴリーを定義）
  const knowledgeCategories = [
    '論理的思考・分析',
    '問題解決・思考法', 
    '事業戦略・企画',
    'コミュニケーション・対人関係',
    'プレゼンテーション・提案',
    'データ分析・可視化',
    'プロジェクトマネジメント',
    'チームマネジメント',
    'マーケティング・営業',
    'ファイナンス・会計'
  ]

  const rarityStats = useMemo(() => {
    return RARITIES.map(rarity => {
      const totalInRarity = wisdomCards.filter(card => card.rarity === rarity).length
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

  const wisdomCollectionRate = wisdomDataLoading ? 0 : Math.round((wisdomCollectionData.stats.uniqueCards / wisdomCards.length) * 100)
  const knowledgeCollectionRate = knowledgeCollectionData.cardsWithStatus.length > 0 
    ? Math.round((obtainedKnowledgeCards.length / knowledgeCollectionData.cardsWithStatus.length) * 100)
    : 0

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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <p className="text-xs text-muted-foreground">獲得カード数</p>
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
                    <p className="text-xs text-muted-foreground">総コレクション</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <div className="text-2xl font-bold">
                      {rarityStats.filter(r => r.obtained > 0).length}
                    </div>
                    <p className="text-xs text-muted-foreground">レア度制覇</p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="h-4 w-4 text-blue-500" />
                    <div className="text-2xl font-bold">
                      {knowledgeCollectionData.collection.length === 0 && knowledgeCollectionData.stats.totalObtained === 0 ? (
                        <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                      ) : (
                        `${knowledgeCollectionRate}%`
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">習得率</p>
                  <Progress value={knowledgeCollectionRate} className="mt-2 h-2" />
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
                    <p className="text-xs text-muted-foreground">獲得スキル数</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <Star className="h-4 w-4 text-purple-500" />
                    <div className="text-2xl font-bold">
                      {knowledgeCollectionData.collection.length === 0 && knowledgeCollectionData.stats.totalObtained === 0 ? (
                        <div className="animate-pulse bg-gray-200 h-8 w-12 rounded mx-auto"></div>
                      ) : (
                        knowledgeCollectionData.stats.totalReviews || 0
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">復習回数</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Knowledge Card Category Filter */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">メインカテゴリ</label>
                    <select
                      value={selectedKnowledgeCategory}
                      onChange={(e) => setSelectedKnowledgeCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    >
                      <option value="all">全てのメインカテゴリ</option>
                      {knowledgeCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                      key={card.id} 
                      card={card} 
                      showDetails={card.obtained}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="obtained">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {obtainedKnowledgeCards.map(card => (
                    <KnowledgeCard 
                      key={card.id} 
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
                      key={card.id} 
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <Star className="h-5 w-5 text-purple-500" />
                    <span className="font-semibold">完了率</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">
                    {badgeLoading ? (
                      <div className="animate-pulse bg-gray-200 h-12 w-12 rounded"></div>
                    ) : (
                      `${userBadges.length > 0 ? Math.round((activeBadges.length / userBadges.length) * 100) : 0}%`
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
                            <div className="text-4xl mb-2">🏆</div>
                            <CardTitle className="text-lg">{badge.badge.title}</CardTitle>
                            <div className="flex items-center justify-center space-x-2">
                              <Badge variant={badge.badge.difficulty === 'basic' ? 'default' : badge.badge.difficulty === 'intermediate' ? 'secondary' : 'destructive'}>
                                {badge.badge.difficulty === 'basic' ? '初級' : badge.badge.difficulty === 'intermediate' ? '中級' : '上級'}
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
                            <div className="text-4xl mb-2">🏆</div>
                            <CardTitle className="text-lg">{badge.badge.title}</CardTitle>
                            <Badge variant={badge.badge.difficulty === 'basic' ? 'default' : badge.badge.difficulty === 'intermediate' ? 'secondary' : 'destructive'}>
                              {badge.badge.difficulty === 'basic' ? '初級' : badge.badge.difficulty === 'intermediate' ? '中級' : '上級'}
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
                            <div className="text-4xl mb-2">🏆</div>
                            <CardTitle className="text-lg">{badge.badge.title}</CardTitle>
                            <div className="flex items-center justify-center space-x-2">
                              <Badge variant={badge.badge.difficulty === 'basic' ? 'default' : badge.badge.difficulty === 'intermediate' ? 'secondary' : 'destructive'}>
                                {badge.badge.difficulty === 'basic' ? '初級' : badge.badge.difficulty === 'intermediate' ? '中級' : '上級'}
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