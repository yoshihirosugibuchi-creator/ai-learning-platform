import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { parsePDF, parseURL, parseText, createSourceMaterial, validateSourceMaterial, type SourceMaterial } from '@/lib/ai-course-generation/content-parser'
import { uploadToBlob, isBlobStorageEnabled, validateFileForBlob } from '@/lib/ai-course-generation/blob-storage'

/**
 * AI生成コース用参考資料アップロード・解析API
 * POST /api/ai-course-generation/upload-sources
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    console.log(`📁 [Upload Sources] Processing request for user: ${userId}`)

    const contentType = request.headers.get('content-type')
    
    // ファイルアップロード（multipart/form-data）
    if (contentType?.includes('multipart/form-data')) {
      return await handleFileUpload(request, userId)
    }
    
    // URLまたはテキスト（application/json）
    if (contentType?.includes('application/json')) {
      return await handleTextOrURL(request)
    }

    return NextResponse.json(
      { error: 'サポートされていないコンテンツタイプです' },
      { status: 400 }
    )

  } catch (error) {
    console.error('❌ [Upload Sources] Error:', error)
    return NextResponse.json(
      { error: '参考資料の処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * ファイルアップロード処理
 */
async function handleFileUpload(request: NextRequest, userId: string) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const title = formData.get('title') as string || file.name
    const useBlobStorage = formData.get('useBlobStorage') === 'true'
    const workflowId = formData.get('workflowId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      )
    }

    console.log(`📄 [File Upload] Processing file: ${file.name}, type: ${file.type}, size: ${file.size}, blob: ${useBlobStorage}`)

    // ファイル形式チェック
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: '現在PDFファイルのみサポートされています' },
        { status: 400 }
      )
    }

    // Blob Storage使用時のバリデーション
    if (useBlobStorage) {
      const blobValidation = validateFileForBlob(file)
      if (!blobValidation.valid) {
        return NextResponse.json(
          { error: blobValidation.error },
          { status: 400 }
        )
      }

      if (!isBlobStorageEnabled()) {
        return NextResponse.json(
          { error: 'Blob Storageが有効化されていません' },
          { status: 400 }
        )
      }
    }

    // PDF解析実行
    const parseResult = await parsePDF(file)
    
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error },
        { status: 400 }
      )
    }

    // Blob Storage アップロード（オプション）
    let blobData
    if (useBlobStorage) {
      console.log(`📦 [File Upload] Uploading to Blob Storage...`)
      const blobResult = await uploadToBlob(file, userId, workflowId)
      
      if (blobResult.success && blobResult.url) {
        blobData = {
          url: blobResult.url,
          uploadedAt: new Date().toISOString(),
          publicWarningAccepted: true
        }
        console.log(`✅ [File Upload] Blob Storage upload successful: ${blobResult.url}`)
      } else {
        console.error(`❌ [File Upload] Blob Storage upload failed: ${blobResult.error}`)
        // Blob Storage失敗はエラーにしない（テキスト抽出は成功している）
        console.log(`🔄 [File Upload] Proceeding with text extraction only`)
      }
    }

    // SourceMaterial作成（Blob Storage情報含む）
    const sourceMaterial = createSourceMaterial(
      'pdf',
      title,
      parseResult,
      undefined,
      file.size
    )

    // Blob Storage情報を追加
    if (blobData) {
      sourceMaterial.blobStorage = blobData
    }

    // 検証
    const validation = validateSourceMaterial(sourceMaterial)
    if (!validation.valid) {
      return NextResponse.json(
        { error: `検証エラー: ${validation.errors.join(', ')}` },
        { status: 400 }
      )
    }

    console.log(`✅ [File Upload] Successfully processed: ${sourceMaterial.title}`)

    return NextResponse.json({
      success: true,
      source: sourceMaterial,
      stats: {
        type: 'pdf',
        originalSize: file.size,
        extractedLength: sourceMaterial.content.length,
        wordCount: sourceMaterial.metadata?.wordCount,
        pageCount: sourceMaterial.metadata?.pageCount,
        language: sourceMaterial.metadata?.language,
        blobStorageUsed: !!blobData
      }
    })

  } catch (error) {
    console.error('❌ [File Upload] Error:', error)
    return NextResponse.json(
      { error: 'ファイルの処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * URL・テキスト処理
 */
async function handleTextOrURL(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, content, title, url } = body

    console.log(`📝 [Text/URL Processing] Type: ${type}, Content length: ${content?.length || 0}`)

    let parseResult
    let sourceMaterial: SourceMaterial

    switch (type) {
      case 'url':
        if (!url) {
          return NextResponse.json(
            { error: 'URLが指定されていません' },
            { status: 400 }
          )
        }

        parseResult = await parseURL(url)
        if (!parseResult.success) {
          return NextResponse.json(
            { error: parseResult.error },
            { status: 400 }
          )
        }

        sourceMaterial = createSourceMaterial(
          'url',
          title || 'Webサイト',
          parseResult,
          url
        )
        break

      case 'text':
        if (!content) {
          return NextResponse.json(
            { error: 'テキスト内容が指定されていません' },
            { status: 400 }
          )
        }

        parseResult = parseText(content, title)
        if (!parseResult.success) {
          return NextResponse.json(
            { error: parseResult.error },
            { status: 400 }
          )
        }

        sourceMaterial = createSourceMaterial(
          'text',
          title || 'テキスト入力',
          parseResult
        )
        break

      default:
        return NextResponse.json(
          { error: `サポートされていない種類です: ${type}` },
          { status: 400 }
        )
    }

    // 検証
    const validation = validateSourceMaterial(sourceMaterial)
    if (!validation.valid) {
      return NextResponse.json(
        { error: `検証エラー: ${validation.errors.join(', ')}` },
        { status: 400 }
      )
    }

    console.log(`✅ [Text/URL Processing] Successfully processed: ${sourceMaterial.title}`)

    return NextResponse.json({
      success: true,
      source: sourceMaterial,
      stats: {
        type: sourceMaterial.type,
        extractedLength: sourceMaterial.content.length,
        wordCount: sourceMaterial.metadata?.wordCount,
        language: sourceMaterial.metadata?.language
      }
    })

  } catch (error) {
    console.error('❌ [Text/URL Processing] Error:', error)
    return NextResponse.json(
      { error: 'コンテンツの処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * 参考資料一覧取得
 * GET /api/ai-course-generation/upload-sources?workflow_id=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflow_id')

    if (!workflowId) {
      return NextResponse.json(
        { error: 'workflow_idが必要です' },
        { status: 400 }
      )
    }

    // ワークフローから参考資料を取得
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const { data: workflow } = await supabaseAdmin
      .from('ai_course_workflows')
      .select('source_materials')
      .eq('id', workflowId)
      .eq('user_id', userId)
      .single()

    if (!workflow) {
      return NextResponse.json(
        { error: 'ワークフローが見つかりません' },
        { status: 404 }
      )
    }

    const sources = (workflow.source_materials as unknown as SourceMaterial[]) || []

    return NextResponse.json({
      success: true,
      sources,
      count: sources.length,
      totalWordCount: sources.reduce((sum, s) => sum + (s.metadata?.wordCount || 0), 0)
    })

  } catch (error) {
    console.error('❌ [Get Sources] Error:', error)
    return NextResponse.json(
      { error: '参考資料の取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}