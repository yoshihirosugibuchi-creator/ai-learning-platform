import { createClient } from '@supabase/supabase-js'
import type { Database } from './database-types-official'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const _supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Public client for regular operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Admin client with service role key for admin operations
// 遅延初期化でサービスキーの存在をチェック
function createSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found at runtime')
    throw new Error('❌ SUPABASE_SERVICE_ROLE_KEY is required for admin operations. Please check your environment variables.')
  }
  
  return createClient<Database>(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// 遅延初期化プロキシの型定義
type SupabaseAdminClient = ReturnType<typeof createSupabaseAdmin>
type ProxyTarget = { _client?: SupabaseAdminClient }

// 遅延初期化プロキシ
export const supabaseAdmin = new Proxy({} as ProxyTarget, {
  get(target: ProxyTarget, prop: string | symbol): unknown {
    // 初回アクセス時にクライアントを作成
    if (!target._client) {
      target._client = createSupabaseAdmin()
    }
    const client = target._client
    return client[prop as keyof SupabaseAdminClient]
  }
}) as SupabaseAdminClient

export default supabase