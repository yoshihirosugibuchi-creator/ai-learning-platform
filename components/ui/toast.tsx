'use client'

import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from './button'

interface ToastProps {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
  onClose: () => void
}

export function Toast({ title, description, variant = 'default', onClose }: ToastProps) {
  // 3秒後に自動で閉じる
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)

    return () => clearTimeout(timer)
  }, [onClose])

  const iconColor = variant === 'destructive' ? 'text-red-500' : 'text-green-500'
  const bgColor = variant === 'destructive' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
  const Icon = variant === 'destructive' ? AlertCircle : CheckCircle

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm w-full ${bgColor} border rounded-lg shadow-lg p-4 animate-in slide-in-from-top-1`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${iconColor} mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 hover:bg-gray-100"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Array<{
    id: string
    title: string
    description?: string
    variant?: 'default' | 'destructive'
  }>
  onRemoveToast: (id: string) => void
}

export function ToastContainer({ toasts, onRemoveToast }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={() => onRemoveToast(toast.id)}
        />
      ))}
    </div>
  )
}