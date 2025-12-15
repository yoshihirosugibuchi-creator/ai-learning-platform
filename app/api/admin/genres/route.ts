import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/admin/genres
 * 新しいジャンル作成（管理者用）
 */
export async function POST(request: NextRequest) {
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

    const createData = await request.json()

    console.log(`🔄 [AdminGenres] ジャンル新規作成開始`)

    // 必須フィールドの検証
    const requiredFields = ['title', 'description', 'course_id', 'category_id']
    for (const field of requiredFields) {
      if (!createData[field]) {
        return NextResponse.json(
          { error: `${field}は必須です` },
          { status: 400 }
        )
      }
    }

    // フィールドバリデーション
    if (createData.estimated_days && (createData.estimated_days < 1 || createData.estimated_days > 30)) {
      return NextResponse.json(
        { error: '予想日数は1-30日の範囲で入力してください' },
        { status: 400 }
      )
    }

    if (createData.display_order && createData.display_order < 1) {
      return NextResponse.json(
        { error: '表示順序は1以上で入力してください' },
        { status: 400 }
      )
    }

    // タイトルから適切なIDを生成（例: "AI基礎理解" → "ai_basics"）
    const generateGenreId = (title: string): string => {
      // 既存データのパターンを参考に意味のあるIDを生成
      const baseId = title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_') // 英数字以外をアンダースコアに
        .replace(/_+/g, '_') // 連続するアンダースコアを1つに
        .replace(/^_|_$/g, '') // 先頭末尾のアンダースコアを削除
        .slice(0, 20); // 最大20文字に制限
      
      // より適切な英語IDに変換（簡単な例）
      const translations: { [key: string]: string } = {
        'ai基礎': 'ai_fundamentals',
        'ai基礎理解': 'ai_fundamentals', 
        'プロンプト': 'prompt',
        'マーケティング': 'marketing',
        '基礎': 'basics',
        '応用': 'advanced',
        '実践': 'practice',
        '入門': 'introduction',
        '基本': 'basics'
      };
      
      let generatedId = baseId;
      for (const [jp, en] of Object.entries(translations)) {
        generatedId = generatedId.replace(jp, en);
      }
      
      return generatedId || 'new_genre';
    }

    const baseGenreId = generateGenreId(createData.title);
    
    // IDの重複チェックと調整
    let genreId = baseGenreId;
    let counter = 1;
    
    while (true) {
      const { data: _existing, error: checkError } = await supabaseAdmin
        .from('learning_genres')
        .select('id')
        .eq('id', genreId)
        .single()
        
      if (checkError && checkError.code === 'PGRST116') {
        // IDが存在しない場合は使用可能
        break;
      } else if (checkError) {
        console.error('❌ [AdminGenres] ID重複チェックエラー:', checkError)
        return NextResponse.json(
          { error: 'ジャンルID重複チェックに失敗しました' },
          { status: 500 }
        )
      } else {
        // IDが既に存在する場合は番号を付けて再試行
        genreId = `${baseGenreId}_${counter}`
        counter++
        
        if (counter > 100) {
          return NextResponse.json(
            { error: '適切なジャンルIDを生成できませんでした' },
            { status: 500 }
          )
        }
      }
    }

    // 新しいジャンルデータの準備
    const genreData = {
      id: genreId,
      course_id: createData.course_id,
      title: createData.title.trim(),
      description: createData.description.trim(),
      estimated_days: createData.estimated_days || 7,
      display_order: createData.display_order || 1,
      badge_data: createData.badge_data || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // badge_dataの構造検証
    if (genreData.badge_data) {
      const badgeData = genreData.badge_data
      const requiredBadgeFields = ['id', 'icon', 'color', 'title', 'description']
      
      for (const field of requiredBadgeFields) {
        if (!badgeData[field]) {
          return NextResponse.json(
            { error: `バッジデータの${field}は必須です` },
            { status: 400 }
          )
        }
      }
    }

    // UIから送信されたcategory_id/subcategory_idを使用
    const fullGenreData = {
      ...genreData,
      category_id: createData.category_id,
      subcategory_id: createData.subcategory_id || null
    }

    // データベース挿入
    const { data: createdGenre, error: insertError } = await supabaseAdmin
      .from('learning_genres')
      .insert(fullGenreData)
      .select('id, title, course_id')
      .single()

    if (insertError) {
      console.error('❌ [AdminGenres] 挿入エラー:', insertError)
      return NextResponse.json(
        { error: 'ジャンルの作成に失敗しました' },
        { status: 500 }
      )
    }

    console.log(`✅ [AdminGenres] ジャンル作成完了: ${createdGenre.title}`)

    return NextResponse.json({
      success: true,
      genre: createdGenre,
      message: `ジャンル「${createdGenre.title}」を作成しました`
    })

  } catch (error) {
    console.error('❌ [AdminGenres] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'ジャンル作成中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}