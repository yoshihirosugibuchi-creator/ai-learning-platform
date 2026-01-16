import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface CategoryMapping {
  genreId?: string
  genre_id?: string
  selectedCategoryId?: string
  selected_category_id?: string
  selectedSubcategoryId?: string
  selected_subcategory_id?: string
}

/**
 * POST /api/ai-course-generation/workflows/[id]/update-category-mappings
 * learning_genresテーブルのカテゴリマッピングを直接更新
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { id: workflowId } = await context.params
    console.log(`📋 [UpdateCategoryMappings] Starting update: workflowId=${workflowId}`)

    // リクエストボディ解析
    const body = await request.json()
    const { course_id, categoryMappings } = body

    if (!course_id) {
      return NextResponse.json(
        { error: 'course_idが指定されていません' },
        { status: 400 }
      )
    }

    if (!categoryMappings || !Array.isArray(categoryMappings) || categoryMappings.length === 0) {
      return NextResponse.json(
        { error: 'カテゴリマッピングが指定されていません' },
        { status: 400 }
      )
    }

    console.log(`📋 [UpdateCategoryMappings] course_id=${course_id}, mappings=${categoryMappings.length}`)

    // ワークフロー所有者確認
    const { data: workflow, error: workflowError } = await supabaseAdmin
      .from('ai_course_workflows')
      .select('id, user_id, outline_data')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single()

    if (workflowError || !workflow) {
      console.error('❌ [UpdateCategoryMappings] Workflow not found:', workflowError)
      return NextResponse.json(
        { error: 'ワークフローが見つかりません' },
        { status: 404 }
      )
    }

    // コースに紐づくジャンルを取得
    const { data: genres, error: genreError } = await supabaseAdmin
      .from('learning_genres')
      .select('id, title, display_order')
      .eq('course_id', course_id)
      .order('display_order', { ascending: true })

    if (genreError) {
      console.error('❌ [UpdateCategoryMappings] Genre fetch error:', genreError)
      return NextResponse.json(
        { error: 'ジャンル取得に失敗しました' },
        { status: 500 }
      )
    }

    if (!genres || genres.length === 0) {
      console.error('❌ [UpdateCategoryMappings] No genres found for course:', course_id)
      return NextResponse.json(
        { error: 'コースにジャンルが見つかりません' },
        { status: 404 }
      )
    }

    console.log(`📋 [UpdateCategoryMappings] Found ${genres.length} genres in course`)

    // outline_dataからジャンルIDマッピングを構築
    interface OutlineGenre {
      id: string
      title: string
    }
    const outlineData = workflow.outline_data as { genres?: OutlineGenre[] } | null
    const outlineGenres = outlineData?.genres || []

    // ジャンルIDマッピング（outline ID → DB ID）をタイトルベースで構築
    const genreIdMap: Record<string, string> = {}
    for (const outlineGenre of outlineGenres) {
      // タイトルでマッチング
      const matchedGenre = genres.find(g => g.title === outlineGenre.title)
      if (matchedGenre) {
        genreIdMap[outlineGenre.id] = matchedGenre.id
        console.log(`📋 [UpdateCategoryMappings] Mapped: ${outlineGenre.id} -> ${matchedGenre.id} (${outlineGenre.title})`)
      }
    }

    // display_orderベースのフォールバックマッピング
    for (let i = 0; i < outlineGenres.length && i < genres.length; i++) {
      const outlineGenre = outlineGenres[i]
      if (!genreIdMap[outlineGenre.id]) {
        genreIdMap[outlineGenre.id] = genres[i].id
        console.log(`📋 [UpdateCategoryMappings] Fallback mapped: ${outlineGenre.id} -> ${genres[i].id} (index ${i})`)
      }
    }

    // カテゴリマッピングを正規化（genreTitleも保持）
    interface NormalizedMapping {
      genre_id: string
      genre_title: string
      selected_category_id: string | undefined
      selected_subcategory_id: string | undefined
    }

    const normalizedMappings: NormalizedMapping[] = (categoryMappings as (CategoryMapping & { genreTitle?: string; genre_title?: string })[]).map(m => ({
      genre_id: m.genre_id || m.genreId || '',
      genre_title: (m as { genreTitle?: string; genre_title?: string }).genre_title || (m as { genreTitle?: string }).genreTitle || '',
      selected_category_id: m.selected_category_id || m.selectedCategoryId,
      selected_subcategory_id: m.selected_subcategory_id || m.selectedSubcategoryId
    }))

    console.log('📋 [UpdateCategoryMappings] Normalized mappings:', normalizedMappings.map(m => ({
      genre_id: m.genre_id,
      genre_title: m.genre_title,
      category: m.selected_category_id,
      subcategory: m.selected_subcategory_id
    })))

    // learning_genresテーブルを更新
    let updatedCount = 0
    for (let i = 0; i < normalizedMappings.length; i++) {
      const mapping = normalizedMappings[i]

      // DBジャンルIDを特定（複数の方法で試行）
      let dbGenreId: string | null = null
      let matchMethod = ''

      // 方法1: genreIdMapからの変換（outline_dataベース）
      if (mapping.genre_id && genreIdMap[mapping.genre_id]) {
        dbGenreId = genreIdMap[mapping.genre_id]
        matchMethod = 'genreIdMap'
      }

      // 方法2: タイトルでマッチング（最も堅牢）
      if (!dbGenreId && mapping.genre_title) {
        const matchedGenre = genres.find(g => g.title === mapping.genre_title)
        if (matchedGenre) {
          dbGenreId = matchedGenre.id
          matchMethod = 'title'
        }
      }

      // 方法3: display_order（インデックス）でマッチング
      if (!dbGenreId && i < genres.length) {
        dbGenreId = genres[i].id
        matchMethod = 'index'
      }

      // 方法4: 直接IDマッチング（既にDBのIDが入っている場合）
      if (!dbGenreId && mapping.genre_id) {
        const directMatch = genres.find(g => g.id === mapping.genre_id)
        if (directMatch) {
          dbGenreId = directMatch.id
          matchMethod = 'direct'
        }
      }

      if (!dbGenreId) {
        console.warn(`⚠️ [UpdateCategoryMappings] Could not find DB genre for mapping index ${i}: genre_id="${mapping.genre_id}", genre_title="${mapping.genre_title}"`)
        continue
      }

      console.log(`📋 [UpdateCategoryMappings] Matched genre: ${mapping.genre_title || mapping.genre_id} -> ${dbGenreId} (method: ${matchMethod})`)

      const { error: updateError } = await supabaseAdmin
        .from('learning_genres')
        .update({
          category_id: mapping.selected_category_id || undefined,
          subcategory_id: mapping.selected_subcategory_id || undefined,
          updated_at: new Date().toISOString()
        })
        .eq('id', dbGenreId)
        .eq('course_id', course_id)

      if (updateError) {
        console.error(`❌ [UpdateCategoryMappings] Update failed for genre ${dbGenreId}:`, updateError)
      } else {
        updatedCount++
        console.log(`✅ [UpdateCategoryMappings] Updated genre ${dbGenreId}: category=${mapping.selected_category_id}, subcategory=${mapping.selected_subcategory_id}`)
      }
    }

    console.log(`✅ [UpdateCategoryMappings] Completed: ${updatedCount}/${normalizedMappings.length} genres updated`)

    // ワークフローのcategory_mappingsも更新
    const { error: workflowUpdateError } = await supabaseAdmin
      .from('ai_course_workflows')
      .update({
        category_mappings: categoryMappings,
        updated_at: new Date().toISOString()
      })
      .eq('id', workflowId)
      .eq('user_id', userId)

    if (workflowUpdateError) {
      console.error('⚠️ [UpdateCategoryMappings] Workflow update failed:', workflowUpdateError)
    }

    return NextResponse.json({
      success: true,
      updated_count: updatedCount,
      total_mappings: normalizedMappings.length,
      course_id
    })

  } catch (error) {
    console.error('❌ [UpdateCategoryMappings] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'カテゴリマッピング更新中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
