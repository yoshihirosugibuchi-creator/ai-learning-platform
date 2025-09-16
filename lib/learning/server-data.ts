import { LearningCourse } from '@/lib/types/learning'

/**
 * サーバーサイド専用の学習コンテンツデータ読み込み関数
 * これらの関数はサーバーコンポーネントでのみ使用可能です
 */

// サーバーサイドでのコース一覧取得
export async function getLearningCoursesServer() {
  const fs = await import('fs/promises')
  const path = await import('path')
  
  try {
    const filePath = path.join(process.cwd(), 'public/learning-data/courses.json')
    const fileContent = await fs.readFile(filePath, 'utf8')
    const data = JSON.parse(fileContent)
    return data.courses
  } catch (error) {
    console.error('Error loading courses on server:', error)
    return []
  }
}

// サーバーサイドでの特定コース詳細取得
export async function getLearningCourseDetailsServer(courseId: string): Promise<LearningCourse | null> {
  const fs = await import('fs/promises')
  const path = await import('path')
  
  try {
    const filePath = path.join(process.cwd(), `public/learning-data/${courseId}.json`)
    const fileContent = await fs.readFile(filePath, 'utf8')
    const courseData = JSON.parse(fileContent)
    return courseData
  } catch (error) {
    console.error(`Error loading course details for ${courseId} on server:`, error)
    return null
  }
}