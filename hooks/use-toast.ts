import { useState } from 'react'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

interface ToastInput {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (toastInput: ToastInput) => {
    const id = Date.now().toString()
    const newToast = { ...toastInput, id }
    
    setToasts(prev => [...prev, newToast])
    
    console.log('Toast:', toastInput.title, toastInput.description)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  return { toast, toasts, removeToast }
}