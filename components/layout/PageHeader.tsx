'use client'

import { Search, type LucideIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  description?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
}

/**
 * 全ページ共通のタイトルヘッダー
 * - アイコン + タイトル（センタリング）
 * - オプションの説明文
 * - オプションの検索バー（モバイルのみ表示）
 * - お手本: コース学習ページ (app/learning/page.tsx)
 */
export default function PageHeader({ icon: Icon, title, description, searchValue, onSearchChange, searchPlaceholder }: PageHeaderProps) {
  return (
    <div className="text-center space-y-4">
      <div className="flex items-center justify-center space-x-3">
        <Icon className="h-8 w-8 text-primary" />
        <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">{title}</h1>
      </div>
      {description && (
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {description}
        </p>
      )}
      {onSearchChange && (
        <div className="relative max-w-md mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={searchPlaceholder || '検索...'}
            value={searchValue || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      )}
    </div>
  )
}
