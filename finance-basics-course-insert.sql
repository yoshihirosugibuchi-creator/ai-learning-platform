-- 金融基礎コース完全データINSERTスクリプト
-- 実行順序：learning_courses → learning_genres → learning_themes → learning_sessions → session_contents → session_quizzes

-- 1. learning_courses テーブル
INSERT INTO learning_courses (
  id, title, description, difficulty, estimated_days, icon, color, status, badge_data, display_order
) VALUES (
  'finance_basics_course',
  'ビジネス金融基礎',
  '現場で使える金融・会計の基礎知識を5つのテーマで学習',
  'basic',
  14,
  '💰',
  '#F59E0B',
  'available',
  '{"id": "finance_basics_badge", "icon": "💰", "color": "#F59E0B", "title": "金融基礎マスター", "description": "ビジネスに必要な金融・会計の基礎知識を習得"}',
  1
);

-- 2. learning_genres テーブル
INSERT INTO learning_genres (
  id, course_id, title, description, category_id, subcategory_id, estimated_days, display_order, badge_data
) VALUES (
  'finance_basics_genre',
  'finance_basics_course',
  'ビジネス金融基礎',
  '計数管理からキャッシュフローまで、現場で使える金融知識',
  'finance',
  'management_accounting_kpi',
  14,
  1,
  '{"id": "finance_basics_genre_badge", "icon": "📊", "color": "#F59E0B", "title": "金融基礎実践者", "description": "ビジネス現場で使える金融・会計知識を実践的に活用するスキル"}'
);

-- 3. learning_themes テーブル
INSERT INTO learning_themes (id, genre_id, title, description, estimated_minutes, display_order, reward_card_data) VALUES
('number_management_basics', 'finance_basics_genre', '計数管理の基礎理解', 'ビジネスにおける数字の意味とKPIの基本概念', 60, 1,
 '{"id": "number_management_card", "icon": "📊", "color": "#F59E0B", "title": "計数管理基礎", "summary": "ビジネスにおける数字の読み方と重要業績評価指標の理解", "keyPoints": ["計数管理の基本概念とビジネスでの意味", "KPI設定と測定の基本原則", "数字を通じた経営状況の把握"]}'),

('profit_loss_statement', 'finance_basics_genre', '損益計算書(PL)の理解', '損益計算書の構造と読み方、利益分析の基本', 75, 2,
 '{"id": "pl_analysis_card", "icon": "📈", "color": "#10B981", "title": "PL分析マスター", "summary": "損益計算書を読み解き、収益性を分析する技術", "keyPoints": ["売上・費用・利益の関係性理解", "損益分岐点と収益構造分析", "実際のPLデータから経営判断につなげる手法"]}'),

('balance_sheet_understanding', 'finance_basics_genre', '貸借対照表(BS)の理解', '貸借対照表の構造と財務安全性の分析手法', 75, 3,
 '{"id": "bs_analysis_card", "icon": "⚖️", "color": "#3B82F6", "title": "BS分析エキスパート", "summary": "貸借対照表から企業の財務体質を評価する分析技術", "keyPoints": ["資産・負債・純資産の関係性", "流動比率・自己資本比率等の指標理解", "財務安全性と成長性のバランス評価"]}'),

('cash_flow_management', 'finance_basics_genre', 'キャッシュフロー', 'キャッシュフロー計算書の理解と資金繰り分析', 75, 4,
 '{"id": "cashflow_card", "icon": "💸", "color": "#8B5CF6", "title": "キャッシュフロー分析", "summary": "企業の資金の流れを把握し、財務健全性を評価する技術", "keyPoints": ["営業・投資・財務CFの3区分理解", "キャッシュフローパターン分析", "資金繰り予測と投資判断への活用"]}'),

('field_numbers_practical', 'finance_basics_genre', '現場の数字', '現場で使う重要指標と実践的な数字活用法', 80, 5,
 '{"id": "field_numbers_card", "icon": "🎯", "color": "#DC2626", "title": "現場数字活用", "summary": "現場で使う重要指標を理解し、実践的な数字管理を行う技術", "keyPoints": ["売上高・粗利率・回転率等の現場指標", "部門別管理と予実管理の実践", "数字を活用した意思決定プロセス"]}');

