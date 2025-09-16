-- 学習アプリ カテゴリー管理システム データベーススキーマ

-- カテゴリーマスタテーブル
CREATE TABLE categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  type ENUM('main', 'industry', 'subcategory') NOT NULL,
  parent_id VARCHAR(50),
  display_order INT NOT NULL DEFAULT 0,
  icon VARCHAR(10),
  color VARCHAR(7), -- HEXカラーコード
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_type (type),
  INDEX idx_parent_id (parent_id),
  INDEX idx_display_order (display_order)
);

-- スキルレベルマスタテーブル
CREATE TABLE skill_levels (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(20) NOT NULL,
  description TEXT,
  target_experience VARCHAR(100),
  display_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_display_order (display_order)
);

-- コンテンツカテゴリー関連テーブル
CREATE TABLE content_categories (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  content_id INT NOT NULL,
  content_type ENUM('quiz', 'card', 'lesson') NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  skill_level_id VARCHAR(20) NOT NULL,
  weight INT DEFAULT 1, -- 重要度 1-5
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_level_id) REFERENCES skill_levels(id),
  UNIQUE KEY unique_content_category (content_id, content_type, category_id),
  INDEX idx_content (content_id, content_type),
  INDEX idx_category (category_id),
  INDEX idx_skill_level (skill_level_id)
);

-- 学習パステーブル
CREATE TABLE learning_paths (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category_id VARCHAR(50) NOT NULL,
  skill_level_id VARCHAR(20) NOT NULL,
  prerequisites JSON, -- 前提学習パスID配列
  estimated_hours DECIMAL(4,2) DEFAULT 0.00,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (skill_level_id) REFERENCES skill_levels(id),
  INDEX idx_category_skill (category_id, skill_level_id)
);

