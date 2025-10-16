/**
 * 格言カード統一ビジュアルテーマシステム
 * 作成日: 2025年10月16日
 * 目的: レアリティ・著者別の統一ビジュアル管理
 */

// レアリティテーマ定義
export interface RarityTheme {
  cssClass: string
  themeName: string
  colors: string[]
  description: string
}

export const RARITY_THEMES: Record<string, RarityTheme> = {
  'コモン': {
    cssClass: 'wisdom-card-common',
    themeName: 'earth',
    colors: ['#8B4513', '#CD853F', '#D2B48C'],
    description: 'アース（大地）テーマ - 安定感と基礎を表現'
  },
  'レア': {
    cssClass: 'wisdom-card-rare', 
    themeName: 'ocean',
    colors: ['#4169E1', '#00BFFF', '#87CEEB'],
    description: 'オーシャン（海洋）テーマ - 深い知恵と流動性を表現'
  },
  'エピック': {
    cssClass: 'wisdom-card-epic',
    themeName: 'fire', 
    colors: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
    description: 'ファイア（炎）テーマ - 情熱と変革を表現'
  },
  'レジェンダリー': {
    cssClass: 'wisdom-card-legendary',
    themeName: 'cosmic',
    colors: ['#FFD700', '#8A2BE2', '#FF69B4'],
    description: 'コズミック（宇宙）テーマ - 無限の可能性と叡智を表現'
  }
}

// 著者別特別テーマ定義
export interface AuthorSpecialTheme {
  cssClass: string
  themeName: string
  description: string
  overrideRarity?: boolean // レアリティテーマを上書きするか
}

export const AUTHOR_SPECIAL_THEMES: Record<string, AuthorSpecialTheme> = {
  'スティーブ・ジョブズ': {
    cssClass: 'wisdom-card-jobs-special',
    themeName: 'apple-innovation',
    description: 'Apple風イノベーションテーマ - Think Different精神',
    overrideRarity: true
  },
  '稲盛和夫': {
    cssClass: 'wisdom-card-inamori-special', 
    themeName: 'zen-philosophy',
    description: '禅フィロソフィーテーマ - 心を高める経営哲学',
    overrideRarity: true
  }
  // 将来的に他の著者も追加可能
  // 'ピーター・ドラッカー': { ... },
  // 'ウォーレン・バフェット': { ... }
}

/**
 * カードのビジュアルテーマを決定
 * @param rarity - カードのレアリティ
 * @param author - カードの著者
 * @returns 適用すべきCSSクラス配列
 */
export function getWisdomCardTheme(rarity: string, author: string): string[] {
  const cssClasses: string[] = ['wisdom-card-enhanced']
  
  // 著者特別テーマをチェック
  const authorTheme = AUTHOR_SPECIAL_THEMES[author]
  if (authorTheme) {
    cssClasses.push(authorTheme.cssClass)
    
    // レアリティテーマを上書きしない場合のみ追加
    if (!authorTheme.overrideRarity) {
      const rarityTheme = RARITY_THEMES[rarity]
      if (rarityTheme) {
        cssClasses.push(rarityTheme.cssClass)
      }
    }
  } else {
    // 著者特別テーマがない場合、レアリティテーマを適用
    const rarityTheme = RARITY_THEMES[rarity]
    if (rarityTheme) {
      cssClasses.push(rarityTheme.cssClass)
    }
  }
  
  return cssClasses
}

/**
 * パーティクル数を決定
 * @param rarity - カードのレアリティ
 * @returns パーティクル数
 */
export function getParticleCount(rarity: string): number {
  const particleCounts: Record<string, number> = {
    'コモン': 1,
    'レア': 2, 
    'エピック': 3,
    'レジェンダリー': 4
  }
  
  return particleCounts[rarity] || 1
}

/**
 * カードのビジュアル情報を取得
 * @param rarity - カードのレアリティ
 * @param author - カードの著者
 * @returns ビジュアル情報オブジェクト
 */
export function getWisdomCardVisualInfo(rarity: string, author: string) {
  const cssClasses = getWisdomCardTheme(rarity, author)
  const particleCount = getParticleCount(rarity)
  
  const authorTheme = AUTHOR_SPECIAL_THEMES[author]
  const rarityTheme = RARITY_THEMES[rarity]
  
  return {
    cssClasses,
    particleCount,
    hasSpecialTheme: !!authorTheme,
    themeName: authorTheme?.themeName || rarityTheme?.themeName || 'default',
    themeDescription: authorTheme?.description || rarityTheme?.description || '',
    colors: rarityTheme?.colors || []
  }
}