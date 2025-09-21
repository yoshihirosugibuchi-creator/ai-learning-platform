#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import path from 'path'

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

// 新業界カテゴリーの定義
const NEW_INDUSTRY_CATEGORIES = [
  // 金融・保険業界
  {
    category_id: 'financial_services_industry',
    name: '金融・保険業界',
    description: '銀行、証券、保険、フィンテック企業特有の知識とスキル',
    icon: '🏦',
    color: '#1E40AF',
    display_order: 4,
    subcategories: [
      '銀行業務・リテール金融',
      '投資銀行・資本市場',
      '資産運用・ウェルスマネジメント',
      '保険商品・アクチュアリー',
      'リスク管理・規制対応',
      'フィンテック・デジタル金融',
      '金融商品設計・プライシング',
      'コンプライアンス・内部監査',
      '顧客デューデリジェンス・AML',
      '金融データ分析・クオンツ'
    ]
  },

  // 製造業界
  {
    category_id: 'manufacturing_industry',
    name: '製造業界',
    description: '製造業特有の生産管理、品質管理、サプライチェーン知識とスキル',
    icon: '🏭',
    color: '#DC2626',
    display_order: 5,
    subcategories: [
      '生産計画・生産管理',
      '品質管理・品質保証',
      'サプライチェーン・調達管理',
      '製造技術・工程改善',
      '安全管理・環境対応',
      '設備保全・予防保全',
      '原価管理・製造原価',
      '製品開発・設計管理',
      'IoT・スマートファクトリー',
      '国際生産・海外工場管理'
    ]
  },

  // SaaS・プロダクト業界
  {
    category_id: 'saas_product_industry',
    name: 'SaaS・プロダクト業界',
    description: 'SaaS企業、プロダクト開発、テックスタートアップ特有の事業運営スキル',
    icon: '💻',
    color: '#7C3AED',
    display_order: 6,
    subcategories: [
      'プロダクト管理・ロードマップ',
      'SaaS事業・サブスクリプション',
      'プロダクトマーケティング・PMM',
      'データサイエンス・AI活用',
      'クラウド戦略・インフラ',
      'エンジニアリング管理',
      'アジャイル・DevOps',
      'テックセールス・PLG',
      'スタートアップ・スケーリング',
      'オープンソース・エコシステム'
    ]
  },

  // ヘルスケア・医療業界
  {
    category_id: 'healthcare_industry',
    name: 'ヘルスケア・医療業界',
    description: '医療機関、製薬、医療機器、ヘルステック企業の専門知識とスキル',
    icon: '🏥',
    color: '#059669',
    display_order: 7,
    subcategories: [
      '医療制度・診療報酬',
      '薬事規制・承認申請',
      '臨床試験・治験管理',
      '医療経営・病院管理',
      'デジタルヘルス・医療IT',
      '医療安全・感染管理',
      '創薬・R&D',
      '医療機器・メドテック',
      '在宅医療・地域包括ケア',
      'ヘルスケアデータ・AI活用'
    ]
  },

  // 小売・消費財業界
  {
    category_id: 'retail_consumer_industry',
    name: '小売・消費財業界',
    description: '小売、EC、消費財メーカー特有のマーケティング・販売戦略スキル',
    icon: '🛍️',
    color: '#EA580C',
    display_order: 8,
    subcategories: [
      '商品企画・マーチャンダイジング',
      '店舗運営・販売管理',
      'ECサイト・オムニチャネル',
      '消費者分析・市場調査',
      'ブランド管理・商品開発',
      'サプライチェーン・物流',
      'リテールテック・DX',
      '顧客体験・CX向上',
      'プライベートブランド・PB',
      'インバウンド・越境EC'
    ]
  },

  // 不動産・建設業界
  {
    category_id: 'real_estate_construction_industry',
    name: '不動産・建設業界',
    description: '不動産開発、建設、不動産サービス業界の専門知識とスキル',
    icon: '🏗️',
    color: '#92400E',
    display_order: 9,
    subcategories: [
      '不動産開発・用地取得',
      '建設プロジェクト管理',
      '不動産投資・ファイナンス',
      '建築設計・施工管理',
      '不動産営業・仲介',
      'プロパティマネジメント',
      '都市計画・まちづくり',
      '建設安全・品質管理',
      'PropTech・不動産テック',
      'ESG・サステナブル建築'
    ]
  },

  // エネルギー・インフラ業界
  {
    category_id: 'energy_infrastructure_industry',
    name: 'エネルギー・インフラ業界',
    description: 'エネルギー、電力、ガス、水道、交通インフラ業界の専門知識とスキル',
    icon: '⚡',
    color: '#0F766E',
    display_order: 10,
    subcategories: [
      '電力システム・系統運用',
      '再生可能エネルギー・脱炭素',
      'インフラ建設・保守',
      'エネルギー取引・調達',
      '公共インフラ・PPP',
      '規制対応・行政連携',
      'スマートグリッド・IoT',
      '環境アセスメント・EIA',
      'エネルギー政策・制度',
      'インフラファイナンス・投資'
    ]
  },

  // 教育・研修業界
  {
    category_id: 'education_training_industry',
    name: '教育・研修業界',
    description: '教育機関、研修会社、EdTech企業の教育サービス提供スキル',
    icon: '📚',
    color: '#7C2D12',
    display_order: 11,
    subcategories: [
      'カリキュラム設計・教材開発',
      'オンライン教育・eラーニング',
      '企業研修・人材育成',
      '学習効果測定・評価',
      'EdTech・学習プラットフォーム',
      '教育マーケティング・営業',
      '学習者分析・ラーニングアナリティクス',
      '教育制度・政策対応',
      '国際教育・グローバル展開',
      '生涯学習・リスキリング'
    ]
  },

  // メディア・エンタメ業界
  {
    category_id: 'media_entertainment_industry',
    name: 'メディア・エンタメ業界',
    description: 'メディア、広告、エンターテインメント、コンテンツ業界の専門スキル',
    icon: '🎬',
    color: '#BE185D',
    display_order: 12,
    subcategories: [
      'コンテンツ企画・制作管理',
      'デジタルメディア・配信',
      '広告営業・メディアプラニング',
      'IP管理・ライセンシング',
      'エンタメマーケティング・プロモーション',
      'イベント企画・運営',
      'クリエイター・タレント管理',
      'メディア技術・放送システム',
      'ゲーム開発・運営',
      'メタバース・XR事業'
    ]
  },

  // 物流・運輸業界
  {
    category_id: 'logistics_transportation_industry',
    name: '物流・運輸業界',
    description: '物流、運送、倉庫、航空・海運業界の物流最適化とサプライチェーン管理',
    icon: '🚛',
    color: '#365314',
    display_order: 13,
    subcategories: [
      'サプライチェーン設計・最適化',
      '倉庫管理・在庫最適化',
      '輸送計画・配送ルート',
      '物流システム・WMS',
      'ラストワンマイル・配送',
      '国際物流・通関業務',
      '物流コスト管理・KPI',
      '物流安全・品質管理',
      'ロジテック・物流DX',
      'サステナブル物流・脱炭素'
    ]
  },

  // 公共・行政業界
  {
    category_id: 'public_sector_industry',
    name: '公共・行政業界',
    description: '官公庁、自治体、公共機関における行政運営と公共サービス提供スキル',
    icon: '🏛️',
    color: '#374151',
    display_order: 14,
    subcategories: [
      '政策立案・制度設計',
      '予算編成・財政管理',
      '行政DX・デジタル化',
      '公共調達・入札',
      '住民サービス・窓口',
      '危機管理・防災',
      '地方創生・まちづくり',
      '国際協力・外交',
      '規制・法制度',
      'パブリック・ガバナンス'
    ]
  }
]

