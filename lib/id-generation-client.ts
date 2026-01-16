/**
 * クライアントサイド用ID生成ライブラリ
 * プロキシAPI中心 + 基本辞書フォールバック
 */

// 基本辞書（高頻度語のみ）
const basicDictionary: Record<string, string> = {
  // ビジネス基本
  'ビジネス': 'business',
  'マーケティング': 'marketing',
  'マネジメント': 'management',
  '経営': 'management',
  '営業': 'sales',
  '金融': 'finance',
  'ファイナンス': 'finance',
  
  // 学習・思考
  '基礎': 'basics',
  '応用': 'advanced',
  '実践': 'practice',
  '思考': 'thinking',
  '分析': 'analysis',
  'フレームワーク': 'framework',
  
  // 技術基本
  'ai': 'ai',
  '人工知能': 'ai',
  'データ': 'data',
  'デジタル': 'digital',
  
  // 汎用
  '入門': 'introduction',
  '概念': 'concepts',
  '手法': 'methods',
  '戦略': 'strategy'
}

/**
 * プロキシAPI経由での翻訳
 */
const translateViaProxy = async (text: string): Promise<string | null> => {
  try {
    console.log(`🔍 [ID Client] API翻訳: "${text}"`)
    
    const response = await fetch('/api/translate-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    })

    if (!response.ok) {
      throw new Error(`Translation API failed: ${response.status}`)
    }

    const result = await response.json()
    if (result.success && result.translation) {
      console.log(`✅ [ID Client] API翻訳成功: "${text}" -> "${result.translation}"`)
      return result.translation
    }

    return null
  } catch (error) {
    console.error('❌ [ID Client] API翻訳エラー:', error)
    return null
  }
}

/**
 * 基本辞書での翻訳試行
 */
const tryDictionaryTranslation = (text: string): { success: boolean; result: string } => {
  const cleanText = text.trim().toLowerCase()
  
  // 完全マッチ
  const fullMatch = basicDictionary[cleanText]
  if (fullMatch) {
    console.log(`✅ [ID Client] 辞書マッチ: "${text}" -> "${fullMatch}"`)
    return { success: true, result: fullMatch }
  }
  
  // 単語レベルマッチ
  const words = cleanText.split(/[\s　]+/)
  const translatedWords: string[] = []
  let hasUntranslated = false
  
  for (const word of words) {
    const dictResult = basicDictionary[word]
    if (dictResult) {
      translatedWords.push(dictResult)
    } else {
      translatedWords.push(word)
      hasUntranslated = true
    }
  }
  
  const result = translatedWords.join('_')
  
  if (!hasUntranslated) {
    console.log(`✅ [ID Client] 辞書部分マッチ: "${text}" -> "${result}"`)
    return { success: true, result }
  }
  
  console.log(`⚠️ [ID Client] 辞書不完全: "${text}" -> "${result}" (未翻訳含む)`)
  return { success: false, result }
}

/**
 * 英語テキストをID形式にクリーニング
 */
const cleanEnglishToId = (english: string): string => {
  return english
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')  // 英数字とスペースのみ
    .replace(/\s+/g, '_')         // スペース → アンダースコア
    .replace(/_+/g, '_')          // 連続アンダースコア → 1個
    .replace(/^_|_$/g, '')        // 先頭末尾アンダースコア削除
    .slice(0, 30)                 // 長さ制限
}

/**
 * メインのクライアントサイドID生成関数
 */
export const generateClientId = async (type: string, title: string): Promise<string> => {
  if (!title || title.trim() === '') {
    return `${type}_${Date.now().toString(36).slice(-6)}`
  }

  const cleanTitle = title.trim()
  
  // 1. 基本辞書での翻訳を試行
  const dictResult = tryDictionaryTranslation(cleanTitle)
  if (dictResult.success) {
    const cleanId = cleanEnglishToId(dictResult.result)
    if (cleanId.length >= 2) {
      return cleanId
    }
  }
  
  // 2. プロキシAPI経由での翻訳
  const apiTranslation = await translateViaProxy(cleanTitle)
  if (apiTranslation) {
    const cleanId = cleanEnglishToId(apiTranslation)
    if (cleanId.length >= 2) {
      return cleanId
    }
  }
  
  // 3. 最終フォールバック: 辞書の部分結果またはタイムスタンプ
  if (dictResult.result.length >= 2) {
    const cleanId = cleanEnglishToId(dictResult.result)
    if (cleanId.length >= 2) {
      console.log(`🔧 [ID Client] フォールバック使用: "${cleanTitle}" -> "${cleanId}"`)
      return cleanId
    }
  }
  
  // 最後の手段
  const fallbackId = `${type}_${Date.now().toString(36).slice(-6)}`
  console.log(`⚠️ [ID Client] タイムスタンプフォールバック: "${cleanTitle}" -> "${fallbackId}"`)
  return fallbackId
}

/**
 * コンテンツID生成（セッションID + 番号パターン）
 */
export const generateContentId = (sessionId: string, contentType: string, order: number): string => {
  const orderNum = order.toString().padStart(2, '0')
  return `${sessionId}_content_${orderNum}`
}

/**
 * クイズID生成（セッションID + 番号パターン）  
 */
export const generateQuizId = (sessionId: string, order: number): string => {
  const orderNum = order.toString().padStart(2, '0')
  return `${sessionId}_quiz_${orderNum}`
}