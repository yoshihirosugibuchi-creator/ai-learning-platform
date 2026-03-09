'use client'

import { Fingerprint, X } from 'lucide-react'

type BiometricEnableDialogProps = {
  open: boolean
  biometryLabel: string
  onEnable: () => void
  onSkip: () => void
}

/**
 * Face ID有効化バナー（画面下部に表示）
 * WKWebViewのタッチ互換性のため、shadcn/Radix UIを使わずネイティブHTMLで実装
 */
export default function BiometricEnableDialog({
  open,
  biometryLabel,
  onEnable,
  onSkip,
}: BiometricEnableDialogProps) {
  if (!open) return null

  return (
    <div
      className="fixed bottom-24 left-4 right-4"
      style={{ zIndex: 99999, pointerEvents: 'auto' }}
    >
      <div className="bg-white border border-indigo-200 rounded-xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-indigo-100 p-2 shrink-0 mt-0.5">
            <Fingerprint className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 mb-1">
              {biometryLabel}を有効にしますか？
            </p>
            <p className="text-xs text-gray-500 mb-3">
              次回から素早くログインできます
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg active:bg-indigo-800"
                style={{ pointerEvents: 'auto', WebkitAppearance: 'none' }}
                onPointerUp={onEnable}
              >
                有効にする
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-600 rounded-lg active:bg-gray-100"
                style={{ pointerEvents: 'auto', WebkitAppearance: 'none' }}
                onPointerUp={onSkip}
              >
                あとで
              </button>
            </div>
          </div>
          <button
            type="button"
            className="text-gray-400 shrink-0"
            style={{ pointerEvents: 'auto', WebkitAppearance: 'none' }}
            onPointerUp={onSkip}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
