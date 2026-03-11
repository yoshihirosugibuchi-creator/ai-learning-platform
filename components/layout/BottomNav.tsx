'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, GraduationCap, Package, Briefcase } from 'lucide-react'

const navItems = [
  { href: '/', icon: Home, label: 'ホーム' },
  { href: '/learning', icon: GraduationCap, label: 'コース' },
  { href: '/quiz-packs', icon: Package, label: 'クイズ' },
  { href: '/case-study', icon: Briefcase, label: 'ケース' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-14">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = href === '/'
            ? pathname === '/'
            : pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-primary' : ''}`} />
              <span className={`text-[10px] mt-0.5 ${isActive ? 'font-semibold' : ''}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
