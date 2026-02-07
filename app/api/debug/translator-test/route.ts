import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/debug/translator-test
 * Microsoft Translator APIの動作確認用エンドポイント
 * 本番でもキー確認のみ可能（翻訳テストは開発のみ）
 */
export async function GET(_request: NextRequest) {
  const subscriptionKey = process.env.MICROSOFT_TRANSLATOR_KEY
  const isProd = process.env.NODE_ENV === 'production'

  // 本番環境ではキーの存在確認のみ
  if (isProd) {
    return NextResponse.json({
      environment: 'production',
      envCheck: {
        hasKey: !!subscriptionKey,
        keyLength: subscriptionKey?.length || 0,
        keyPreview: subscriptionKey ? `${subscriptionKey.substring(0, 4)}...${subscriptionKey.substring(subscriptionKey.length - 4)}` : 'NOT SET'
      },
      message: 'Translation test is disabled in production. Only key check is available.'
    })
  }

  const testText = '人工知能の基礎と動向'

  const result = {
    envCheck: {
      nodeEnv: process.env.NODE_ENV,
      hasKey: !!subscriptionKey,
      keyPreview: subscriptionKey ? subscriptionKey.substring(0, 10) + '...' : 'NOT SET',
      keyLength: subscriptionKey?.length || 0
    },
    translation: {
      testText,
      translatedText: null as string | null,
      error: null as string | null,
      status: null as number | null
    }
  }

  if (!subscriptionKey) {
    result.translation.error = 'MICROSOFT_TRANSLATOR_KEY not found in environment'
    return NextResponse.json(result)
  }

  try {
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
      body: JSON.stringify([{ text: testText }])
    })

    result.translation.status = response.status

    if (!response.ok) {
      const errorText = await response.text()
      result.translation.error = `API error (${response.status}): ${errorText}`
      return NextResponse.json(result)
    }

    const data = await response.json()
    if (data && data.length > 0 && data[0].translations) {
      result.translation.translatedText = data[0].translations[0].text
    }

    return NextResponse.json(result)
  } catch (error) {
    result.translation.error = error instanceof Error ? error.message : String(error)
    return NextResponse.json(result)
  }
}
