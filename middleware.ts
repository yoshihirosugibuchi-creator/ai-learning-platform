import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // メンテナンスモードチェック
  const isMaintenanceMode = process.env.MAINTENANCE_MODE === 'true'
  const maintenanceMessage = process.env.MAINTENANCE_MESSAGE || 'システムメンテナンス中です'
  const maintenanceEndTime = process.env.MAINTENANCE_END_TIME

  // メンテナンスページへのアクセスは許可
  if (request.nextUrl.pathname === '/maintenance') {
    return NextResponse.next()
  }

  // 管理者アクセス許可（特定IPアドレスなど）
  const adminIPs = process.env.ADMIN_IPS?.split(',') || []
  const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
  
  if (isMaintenanceMode && !adminIPs.includes(clientIP || '')) {
    // メンテナンスページにリダイレクト
    const url = request.nextUrl.clone()
    url.pathname = '/maintenance'
    url.searchParams.set('message', maintenanceMessage)
    if (maintenanceEndTime) {
      url.searchParams.set('endTime', maintenanceEndTime)
    }
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - maintenance (maintenance page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|maintenance).*)',
  ],
}