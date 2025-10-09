import { getLearningCoursesServer } from '@/lib/learning/server-data'

export async function GET() {
  try {
    const courses = await getLearningCoursesServer()
    return Response.json({
      success: true,
      method: 'server-side file read from public/learning-data/courses.json',
      coursesCount: courses.length,
      environment: process.env.NODE_ENV,
      platform: process.env.VERCEL ? 'vercel' : 'local',
      workingDirectory: process.cwd(),
      courses: courses.slice(0, 2) // 最初の2件のみ表示
    })
  } catch (error) {
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      environment: process.env.NODE_ENV,
      platform: process.env.VERCEL ? 'vercel' : 'local',
      workingDirectory: process.cwd()
    })
  }
}