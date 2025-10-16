/**
 * 格言カード管理API統合テスト
 * 
 * テスト対象: /api/admin/wisdom-cards
 * 目的: 格言カード管理機能のCRUD操作と認証を検証
 */

import { z } from 'zod'

// テスト用のスキーマ定義
const WisdomCardSchema = z.object({
  id: z.number(),
  author: z.string(),
  quote: z.string(),
  category_id: z.string(),
  subcategory_id: z.string().optional(),
  rarity: z.enum(['コモン', 'レア', 'エピック', 'レジェンダリー']),
  context: z.string(),
  application_area: z.string(),
  card_image_url: z.string().nullable(),
  background_image_url: z.string().nullable(),
  author_portrait_url: z.string().nullable(),
  animation_url: z.string().nullable(),
  particle_effect_config: z.any().nullable(),
  category_icon_url: z.string().nullable(),
  rarity_frame_url: z.string().nullable(),
  special_badge_url: z.string().nullable(),
  is_active: z.boolean(),
  display_order: z.number(),
  created_at: z.string(),
  updated_at: z.string()
})

const CreateWisdomCardRequestSchema = z.object({
  author: z.string().min(1),
  quote: z.string().min(1),
  category_id: z.string(),
  subcategory_id: z.string().optional(),
  rarity: z.enum(['コモン', 'レア', 'エピック', 'レジェンダリー']),
  context: z.string(),
  application_area: z.string(),
  card_image_url: z.string().nullable().optional(),
  background_image_url: z.string().nullable().optional(),
  author_portrait_url: z.string().nullable().optional(),
  animation_url: z.string().nullable().optional(),
  particle_effect_config: z.any().nullable().optional(),
  category_icon_url: z.string().nullable().optional(),
  rarity_frame_url: z.string().nullable().optional(),
  special_badge_url: z.string().nullable().optional(),
  display_order: z.number().optional()
})

const UpdateWisdomCardRequestSchema = CreateWisdomCardRequestSchema.extend({
  id: z.number(),
  is_active: z.boolean().optional()
})

const WisdomCardResponseSchema = z.object({
  success: z.boolean(),
  data: WisdomCardSchema.optional(),
  cards: z.array(WisdomCardSchema).optional(),
  message: z.string().optional(),
  error: z.string().optional()
})

// テスト用のモックデータ
const mockWisdomCard = {
  author: "テスト著者",
  quote: "これはテスト用の格言です",
  category_id: "strategy_management",
  subcategory_id: "経営戦略・事業戦略",
  rarity: "レア" as const,
  context: "テスト用のコンテキスト",
  application_area: "テスト用の活用分野",
  card_image_url: "/test/image.jpg",
  background_image_url: "/test/bg.jpg",
  author_portrait_url: "/test/portrait.jpg",
  animation_url: null,
  particle_effect_config: null,
  category_icon_url: null,
  rarity_frame_url: "/test/frame.png",
  special_badge_url: null,
  display_order: 999
}

const mockSystemAdminToken = "mock-system-admin-token"
const mockUserToken = "mock-user-token"

// APIエンドポイントのベースURL
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

