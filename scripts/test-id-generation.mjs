import { config } from 'dotenv'
config({ path: '.env.local' })

// Test the translation logic directly
const translateWithMicrosoft = async (text) => {
  const subscriptionKey = process.env.MICROSOFT_TRANSLATOR_KEY

  const keyPreview = subscriptionKey ? subscriptionKey.substring(0, 10) + '...' : 'NOT SET'
  console.log('🔍 Checking API key:', keyPreview)

  if (!subscriptionKey) {
    console.warn('Microsoft Translator API key not found')
    return null
  }

  const endpoint = 'https://api.cognitive.microsofttranslator.com/translate'
  const params = new URLSearchParams({
    'api-version': '3.0',
    'to': 'en',
    'from': 'ja'
  })

  console.log('🔍 [Microsoft Translator] Translating:', text)

  const response = await fetch(endpoint + '?' + params, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Region': 'japaneast'
    },
    body: JSON.stringify([{ text }])
  })

  console.log('Response status:', response.status)

  if (!response.ok) {
    const errorText = await response.text()
    console.warn('Microsoft Translator API failed (' + response.status + '):', errorText)
    return null
  }

  const result = await response.json()
  if (result && result.length > 0 && result[0].translations) {
    return result[0].translations[0].text
  }

  return null
}

// Test with actual course titles
const testTitles = [
  'AI基礎コース　中級（G検定レベル）',
  '人工知能の基礎と動向',
  '機械学習の理論と手法',
  'ディープラーニングの応用技術'
]

console.log('========================================')
console.log('🔍 ID Generation Test')
console.log('========================================')

for (const title of testTitles) {
  console.log('')
  console.log('📝 Testing:', title)

  // Check if title has Japanese
  const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(title)
  console.log('   Has Japanese:', hasJapanese)

  if (hasJapanese) {
    const translated = await translateWithMicrosoft(title)
    console.log('   Translated:', translated || '(FAILED)')

    if (translated) {
      const cleanId = translated
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 30)
      console.log('   Clean ID:', cleanId)
    }
  }
}
