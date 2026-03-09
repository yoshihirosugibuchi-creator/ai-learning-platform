'use client'

import { Fingerprint, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

type BiometricEnableDialogProps = {
  open: boolean
  biometryLabel: string
  onEnable: () => void
  onSkip: () => void
}

/**
 * Face ID有効化バナー（ページ内インライン表示）
 * モーダルではなくカードとして表示し、WebViewのタッチ問題を回避
 */
export default function BiometricEnableDialog({
  open,
  biometryLabel,
  onEnable,
  onSkip,
}: BiometricEnableDialogProps) {
  if (!open) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50">
      <Card className="border-indigo-200 bg-indigo-50 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-indigo-100 p-2 shrink-0">
              <Fingerprint className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 mb-1">
                {biometryLabel}を有効にしますか？
              </p>
              <p className="text-xs text-gray-600 mb-3">
                次回から素早くログインできます
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onEnable}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  有効にする
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onSkip}
                >
                  あとで
                </Button>
              </div>
            </div>
            <button
              onClick={onSkip}
              className="text-gray-400 hover:text-gray-600 shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