-- 学習パスコンテンツテーブル
CREATE TABLE learning_path_contents (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  learning_path_id VARCHAR(50) NOT NULL,
  content_id INT NOT NULL,
  content_type ENUM('quiz', 'card', 'lesson') NOT NULL,
  display_order INT NOT NULL,
  is_required BOOLEAN DEFAULT TRUE,
  estimated_minutes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (learning_path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
  INDEX idx_learning_path (learning_path_id),
  INDEX idx_content (content_id, content_type),
  UNIQUE KEY unique_path_content (learning_path_id, content_id, content_type)
);

-- カテゴリー統計テーブル（定期的に更新）
CREATE TABLE category_stats (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  category_id VARCHAR(50) NOT NULL,
  skill_level_id VARCHAR(20),
  total_contents INT DEFAULT 0,
  total_quizzes INT DEFAULT 0,
  total_cards INT DEFAULT 0,  
  total_lessons INT DEFAULT 0,
  avg_completion_rate DECIMAL(5,2) DEFAULT 0.00,
  avg_score DECIMAL(5,2) DEFAULT 0.00,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  FOREIGN KEY (skill_level_id) REFERENCES skill_levels(id),
  UNIQUE KEY unique_category_level (category_id, skill_level_id),
  INDEX idx_category (category_id)
);

-- ユーザー学習進捗テーブル
CREATE TABLE user_learning_progress (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  category_id VARCHAR(50) NOT NULL, 
  skill_level_id VARCHAR(20) NOT NULL,
  completion_rate DECIMAL(5,2) DEFAULT 0.00,
  average_score DECIMAL(5,2) DEFAULT 0.00,
  total_quizzes INT DEFAULT 0,
  total_cards INT DEFAULT 0,
  total_lessons INT DEFAULT 0,
  total_learning_minutes INT DEFAULT 0,
  last_access_date TIMESTAMP,
  achievements JSON, -- 達成バッジID配列
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (category_id) REFERENCES categories(id),
  FOREIGN KEY (skill_level_id) REFERENCES skill_levels(id),
  UNIQUE KEY unique_user_category_level (user_id, category_id, skill_level_id),
  INDEX idx_user (user_id),
  INDEX idx_category (category_id),
  INDEX idx_last_access (last_access_date)
);

-- 初期データ投入

-- スキルレベルマスタ
INSERT INTO skill_levels (id, name, description, target_experience, display_order) VALUES
('basic', '基礎', '基本概念の理解、基礎スキルの習得', '新人〜入社3年目', 1),
('intermediate', '中級', '応用スキル、複合的思考、実践的課題解決', '入社3-7年目、チームリーダー', 2),
('advanced', '上級', '戦略的思考、組織への影響、高度な専門性', 'マネージャー、専門家', 3),
('expert', 'エキスパート', '業界リーダーシップ、イノベーション創出', 'シニアマネージャー、業界専門家', 4);

-- メインカテゴリー
INSERT INTO categories (id, name, description, type, parent_id, display_order, icon, color) VALUES
('communication_presentation', 'コミュニケーション・プレゼン', '効果的な情報伝達と説得技術', 'main', NULL, 1, '💬', '#3B82F6'),
('logical_thinking_problem_solving', '論理的思考・問題解決', '体系的な思考法と分析技術', 'main', NULL, 2, '🧠', '#8B5CF6'),
('strategy_management', '戦略・経営', '企業戦略と経営の基礎知識', 'main', NULL, 3, '🎯', '#10B981'),
('finance', '財務・ファイナンス', '財務分析と資金管理の知識', 'main', NULL, 4, '💰', '#F59E0B'),
('marketing_sales', 'マーケティング・営業', '顧客価値創造と市場戦略', 'main', NULL, 5, '📈', '#EF4444'),
('leadership_hr', 'リーダーシップ・人事', '人材マネジメントと組織運営', 'main', NULL, 6, '👥', '#06B6D4'),
('ai_digital_utilization', 'AI・デジタル活用', 'AI時代のデジタル技術活用', 'main', NULL, 7, '🤖', '#8B5CF6'),
('project_operations', 'プロジェクト・業務管理', 'プロジェクト運営と業務効率化', 'main', NULL, 8, '📋', '#84CC16'),
('business_process_analysis', 'ビジネスプロセス・業務分析', '業務の理解と改善設計', 'main', NULL, 9, '🔄', '#F97316'),
('risk_crisis_management', 'リスク・危機管理', 'リスクの予防と危機対応', 'main', NULL, 10, '🛡️', '#DC2626');

-- 業界別カテゴリー  
INSERT INTO categories (id, name, description, type, parent_id, display_order, icon, color) VALUES
('consulting', 'コンサルティング業界', 'コンサルタント特化スキル', 'industry', NULL, 1, '🎓', '#6366F1'),
('it_si', 'IT・SI業界', 'ITシステム開発・運用特化', 'industry', NULL, 2, '💻', '#0EA5E9'),
('manufacturing', '製造業', '製造業界特有の知識・スキル', 'industry', NULL, 3, '🏭', '#059669'),
('financial', '金融業界', '金融業界特化スキル', 'industry', NULL, 4, '🏦', '#F59E0B'),
('healthcare', 'ヘルスケア', 'ヘルスケア業界特化スキル', 'industry', NULL, 5, '🏥', '#EF4444');

-- サンプルサブカテゴリー（論理的思考・問題解決）
INSERT INTO categories (id, name, description, type, parent_id, display_order) VALUES
('structured_thinking', '構造化思考（MECE・ロジックツリー）', NULL, 'subcategory', 'logical_thinking_problem_solving', 1),
('hypothesis_verification', '仮説検証・本質追求', NULL, 'subcategory', 'logical_thinking_problem_solving', 2),
('quantitative_analysis', '定量分析・統計解析', NULL, 'subcategory', 'logical_thinking_problem_solving', 3),
('behavioral_economics', '行動経済学・意思決定理論', NULL, 'subcategory', 'logical_thinking_problem_solving', 4),
('benchmarking_analysis', 'ベンチマーキング・競合分析', NULL, 'subcategory', 'logical_thinking_problem_solving', 5);