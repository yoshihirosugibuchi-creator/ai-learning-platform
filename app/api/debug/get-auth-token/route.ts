// システム管理者認証トークン取得API（開発環境専用）
// バッチテスト用のアクセストークン生成

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/debug/get-auth-token
 * 開発環境でのバッチテスト用にシステム管理者トークンを生成
 */
export async function POST(request: NextRequest) {
  try {
    // 開発環境以外では拒否
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'This endpoint is only available in development' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { 
      user_email: _user_email = 'admin@test.com',
      user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
    } = body

    console.log(`[認証トークン取得] ユーザー: ${user_id}`)

    // 1. システム管理者ユーザーの確認
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role, email')
      .eq('id', user_id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: `ユーザーが見つかりません: ${userError?.message}` },
        { status: 404 }
      )
    }

    if (userData.role !== 'system_admin') {
      return NextResponse.json(
        { error: 'システム管理者権限が必要です' },
        { status: 403 }
      )
    }

    // 2. Supabaseの認証セッション作成を試行
    // 注意: これは開発環境専用の簡易実装
    const _testToken = `dev-token-${user_id}-${Date.now()}`

    // 3. 実際のSupabase認証トークンの代替として、サービスロールキーを返す
    // 本来はユーザー認証が必要だが、開発環境では簡略化
    const authToken = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!authToken) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY が設定されていません' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      auth_info: {
        user_id: userData.id,
        user_role: userData.role,
        user_email: userData.email,
        auth_token: authToken,
        note: '開発環境用: サービスロールキーを認証トークンとして使用'
      },
      usage_example: {
        header: `Authorization: Bearer ${authToken}`,
        curl_example: `curl -H "Authorization: Bearer ${authToken}" -X POST http://localhost:3000/api/admin/daily-analytics-batch`
      }
    })

  } catch (error) {
    console.error('[認証トークン取得] エラー:', error)
    return NextResponse.json(
      {
        success: false,
        error: '認証トークン取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}