'use client'

import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function MaintenancePage() {
  const searchParams = useSearchParams()
  const message = searchParams.get('message') || 'システムメンテナンス中です'
  const endTime = searchParams.get('endTime')
  
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getTimeRemaining = () => {
    if (!endTime) return null
    
    const end = new Date(endTime)
    const now = currentTime
    const diff = end.getTime() - now.getTime()
    
    if (diff <= 0) return '完了予定時刻を過ぎています'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    
    return `あと ${hours}時間 ${minutes}分 ${seconds}秒`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            メンテナンス中
          </h1>
          <p className="text-gray-600 leading-relaxed">
            {message}
          </p>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="text-sm text-gray-500 mb-2">
            現在時刻
          </div>
          <div className="text-lg font-mono text-gray-800 mb-4">
            {formatTime(currentTime)}
          </div>

          {endTime && (
            <>
              <div className="text-sm text-gray-500 mb-2">
                完了予定時刻
              </div>
              <div className="text-lg font-mono text-gray-800 mb-4">
                {endTime}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-blue-600 mb-1">
                  残り時間
                </div>
                <div className="text-lg font-bold text-blue-800">
                  {getTimeRemaining()}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-xs text-gray-400">
          ご不便をおかけして申し訳ございません
        </div>
      </div>
    </div>
  )
}