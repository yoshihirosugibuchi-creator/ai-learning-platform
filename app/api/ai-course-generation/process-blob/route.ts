/**
 * Vercel Blob URL からPDFテキスト抽出API
 * POST: Blob URLを受け取り、PDFを解析してSourceMaterialを返す
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { createSourceMaterial, validateSourceMaterial } from '@/lib/ai-course-generation/content-parser'

// pdf-parse動的インポート
let PDFParseClass: typeof import('pdf-parse').PDFParse | null = null

async function loadPDFParser(): Promise<typeof import('pdf-parse').PDFParse | null> {
  if (typeof window === 'undefined' && !PDFParseClass) {
    try {
      const { PDFParse } = await import('pdf-parse')
      PDFParseClass = PDFParse
      console.log('PDF parser loaded successfully')
    } catch (error) {
      console.error('PDF parser not available:', error)
      return null
    }
  }
  return PDFParseClass
}

// テキスト清浄化
function cleanExtractedText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF.,!?;:()\[\]{}「」『』、。！？；：（）【】]/g, '')
    .trim()
}

// 単語数推定
function estimateWordCount(text: string): number {
  const japaneseChars = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g)
  const japaneseCount = japaneseChars ? japaneseChars.length : 0
  const englishWords = text.match(/[a-zA-Z]+/g)
  const englishCount = englishWords ? englishWords.length : 0
  return japaneseCount + englishCount
}

// 言語検出
function detectLanguage(text: string): string {
  const sample = text.slice(0, 500)
  const japaneseChars = (sample.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length
  const totalChars = sample.replace(/\s/g, '').length

  if (totalChars === 0) return 'unknown'
  const japaneseRatio = japaneseChars / totalChars

  if (japaneseRatio > 0.3) return 'ja'
  if (sample.match(/[a-zA-Z]/g)) return 'en'
  return 'unknown'
}

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

    const body = await request.json()
    const { blobUrl, title, fileName, fileSize } = body

    if (!blobUrl) {
      return NextResponse.json(
        { error: 'blobUrlが必要です' },
        { status: 400 }
      )
    }

    console.log(`📄 [Process Blob] Processing: ${blobUrl}`)

    // PDFパーサーロード
    const PDFParseClass = await loadPDFParser()
    if (!PDFParseClass) {
      return NextResponse.json(
        { error: 'PDF解析ライブラリが利用できません' },
        { status: 500 }
      )
    }

    // BlobからPDFをダウンロード
    console.log(`📥 [Process Blob] Downloading PDF from Blob...`)
    const pdfResponse = await fetch(blobUrl)

    if (!pdfResponse.ok) {
      return NextResponse.json(
        { error: `PDFのダウンロードに失敗しました: ${pdfResponse.status}` },
        { status: 400 }
      )
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    const buffer = Buffer.from(pdfBuffer)

    console.log(`📄 [Process Blob] PDF downloaded: ${buffer.length} bytes`)

    // PDF解析
    const parser = new PDFParseClass({ data: buffer })
    const result = await parser.getText()
    await parser.destroy()

    console.log(`✅ [Process Blob] Text extracted: ${result.text.length} characters`)

    // テキスト清浄化
    const cleanText = cleanExtractedText(result.text)

    // SourceMaterial作成
    const parseResult = {
      success: true,
      content: cleanText,
      metadata: {
        pageCount: 1,
        wordCount: estimateWordCount(cleanText),
        language: detectLanguage(cleanText)
      }
    }

    const sourceMaterial = createSourceMaterial(
      'pdf',
      title || fileName || 'PDF',
      parseResult,
      undefined,
      fileSize
    )

    // Blob Storage情報を追加
    sourceMaterial.blobStorage = {
      url: blobUrl,
      uploadedAt: new Date().toISOString(),
      publicWarningAccepted: true
    }

    // 検証
    const validation = validateSourceMaterial(sourceMaterial)
    if (!validation.valid) {
      return NextResponse.json(
        { error: `検証エラー: ${validation.errors.join(', ')}` },
        { status: 400 }
      )
    }

    console.log(`✅ [Process Blob] Successfully processed: ${sourceMaterial.title}`)

    return NextResponse.json({
      success: true,
      source: sourceMaterial,
      stats: {
        type: 'pdf',
        originalSize: fileSize,
        extractedLength: sourceMaterial.content.length,
        wordCount: sourceMaterial.metadata?.wordCount,
        pageCount: sourceMaterial.metadata?.pageCount,
        language: sourceMaterial.metadata?.language,
        blobStorageUsed: true
      }
    })

  } catch (error) {
    console.error('❌ [Process Blob] Error:', error)
    return NextResponse.json(
      { error: 'PDFの処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
