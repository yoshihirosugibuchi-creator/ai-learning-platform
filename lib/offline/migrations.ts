/**
 * WatermelonDB マイグレーション定義
 * スキーマバージョン変更時にデータ移行を行う
 */
import { schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations'

export const migrations = schemaMigrations({
  migrations: [
    {
      // version 1 → 2: user_challenge_selections テーブル追加
      toVersion: 2,
      steps: [
        createTable({
          name: 'user_challenge_selections',
          columns: [
            { name: 'user_id', type: 'string' },
            { name: 'slot_type', type: 'string' },
            { name: 'content_id', type: 'string' },
            { name: 'content_name', type: 'string', isOptional: true },
            { name: 'selected_by', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number', isOptional: true },
            { name: 'updated_at', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
    {
      // version 2 → 3: course_theme_completions テーブル追加
      toVersion: 3,
      steps: [
        createTable({
          name: 'course_theme_completions',
          columns: [
            { name: 'user_id', type: 'string' },
            { name: 'course_id', type: 'string' },
            { name: 'genre_id', type: 'string' },
            { name: 'theme_id', type: 'string' },
            { name: 'category_id', type: 'string' },
            { name: 'subcategory_id', type: 'string' },
            { name: 'completed_sessions', type: 'number' },
            { name: 'total_sessions', type: 'number' },
            { name: 'completion_rate', type: 'number' },
            { name: 'knowledge_cards_awarded', type: 'number', isOptional: true },
            { name: 'first_completion_time', type: 'number' },
            { name: 'created_at', type: 'number', isOptional: true },
          ],
        }),
      ],
    },
  ],
})
