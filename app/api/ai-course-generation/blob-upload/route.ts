/**
 * Vercel Blob クライアントサイドアップロード用API
 * POST: アップロードトークン発行・完了処理
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { getCurrentUserRole } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const { userId } = await getCurrentUserRole(request)
    if (!userId) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const body = await request.json() as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        // アップロード前のバリデーション
        console.log(`📦 [Blob Upload] Generating token for: ${pathname}, user: ${userId}`)

        return {
          allowedContentTypes: ['application/pdf'],
          maximumSizeInBytes: 50 * 1024 * 1024, // 50MB
          tokenPayload: JSON.stringify({
            userId,
            uploadedAt: new Date().toISOString()
          }),
        }
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        // アップロード完了時の処理
        console.log(`✅ [Blob Upload] Upload completed: ${blob.url}`)

        try {
          const payload = JSON.parse(tokenPayload || '{}')
          console.log(`📝 [Blob Upload] Token payload:`, payload)
        } catch {
          console.error('❌ [Blob Upload] Failed to parse token payload')
        }
      },
    })

    return NextResponse.json(jsonResponse)

  } catch (error) {
    console.error('❌ [Blob Upload] Error:', error)
    return NextResponse.json(
      { error: 'Blobアップロードの処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
