import { Model } from '@nozbe/watermelondb'
import { field, text, json, readonly, date } from '@nozbe/watermelondb/decorators'

const sanitize = (raw: unknown) => (typeof raw === 'string' ? JSON.parse(raw) : raw ?? null)

/** 格言カードマスタ */
export class WisdomCard extends Model {
  static table = 'wisdom_cards'

  @field('server_id') serverId!: number
  @text('quote') quote!: string
  @text('author') author!: string
  @text('category_id') categoryId!: string
  @text('subcategory_id') subcategoryId!: string | null
  @text('rarity') rarity!: string
  @text('context') context!: string
  @text('application_area') applicationArea!: string
  @text('card_image_url') cardImageUrl!: string | null
  @text('background_image_url') backgroundImageUrl!: string | null
  @text('author_portrait_url') authorPortraitUrl!: string | null
  @text('animation_url') animationUrl!: string | null
  @text('category_icon_url') categoryIconUrl!: string | null
  @text('rarity_frame_url') rarityFrameUrl!: string | null
  @text('special_badge_url') specialBadgeUrl!: string | null
  @field('is_active') isActive!: boolean | null
  @field('display_order') displayOrder!: number | null
  @json('particle_effect_config', sanitize) particleEffectConfig!: unknown
  @readonly @date('created_at') createdAt!: Date | null
  @readonly @date('updated_at') updatedAt!: Date | null
}

/** 格言カード所持（ユーザーデータ） */
export class WisdomCardCollection extends Model {
  static table = 'wisdom_card_collection'

  @text('user_id') userId!: string
  @field('card_id') cardId!: number
  @field('count') count!: number | null
  @date('obtained_at') obtainedAt!: Date | null
  @date('last_obtained_at') lastObtainedAt!: Date | null
  @readonly @date('created_at') createdAt!: Date | null
}

/** ナレッジカード所持（ユーザーデータ） */
export class UserKnowledgeCollectionV2 extends Model {
  static table = 'user_knowledge_collection_v2'

  @text('user_id') userId!: string
  @text('theme_id') themeId!: string
  @date('obtained_at') obtainedAt!: Date | null
  @readonly @date('created_at') createdAt!: Date | null
}
