'use client'

import { useRef, useEffect } from 'react'
import { Fingerprint } from 'lucide-react'

type BiometricEnableDialogProps = {
  open: boolean
  biometryLabel: string
  onEnable: () => void
  onSkip: () => void
}

export default function BiometricEnableDialog({
  open,
  biometryLabel,
  onEnable,
  onSkip,
}: BiometricEnableDialogProps) {
  const enableBtnRef = useRef<HTMLButtonElement>(null)
  const skipBtnRef = useRef<HTMLButtonElement>(null)

  // DOM直接のイベントリスナー（Reactのイベントシステムを回避）
  useEffect(() => {
    if (!open) return

    const enableBtn = enableBtnRef.current
    const skipBtn = skipBtnRef.current

    const handleEnable = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      onEnable()
    }
    const handleSkip = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      onSkip()
    }

    enableBtn?.addEventListener('touchend', handleEnable, { passive: false })
    enableBtn?.addEventListener('click', handleEnable)
    skipBtn?.addEventListener('touchend', handleSkip, { passive: false })
    skipBtn?.addEventListener('click', handleSkip)

    return () => {
      enableBtn?.removeEventListener('touchend', handleEnable)
      enableBtn?.removeEventListener('click', handleEnable)
      skipBtn?.removeEventListener('touchend', handleSkip)
      skipBtn?.removeEventListener('click', handleSkip)
    }
  }, [open, onEnable, onSkip])

  if (!open) return null

  return (
    <div
      id="biometric-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '24px',
          margin: '16px',
          maxWidth: '360px',
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <div style={{
            borderRadius: '50%',
            backgroundColor: '#E0E7FF',
            padding: '12px',
          }}>
            <Fingerprint style={{ width: '32px', height: '32px', color: '#4F46E5' }} />
          </div>
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
          {biometryLabel}を有効にしますか？
        </h2>
        <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '20px' }}>
          次回から{biometryLabel}で素早くログインできます。
          いつでも設定から変更できます。
        </p>

        <button
          ref={enableBtnRef}
          type="button"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#4F46E5',
            color: 'white',
            borderRadius: '8px',
            border: 'none',
            fontSize: '16px',
            fontWeight: '500',
            marginBottom: '8px',
            WebkitTapHighlightColor: 'rgba(0,0,0,0.1)',
            WebkitAppearance: 'none',
          }}
        >
          {biometryLabel}を有効にする
        </button>
        <button
          ref={skipBtnRef}
          type="button"
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'transparent',
            color: '#6B7280',
            borderRadius: '8px',
            border: 'none',
            fontSize: '16px',
            WebkitTapHighlightColor: 'rgba(0,0,0,0.1)',
            WebkitAppearance: 'none',
          }}
        >
          あとで
        </button>
      </div>
    </div>
  )
}
