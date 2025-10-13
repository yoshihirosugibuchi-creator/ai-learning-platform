import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // 開発中のスタブAPI
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  // 開発中メッセージを返す
  return NextResponse.json({
    status: 'under_development',
    message: 'AIレコメンデーション機能は開発中です',
    recommendations: [],
    metadata: {
      userId,
      generatedAt: new Date().toISOString(),
      version: '0.1.0-dev'
    }
  })
}