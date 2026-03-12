/**
 * コレクションページ用データ取得
 * ローカルDB優先 → Supabaseフォールバック
 * N+1クエリを完全解消（バッチ読み込み + メモリ内JOIN）
 */
import type { Database as WMDatabase } from '@nozbe/watermelondb'

// ========== 型定義 ==========

export interface WisdomCardWithStatus {
  id: number
  author: string
  quote: string
  categoryId: string
  subcategoryId?: string
  rarity: string
  context: string
  applicationArea: string
  obtained: boolean
  count: number
}

export interface KnowledgeCardWithStatus {
  id: string
  user_id: string
  theme_id: string
  obtained_at: string | null
  created_at: string | null
  obtained: boolean
  card_data: {
    id: string
    title: string
    summary: string
    icon: string
    color: string
    keyPoints: string[]
  }
  course_id?: string
  genre_id: string
  theme_title: string
  first_session_id?: string
  course_title?: string
  genre_title?: string
  display_order?: {
    course: number
    genre: number
    theme: number
  }
}

export interface CollectionData {
  wisdomCards: {
    cardsWithStatus: WisdomCardWithStatus[]
    stats: { totalObtained: number; totalCards: number; uniqueCards: number }
  }
  knowledgeCards: {
    cardsWithStatus: KnowledgeCardWithStatus[]
    stats: { totalObtained: number; totalCards: number; uniqueCards: number }
  }
  subcategories: Array<{ subcategory_id: string; name: string }>
}

// ========== ローカルDB読み込み ==========

