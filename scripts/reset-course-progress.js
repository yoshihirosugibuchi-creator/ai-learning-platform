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

// ポート検出（3001優先、フォールバック3000）
async function detectPort() {
  const ports = [3001, 3000]
  for (const port of ports) {
    try {
      const response = await fetch(`http://localhost:${port}/api/admin/reset-course-progress`, {
        method: 'HEAD'
      })
      console.log(`✅ 開発サーバー検出: ポート ${port}`)
      return port
    } catch (error) {
      // ポートが利用できない場合は次を試す
    }
  }
  throw new Error('開発サーバーが見つかりません。npm run dev を実行してください。')
}

async function resetCourseProgress() {
  try {
    console.log(`🔄 コース進捗をリセット中: User=${userId}, Course=${courseId}`)
    
    // ポート検出
    const port = await detectPort()
    const baseUrl = `http://localhost:${port}`
    
    const response = await fetch(`${baseUrl}/api/admin/reset-course-progress`, {
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