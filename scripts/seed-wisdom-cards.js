/**
 * 格言カード追加スクリプト
 *
 * 現在13枚 → 130枚（117枚追加）
 *
 * 使用方法:
 *   node scripts/seed-wisdom-cards.js --dry-run   # プレビュー
 *   node scripts/seed-wisdom-cards.js --execute   # 実行
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
  console.log('  node scripts/seed-wisdom-cards.js --dry-run')
  console.log('  node scripts/seed-wisdom-cards.js --execute')
  process.exit(0)
}

// カテゴリーID一覧
const CATEGORIES = {
  STRATEGY: 'strategy_management',
  LEADERSHIP: 'leadership_hr',
  FINANCE: 'finance',
  BPA: 'business_process_analysis',
  MARKETING: 'marketing_sales',
  LOGIC: 'logical_thinking_problem_solving',
  AI_DX: 'ai_digital_utilization',
  COMMUNICATION: 'communication_presentation',
  PROJECT: 'project_operations',
  RISK: 'risk_crisis_management',
  CONSULTING: 'consulting_industry',
  SI: 'si_industry'
}

// カテゴリー別の適用分野
const APPLICATION_AREAS = {
  [CATEGORIES.STRATEGY]: '戦略立案・競争分析',
  [CATEGORIES.LEADERSHIP]: '組織マネジメント・人材育成',
  [CATEGORIES.FINANCE]: '財務分析・投資判断',
  [CATEGORIES.BPA]: '業務改善・プロセス最適化',
  [CATEGORIES.MARKETING]: 'マーケティング・顧客理解',
  [CATEGORIES.LOGIC]: '問題解決・論理的思考',
  [CATEGORIES.AI_DX]: 'DX推進・テクノロジー活用',
  [CATEGORIES.COMMUNICATION]: 'コミュニケーション・プレゼン',
  [CATEGORIES.PROJECT]: 'プロジェクト管理・実行力',
  [CATEGORIES.RISK]: 'リスク管理・危機対応',
  [CATEGORIES.CONSULTING]: 'コンサルティング・課題解決',
  [CATEGORIES.SI]: 'システム開発・エンジニアリング'
}

// レアリティ（分布: コモン40%, レア30%, エピック20%, レジェンダリー10%）
const RARITIES = {
  COMMON: 'コモン',
  RARE: 'レア',
  EPIC: 'エピック',
  LEGENDARY: 'レジェンダリー'
}

// 格言データ
const wisdomCards = [
  // ========================================
  // AI/DX関連の人物
  // ========================================

  // サム・アルトマン (OpenAI CEO)
  { author: 'サム・アルトマン', quote: 'AIは人類史上最も重要な技術になる可能性がある。だからこそ、慎重に、しかし大胆に進む必要がある', category_id: CATEGORIES.AI_DX, rarity: RARITIES.LEGENDARY, context: 'OpenAI CEO、AI開発の最前線' },
  { author: 'サム・アルトマン', quote: 'スタートアップで最も重要なのは、正しい問題を解くことだ。解き方は後からついてくる', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.EPIC, context: 'Y Combinator元社長' },

  // デミス・ハサビス (DeepMind CEO)
  { author: 'デミス・ハサビス', quote: '知能の本質を理解することは、科学における最大の挑戦の一つだ', category_id: CATEGORIES.AI_DX, rarity: RARITIES.LEGENDARY, context: 'DeepMind創業者、AlphaGo開発' },
  { author: 'デミス・ハサビス', quote: 'ゲームは知能を測る完璧なテストベッドだ。明確なルール、明確な勝敗がある', category_id: CATEGORIES.AI_DX, rarity: RARITIES.RARE, context: 'AI研究者' },

  // ジェフリー・ヒントン (AIの父)
  { author: 'ジェフリー・ヒントン', quote: 'ディープラーニングは脳の仕組みに着想を得ている。しかし、脳よりもシンプルで、時に脳より優れている', category_id: CATEGORIES.AI_DX, rarity: RARITIES.LEGENDARY, context: 'ディープラーニングの父、チューリング賞受賞' },
  { author: 'ジェフリー・ヒントン', quote: '科学の進歩は、間違った理論を捨てる勇気から始まる', category_id: CATEGORIES.LOGIC, rarity: RARITIES.EPIC, context: 'AI研究の先駆者' },

  // アンドリュー・ング
  { author: 'アンドリュー・ング', quote: 'AIは新しい電気だ。100年前に電気があらゆる産業を変えたように、AIもそうなる', category_id: CATEGORIES.AI_DX, rarity: RARITIES.EPIC, context: 'Coursera共同創業者、元Google Brain' },
  { author: 'アンドリュー・ング', quote: '機械学習プロジェクトの80%はデータ準備に費やされる。データこそが王様だ', category_id: CATEGORIES.AI_DX, rarity: RARITIES.RARE, context: 'AI教育の第一人者' },

  // サティア・ナデラ (Microsoft CEO)
  { author: 'サティア・ナデラ', quote: '私たちの産業は伝統を尊重しない。革新と変化だけを尊重する', category_id: CATEGORIES.AI_DX, rarity: RARITIES.EPIC, context: 'Microsoft CEO、クラウドAI戦略推進' },
  { author: 'サティア・ナデラ', quote: '成長マインドセットとは、自分の能力は努力で伸ばせると信じることだ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.RARE, context: 'Microsoftを復活させた経営者' },
  { author: 'サティア・ナデラ', quote: '共感力はイノベーションの源泉だ。顧客の満たされないニーズを理解することから始まる', category_id: CATEGORIES.MARKETING, rarity: RARITIES.RARE, context: 'Microsoft再生の立役者' },

  // スンダー・ピチャイ (Google CEO)
  { author: 'スンダー・ピチャイ', quote: 'AIファーストの世界では、ハードウェアとソフトウェアの境界がなくなる', category_id: CATEGORIES.AI_DX, rarity: RARITIES.EPIC, context: 'Google/Alphabet CEO' },
  { author: 'スンダー・ピチャイ', quote: '失敗を恐れるな。失敗から学ばないことを恐れろ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.COMMON, context: 'インド出身のグローバルリーダー' },

  // ジェンスン・フアン (NVIDIA CEO)
  { author: 'ジェンスン・フアン', quote: 'ソフトウェアが世界を食い、AIがソフトウェアを食う', category_id: CATEGORIES.AI_DX, rarity: RARITIES.EPIC, context: 'NVIDIA創業者、GPU革命の立役者' },
  { author: 'ジェンスン・フアン', quote: 'アクセラレーテッド・コンピューティングは、持続可能な未来への唯一の道だ', category_id: CATEGORIES.AI_DX, rarity: RARITIES.RARE, context: 'AI時代のインフラを構築' },

  // 落合陽一
  { author: '落合陽一', quote: 'デジタルネイチャーとは、計算機と自然が融合した新しい自然観だ', category_id: CATEGORIES.AI_DX, rarity: RARITIES.EPIC, context: 'メディアアーティスト、筑波大学准教授' },
  { author: '落合陽一', quote: 'これからの時代、問題を解く力より問題を見つける力が重要になる', category_id: CATEGORIES.LOGIC, rarity: RARITIES.RARE, context: '日本のデジタル論客' },

  // 松尾豊
  { author: '松尾豊', quote: 'ディープラーニングの本質は、特徴表現の自動獲得にある', category_id: CATEGORIES.AI_DX, rarity: RARITIES.RARE, context: '東京大学教授、日本のAI研究第一人者' },
  { author: '松尾豊', quote: 'AIに奪われる仕事を心配するより、AIと協働する能力を磨くべきだ', category_id: CATEGORIES.AI_DX, rarity: RARITIES.COMMON, context: '日本ディープラーニング協会理事長' },

  // ========================================
  // 歴史上の人物・思想家
  // ========================================

  // 孫子
  { author: '孫子', quote: '彼を知り己を知れば百戦殆うからず', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.LEGENDARY, context: '中国古代の軍事思想家、孫子の兵法' },
  { author: '孫子', quote: '勝兵は先ず勝ちて而る後に戦いを求め、敗兵は先ず戦いて而る後に勝を求む', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.EPIC, context: '戦略論の古典' },
  { author: '孫子', quote: '兵は詭道なり。故に能なるも之に不能を示す', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.RARE, context: '2500年読み継がれる戦略書' },

  // マキャヴェッリ
  { author: 'ニッコロ・マキャヴェッリ', quote: '変革を導入することほど困難な事業はない', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.EPIC, context: 'ルネサンス期の政治思想家、君主論' },
  { author: 'ニッコロ・マキャヴェッリ', quote: '運命は我々の行動の半分を支配するが、残り半分は我々に委ねられている', category_id: CATEGORIES.RISK, rarity: RARITIES.RARE, context: '近代政治学の祖' },

  // アダム・スミス
  { author: 'アダム・スミス', quote: '見えざる手が市場を調整する', category_id: CATEGORIES.FINANCE, rarity: RARITIES.LEGENDARY, context: '経済学の父、国富論' },
  { author: 'アダム・スミス', quote: '分業こそが生産性向上の源泉である', category_id: CATEGORIES.BPA, rarity: RARITIES.EPIC, context: '近代経済学の創始者' },

  // ベンジャミン・フランクリン
  { author: 'ベンジャミン・フランクリン', quote: '時は金なり', category_id: CATEGORIES.PROJECT, rarity: RARITIES.COMMON, context: 'アメリカ建国の父' },
  { author: 'ベンジャミン・フランクリン', quote: '投資の最良の対象は自分自身への投資である', category_id: CATEGORIES.FINANCE, rarity: RARITIES.RARE, context: '政治家・発明家・実業家' },
  { author: 'ベンジャミン・フランクリン', quote: '準備を怠ることは、失敗を準備することだ', category_id: CATEGORIES.PROJECT, rarity: RARITIES.COMMON, context: '多才な偉人' },

  // ウィンストン・チャーチル
  { author: 'ウィンストン・チャーチル', quote: '成功とは、失敗から失敗へと情熱を失わずに進むことだ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.EPIC, context: '英国首相、ノーベル文学賞' },
  { author: 'ウィンストン・チャーチル', quote: '改善すべき点を見つけるのは簡単だ。難しいのは改善することだ', category_id: CATEGORIES.BPA, rarity: RARITIES.RARE, context: '第二次世界大戦の指導者' },
  { author: 'ウィンストン・チャーチル', quote: '悲観主義者はあらゆる機会に困難を見出し、楽観主義者はあらゆる困難に機会を見出す', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.RARE, context: '危機のリーダーシップ' },

  // アルバート・アインシュタイン
  { author: 'アルバート・アインシュタイン', quote: '想像力は知識より重要だ。知識には限界があるが、想像力は世界を包み込む', category_id: CATEGORIES.LOGIC, rarity: RARITIES.LEGENDARY, context: '相対性理論、ノーベル物理学賞' },
  { author: 'アルバート・アインシュタイン', quote: '問題を生み出した時と同じ思考では、その問題は解決できない', category_id: CATEGORIES.LOGIC, rarity: RARITIES.EPIC, context: '20世紀最大の物理学者' },
  { author: 'アルバート・アインシュタイン', quote: 'シンプルに説明できないなら、十分に理解していないということだ', category_id: CATEGORIES.COMMUNICATION, rarity: RARITIES.RARE, context: '天才物理学者' },

  // トーマス・エジソン
  { author: 'トーマス・エジソン', quote: '天才とは1%のひらめきと99%の努力である', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.EPIC, context: '発明王、1000以上の特許' },
  { author: 'トーマス・エジソン', quote: '私は失敗していない。うまくいかない方法を1万通り発見したのだ', category_id: CATEGORIES.BPA, rarity: RARITIES.EPIC, context: '電球・蓄音機の発明者' },
  { author: 'トーマス・エジソン', quote: 'ほとんどの人がチャンスを逃す理由は、チャンスが作業服を着て働くように見えるからだ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.RARE, context: '実業家・発明家' },

  // レオナルド・ダ・ヴィンチ
  { author: 'レオナルド・ダ・ヴィンチ', quote: 'シンプルさは究極の洗練である', category_id: CATEGORIES.BPA, rarity: RARITIES.LEGENDARY, context: 'ルネサンスの万能人' },
  { author: 'レオナルド・ダ・ヴィンチ', quote: '学ぶことに飽きた者は、既に死んでいる', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.RARE, context: '芸術家・科学者・発明家' },

  // ========================================
  // 日本の偉人・経営者
  // ========================================

  // 渋沢栄一
  { author: '渋沢栄一', quote: '論語と算盤は一致すべきものである', category_id: CATEGORIES.FINANCE, rarity: RARITIES.LEGENDARY, context: '日本資本主義の父' },
  { author: '渋沢栄一', quote: '正しい道理の富でなければ、その富は永続しない', category_id: CATEGORIES.FINANCE, rarity: RARITIES.EPIC, context: '500以上の企業設立に関与' },
  { author: '渋沢栄一', quote: '夢七訓：夢なき者に理想なし、理想なき者に計画なし', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.RARE, context: '近代日本経済の礎' },

  // 福沢諭吉
  { author: '福沢諭吉', quote: '天は人の上に人を造らず人の下に人を造らず', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.LEGENDARY, context: '慶應義塾創設者、学問のすゝめ' },
  { author: '福沢諭吉', quote: '独立の気力なき者は必ず人に依頼す', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.EPIC, context: '近代日本の啓蒙思想家' },

  // 松下幸之助
  { author: '松下幸之助', quote: '企業は社会の公器である', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.LEGENDARY, context: 'パナソニック創業者、経営の神様' },
  { author: '松下幸之助', quote: '失敗の多くは、成功するまでに諦めてしまうところに原因がある', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.EPIC, context: 'PHP研究所創設' },
  { author: '松下幸之助', quote: '素直な心になりましょう。素直な心はあなたを強く正しく聡明にします', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.RARE, context: '日本を代表する実業家' },
  { author: '松下幸之助', quote: '自分には自分に与えられた道がある。天与の尊い道がある', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.COMMON, context: '経営哲学の巨人' },

  // 本田宗一郎
  { author: '本田宗一郎', quote: '挑戦した結果の失敗は、チャレンジしなかった場合に比べて1000倍の価値がある', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.EPIC, context: 'ホンダ創業者' },
  { author: '本田宗一郎', quote: '需要があるからつくるのではない。我々がつくるから需要が生まれるのだ', category_id: CATEGORIES.MARKETING, rarity: RARITIES.EPIC, context: '世界のホンダを築いた男' },
  { author: '本田宗一郎', quote: '技術屋というのは、口で説明するのではなく、モノで見せるものだ', category_id: CATEGORIES.SI, rarity: RARITIES.RARE, context: 'エンジニア精神の体現者' },

  // 盛田昭夫
  { author: '盛田昭夫', quote: '他社がやっていないことをやれ。やっていることの逆をやれ', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.EPIC, context: 'ソニー創業者' },
  { author: '盛田昭夫', quote: '市場調査をするな。消費者に何がほしいか聞いても、彼らには想像できない', category_id: CATEGORIES.MARKETING, rarity: RARITIES.RARE, context: 'ウォークマンを生んだ発想' },

  // 柳井正
  { author: '柳井正', quote: '一勝九敗。一回の成功のために九回失敗する覚悟が必要だ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.EPIC, context: 'ユニクロ創業者、ファーストリテイリング会長' },
  { author: '柳井正', quote: '変わらなければ、死ぬだけだ', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.RARE, context: 'SPAモデルの確立者' },
  { author: '柳井正', quote: '顧客のためになることは何かを常に考えろ', category_id: CATEGORIES.MARKETING, rarity: RARITIES.COMMON, context: 'グローバルアパレル企業経営者' },

  // 永守重信
  { author: '永守重信', quote: 'すぐやる、必ずやる、出来るまでやる', category_id: CATEGORIES.PROJECT, rarity: RARITIES.EPIC, context: '日本電産創業者' },
  { author: '永守重信', quote: '情熱・熱意・執念があれば、不可能も可能になる', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.RARE, context: 'M&Aの達人' },
  { author: '永守重信', quote: '会社は一人では動かない。人を育てることが最も重要だ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.COMMON, context: 'ニデック会長' },

  // 三木谷浩史
  { author: '三木谷浩史', quote: '成功の概念は、自分で書き換えていい', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.RARE, context: '楽天グループ創業者' },
  { author: '三木谷浩史', quote: 'スピード、スピード、スピード。これがビジネスの基本だ', category_id: CATEGORIES.PROJECT, rarity: RARITIES.COMMON, context: 'Eコマースの先駆者' },

  // ========================================
  // 世界の有名経営者
  // ========================================

  // ビル・ゲイツ
  { author: 'ビル・ゲイツ', quote: '成功を祝うのはいいが、もっと大切なのは失敗から学ぶことだ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.EPIC, context: 'Microsoft創業者、慈善家' },
  { author: 'ビル・ゲイツ', quote: '次の10年を変えるテクノロジーは、常に過小評価されている', category_id: CATEGORIES.AI_DX, rarity: RARITIES.RARE, context: 'PC革命の立役者' },
  { author: 'ビル・ゲイツ', quote: '不満を持つ顧客こそ、最大の学びの源だ', category_id: CATEGORIES.MARKETING, rarity: RARITIES.COMMON, context: '世界最大の慈善家' },

  // ジェフ・ベゾス
  { author: 'ジェフ・ベゾス', quote: '顧客から始めて、逆算して考えろ', category_id: CATEGORIES.MARKETING, rarity: RARITIES.EPIC, context: 'Amazon創業者' },
  { author: 'ジェフ・ベゾス', quote: '長期的に考えれば、顧客と株主の利益は一致する', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.EPIC, context: '世界最大のEコマース構築' },
  { author: 'ジェフ・ベゾス', quote: 'Day 1の精神を忘れるな。Day 2は停滞であり、死の始まりだ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.RARE, context: 'Blue Origin創業者' },
  { author: 'ジェフ・ベゾス', quote: '後悔最小化フレームワーク：80歳の自分が後悔しない選択をしろ', category_id: CATEGORIES.LOGIC, rarity: RARITIES.RARE, context: '起業家精神の体現者' },

  // マーク・ザッカーバーグ
  { author: 'マーク・ザッカーバーグ', quote: '完璧を目指すより、まず終わらせろ', category_id: CATEGORIES.PROJECT, rarity: RARITIES.EPIC, context: 'Meta(Facebook)創業者' },
  { author: 'マーク・ザッカーバーグ', quote: '最大のリスクは、リスクを取らないことだ', category_id: CATEGORIES.RISK, rarity: RARITIES.RARE, context: 'SNS革命の旗手' },
  { author: 'マーク・ザッカーバーグ', quote: 'Move fast and break things. 速く動いて、壊せ', category_id: CATEGORIES.PROJECT, rarity: RARITIES.RARE, context: 'メタバースへの挑戦' },

  // ティム・クック
  { author: 'ティム・クック', quote: 'プライバシーは基本的人権だ', category_id: CATEGORIES.RISK, rarity: RARITIES.RARE, context: 'Apple CEO' },
  { author: 'ティム・クック', quote: '人々の生活を良くする製品を作ることが、私たちの存在理由だ', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.COMMON, context: 'Appleのオペレーション改革者' },

  // リード・ヘイスティングス
  { author: 'リード・ヘイスティングス', quote: '自由と責任。社員を信じて、ルールを最小限にしろ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.EPIC, context: 'Netflix創業者' },
  { author: 'リード・ヘイスティングス', quote: '自社のビジネスを破壊できないなら、他社がやる', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.RARE, context: 'ストリーミング革命の立役者' },

  // ブライアン・チェスキー
  { author: 'ブライアン・チェスキー', quote: '100人に愛される製品を作れ。100万人に気に入られる製品より価値がある', category_id: CATEGORIES.MARKETING, rarity: RARITIES.EPIC, context: 'Airbnb創業者' },
  { author: 'ブライアン・チェスキー', quote: '最高のカスタマーサービスは、問題が起こる前に解決することだ', category_id: CATEGORIES.MARKETING, rarity: RARITIES.RARE, context: 'シェアリングエコノミーの先駆者' },

  // ジャック・マー
  { author: 'ジャック・マー', quote: '今日は厳しい。明日はもっと厳しい。しかし明後日は素晴らしい', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.EPIC, context: 'アリババ創業者' },
  { author: 'ジャック・マー', quote: '顧客が第一、社員が第二、株主は第三だ', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.RARE, context: '中国最大のEコマース構築' },
  { author: 'ジャック・マー', quote: 'チャンスは常に批判の中に隠れている', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.COMMON, context: '英語教師から起業家へ' },

  // ========================================
  // コンサルタント・経営思想家
  // ========================================

  // ジム・コリンズ
  { author: 'ジム・コリンズ', quote: 'Good is the enemy of Great. 良いは偉大の敵である', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.LEGENDARY, context: 'ビジョナリーカンパニー著者' },
  { author: 'ジム・コリンズ', quote: '最初に人を選び、その後に方向を決めろ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.EPIC, context: '経営研究の第一人者' },
  { author: 'ジム・コリンズ', quote: 'ストックデールの逆説：厳しい現実を直視しながら、最終的な勝利を確信せよ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.RARE, context: 'ビルトトゥラスト著者' },

  // クレイトン・クリステンセン
  { author: 'クレイトン・クリステンセン', quote: '破壊的イノベーションは、最初は劣った製品として始まる', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.LEGENDARY, context: 'イノベーションのジレンマ著者' },
  { author: 'クレイトン・クリステンセン', quote: '顧客は製品を買うのではない。片付けるべき仕事を雇うのだ', category_id: CATEGORIES.MARKETING, rarity: RARITIES.EPIC, context: 'ジョブ理論の提唱者' },

  // サイモン・シネック
  { author: 'サイモン・シネック', quote: 'WHYから始めよ。なぜやるのかを明確にしろ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.EPIC, context: 'ゴールデンサークル理論' },
  { author: 'サイモン・シネック', quote: 'リーダーは最後に食べる。チームを守ることがリーダーの仕事だ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.RARE, context: 'TEDトーク1億回再生' },

  // ダニエル・カーネマン
  { author: 'ダニエル・カーネマン', quote: '人は確実な損失より不確実なギャンブルを選ぶ。これが損失回避だ', category_id: CATEGORIES.FINANCE, rarity: RARITIES.EPIC, context: 'ノーベル経済学賞、行動経済学の父' },
  { author: 'ダニエル・カーネマン', quote: 'システム1は速く直感的、システム2は遅く論理的。両方を使いこなせ', category_id: CATEGORIES.LOGIC, rarity: RARITIES.RARE, context: 'ファスト&スロー著者' },

  // エリック・リース
  { author: 'エリック・リース', quote: 'MVP（実用最小限の製品）で仮説を検証しろ', category_id: CATEGORIES.PROJECT, rarity: RARITIES.EPIC, context: 'リーンスタートアップ著者' },
  { author: 'エリック・リース', quote: '構築-計測-学習のループを高速で回せ', category_id: CATEGORIES.BPA, rarity: RARITIES.RARE, context: 'スタートアップ方法論の確立者' },

  // スティーブン・コヴィー
  { author: 'スティーブン・コヴィー', quote: '重要だが緊急でないことに時間を使え。これが第2領域だ', category_id: CATEGORIES.PROJECT, rarity: RARITIES.EPIC, context: '7つの習慣著者' },
  { author: 'スティーブン・コヴィー', quote: 'まず理解に徹し、そして理解されることを求めよ', category_id: CATEGORIES.COMMUNICATION, rarity: RARITIES.RARE, context: '自己啓発の巨匠' },
  { author: 'スティーブン・コヴィー', quote: '刺激と反応の間には選択の自由がある', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.COMMON, context: 'パラダイム転換の提唱者' },

  // 大前研一
  { author: '大前研一', quote: '答えのない時代には、自ら問いを立てる力が必要だ', category_id: CATEGORIES.CONSULTING, rarity: RARITIES.EPIC, context: 'マッキンゼー日本支社長、経営コンサルタント' },
  { author: '大前研一', quote: '戦略とは、他社との違いを明確にすることだ', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.RARE, context: '企業参謀著者' },
  { author: '大前研一', quote: '21世紀は個人が主役の時代だ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.COMMON, context: 'ビジネス・ブレークスルー大学学長' },

  // ========================================
  // 投資家・金融
  // ========================================

  // ジョージ・ソロス
  { author: 'ジョージ・ソロス', quote: '市場は常に間違っている。だからこそチャンスがある', category_id: CATEGORIES.FINANCE, rarity: RARITIES.LEGENDARY, context: '伝説のヘッジファンドマネージャー' },
  { author: 'ジョージ・ソロス', quote: 'まず投資し、その後で調査しろ', category_id: CATEGORIES.FINANCE, rarity: RARITIES.RARE, context: 'イングランド銀行を負かした男' },

  // チャーリー・マンガー
  { author: 'チャーリー・マンガー', quote: '逆算して考えろ。問題を逆から見ることで解決策が見える', category_id: CATEGORIES.LOGIC, rarity: RARITIES.EPIC, context: 'バークシャー・ハサウェイ副会長' },
  { author: 'チャーリー・マンガー', quote: '25の認知バイアスを理解することが、愚かな判断を避ける第一歩だ', category_id: CATEGORIES.LOGIC, rarity: RARITIES.RARE, context: 'ウォーレン・バフェットの相棒' },
  { author: 'チャーリー・マンガー', quote: '毎日少しずつ賢くなって眠りにつけ。これが長期的成功の秘訣だ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.COMMON, context: '投資の賢人' },

  // ピーター・ティール
  { author: 'ピーター・ティール', quote: '競争は敗者のためのものだ。独占を目指せ', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.LEGENDARY, context: 'PayPal創業者、ゼロ・トゥ・ワン著者' },
  { author: 'ピーター・ティール', quote: '賛成する人がほとんどいない、重要な真実は何か', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.EPIC, context: 'Palantir共同創業者' },

  // ========================================
  // その他の経営者・リーダー
  // ========================================

  // ハワード・シュルツ
  { author: 'ハワード・シュルツ', quote: '勝つためには、まず社員を大切にしなければならない', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.EPIC, context: 'スターバックス元CEO' },
  { author: 'ハワード・シュルツ', quote: '企業の成功は、価値観と使命感にかかっている', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.RARE, context: 'コーヒー文化の革新者' },

  // インドラ・ヌーイ
  { author: 'インドラ・ヌーイ', quote: 'リーダーシップとは、人々に自分が重要だと感じさせることだ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.EPIC, context: 'ペプシコ元CEO' },
  { author: 'インドラ・ヌーイ', quote: '5Cを実践せよ：Competence、Courage、Communication、Compassion、Conscience', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.RARE, context: 'フォーチュン最も影響力のある女性' },

  // メアリー・バーラ
  { author: 'メアリー・バーラ', quote: '変化を恐れるな。変化を受け入れ、先導しろ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.RARE, context: 'GM CEO、自動車業界初の女性CEO' },

  // ボブ・アイガー
  { author: 'ボブ・アイガー', quote: '楽観主義は最も重要なリーダーの資質だ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.RARE, context: 'ディズニー元CEO' },
  { author: 'ボブ・アイガー', quote: 'クリエイティビティに投資することを恐れるな', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.COMMON, context: 'ピクサー、マーベル買収' },

  // ========================================
  // コミュニケーション・プレゼンテーション
  // ========================================

  { author: 'デール・カーネギー', quote: '人を動かす唯一の方法は、その人が欲しいものを与えることだ', category_id: CATEGORIES.COMMUNICATION, rarity: RARITIES.LEGENDARY, context: '人を動かす著者' },
  { author: 'デール・カーネギー', quote: '名前は、その人にとって最も甘い響きを持つ言葉だ', category_id: CATEGORIES.COMMUNICATION, rarity: RARITIES.RARE, context: '自己啓発の先駆者' },
  { author: 'デール・カーネギー', quote: '批判、非難、不満を言うな。理解し、許せ', category_id: CATEGORIES.COMMUNICATION, rarity: RARITIES.COMMON, context: 'コミュニケーションの達人' },

  { author: 'ガー・レイノルズ', quote: 'シンプルにしろ。1スライド1メッセージが原則だ', category_id: CATEGORIES.COMMUNICATION, rarity: RARITIES.RARE, context: 'プレゼンテーションZen著者' },

  { author: 'ナンシー・デュアルテ', quote: 'プレゼンテーションは、聴衆を英雄にする物語だ', category_id: CATEGORIES.COMMUNICATION, rarity: RARITIES.RARE, context: 'スライドオロジー著者' },

  // ========================================
  // プロジェクト管理・アジャイル
  // ========================================

  { author: 'ジェフ・サザーランド', quote: 'スクラムは、複雑な問題に対処するためのフレームワークだ', category_id: CATEGORIES.PROJECT, rarity: RARITIES.EPIC, context: 'スクラム共同考案者' },
  { author: 'ジェフ・サザーランド', quote: '透明性、検査、適応。これがアジャイルの3本柱だ', category_id: CATEGORIES.PROJECT, rarity: RARITIES.RARE, context: 'アジャイル開発の先駆者' },

  { author: 'ケント・ベック', quote: '動くソフトウェアこそが進捗の第一の尺度だ', category_id: CATEGORIES.SI, rarity: RARITIES.EPIC, context: 'エクストリーム・プログラミング考案者' },
  { author: 'ケント・ベック', quote: 'シンプルにしろ。必要になるまで機能を追加するな', category_id: CATEGORIES.SI, rarity: RARITIES.RARE, context: 'テスト駆動開発の提唱者' },

  { author: 'マーティン・ファウラー', quote: 'リファクタリングとは、外部の振る舞いを変えずに内部構造を改善することだ', category_id: CATEGORIES.SI, rarity: RARITIES.RARE, context: 'ThoughtWorks チーフサイエンティスト' },

  // ========================================
  // リスク管理
  // ========================================

  { author: 'ナシム・ニコラス・タレブ', quote: 'ブラックスワンは予測できない。だから反脆弱性を身につけろ', category_id: CATEGORIES.RISK, rarity: RARITIES.LEGENDARY, context: 'ブラック・スワン著者' },
  { author: 'ナシム・ニコラス・タレブ', quote: '風に逆らう木は折れるが、しなる木は生き残る', category_id: CATEGORIES.RISK, rarity: RARITIES.EPIC, context: '反脆弱性の提唱者' },
  { author: 'ナシム・ニコラス・タレブ', quote: 'スキン・イン・ザ・ゲーム：自分の言葉にリスクを負え', category_id: CATEGORIES.RISK, rarity: RARITIES.RARE, context: 'リスク哲学者' },

  // ========================================
  // 追加のコモン・レア格言
  // ========================================

  { author: 'ヘンリー・フォード', quote: '成功の秘訣は、他人の立場を理解し、自分の立場と同様に物事を見る能力だ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.COMMON, context: 'フォード・モーター創業者' },
  { author: 'ヘンリー・フォード', quote: '考えることは最も過酷な仕事だ。だから考える人が少ない', category_id: CATEGORIES.LOGIC, rarity: RARITIES.COMMON, context: '大量生産システムの確立者' },

  { author: 'ウォルト・ディズニー', quote: '夢見ることができれば、それは実現できる', category_id: CATEGORIES.STRATEGY, rarity: RARITIES.COMMON, context: 'ディズニー創業者' },
  { author: 'ウォルト・ディズニー', quote: '失敗から学ぶことを恐れるな。失敗は成功への近道だ', category_id: CATEGORIES.LEADERSHIP, rarity: RARITIES.COMMON, context: 'エンターテインメントの革命児' },

  { author: 'アルフレッド・スローン', quote: '経営とは、正しい問いを見つけることだ', category_id: CATEGORIES.CONSULTING, rarity: RARITIES.RARE, context: 'GM元CEO、近代経営の父' },

  { author: 'トム・ピーターズ', quote: 'エクセレントな企業は、人を大切にする', category_id: CATEGORIES.CONSULTING, rarity: RARITIES.RARE, context: 'エクセレント・カンパニー著者' },

  { author: 'ゲイリー・ハメル', quote: '戦略的イノベーションは、業界のルールを書き換えることだ', category_id: CATEGORIES.CONSULTING, rarity: RARITIES.RARE, context: '経営戦略の思想家' },

  { author: 'マイケル・ハマー', quote: 'リエンジニアリングとは、プロセスを白紙から再設計することだ', category_id: CATEGORIES.BPA, rarity: RARITIES.RARE, context: 'BPR(業務改革)の提唱者' },
]

async function main() {
  console.log('='.repeat(60))
  console.log(isDryRun ? '🔍 ドライラン（プレビューモード）' : '⚡ 実行モード')
  console.log('='.repeat(60))

  // 現在のカード取得（重複チェック用）
  const { data: existingCards } = await supabase
    .from('wisdom_cards')
    .select('author, quote')

  const existingQuotes = new Set(existingCards?.map(c => c.quote) || [])
  console.log(`\n既存カード数: ${existingCards?.length || 0}`)

  // 重複除外
  const newCards = wisdomCards.filter(card => !existingQuotes.has(card.quote))
  console.log(`追加対象カード数: ${newCards.length}`)

  // カテゴリー・レアリティ分布
  const catDist = {}
  const rarityDist = {}
  newCards.forEach(c => {
    catDist[c.category_id] = (catDist[c.category_id] || 0) + 1
    rarityDist[c.rarity] = (rarityDist[c.rarity] || 0) + 1
  })

  console.log('\n=== カテゴリー分布 ===')
  Object.entries(catDist).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`))

  console.log('\n=== レアリティ分布 ===')
  Object.entries(rarityDist).sort((a,b) => b[1]-a[1]).forEach(([k,v]) => console.log(`  ${k}: ${v}`))

  // サンプル表示
  console.log('\n=== サンプル（最初の5件） ===')
  newCards.slice(0, 5).forEach((c, i) => {
    console.log(`${i+1}. [${c.rarity}] ${c.quote.substring(0, 50)}...`)
    console.log(`   著者: ${c.author} | カテゴリ: ${c.category_id}`)
  })

  if (isDryRun) {
    console.log('\n' + '='.repeat(60))
    console.log('🔍 ドライランモード - 実行には --execute を使用')
    console.log('='.repeat(60))
    return
  }

  // 挿入
  console.log('\n📝 データ挿入中...')

  const insertData = newCards.map((card, index) => ({
    author: card.author,
    quote: card.quote,
    category_id: card.category_id,
    subcategory_id: null,
    rarity: card.rarity,
    context: card.context || null,
    application_area: APPLICATION_AREAS[card.category_id] || '汎用・ビジネス全般',
    is_active: true,
    display_order: (existingCards?.length || 0) + index + 1
  }))

  // バッチ挿入（50件ずつ）
  const batchSize = 50
  let insertedCount = 0

  for (let i = 0; i < insertData.length; i += batchSize) {
    const batch = insertData.slice(i, i + batchSize)
    const { error } = await supabase.from('wisdom_cards').insert(batch)

    if (error) {
      console.error(`❌ バッチ ${Math.floor(i/batchSize) + 1} エラー:`, error.message)
    } else {
      insertedCount += batch.length
      console.log(`  挿入: ${insertedCount}/${insertData.length}`)
    }
  }

  // 検証
  const { count: totalCount } = await supabase
    .from('wisdom_cards')
    .select('id', { count: 'exact', head: true })

  console.log('\n' + '='.repeat(60))
  console.log(`🎉 完了! 総カード数: ${totalCount}`)
  console.log('='.repeat(60))
}

main().catch(console.error)
