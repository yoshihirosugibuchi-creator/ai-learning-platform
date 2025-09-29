import { getAllQuestions, getCategories } from './questions'
import { mainCategories, industryCategories } from './categories'

export async function getAppStats() {
  try {
    const questions = await getAllQuestions()
    
    // 削除されていない有効な問題のみをカウント
    const activeQuestions = questions.filter(q => !q.deleted)
    const questionCategories = getCategories(activeQuestions)
    
    // 問題数（削除されていない問題のみ）
    const totalQuestions = activeQuestions.length
    
    // カテゴリー数をDB APIから動的に取得
    let totalCategories = mainCategories.length + industryCategories.length // フォールバック値
    try {
      const response = await fetch('/api/categories')
      if (response.ok) {
        const data = await response.json()
        const categories = data.categories || []
        totalCategories = categories.length
      }
    } catch (error) {
      console.warn('Failed to fetch categories from API, using static fallback:', error)
    }
    
    // サブカテゴリー数をDB APIから動的に取得
    let totalSubcategories = mainCategories.reduce((sum, cat) => sum + cat.subcategories.length, 0) +
                            industryCategories.reduce((sum, cat) => sum + cat.subcategories.length, 0) // フォールバック値
    try {
      const response = await fetch('/api/subcategories')
      if (response.ok) {
        const data = await response.json()
        const subcategories = data.subcategories || []
        totalSubcategories = subcategories.length
      }
    } catch (error) {
      console.warn('Failed to fetch subcategories from API, using static fallback:', error)
    }
    
    return {
      totalQuestions,
      totalCategories,
      totalSubcategories,
      questionsFromData: questionCategories.length // 実際に問題があるカテゴリー数
    }
  } catch (error) {
    console.error('Error calculating stats:', error)
    // フォールバック値（TypeScriptの静的データから計算）
    return {
      totalQuestions: 115,
      totalCategories: mainCategories.length + industryCategories.length,
      totalSubcategories: mainCategories.reduce((sum, cat) => sum + cat.subcategories.length, 0) +
                         industryCategories.reduce((sum, cat) => sum + cat.subcategories.length, 0),
      questionsFromData: 0
    }
  }
}