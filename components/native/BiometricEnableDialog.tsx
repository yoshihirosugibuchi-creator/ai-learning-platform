'use client'

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
  if (!open) return null

  return (
    <div
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
        touchAction: 'auto',
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
          type="button"
          onClick={onEnable}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#4F46E5',
            color: 'white',
            borderRadius: '8px',
            border: 'none',
            fontSize: '16px',
            fontWeight: '500',
            cursor: 'pointer',
            marginBottom: '8px',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {biometryLabel}を有効にする
        </button>
        <button
          type="button"
          onClick={onSkip}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'transparent',
            color: '#6B7280',
            borderRadius: '8px',
            border: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          あとで
        </button>
      </div>
    </div>
  )
}
