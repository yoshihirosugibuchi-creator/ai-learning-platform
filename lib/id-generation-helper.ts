/**
 * ID生成ヘルパー関数（日本語→英語翻訳対応）
 * check-id APIのロジックをサーバーサイドで直接実行するためのライブラリ
 */

import { supabaseAdmin } from '@/lib/supabase-admin'

// 有効なテーブル名の型定義
type ValidTableName = 'learning_courses' | 'learning_genres' | 'learning_themes' | 'learning_sessions' | 'session_contents' | 'session_quizzes'

// 基本辞書（高精度・高速）
const basicDictionary: { [key: string]: string } = {
  // コース系
  'ファイナンス': 'finance',
  'マーケティング': 'marketing', 
  'ビジネス': 'business',
  'マネジメント': 'management',
  'プロジェクトマネジメント': 'project_management',
  'プロジェクト': 'project',
  '経営': 'management',
  '営業': 'sales',
  '金融': 'finance',
  
  // 思考・分析系
  '思考': 'thinking',
  '分析': 'analysis',
  'フレームワーク': 'framework',
  '基盤': 'foundation',
  '基礎': 'basics',
  '応用': 'advanced',
  '実践': 'practice',
  '活用': 'application',
  '理解': 'understanding',
  '体験': 'experience',
  
  // AI・技術系
  'ai': 'ai',
  '人工知能': 'ai',
  'プロンプト': 'prompt',
  'データ': 'data',
  'デジタル': 'digital',
  'テクノロジー': 'technology',
  
  // 方法論・手法
  'mece': 'mece',
  '結論ファースト': 'conclusion_first',
  'ソーワット': 'so_what_why_so',
  '3c分析': '3c_analysis',
  'カスタマージャーニー': 'customer_journey',
  'ペルソナ': 'persona',
  
  // 顧客・市場系
  '顧客': 'customer',
  '市場': 'market',
  'コンテンツ': 'content',
  'ソーシャル': 'social',
  'メディア': 'media',
  
  // 汎用
  '新しい': 'new',
  'テーマ': 'theme',
  'ジャンル': 'genre',
  'セッション': 'session',
  'コース': 'course',
  '入門': 'introduction',
  '概念': 'concepts',
  '手法': 'methods',
  '戦略': 'strategy',
  '評価': 'evaluation',
  '倫理': 'ethics'
}

// Microsoft Translator翻訳（フォールバック）
const translateWithMicrosoft = async (text: string): Promise<string | null> => {
  try {
    // Microsoft Translator APIキーを環境変数から取得
    const subscriptionKey = process.env.MICROSOFT_TRANSLATOR_KEY
    
    if (!subscriptionKey) {
      console.warn('Microsoft Translator API key not found')
      return null
    }

    // リージョン指定のエンドポイント（日本リージョンの場合）
    const endpoint = 'https://api.cognitive.microsofttranslator.com/translate'
    const params = new URLSearchParams({
      'api-version': '3.0',
      'to': 'en',
      'from': 'ja'
    })

    console.log(`🔍 [Microsoft Translator] Translating: "${text}"`)

    const response = await fetch(`${endpoint}?${params}`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': subscriptionKey,
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Region': 'japaneast' // リージョン明示指定
      },
      body: JSON.stringify([{ text }])
    })

    if (!response.ok) {
      console.warn(`Microsoft Translator API failed (${response.status}). Falling back to timestamp ID.`)
      return null  // フォールバックして続行
    }

    const result = await response.json()
    if (result && result.length > 0 && result[0].translations) {
      return result[0].translations[0].text
    }

    return null
  } catch (error) {
    console.error('Microsoft Translator error:', error)
    return null
  }
}

