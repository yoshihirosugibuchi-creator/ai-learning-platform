'use client'

// Performance Optimization Utilities
// パフォーマンス最適化ユーティリティ

import { useEffect, useRef, useCallback } from 'react'

// メモリリーク防止用のクリーンアップフック
export function useCleanup(cleanupFn: () => void) {
  const cleanupRef = useRef(cleanupFn)
  cleanupRef.current = cleanupFn

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [])
}

// デバウンス関数（API呼び出し最適化用）
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args)
    }, delay)
  }, [callback, delay]) as T

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

// インメモリキャッシュクラス
class InMemoryCache {
  private cache = new Map<string, { data: unknown; timestamp: number; ttl: number }>()
  private readonly maxSize: number
  private readonly defaultTTL: number

  constructor(maxSize = 100, defaultTTL = 5 * 60 * 1000) { // 5分
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
  }

  set(key: string, data: unknown, ttl?: number): void {
    // キャッシュサイズ制限
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    })
  }

  get(key: string): unknown | null {
    const item = this.cache.get(key)
    if (!item) return null

    // TTL チェック
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  clear(): void {
    this.cache.clear()
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  // 期限切れアイテムをクリーンアップ
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // キャッシュサイズが大きすぎる場合の強制クリーンアップ
  forceCleanup(): void {
    if (this.cache.size > 50) { // 50個を超えたら古いものから削除
      const sortedEntries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
      
      const toDelete = sortedEntries.slice(0, this.cache.size - 30)
      toDelete.forEach(([key]) => this.cache.delete(key))
      
      console.log(`🧹 Force cleaned ${toDelete.length} cache entries`)
    }
  }

  size(): number {
    return this.cache.size
  }
}

// グローバルキャッシュインスタンス
export const globalCache = new InMemoryCache()

// 定期的なキャッシュクリーンアップ
if (typeof window !== 'undefined') {
  setInterval(() => {
    globalCache.cleanup()
    globalCache.forceCleanup() // 強制クリーンアップも実行
  }, 60000) // 1分ごとにクリーンアップ
}

// プリロード用関数
export async function preloadPage(path: string): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    // Next.js の router.prefetch に相当する処理
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.href = path
    document.head.appendChild(link)

    // 少し待ってからリンクを削除（メモリリーク防止）
    setTimeout(() => {
      if (link.parentNode) {
        link.parentNode.removeChild(link)
      }
    }, 10000)
  } catch (error) {
    console.warn('Failed to preload page:', path, error)
  }
}

// 画像プリロード関数
export function preloadImages(urls: string[]): Promise<void[]> {
  const promises = urls.map(url => {
    return new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
      img.src = url
    })
  })

  return Promise.allSettled(promises).then(() => [])
}

// リソース使用量監視
export function useResourceMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const logResourceUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory
        console.log('Memory Usage:', {
          used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
          total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
          limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
          cacheSize: globalCache.size()
        })
      }
    }

    // 開発環境でのみログ出力
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(logResourceUsage, 30000) // 30秒ごと
      return () => clearInterval(interval)
    }
  }, [])
}

// 遅延読み込み用の Intersection Observer フック
export function useLazyLoad(threshold = 0.1) {
  const ref = useRef<HTMLElement>(null)
  const isVisible = useRef(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible.current) {
          isVisible.current = true
        }
      },
      { threshold }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold])

  return { ref, isVisible: isVisible.current }
}

// API リクエスト最適化（キャッシュ付き）
export async function cachedFetch(
  url: string, 
  options: RequestInit = {}, 
  ttl = 5 * 60 * 1000
): Promise<unknown> {
  const cacheKey = `fetch_${url}_${JSON.stringify(options)}`
  
  // キャッシュから取得を試行
  const cached = globalCache.get(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    // 成功した場合のみキャッシュに保存
    globalCache.set(cacheKey, data, ttl)
    
    return data
  } catch (error) {
    console.error('Fetch error:', error)
    throw error
  }
}