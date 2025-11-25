'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SimpleSelect, SimpleSelectItem } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Edit, Trash2, Save, X, Palette, Database } from 'lucide-react'
import { WisdomCardMaster } from '@/lib/database-types-official'
import { getCategoryDisplayName, getRarityConfig, getSubcategoryDisplayName } from '@/lib/cards'
import WisdomCard from '@/components/cards/WisdomCard'
import { WisdomCard as WisdomCardType } from '@/lib/cards'
import { useToast } from '@/hooks/use-toast'
import { ToastContainer } from '@/components/ui/toast'

interface WisdomCardFormData {
  id?: number
  author: string
  quote: string
  category_id: string
  subcategory_id?: string
  rarity: string
  context: string
  application_area: string
  card_image_url?: string
  background_image_url?: string
  author_portrait_url?: string
  animation_url?: string
  category_icon_url?: string
  rarity_frame_url?: string
  special_badge_url?: string
  is_active: boolean
  display_order: number
}

interface Category {
  category_id: string
  name: string
  description?: string
  type?: string
  icon?: string
  color?: string
  display_order?: number
  is_active?: boolean
  is_visible?: boolean
}

interface Subcategory {
  subcategory_id: string
  name: string
  description?: string
  parent_category_id: string
  icon?: string
  display_order?: number
  is_active?: boolean
  is_visible?: boolean
}


