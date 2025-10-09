import { createClient } from '@supabase/supabase-js'
import type { Database } from './database-types-official'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Public client for regular operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Admin client with service role key for admin operations
// サービスキーがない場合は、使用時にエラーを出すプロキシオブジェクトを作成
export const supabaseAdmin = supabaseServiceKey 
  ? createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : new Proxy({} as typeof supabase, {
      get() {
        throw new Error('❌ SUPABASE_SERVICE_ROLE_KEY is required for admin operations. Please check your environment variables.')
      }
    })

export default supabase