/**
 * 格言カードの詳細情報を更新するスクリプト
 * - subcategory_id（日本語サブカテゴリー名）
 * - URL系フィールド（card_image_url, background_image_url, rarity_frame_url, author_portrait_url）
 *
 * 使用方法:
 *   node scripts/update-wisdom-cards-details.js --dry-run
 *   node scripts/update-wisdom-cards-details.js --execute
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
  console.log('  node scripts/update-wisdom-cards-details.js --dry-run')
  console.log('  node scripts/update-wisdom-cards-details.js --execute')
  process.exit(0)
}

// カテゴリー別サブカテゴリー名マッピング
const SUBCATEGORY_NAMES = {
  'strategy_management': [
    '経営戦略・事業戦略',
    '新事業開発・イノベーション',
    '競争戦略・フレームワーク',
    '事業ポートフォリオ管理',
    '成長戦略・市場開拓'
  ],
  'leadership_hr': [
    '組織開発・変革リーダーシップ',
    'チームマネジメント・モチベーション',
    '人材育成・コーチング',
    'リーダーシップ哲学',
    '組織文化・価値観'
  ],
  'finance': [
    '財務分析・企業価値評価',
    '投資判断・リスク管理',
    '資本市場・資金調達',
    '経営指標・KPI管理'
  ],
  'business_process_analysis': [
    'プロセス設計・最適化',
    '業務改善・効率化',
    '品質管理・継続改善',
    'オペレーション戦略'
  ],
  'marketing_sales': [
    'ブランディング・ポジショニング',
    '顧客理解・市場分析',
    'マーケティング戦略',
    '顧客体験・サービス設計'
  ],
  'logical_thinking_problem_solving': [
    '構造化思考（MECE・ロジックツリー）',
    '問題発見・課題設定',
    '仮説思考・検証',
    '意思決定フレームワーク'
  ],
  'ai_digital_utilization': [
    'AI・機械学習活用',
    'デジタルトランスフォーメーション',
    'テクノロジー戦略',
    'データ活用・分析'
  ],
  'communication_presentation': [
    'プレゼンテーション技術',
    'コミュニケーション戦略',
    '説得力・影響力',
    'ストーリーテリング'
  ],
  'project_operations': [
    'プロジェクト管理',
    '実行力・推進力',
    'アジャイル・スクラム',
    'タイムマネジメント'
  ],
  'risk_crisis_management': [
    'リスク評価・管理',
    '危機対応・レジリエンス',
    '不確実性への対処',
    'セキュリティ・コンプライアンス'
  ],
  'consulting_industry': [
    '課題解決アプローチ',
    'クライアント対応',
    '戦略コンサルティング',
    '業界分析・提言'
  ],
  'si_industry': [
    'システム設計・アーキテクチャ',
    'ソフトウェア開発手法',
    'エンジニアリング文化',
    '技術リーダーシップ'
  ]
}

// レアリティ英語変換
const RARITY_EN = {
  'コモン': 'common',
  'レア': 'rare',
  'エピック': 'epic',
  'レジェンダリー': 'legendary'
}

// カテゴリー別背景テーマ
const CATEGORY_THEMES = {
  'strategy_management': 'strategy',
  'leadership_hr': 'leadership',
  'finance': 'finance',
  'business_process_analysis': 'process',
  'marketing_sales': 'marketing',
  'logical_thinking_problem_solving': 'logic',
  'ai_digital_utilization': 'digital',
  'communication_presentation': 'communication',
  'project_operations': 'project',
  'risk_crisis_management': 'risk',
  'consulting_industry': 'consulting',
  'si_industry': 'engineering'
}

// 著者名からスラッグを生成
function authorToSlug(author) {
  const slugMap = {
    'サム・アルトマン': 'altman',
    'デミス・ハサビス': 'hassabis',
    'ジェフリー・ヒントン': 'hinton',
    'アンドリュー・ング': 'ng',
    'サティア・ナデラ': 'nadella',
    'スンダー・ピチャイ': 'pichai',
    'ジェンスン・フアン': 'huang',
    '落合陽一': 'ochiai',
    '松尾豊': 'matsuo',
    '孫子': 'sunzi',
    'ニッコロ・マキャヴェッリ': 'machiavelli',
    'アダム・スミス': 'smith-adam',
    'ベンジャミン・フランクリン': 'franklin',
    'ウィンストン・チャーチル': 'churchill',
    'アルバート・アインシュタイン': 'einstein',
    'トーマス・エジソン': 'edison',
    'レオナルド・ダ・ヴィンチ': 'davinci',
    '渋沢栄一': 'shibusawa',
    '福沢諭吉': 'fukuzawa',
    '松下幸之助': 'matsushita',
    '本田宗一郎': 'honda',
    '盛田昭夫': 'morita',
    '柳井正': 'yanai',
    '永守重信': 'nagamori',
    '三木谷浩史': 'mikitani',
    'ビル・ゲイツ': 'gates',
    'ジェフ・ベゾス': 'bezos',
    'マーク・ザッカーバーグ': 'zuckerberg',
    'ティム・クック': 'cook',
    'リード・ヘイスティングス': 'hastings',
    'ブライアン・チェスキー': 'chesky',
    'ジャック・マー': 'ma-jack',
    'ジム・コリンズ': 'collins',
    'クレイトン・クリステンセン': 'christensen',
    'サイモン・シネック': 'sinek',
    'ダニエル・カーネマン': 'kahneman',
    'エリック・リース': 'ries',
    'スティーブン・コヴィー': 'covey',
    '大前研一': 'ohmae',
    'ジョージ・ソロス': 'soros',
    'チャーリー・マンガー': 'munger',
    'ピーター・ティール': 'thiel',
    'ハワード・シュルツ': 'schultz',
    'インドラ・ヌーイ': 'nooyi',
    'メアリー・バーラ': 'barra',
    'ボブ・アイガー': 'iger',
    'デール・カーネギー': 'carnegie',
    'ガー・レイノルズ': 'reynolds',
    'ナンシー・デュアルテ': 'duarte',
    'ジェフ・サザーランド': 'sutherland',
    'ケント・ベック': 'beck',
    'マーティン・ファウラー': 'fowler',
    'ナシム・ニコラス・タレブ': 'taleb',
    'ヘンリー・フォード': 'ford',
    'ウォルト・ディズニー': 'disney',
    'アルフレッド・スローン': 'sloan',
    'トム・ピーターズ': 'peters',
    'ゲイリー・ハメル': 'hamel',
    'マイケル・ハマー': 'hammer',
    'オードリー・タン': 'tang'
  }
  return slugMap[author] || author.toLowerCase().replace(/[・\s]/g, '-').replace(/[^a-z0-9-]/g, '')
}

async function main() {
  console.log('='.repeat(60))
  console.log(isDryRun ? '🔍 ドライラン（プレビューモード）' : '⚡ 実行モード')
  console.log('='.repeat(60))

  // 更新対象のカード取得（subcategory_idがnullのもの）
  const { data: cardsToUpdate, error } = await supabase
    .from('wisdom_cards')
    .select('*')
    .is('subcategory_id', null)

  if (error) {
    console.error('Error fetching cards:', error)
    return
  }

  console.log(`\n更新対象カード数: ${cardsToUpdate?.length || 0}`)

  if (!cardsToUpdate || cardsToUpdate.length === 0) {
    console.log('✅ 更新対象なし')
    return
  }

  // 各カードの更新データを生成
  const updates = cardsToUpdate.map(card => {
    const categoryId = card.category_id
    const rarityEn = RARITY_EN[card.rarity] || 'common'
    const theme = CATEGORY_THEMES[categoryId] || 'general'
    const authorSlug = authorToSlug(card.author)

    // サブカテゴリー名をランダムに選択（同カテゴリー内でバリエーション）
    const subcategories = SUBCATEGORY_NAMES[categoryId] || ['汎用']
    const subcategoryIndex = card.id % subcategories.length
    const subcategoryName = subcategories[subcategoryIndex]

    return {
      id: card.id,
      subcategory_id: subcategoryName,
      card_image_url: `/images/wisdom-cards/backgrounds/${rarityEn}/${theme}-bg.jpg`,
      background_image_url: `/images/wisdom-cards/backgrounds/${rarityEn}/${theme}-bg.jpg`,
      rarity_frame_url: `/images/wisdom-cards/frames/${rarityEn}-frame.png`,
      author_portrait_url: `/images/wisdom-cards/portraits/${authorSlug}.jpg`
    }
  })

  // サンプル表示
  console.log('\n=== 更新サンプル（最初の5件） ===')
  updates.slice(0, 5).forEach((u, i) => {
    const card = cardsToUpdate.find(c => c.id === u.id)
    console.log(`${i + 1}. ${card.author} (id: ${u.id})`)
    console.log(`   subcategory_id: ${u.subcategory_id}`)
    console.log(`   card_image_url: ${u.card_image_url}`)
    console.log(`   author_portrait_url: ${u.author_portrait_url}`)
    console.log('')
  })

  if (isDryRun) {
    console.log('='.repeat(60))
    console.log('🔍 ドライランモード - 実行には --execute を使用')
    console.log('='.repeat(60))
    return
  }

  // 更新実行
  console.log('\n📝 更新中...')
  let successCount = 0
  let errorCount = 0

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('wisdom_cards')
      .update({
        subcategory_id: update.subcategory_id,
        card_image_url: update.card_image_url,
        background_image_url: update.background_image_url,
        rarity_frame_url: update.rarity_frame_url,
        author_portrait_url: update.author_portrait_url
      })
      .eq('id', update.id)

    if (updateError) {
      console.error(`❌ Error updating id ${update.id}:`, updateError.message)
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
  const { count: nullCount } = await supabase
    .from('wisdom_cards')
    .select('id', { count: 'exact', head: true })
    .is('subcategory_id', null)

  console.log(`\n残りのsubcategory_id=null: ${nullCount}件`)

  console.log('\n' + '='.repeat(60))
  console.log('🎉 完了!')
  console.log('='.repeat(60))
}

main().catch(console.error)
