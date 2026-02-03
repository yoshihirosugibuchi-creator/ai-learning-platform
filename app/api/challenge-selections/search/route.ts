import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * 選ばれし課題 コンテンツ検索API
 * GET: 利用可能なコンテンツを検索
 *
 * Query params:
 * - type: 'course' | 'quiz_pack' | 'case_study'
 * - q: 検索キーワード（オプション）
 */

export async function GET(request: NextRequest) {
  try {
    // 認証確認
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const query = searchParams.get('q')?.trim().toLowerCase() || ''

    if (!type || !['course', 'quiz_pack', 'case_study'].includes(type)) {
      return NextResponse.json({ error: '無効なタイプ' }, { status: 400 })
    }

    let items: Array<{ id: string; name: string; description?: string }> = []

    switch (type) {
      case 'course':
        items = await searchCourses(query)
        break
      case 'quiz_pack':
        items = await searchQuizPacks(query)
        break
      case 'case_study':
        items = await searchCaseStudies(query)
        break
    }

    return NextResponse.json({ success: true, items })

  } catch (error) {
    console.error('Challenge search error:', error)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

async function searchCourses(query: string) {
  // learning_courses テーブルからコースを取得
  const { data, error } = await supabaseAdmin
    .from('learning_courses')
    .select('id, title, description')
    .eq('status', 'available')
    .order('title')

  if (error) {
    console.error('Course search error:', error)
    return []
  }

  let courses = (data || []).map(c => ({
    id: c.id,
    name: c.title,
    description: c.description || ''
  }))

  // フリーワード検索
  if (query) {
    courses = courses.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query)
    )
  }

  return courses
}

async function searchQuizPacks(query: string) {
  const { data, error } = await supabaseAdmin
    .from('quiz_packs')
    .select('id, name, description')
    .eq('is_published', true)
    .order('name')

  if (error) {
    console.error('Quiz pack search error:', error)
    return []
  }

  let packs = (data || []).map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || ''
  }))

  // フリーワード検索
  if (query) {
    packs = packs.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query)
    )
  }

  return packs
}

async function searchCaseStudies(query: string) {
  const { data, error } = await supabaseAdmin
    .from('case_study_problems')
    .select('id, title, difficulty, industry')
    .eq('status', 'active')
    .order('title')

  if (error) {
    console.error('Case study search error:', error)
    return []
  }

  let cases = (data || []).map(c => ({
    id: c.id,
    name: c.title,
    description: [c.difficulty, c.industry].filter(Boolean).join(' / ')
  }))

  // フリーワード検索
  if (query) {
    cases = cases.filter(c =>
      c.name.toLowerCase().includes(query) ||
      c.description.toLowerCase().includes(query)
    )
  }

  return cases
}
