#!/usr/bin/env node

/**
 * コース学習進捗リセットスクリプト
 * 
 * 使用方法:
 * node scripts/reset-course-progress.js <userId> <courseId>
 * 
 * 例:
 * node scripts/reset-course-progress.js "user-123" "business-fundamentals"
 * 
 * または、開発サーバーが起動している状態でAPIを直接呼び出し:
 * curl -X POST http://localhost:3000/api/admin/reset-course-progress \
 *   -H "Content-Type: application/json" \
 *   -d '{"userId": "user-123", "courseId": "business-fundamentals"}'
 */

const userId = process.argv[2]
const courseId = process.argv[3]

if (!userId || !courseId) {
  console.error('❌ 使用方法: node scripts/reset-course-progress.js <userId> <courseId>')
  console.error('例: node scripts/reset-course-progress.js "user-123" "business-fundamentals"')
  process.exit(1)
}

async function resetCourseProgress() {
  try {
    console.log(`🔄 コース進捗をリセット中: User=${userId}, Course=${courseId}`)
    
    const response = await fetch('http://localhost:3000/api/admin/reset-course-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, courseId })
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ リセット完了:', result.message)
    } else {
      console.error('❌ リセット失敗:', result.error)
    }
  } catch (error) {
    console.error('❌ エラー:', error.message)
    console.log('\n💡 ヒント: 開発サーバーが起動していることを確認してください (npm run dev)')
  }
}

resetCourseProgress()