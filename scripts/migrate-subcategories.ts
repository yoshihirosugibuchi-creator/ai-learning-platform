#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'
import { mainCategories, industryCategories } from '../lib/categories'

// 環境変数読み込み
config({ path: path.join(process.cwd(), '.env.local') })

// Supabase設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// サブカテゴリーIDを生成する関数
function generateSubcategoryId(subcategoryName: string): string {
  return subcategoryName
    .toLowerCase()
    .replace(/[・・]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[()（）]/g, '')
    .replace(/[、。]/g, '')
    .replace(/[&＆]/g, 'and')
    .replace(/[/／]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

// サブカテゴリーアイコンを取得する関数
function getSubcategoryIconLocal(subcategoryName: string): string {
  const iconMap: Record<string, string> = {
    // コミュニケーション・プレゼンテーション
    '結論ファースト・構造化思考': '🎯',
    '資料作成・可視化技術': '📊',
    '会議運営・ファシリテーション': '🤝',
    '交渉・説得技術': '💬',
    
    // 論理的思考・問題解決
    '構造化思考（MECE・ロジックツリー）': '🧠',
    '仮説検証・本質追求': '🔍',
    '定量分析・統計解析': '📈',
    '行動経済学・意思決定理論': '🧮',
    'ベンチマーキング・競合分析': '⚖️',
    
    // 戦略・経営
    '経営戦略・事業戦略': '🎯',
    '競争戦略・フレームワーク': '⚔️',
    '新事業開発・イノベーション': '🚀',
    'ESG・サステナビリティ経営': '🌱',
    
    // 財務・ファイナンス
    '財務分析・企業価値評価': '💰',
    '投資判断・リスク管理': '📊',
    '事業計画・資金調達': '💼',
    '管理会計・KPI設計': '📋',
    
    // マーケティング・営業
    '顧客分析・セグメンテーション': '👥',
    'ブランディング・ポジショニング': '🏷️',
    'デジタルマーケティング': '📱',
    '営業戦略・CRM': '📈',
    
    // リーダーシップ・人事
    'チームマネジメント・モチベーション': '👥',
    'タレントマネジメント・育成': '📚',
    '組織開発・変革リーダーシップ': '🔄',
    '人事戦略・働き方改革': '⚙️',
    
    // AI・デジタル活用
    'AI・機械学習活用': '🤖',
    'プロンプトエンジニアリング': '💬',
    'DX戦略・デジタル変革': '🔄',
    'データドリブン経営': '📊',
    'IoT・自動化技術': '🔧',
    
    // プロジェクト・業務管理
    'プロジェクト設計・WBS': '📋',
    'スケジュール・リソース管理': '⏰',
    'ステークホルダー管理': '🎭',
    '業務効率化・時間管理': '⚡',
    
    // ビジネスプロセス・業務分析
    '業務分析・要件定義': '📝',
    'プロセス設計・最適化': '🔄',
    'サプライチェーン管理': '🔗',
    '業務システム設計': '💻',
    'BPR・業務改革': '⚙️',
    
    // リスク・危機管理
    '企業リスク管理': '🛡️',
    '危機管理・BCP': '🚨',
    'コンプライアンス・内部統制': '📏',
    '情報セキュリティ': '🔒',
    'サステナビリティリスク': '🌍',
    
    // コンサルティング業界
    'ケース面接・構造化思考': '🧩',
    '仮説思考・イシューツリー': '🌳',
    'ストーリーライン構築': '📖',
    'ステークホルダー分析': '🎭',
    '複数ステークホルダー調整': '⚖️',
    'プロジェクト炎上対応・リカバリー': '🚒',
    '変革リーダーシップ': '⚡',
    'デジタル変革支援': '🔄',
    'M&A・PMI支援': '🤝',
    'オペレーション改革': '⚙️',
    '規制業界対応（金融・製薬等）': '🏛️',
    '業界ベストプラクティス活用': '⭐',
    '業界動向・競合分析': '📊',
    'RFP対応・提案書作成': '📋',
    '経営層プレゼン': '👔',
    '経営課題ヒアリング・課題設定': '🎯',
    '継続案件獲得・拡販戦略': '📈',
    
    // SI業界
    '要件定義・業務分析': '📝',
    'IT戦略立案': '💻',
    'RFP作成・ベンダー管理': '📄',
    'SIプロジェクト管理': '🎛️',
    '多階層ベンダー管理': '🏗️',
    'リスク管理・品質管理': '🛡️',
    'システム導入・移行管理': '🔧',
    'DX推進支援': '🚀',
    '技術的実現性評価': '🔬',
    'レガシーシステム連携': '🔗',
    '技術営業・提案活動': '💼',
    '顧客要求分析': '🔍',
    '長期パートナーシップ構築': '🤝',
    '契約形態・価格設定戦略': '💰',
    
    // 商社業界
    '商品知識・市場分析': '📊',
    '商品先物・デリバティブ活用': '📈',
    '価格交渉・リスクヘッジ': '⚖️',
    '品質管理・検査・保険': '🔍',
    '新規事業開拓': '🚀',
    '出資先企業経営参画': '🏢',
    '事業ポートフォリオ管理': '📁',
    '海外市場開拓': '🌍',
    '多国間三国間取引': '🌐',
    '異文化コミュニケーション': '🗣️',
    '現地法人運営': '🏭',
    '貿易ファイナンス': '💱',
    'トレードファイナンス組成': '🏦',
    '為替・金利リスク管理': '📊',
    'カントリーリスク分析': '🌏'
  }
  return iconMap[subcategoryName] || '📚'
}

async function migrateSubcategories() {
  console.log('📂 サブカテゴリーデータの移行を開始します...\n')

  try {
    // 1. 既存データの確認
    console.log('🔍 既存のサブカテゴリーデータを確認中...')
    const { data: existingData, error: selectError } = await supabase
      .from('subcategories')
      .select('*')
      .order('parent_category_id, display_order')

    if (selectError) {
      console.error('❌ Error checking existing data:', selectError)
      return
    }

    if (existingData && existingData.length > 0) {
      console.log(`✅ 既存サブカテゴリー発見: ${existingData.length}件`)
      
      const readline = require('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('\n既存のサブカテゴリーデータを削除して再移行しますか？ (y/N): ', resolve)
      })
      rl.close()
      
      if (answer.toLowerCase() !== 'y') {
        console.log('❌ 操作をキャンセルしました')
        return
      }
      
      // 既存データを削除
      console.log('\n🗑️ 既存サブカテゴリーデータを削除中...')
      const { error: deleteError } = await supabase
        .from('subcategories')
        .delete()
        .neq('subcategory_id', '')  // 全削除
      
      if (deleteError) {
        console.error('❌ Error deleting existing data:', deleteError)
        return
      }
      console.log('✅ 既存サブカテゴリー削除完了')
    }

    // 2. 全カテゴリーからサブカテゴリーデータを変換
    console.log('\n🔄 lib/categories.tsからサブカテゴリーデータを変換中...')
    
    const allCategories = [...mainCategories, ...industryCategories]
    const subcategoryData: any[] = []

    allCategories.forEach(category => {
      category.subcategories.forEach((subcategoryName, index) => {
        const subcategoryId = generateSubcategoryId(subcategoryName)
        
        subcategoryData.push({
          subcategory_id: subcategoryId,
          name: subcategoryName,
          description: `${subcategoryName}に関する専門知識とスキル`,
          parent_category_id: category.id,
          icon: getSubcategoryIconLocal(subcategoryName),
          display_order: index + 1,
          is_active: true,
          is_visible: true,
          activation_date: null
        })
      })
    })

    console.log(`📋 変換対象: ${subcategoryData.length}件のサブカテゴリー`)
    
    // カテゴリー別の統計表示
    console.log('\n📊 **カテゴリー別サブカテゴリー数**')
    console.log('=' .repeat(80))
    
    allCategories.forEach(category => {
      const categorySubcategories = subcategoryData.filter(sub => sub.parent_category_id === category.id)
      const categoryType = category.type === 'main' ? '📋' : '🏭'
      console.log(`${categoryType} ${category.name.padEnd(35)} | ${categorySubcategories.length}個`)
    })

    // 3. Supabaseにデータを挿入
    console.log('\n📥 Supabaseにサブカテゴリーデータを挿入中...')
    
    // バッチサイズで分割して挿入
    const batchSize = 50
    let insertedCount = 0
    
    for (let i = 0; i < subcategoryData.length; i += batchSize) {
      const batch = subcategoryData.slice(i, i + batchSize)
      
      const { data: insertedData, error: insertError } = await supabase
        .from('subcategories')
        .insert(batch)
        .select()

      if (insertError) {
        console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, insertError)
        return
      }
      
      insertedCount += insertedData?.length || 0
      console.log(`✅ バッチ${i / batchSize + 1}完了: ${insertedData?.length}件`)
    }

    console.log(`✅ 全サブカテゴリーデータ挿入完了: ${insertedCount}件`)
    
    // 4. 挿入結果の確認
    console.log('\n📊 **挿入されたサブカテゴリーデータ（各カテゴリーから最初の3件）**')
    console.log('=' .repeat(100))
    
    for (const category of allCategories) {
      const { data: categorySubcategories, error: subError } = await supabase
        .from('subcategories')
        .select('subcategory_id, name, icon')
        .eq('parent_category_id', category.id)
        .order('display_order')
        .limit(3)

      if (subError) {
        console.error(`❌ Error fetching subcategories for ${category.id}:`, subError)
        continue
      }

      const categoryType = category.type === 'main' ? '📋' : '🏭'
      console.log(`\n${categoryType} ${category.name}:`)
      categorySubcategories?.forEach(sub => {
        console.log(`  ${sub.icon} ${sub.subcategory_id.padEnd(40)} | ${sub.name}`)
      })
    }

    // 5. 全体統計
    console.log('\n📊 **全体統計**')
    console.log('=' .repeat(80))
    
    const { data: allSubcategories, error: allError } = await supabase
      .from('subcategories')
      .select('parent_category_id, is_active')

    if (allError) {
      console.error('❌ Error fetching all subcategories:', allError)
      return
    }

    const mainSubCount = allSubcategories?.filter(sub => 
      mainCategories.some(cat => cat.id === sub.parent_category_id)
    ).length || 0
    
    const industrySubCount = allSubcategories?.filter(sub => 
      industryCategories.some(cat => cat.id === sub.parent_category_id)
    ).length || 0
    
    const activeSubCount = allSubcategories?.filter(sub => sub.is_active).length || 0

    console.log(`📋 メインカテゴリーのサブカテゴリー: ${mainSubCount}件`)
    console.log(`🏭 業界カテゴリーのサブカテゴリー: ${industrySubCount}件`)
    console.log(`🟢 有効サブカテゴリー: ${activeSubCount}件`)
    console.log(`📊 総サブカテゴリー数: ${mainSubCount + industrySubCount}件`)

    // 6. 次のステップの案内
    console.log('\n📋 **次のステップ**')
    console.log('=' .repeat(80))
    console.log('1. ✅ スキルレベルマスターデータ初期化完了')
    console.log('2. ✅ メインカテゴリーデータ移行完了')
    console.log('3. ✅ 既存業界カテゴリーデータ移行完了')
    console.log('4. ✅ サブカテゴリーデータ移行完了')
    console.log('5. 🔄 新業界カテゴリー先行登録 (Task 2.5)')
    console.log('6. 🔄 クイズデータdifficulty値正規化 (Task 2.6)')

    console.log('\n✅ サブカテゴリーデータの移行が完了しました！')

  } catch (error) {
    console.error('❌ Critical error:', error)
  }
}

// 実行
migrateSubcategories().then(() => {
  console.log('\n📂 サブカテゴリー移行完了')
  process.exit(0)
}).catch(error => {
  console.error('❌ Script error:', error)
  process.exit(1)
})