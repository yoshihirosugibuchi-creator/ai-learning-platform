'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { ZoomIn } from 'lucide-react'
import FullscreenViewer from '@/components/ui/fullscreen-viewer'

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

    // stateDiagram: 遷移ラベル内の余分なコロンをハイフンに置換
    // 例: [*] --> Step1 : Step 1: 設計 → [*] --> Step1 : Step 1 - 設計
    // Mermaidパーサーがラベル内のコロンを状態説明セパレータと誤認するのを防止
    if (result.includes('stateDiagram')) {
      result = result.split('\n').map(line => {
        // 遷移行: State1 --> State2 : label（labelの中のコロンを修正）
        const transitionMatch = line.match(/^(\s*(?:\[\*\]|\S+)\s*-->\s*(?:\[\*\]|\S+)\s*:\s*)(.+)$/)
        if (transitionMatch) {
          const [, prefix, label] = transitionMatch
          return prefix + label.replace(/:/g, ' -')
        }
        return line
      }).join('\n')
    }

    // ラベル内の絵文字を除去（Mermaidパーサーが絵文字のバイト列を
    // ブラケット等の構文トークンと誤認するのを防止）
    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1FA00}-\u{1FA9F}\u{1FB00}-\u{1FBFF}\u{200D}\u{20E3}]/gu
    result = result.replace(emojiRegex, '')

    // mindmap: タブをスペースに統一（インデントが階層を決めるため重要）
    if (result.includes('mindmap')) {
      result = result.replace(/\t/g, '    ')
    }

    // 余分なスペースを整理（改行は保持）
    result = result.replace(/\[" +/g, '["')
    result = result.replace(/ +"\]/g, '"]')
    // 連続する半角スペースのみ整理（改行は維持）
    // ただしmindmapはインデントが重要なので行頭スペースを保持
    if (result.includes('mindmap')) {
      // mindmap: 行頭以外の連続スペースのみ整理
      result = result.split('\n').map(line => {
        const match = line.match(/^(\s*)(.*)$/)
        if (!match) return line
        const [, indent, content] = match
        return indent + content.replace(/ {2,}/g, ' ')
      }).join('\n')
    } else {
      result = result.replace(/ {2,}/g, ' ')
    }

    // 空ラベル [""] をスペースラベル [" "] に修正
    // （sanitize後に[" "]→[""]になるケースの救済。空文字ラベルはMermaidパースエラーの原因）
    result = result.replace(/\[""\]/g, '[" "]')

    return result
  } catch (e) {
    console.warn('Mermaid sanitization failed, using original text:', e)
    return text
  }
}

/**
 * SVGをレスポンシブに変換
 * - Mermaidが計算した元の幅をmax-widthとして保持（PCでの過剰拡大を防止）
 * - モバイルではコンテナ幅に自動縮小
 * - 中央揃えで表示
 * - foreignObjectのoverflow問題を修正
 */
function makeResponsiveSvg(svgString: string): string {
  let result = svgString.replace(
    /<svg\b([^>]*)>/,
    (_, attrs) => {
      const attrsStr = attrs as string

      // Mermaidが計算した元の幅を取得（width属性 or style内のmax-width）
      const widthAttrMatch = attrsStr.match(/width="(\d+(?:\.\d+)?)"/)
      const styleMaxWidthMatch = attrsStr.match(/max-width:\s*(\d+(?:\.\d+)?)px/)
      const originalWidth = widthAttrMatch?.[1] || styleMaxWidthMatch?.[1]

      const cleanAttrs = attrsStr
        .replace(/\s*width="[^"]*"/g, '')
        .replace(/\s*height="[^"]*"/g, '')
        .replace(/\s*style="[^"]*"/g, '')

      // 元の幅をmax-widthに使用: PCでは自然なサイズ、モバイルでは縮小
      const maxWidth = originalWidth ? `${originalWidth}px` : '100%'
      return `<svg${cleanAttrs} style="max-width:min(${maxWidth},100%);height:auto;display:block;margin:0 auto;">`
    }
  )

  // foreignObjectのoverflow:hiddenをvisibleに修正（テキストはみ出し防止）
  result = result.replace(
    /(<foreignObject[^>]*style="[^"]*?)overflow:\s*hidden/g,
    '$1overflow:visible'
  )

  return result
}

export default function MermaidRenderer({ chart, className = '' }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isZoomed, setIsZoomed] = useState(false)

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
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            padding: 15,
            nodeSpacing: 60,
            rankSpacing: 60,
            wrappingWidth: 400,
          },
          sequence: {
            useMaxWidth: true,
          },
          state: {
            useMaxWidth: true,
            padding: 15,
            nodeSpacing: 60,
            rankSpacing: 60,
          },
          er: {
            useMaxWidth: true,
          },
          journey: {
            useMaxWidth: true,
          },
          gantt: {
            useMaxWidth: true,
          },
          pie: {
            useMaxWidth: true,
          },
        })
        mermaidInitialized = true
      }

      // Generate unique ID for this chart
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Sanitize the chart (remove emojis, fix labels)
      const sanitizedChart = sanitizeMermaidChart(chart.trim())

      // Render the chart
      const { svg: renderedSvg } = await mermaid.render(id, sanitizedChart)
      // SVGをレスポンシブに変換（固定サイズ削除 → viewBoxでスケーリング）
      setSvg(makeResponsiveSvg(renderedSvg))
      setError(null)
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
    <>
      <div
        ref={containerRef}
        className={`mermaid-container bg-white border border-gray-200 rounded-lg p-4 overflow-x-auto relative ${className}`}
        style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
      >
        <style>{`
          .mermaid-svg-wrapper foreignObject {
            overflow: visible !important;
          }
          .mermaid-svg-wrapper .nodeLabel {
            white-space: normal !important;
            word-break: keep-all !important;
            overflow-wrap: anywhere !important;
            line-height: 1.4 !important;
          }
          .mermaid-svg-wrapper .label {
            overflow: visible !important;
          }
        `}</style>
        {/* 拡大ボタン（モバイル向け） */}
        <button
          onClick={() => setIsZoomed(true)}
          className="absolute top-2 right-2 p-1.5 bg-white/80 hover:bg-white border border-gray-300 rounded-md shadow-sm z-10 md:hidden"
          aria-label="図を拡大表示"
        >
          <ZoomIn className="h-4 w-4 text-gray-600" />
        </button>
        <div
          className="mermaid-svg-wrapper"
          style={{ minWidth: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {/* 全画面拡大ビューア */}
      <FullscreenViewer isOpen={isZoomed} onClose={() => setIsZoomed(false)} title="図を拡大表示">
        <div
          className="mermaid-svg-wrapper mermaid-zoom-view"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </FullscreenViewer>
    </>
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
