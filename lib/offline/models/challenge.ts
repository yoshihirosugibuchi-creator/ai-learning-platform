import { Model } from '@nozbe/watermelondb'
import { text, readonly, date } from '@nozbe/watermelondb/decorators'

/** 選ばれし課題（ユーザーのダッシュボード選択） */
export class UserChallengeSelection extends Model {
  static table = 'user_challenge_selections'

  @text('user_id') userId!: string
  @text('slot_type') slotType!: string
  @text('content_id') contentId!: string
  @text('content_name') contentName!: string | null
  @text('selected_by') selectedBy!: string | null
  @readonly @date('created_at') createdAt!: Date | null
  @date('updated_at') updatedAtDate!: Date | null
}
