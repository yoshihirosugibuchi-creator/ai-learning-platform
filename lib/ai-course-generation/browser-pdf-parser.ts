/**
 * ブラウザ内PDF解析ユーティリティ
 * クライアントサイドでPDFからテキストを抽出
 * Vercelの4.5MBリクエストボディ制限を回避するため
 */

'use client'

import * as pdfjsLib from 'pdfjs-dist'

// PDF.js Worker設定（ローカルファイル使用）
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
}

export interface BrowserPDFParseResult {
  success: boolean
  text: string
  pageCount: number
  error?: string
}

/**
 * ブラウザ内でPDFファイルからテキストを抽出
 */
export async function parsePDFInBrowser(file: File): Promise<BrowserPDFParseResult> {
  try {
    console.log(`📄 [Browser PDF Parser] Processing: ${file.name} (${file.size} bytes)`)

    // FileをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer()

    // PDF.jsでドキュメントを読み込み
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
    const pdf = await loadingTask.promise

    console.log(`📖 [Browser PDF Parser] PDF loaded: ${pdf.numPages} pages`)

    // 全ページからテキストを抽出
    const textParts: string[] = []

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const textContent = await page.getTextContent()

      const pageText = textContent.items
        .map((item) => {
          if ('str' in item) {
            return item.str
          }
          return ''
        })
        .join(' ')

      textParts.push(pageText)
    }

    const fullText = textParts.join('\n\n')
    const cleanedText = cleanExtractedText(fullText)

    console.log(`✅ [Browser PDF Parser] Extracted ${cleanedText.length} characters from ${pdf.numPages} pages`)

    return {
      success: true,
      text: cleanedText,
      pageCount: pdf.numPages
    }

  } catch (error) {
    console.error('❌ [Browser PDF Parser] Error:', error)
    return {
      success: false,
      text: '',
      pageCount: 0,
      error: error instanceof Error ? error.message : 'PDF解析に失敗しました'
    }
  }
}

/**
 * テキスト清浄化
 */
function cleanExtractedText(text: string): string {
  return text
    // 複数の空白・改行を整理
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    // 不要な制御文字を削除（日本語・英語・記号は保持）
    .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3400-\u4DBF.,!?;:()\[\]{}「」『』、。！？；：（）【】\-・]/g, '')
    // 前後の空白削除
    .trim()
}

/**
 * 単語数推定（日本語対応）
 */
export function estimateWordCount(text: string): number {
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
export function detectLanguage(text: string): string {
  const sample = text.slice(0, 500)

  const japaneseChars = (sample.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length
  const totalChars = sample.replace(/\s/g, '').length

  if (totalChars === 0) return 'unknown'

  const japaneseRatio = japaneseChars / totalChars

  if (japaneseRatio > 0.3) return 'ja'
  if (sample.match(/[a-zA-Z]/g)) return 'en'

  return 'unknown'
}
