#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { writeFileSync, readFileSync } from 'fs'
import path from 'path'

// 環境変数読み込み
config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function syncCourseDataToJSON() {
  console.log('🔄 DBコースデータをJSONフォールバックに同期開始...\n')

  try {
    // 1. DBからコースデータを取得
    console.log('📊 **1. DBからコースデータ取得**')
    console.log('='.repeat(60))

    const { data: courses, error: coursesError } = await supabase
      .from('learning_courses')
      .select('*')
      .order('display_order')

    if (coursesError) {
      throw coursesError
    }

    if (!courses || courses.length === 0) {
      console.log('⚠️ DBにコースデータが見つかりませんでした')
      return
    }

    console.log(`✅ ${courses.length}件のコースを取得`)

    // 2. JSONフォーマットに変換
    console.log('\n🔄 **2. JSONフォーマットに変換**')
    console.log('='.repeat(60))

    const jsonCourses = courses.map(course => ({
      id: course.id,
      title: course.title,
      description: course.description,
      estimatedDays: course.estimated_days,
      difficulty: course.difficulty,
      icon: course.icon,
      color: course.color,
      displayOrder: course.display_order,
      genreCount: course.genre_count || 0,
      themeCount: course.theme_count || 0,
      status: course.status,
      badge: course.badge_data || {
        id: `badge_${course.id}`,
        title: `${course.title} 修了証`,
        description: `${course.title}のスキルを修得`,
        icon: "🏆",
        color: "#10B981",
        badgeImageUrl: `/badges/${course.id}.svg`,
        validityPeriodMonths: null
      }
    }))

    console.log('変換されたコース:')
    jsonCourses.forEach(course => {
      console.log(`  - ${course.title}: ${course.difficulty} (${course.status})`)
    })

    // 3. JSONファイルを更新
    console.log('\n💾 **3. JSONファイル更新**')
    console.log('='.repeat(60))

    const jsonFilePath = path.join(process.cwd(), 'public', 'learning-data', 'courses.json')
    
    // バックアップ作成
    const backupPath = path.join(process.cwd(), 'public', 'learning-data', 'courses.json.backup')
    try {
      const originalContent = readFileSync(jsonFilePath, 'utf8')
      writeFileSync(backupPath, originalContent)
      console.log(`📋 バックアップ作成: ${backupPath}`)
    } catch (error) {
      console.warn('⚠️ バックアップ作成に失敗:', error)
    }

    // 新しいJSONデータを作成
    const newJsonContent = {
      // DB同期情報を追加
      _meta: {
        syncedAt: new Date().toISOString(),
        syncedFrom: 'supabase_learning_courses',
        totalCourses: courses.length,
        note: 'このファイルはDBからの自動同期により生成されています'
      },
      courses: jsonCourses
    }

    // JSONファイルに書き込み
    writeFileSync(jsonFilePath, JSON.stringify(newJsonContent, null, 2))
    console.log(`✅ JSONファイル更新完了: ${jsonFilePath}`)

    // 4. 同期結果サマリー
    console.log('\n📊 **4. 同期結果サマリー**')
    console.log('='.repeat(60))
    console.log(`✅ 同期されたコース: ${jsonCourses.length}件`)
    
    const skillLevelCount = jsonCourses.reduce((acc, course) => {
      acc[course.difficulty] = (acc[course.difficulty] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('スキルレベル別:')
    Object.entries(skillLevelCount).forEach(([level, count]) => {
      console.log(`  - ${level}: ${count}件`)
    })

    const statusCount = jsonCourses.reduce((acc, course) => {
      acc[course.status] = (acc[course.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    console.log('ステータス別:')
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`  - ${status}: ${count}件`)
    })

    console.log(`✅ 同期時刻: ${new Date().toISOString()}`)

    console.log('\n🎯 **JSONフォールバック同期完了！**')
    console.log('💡 JSONファイルがDBデータと同期されました')

  } catch (error) {
    console.error('❌ 同期エラー:', error)
    process.exit(1)
  }
}

syncCourseDataToJSON().then(() => {
  console.log('\n🔄 コースデータ同期完了')
  process.exit(0)
}).catch(error => {
  console.error('❌ Sync error:', error)
  process.exit(1)
})