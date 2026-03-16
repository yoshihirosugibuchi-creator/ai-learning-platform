'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

interface FullscreenViewerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

/**
 * 全画面拡大ビューア（モバイル向け）
 * - ピンチズーム対応（CSS transform）
 * - スクロールで全体を閲覧可能
 * - ズームイン/アウト/リセットボタン付き
 * - 上部・下部に閉じるボタン配置（操作性向上）
 */
export default function FullscreenViewer({ isOpen, onClose, title = '拡大表示', children }: FullscreenViewerProps) {
  const [scale, setScale] = useState(1)
  const contentRef = useRef<HTMLDivElement>(null)
  const lastTouchDistance = useRef<number | null>(null)

  // モーダルが開いたらスケールリセット
  useEffect(() => {
    if (isOpen) {
      setScale(1)
      lastTouchDistance.current = null
    }
  }, [isOpen])

  // body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleZoomIn = useCallback(() => {
    setScale(s => Math.min(s + 0.5, 5))
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale(s => Math.max(s - 0.5, 0.5))
  }, [])

  const handleReset = useCallback(() => {
    setScale(1)
  }, [])

  // ピンチズーム処理
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (lastTouchDistance.current !== null) {
        const delta = distance - lastTouchDistance.current
        setScale(s => Math.min(Math.max(s + delta * 0.005, 0.5), 5))
      }
      lastTouchDistance.current = distance
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col">
      {/* ヘッダー（safe-area対応） */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 shrink-0"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
      >
        {/* 閉じるボタン（左側・大きめ） */}
        <button
          onClick={handleClose}
          className="flex items-center gap-1 px-3 py-2 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-lg shrink-0"
        >
          <X className="h-4 w-4 text-gray-700" />
          <span className="text-sm font-medium text-gray-700">閉じる</span>
        </button>

        {/* ズームコントロール（右側） */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={handleZoomOut}
            className="p-2.5 hover:bg-gray-200 rounded-full active:bg-gray-300"
            aria-label="縮小"
          >
            <ZoomOut className="h-5 w-5 text-gray-600" />
          </button>
          <span className="text-xs text-gray-500 min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="p-2.5 hover:bg-gray-200 rounded-full active:bg-gray-300"
            aria-label="拡大"
          >
            <ZoomIn className="h-5 w-5 text-gray-600" />
          </button>
          <button
            onClick={handleReset}
            className="p-2.5 hover:bg-gray-200 rounded-full active:bg-gray-300"
            aria-label="リセット"
          >
            <RotateCcw className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div
        className="flex-1 overflow-auto"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={contentRef}
          className="p-4 origin-top-left"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${100 / scale}%`,
          }}
        >
          {children}
        </div>
      </div>

      {/* フッター閉じるボタン（safe-area対応） */}
      <div
        className="shrink-0 border-t bg-gray-50 px-4 py-2 flex justify-center"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          onClick={handleClose}
          className="w-full max-w-xs py-3 bg-gray-800 hover:bg-gray-900 active:bg-black text-white rounded-lg font-medium text-sm"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}
