// 開発環境専用の認証エラー回復ヘルパー

let errorCount = 0
const MAX_ERRORS = 3

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // ページロード時にサーバー再起動を検知
  const now = Date.now()
  const timeSinceLastLoad = now - (Number(sessionStorage.getItem('lastPageLoad')) || 0)
  
  if (timeSinceLastLoad > 60000) { // 1分以上経過している場合
    console.log('🔄 Potential server restart detected, clearing auth cache')
    localStorage.removeItem('supabase.auth.token')
    sessionStorage.removeItem('supabase.auth.token')
  }
  
  sessionStorage.setItem('lastPageLoad', now.toString())
  
  // グローバルエラーハンドラー
  window.addEventListener('error', (event) => {
    const errorMessage = event.error?.message || event.message || ''
    
    if (errorMessage.includes('Invalid Refresh Token') || 
        errorMessage.includes('Refresh Token Not Found')) {
      errorCount++
      
      console.warn(`🔄 Auth error #${errorCount}: ${errorMessage}`)
      
      if (errorCount >= MAX_ERRORS) {
        console.warn('🔄 Multiple auth errors, forcing page reload...')
        errorCount = 0
        window.location.reload()
      }
    }
  })
  
  // Promise rejection もキャッチ
  window.addEventListener('unhandledrejection', (event) => {
    const errorMessage = event.reason?.message || ''
    
    if (errorMessage.includes('Invalid Refresh Token') || 
        errorMessage.includes('Refresh Token Not Found')) {
      console.warn('🔄 Unhandled auth error, attempting recovery...')
      
      // エラーを抑制して自動回復を試行
      event.preventDefault()
      
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
  })
}

export {}