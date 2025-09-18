-- 重複統合後の安全なカテゴリー変換

-- まず残っている日本語カテゴリー名を確認
SELECT DISTINCT category_id 
FROM category_progress 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
AND category_id NOT IN ('general', 'strategy_management', 'negotiation_persuasion', 'case_interview_structured_thinking', 'branding_positioning', 'customer_analysis_segmentation')
ORDER BY category_id;

-- 残りのカテゴリーを1つずつ安全に変換
-- 財務関連
UPDATE category_progress 
SET category_id = 'financial_analysis_valuation'
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13' 
AND category_id = '財務分析・企業価値評価';

UPDATE category_progress 
SET category_id = 'investment_risk_management'
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13' 
AND category_id = '投資判断・リスク管理';

UPDATE category_progress 
SET category_id = 'business_planning_funding'
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13' 
AND category_id = '事業計画・資金調達';

UPDATE category_progress 
SET category_id = 'management_accounting_kpi'
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13' 
AND category_id = '管理会計・KPI設計';

-- その他のサブカテゴリー
UPDATE category_progress 
SET category_id = 'supply_chain_management'
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13' 
AND category_id = 'サプライチェーン管理';

UPDATE category_progress 
SET category_id = 'compliance_internal_control'
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13' 
AND category_id = 'コンプライアンス・内部統制';

-- 最終結果確認
SELECT 
    category_id,
    total_xp,
    current_level,
    correct_answers,
    total_answers
FROM category_progress 
WHERE user_id = '82413077-a06d-4d9c-82bb-6fdb6a6b8e13'
ORDER BY total_xp DESC;