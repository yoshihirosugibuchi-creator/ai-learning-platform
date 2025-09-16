'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, User, Bookmark, Bell, X, BookOpen, GraduationCap, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUserContext } from '@/contexts/UserContext'

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const router = useRouter()
  const { logout } = useUserContext()

  const handleLogout = () => {
    logout()
    onClose()
    router.push('/login')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed left-0 top-0 h-full w-64 bg-background border-r shadow-lg">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">メニュー</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <nav className="p-4 space-y-2">
          <Button variant="ghost" className="w-full justify-start" onClick={onClose} asChild>
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              ホーム
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={onClose} asChild>
            <Link href="/learning">
              <GraduationCap className="h-4 w-4 mr-2" />
              コース
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={onClose} asChild>
            <Link href="/categories">
              <BookOpen className="h-4 w-4 mr-2" />
              カテゴリー
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={onClose} asChild>
            <Link href="/profile">
              <User className="h-4 w-4 mr-2" />
              マイページ
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={onClose} asChild>
            <Link href="/collection">
              <Bookmark className="h-4 w-4 mr-2" />
              コレクション
            </Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={onClose}>
            <Bell className="h-4 w-4 mr-2" />
            通知
          </Button>
          
          <hr className="my-4" />
          
          <Button 
            variant="ghost" 
            className="w-full justify-start text-red-600 hover:text-red-600 hover:bg-red-50" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            ログアウト
          </Button>
        </nav>
      </div>
    </div>
  )
}