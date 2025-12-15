import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserRole } from '@/lib/auth-helpers'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

interface BadgeConfig {
  id: string
  color: string
  title: string
  description: string
  courseId: string
  badgeDisplayName?: string
}


function formatDisplayName(displayName: string): { line1: string; line2: string; fontSize1: number; fontSize2: number } {
  // アンダースコアで分割
  if (displayName.includes('_')) {
    const parts = displayName.split('_')
    const line1 = parts[0]
    const line2 = parts[1] || '' // 2つ目以降は無視
    
    return {
      line1: line1,
      line2: line2,
      fontSize1: Math.min(9, Math.max(6, 50 / line1.length)),
      fontSize2: Math.min(8, Math.max(6, 45 / line2.length))
    }
  }
  
  // アンダースコアがない場合は1行
  if (displayName.length <= 10) {
    return { 
      line1: displayName, 
      line2: '', 
      fontSize1: Math.min(9, Math.max(6, 60 / displayName.length)), 
      fontSize2: 0 
    }
  }
  
  // 長すぎる場合は切り詰め
  const truncated = displayName.substring(0, 10)
  return { 
    line1: truncated, 
    line2: '', 
    fontSize1: Math.min(9, Math.max(6, 60 / truncated.length)), 
    fontSize2: 0 
  }
}

function generateBadgeSVG(config: BadgeConfig): string {
  const displayName = config.badgeDisplayName || config.courseId
  const { line1, line2, fontSize1, fontSize2 } = formatDisplayName(displayName)
  
  return `<svg width="120" height="150" viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#FFA500;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FF8C00;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="ribbonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${config.color};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${config.color}CC;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="2" dy="4" stdDeviation="3" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Ribbon -->
  <path d="M 30 120 L 30 145 L 45 135 L 60 145 L 60 120 Z" fill="url(#ribbonGradient)" filter="url(#shadow)"/>
  <path d="M 60 120 L 60 145 L 75 135 L 90 145 L 90 120 Z" fill="url(#ribbonGradient)" filter="url(#shadow)"/>
  
  <!-- Main Badge Circle -->
  <circle cx="60" cy="60" r="45" fill="url(#goldGradient)" stroke="#B45309" stroke-width="2" filter="url(#shadow)"/>
  
  <!-- Inner Circle -->
  <circle cx="60" cy="60" r="35" fill="#FFFFFF" stroke="#B45309" stroke-width="1.5"/>
  
  <!-- Decorative Stars -->
  <g fill="#FFD700" stroke="#B45309" stroke-width="0.5">
    <path d="M 25 25 L 27 30 L 32 30 L 28 33 L 30 38 L 25 35 L 20 38 L 22 33 L 18 30 L 23 30 Z"/>
    <path d="M 95 25 L 97 30 L 102 30 L 98 33 L 100 38 L 95 35 L 90 38 L 92 33 L 88 30 L 93 30 Z"/>
    <path d="M 15 75 L 17 80 L 22 80 L 18 83 L 20 88 L 15 85 L 10 88 L 12 83 L 8 80 L 13 80 Z"/>
    <path d="M 105 75 L 107 80 L 112 80 L 108 83 L 110 88 L 105 85 L 100 88 L 102 83 L 98 80 L 103 80 Z"/>
  </g>
  
  <!-- Course Title in Center -->
  ${line2 ? 
    `<text x="60" y="57" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.min(14, fontSize1 + 4)}" font-weight="bold" fill="${config.color}">
      ${line1}
    </text>
    <text x="60" y="75" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.min(12, fontSize2 + 4)}" font-weight="bold" fill="${config.color}">
      ${line2}
    </text>` : 
    `<text x="60" y="66" text-anchor="middle" font-family="Arial, sans-serif" font-size="${Math.min(16, fontSize1 + 6)}" font-weight="bold" fill="${config.color}">
      ${line1}
    </text>`
  }
  
  <!-- Achievement Text -->
  <text x="60" y="135" text-anchor="middle" font-family="Arial, sans-serif" font-size="6" fill="${config.color}">
    修了証
  </text>
</svg>`
}

export async function POST(request: NextRequest) {
  try {
    const { userId, role } = await getCurrentUserRole(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    if (!role || (role !== 'admin' && role !== 'system_admin')) {
      return NextResponse.json(
        { error: '管理者のアクセス権限が必要です' },
        { status: 403 }
      )
    }

    const badgeConfig: BadgeConfig = await request.json()

    // バリデーション
    const requiredFields: (keyof BadgeConfig)[] = ['id', 'color', 'title', 'description', 'courseId']
    for (const field of requiredFields) {
      if (!badgeConfig[field]) {
        return NextResponse.json(
          { error: `${field}は必須です` },
          { status: 400 }
        )
      }
    }

    console.log(`🎨 [BadgeGenerate] バッジ生成開始: ${badgeConfig.id}`)

    // SVGコンテンツ生成
    const svgContent = generateBadgeSVG(badgeConfig)

    // public/badges ディレクトリが存在しない場合は作成
    const badgesDir = join(process.cwd(), 'public', 'badges')
    try {
      await mkdir(badgesDir, { recursive: true })
    } catch (_error) {
      console.log('📁 [BadgeGenerate] バッジディレクトリは既に存在します')
    }

    // SVGファイルを保存 - URL-safe filename
    const safeFileName = badgeConfig.courseId.replace(/[^a-zA-Z0-9_-]/g, '_')
    const fileName = `${safeFileName}.svg`
    const filePath = join(badgesDir, fileName)
    
    await writeFile(filePath, svgContent, 'utf-8')

    console.log(`✅ [BadgeGenerate] バッジ生成完了: ${fileName}`)

    return NextResponse.json({
      success: true,
      message: `バッジ「${badgeConfig.title}」を生成しました`,
      fileName,
      badgeImageUrl: `/badges/${fileName}`
    })

  } catch (error) {
    console.error('❌ [BadgeGenerate] Unexpected error:', error)
    return NextResponse.json(
      { 
        error: 'バッジ生成中にエラーが発生しました',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}