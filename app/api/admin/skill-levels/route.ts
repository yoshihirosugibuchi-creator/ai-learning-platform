import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/admin/skill-levels
 * スキルレベル一覧取得（管理者用）
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, role } = await getCurrentUserRole(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    // コース学習メンテナンス機能は管理者でもアクセス可能
    if (!role || (role !== 'admin' && role !== 'system_admin')) {
      return NextResponse.json(
        { error: '管理者のアクセス権限が必要です' },
        { status: 403 }
      )
    }

    console.log('📋 [AdminSkillLevels] スキルレベル一覧取得開始')

    // スキルレベル一覧を取得
    const { data: skillLevels, error } = await supabaseAdmin
      .from('skill_levels')
      .select(`
        id,
        display_name,
        display_order
      `)
      .order('display_order')

    if (error) {
      console.error('❌ [AdminSkillLevels] データベースエラー:', error)
      return NextResponse.json(
        { error: 'スキルレベルデータの取得に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminSkillLevels] ${skillLevels?.length || 0}件のスキルレベルを取得`)

    // フロントエンド用に形式変換
    const formattedSkillLevels = (skillLevels || []).map(level => ({
      id: level.id,
      label: level.display_name,
      display_order: level.display_order
    }))

    return NextResponse.json({
      success: true,
      skillLevels: formattedSkillLevels
    })

  } catch (error) {
    console.error('❌ [AdminSkillLevels] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'スキルレベル一覧取得中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}