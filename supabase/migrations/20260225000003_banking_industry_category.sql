-- 銀行業界カテゴリー新設
-- 2026-02-25
-- 参考: docs/banking/銀行業界システム構想プロジェクト基礎学習ドキュメント.pdf

-- 1. banking_industry カテゴリーの新規作成
INSERT INTO categories (category_id, name, description, type, icon, color, display_order, is_active, is_visible)
VALUES (
  'banking_industry',
  '銀行業界',
  '銀行業務の全体像、勘定系システム、融資・与信、預金・決済、市場業務、バーゼル規制、銀行会計など銀行業界固有の専門知識',
  'industry',
  '🏛️',
  '#1E3A5F',
  16,
  false,
  true
)
ON CONFLICT (category_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- 2. 銀行業界のサブカテゴリー10個を作成
INSERT INTO subcategories (subcategory_id, name, description, parent_category_id, icon, display_order, is_active, is_visible)
VALUES
  ('banking_market_structure', '銀行業界構造・業態分類', '金融業界における銀行の位置づけ、都市銀行・地方銀行・信金・信託銀行・ネット銀行などの業態分類と特性', 'banking_industry', '🏛️', 1, true, true),
  ('banking_services', '銀行サービス・商品体系', '個人向け（預金・住宅ローン・投信販売）、法人向け（融資・シンジケートローン・M&A）、市場関連業務の商品体系', 'banking_industry', '💳', 2, true, true),
  ('banking_credit_lending', '融資・与信管理', '与信審査（財務分析・格付）、稟議・承認プロセス、債権管理（延滞・リスケ・不良債権）、債務者区分と自己査定', 'banking_industry', '📝', 3, true, true),
  ('banking_deposit_settlement', '預金・為替・決済', '預金管理（普通・定期・外貨）、内国為替・外国為替、全銀システム・日銀ネット・SWIFT、決済インフラ', 'banking_industry', '🔄', 4, true, true),
  ('banking_market_alm', '市場業務・ALM', '国債・社債運用、デリバティブ（金利スワップ・為替予約）、ALM（資産負債総合管理）、流動性リスク管理', 'banking_industry', '📈', 5, true, true),
  ('banking_risk_compliance', 'リスク管理・コンプライアンス', 'バーゼル規制（自己資本比率）、信用・市場・流動性・オペリスク、AML/KYC、銀行法・金商法・犯収法', 'banking_industry', '⚖️', 6, true, true),
  ('banking_it_systems', '銀行ITシステム・DX', '勘定系・情報系・市場系システム、コアバンキング、レガシー刷新、API基盤・オープンバンキング、RPA・データ基盤', 'banking_industry', '🖥️', 7, true, true),
  ('banking_accounting', '銀行会計・財務報告', 'J-GAAP・IFRS・JMIS、貸倒引当金（ECL）、金融商品会計、ヘッジ会計、時価評価、バーゼル開示（ピラー3）', 'banking_industry', '📊', 8, true, true),
  ('banking_management_strategy', '銀行経営戦略・課題', '低金利・利ざや縮小、収益多角化、ビジネスモデル転換、ESG対応、人材高度化、ガバナンス強化、業績格差要因', 'banking_industry', '🎯', 9, true, true),
  ('banking_terminology', '銀行業界用語・基礎知識', '財務指標（自己資本比率・ROE・NIM）、融資用語、決済用語、市場用語、規制用語、会計用語の体系的理解', 'banking_industry', '📖', 10, true, true)
ON CONFLICT (subcategory_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  parent_category_id = EXCLUDED.parent_category_id,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();
