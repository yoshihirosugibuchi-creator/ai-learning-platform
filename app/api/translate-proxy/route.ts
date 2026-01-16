import { NextRequest, NextResponse } from 'next/server'

/**
 * Microsoft Translator プロキシAPI
 * クライアントサイドからの翻訳リクエストを安全に処理
 */

interface TranslationRequest {
  text: string
}

interface TranslationResponse {
  success: boolean
  translation?: string
  error?: string
}

export async function POST(request: NextRequest): Promise<NextResponse<TranslationResponse>> {
  try {
    const body = await request.json() as TranslationRequest
    const { text } = body

    if (!text || text.trim() === '') {
      return NextResponse.json({
        success: false,
        error: 'テキストが指定されていません'
      }, { status: 400 })
    }

    // Microsoft Translator APIキー確認（.env.localから取得）
    const subscriptionKey = process.env.MICROSOFT_TRANSLATOR_KEY
    if (!subscriptionKey) {
      console.warn('❌ [Translate Proxy] Microsoft Translator API key not configured')
      return NextResponse.json({
        success: false,
        error: '翻訳サービスが設定されていません'
      }, { status: 500 })
    }

    console.log(`🔍 [Translate Proxy] 翻訳リクエスト: "${text}"`)

    // Microsoft Translator API呼び出し
    const endpoint = 'https://api.cognitive.microsofttranslator.com/translate'
    const params = new URLSearchParams({
      'api-version': '3.0',
      'to': 'en',
      'from': 'ja'
    })

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Region': 'japaneast'
      },
      body: JSON.stringify([{ text: text.trim() }])
    })

    if (!response.ok) {
      throw new Error(`Translation API failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    
    if (result && result.length > 0 && result[0].translations && result[0].translations.length > 0) {
      const translation = result[0].translations[0].text
      console.log(`✅ [Translate Proxy] 翻訳成功: "${text}" -> "${translation}"`)
      
      return NextResponse.json({
        success: true,
        translation
      })
    } else {
      throw new Error('翻訳結果が不正です')
    }

  } catch (error) {
    console.error('❌ [Translate Proxy] エラー:', error)
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '翻訳中にエラーが発生しました'
    }, { status: 500 })
  }
}