const { createClient } = require('@supabase/supabase-js')

// 環境変数から設定を読み取り
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 必要な環境変数が設定されていません')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function analyzeQuizData() {
  console.log('🔍 session_quizzes テーブルのJSONデータを分析中...')
  
  try {
    // 全クイズデータを取得
    const { data: quizzes, error } = await supabase
      .from('session_quizzes')
      .select('id, options')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ データ取得エラー:', error)
      return
    }

    console.log(`📊 合計 ${quizzes.length} 件のクイズを取得`)

    let correctFormat = 0  // JSON文字列形式
    let incorrectFormat = 0  // 配列形式
    let malformedData = []

    quizzes.forEach((quiz, index) => {
      try {
        // optionsの型と内容を確認
        if (typeof quiz.options === 'string') {
          // JSON文字列の場合、パースできるかテスト
          const parsed = JSON.parse(quiz.options)
          if (Array.isArray(parsed)) {
            correctFormat++
            if (index < 3) {
              console.log(`✅ 正しい形式 ${quiz.id}: "${quiz.options}"`)
            }
          } else {
            malformedData.push({
              id: quiz.id,
              type: 'invalid_json_content',
              options: quiz.options
            })
          }
        } else if (Array.isArray(quiz.options)) {
          incorrectFormat++
          if (index < 3) {
            console.log(`❌ 配列形式 ${quiz.id}: [${quiz.options.join(', ')}]`)
          }
        } else {
          malformedData.push({
            id: quiz.id,
            type: 'unknown_type',
            options: quiz.options
          })
        }
      } catch (parseError) {
        malformedData.push({
          id: quiz.id,
          type: 'json_parse_error',
          options: quiz.options,
          error: parseError.message
        })
      }
    })

    console.log('\n📈 分析結果:')
    console.log(`✅ 正しい形式 (JSON文字列): ${correctFormat} 件`)
    console.log(`❌ 間違い形式 (配列): ${incorrectFormat} 件`)
    console.log(`🚨 異常データ: ${malformedData.length} 件`)

    if (malformedData.length > 0) {
      console.log('\n🚨 異常データ詳細:')
      malformedData.forEach(item => {
        console.log(`  ID: ${item.id}, Type: ${item.type}, Options: ${JSON.stringify(item.options)}`)
      })
    }

    // 修正が必要な配列形式のデータを抽出
    const needsFix = quizzes.filter(quiz => Array.isArray(quiz.options))
    
    if (needsFix.length > 0) {
      console.log(`\n🔧 修正対象: ${needsFix.length} 件`)
      return needsFix
    } else {
      console.log('\n✨ 修正が必要なデータはありません')
      return []
    }

  } catch (error) {
    console.error('❌ 分析中にエラーが発生:', error)
    return []
  }
}

async function fixQuizData(fixTargets) {
  if (fixTargets.length === 0) {
    console.log('修正対象がないため処理を終了します')
    return
  }

  console.log(`\n🔧 ${fixTargets.length} 件のクイズデータを修正開始...`)

  const results = {
    success: 0,
    failed: 0,
    errors: []
  }

  for (const quiz of fixTargets) {
    try {
      // 配列を JSON文字列に変換
      const optionsJson = JSON.stringify(quiz.options)
      
      console.log(`📝 修正中: ${quiz.id}`)
      console.log(`  変更前: [${quiz.options.join(', ')}]`)
      console.log(`  変更後: "${optionsJson}"`)
      
      // データベースを更新
      const { error: updateError } = await supabase
        .from('session_quizzes')
        .update({ 
          options: optionsJson
        })
        .eq('id', quiz.id)

      if (updateError) {
        console.error(`❌ ${quiz.id} の更新に失敗:`, updateError.message)
        results.failed++
        results.errors.push({
          id: quiz.id,
          error: updateError.message
        })
      } else {
        console.log(`✅ ${quiz.id} の更新成功`)
        results.success++
      }

    } catch (error) {
      console.error(`❌ ${quiz.id} の処理中にエラー:`, error.message)
      results.failed++
      results.errors.push({
        id: quiz.id,
        error: error.message
      })
    }
  }

  console.log('\n📊 修正完了結果:')
  console.log(`✅ 成功: ${results.success} 件`)
  console.log(`❌ 失敗: ${results.failed} 件`)

  if (results.errors.length > 0) {
    console.log('\n❌ エラー詳細:')
    results.errors.forEach(error => {
      console.log(`  ${error.id}: ${error.error}`)
    })
  }
}

// メイン実行
async function main() {
  console.log('🚀 quiz JSONデータ修復スクリプト開始\n')
  
  // 1. データ分析
  const fixTargets = await analyzeQuizData()
  
  if (fixTargets.length === 0) {
    console.log('\n✨ すべてのデータが正しい形式です')
    return
  }

  // 2. 確認
  console.log('\n⚠️  上記のデータを修正します。続行しますか？')
  console.log('続行するにはスクリプトを再実行してください（安全確認のため一時停止）')
  
  // 実際の修正は手動確認後に実行
  // await fixQuizData(fixTargets)
}

// 修正実行（確認後に使用）
async function runFix() {
  console.log('🚀 quiz JSONデータ修復実行中...\n')
  
  const fixTargets = await analyzeQuizData()
  await fixQuizData(fixTargets)
  
  console.log('\n🎉 修復処理完了')
}

// コマンドライン引数で処理を分岐
const action = process.argv[2]
if (action === 'fix') {
  runFix()
} else {
  main()
}