import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAllProviders } from '@/lib/ai-providers'

/**
 * AI採点設定API
 * GET  /api/admin/case-study/ai-settings - デフォルトプロバイダー + 全プロバイダー一覧
 * PUT  /api/admin/case-study/ai-settings - デフォルトプロバイダー変更
 */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function checkAdminAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization')

  if (process.env.NODE_ENV === 'development') {
    const testUserId = request.headers.get('x-test-user-id')
    const testRole = request.headers.get('x-test-role')
    if (testUserId && testRole && ['admin', 'system_admin'].includes(testRole)) {
      return { userId: testUserId, role: testRole }
    }
  }

  if (!authHeader?.startsWith('Bearer ')) return null

  const supabaseAdmin = getSupabaseAdmin()
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null

  const { data: userData } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'system_admin'].includes(userData.role)) return null
  return { userId: user.id, role: userData.role }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    // デフォルトプロバイダー設定を取得
    const { data: config } = await supabaseAdmin
      .from('ai_system_config')
      .select('value')
      .eq('key', 'case_study_scoring_provider')
      .single()

    const defaultProvider = config?.value
      ? (typeof config.value === 'string' ? config.value : JSON.stringify(config.value))
      : 'huggingface'

    // 全プロバイダーの状態を取得
    const providers = getAllProviders()

    return NextResponse.json({
      success: true,
      default_provider: defaultProvider,
      providers,
    })
  } catch (error) {
    console.error('AI settings GET error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await checkAdminAuth(request)
    if (!auth) {
      return NextResponse.json({ success: false, error: '管理者権限が必要です' }, { status: 403 })
    }

    const body = await request.json()
    const { default_provider } = body

    const validProviders = ['huggingface', 'openai', 'anthropic', 'gemini']
    if (!default_provider || !validProviders.includes(default_provider)) {
      return NextResponse.json(
        { success: false, error: '無効なプロバイダーです' },
        { status: 400 }
      )
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { error } = await supabaseAdmin
      .from('ai_system_config')
      .upsert({
        key: 'case_study_scoring_provider',
        value: default_provider,
        description: 'ケーススタディAI採点のデフォルトプロバイダー',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' })

    if (error) {
      console.error('AI settings update error:', error)
      return NextResponse.json(
        { success: false, error: '設定の更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      default_provider,
    })
  } catch (error) {
    console.error('AI settings PUT error:', error)
    return NextResponse.json(
      { success: false, error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