// ID生成・クリーニング
export const generateSuggestedId = async (title: string, type: string): Promise<string> => {
  if (!title || title.trim() === '') {
    return `${type}_${Date.now().toString(36).slice(-6)}`
  }

  const cleanTitle = title.trim()
  let english = ''

  // 1. 基本辞書での翻訳（完全修正版）
  console.log(`🔍 [DEBUG] Starting translation for: "${cleanTitle}"`)
  
  // まずは完全マッチを試行
  const fullMatch = basicDictionary[cleanTitle.toLowerCase()]
  if (fullMatch) {
    console.log(`✅ [DEBUG] Full match found: "${cleanTitle}" -> "${fullMatch}"`)
    english = fullMatch
  } else {
    // 単語レベルでの翻訳
    const words = cleanTitle.split(/[\s　]+/) // 日本語スペースも考慮
    const translatedWords: string[] = []
    let hasUntranslated = false
    
    console.log(`🔍 [DEBUG] Word-level translation for: [${words.join(', ')}]`)
    
    for (const word of words) {
      const dictResult = basicDictionary[word.toLowerCase()]
      if (dictResult) {
        console.log(`  ✅ "${word}" -> "${dictResult}"`)
        translatedWords.push(dictResult)
      } else {
        console.log(`  ❌ "${word}" -> not found in dictionary`)
        translatedWords.push(word)
        hasUntranslated = true
      }
    }

    english = translatedWords.join('_') // スペースではなくアンダースコアで結合
    console.log(`🔍 [DEBUG] Word-level result: "${english}" (hasUntranslated: ${hasUntranslated})`)
  }

  // 2. まだ日本語が残っている場合はMicrosoft Translator
  if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(english)) {
    console.log(`🔍 [DEBUG] Translating: "${cleanTitle}" -> current: "${english}"`)
    const translated = await translateWithMicrosoft(cleanTitle) // 元のタイトルを翻訳
    if (translated) {
      console.log(`✅ [DEBUG] Translation success: "${translated}"`)
      english = translated
    } else {
      console.log(`❌ [DEBUG] Translation failed, keeping: "${english}"`)
    }
  } else {
    console.log(`✅ [DEBUG] No Japanese detected in: "${english}"`)
  }

  // 3. IDクリーニング
  let cleanId = english
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // 英数字とスペースのみ
    .replace(/\s+/g, '_')        // スペース → アンダースコア
    .replace(/_+/g, '_')         // 連続アンダースコア → 1個
    .replace(/^_|_$/g, '')       // 先頭末尾アンダースコア削除
    .slice(0, 30)                // 長さ制限

  // 4. 空・短すぎる場合のフォールバック
  if (!cleanId || cleanId.length < 2) {
    cleanId = `${type}_${Date.now().toString(36).slice(-6)}`
  }

  return cleanId
}

// 使用可能IDを見つける（番号付きで試行）
export const findAvailableId = async (tableName: ValidTableName, baseId: string, excludeId?: string): Promise<string> => {
  let candidate = baseId
  let counter = 1

  while (counter <= 10) {
    let query = supabaseAdmin
      .from(tableName)
      .select('id')
      .eq('id', candidate)

    if (excludeId) {
      query = query.neq('id', excludeId)
    }

    const { data: existing } = await query.single()

    if (!existing) {
      return candidate
    }

    candidate = `${baseId}_${counter}`
    counter++
  }

  // 最後の手段：タイムスタンプ付き
  return `${baseId}_${Date.now().toString(36).slice(-6)}`
}

// 統一ID生成関数
export const generateUniqueId = async (type: 'course' | 'genre' | 'theme' | 'session' | 'content' | 'quiz', title: string, excludeId?: string): Promise<string> => {
  // テーブル名マッピング
  const tableMapping: Record<string, ValidTableName> = {
    course: 'learning_courses',
    genre: 'learning_genres', 
    theme: 'learning_themes',
    session: 'learning_sessions',
    content: 'session_contents',
    quiz: 'session_quizzes'
  }

  const tableName = tableMapping[type]
  const baseId = await generateSuggestedId(title, type)
  return await findAvailableId(tableName, baseId, excludeId)
}