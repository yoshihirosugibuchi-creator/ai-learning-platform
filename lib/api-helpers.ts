/**
 * API呼び出しのエラーハンドリングヘルパー
 */

export interface ApiError {
  error: string
  details?: string
  statusCode?: number
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: ApiError
}

/**
 * レスポンスを安全にJSON解析する
 */
export async function safeJsonParse(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type')
  
  if (!contentType || !contentType.includes('application/json')) {
    // JSONでない場合はテキストとして読み取り
    const text = await response.text()
    console.error('Non-JSON response received:', {
      status: response.status,
      statusText: response.statusText,
      contentType,
      text: text.substring(0, 200) // 最初の200文字のみログ
    })
    
    // HTMLエラーページかどうか確認
    if (text.includes('<html>') || text.includes('<!DOCTYPE')) {
      throw new Error(`Server returned HTML error page (${response.status}): ${response.statusText}`)
    }
    
    // その他のテキストエラー
    throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 100)}...`)
  }

  try {
    return await response.json()
  } catch (error) {
    console.error('JSON parsing failed:', {
      status: response.status,
      statusText: response.statusText,
      error
    })
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * API呼び出しのエラーハンドリングを統一
 */
export async function handleApiResponse<T = unknown>(
  response: Response
): Promise<T> {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    
    try {
      const errorData = await safeJsonParse(response) as ApiError
      if (errorData && typeof errorData === 'object' && 'error' in errorData) {
        errorMessage = errorData.error
      }
    } catch {
      // JSON解析に失敗した場合はデフォルトのエラーメッセージを使用
    }
    
    throw new Error(errorMessage)
  }

  return safeJsonParse(response) as Promise<T>
}

/**
 * 認証ヘッダーを取得する（Supabase用）
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  // このヘルパーはブラウザ環境でのみ動作
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const { supabase } = await import('@/lib/supabase')
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.access_token) {
      throw new Error('認証が必要です。ログインしてください。')
    }

    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    }
  } catch (error) {
    console.error('Failed to get auth headers:', error)
    throw error
  }
}

/**
 * 統一されたAPIクライアント
 */
export class ApiClient {
  static async get<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
    const authHeaders = await getAuthHeaders()
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...authHeaders,
        ...options.headers
      },
      ...options
    })
    
    return handleApiResponse<T>(response)
  }

  static async post<T = unknown>(url: string, data?: unknown, options: RequestInit = {}): Promise<T> {
    const authHeaders = await getAuthHeaders()
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...authHeaders,
        ...options.headers
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options
    })
    
    return handleApiResponse<T>(response)
  }

  static async put<T = unknown>(url: string, data?: unknown, options: RequestInit = {}): Promise<T> {
    const authHeaders = await getAuthHeaders()
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        ...authHeaders,
        ...options.headers
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options
    })
    
    return handleApiResponse<T>(response)
  }

  static async delete<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
    const authHeaders = await getAuthHeaders()
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        ...authHeaders,
        ...options.headers
      },
      ...options
    })
    
    return handleApiResponse<T>(response)
  }
}