/** WatermelonDBからコレクションデータを一括読み込み */
async function loadFromLocalDB(
  database: WMDatabase,
  userId: string
): Promise<CollectionData | null> {
  try {
    // 全テーブルを並列で一括取得（N+1なし）
    const [
      wisdomCardsRaw,
      wisdomCollectionRaw,
      subcategoriesRaw,
      themesRaw,
      genresRaw,
      coursesRaw,
      sessionsRaw,
      knowledgeCollectionRaw,
    ] = await Promise.all([
      database.get('wisdom_cards').query().fetch(),
      database.get('wisdom_card_collection').query().fetch(),
      database.get('subcategories').query().fetch(),
      database.get('learning_themes').query().fetch(),
      database.get('learning_genres').query().fetch(),
      database.get('learning_courses').query().fetch(),
      database.get('learning_sessions').query().fetch(),
      database.get('user_knowledge_collection_v2').query().fetch(),
    ])

    // データが空ならフォールバック
    if (wisdomCardsRaw.length === 0 && themesRaw.length === 0) {
      console.log('📭 Local DB empty, falling back to server')
      return null
    }

    // --- Wisdom Cards: メモリ内JOIN ---
    const userWisdomMap = new Map<number, { count: number }>()
    for (const record of wisdomCollectionRaw) {
      const raw = record._raw as Record<string, unknown>
      if (raw.user_id === userId) {
        const cardId = Number(raw.card_id)
        userWisdomMap.set(cardId, { count: Number(raw.count) || 1 })
      }
    }

    const wisdomCardsWithStatus: WisdomCardWithStatus[] = (wisdomCardsRaw as Array<{ _raw: Record<string, unknown> }>)
      .filter(r => r._raw.is_active !== false)
      .sort((a, b) => (Number(a._raw.display_order) || 0) - (Number(b._raw.display_order) || 0))
      .map(record => {
        const raw = record._raw
        const cardId = Number(raw.server_id || raw.id)
        const userEntry = userWisdomMap.get(cardId)
        return {
          id: cardId,
          author: String(raw.author || ''),
          quote: String(raw.quote || ''),
          categoryId: String(raw.category_id || ''),
          subcategoryId: raw.subcategory_id ? String(raw.subcategory_id) : undefined,
          rarity: String(raw.rarity || 'コモン'),
          context: String(raw.context || ''),
          applicationArea: String(raw.application_area || ''),
          obtained: !!userEntry,
          count: userEntry?.count || 0,
        }
      })

    const wisdomObtained = wisdomCardsWithStatus.filter(c => c.obtained)

    // --- Knowledge Cards: メモリ内JOIN ---
    const genreMap = new Map<string, { id: string; title: string; course_id: string; display_order: number }>()
    for (const record of genresRaw) {
      const raw = (record as { _raw: Record<string, unknown> })._raw
      genreMap.set(String(raw.id), {
        id: String(raw.id),
        title: String(raw.title || ''),
        course_id: String(raw.course_id || ''),
        display_order: Number(raw.display_order) || 999,
      })
    }

    const courseMap = new Map<string, { id: string; title: string; display_order: number }>()
    for (const record of coursesRaw) {
      const raw = (record as { _raw: Record<string, unknown> })._raw
      courseMap.set(String(raw.id), {
        id: String(raw.id),
        title: String(raw.title || ''),
        display_order: Number(raw.display_order) || 999,
      })
    }

    // テーマごとの最初のセッションを事前計算
    const firstSessionMap = new Map<string, string>()
    const sessionsByTheme = new Map<string, Array<{ id: string; display_order: number }>>()
    for (const record of sessionsRaw) {
      const raw = (record as { _raw: Record<string, unknown> })._raw
      const themeId = String(raw.theme_id || '')
      if (!sessionsByTheme.has(themeId)) {
        sessionsByTheme.set(themeId, [])
      }
      sessionsByTheme.get(themeId)!.push({
        id: String(raw.id),
        display_order: Number(raw.display_order) || 999,
      })
    }
    for (const [themeId, sessions] of sessionsByTheme) {
      sessions.sort((a, b) => a.display_order - b.display_order)
      if (sessions.length > 0) {
        firstSessionMap.set(themeId, sessions[0].id)
      }
    }

    // ユーザーのナレッジカードコレクション
    const userKnowledgeMap = new Map<string, { id: string; obtained_at: string | null; created_at: string | null }>()
    for (const record of knowledgeCollectionRaw) {
      const raw = (record as { _raw: Record<string, unknown> })._raw
      if (raw.user_id === userId) {
        userKnowledgeMap.set(String(raw.theme_id), {
          id: String(raw.id),
          obtained_at: raw.obtained_at ? new Date(Number(raw.obtained_at)).toISOString() : null,
          created_at: raw.created_at ? new Date(Number(raw.created_at)).toISOString() : null,
        })
      }
    }

    const knowledgeCardsWithStatus: KnowledgeCardWithStatus[] = (themesRaw as Array<{ _raw: Record<string, unknown> }>)
      .map(record => {
        const raw = record._raw
        const themeId = String(raw.id)
        const genreId = String(raw.genre_id || '')
        const genre = genreMap.get(genreId)
        const course = genre ? courseMap.get(genre.course_id) : null
        const userCard = userKnowledgeMap.get(themeId)

        let rewardCardData: Record<string, unknown> = {}
        try {
          const rcd = raw.reward_card_data
          if (typeof rcd === 'string') {
            rewardCardData = JSON.parse(rcd)
          } else if (rcd && typeof rcd === 'object') {
            rewardCardData = rcd as Record<string, unknown>
          }
        } catch { /* ignore parse error */ }

        return {
          id: userCard?.id || `placeholder_${themeId}`,
          user_id: userId,
          theme_id: themeId,
          obtained_at: userCard?.obtained_at || null,
          created_at: userCard?.created_at || null,
          obtained: !!userCard,
          card_data: {
            id: themeId,
            title: (rewardCardData.title as string) || String(raw.title || 'ナレッジカード'),
            summary: (rewardCardData.description as string) || (rewardCardData.summary as string) || 'テーマ完了により獲得',
            icon: (rewardCardData.icon as string) || '📚',
            color: (rewardCardData.color as string) || '#3B82F6',
            keyPoints: (rewardCardData.keyPoints as string[]) || (rewardCardData.key_points as string[]) || [],
          },
          course_id: course?.id,
          genre_id: genreId,
          theme_title: String(raw.title || ''),
          first_session_id: firstSessionMap.get(themeId),
          course_title: course?.title || 'Unknown Course',
          genre_title: genre?.title || 'Unknown Genre',
          display_order: {
            course: course?.display_order || 999,
            genre: genre?.display_order || 999,
            theme: Number(raw.display_order) || 999,
          },
        }
      })
      .sort((a, b) => {
        if (a.display_order!.course !== b.display_order!.course) return a.display_order!.course - b.display_order!.course
        if (a.display_order!.genre !== b.display_order!.genre) return a.display_order!.genre - b.display_order!.genre
        return a.display_order!.theme - b.display_order!.theme
      })

    const knowledgeObtained = knowledgeCardsWithStatus.filter(c => c.obtained)

    const subcategories = (subcategoriesRaw as Array<{ _raw: Record<string, unknown> }>).map(r => ({
      subcategory_id: String(r._raw.subcategory_id || r._raw.id || ''),
      name: String(r._raw.name || ''),
    }))

    console.log(`✅ Local DB: ${wisdomCardsWithStatus.length} wisdom cards, ${knowledgeCardsWithStatus.length} knowledge cards loaded`)

    return {
      wisdomCards: {
        cardsWithStatus: wisdomCardsWithStatus,
        stats: {
          totalObtained: wisdomObtained.length,
          totalCards: wisdomObtained.reduce((sum, c) => sum + c.count, 0),
          uniqueCards: wisdomObtained.length,
        },
      },
      knowledgeCards: {
        cardsWithStatus: knowledgeCardsWithStatus,
        stats: {
          totalObtained: knowledgeObtained.length,
          totalCards: knowledgeObtained.length,
          uniqueCards: knowledgeObtained.length,
        },
      },
      subcategories,
    }
  } catch (error) {
    console.warn('⚠️ Local DB read failed, falling back to server:', error)
    return null
  }
}

