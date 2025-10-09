'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // ユーザーには表示しないが、開発時のデバッグ用にコンソールログは残す
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      // Supabaseエラーの場合は、わかりやすいメッセージに変換
      const errorMessage = this.getErrorMessage(this.state.error)
      
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4 max-w-md p-6">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-red-100">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">アクセスエラー</h2>
            <p className="text-gray-600">{errorMessage}</p>
            <div className="space-y-2">
              <Button 
                onClick={() => this.setState({ hasError: false })}
                className="w-full"
              >
                再試行
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.href = '/'}
                className="w-full"
              >
                ホームに戻る
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }

  private getErrorMessage(error?: Error): string {
    if (!error) {
      return 'システムエラーが発生しました。'
    }

    const message = error.message.toLowerCase()

    // Supabase関連エラーを判定してユーザーフレンドリーなメッセージに変換
    if (message.includes('permission denied') || 
        message.includes('insufficient_privilege') ||
        message.includes('row level security')) {
      return 'この操作を実行する権限がありません。'
    }

    if (message.includes('invalid token') || 
        message.includes('jwt') ||
        message.includes('authentication required')) {
      return 'ログインセッションが無効です。再度ログインしてください。'
    }

    if (message.includes('network') || 
        message.includes('fetch') ||
        message.includes('connection')) {
      return 'ネットワークエラーが発生しました。インターネット接続を確認してください。'
    }

    if (message.includes('user not found') ||
        message.includes('record not found')) {
      return 'ユーザー情報が見つかりません。管理者にお問い合わせください。'
    }

    if (message.includes('role') && message.includes('required')) {
      return 'この機能を利用するには管理者権限が必要です。'
    }

    // 開発環境でのみ詳細エラーを表示、本番では汎用メッセージ
    if (process.env.NODE_ENV === 'development') {
      return `システムエラー: ${error.message}`
    }

    return 'システムエラーが発生しました。しばらく時間をおいて再度お試しください。'
  }
}