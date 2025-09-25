#!/usr/bin/env tsx

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

async function analyzeSubcategories() {
  console.log('🔍 コース学習サブカテゴリー詳細分析...\n')
  
  const [genres, subcategories] = await Promise.all([
    supabase.from('learning_genres').select('id, subcategory_id, title, category_id').order('subcategory_id'),
    supabase.from('subcategories').select('subcategory_id, name').order('subcategory_id')
  ])
  
  if (!genres.data || !subcategories.data) {
    console.error('❌ データ取得エラー')
    return
  }
  
  const masterSubs = new Set(subcategories.data.map(s => s.subcategory_id))
  const courseSubs = [...new Set(genres.data.map(g => g.subcategory_id))]
  
  console.log('📊 コース学習で使用されているsubcategory_id:')
  courseSubs.forEach((subId, i) => {
    const exists = masterSubs.has(subId)
    const status = exists ? '✅' : '❌'
    const indexStr = (i+1).toString().padStart(2, ' ')
    console.log(`${indexStr}: ${status} "${subId}"`)
    if (!exists) {
      const genre = genres.data.find(g => g.subcategory_id === subId)
      if (genre) {
        console.log(`     使用genre: ${genre.title} (category: ${genre.category_id})`)
      }
    }
  })
  
  console.log('\n🔍 マスタサブカテゴリーで類似の候補:')
  const missing = courseSubs.filter(sub => !masterSubs.has(sub))
  
  for (const missingSub of missing) {
    console.log(`\n"${missingSub}" の候補:`)
    
    // 完全一致または部分一致を探す
    const candidates = subcategories.data.filter(s => {
      const subLower = missingSub.toLowerCase()
      const nameLower = s.name.toLowerCase()
      const idLower = s.subcategory_id.toLowerCase()
      
      return nameLower.includes(subLower) || 
             subLower.includes(nameLower) ||
             idLower.includes(subLower) ||
             subLower.includes(idLower) ||
             // 特定のマッピング
             (missingSub === 'デジタルマーケティング' && idLower.includes('digital_marketing')) ||
             (missingSub.includes('構造化思考') && idLower.includes('structured_thinking')) ||
             (missingSub.includes('競争戦略') && idLower.includes('competitive_strategy')) ||
             (missingSub.includes('顧客分析') && idLower.includes('customer_analysis'))
    })
    
    if (candidates.length > 0) {
      candidates.slice(0, 5).forEach(c => {
        console.log(`  - ${c.subcategory_id} (${c.name})`)
      })
    } else {
      console.log(`  候補が見つかりません`)
      
      // カテゴリー情報を表示してヒントを提供
      const genre = genres.data.find(g => g.subcategory_id === missingSub)
      if (genre) {
        console.log(`  カテゴリー: ${genre.category_id} なので、このカテゴリー内のサブカテゴリーを確認`)
        
        // 同じカテゴリーのサブカテゴリーを表示
        const sameCategorySubcategories = subcategories.data.filter(s => {
          // カテゴリー推定（簡易的）
          return s.subcategory_id.includes('marketing') && genre.category_id === 'marketing_sales' ||
                 s.subcategory_id.includes('strategy') && genre.category_id === 'strategy_management' ||
                 s.subcategory_id.includes('thinking') && genre.category_id === 'logical_thinking_problem_solving'
        })
        
        if (sameCategorySubcategories.length > 0) {
          console.log(`  同カテゴリーの候補:`)
          sameCategorySubcategories.slice(0, 3).forEach(s => {
            console.log(`    - ${s.subcategory_id} (${s.name})`)
          })
        }
      }
    }
  }
  
  console.log('\n📋 修正提案:')
  console.log('以下の手順でコース学習データのsubcategory_idを修正できます:')
  console.log('1. learning_genresテーブルの日本語subcategory_idを英語IDに変更')
  console.log('2. または、不足しているサブカテゴリーをマスタテーブルに追加')
  console.log('3. データの整合性を確認後、Phase 1のTypeScript修正に進行')
  
  console.log('\n🎯 優先修正項目:')
  missing.forEach((sub, i) => {
    console.log(`${i+1}. "${sub}" → 適切な英語IDに変換`)
  })
}

analyzeSubcategories().catch(console.error)