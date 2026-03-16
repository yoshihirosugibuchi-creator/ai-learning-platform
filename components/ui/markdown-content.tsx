'use client'

import React, { memo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import { ZoomIn } from 'lucide-react'
import MermaidRenderer from '@/components/learning/MermaidRenderer'
import FullscreenViewer from '@/components/ui/fullscreen-viewer'

interface MarkdownContentProps {
  content: string
  className?: string
  /** コンパクト表示モード（クイズ選択肢など向け） */
  compact?: boolean
}

/** テーブル拡大表示ラッパー（モバイル向け） */
function ZoomableTable({ children }: { children: React.ReactNode }) {
  const [isZoomed, setIsZoomed] = useState(false)

  return (
    <>
      <div className="my-4 overflow-x-auto md-table-scroll relative" style={{ WebkitOverflowScrolling: 'touch' }}>
        <button
          onClick={() => setIsZoomed(true)}
          className="absolute top-1 right-1 p-1.5 bg-gray-200/80 hover:bg-gray-300 rounded-md z-10 md:hidden"
          aria-label="テーブルを拡大表示"
        >
          <ZoomIn className="h-3.5 w-3.5 text-gray-600" />
        </button>
        <table className="border-collapse border border-gray-300 md-table">
          {children}
        </table>
      </div>

      <FullscreenViewer isOpen={isZoomed} onClose={() => setIsZoomed(false)} title="テーブル">
        <table className="border-collapse border border-gray-300" style={{ fontSize: '0.9rem' }}>
          {children}
        </table>
      </FullscreenViewer>
    </>
  )
}

/** コードブロック拡大表示ラッパー（モバイル向け） */
function ZoomableCodeBlock({ language, codeString, compact }: { language: string; codeString: string; compact: boolean }) {
  const [isZoomed, setIsZoomed] = useState(false)

  return (
    <>
      <div className="my-4 rounded-lg overflow-hidden relative" style={{ maxWidth: '100%' }}>
        {language && (
          <div className="bg-gray-700 text-gray-300 text-xs px-3 py-1 font-mono">
            {language}
          </div>
        )}
        {/* 拡大ボタン（モバイル向け） */}
        <button
          onClick={() => setIsZoomed(true)}
          className="absolute top-1 right-1 p-1.5 bg-black/40 hover:bg-black/60 rounded-md z-10 md:hidden"
          aria-label="コードを拡大表示"
        >
          <ZoomIn className="h-3.5 w-3.5 text-white" />
        </button>
        <div
          className="overflow-x-auto md-code-scroll"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <SyntaxHighlighter
            style={oneDark}
            language={language || 'text'}
            PreTag="div"
            customStyle={{
              margin: 0,
              borderRadius: language ? '0 0 0.5rem 0.5rem' : '0.5rem',
              fontSize: compact ? '0.7rem' : undefined,
              padding: undefined,
            }}
            className="md-code-block"
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      </div>

      <FullscreenViewer isOpen={isZoomed} onClose={() => setIsZoomed(false)} title={language ? `${language} コード` : 'コード'}>
        <div className="rounded-lg overflow-hidden">
          {language && (
            <div className="bg-gray-700 text-gray-300 text-xs px-3 py-1 font-mono">
              {language}
            </div>
          )}
          <SyntaxHighlighter
            style={oneDark}
            language={language || 'text'}
            PreTag="div"
            customStyle={{
              margin: 0,
              borderRadius: language ? '0 0 0.5rem 0.5rem' : '0.5rem',
              fontSize: '0.85rem',
            }}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      </FullscreenViewer>
    </>
  )
}

/**
 * Markdownコンテンツをレンダリングするコンポーネント
 * - コードブロック: シンタックスハイライト付き表示（モバイル: 小フォント+横スクロール）
 * - Mermaid図表: MermaidRendererで表示（モバイル: ピンチズーム対応）
 * - テーブル: 横スクロール対応
 * - 画像: ピンチズーム対応
 * - GFM（GitHub Flavored Markdown）対応
 */
function MarkdownContentBase({ content, className = '', compact = false }: MarkdownContentProps) {
  if (!content) return null

  return (
    <div className={`markdown-content ${compact ? 'compact' : ''} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // コードブロックの処理
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const codeString = String(children).replace(/\n$/, '')

            // インラインコードの判定（改行を含まない短いコード）
            const isInline = !codeString.includes('\n') && codeString.length < 100

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded text-sm font-mono"
                  {...props}
                >
                  {children}
                </code>
              )
            }

            // Mermaid図表の場合
            if (language === 'mermaid') {
              return (
                <MermaidRenderer
                  chart={codeString}
                  className="my-4"
                />
              )
            }

            // 通常のコードブロック（シンタックスハイライト付き + モバイル拡大ボタン）
            return (
              <ZoomableCodeBlock
                language={language}
                codeString={codeString}
                compact={compact}
              />
            )
          },
          // 段落
          p({ children }) {
            return (
              <p className={`${compact ? 'text-sm mb-2' : 'text-gray-700 leading-relaxed mb-4'}`}>
                {children}
              </p>
            )
          },
          // 見出し
          h1({ children }) {
            return <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold text-gray-900 mb-3 mt-5">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">{children}</h3>
          },
          h4({ children }) {
            return <h4 className="text-base font-semibold text-gray-800 mb-2 mt-3">{children}</h4>
          },
          // リスト
          ul({ children }) {
            return <ul className={`list-disc list-inside ${compact ? 'mb-2 space-y-0.5' : 'mb-4 space-y-1'}`}>{children}</ul>
          },
          ol({ children }) {
            return <ol className={`list-decimal list-inside ${compact ? 'mb-2 space-y-0.5' : 'mb-4 space-y-1'}`}>{children}</ol>
          },
          li({ children }) {
            return <li className={`${compact ? 'text-sm' : 'text-gray-700'}`}>{children}</li>
          },
          // 強調
          strong({ children }) {
            return <strong className="font-semibold text-gray-900">{children}</strong>
          },
          em({ children }) {
            return <em className="italic text-gray-700">{children}</em>
          },
          // 引用
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-blue-400 pl-4 my-4 italic text-gray-600">
                {children}
              </blockquote>
            )
          },
          // テーブル（モバイル: 横スクロール + 小フォント + 拡大ボタン）
          table({ children }) {
            return <ZoomableTable>{children}</ZoomableTable>
          },
          thead({ children }) {
            return <thead className="bg-gray-100">{children}</thead>
          },
          th({ children }) {
            return <th className="border border-gray-300 px-3 py-1.5 text-left font-semibold text-sm md:px-4 md:py-2 md:text-base whitespace-nowrap">{children}</th>
          },
          td({ children }) {
            return <td className="border border-gray-300 px-3 py-1.5 text-sm md:px-4 md:py-2 md:text-base">{children}</td>
          },
          // 画像（モバイル: ピンチズーム対応ラッパー）
          img({ src, alt }) {
            return (
              <span className="block my-4 md-img-wrapper">
                <img
                  src={src}
                  alt={alt || ''}
                  className="max-w-full h-auto rounded"
                  loading="lazy"
                  style={{ touchAction: 'pinch-zoom' }}
                />
              </span>
            )
          },
          // 水平線
          hr() {
            return <hr className="my-6 border-gray-300" />
          },
          // リンク
          a({ href, children }) {
            return (
              <a
                href={href}
                className="text-blue-600 hover:text-blue-800 underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {children}
              </a>
            )
          },
          // プリフォーマットテキスト
          pre({ children }) {
            // コードブロックはcode要素で処理されるので、preはそのまま返す
            return <>{children}</>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export const MarkdownContent = memo(MarkdownContentBase)
export default MarkdownContent
