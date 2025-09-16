'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bookmark, 
  Trophy, 
  Sparkles, 
  Filter,
  Search,
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
import { wisdomCards, getCategoryDisplayName } from '@/lib/cards'
import { 
  getUserWisdomCards, 
  getWisdomCardStats, 
  hasWisdomCard, 
  getWisdomCardCount,
  getUserKnowledgeCards,
  getKnowledgeCardStats,
  hasKnowledgeCard,
  getKnowledgeCardCount
} from '@/lib/supabase-cards'
import { 
  KnowledgeCard as KnowledgeCardType
} from '@/lib/knowledge-cards'

export default function CollectionPage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [selectedRarity, setSelectedRarity] = useState<string>('all')
  const [selectedWisdomCategory, setSelectedWisdomCategory] = useState<string>('all')
  const [selectedKnowledgeCategory, setSelectedKnowledgeCategory] = useState<string>('all')
  const [activeTab, setActiveTab] = useState('wisdom')
  const { user, loading } = useAuth()

  // 認証ガード
  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>ログインが必要です</div>
  }

  // 格言カード（従来のカード）データ - Supabase版
  const [wisdomCollectionData, setWisdomCollectionData] = useState({
    collection: [],
    stats: { totalObtained: 0, totalCards: 0, uniqueCards: 0 },
    cardsWithStatus: wisdomCards.map(card => ({ ...card, obtained: false, count: 0 }))
  })

  useEffect(() => {
    if (user?.id) {
      const loadWisdomCards = async () => {
        try {
          const [collection, stats] = await Promise.all([
            getUserWisdomCards(user.id),
            getWisdomCardStats(user.id)
          ])

          const cardsWithStatus = await Promise.all(
            wisdomCards.map(async (card) => ({
              ...card,
              obtained: await hasWisdomCard(user.id, card.id),
              count: await getWisdomCardCount(user.id, card.id)
            }))
          )

          setWisdomCollectionData({
            collection,
            stats,
            cardsWithStatus
          })
        } catch (error) {
          console.error('Error loading wisdom cards:', error)
        }
      }

      loadWisdomCards()
    }
  }, [user])

  // ナレッジカードデータ（学習コンテンツから獲得） - Supabase版
  const [knowledgeCollectionData, setKnowledgeCollectionData] = useState({
    collection: [],
    stats: { totalObtained: 0, totalCards: 0, uniqueCards: 0 },
    cardsWithStatus: []
  })

  useEffect(() => {
    if (user?.id) {
      const loadKnowledgeCards = async () => {
        try {
          const [collection, stats] = await Promise.all([
            getUserKnowledgeCards(user.id),
            getKnowledgeCardStats(user.id)
          ])

          console.log(`📚 KNOWLEDGE CARD COLLECTION LOADED for user ${user?.id}:`, collection)
          console.log('📊 Knowledge card stats:', stats)

          setKnowledgeCollectionData(prev => ({
            ...prev,
            collection,
            stats
          }))
        } catch (error) {
          console.error('Error loading knowledge cards:', error)
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'conclusion_first_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'conclusion_first_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'mece_thinking_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'mece_thinking_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'so_what_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'so_what_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'logical_tree_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'logical_tree_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'hypothesis_thinking_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'hypothesis_thinking_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === '3c_analysis_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === '3c_analysis_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'market_analysis_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'market_analysis_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'value_chain_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'value_chain_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'communication_basics_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'communication_basics_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'presentation_structure_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'presentation_structure_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'data_visualization_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'data_visualization_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'project_management_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'project_management_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'customer_journey_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'customer_journey_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'persona_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'persona_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'segmentation_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'segmentation_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'content_marketing_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'content_marketing_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'social_media_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'social_media_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'ai_basic_concepts_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'ai_basic_concepts_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'prompt_basics_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'prompt_basics_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'workflow_integration_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'workflow_integration_card')?.obtained_at
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
        obtained: knowledgeCollectionData.collection.some(c => c.card_id.toString() === 'ai_evaluation_card'),
        obtainedAt: knowledgeCollectionData.collection.find(c => c.card_id.toString() === 'ai_evaluation_card')?.obtained_at
      }
    ]
    
    console.log('🂯 Total knowledge cards defined:', knowledgeCards.length)
    console.log('🔄 AI course cards available:', knowledgeCards.filter(card => 
      card.source?.courseId === 'ai_literacy_fundamentals'
    ).map(card => ({ id: card.id, title: card.title, obtained: card.obtained })))
    
    return {
      collection: knowledgeCollectionData.collection,
      stats: knowledgeCollectionData.stats,
      cardsWithStatus: knowledgeCards
    }
  }, [user, knowledgeCollectionData])

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
    return knowledgeCollectionData.cardsWithStatus.filter(card => {
      const categoryMatch = selectedKnowledgeCategory === 'all' || card.category === selectedKnowledgeCategory
      return categoryMatch
    })
  }, [knowledgeCollectionData.cardsWithStatus, selectedKnowledgeCategory])

  const obtainedWisdomCards = filteredWisdomCards.filter(card => card.obtained)
  const lockedWisdomCards = filteredWisdomCards.filter(card => !card.obtained)
  const obtainedKnowledgeCards = filteredKnowledgeCards.filter(card => card.obtained)
  const lockedKnowledgeCards = filteredKnowledgeCards.filter(card => !card.obtained)

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
  const rarities = ['コモン', 'レア', 'エピック', 'レジェンダリー']

  const rarityStats = useMemo(() => {
    return rarities.map(rarity => {
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

  const wisdomCollectionRate = Math.round((wisdomCollectionData.stats.uniqueCards / wisdomCards.length) * 100)
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
            <h1 className="text-3xl font-bold flex items-center space-x-2">
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
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="wisdom" className="flex items-center space-x-2">
              <Crown className="h-4 w-4" />
              <span>格言カード</span>
              <Badge variant="secondary" className="ml-2">
                {obtainedWisdomCards.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="knowledge" className="flex items-center space-x-2">
              <Brain className="h-4 w-4" />
              <span>ナレッジカード</span>
              <Badge variant="secondary" className="ml-2">
                {obtainedKnowledgeCards.length}
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
                    <div className="text-2xl font-bold">{wisdomCollectionRate}%</div>
                  </div>
                  <p className="text-xs text-muted-foreground">コレクション率</p>
                  <Progress value={wisdomCollectionRate} className="mt-2 h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <div className="text-2xl font-bold">{wisdomCollectionData.stats.uniqueCards}</div>
                    <p className="text-xs text-muted-foreground">獲得カード数</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <Star className="h-4 w-4 text-blue-500" />
                    <div className="text-2xl font-bold">{wisdomCollectionData.stats.totalCards}</div>
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
                      {rarities.map(rarity => (
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
                  <span>全て ({filteredWisdomCards.length})</span>
                </TabsTrigger>
                <TabsTrigger value="obtained" className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4" />
                  <span>獲得済み ({obtainedWisdomCards.length})</span>
                </TabsTrigger>
                <TabsTrigger value="locked" className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>未獲得 ({lockedWisdomCards.length})</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredWisdomCards.map(card => (
                    <WisdomCard 
                      key={card.id} 
                      card={card} 
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
                      card={card} 
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
                      card={card} 
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
                    <div className="text-2xl font-bold">{knowledgeCollectionRate}%</div>
                  </div>
                  <p className="text-xs text-muted-foreground">習得率</p>
                  <Progress value={knowledgeCollectionRate} className="mt-2 h-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <BookOpen className="h-4 w-4 text-green-500" />
                    <div className="text-2xl font-bold">{obtainedKnowledgeCards.length}</div>
                    <p className="text-xs text-muted-foreground">獲得スキル数</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="flex flex-col items-center space-y-1">
                    <Star className="h-4 w-4 text-purple-500" />
                    <div className="text-2xl font-bold">{knowledgeCollectionData.stats.totalReviews}</div>
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
        </Tabs>
      </main>
    </div>
  )
}