/**
 * wisdom_cards.subcategory_idを日本語名から英語IDに変換するスクリプト
 *
 * 使用方法:
 *   node scripts/convert-wisdom-subcategory-to-id.js --dry-run
 *   node scripts/convert-wisdom-subcategory-to-id.js --execute
 */

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const isDryRun = process.argv.includes('--dry-run')
const isExecute = process.argv.includes('--execute')

if (!isDryRun && !isExecute) {
  console.log('使用方法:')
  console.log('  node scripts/convert-wisdom-subcategory-to-id.js --dry-run')
  console.log('  node scripts/convert-wisdom-subcategory-to-id.js --execute')
  process.exit(0)
}

// マスターに存在しない日本語名への代替マッピング
const FALLBACK_MAPPING = {
  // データ・分析系
  'データ活用・分析': 'data_driven_management',
  'テクノロジー戦略': 'dx_strategy_transformation',
  'デジタルトランスフォーメーション': 'dx_strategy_transformation',

  // 思考・問題解決系
  '仮説思考・検証': 'hypothesis_verification',
  '問題発見・課題設定': 'hypothesis_thinking_issue',
  '意思決定フレームワーク': 'behavioral_economics',

  // リーダーシップ・組織系
  'リーダーシップ哲学': 'organizational_development_leadership',
  '組織文化・価値観': 'organizational_development_leadership',
  '人材育成・コーチング': 'talent_management_development',

  // コミュニケーション系
  'コミュニケーション戦略': 'conclusion_first_structured_thinking',
  'ストーリーテリング': 'storyline_construction',
  '説得力・影響力': 'negotiation_persuasion',
  'プレゼンテーション技術': 'executive_presentation',

  // マーケティング・顧客系
  'マーケティング戦略': 'digital_marketing',
  '顧客理解・市場分析': 'customer_analysis_segmentation',
  '顧客体験・サービス設計': 'customer_success',
  '成長戦略・市場開拓': 'new_business_innovation',

  // プロジェクト・業務系
  'アジャイル・スクラム': 'schedule_resource_management',
  'タイムマネジメント': 'business_efficiency_time',
  'プロジェクト管理': 'project_design_wbs',
  '実行力・推進力': 'business_efficiency_time',

  // リスク・危機管理系
  'リスク評価・管理': 'corporate_risk_management',
  '危機対応・レジリエンス': 'crisis_management_bcp',
  'セキュリティ・コンプライアンス': 'information_security',

  // 業務改善系
  '業務改善・効率化': 'bpr_business_reform',
  'オペレーション戦略': 'operation_reform',
  '品質管理・継続改善': 'quality_management',

  // SI・エンジニアリング系
  'システム設計・アーキテクチャ': 'technical_feasibility',
  'ソフトウェア開発手法': 'requirements_business_analysis',
  'エンジニアリング文化': 'technical_feasibility',

  // コンサルティング系
  '課題解決アプローチ': 'business_issue_hearing',
  '戦略コンサルティング': 'industry_trend_analysis',
  '業界分析・提言': 'industry_trend_analysis',

  // 財務系
  '資本市場・資金調達': 'business_planning_funding',
  '経営指標・KPI管理': 'management_accounting_kpi',
}

async function main() {
  console.log('='.repeat(60))
  console.log(isDryRun ? '🔍 ドライラン（プレビューモード）' : '⚡ 実行モード')
  console.log('='.repeat(60))

  // Step 1: subcategoriesマスターから日本語名→英語IDマッピングを作成
  console.log('\n📊 Step 1: subcategoriesマスターを取得...')

  const { data: subcategories, error: subError } = await supabase
    .from('subcategories')
    .select('subcategory_id, name')

  if (subError) {
    console.error('Error fetching subcategories:', subError)
    return
  }

  const nameToId = new Map()
  subcategories?.forEach(s => {
    nameToId.set(s.name, s.subcategory_id)
  })

  console.log(`マッピング数: ${nameToId.size}`)

  // Step 2: wisdom_cardsのsubcategory_idを取得
  console.log('\n📊 Step 2: wisdom_cardsを取得...')

  const { data: wisdomCards, error: wcError } = await supabase
    .from('wisdom_cards')
    .select('id, subcategory_id, author')

  if (wcError) {
    console.error('Error fetching wisdom_cards:', wcError)
    return
  }

  console.log(`wisdom_cards数: ${wisdomCards?.length}`)

  // Step 3: 変換対象を特定
  console.log('\n📊 Step 3: 変換対象を特定...')

  const updates = []
  const notFound = []
  const alreadyEnglish = []

  for (const card of (wisdomCards || [])) {
    if (!card.subcategory_id) continue

    // 既に英語ID（小文字とアンダースコアのみ）の場合はスキップ
    if (/^[a-z_]+$/.test(card.subcategory_id)) {
      alreadyEnglish.push(card)
      continue
    }

    // 日本語名から英語IDを検索（マスター → フォールバック の順）
    let englishId = nameToId.get(card.subcategory_id)

    if (!englishId) {
      // フォールバックマッピングを試す
      englishId = FALLBACK_MAPPING[card.subcategory_id]
    }

    if (englishId) {
      updates.push({
        id: card.id,
        author: card.author,
        old_subcategory_id: card.subcategory_id,
        new_subcategory_id: englishId
      })
    } else {
      notFound.push({
        id: card.id,
        author: card.author,
        subcategory_id: card.subcategory_id
      })
    }
  }

  console.log(`変換対象: ${updates.length}件`)
  console.log(`既に英語ID: ${alreadyEnglish.length}件`)
  console.log(`マッピングなし: ${notFound.length}件`)

  // サンプル表示
  console.log('\n=== 変換サンプル（最初の10件） ===')
  updates.slice(0, 10).forEach((u, i) => {
    console.log(`${i + 1}. ${u.author} (id: ${u.id})`)
    console.log(`   ${u.old_subcategory_id} → ${u.new_subcategory_id}`)
  })

  if (notFound.length > 0) {
    console.log('\n=== マッピングなし（要確認） ===')
    notFound.forEach(n => {
      console.log(`  ${n.author}: "${n.subcategory_id}"`)
    })
  }

  if (isDryRun) {
    console.log('\n' + '='.repeat(60))
    console.log('🔍 ドライランモード - 実行には --execute を使用')
    console.log('='.repeat(60))
    return
  }

  // Step 4: 更新実行
  console.log('\n📝 Step 4: 更新中...')

  let successCount = 0
  let errorCount = 0

  for (const update of updates) {
    const { error } = await supabase
      .from('wisdom_cards')
      .update({ subcategory_id: update.new_subcategory_id })
      .eq('id', update.id)

    if (error) {
      console.error(`❌ Error updating id ${update.id}:`, error.message)
      errorCount++
    } else {
      successCount++
    }

    if ((successCount + errorCount) % 50 === 0) {
      console.log(`  進捗: ${successCount + errorCount}/${updates.length}`)
    }
  }

  console.log(`\n✅ 更新完了: 成功 ${successCount}, エラー ${errorCount}`)

  // 検証
  console.log('\n📊 検証...')
  const { data: sample } = await supabase
    .from('wisdom_cards')
    .select('id, author, subcategory_id')
    .limit(5)

  console.log('更新後サンプル:')
  sample?.forEach(s => {
    console.log(`  ${s.author}: ${s.subcategory_id}`)
  })

  console.log('\n' + '='.repeat(60))
  console.log('🎉 完了!')
  console.log('='.repeat(60))
}

main().catch(console.error)
