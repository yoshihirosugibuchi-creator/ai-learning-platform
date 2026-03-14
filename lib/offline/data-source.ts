/**
 * ローカルファースト データソース解決ユーティリティ
 * PC（database=null）→ サーバー直接
 * モバイル（database=Database）→ ローカルDB優先 → サーバーフォールバック
 */
import type { Database as WMDatabase } from '@nozbe/watermelondb'

export type DataSource<T> = {
  loadFromLocal: (db: WMDatabase) => Promise<T | null>
  loadFromServer: (userId?: string) => Promise<T>
}

/**
 * データソースを解決する汎用関数
 * @param source ローカル/サーバー読み込み関数
 * @param database WatermelonDBインスタンス（null=PC→サーバー直接）
 * @param userId ユーザーID（ユーザーデータの場合に使用）
 */
export async function resolveData<T>(
  source: DataSource<T>,
  database: WMDatabase | null,
  userId?: string
): Promise<T> {
  // PC（database=null）→ サーバー直接
  if (!database) return source.loadFromServer(userId)

  // モバイル → ローカルDB優先
  try {
    const local = await source.loadFromLocal(database)
    if (local !== null) return local
  } catch (e) {
    console.warn('⚠️ Local DB read failed, falling back to server:', e)
  }

  // フォールバック → サーバー
  return source.loadFromServer(userId)
}
