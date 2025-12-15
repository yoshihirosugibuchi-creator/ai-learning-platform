/**
 * 🔄 Supabase接続用リトライ機構付きfetch
 * 
 * 接続タイムアウト、ネットワークエラー、サーバーエラーに対して
 * 自動リトライを実行し、より堅牢な接続を提供
 */

interface RetryOptions {
  maxRetries?: number
  baseDelay?: number
  maxDelay?: number
  timeout?: number
}

interface FetchWithRetryOptions extends RequestInit {
  retryOptions?: RetryOptions
}

const defaultRetryOptions: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  timeout: 30000
}

export async function fetchWithRetry(
  url: string | URL,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const { retryOptions = {}, ...fetchOptions } = options
  const config = { ...defaultRetryOptions, ...retryOptions }
  
  let lastError: Error
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // AbortController for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
      }, config.timeout)
      
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      // 成功時はそのまま返す
      if (response.ok) {
        return response
      }
      
      // 5xx エラーの場合はリトライ対象
      if (response.status >= 500 && attempt < config.maxRetries) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }
      
      // 4xx エラーの場合はリトライしない
      return response
      
    } catch (error) {
      lastError = error as Error
      
      // 最終試行の場合はエラーを投げる
      if (attempt === config.maxRetries) {
        throw new Error(`Fetch failed after ${config.maxRetries + 1} attempts: ${lastError.message}`)
      }
      
      // リトライ間隔を計算（指数バックオフ + ジッター）
      const baseDelay = Math.min(
        config.baseDelay * Math.pow(2, attempt),
        config.maxDelay
      )
      const jitter = Math.random() * 0.3 * baseDelay
      const delay = baseDelay + jitter
      
      console.warn(`⚠️  Fetch attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms:`, lastError.message)
      
      // 指定した間隔で待機
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

/**
 * Supabase用のfetch関数
 * リトライ機構、タイムアウト、ログ機能付き
 */
export function createSupabaseFetch(options: RetryOptions = {}) {
  const config = { ...defaultRetryOptions, ...options }
  
  return (url: string | URL, init: RequestInit = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Supabase request: ${url}`)
    }
    
    return fetchWithRetry(url, {
      ...init,
      retryOptions: config
    }).catch((error) => {
      console.error(`❌ Supabase request failed: ${url}`, error.message)
      throw error
    })
  }
}