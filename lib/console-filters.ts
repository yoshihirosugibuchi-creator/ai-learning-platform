// 開発環境でのコンソール警告フィルター
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn
  const originalError = console.error
  
  console.warn = (...args: any[]) => {
    // DialogTitle関連の特定の警告をフィルター
    const message = args[0]?.toString?.() || ''
    if (
      message.includes('DialogContent') && 
      message.includes('DialogTitle') &&
      message.includes('accessible for screen reader users')
    ) {
      return // この警告をスキップ
    }
    originalWarn(...args)
  }
  
  console.error = (...args: any[]) => {
    // DialogTitle関連のエラーもフィルター
    const message = args[0]?.toString?.() || ''
    if (
      message.includes('DialogContent') && 
      message.includes('DialogTitle') &&
      message.includes('accessible for screen reader users')
    ) {
      return // このエラーをスキップ
    }
    originalError(...args)
  }
}

export {}