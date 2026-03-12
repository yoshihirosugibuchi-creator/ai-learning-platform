import { Model } from '@nozbe/watermelondb'
import { field, text, readonly, date } from '@nozbe/watermelondb/decorators'

/** スキルレベル */
export class SkillLevel extends Model {
  static table = 'skill_levels'

  @text('name') name!: string
  @text('display_name') displayName!: string
  @field('display_order') displayOrder!: number
  @text('color') color!: string | null
  @text('description') description!: string | null
  @text('target_experience') targetExperience!: string | null
  @readonly @date('created_at') createdAt!: Date | null
  @readonly @date('updated_at') updatedAt!: Date | null
}

/** カテゴリ */
export class Category extends Model {
  static table = 'categories'

  @text('category_id') categoryId!: string
  @text('name') name!: string
  @text('type') type!: string
  @text('description') description!: string | null
  @text('icon') icon!: string | null
  @text('color') color!: string | null
  @field('display_order') displayOrder!: number
  @field('is_active') isActive!: boolean
  @field('is_visible') isVisible!: boolean
  @text('activation_date') activationDate!: string | null
  @readonly @date('created_at') createdAt!: Date | null
  @readonly @date('updated_at') updatedAt!: Date | null
}

/** サブカテゴリ */
export class Subcategory extends Model {
  static table = 'subcategories'

  @text('subcategory_id') subcategoryId!: string
  @text('parent_category_id') parentCategoryId!: string
  @text('name') name!: string
  @text('description') description!: string | null
  @text('icon') icon!: string | null
  @field('display_order') displayOrder!: number
  @field('is_active') isActive!: boolean
  @field('is_visible') isVisible!: boolean
  @text('activation_date') activationDate!: string | null
  @readonly @date('created_at') createdAt!: Date | null
  @readonly @date('updated_at') updatedAt!: Date | null
}

/** XP設定 */
export class XpLevelSkpSetting extends Model {
  static table = 'xp_level_skp_settings'

  @field('server_id') serverId!: number
  @text('setting_category') settingCategory!: string
  @text('setting_key') settingKey!: string
  @field('setting_value') settingValue!: number
  @text('setting_description') settingDescription!: string | null
  @field('is_active') isActive!: boolean | null
  @readonly @date('created_at') createdAt!: Date | null
  @readonly @date('updated_at') updatedAt!: Date | null
}
