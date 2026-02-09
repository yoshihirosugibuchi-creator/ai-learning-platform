'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface MermaidRendererProps {
  chart: string
  className?: string
}

// Mermaidのグローバル初期化フラグ
let mermaidInitialized = false

/**
 * Mermaidで問題を起こす文字を修正
 * - ラベル内のリテラル \n（バックスラッシュ+n の2文字）を空白に変換
 * - 余分なスペースを整理
 */
function sanitizeMermaidChart(text: string): string {
  if (!text) return text

  try {
    let result = text

    // ノードラベル内のリテラル \n（バックスラッシュ+nの2文字）を空白に変換
    // DBから取得したデータでは ["テキスト\n改行"] の \n はリテラルな2文字
    const literalBackslashN = String.raw`\n` // 確実に2文字（バックスラッシュとn）

    // ダブルクォート付きラベル ["..."]
    result = result.replace(/\["([^"]*)"\]/g, (match) => {
      const content = match.slice(2, -2).split(literalBackslashN).join(' ')
      return `["${content}"]`
    })

    // 通常のラベル [...] (ただしダブルクォートなし、ネストなし)
    result = result.replace(/\[([^\[\]"]+)\]/g, (match) => {
      if (match.includes(literalBackslashN)) {
        const content = match.slice(1, -1).split(literalBackslashN).join(' ')
        return `[${content}]`
      }
      return match
    })

    // 丸括弧ラベル (...)
    result = result.replace(/\(([^()]+)\)/g, (match) => {
      if (match.includes(literalBackslashN)) {
        const content = match.slice(1, -1).split(literalBackslashN).join(' ')
        return `(${content})`
      }
      return match
    })

    // 中括弧ラベル {...}（決定ノード用）
    result = result.replace(/\{([^{}]+)\}/g, (match) => {
      if (match.includes(literalBackslashN)) {
        const content = match.slice(1, -1).split(literalBackslashN).join(' ')
        return `{${content}}`
      }
      return match
    })

    // 余分なスペースを整理（改行は保持）
    result = result.replace(/\[" +/g, '["')
    result = result.replace(/ +"\]/g, '"]')
    // 連続する半角スペースのみ整理（改行は維持）
    result = result.replace(/ {2,}/g, ' ')

    return result
  } catch (e) {
    console.warn('Mermaid sanitization failed, using original text:', e)
    return text
  }
}

export default function MermaidRenderer({ chart, className = '' }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const renderChart = useCallback(async () => {
    if (!chart.trim()) {
      setIsLoading(false)
      return
    }

    try {
      // Dynamic import to avoid SSR issues
      const mermaid = (await import('mermaid')).default

      // Initialize mermaid only once
      if (!mermaidInitialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
          securityLevel: 'loose',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        })
        mermaidInitialized = true
        console.log('✅ Mermaid initialized')
      }

      // Generate unique ID for this chart
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Sanitize the chart (remove emojis, fix labels)
      const sanitizedChart = sanitizeMermaidChart(chart.trim())

      // デバッグ: サニタイズ前後を比較
      if (chart !== sanitizedChart) {
        console.log('🔧 Mermaid chart sanitized:', {
          originalLength: chart.length,
          sanitizedLength: sanitizedChart.length,
          hasLiteralBackslashN: chart.includes(String.raw`\n`),
          sanitizedHasLiteralBackslashN: sanitizedChart.includes(String.raw`\n`),
        })
      }

      // Render the chart
      const { svg: renderedSvg } = await mermaid.render(id, sanitizedChart)
      setSvg(renderedSvg)
      setError(null)
      console.log('✅ Mermaid chart rendered successfully')
    } catch (err) {
      console.error('❌ Mermaid rendering error:', err)
      setError(err instanceof Error ? err.message : 'Failed to render diagram')
      setSvg('')
    } finally {
      setIsLoading(false)
    }
  }, [chart])

  useEffect(() => {
    setIsLoading(true)
    setSvg('')
    setError(null)

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      renderChart()
    }, 100)

    return () => clearTimeout(timer)
  }, [renderChart])

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="text-red-600 text-sm font-medium mb-2">図の表示エラー</div>
        <pre className="text-xs text-red-500 overflow-x-auto whitespace-pre-wrap">{error}</pre>
        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer">ソースを表示</summary>
          <pre className="text-xs text-gray-600 mt-2 overflow-x-auto whitespace-pre-wrap bg-gray-100 p-2 rounded">{chart}</pre>
        </details>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
          <span className="ml-2 text-sm text-gray-500">図を読み込み中...</span>
        </div>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
        <div className="text-yellow-700 text-sm">図を表示できませんでした</div>
        <details className="mt-2">
          <summary className="text-xs text-gray-500 cursor-pointer">ソースを表示</summary>
          <pre className="text-xs text-gray-600 mt-2 overflow-x-auto whitespace-pre-wrap bg-gray-100 p-2 rounded">{chart}</pre>
        </details>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`mermaid-container bg-white border border-gray-200 rounded-lg p-4 overflow-x-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

/**
 * Parse content and extract mermaid code blocks
 * Returns an array of content segments with type indicators
 */
export interface ContentSegment {
  type: 'text' | 'mermaid'
  content: string
}

export function parseContentWithMermaid(content: string): ContentSegment[] {
  const segments: ContentSegment[] = []
  // Match both ```mermaid and ``` mermaid (with space)
  const mermaidRegex = /```\s*mermaid\s*\n?([\s\S]*?)```/gi

  let lastIndex = 0
  let match

  while ((match = mermaidRegex.exec(content)) !== null) {
    // Add text before this mermaid block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim()
      if (textBefore) {
        segments.push({ type: 'text', content: textBefore })
      }
    }

    // Add the mermaid block
    const mermaidContent = match[1].trim()
    if (mermaidContent) {
      segments.push({ type: 'mermaid', content: mermaidContent })
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after last mermaid block
  if (lastIndex < content.length) {
    const remainingText = content.slice(lastIndex).trim()
    if (remainingText) {
      segments.push({ type: 'text', content: remainingText })
    }
  }

  // If no mermaid blocks found, return entire content as text
  if (segments.length === 0) {
    segments.push({ type: 'text', content })
  }

  return segments
}
