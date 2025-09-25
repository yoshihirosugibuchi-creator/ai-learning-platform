#!/usr/bin/env tsx

/**
 * コース学習データのサブカテゴリーID修正スクリプト
 * 日本語サブカテゴリー名を適切な英語IDに変換
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// .env.local ファイルから環境変数を直接読み込み
function loadEnvFile(): Record<string, string> {
  const envPath = resolve(process.cwd(), '.env.local')
  const env: Record<string, string> = {}
  
  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8')
    const lines = envContent.split('\n')
    
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        if (key && valueParts.length > 0) {
          env[key] = valueParts.join('=')
        }
      }
    }
  }
  
  return env
}

const envVars = loadEnvFile()
const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY)

// サブカテゴリー変換マップ（分析結果＋ユーザー指摘から作成）
const subcategoryMapping: Record<string, string> = {
  'AI・機械学習活用': 'ai_ml_utilization',
  'AI基礎・業務活用': 'ai_ml_utilization', // ユーザー指摘により統合
  'DX戦略・デジタル変革': 'dx_strategy_transformation', 
  'デジタルマーケティング': 'digital_marketing',
  'プロンプトエンジニアリング': 'prompt_engineering',
  '構造化思考（MECE・ロジックツリー）': 'structured_thinking_mece',
  '競争戦略・フレームワーク': 'competitive_strategy_frameworks',
  '顧客分析・セグメンテーション': 'customer_analysis_segmentation'
}

async function fixCourseSubcategoryIds() {
  console.log('🔧 コース学習サブカテゴリーID修正開始...\n')
  
  // 現在のlearning_genresデータを取得
  const { data: genres, error } = await supabase
    .from('learning_genres')
    .select('id, subcategory_id, title')
    .order('id')
  
  if (error) {
    console.error('❌ learning_genres データ取得エラー:', error)
    return
  }
  
  if (!genres) {
    console.log('❌ learning_genres データが見つかりません')
    return
  }
  
  console.log('📋 修正対象のgenre確認:')
  const toUpdate: Array<{id: string, title: string, oldId: string, newId: string}> = []
  
  for (const genre of genres) {
    const newSubcategoryId = subcategoryMapping[genre.subcategory_id]
    if (newSubcategoryId) {
      toUpdate.push({
        id: genre.id,
        title: genre.title,
        oldId: genre.subcategory_id,
        newId: newSubcategoryId
      })
    }
  }
  
  if (toUpdate.length === 0) {
    console.log('✅ 修正対象のデータはありません')
    return
  }
  
  console.log(`修正対象: ${toUpdate.length}件`)
  toUpdate.forEach((item, i) => {
    console.log(`${i+1}. ${item.title}`)
    console.log(`   "${item.oldId}" → "${item.newId}"`)
  })
  
  console.log('\n🔍 変更前の確認:')
  console.log('変更を実行する前に、バックアップが取れているか確認してください')
  
  // 実際の更新処理（デバッグモード：実際には実行しない）
  const DRY_RUN = false // 実行時にはfalseに変更
  
  if (DRY_RUN) {
    console.log('\n🔒 [DRY RUN モード] - 実際の更新は実行されません')
    console.log('実際に更新するには、スクリプト内の DRY_RUN を false に変更してください')
  } else {
    console.log('\n🔄 データベース更新実行中...')
    
    let successCount = 0
    let errorCount = 0
    
    for (const item of toUpdate) {
      try {
        const { error: updateError } = await supabase
          .from('learning_genres')
          .update({ subcategory_id: item.newId })
          .eq('id', item.id)
        
        if (updateError) {
          console.error(`❌ ${item.id} 更新エラー:`, updateError)
          errorCount++
        } else {
          console.log(`✅ ${item.id} 更新完了: "${item.oldId}" → "${item.newId}"`)
          successCount++
        }
      } catch (error) {
        console.error(`❌ ${item.id} 更新例外:`, error)
        errorCount++
      }
    }
    
    console.log('\n📊 更新結果:')
    console.log(`✅ 成功: ${successCount}件`)
    console.log(`❌ 失敗: ${errorCount}件`)
  }
  
  // 未対応のサブカテゴリーIDを確認
  console.log('\n⚠️ 未対応のサブカテゴリーID:')
  const unmappedGenres = genres.filter(g => 
    !subcategoryMapping[g.subcategory_id] && 
    !g.subcategory_id.match(/^[a-z_]+$/) // 英語IDっぽいものは除外
  )
  
  if (unmappedGenres.length > 0) {
    unmappedGenres.forEach(genre => {
      console.log(`- "${genre.subcategory_id}" (genre: ${genre.title})`)
    })
    console.log('\nこれらは手動での確認・追加が必要です')
  } else {
    console.log('✅ 全てのサブカテゴリーIDが英語形式です')
  }
  
  console.log('\n📋 次のステップ:')
  console.log('1. DRY_RUN を false にして実際の修正を実行')
  console.log('2. 修正後のコース学習データ整合性を再チェック') 
  console.log('3. Phase 1のTypeScriptエラー修正に進む')
}

fixCourseSubcategoryIds().catch(console.error)