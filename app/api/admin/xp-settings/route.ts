import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { clearXPSettingsCache } from '@/lib/xp-settings'

// リクエストヘッダーから認証情報を取得してSupabaseクライアントを作成
function getSupabaseWithAuth(request: Request) {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    throw new Error('No authorization header')
  }

  const token = authHeader.replace('Bearer ', '')
  
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  )
}

interface XPSettingRequest {
  setting_category: string
  setting_key: string
  setting_value: number
  setting_description?: string
}

// GET: 全XP設定を取得
export async function GET(request: Request) {
  try {
    console.log('📋 XP Settings API - GET Request')

    // 認証付きSupabaseクライアント作成
    let supabase
    try {
      supabase = getSupabaseWithAuth(request)
    } catch (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // 認証確認
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ User error:', userError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 全設定を取得
    const { data: settings, error } = await supabase
      .from('xp_level_skp_settings')
      .select('*')
      .eq('is_active', true)
      .order('setting_category', { ascending: true })
      .order('setting_key', { ascending: true })

    if (error) {
      throw new Error(`Settings fetch error: ${error.message}`)
    }

    // カテゴリ別に整理
    const organizedSettings = {
      xp_quiz: settings?.filter(s => s.setting_category === 'xp_quiz') || [],
      xp_course: settings?.filter(s => s.setting_category === 'xp_course') || [],
      xp_bonus: settings?.filter(s => s.setting_category === 'xp_bonus') || [],
      level: settings?.filter(s => s.setting_category === 'level') || [],
      skp: settings?.filter(s => s.setting_category === 'skp') || []
    }

    console.log('✅ XP Settings retrieved:', {
      total: settings?.length || 0,
      xp_quiz: organizedSettings.xp_quiz.length,
      xp_course: organizedSettings.xp_course.length,
      xp_bonus: organizedSettings.xp_bonus.length,
      level: organizedSettings.level.length,
      skp: organizedSettings.skp.length
    })

    return NextResponse.json({
      success: true,
      settings: organizedSettings,
      total: settings?.length || 0
    })

  } catch (error) {
    console.error('❌ XP Settings GET API Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch XP settings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT: XP設定を更新
export async function PUT(request: Request) {
  try {
    console.log('🔧 XP Settings API - PUT Request')

    const body: XPSettingRequest = await request.json()
    
    // 認証付きSupabaseクライアント作成
    let supabase
    try {
      supabase = getSupabaseWithAuth(request)
    } catch (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // 認証確認
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ User error:', userError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // バリデーション
    if (!body.setting_category || !body.setting_key || typeof body.setting_value !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: setting_category, setting_key, setting_value' },
        { status: 400 }
      )
    }

    if (body.setting_value < 0) {
      return NextResponse.json(
        { error: 'Setting value must be non-negative' },
        { status: 400 }
      )
    }

    // 設定を更新（upsert）
    const { data: updatedSetting, error: updateError } = await supabase
      .from('xp_level_skp_settings')
      .upsert({
        setting_category: body.setting_category,
        setting_key: body.setting_key,
        setting_value: body.setting_value,
        setting_description: body.setting_description,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_category,setting_key',
        ignoreDuplicates: false
      })
      .select()

    if (updateError) {
      throw new Error(`Setting update error: ${updateError.message}`)
    }

    // キャッシュをクリア
    clearXPSettingsCache()

    console.log('✅ XP Setting updated:', {
      category: body.setting_category,
      key: body.setting_key,
      value: body.setting_value,
      description: body.setting_description
    })

    return NextResponse.json({
      success: true,
      setting: updatedSetting?.[0] || body,
      message: 'XP setting updated successfully'
    })

  } catch (error) {
    console.error('❌ XP Settings PUT API Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to update XP setting',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// POST: 複数のXP設定を一括更新
export async function POST(request: Request) {
  try {
    console.log('🔧 XP Settings API - POST (Batch Update) Request')

    const body: { settings: XPSettingRequest[] } = await request.json()
    
    // 認証付きSupabaseクライアント作成
    let supabase
    try {
      supabase = getSupabaseWithAuth(request)
    } catch (authError) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    
    // 認証確認
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('❌ User error:', userError)
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // バリデーション
    if (!body.settings || !Array.isArray(body.settings)) {
      return NextResponse.json(
        { error: 'Settings array is required' },
        { status: 400 }
      )
    }

    // 各設定をバリデーション
    for (const setting of body.settings) {
      if (!setting.setting_category || !setting.setting_key || typeof setting.setting_value !== 'number') {
        return NextResponse.json(
          { error: 'Invalid setting format: missing required fields' },
          { status: 400 }
        )
      }
      if (setting.setting_value < 0) {
        return NextResponse.json(
          { error: 'All setting values must be non-negative' },
          { status: 400 }
        )
      }
    }

    // 一括更新用データ準備
    const upsertData = body.settings.map(setting => ({
      setting_category: setting.setting_category,
      setting_key: setting.setting_key,
      setting_value: setting.setting_value,
      setting_description: setting.setting_description,
      is_active: true,
      updated_at: new Date().toISOString()
    }))

    // 一括更新実行
    const { data: updatedSettings, error: updateError } = await supabase
      .from('xp_level_skp_settings')
      .upsert(upsertData, {
        onConflict: 'setting_category,setting_key',
        ignoreDuplicates: false
      })
      .select()

    if (updateError) {
      throw new Error(`Batch update error: ${updateError.message}`)
    }

    // キャッシュをクリア
    clearXPSettingsCache()

    console.log('✅ XP Settings batch updated:', {
      updated_count: updatedSettings?.length || 0,
      categories: [...new Set(body.settings.map(s => s.setting_category))]
    })

    return NextResponse.json({
      success: true,
      updated_settings: updatedSettings || [],
      updated_count: updatedSettings?.length || 0,
      message: `${updatedSettings?.length || 0} XP settings updated successfully`
    })

  } catch (error) {
    console.error('❌ XP Settings POST API Error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to batch update XP settings',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}