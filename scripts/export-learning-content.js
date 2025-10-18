#!/usr/bin/env node

/**
 * 学習コンテンツ階層構造CSV出力スクリプト
 * learning_course, learning_genre, learning_theme, learning_sessions をジョインして出力
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 環境変数から設定読み込み
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase環境変数が設定されていません')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('NEXT_PUBLIC_SUPABASE_ANON_KEY:', !!supabaseAnonKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

console.log('📚 学習コンテンツ構造データ取得開始...')

async function fetchLearningContentStructure() {
  try {
    // 学習コンテンツ階層をJOINで取得
    const { data: contentData, error } = await supabase
      .from('learning_courses')
      .select(`
        id,
        title,
        learning_genres!inner (
          id,
          title,
          category_id,
          subcategory_id,
          learning_themes!inner (
            id,
            title,
            learning_sessions!inner (
              id,
              title,
              session_type,
              estimated_minutes
            )
          )
        )
      `)
      .order('id')

    if (error) {
      throw new Error(`データ取得エラー: ${error.message}`)
    }

    console.log(`✅ ${contentData?.length || 0} コース分のデータを取得`)

    // データをフラット化してCSV形式に変換
    const flatData = []
    
    contentData?.forEach(course => {
      course.learning_genres?.forEach(genre => {
        genre.learning_themes?.forEach(theme => {
          theme.learning_sessions?.forEach(session => {
            flatData.push({
              course_id: course.id,
              course_title: course.title,
              genre_id: genre.id,
              genre_title: genre.title,
              category_id: genre.category_id,
              subcategory_id: genre.subcategory_id,
              theme_id: theme.id,
              theme_title: theme.title,
              session_id: session.id,
              session_title: session.title,
              session_type: session.session_type,
              estimated_minutes: session.estimated_minutes
            })
          })
        })
      })
    })

    console.log(`📊 フラット化完了: ${flatData.length} セッション`)

    // CSVヘッダー
    const csvHeaders = [
      'course_id',
      'course_title', 
      'genre_id',
      'genre_title',
      'category_id',
      'subcategory_id',
      'theme_id',
      'theme_title',
      'session_id',
      'session_title',
      'session_type',
      'estimated_minutes'
    ]

    // CSVコンテンツ生成
    const csvRows = [csvHeaders.join(',')]
    
    flatData.forEach(row => {
      const csvRow = csvHeaders.map(header => {
        let value = row[header] || ''
        // カンマやダブルクォートが含まれる場合はエスケープ
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = '"' + value.replace(/"/g, '""') + '"'
        }
        return value
      })
      csvRows.push(csvRow.join(','))
    })

    const csvContent = csvRows.join('\n')

    // docsディレクトリが存在しない場合は作成
    const docsDir = path.join(process.cwd(), 'docs')
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true })
      console.log('📁 docs ディレクトリを作成しました')
    }

    // CSVファイル保存
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '')
    const filename = `learning_content_structure_${timestamp}.csv`
    const filepath = path.join(docsDir, filename)

    fs.writeFileSync(filepath, csvContent, 'utf8')

    console.log('✅ CSV出力完了')
    console.log(`📁 ファイルパス: ${filepath}`)
    console.log(`📊 データ統計:`)
    console.log(`   - コース数: ${new Set(flatData.map(r => r.course_id)).size}`)
    console.log(`   - ジャンル数: ${new Set(flatData.map(r => r.genre_id)).size}`)
    console.log(`   - テーマ数: ${new Set(flatData.map(r => r.theme_id)).size}`)
    console.log(`   - セッション数: ${flatData.length}`)

    // サンプルデータ表示
    console.log('\n📋 サンプルデータ (最初の5行):')
    console.log(csvHeaders.join(' | '))
    console.log('-'.repeat(120))
    flatData.slice(0, 5).forEach(row => {
      const sampleRow = csvHeaders.map(h => (row[h] || '').toString().substring(0, 15)).join(' | ')
      console.log(sampleRow)
    })

    return filepath

  } catch (error) {
    console.error('❌ エラーが発生しました:', error.message)
    throw error
  }
}

// メイン実行
async function main() {
  try {
    const filepath = await fetchLearningContentStructure()
    console.log(`\n🎉 完了: ${path.basename(filepath)}`)
    process.exit(0)
  } catch (error) {
    console.error('❌ 処理失敗:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}