import { createClient } from '@supabase/supabase-js'
import type { Database } from './database-types-official'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Public client for regular operations
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// For admin operations, use the same client since RLS is currently disabled
// In production, this would use SUPABASE_SERVICE_ROLE_KEY for admin operations
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseAnonKey)

export default supabase