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
    
    // カテゴリー数（メインカテゴリー + 業界カテゴリー）
    const totalCategories = mainCategories.length + industryCategories.length
    
    // サブカテゴリー数を計算
    const totalSubcategories = mainCategories.reduce((sum, cat) => sum + cat.subcategories.length, 0) +
                              industryCategories.reduce((sum, cat) => sum + cat.subcategories.length, 0)
    
    return {
      totalQuestions,
      totalCategories,
      totalSubcategories,
      questionsFromData: questionCategories.length // 実際に問題があるカテゴリー数
    }
  } catch (error) {
    console.error('Error calculating stats:', error)
    // フォールバック値
    return {
      totalQuestions: 115,
      totalCategories: 12,
      totalSubcategories: 50,
      questionsFromData: 0
    }
  }
}