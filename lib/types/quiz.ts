// 🎯 統一クイズタイプ（システム全体の標準）
export type UnifiedQuizType =
  | 'business-ai'        // ビジネスAIパーソナライズクイズ（基本カテゴリーのみ）
  | 'self-personalized'  // セルフパーソナライズクイズ（ユーザー選択カテゴリー）
  | 'category'           // カテゴリー指定クイズ（単一カテゴリー）
  | 'review'             // 復習クイズ（REVIEW_NEEDEDフラグベース）

// クイズタイプ判定ヘルパー関数
export function isValidUnifiedQuizType(value: string): value is UnifiedQuizType {
  return ['business-ai', 'self-personalized', 'category', 'review'].includes(value)
}

// レガシー値からUnifiedQuizTypeへの変換
export function convertToUnifiedQuizType(legacyValue: string): UnifiedQuizType {
  switch (legacyValue) {
    case 'main':
    case 'random':
    case 'business-ai':
      return 'business-ai'
    case 'category-specific':
    case 'category':
      return 'category'
    case 'self-personalized':
      return 'self-personalized'
    case 'review':
      return 'review'
    default:
      console.warn(`⚠️ Unknown legacy quiz type: ${legacyValue}, defaulting to business-ai`)
      return 'business-ai'
  }
}