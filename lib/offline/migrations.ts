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
  ],
})
