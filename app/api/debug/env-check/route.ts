import { NextResponse } from 'next/server'

export async function GET() {
  try {
    return NextResponse.json({
      // 環境情報
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
      
      // Supabase接続確認（値の存在のみチェック）
      SUPABASE_URL_SET: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY_SET: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_KEY_SET: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      
      // URL確認（セキュリティのため最初の30文字のみ）
      SUPABASE_URL_PREFIX: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30),
      ANON_KEY_PREFIX: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30),
      
      // メンテナンス
      MAINTENANCE_MODE: process.env.MAINTENANCE_MODE,
      MAINTENANCE_MESSAGE: process.env.MAINTENANCE_MESSAGE,
      MAINTENANCE_END_TIME: process.env.MAINTENANCE_END_TIME,
      
      // タイムスタンプ
      CHECK_TIME: new Date().toISOString(),
    })
  } catch (_error) {
    return NextResponse.json({ error: 'Environment check failed' }, { status: 500 })
  }
}