// Debug utilities for authentication issues

export function logAuthDebugInfo() {
  console.log('🔍 AUTH DEBUG INFO:')
  console.log('==================')
  
  // Check environment variables
  console.log('🌍 Environment Variables:')
  console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET')
  console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (length: ' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : 'NOT SET')
  console.log('  NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL || 'NOT SET')
  
  // Check localStorage
  console.log('💾 LocalStorage:')
  try {
    const supabaseAuth = localStorage.getItem('sb-bddqkmnbbvllpvsynklr-auth-token')
    console.log('  Auth token:', supabaseAuth ? 'EXISTS' : 'NOT FOUND')
    
    const keys = Object.keys(localStorage).filter(key => key.includes('supabase') || key.includes('auth'))
    console.log('  Auth-related keys:', keys)
  } catch (e) {
    console.log('  LocalStorage access error:', e)
  }
  
  // Check network connectivity
  console.log('🌐 Network Status:')
  console.log('  Online:', navigator.onLine)
  
  // Check user agent
  console.log('🖥️ User Agent:', navigator.userAgent)
  
  console.log('==================')
}

export function debugLoginAttempt(email: string) {
  console.log('🎯 LOGIN ATTEMPT DEBUG:')
  console.log('======================')
  console.log('  Email:', email)
  console.log('  Timestamp:', new Date().toISOString())
  console.log('  URL:', window.location.href)
  console.log('======================')
}

export function debugNetworkRequest(url: string, method: string) {
  console.log(`🌐 NETWORK REQUEST: ${method} ${url}`)
  console.log('  Time:', new Date().toISOString())
}

// Global error handler for debugging
export function setupGlobalErrorHandling() {
  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', event => {
    console.error('🚨 UNHANDLED PROMISE REJECTION:', event.reason)
    if (event.reason?.message?.includes('auth') || event.reason?.message?.includes('login')) {
      console.error('⚠️ This might be related to the login freeze issue!')
    }
  })
  
  // Catch JavaScript errors
  window.addEventListener('error', event => {
    console.error('🚨 JAVASCRIPT ERROR:', event.error)
    if (event.error?.message?.includes('auth') || event.error?.message?.includes('login')) {
      console.error('⚠️ This might be related to the login freeze issue!')
    }
  })
  
  console.log('✅ Global error handling setup complete')
}