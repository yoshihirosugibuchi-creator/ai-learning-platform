'use client'

import React, { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'
import MermaidRenderer from '@/components/learning/MermaidRenderer'

interface MarkdownContentProps {
  content: string
  className?: string
  /** コンパクト表示モード（クイズ選択肢など向け） */
  compact?: boolean
}

/**
 * Markdownコンテンツをレンダリングするコンポーネント
 * - コードブロック: シンタックスハイライト付き表示
 * - Mermaid図表: MermaidRendererで表示
 * - インラインコード: 背景色付きで表示
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

            // 通常のコードブロック（シンタックスハイライト付き）
            return (
              <div className="my-4 rounded-lg overflow-hidden">
                {language && (
                  <div className="bg-gray-700 text-gray-300 text-xs px-4 py-1 font-mono">
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
                    fontSize: compact ? '0.75rem' : '0.875rem',
                  }}
                >
                  {codeString}
                </SyntaxHighlighter>
              </div>
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
          // テーブル
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  {children}
                </table>
              </div>
            )
          },
          thead({ children }) {
            return <thead className="bg-gray-100">{children}</thead>
          },
          th({ children }) {
            return <th className="border border-gray-300 px-4 py-2 text-left font-semibold">{children}</th>
          },
          td({ children }) {
            return <td className="border border-gray-300 px-4 py-2">{children}</td>
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
