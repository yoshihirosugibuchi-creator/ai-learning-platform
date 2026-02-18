-- 生命保険業界カテゴリー新設 & 金融・保険業界のリネーム
-- 2026-02-18

-- 1. financial_services_industry のリネーム（金融・保険業界 → 金融業界）
UPDATE categories
SET name = '金融業界',
    description = '銀行、証券、フィンテック企業特有の知識とスキル',
    updated_at = NOW()
WHERE category_id = 'financial_services_industry';

-- 2. insurance_underwriting サブカテゴリーの削除
-- 先に参照テーブル（industry_level_targets等）のデータを削除
DELETE FROM industry_level_targets
WHERE subcategory_id = 'insurance_underwriting';

DELETE FROM subcategories
WHERE subcategory_id = 'insurance_underwriting';

-- 3. life_insurance_industry カテゴリーの新規作成
INSERT INTO categories (category_id, name, description, type, icon, color, display_order, is_active, is_visible)
VALUES (
  'life_insurance_industry',
  '生命保険業界',
  '生命保険会社の商品体系、業務プロセス、資産運用、法規制など業界固有の専門知識',
  'industry',
  '🛡️',
  '#0D9488',
  15,
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

-- 4. 生命保険業界のサブカテゴリー8個を作成
INSERT INTO subcategories (subcategory_id, name, description, parent_category_id, icon, display_order, is_active, is_visible)
VALUES
  ('life_insurance_market', '生保市場・業界構造', '生命保険業界の市場規模、プレイヤー分類、販売チャネル構造、業界再編の歴史', 'life_insurance_industry', '📊', 1, true, true),
  ('insurance_products_model', '保険商品体系・ビジネスモデル', '保険商品分類、主契約・特約、保険料の仕組み（三利源）、アクチュアリー、再保険', 'life_insurance_industry', '📦', 2, true, true),
  ('insurance_business_process', '保険業務プロセス', '商品開発、募集・販売、新契約引受（アンダーライティング）、契約管理（保全）、保険金・給付金支払、代理店管理', 'life_insurance_industry', '🔄', 3, true, true),
  ('insurance_asset_management', '保険資産運用・ALM', '一般勘定・特別勘定、資産ポートフォリオ、ALM、ソルベンシー規制（ESR）、IFRS17、運用戦略', 'life_insurance_industry', '💹', 4, true, true),
  ('insurance_information_systems', '保険情報システム', '基幹系（新契約・契約管理・数理）、営業支援、情報系・分析基盤、レガシーモダナイゼーション', 'life_insurance_industry', '🖥️', 5, true, true),
  ('insurance_dx_insurtech', '保険DX・インシュアテック', 'デジタル化戦略、AI-OCR・チャットボット、インシュアテック連携、組込型保険、AI引受査定・支払査定', 'life_insurance_industry', '🤖', 6, true, true),
  ('insurance_regulation', '保険法規制・コンプライアンス', '保険業法、募集規制、契約者保護制度、個人情報・機微情報、AML/CFT、金融庁モニタリング', 'life_insurance_industry', '⚖️', 7, true, true),
  ('insurance_management_strategy', '保険経営戦略・課題', '少子高齢化対応、海外事業展開、非保険領域、人材・組織変革、サステナビリティ、経営指標分析', 'life_insurance_industry', '🎯', 8, true, true)
ON CONFLICT (subcategory_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  parent_category_id = EXCLUDED.parent_category_id,
  icon = EXCLUDED.icon,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();