// ========== Supabaseフォールバック（バッチ最適化版） ==========

/** Supabaseからバッチクエリで読み込み（N+1解消版） */
async function loadFromServer(userId: string): Promise<CollectionData> {
  const { supabase } = await import('@/lib/supabase')
  const { getAllWisdomCardsFromDB } = await import('@/lib/cards')

  // 全データを並列バッチ取得（N+1なし）
  const [
    allWisdomCards,
    wisdomCollectionResult,
    subcategoryResult,
    themesResult,
    genresResult,
    coursesResult,
    sessionsResult,
    knowledgeCollectionResult,
  ] = await Promise.all([
    getAllWisdomCardsFromDB(),
    supabase.from('wisdom_card_collection').select('*').eq('user_id', userId),
    supabase.from('subcategories').select('subcategory_id, name'),
    supabase.from('learning_themes').select('id, title, reward_card_data, genre_id, display_order').order('display_order'),
    supabase.from('learning_genres').select('id, title, course_id, display_order'),
    supabase.from('learning_courses').select('id, title, display_order'),
    supabase.from('learning_sessions').select('id, theme_id, display_order').order('display_order'),
    supabase.from('user_knowledge_collection_v2').select('id, user_id, theme_id, obtained_at, created_at').eq('user_id', userId),
  ])

  const wisdomCollection = wisdomCollectionResult.data || []
  const subcategories = subcategoryResult.data || []
  const allThemes = themesResult.data || []
  const allGenres = genresResult.data || []
  const allCourses = coursesResult.data || []
  const allSessions = sessionsResult.data || []
  const knowledgeCollection = knowledgeCollectionResult.data || []

  // --- Wisdom Cards: メモリ内JOIN ---
  const userWisdomMap = new Map<number, { count: number }>()
  for (const wc of wisdomCollection) {
    userWisdomMap.set(wc.card_id, { count: wc.count || 1 })
  }

  const wisdomCardsWithStatus: WisdomCardWithStatus[] = allWisdomCards.map(card => {
    const userEntry = userWisdomMap.get(card.id)
    return {
      id: card.id,
      author: card.author,
      quote: card.quote,
      categoryId: card.categoryId,
      subcategoryId: card.subcategoryId,
      rarity: card.rarity,
      context: card.context || '',
      applicationArea: card.applicationArea || '',
      obtained: !!userEntry,
      count: userEntry?.count || 0,
    }
  })

  const wisdomObtained = wisdomCardsWithStatus.filter(c => c.obtained)

  // --- Knowledge Cards: メモリ内JOIN ---
  const genreMap = new Map(allGenres.map(g => [g.id, g]))
  const courseMap = new Map(allCourses.map(c => [c.id, c]))

  // テーマごとの最初のセッション
  const firstSessionMap = new Map<string, string>()
  const sessionsByTheme = new Map<string, typeof allSessions>()
  for (const s of allSessions) {
    const themeId = s.theme_id
    if (!sessionsByTheme.has(themeId)) sessionsByTheme.set(themeId, [])
    sessionsByTheme.get(themeId)!.push(s)
  }
  for (const [themeId, sessions] of sessionsByTheme) {
    if (sessions.length > 0) firstSessionMap.set(themeId, sessions[0].id)
  }

  const userKnowledgeMap = new Map(knowledgeCollection.map(kc => [kc.theme_id, kc]))

  const knowledgeCardsWithStatus: KnowledgeCardWithStatus[] = allThemes.map(theme => {
    const genre = genreMap.get(theme.genre_id)
    const course = genre ? courseMap.get(genre.course_id) : undefined
    const userCard = userKnowledgeMap.get(theme.id)
    const rewardCardData = (theme.reward_card_data as Record<string, unknown>) || {}

    return {
      id: userCard?.id || `placeholder_${theme.id}`,
      user_id: userId,
      theme_id: theme.id,
      obtained_at: userCard?.obtained_at || null,
      created_at: userCard?.created_at || null,
      obtained: !!userCard,
      card_data: {
        id: theme.id,
        title: (rewardCardData.title as string) || theme.title || 'ナレッジカード',
        summary: (rewardCardData.description as string) || (rewardCardData.summary as string) || 'テーマ完了により獲得',
        icon: (rewardCardData.icon as string) || '📚',
        color: (rewardCardData.color as string) || '#3B82F6',
        keyPoints: (rewardCardData.keyPoints as string[]) || (rewardCardData.key_points as string[]) || [],
      },
      course_id: course?.id,
      genre_id: theme.genre_id,
      theme_title: theme.title,
      first_session_id: firstSessionMap.get(theme.id),
      course_title: course?.title || 'Unknown Course',
      genre_title: genre?.title || 'Unknown Genre',
      display_order: {
        course: course?.display_order || 999,
        genre: genre?.display_order || 999,
        theme: theme.display_order || 999,
      },
    }
  }).sort((a, b) => {
    if (a.display_order!.course !== b.display_order!.course) return a.display_order!.course - b.display_order!.course
    if (a.display_order!.genre !== b.display_order!.genre) return a.display_order!.genre - b.display_order!.genre
    return a.display_order!.theme - b.display_order!.theme
  })

  const knowledgeObtained = knowledgeCardsWithStatus.filter(c => c.obtained)

  console.log(`✅ Server: ${wisdomCardsWithStatus.length} wisdom cards, ${knowledgeCardsWithStatus.length} knowledge cards loaded (batch)`)

  return {
    wisdomCards: {
      cardsWithStatus: wisdomCardsWithStatus,
      stats: {
        totalObtained: wisdomObtained.length,
        totalCards: wisdomObtained.reduce((sum, c) => sum + c.count, 0),
        uniqueCards: wisdomObtained.length,
      },
    },
    knowledgeCards: {
      cardsWithStatus: knowledgeCardsWithStatus,
      stats: {
        totalObtained: knowledgeObtained.length,
        totalCards: knowledgeObtained.length,
        uniqueCards: knowledgeObtained.length,
      },
    },
    subcategories: subcategories.map(s => ({
      subcategory_id: s.subcategory_id,
      name: s.name,
    })),
  }
}

// ========== メインエクスポート ==========

/**
 * コレクションページのデータをローカル優先で読み込む
 * 1. WatermelonDB（ローカル）から一括取得を試みる
 * 2. ローカルが空またはエラー → Supabase（サーバー）からバッチ取得
 *
 * N+1クエリは完全に解消：
 * - 旧: Wisdom Cards 101クエリ, Knowledge Cards 150+クエリ
 * - 新: ローカル=0クエリ(全てメモリ), サーバー=8クエリ(全てバッチ)
 */
export async function loadCollectionData(
  userId: string,
  database?: WMDatabase | null
): Promise<CollectionData> {
  // ローカルDB優先
  if (database) {
    const localData = await loadFromLocalDB(database, userId)
    if (localData) return localData
  }

  // サーバーフォールバック（バッチ最適化版）
  return loadFromServer(userId)
}
