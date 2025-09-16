import { Question } from './types'

let questionsCache: Question[] | null = null

export async function getAllQuestions(): Promise<Question[]> {
  if (questionsCache) {
    return questionsCache
  }

  try {
    const response = await fetch('/questions.json')
    if (!response.ok) {
      throw new Error('Failed to fetch questions')
    }
    const data = await response.json()
    questionsCache = data.questions
    return questionsCache || []
  } catch (error) {
    console.error('Error loading questions:', error)
    return []
  }
}

export function getQuestionsByCategory(questions: Question[], category: string): Question[] {
  return questions.filter(q => q.category === category && !q.deleted)
}

export function getRandomQuestions(questions: Question[], count: number = 10): Question[] {
  const activeQuestions = questions.filter(q => !q.deleted)
  const shuffled = [...activeQuestions].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}

export function getQuestionById(questions: Question[], id: number): Question | undefined {
  return questions.find(q => q.id === id && !q.deleted)
}

export function getCategories(questions: Question[]): string[] {
  const activeQuestions = questions.filter(q => !q.deleted)
  return Array.from(new Set(activeQuestions.map(q => q.category)))
}