async function migrateNewIndustryCategories() {
  console.log('🏭 新業界カテゴリーの先行登録を開始します...\n')

  try {
    // 1. 既存の新業界カテゴリーデータの確認
    console.log('🔍 既存の新業界カテゴリーデータを確認中...')
    const existingCategoryIds = NEW_INDUSTRY_CATEGORIES.map(cat => cat.category_id)
    
    const { data: existingData, error: selectError } = await supabase
      .from('categories')
      .select('*')
      .eq('type', 'industry')
      .in('category_id', existingCategoryIds)

    if (selectError) {
      console.error('❌ Error checking existing data:', selectError)
      return
    }

    if (existingData && existingData.length > 0) {
      console.log(`⚠️ 既存の新業界カテゴリー発見: ${existingData.length}件`)
      existingData.forEach(cat => {
        console.log(`  - ${cat.category_id}: ${cat.name} (${cat.is_active ? '有効' : '無効'})`)
      })
      
      const readline = require('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('\n既存の新業界カテゴリーを削除して再登録しますか？ (y/N): ', resolve)
      })
      rl.close()
      
      if (answer.toLowerCase() !== 'y') {
        console.log('❌ 操作をキャンセルしました')
        return
      }
      
      // 既存データを削除
      console.log('\n🗑️ 既存新業界カテゴリーを削除中...')
      const { error: deleteError } = await supabase
        .from('categories')
        .delete()
        .eq('type', 'industry')
        .in('category_id', existingCategoryIds)
      
      if (deleteError) {
        console.error('❌ Error deleting existing data:', deleteError)
        return
      }
      console.log('✅ 既存新業界カテゴリー削除完了')
    }

    // 2. 新業界カテゴリーデータを変換
    console.log('\n🔄 新業界カテゴリーデータを変換中...')
    
    const categoryData = NEW_INDUSTRY_CATEGORIES.map(category => ({
      category_id: category.category_id,
      name: category.name,
      description: category.description,
      type: 'industry' as const,
      icon: category.icon,
      color: category.color,
      display_order: category.display_order,
      is_active: false,  // 🔥 新業界カテゴリーは無効状態で先行登録
      is_visible: true,  // 管理画面では表示
      activation_date: null // 有効化予定日は未設定
    }))

    console.log(`📋 登録対象: ${categoryData.length}件の新業界カテゴリー`)
    
    // 業界別の表示
    console.log('\n📊 **新業界カテゴリー一覧**')
    console.log('=' .repeat(80))
    
    categoryData.forEach(cat => {
      const subCount = NEW_INDUSTRY_CATEGORIES.find(orig => orig.category_id === cat.category_id)?.subcategories.length || 0
      console.log(`${cat.icon} ${cat.name.padEnd(20)} | ${subCount}個のサブカテゴリー予定 | 🔴 無効状態`)
    })

    // 3. Supabaseにデータを挿入
    console.log('\n📥 Supabaseに新業界カテゴリーデータを挿入中...')
    
    const { data: insertedData, error: insertError } = await supabase
      .from('categories')
      .insert(categoryData)
      .select()

    if (insertError) {
      console.error('❌ Error inserting new industry categories:', insertError)
      return
    }

    console.log('✅ 新業界カテゴリーデータ挿入完了')
    
    // 4. 挿入結果の確認
    console.log('\n📊 **挿入された新業界カテゴリーデータ**')
    console.log('=' .repeat(100))
    
    insertedData?.forEach(cat => {
      const status = cat.is_active ? '🟢 有効' : '🔴 無効 (Coming Soon)'
      console.log(`${cat.category_id.padEnd(40)} | ${cat.name.padEnd(20)} | ${cat.icon} | ${status}`)
    })

    // 5. 全業界カテゴリーの統計
    console.log('\n📊 **全業界カテゴリー統計**')
    console.log('=' .repeat(80))
    
    const { data: allIndustryCategories, error: allError } = await supabase
      .from('categories')
      .select('category_id, name, is_active, display_order')
      .eq('type', 'industry')
      .order('display_order')

    if (allError) {
      console.error('❌ Error fetching all industry categories:', allError)
      return
    }

    const activeIndustryCount = allIndustryCategories?.filter(cat => cat.is_active).length || 0
    const inactiveIndustryCount = allIndustryCategories?.filter(cat => !cat.is_active).length || 0
    const totalIndustryCount = allIndustryCategories?.length || 0

    console.log(`🟢 有効業界カテゴリー: ${activeIndustryCount}件 (既存)`)
    console.log(`🔴 無効業界カテゴリー: ${inactiveIndustryCount}件 (Coming Soon)`)
    console.log(`📊 総業界カテゴリー数: ${totalIndustryCount}件`)

    console.log('\n📋 **業界カテゴリー一覧 (display_order順)**')
    console.log('=' .repeat(80))
    allIndustryCategories?.forEach(cat => {
      const status = cat.is_active ? '🟢' : '🔴'
      console.log(`${cat.display_order.toString().padStart(2)}: ${status} ${cat.name} (${cat.category_id})`)
    })

    // 6. サブカテゴリー先行登録の準備
    console.log('\n📋 **サブカテゴリー先行登録の準備**')
    console.log('=' .repeat(80))
    
    const totalSubcategories = NEW_INDUSTRY_CATEGORIES.reduce((sum, cat) => sum + cat.subcategories.length, 0)
    console.log(`🔄 次回登録予定: ${totalSubcategories}件の新業界サブカテゴリー`)
    
    NEW_INDUSTRY_CATEGORIES.forEach(category => {
      console.log(`${category.icon} ${category.name}: ${category.subcategories.length}件`)
    })

    // 7. 次のステップの案内
    console.log('\n📋 **次のステップ**')
    console.log('=' .repeat(80))
    console.log('1. ✅ スキルレベルマスターデータ初期化完了')
    console.log('2. ✅ メインカテゴリーデータ移行完了')
    console.log('3. ✅ 既存業界カテゴリーデータ移行完了')
    console.log('4. ✅ サブカテゴリーデータ移行完了')
    console.log('5. ✅ 新業界カテゴリー先行登録完了 (無効状態)')
    console.log('6. 🔄 クイズデータdifficulty値正規化 (Task 2.6)')
    console.log('7. 🔄 新業界サブカテゴリー先行登録')
    console.log('8. 🔄 API開発・フロントエンド対応')

    console.log('\n✅ 新業界カテゴリーの先行登録が完了しました！')
    console.log('🔴 無効状態で登録済み - 段階的に有効化予定')

  } catch (error) {
    console.error('❌ Critical error:', error)
  }
}

// 実行
migrateNewIndustryCategories().then(() => {
  console.log('\n🏭 新業界カテゴリー先行登録完了')
  process.exit(0)
}).catch(error => {
  console.error('❌ Script error:', error)
  process.exit(1)
})