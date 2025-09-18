-- 既存のcategory_progressデータを日本語名から英数字IDに変換

-- 1. 現在の日本語サブカテゴリー名を英数字IDに更新
UPDATE category_progress 
SET category_id = 'case_interview_structured_thinking'
WHERE category_id = 'ケース面接・構造化思考';

UPDATE category_progress 
SET category_id = 'branding_positioning'
WHERE category_id = 'ブランディング・ポジショニング';

UPDATE category_progress 
SET category_id = 'customer_analysis_segmentation'
WHERE category_id = '顧客分析・セグメンテーション';

-- 2. 他の可能性のある日本語サブカテゴリー名も変換
UPDATE category_progress 
SET category_id = 'financial_analysis_valuation'
WHERE category_id = '財務分析・企業価値評価';

UPDATE category_progress 
SET category_id = 'investment_risk_management'
WHERE category_id = '投資判断・リスク管理';

UPDATE category_progress 
SET category_id = 'business_planning_funding'
WHERE category_id = '事業計画・資金調達';

UPDATE category_progress 
SET category_id = 'management_accounting_kpi'
WHERE category_id = '管理会計・KPI設計';

UPDATE category_progress 
SET category_id = 'negotiation_persuasion'
WHERE category_id = '交渉・説得技術';

UPDATE category_progress 
SET category_id = 'supply_chain_management'
WHERE category_id = 'サプライチェーン管理';

UPDATE category_progress 
SET category_id = 'compliance_internal_control'
WHERE category_id = 'コンプライアンス・内部統制';

-- 追加のサブカテゴリー変換
UPDATE category_progress 
SET category_id = 'competitive_strategy_frameworks'
WHERE category_id = '競争戦略・フレームワーク';

UPDATE category_progress 
SET category_id = 'business_strategy_management'
WHERE category_id = '経営戦略・事業戦略';

UPDATE category_progress 
SET category_id = 'document_visualization_skills'
WHERE category_id = '資料作成・可視化技術';

UPDATE category_progress 
SET category_id = 'team_management_motivation'
WHERE category_id = 'チームマネジメント・モチベーション';

UPDATE category_progress 
SET category_id = 'project_design_wbs'
WHERE category_id = 'プロジェクト設計・WBS';

UPDATE category_progress 
SET category_id = 'meeting_facilitation_management'
WHERE category_id = '会議運営・ファシリテーション';

UPDATE category_progress 
SET category_id = 'corporate_risk_management'
WHERE category_id = '企業リスク管理';

UPDATE category_progress 
SET category_id = 'quantitative_analysis_statistics'
WHERE category_id = '定量分析・統計解析';

UPDATE category_progress 
SET category_id = 'organizational_development_leadership'
WHERE category_id = '組織開発・変革リーダーシップ';

UPDATE category_progress 
SET category_id = 'conclusion_first_structured_thinking'
WHERE category_id = '結論ファースト・構造化思考';

UPDATE category_progress 
SET category_id = 'structured_thinking_mece_logic'
WHERE category_id = '構造化思考（MECE・ロジックツリー）';

UPDATE category_progress 
SET category_id = 'hypothesis_validation_essence'
WHERE category_id = '仮説検証・本質追求';

UPDATE category_progress 
SET category_id = 'behavioral_economics_decision_theory'
WHERE category_id = '行動経済学・意思決定理論';

UPDATE category_progress 
SET category_id = 'new_business_development_innovation'
WHERE category_id = '新事業開発・イノベーション';

UPDATE category_progress 
SET category_id = 'esg_sustainability_management'
WHERE category_id = 'ESG・サステナビリティ経営';

UPDATE category_progress 
SET category_id = 'digital_marketing'
WHERE category_id = 'デジタルマーケティング';

UPDATE category_progress 
SET category_id = 'sales_strategy_crm'
WHERE category_id = '営業戦略・CRM';

UPDATE category_progress 
SET category_id = 'talent_management_development'
WHERE category_id = 'タレントマネジメント・育成';

UPDATE category_progress 
SET category_id = 'hr_strategy_work_reform'
WHERE category_id = '人事戦略・働き方改革';

UPDATE category_progress 
SET category_id = 'ai_basics_business_application'
WHERE category_id = 'AI基礎・業務活用';

UPDATE category_progress 
SET category_id = 'dx_strategy_digital_transformation'
WHERE category_id = 'DX戦略・デジタル変革';

UPDATE category_progress 
SET category_id = 'data_driven_management'
WHERE category_id = 'データドリブン経営';

UPDATE category_progress 
SET category_id = 'iot_automation_technology'
WHERE category_id = 'IoT・自動化技術';

-- 3. 変換結果を確認
SELECT 
    category_id,
    total_xp,
    current_level,
    correct_answers,
    total_answers,
    updated_at
FROM category_progress 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
ORDER BY updated_at DESC;