export default function WisdomCardAdminPage() {
  const { toast, toasts, removeToast } = useToast()
  const [cards, setCards] = useState<WisdomCardMaster[]>([])
  const [editingCard, setEditingCard] = useState<WisdomCardFormData | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRarity, setSelectedRarity] = useState<string>('all')
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [previewCard, setPreviewCard] = useState<WisdomCardType | null>(null)

  // カード一覧取得
  const fetchCards = async () => {
    try {
      setLoading(true)
      console.log('🎴 Admin: Fetching wisdom cards...')
      
      // 管理画面では直接APIから取得（認証必須）
      const supabase = (await import('@/lib/supabase')).supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        console.error('❌ No auth session for admin API')
        setCards([])
        return
      }
      
      const response = await fetch('/api/admin/wisdom-cards', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('✅ Admin: Wisdom cards fetched:', result.cards?.length)
      setCards(result.cards || [])
    } catch (error) {
      console.error('❌ カード取得エラー:', error)
      setCards([])
    } finally {
      setLoading(false)
    }
  }

  // カテゴリー・サブカテゴリー取得
  const fetchCategoriesAndSubcategories = async () => {
    try {
      console.log('🔍 Fetching categories and subcategories...')
      const [categoriesRes, subcategoriesRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/subcategories')
      ])
      
      console.log('📊 Categories response status:', categoriesRes.status)
      console.log('📊 Subcategories response status:', subcategoriesRes.status)
      
      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        console.log('✅ Categories data:', categoriesData.categories?.length, 'items')
        setCategories(categoriesData.categories || [])
      } else {
        console.error('❌ Categories API failed:', categoriesRes.status)
      }
      
      if (subcategoriesRes.ok) {
        const subcategoriesData = await subcategoriesRes.json()
        console.log('✅ Subcategories data:', subcategoriesData.subcategories?.length, 'items')
        setSubcategories(subcategoriesData.subcategories || [])
      } else {
        console.error('❌ Subcategories API failed:', subcategoriesRes.status)
      }
    } catch (error) {
      console.error('❌ カテゴリー取得エラー:', error)
    }
  }

  useEffect(() => {
    fetchCards()
    fetchCategoriesAndSubcategories()
    
    // 認証状況デバッグ
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        console.log('🔐 Current session:', data)
        console.log('🔐 User role:', data?.user?.role)
        console.log('🔐 User ID:', data?.user?.id)
      })
      .catch(err => console.error('❌ Session check error:', err))
  }, [])

  // フィルタリング
  const filteredCards = cards.filter(card => {
    const matchesSearch = 
      card.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.quote.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCategoryDisplayName(card.category_id, categories).toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRarity = selectedRarity === 'all' || card.rarity === selectedRarity
    
    return matchesSearch && matchesRarity
  })

  // 新規作成フォーム初期化
  const initializeNewCard = () => {
    const newCard = {
      author: '',
      quote: '',
      category_id: '',
      subcategory_id: '',
      rarity: 'コモン',
      context: '',
      application_area: '',
      is_active: true,
      display_order: cards.length + 1
    }
    setEditingCard(newCard)
    setPreviewCard(null) // 新規作成時はプレビューをクリア
    setIsCreating(true)
  }

  // プレビュー更新
  const updatePreview = (cardData: WisdomCardFormData) => {
    if (!cardData.author || !cardData.quote) return
    
    setPreviewCard({
      id: cardData.id || 999,
      author: cardData.author,
      quote: cardData.quote,
      categoryId: cardData.category_id,
      subcategoryId: cardData.subcategory_id,
      rarity: cardData.rarity as 'コモン' | 'レア' | 'エピック' | 'レジェンダリー',
      context: cardData.context,
      applicationArea: cardData.application_area,
      obtained: true,
      count: 1
    })
  }

  // 編集開始
  const startEditing = (card: WisdomCardMaster) => {
    console.log('✏️ Starting edit for card:', card.id, card.author)
    const cardData = {
      id: card.id,
      author: card.author,
      quote: card.quote,
      category_id: card.category_id,
      subcategory_id: card.subcategory_id || '',
      rarity: card.rarity,
      context: card.context,
      application_area: card.application_area,
      card_image_url: card.card_image_url || '',
      background_image_url: card.background_image_url || '',
      author_portrait_url: card.author_portrait_url || '',
      animation_url: card.animation_url || '',
      category_icon_url: card.category_icon_url || '',
      rarity_frame_url: card.rarity_frame_url || '',
      special_badge_url: card.special_badge_url || '',
      is_active: card.is_active ?? true,
      display_order: card.display_order ?? 0
    }
    setEditingCard(cardData)
    updatePreview(cardData)
    setIsCreating(false)
  }

  // 編集キャンセル
  const cancelEditing = () => {
    setEditingCard(null)
    setPreviewCard(null)
    setIsCreating(false)
  }

  // カード保存
  const handleSaveCard = async () => {
    if (!editingCard) return

    try {
      console.log('💾 Saving card data:', editingCard)
      
      // Supabaseセッションからアクセストークンを取得
      const supabase = (await import('@/lib/supabase')).supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        throw new Error('認証セッションがありません。再ログインしてください。')
      }
      
      const response = await fetch('/api/admin/wisdom-cards', {
        method: isCreating ? 'POST' : 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(editingCard)
      })

      console.log('📊 Save response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Save failed:', response.status, errorData)
        throw new Error(`保存に失敗しました: ${response.status} - ${errorData.error || 'Unknown error'}`)
      }

      const responseData = await response.json()
      console.log('✅ Save successful:', responseData)

      await fetchCards() // 一覧を再取得
      cancelEditing()
    } catch (error) {
      console.error('❌ 保存エラー:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      toast({
        title: '保存失敗',
        description: `保存に失敗しました: ${errorMessage}`,
        variant: 'destructive'
      })
    }
  }

  // カード削除（絶版化対応）
  const handleDeleteCard = async (cardId: number) => {
    if (!window.confirm('このカードを削除しますか？\n\n📝 ユーザーが所有中の場合は絶版化されます。\n新規発行を停止し、コレクションでは継続表示されます。')) return

    try {
      // Supabaseセッションからアクセストークンを取得
      const supabase = (await import('@/lib/supabase')).supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        toast({
          title: '認証エラー',
          description: '認証セッションがありません。再ログインしてください。',
          variant: 'destructive'
        })
        return
      }
      
      const response = await fetch(`/api/admin/wisdom-cards/${cardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('削除に失敗しました')
      }

      const result = await response.json()
      
      if (result.discontinued) {
        toast({
          title: 'カード削除完了',
          description: `${result.message}\n\n絶版カードとして保持されます。\nユーザーのコレクションには引き続き表示されます。`
        })
      } else {
        toast({
          title: '削除完了',
          description: 'カードを完全に削除しました'
        })
      }

      await fetchCards()
    } catch (error) {
      console.error('削除エラー:', error)
      toast({
        title: '削除失敗',
        description: '削除に失敗しました',
        variant: 'destructive'
      })
    }
  }

  // カード再活性化
  const handleReactivateCard = async (cardId: number) => {
    if (!window.confirm('このカードを再活性化しますか？\n\n🔄 新規発行対象に復活し、ユーザーが再び獲得可能になります。')) return

    try {
      // Supabaseセッションからアクセストークンを取得
      const supabase = (await import('@/lib/supabase')).supabase
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.access_token) {
        toast({
          title: '認証エラー',
          description: '認証セッションがありません。再ログインしてください。',
          variant: 'destructive'
        })
        return
      }
      
      const response = await fetch('/api/admin/wisdom-cards', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          id: cardId,
          is_active: true
        })
      })

      if (!response.ok) {
        throw new Error('再活性化に失敗しました')
      }

      toast({
        title: '再活性化完了',
        description: 'カードを再活性化しました'
      })
      await fetchCards()
    } catch (error) {
      console.error('再活性化エラー:', error)
      toast({
        title: '再活性化失敗',
        description: '再活性化に失敗しました',
        variant: 'destructive'
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">読み込み中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Palette className="h-8 w-8 text-purple-600" />
            格言カード管理
          </h1>
          <p className="text-gray-600 mt-2">
            格言カードの作成・編集・管理を行います
          </p>
        </div>
        
        <Button onClick={initializeNewCard} className="bg-purple-600 hover:bg-purple-700">
          <Plus className="h-4 w-4 mr-2" />
          新規カード作成
        </Button>
      </div>

      {/* 検索・フィルター */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">検索・フィルター</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">検索</label>
              <Input
                placeholder="著者名、格言、カテゴリーで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">レアリティ</label>
              <SimpleSelect value={selectedRarity} onValueChange={setSelectedRarity}>
                <SimpleSelectItem value="all">すべて</SimpleSelectItem>
                <SimpleSelectItem value="コモン">コモン</SimpleSelectItem>
                <SimpleSelectItem value="レア">レア</SimpleSelectItem>
                <SimpleSelectItem value="エピック">エピック</SimpleSelectItem>
                <SimpleSelectItem value="レジェンダリー">レジェンダリー</SimpleSelectItem>
              </SimpleSelect>
            </div>
            
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                表示中: {filteredCards.length} / {cards.length} 件
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 編集フォーム */}
      {editingCard && (
        <Card className="border-2 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{isCreating ? '新規カード作成' : 'カード編集'}</span>
              <div className="flex gap-2">
                <Button onClick={handleSaveCard} size="sm" className="bg-green-600 hover:bg-green-700">
                  <Save className="h-4 w-4 mr-1" />
                  保存
                </Button>
                <Button onClick={cancelEditing} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-1" />
                  キャンセル
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">基本情報</TabsTrigger>
                <TabsTrigger value="content">内容</TabsTrigger>
                <TabsTrigger value="visual">ビジュアル</TabsTrigger>
                <TabsTrigger value="preview">プレビュー</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">著者名 *</label>
                    <Input
                      value={editingCard.author}
                      onChange={(e) => {
                        const updatedCard = {...editingCard, author: e.target.value}
                        setEditingCard(updatedCard)
                        updatePreview(updatedCard)
                      }}
                      placeholder="例: スティーブ・ジョブズ"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">レアリティ *</label>
                    <SimpleSelect 
                      value={editingCard.rarity} 
                      onValueChange={(value: string) => {
                        const updatedCard = {...editingCard, rarity: value}
                        setEditingCard(updatedCard)
                        updatePreview(updatedCard)
                      }}
                    >
                      <SimpleSelectItem value="コモン">コモン</SimpleSelectItem>
                      <SimpleSelectItem value="レア">レア</SimpleSelectItem>
                      <SimpleSelectItem value="エピック">エピック</SimpleSelectItem>
                      <SimpleSelectItem value="レジェンダリー">レジェンダリー</SimpleSelectItem>
                    </SimpleSelect>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">カテゴリー *</label>
                    <SimpleSelect
                      value={editingCard.category_id}
                      onValueChange={(value: string) => {
                        const updatedCard = {...editingCard, category_id: value, subcategory_id: ''} // サブカテゴリーをリセット
                        setEditingCard(updatedCard)
                        updatePreview(updatedCard)
                      }}
                    >
                      <SimpleSelectItem value="">カテゴリーを選択</SimpleSelectItem>
                      {categories.map((category) => (
                        <SimpleSelectItem key={category.category_id} value={category.category_id}>
                          {category.name}
                        </SimpleSelectItem>
                      ))}
                    </SimpleSelect>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">サブカテゴリー</label>
                    <SimpleSelect
                      value={editingCard.subcategory_id || ''}
                      onValueChange={(value: string) => {
                        const updatedCard = {...editingCard, subcategory_id: value}
                        setEditingCard(updatedCard)
                        updatePreview(updatedCard)
                      }}
                    >
                      <SimpleSelectItem value="">サブカテゴリーを選択（任意）</SimpleSelectItem>
                      {subcategories
                        .filter(sub => sub.parent_category_id === editingCard.category_id)
                        .map((subcategory) => (
                          <SimpleSelectItem key={subcategory.subcategory_id} value={subcategory.subcategory_id}>
                            {subcategory.name}
                          </SimpleSelectItem>
                        ))}
                    </SimpleSelect>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">表示順</label>
                    <Input
                      type="number"
                      value={editingCard.display_order}
                      onChange={(e) => setEditingCard({...editingCard, display_order: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={editingCard.is_active}
                      onChange={(e) => setEditingCard({...editingCard, is_active: e.target.checked})}
                    />
                    <label htmlFor="is_active" className="text-sm font-medium">アクティブ</label>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="content" className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">格言 *</label>
                  <Textarea
                    value={editingCard.quote}
                    onChange={(e) => {
                      const updatedCard = {...editingCard, quote: e.target.value}
                      setEditingCard(updatedCard)
                      updatePreview(updatedCard)
                    }}
                    placeholder="例: Think Different"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">背景・文脈 *</label>
                  <Textarea
                    value={editingCard.context}
                    onChange={(e) => setEditingCard({...editingCard, context: e.target.value})}
                    placeholder="この格言が生まれた背景や文脈を説明"
                    rows={4}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">活用分野 *</label>
                  <Textarea
                    value={editingCard.application_area}
                    onChange={(e) => setEditingCard({...editingCard, application_area: e.target.value})}
                    placeholder="この格言が活用できる分野や場面"
                    rows={2}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="visual" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">メインカード画像URL</label>
                    <Input
                      value={editingCard.card_image_url}
                      onChange={(e) => setEditingCard({...editingCard, card_image_url: e.target.value})}
                      placeholder="/images/wisdom-cards/main/..."
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">背景画像URL</label>
                    <Input
                      value={editingCard.background_image_url}
                      onChange={(e) => setEditingCard({...editingCard, background_image_url: e.target.value})}
                      placeholder="/images/wisdom-cards/backgrounds/..."
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">著者肖像画URL</label>
                    <Input
                      value={editingCard.author_portrait_url}
                      onChange={(e) => setEditingCard({...editingCard, author_portrait_url: e.target.value})}
                      placeholder="/images/wisdom-cards/portraits/..."
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">アニメーションURL</label>
                    <Input
                      value={editingCard.animation_url}
                      onChange={(e) => setEditingCard({...editingCard, animation_url: e.target.value})}
                      placeholder="/images/wisdom-cards/animations/..."
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">カテゴリーアイコンURL</label>
                    <Input
                      value={editingCard.category_icon_url}
                      onChange={(e) => setEditingCard({...editingCard, category_icon_url: e.target.value})}
                      placeholder="/images/wisdom-cards/icons/..."
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">レアリティフレームURL</label>
                    <Input
                      value={editingCard.rarity_frame_url}
                      onChange={(e) => setEditingCard({...editingCard, rarity_frame_url: e.target.value})}
                      placeholder="/images/wisdom-cards/frames/..."
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">特別バッジURL</label>
                    <Input
                      value={editingCard.special_badge_url}
                      onChange={(e) => setEditingCard({...editingCard, special_badge_url: e.target.value})}
                      placeholder="/images/wisdom-cards/badges/..."
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="preview" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    リアルタイムプレビュー - 編集内容が即座に反映されます
                  </div>
                  
                  {previewCard ? (
                    <div className="flex justify-center">
                      <div className="w-80">
                        <WisdomCard 
                          card={previewCard}
                          showDetails={false}
                          className="transform-none hover:scale-100"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-80 border-2 border-dashed border-gray-300 rounded-lg">
                      <div className="text-center text-gray-500">
                        <div className="text-lg mb-2">📝 プレビュー</div>
                        <div className="text-sm">
                          著者名と格言を入力すると<br />
                          カードのプレビューが表示されます
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {previewCard && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600">
                        <div><strong>著者:</strong> {previewCard.author}</div>
                        <div><strong>レアリティ:</strong> {previewCard.rarity}</div>
                        <div><strong>カテゴリー:</strong> {getCategoryDisplayName(previewCard.categoryId, categories)}</div>
                        {previewCard.subcategoryId && (
                          <div><strong>サブカテゴリー:</strong> {getSubcategoryDisplayName(previewCard.subcategoryId, subcategories)}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* カード一覧 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            カード一覧
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredCards.map((card) => {
              const rarityConfig = getRarityConfig(card.rarity as 'コモン' | 'レア' | 'エピック' | 'レジェンダリー')
              const isDiscontinued = !card.is_active
              
              return (
                <div key={card.id} className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 ${isDiscontinued ? 'bg-gray-50 opacity-75' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge 
                        className={`${rarityConfig.bgColor} ${rarityConfig.borderColor} border text-gray-900 font-semibold`}
                      >
                        {rarityConfig.symbol} {card.rarity}
                      </Badge>
                      {isDiscontinued && (
                        <Badge variant="outline" className="text-red-600 border-red-300">
                          🔥 絶版
                        </Badge>
                      )}
                      <span className={`font-medium ${isDiscontinued ? 'text-gray-500 line-through' : ''}`}>
                        {card.author}
                      </span>
                      <span className="text-sm text-gray-500">
                        {getCategoryDisplayName(card.category_id, categories)}
                      </span>
                    </div>
                    <div className={`text-sm line-clamp-2 ${isDiscontinued ? 'text-gray-500' : 'text-gray-700'}`}>
                      「{card.quote}」
                    </div>
                    {isDiscontinued && (
                      <div className="text-xs text-red-600 mt-1">
                        💎 絶版カード - 新規発行停止中
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => startEditing(card)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    {isDiscontinued ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleReactivateCard(card.id)}
                        className="text-green-600 hover:text-green-700"
                      >
                        🔄 再活性化
                      </Button>
                    ) : null}
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDeleteCard(card.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
          
          {filteredCards.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              条件に一致するカードが見つかりません
            </div>
          )}
        </CardContent>
      </Card>

      {/* トースト表示 */}
      <ToastContainer 
        toasts={toasts} 
        onRemoveToast={removeToast} 
      />
    </div>
  )
}