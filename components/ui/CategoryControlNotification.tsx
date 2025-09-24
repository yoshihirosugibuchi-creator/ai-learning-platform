/**
 * カテゴリー制御通知コンポーネント
 * 
 * 非アクティブカテゴリーへのアクセス時に表示される通知
 */

import React from 'react'
import { AlertTriangle, X, Info } from 'lucide-react'

interface CategoryControlNotificationProps {
  message: string
  suggestedCategories?: string[]
  categoryNames?: Record<string, string>
  onClose?: () => void
  variant?: 'warning' | 'info' | 'error'
  className?: string
}

export function CategoryControlNotification({
  message,
  suggestedCategories = [],
  categoryNames = {},
  onClose,
  variant = 'warning',
  className = ''
}: CategoryControlNotificationProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
      case 'warning':
      default:
        return 'bg-amber-50 border-amber-200 text-amber-800'
    }
  }

  const getIcon = () => {
    switch (variant) {
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-600" />
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />
      case 'warning':
      default:
        return <AlertTriangle className="h-5 w-5 text-amber-600" />
    }
  }

  return (
    <div className={`border rounded-lg p-4 ${getVariantStyles()} ${className}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">
            {message}
          </p>
          
          {suggestedCategories.length > 0 && (
            <div className="mt-2">
              <p className="text-sm">
                利用可能なカテゴリー:
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {suggestedCategories.map(categoryId => (
                  <span
                    key={categoryId}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white bg-opacity-50 border border-current"
                  >
                    {categoryNames[categoryId] || categoryId}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {onClose && (
          <div className="ml-4 flex-shrink-0">
            <button
              type="button"
              className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-amber-50 focus:ring-amber-600"
              onClick={onClose}
            >
              <span className="sr-only">閉じる</span>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 複数の通知を表示するコンテナ
 */
interface CategoryControlNotificationsProps {
  notifications: Array<{
    id: string
    message: string
    categoryId: string
    timestamp: Date
  }>
  categoryNames?: Record<string, string>
  suggestedCategories?: string[]
  onDismiss?: (id: string) => void
  className?: string
}

export function CategoryControlNotifications({
  notifications,
  categoryNames = {},
  suggestedCategories = [],
  onDismiss,
  className = ''
}: CategoryControlNotificationsProps) {
  if (notifications.length === 0) {
    return null
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {notifications.map(notification => (
        <CategoryControlNotification
          key={notification.id}
          message={notification.message}
          suggestedCategories={suggestedCategories}
          categoryNames={categoryNames}
          onClose={onDismiss ? () => onDismiss(notification.id) : undefined}
          variant="warning"
        />
      ))}
    </div>
  )
}

/**
 * インラインカテゴリー制御状態表示
 */
interface CategoryControlStatusProps {
  categoryId: string
  isBlocked: boolean
  isLoading?: boolean
  className?: string
}

export function CategoryControlStatus({
  categoryId: _categoryId,
  isBlocked,
  isLoading = false,
  className = ''
}: CategoryControlStatusProps) {
  if (isLoading) {
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600 ${className}`}>
        確認中...
      </span>
    )
  }

  if (isBlocked) {
    return (
      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium text-red-600 bg-red-100 rounded ${className}`}>
        <AlertTriangle className="h-3 w-3 mr-1" />
        利用不可
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium text-green-600 bg-green-100 rounded ${className}`}>
      利用可能
    </span>
  )
}

/**
 * カテゴリー選択UI向けの制御状態表示
 */
interface CategoryOptionWithControlProps {
  categoryId: string
  categoryName: string
  isBlocked: boolean
  isSelected?: boolean
  onClick?: () => void
  className?: string
}

export function CategoryOptionWithControl({
  categoryId,
  categoryName,
  isBlocked,
  isSelected = false,
  onClick,
  className = ''
}: CategoryOptionWithControlProps) {
  const baseStyles = "flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors"
  const availableStyles = isSelected 
    ? "border-blue-500 bg-blue-50 text-blue-900" 
    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
  const blockedStyles = "border-red-200 bg-red-50 text-red-700 cursor-not-allowed opacity-60"
  
  const styles = isBlocked ? blockedStyles : availableStyles

  return (
    <div 
      className={`${baseStyles} ${styles} ${className}`}
      onClick={isBlocked ? undefined : onClick}
    >
      <div className="flex items-center">
        <span className="font-medium">{categoryName}</span>
        {isBlocked && (
          <AlertTriangle className="h-4 w-4 ml-2 text-red-500" />
        )}
      </div>
      
      <CategoryControlStatus
        categoryId={categoryId}
        isBlocked={isBlocked}
      />
    </div>
  )
}