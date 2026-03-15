/**
 * WatermelonDB データベースインスタンス
 * Web環境ではLokiJS + IndexedDBアダプタを使用
 */
import { Database } from '@nozbe/watermelondb'
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import { schema } from './schema'
import { migrations } from './migrations'
import { models } from './models'

let database: Database | null = null

export function getDatabase(): Database {
  if (database) return database

  const adapter = new LokiJSAdapter({
    schema,
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    dbName: 'ale_learning_db',
  })

  database = new Database({
    adapter,
    modelClasses: models,
  })

  return database
}

/** データベースをリセット（開発・デバッグ用） */
export async function resetDatabase(): Promise<void> {
  const db = getDatabase()
  await db.write(async () => {
    await db.unsafeResetDatabase()
  })
}
