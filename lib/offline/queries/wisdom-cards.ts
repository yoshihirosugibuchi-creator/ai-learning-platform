/**
 * 格言カード データ取得（抽選用）
 * ローカルDB優先 → Supabaseフォールバック
 */
import type { Database as WMDatabase } from '@nozbe/watermelondb'
import type { WisdomCard } from '@/lib/cards'
import type { WisdomCardCollection } from '@/lib/supabase-cards'
import { resolveData } from '../data-source'

// ========== 共通型定義 ==========

export interface WisdomCardPoolData {
  cards: WisdomCard[]
  userCollection: WisdomCardCollection[]
}

// ========== データソース: ローカルDB ==========

async function loadFromLocalDB(db: WMDatabase, userId?: string): Promise<WisdomCardPoolData | null> {
  const [cardsRaw, collectionRaw] = await Promise.all([
    db.get('wisdom_cards').query().fetch(),
    db.get('wisdom_card_collection').query().fetch(),
  ])

  if (cardsRaw.length === 0) return null

  const cards: WisdomCard[] = cardsRaw
    .reduce<WisdomCard[]>((acc, record) => {
      const raw = (record as { _raw: Record<string, unknown> })._raw
      if (raw.is_active === false) return acc
      acc.push({
        id: Number(raw.server_id || raw.id),
        author: String(raw.author || ''),
        quote: String(raw.quote || ''),
        categoryId: String(raw.category_id || ''),
        subcategoryId: raw.subcategory_id ? String(raw.subcategory_id) : undefined,
        rarity: String(raw.rarity || 'コモン') as WisdomCard['rarity'],
        context: String(raw.context || ''),
        applicationArea: String(raw.application_area || ''),
      })
      return acc
    }, [])

  const userCollection: WisdomCardCollection[] = collectionRaw
    .filter(record => {
      const raw = (record as { _raw: Record<string, unknown> })._raw
      return !userId || raw.user_id === userId
    })
    .map(record => {
      const raw = (record as { _raw: Record<string, unknown> })._raw
      return {
        id: String(raw.id || ''),
        user_id: String(raw.user_id || ''),
        card_id: Number(raw.card_id),
        count: Number(raw.count) || 1,
        obtained_at: raw.obtained_at ? new Date(Number(raw.obtained_at)).toISOString() : '',
        last_obtained_at: raw.last_obtained_at ? new Date(Number(raw.last_obtained_at)).toISOString() : '',
        created_at: raw.created_at ? new Date(Number(raw.created_at)).toISOString() : undefined,
      }
    })

  console.log(`✅ Local DB: ${cards.length} wisdom cards, ${userCollection.length} collection entries loaded`)
  return { cards, userCollection }
}

// ========== データソース: サーバー ==========

async function loadFromServer(userId?: string): Promise<WisdomCardPoolData> {
  const { getWisdomCardsWithFallback, getUserWisdomCards } = await import('@/lib/supabase-cards')
  const { convertWisdomCardMasterToLegacy } = await import('@/lib/cards')

  const allDbCards = await getWisdomCardsWithFallback()
  const cards = allDbCards
    .filter(card => card.is_active !== false)
    .map(convertWisdomCardMasterToLegacy)

  let userCollection: WisdomCardCollection[] = []
  if (userId) {
    try {
      userCollection = await getUserWisdomCards(userId)
    } catch (e) {
      console.warn('⚠️ Failed to get user wisdom card collection:', e)
    }
  }

  console.log(`✅ Server: ${cards.length} wisdom cards, ${userCollection.length} collection entries loaded`)
  return { cards, userCollection }
}

// ========== エントリポイント ==========

/**
 * 格言カードプール（全カード＋ユーザーコレクション）を取得
 * @param database WatermelonDBインスタンス（null=PC→サーバー直接）
 * @param userId ユーザーID
 */
export async function getWisdomCardPool(
  database: WMDatabase | null,
  userId?: string
): Promise<WisdomCardPoolData> {
  return resolveData(
    {
      loadFromLocal: (db) => loadFromLocalDB(db, userId),
      loadFromServer: () => loadFromServer(userId),
    },
    database,
    userId
  )
}