describe('格言カード管理API', () => {
  let createdCardId: number | null = null

  // テスト前の初期化
  beforeAll(async () => {
    // 必要に応じて初期化処理
  })

  // テスト後のクリーンアップ
  afterAll(async () => {
    // テスト用カードの削除
    if (createdCardId) {
      try {
        await fetch(`${API_BASE}/api/admin/wisdom-cards/${createdCardId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${mockSystemAdminToken}`,
            'Content-Type': 'application/json'
          }
        })
      } catch (error) {
        console.warn('Cleanup failed:', error)
      }
    }
  })

  describe('認証テスト', () => {
    test('認証ヘッダーなしでアクセス拒否', async () => {
      const response = await fetch(`${API_BASE}/api/admin/wisdom-cards`, {
        method: 'GET'
      })

      expect(response.status).toBe(401)
      
      const data = await response.json()
      expect(data).toHaveProperty('error')
    })

    test('不正なトークンでアクセス拒否', async () => {
      const response = await fetch(`${API_BASE}/api/admin/wisdom-cards`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      })

      expect(response.status).toBe(401)
    })

    test('一般ユーザーでアクセス拒否', async () => {
      const response = await fetch(`${API_BASE}/api/admin/wisdom-cards`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockUserToken}`
        }
      })

      expect(response.status).toBe(403)
    })
  })

  describe('CRUD操作テスト', () => {
    test('格言カード一覧取得', async () => {
      const response = await fetch(`${API_BASE}/api/admin/wisdom-cards`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockSystemAdminToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(Array.isArray(data.cards)).toBe(true)
      
      // スキーマ検証
      if (data.cards.length > 0) {
        const validationResult = WisdomCardSchema.safeParse(data.cards[0])
        expect(validationResult.success).toBe(true)
      }
    })

    test('格言カード作成', async () => {
      const response = await fetch(`${API_BASE}/api/admin/wisdom-cards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockSystemAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mockWisdomCard)
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      
      // 作成されたカードIDを保存（後のテストで使用）
      createdCardId = data.data.id
      
      // スキーマ検証
      const validationResult = WisdomCardSchema.safeParse(data.data)
      expect(validationResult.success).toBe(true)
      
      // データ内容検証
      expect(data.data.author).toBe(mockWisdomCard.author)
      expect(data.data.quote).toBe(mockWisdomCard.quote)
      expect(data.data.rarity).toBe(mockWisdomCard.rarity)
      expect(data.data.is_active).toBe(true)
    })

    test('格言カード更新', async () => {
      if (!createdCardId) {
        throw new Error('作成テストが先に実行されている必要があります')
      }

      const updateData = {
        id: createdCardId,
        ...mockWisdomCard,
        author: "更新されたテスト著者",
        quote: "更新されたテスト格言"
      }

      const response = await fetch(`${API_BASE}/api/admin/wisdom-cards`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${mockSystemAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.author).toBe("更新されたテスト著者")
      expect(data.data.quote).toBe("更新されたテスト格言")
    })

    test('格言カード削除（絶版化）', async () => {
      if (!createdCardId) {
        throw new Error('作成テストが先に実行されている必要があります')
      }

      const response = await fetch(`${API_BASE}/api/admin/wisdom-cards/${createdCardId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${mockSystemAdminToken}`
        }
      })

      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data.success).toBe(true)
      
      // 削除完了マーク（クリーンアップ不要）
      createdCardId = null
    })
  })

  describe('データ検証テスト', () => {
    test('必須フィールド不足でエラー', async () => {
      const invalidData = {
        author: "", // 空文字（無効）
        quote: mockWisdomCard.quote
        // category_id などが不足
      }

      const response = await fetch(`${API_BASE}/api/admin/wisdom-cards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockSystemAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      })

      expect(response.status).toBe(400)
      
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    test('無効なレアリティでエラー', async () => {
      const invalidData = {
        ...mockWisdomCard,
        rarity: "無効なレアリティ"
      }

      const response = await fetch(`${API_BASE}/api/admin/wisdom-cards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mockSystemAdminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidData)
      })

      expect(response.status).toBe(400)
    })
  })

  describe('権限レベルテスト', () => {
    test('システム管理者のみアクセス可能', async () => {
      // システム管理者でのアクセス
      const adminResponse = await fetch(`${API_BASE}/api/admin/wisdom-cards`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockSystemAdminToken}`
        }
      })

      expect(adminResponse.status).toBe(200)
    })
  })

  describe('レスポンススキーマテスト', () => {
    test('API レスポンスがスキーマに準拠', async () => {
      const response = await fetch(`${API_BASE}/api/admin/wisdom-cards`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${mockSystemAdminToken}`
        }
      })

      const data = await response.json()
      
      // レスポンススキーマ検証
      const validationResult = WisdomCardResponseSchema.safeParse(data)
      expect(validationResult.success).toBe(true)
      
      if (!validationResult.success) {
        console.error('Schema validation errors:', validationResult.error.issues)
      }
    })
  })
})

// エクスポート（他のテストから使用可能）
export {
  WisdomCardSchema,
  CreateWisdomCardRequestSchema,
  UpdateWisdomCardRequestSchema,
  WisdomCardResponseSchema,
  mockWisdomCard
}