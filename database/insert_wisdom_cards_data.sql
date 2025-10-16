-- 既存格言カード12枚のデータ移行
-- 作成日: 2025年10月16日
-- 目的: lib/cards.tsから既存データをDBに移行（基本ビジュアル要素含む）

INSERT INTO wisdom_cards (
  id, author, quote, category_id, subcategory_id, rarity, context, application_area,
  card_image_url, background_image_url, author_portrait_url, rarity_frame_url, display_order
) VALUES

-- 1. ピーター・ドラッカー（レア）
(1, 'ピーター・ドラッカー', 
 '効果的であることと効率的であることは別物である', 
 'strategy_management', '経営戦略・事業戦略', 'レア', 
 '現代経営学の父が説いた本質的な教え', '戦略思考・優先順位設定',
 '/images/wisdom-cards/backgrounds/rare/strategy-bg.jpg',
 '/images/wisdom-cards/backgrounds/rare/strategy-bg.jpg',
 '/images/wisdom-cards/portraits/drucker.jpg',
 '/images/wisdom-cards/frames/rare-frame.png', 1),

-- 2. スティーブ・ジョブズ（エピック）
(2, 'スティーブ・ジョブズ', 
 '顧客が何を望んでいるかを知るのは顧客の仕事ではない', 
 'strategy_management', '新事業開発・イノベーション', 'エピック', 
 'iPhone開発時の革新的思考を表した言葉', 'プロダクト開発・市場創造',
 '/images/wisdom-cards/backgrounds/epic/innovation-bg.jpg',
 '/images/wisdom-cards/backgrounds/epic/innovation-bg.jpg',
 '/images/wisdom-cards/portraits/jobs.jpg',
 '/images/wisdom-cards/frames/epic-frame.png', 2),

-- 3. ウォーレン・バフェット（レア）
(3, 'ウォーレン・バフェット', 
 'リスクは自分が何をやっているかよくわからない時に起こる', 
 'finance', '財務分析・企業価値評価', 'レア', 
 'オマハの賢人による投資哲学の核心', 'リスク分析・意思決定',
 '/images/wisdom-cards/backgrounds/rare/finance-bg.jpg',
 '/images/wisdom-cards/backgrounds/rare/finance-bg.jpg',
 '/images/wisdom-cards/portraits/buffett.jpg',
 '/images/wisdom-cards/frames/rare-frame.png', 3),

-- 4. ジャック・ウェルチ（エピック）
(4, 'ジャック・ウェルチ', 
 '変化に対応できない者は取り残される', 
 'leadership_hr', '組織開発・変革リーダーシップ', 'エピック', 
 'GE社の大変革を指導した経験から', '組織変革・適応力',
 '/images/wisdom-cards/backgrounds/epic/leadership-bg.jpg',
 '/images/wisdom-cards/backgrounds/epic/leadership-bg.jpg',
 '/images/wisdom-cards/portraits/welch.jpg',
 '/images/wisdom-cards/frames/epic-frame.png', 4),

-- 5. マイケル・ポーター（レジェンダリー）
(5, 'マイケル・ポーター', 
 '競争優位は差別化から生まれる', 
 'strategy_management', '競争戦略・フレームワーク', 'レジェンダリー', 
 '競争戦略論の第一人者による核心的洞察', '戦略立案・競争分析',
 '/images/wisdom-cards/backgrounds/legendary/strategy-supreme.jpg',
 '/images/wisdom-cards/backgrounds/legendary/strategy-supreme.jpg',
 '/images/wisdom-cards/portraits/porter.jpg',
 '/images/wisdom-cards/frames/legendary-frame.png', 5),

-- 6. 豊田佐吉（コモン）
(6, '豊田佐吉', 
 '改善に終わりはない', 
 'business_process_analysis', 'プロセス設計・最適化', 'コモン', 
 'トヨタ生産システムの根幹思想', '継続改善・品質向上',
 '/images/wisdom-cards/backgrounds/common/process-bg.jpg',
 '/images/wisdom-cards/backgrounds/common/process-bg.jpg',
 '/images/wisdom-cards/portraits/toyota-sakichi.jpg',
 '/images/wisdom-cards/frames/common-frame.png', 6),

