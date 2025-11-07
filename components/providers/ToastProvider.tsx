'use client'

import React, { createContext, useContext } from 'react'
import { useToast as useToastHook } from '@/hooks/use-toast'
import { ToastContainer } from '@/components/ui/toast'

interface ToastContextType {
  toast: (input: { title: string; description?: string; variant?: 'default' | 'destructive' }) => void
  toasts: Array<{
    id: string
    title: string
    description?: string
    variant?: 'default' | 'destructive'
  }>
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toast, toasts, removeToast } = useToastHook()

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}