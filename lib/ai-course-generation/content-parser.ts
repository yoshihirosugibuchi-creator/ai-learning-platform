/**
 * AI生成コース用コンテンツパーサー
 * PDF、URL、テキストからの内容抽出
 */

// PDF解析の代替実装（Turbopack対応）
let PDFParseClass: typeof import('pdf-parse').PDFParse | null = null

// 動的インポートでpdf-parseを読み込み（サーバーサイドのみ）
async function loadPDFParser(): Promise<typeof import('pdf-parse').PDFParse | null> {
  if (typeof window === 'undefined' && !PDFParseClass) {
    try {
      // pdf-parse 2.x はESMモジュール - PDFParseクラスを使用
      // pdf-parseは内部で独自のPDF.jsを使用するため、pdfjs-distの設定は不要
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
import * as cheerio from 'cheerio'

// サポートする参考資料の種類
export type SourceMaterialType = 'pdf' | 'url' | 'text'

// 参考資料の情報
export interface SourceMaterial {
  id: string
  type: SourceMaterialType
  title: string
  content: string
  originalUrl?: string
  fileSize?: number
  extractedAt: string
  metadata?: {
    pageCount?: number
    wordCount?: number
    language?: string
    author?: string
  }
  // Blob Storage オプション機能
  blobStorage?: {
    url: string
    uploadedAt: string
    publicWarningAccepted: boolean
  }
}

// パース結果
export interface ParseResult {
  success: boolean
  content: string
  metadata: SourceMaterial['metadata']
  error?: string
}

/**
 * PDFファイルからテキストを抽出
 */
export async function parsePDF(file: File): Promise<ParseResult> {
  try {
    console.log(`📄 [PDF Parser] Processing file: ${file.name} (${file.size} bytes)`)
    
    // PDF parserクラスロード
    const PDFParseClass = await loadPDFParser()
    if (!PDFParseClass) {
      return {
        success: false,
        content: '',
        metadata: {},
        error: 'PDF解析ライブラリが利用できません'
      }
    }
    
    // ファイルサイズチェック（50MB制限）
    const MAX_SIZE = 50 * 1024 * 1024 // 50MB
    if (file.size > MAX_SIZE) {
      return {
        success: false,
        content: '',
        metadata: {},
        error: `ファイルサイズが大きすぎます。上限: ${MAX_SIZE / 1024 / 1024}MB`
      }
    }

    // PDF → Buffer変換
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // PDFParseクラスを使用（v2 API）
    const parser = new PDFParseClass({ data: buffer })
    const result = await parser.getText()
    await parser.destroy() // メモリ解放
    
    console.log(`✅ [PDF Parser] Successfully extracted text, length: ${result.text.length} characters`)

    // テキスト清浄化
    const cleanText = cleanExtractedText(result.text)
    
    return {
      success: true,
      content: cleanText,
      metadata: {
        pageCount: 1, // pdf-parse v2 では numPages は利用できません
        wordCount: estimateWordCount(cleanText),
        language: detectLanguage(cleanText),
        author: undefined // pdf-parse v2 では info は利用できません
      }
    }
    
  } catch (error) {
    console.error('❌ [PDF Parser] Error:', error)
    return {
      success: false,
      content: '',
      metadata: {},
      error: `PDFの解析に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    }
  }
}

/**
 * URLからコンテンツを取得・抽出
 */
export async function parseURL(url: string): Promise<ParseResult> {
  try {
    console.log(`🌐 [URL Parser] Fetching content from: ${url}`)
    
    // URL妥当性チェック
    const urlObj = new URL(url)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('HTTPまたはHTTPSのURLのみサポートされています')
    }

    // コンテンツ取得
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-Course-Generator/1.0)'
      },
      // 10秒タイムアウト
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const html = await response.text()
    
    // HTMLからテキスト抽出
    const $ = cheerio.load(html)
    
    // 不要な要素を削除
    $('script, style, nav, header, footer, aside, .advertisement').remove()
    
    // メインコンテンツ抽出（優先順位付き）
    let content = ''
    const contentSelectors = [
      'main', 
      'article', 
      '.content', 
      '.post-content',
      '.entry-content',
      '.article-body',
      'body'
    ]
    
    for (const selector of contentSelectors) {
      const element = $(selector).first()
      if (element.length && element.text().trim().length > 100) {
        content = element.text()
        break
      }
    }

    // フォールバック: body全体
    if (!content) {
      content = $('body').text()
    }

    // テキスト清浄化
    const cleanContent = cleanExtractedText(content)
    
    // メタデータ抽出
    const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled'
    const author = $('meta[name="author"]').attr('content') || 
                   $('.author').first().text().trim() || 
                   undefined

    console.log(`✅ [URL Parser] Successfully extracted ${cleanContent.length} characters from ${title}`)

    return {
      success: true,
      content: cleanContent,
      metadata: {
        wordCount: estimateWordCount(cleanContent),
        language: detectLanguage(cleanContent),
        author
      }
    }
    
  } catch (error) {
    console.error('❌ [URL Parser] Error:', error)
    return {
      success: false,
      content: '',
      metadata: {},
      error: `URLの解析に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    }
  }
}

/**
 * テキスト直接入力の処理
 */
export function parseText(text: string, _title?: string): ParseResult {
  try {
    console.log(`📝 [Text Parser] Processing text input: ${text.length} characters`)
    
    // 最小長チェック
    if (text.trim().length < 10) {
      return {
        success: false,
        content: '',
        metadata: {},
        error: 'テキストが短すぎます。最低10文字以上入力してください。'
      }
    }

    // テキスト清浄化
    const cleanText = cleanExtractedText(text)
    
    console.log(`✅ [Text Parser] Successfully processed text: ${cleanText.length} characters`)

    return {
      success: true,
      content: cleanText,
      metadata: {
        wordCount: estimateWordCount(cleanText),
        language: detectLanguage(cleanText)
      }
    }
    
  } catch (error) {
    console.error('❌ [Text Parser] Error:', error)
    return {
      success: false,
      content: '',
      metadata: {},
      error: `テキストの処理に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
    }
  }
}

/**
 * 抽出テキストの清浄化
 */
function cleanExtractedText(text: string): string {
  return text
    // 複数の空白・改行を整理
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    // 不要な文字を削除
    .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF.,!?;:()\[\]{}「」『』、。！？；：（）【】]/g, '')
    // 前後の空白削除
    .trim()
}

/**
 * 単語数推定（日本語対応）
 */
function estimateWordCount(text: string): number {
  // 日本語文字（ひらがな、カタカナ、漢字）
  const japaneseChars = text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g)
  const japaneseCount = japaneseChars ? japaneseChars.length : 0
  
  // 英語単語
  const englishWords = text.match(/[a-zA-Z]+/g)
  const englishCount = englishWords ? englishWords.length : 0
  
  return japaneseCount + englishCount
}

/**
 * 言語検出（簡易版）
 */
function detectLanguage(text: string): string {
  const sample = text.slice(0, 500) // 最初の500文字で判定
  
  // 日本語文字の割合
  const japaneseChars = (sample.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length
  const totalChars = sample.replace(/\s/g, '').length
  
  if (totalChars === 0) return 'unknown'
  
  const japaneseRatio = japaneseChars / totalChars
  
  if (japaneseRatio > 0.3) return 'ja'
  if (sample.match(/[a-zA-Z]/g)) return 'en'
  
  return 'unknown'
}

/**
 * SourceMaterial オブジェクト作成ヘルパー
 */
export function createSourceMaterial(
  type: SourceMaterialType,
  title: string,
  parseResult: ParseResult,
  originalUrl?: string,
  fileSize?: number
): SourceMaterial {
  return {
    id: `source_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    content: parseResult.content,
    originalUrl,
    fileSize,
    extractedAt: new Date().toISOString(),
    metadata: parseResult.metadata
  }
}

/**
 * 参考資料の検証
 */
export function validateSourceMaterial(source: SourceMaterial): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!source.title || source.title.trim().length === 0) {
    errors.push('タイトルは必須です')
  }
  
  if (!source.content || source.content.trim().length < 10) {
    errors.push('コンテンツが不足しています（最低10文字）')
  }
  
  if (source.type === 'url' && !source.originalUrl) {
    errors.push('URL情報が不足しています')
  }
  
  if (source.content.length > 1000000) { // 1MB
    errors.push('コンテンツサイズが大きすぎます')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 複数の参考資料をまとめる
 */
export function combineSourceMaterials(sources: SourceMaterial[]): string {
  return sources.map((source, index) => `
=== 参考資料 ${index + 1}: ${source.title} ===
種類: ${source.type === 'pdf' ? 'PDF' : source.type === 'url' ? 'Webサイト' : 'テキスト'}
${source.originalUrl ? `URL: ${source.originalUrl}` : ''}
${source.metadata?.wordCount ? `単語数: ${source.metadata.wordCount.toLocaleString()}` : ''}

${source.content}

`).join('\n---\n\n')
}