-- 7. イーロン・マスク（エピック）
(7, 'イーロン・マスク', 
 '失敗はオプションであり、挑戦しないことはそうではない', 
 'strategy_management', '新事業開発・イノベーション', 'エピック', 
 'TeslaとSpaceXで革新を起こした起業家の哲学', 'リスクテイキング・起業家精神',
 '/images/wisdom-cards/backgrounds/epic/innovation-future.jpg',
 '/images/wisdom-cards/backgrounds/epic/innovation-future.jpg',
 '/images/wisdom-cards/portraits/musk.jpg',
 '/images/wisdom-cards/frames/epic-frame.png', 7),

-- 8. シェリル・サンドバーグ（レア）
(8, 'シェリル・サンドバーグ', 
 'テーブルに着けないなら、自分でテーブルを作れ', 
 'leadership_hr', 'チームマネジメント・モチベーション', 'レア', 
 'Facebook COOとして女性のキャリアを切り開いたメッセージ', 'キャリア開発・機会創造',
 '/images/wisdom-cards/backgrounds/rare/leadership-empowerment.jpg',
 '/images/wisdom-cards/backgrounds/rare/leadership-empowerment.jpg',
 '/images/wisdom-cards/portraits/sandberg.jpg',
 '/images/wisdom-cards/frames/rare-frame.png', 8),

-- 9. 稲盛和夫（レジェンダリー）
(9, '稲盛和夫', 
 '心を高める、経営を伸ばす', 
 'leadership_hr', '組織開発・変革リーダーシップ', 'レジェンダリー', 
 '京セラ創業者が掲げた人間性と事業成長の関係性', 'リーダーシップ・人格形成',
 '/images/wisdom-cards/backgrounds/legendary/philosophy-zen.jpg',
 '/images/wisdom-cards/backgrounds/legendary/philosophy-zen.jpg',
 '/images/wisdom-cards/portraits/inamori.jpg',
 '/images/wisdom-cards/frames/legendary-frame.png', 9),

-- 10. フィル・ナイト（エピック）
(10, 'フィル・ナイト', 
 'ブランドとは顧客が企業について語る物語である', 
 'marketing_sales', 'ブランディング・ポジショニング', 'エピック', 
 'Nike創業者のブランド構築に対する本質的洞察', 'ブランド戦略・顧客体験',
 '/images/wisdom-cards/backgrounds/epic/branding-story.jpg',
 '/images/wisdom-cards/backgrounds/epic/branding-story.jpg',
 '/images/wisdom-cards/portraits/knight.jpg',
 '/images/wisdom-cards/frames/epic-frame.png', 10),

-- 11. レイ・ダリオ（レア）
(11, 'レイ・ダリオ', 
 '原則を持つことで、何をすべきかが明確になる', 
 'logical_thinking_problem_solving', '構造化思考（MECE・ロジックツリー）', 'レア', 
 '世界最大のヘッジファンド創設者の意思決定哲学', '投資判断・戦略立案',
 '/images/wisdom-cards/backgrounds/rare/analysis-principles.jpg',
 '/images/wisdom-cards/backgrounds/rare/analysis-principles.jpg',
 '/images/wisdom-cards/portraits/dalio.jpg',
 '/images/wisdom-cards/frames/rare-frame.png', 11),

-- 12. 孫正義（エピック）
(12, '孫正義', 
 '登りたい山を決める、これで人生の半分が決まる', 
 'strategy_management', '経営戦略・事業戦略', 'エピック', 
 'ソフトバンク創業者のビジョン経営論', '目標設定・戦略立案',
 '/images/wisdom-cards/backgrounds/epic/vision-mountain.jpg',
 '/images/wisdom-cards/backgrounds/epic/vision-mountain.jpg',
 '/images/wisdom-cards/portraits/son-masayoshi.jpg',
 '/images/wisdom-cards/frames/epic-frame.png', 12);

-- シーケンス調整（次に追加されるカードのIDが13からになるように）
SELECT setval('wisdom_cards_id_seq', 12, true);

-- 挿入確認用クエリ
SELECT 
  id, 
  author, 
  rarity, 
  category_id,
  CASE WHEN card_image_url IS NOT NULL THEN 'あり' ELSE 'なし' END as ビジュアル設定,
  is_active 
FROM wisdom_cards 
ORDER BY display_order;