-- 4. learning_sessions テーブル
INSERT INTO learning_sessions (id, theme_id, title, session_type, display_order, estimated_minutes) VALUES
-- テーマ1: 計数管理の基礎理解
('number_basics_session', 'number_management_basics', '計数管理とは何か：ビジネスにおける数字の意味', 'knowledge', 1, 20),
('kpi_basics_session', 'number_management_basics', 'KPI（重要業績評価指標）の基本理解', 'knowledge', 2, 25),
('number_practice_session', 'number_management_basics', '実践演習：計数管理の基本概念確認', 'practice', 3, 15),

-- テーマ2: 損益計算書(PL)の理解
('pl_structure_session', 'profit_loss_statement', '損益計算書の構造と読み方の基本', 'knowledge', 1, 30),
('pl_analysis_session', 'profit_loss_statement', '売上・費用・利益の関係性と分析方法', 'knowledge', 2, 25),
('pl_practice_session', 'profit_loss_statement', 'PL分析演習：実際の財務諸表を読み解く', 'case_study', 3, 20),

-- テーマ3: 貸借対照表(BS)の理解
('bs_structure_session', 'balance_sheet_understanding', '貸借対照表の構造：資産・負債・純資産', 'knowledge', 1, 25),
('bs_ratios_session', 'balance_sheet_understanding', '財務安全性の分析：流動比率と自己資本比率', 'knowledge', 2, 30),
('bs_practice_session', 'balance_sheet_understanding', 'BS分析演習：企業の財務体質を評価する', 'case_study', 3, 20),

-- テーマ4: キャッシュフロー
('cf_structure_session', 'cash_flow_management', 'キャッシュフロー計算書の基本構造', 'knowledge', 1, 25),
('cf_categories_session', 'cash_flow_management', '営業・投資・財務CF：3つの区分の理解', 'knowledge', 2, 30),
('cf_practice_session', 'cash_flow_management', 'CF分析演習：企業の資金繰りを評価', 'case_study', 3, 20),

-- テーマ5: 現場の数字
('field_indicators_session', 'field_numbers_practical', '現場で使う重要指標：売上高・粗利率・回転率', 'knowledge', 1, 25),
('department_management_session', 'field_numbers_practical', '部門別管理と予実管理の基本手法', 'practice', 2, 30),
('field_practice_session', 'field_numbers_practical', '総合演習：現場数字を活用した意思決定', 'case_study', 3, 25);

-- 5. session_contents テーブル（例：最初のセッションのみ）
INSERT INTO session_contents (id, session_id, content_type, title, content, duration, display_order) VALUES
('number_basics_content_1', 'number_basics_session', 'text', '計数管理とは', '計数管理とは、ビジネスにおける重要な数字を継続的に測定・分析・管理することで、経営の意思決定を支援する活動です。「計数」とは「数えて把握する」という意味で、売上、利益、コスト、品質、時間など、事業運営に関わるあらゆる数値が対象となります。計数管理により、現状の正確な把握、問題の早期発見、改善の効果測定が可能になります。', 3, 1),

('number_basics_content_2', 'number_basics_session', 'key_points', '計数管理の重要性', '• 客観的事実に基づく意思決定の実現
• 目標と実績の差異分析による改善活動
• ステークホルダーへの説明責任の履行
• 予測精度の向上と計画策定の高度化', 2, 2),

('number_basics_content_3', 'number_basics_session', 'example', '実例：売上管理における計数管理', '【状況】月間売上目標1000万円の営業チーム
【計数管理の実践】
✓ 日次売上実績の把握（累計進捗率）
✓ 顧客別・商品別売上分析
✓ 受注確度別パイプライン管理
✓ 前年同月比での成長率分析
【結果】月後半での挽回策立案と目標達成率向上', 4, 3);

-- 6. session_quizzes テーブル（例：最初のセッションのみ）
INSERT INTO session_quizzes (id, session_id, question, options, correct_answer, explanation, quiz_type, display_order) VALUES
('number_basics_quiz_1', 'number_basics_session', '計数管理の主な目的として最も適切でないものは？', 
 '["経営の意思決定支援", "問題の早期発見", "社員の査定評価", "改善効果の測定"]', 
 2, 
 '計数管理の目的は客観的事実に基づく経営改善であり、社員の査定評価は副次的な活用であって主目的ではありません。', 
 'single_choice', 
 0);

-- 実行完了メッセージ
-- 金融基礎コースの基本構造を作成完了
-- 注意：全セッションのコンテンツとクイズは段階的に追加してください