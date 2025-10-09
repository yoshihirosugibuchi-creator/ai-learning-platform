import { useState } from 'react'

interface Toast {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = (toast: Toast) => {
    setToasts(prev => [...prev, toast])
    
    // 3秒後に自動で削除
    setTimeout(() => {
      setToasts(prev => prev.slice(1))
    }, 3000)
    
    console.log('Toast:', toast.title, toast.description)
  }

  return { toast, toasts }
}