/**
 * Vercel Blob Storage オプション機能
 * 研究・検証目的のためのファイル永続化
 */

import { put } from '@vercel/blob'

// Blob Storage設定
export const BLOB_CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_TYPES: ['application/pdf'],
  ACCESS_TYPE: 'public' as const,
  WARNING_MESSAGE: `
⚠️ Blob Storage警告

以下の点にご注意ください：
• アップロードされたファイルは公開状態になります
• URLを知る人は誰でもアクセスできます
• 機密情報を含むファイルはアップロードしないでください
• 研究・検証目的のテスト用途での利用を推奨します
• ファイルサイズ制限: 50MB以下

このオプションを使用しますか？
  `
}

// Blob Storage利用可否チェック
export function isBlobStorageEnabled(): boolean {
  return process.env.BLOB_READ_WRITE_TOKEN !== undefined
}

// ファイル容量チェック
export function validateFileForBlob(file: File): { valid: boolean; error?: string } {
  if (file.size > BLOB_CONFIG.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `ファイルサイズが制限を超えています。上限: ${BLOB_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`
    }
  }

  if (!BLOB_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `サポートされていないファイル形式です。対応形式: ${BLOB_CONFIG.ALLOWED_TYPES.join(', ')}`
    }
  }

  return { valid: true }
}

// Blob Storageへファイルアップロード
export async function uploadToBlob(
  file: File,
  userId: string,
  workflowId?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    if (!isBlobStorageEnabled()) {
      return {
        success: false,
        error: 'Blob Storageが有効化されていません。環境変数BLOB_READ_WRITE_TOKENを設定してください。'
      }
    }

    // ファイル名生成（重複回避）
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `ai-course-sources/${userId}/${workflowId || 'temp'}/${timestamp}-${randomSuffix}-${sanitizedFileName}`

    console.log(`📦 [Blob Storage] Uploading file: ${fileName} (${file.size} bytes)`)

    // Vercel Blob へアップロード
    const blob = await put(fileName, file, {
      access: 'public',
      addRandomSuffix: true
    })

    console.log(`✅ [Blob Storage] Upload successful: ${blob.url}`)

    return {
      success: true,
      url: blob.url
    }

  } catch (error) {
    console.error('❌ [Blob Storage] Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'アップロードに失敗しました'
    }
  }
}

// Blob URL存在チェック（オプション）
export async function checkBlobExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

// Blob Storage統計情報取得（開発用）
export function getBlobStorageStats() {
  return {
    enabled: isBlobStorageEnabled(),
    maxFileSize: BLOB_CONFIG.MAX_FILE_SIZE,
    allowedTypes: BLOB_CONFIG.ALLOWED_TYPES,
    warningMessage: BLOB_CONFIG.WARNING_MESSAGE
  }
}