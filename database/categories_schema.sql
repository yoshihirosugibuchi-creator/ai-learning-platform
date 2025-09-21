-- カテゴリー管理システム データベーススキーマ
-- 作成日: 2025-09-20
-- 目的: 静的カテゴリー定義からSupabase動的管理への移行

-- 1. カテゴリーマスターテーブル
-- メインカテゴリーと業界カテゴリーを統合管理
CREATE TABLE IF NOT EXISTS categories (
  -- 基本情報
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id VARCHAR(100) UNIQUE NOT NULL, -- 'communication_presentation', 'consulting_industry'等
  name VARCHAR(200) NOT NULL, -- 'コミュニケーション・プレゼンテーション'
  description TEXT, -- カテゴリーの詳細説明
  type VARCHAR(20) NOT NULL CHECK (type IN ('main', 'industry')), -- カテゴリータイプ
  
  -- UI表示設定
  icon VARCHAR(10), -- 絵文字アイコン '💬'
  color VARCHAR(7), -- HEXカラーコード '#3B82F6'
  display_order INTEGER NOT NULL, -- 表示順序（タイプ内での順序）
  
  -- 有効・無効制御（新機能）
  is_active BOOLEAN DEFAULT true NOT NULL, -- 機能として利用可能
  is_visible BOOLEAN DEFAULT true NOT NULL, -- 管理画面で表示
  activation_date DATE, -- 有効化予定日（任意）
  
  -- 管理情報
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id), -- 作成者（任意）
  updated_by UUID REFERENCES auth.users(id) -- 更新者（任意）
);

-- カテゴリーテーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(type);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_type_active ON categories(type, is_active);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(type, display_order);

-- カテゴリーテーブル用コメント
COMMENT ON TABLE categories IS 'カテゴリーマスター（メイン・業界統合）';
COMMENT ON COLUMN categories.category_id IS 'カテゴリーID（英語、システム用）';
COMMENT ON COLUMN categories.name IS 'カテゴリー名（日本語、表示用）';
COMMENT ON COLUMN categories.type IS 'カテゴリータイプ：main=メインカテゴリー, industry=業界カテゴリー';
COMMENT ON COLUMN categories.is_active IS '有効フラグ：true=利用可能, false=無効（Coming Soon）';
COMMENT ON COLUMN categories.is_visible IS '表示フラグ：管理画面での表示制御';
COMMENT ON COLUMN categories.activation_date IS '有効化予定日（無効カテゴリーの公開スケジュール）';

-- Row Level Security (RLS) 有効化
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- カテゴリー閲覧ポリシー（全ユーザー閲覧可能）
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

-- カテゴリー更新ポリシー（認証済みユーザーのみ、将来的には管理者のみに制限）
CREATE POLICY "Categories are updatable by authenticated users" ON categories
  FOR ALL USING (auth.role() = 'authenticated');

-- 2. サブカテゴリーマスターテーブル
-- カテゴリー内のサブカテゴリーを管理
CREATE TABLE IF NOT EXISTS subcategories (
  -- 基本情報
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subcategory_id VARCHAR(100) UNIQUE NOT NULL, -- 'financial_analysis_valuation'等
  name VARCHAR(200) NOT NULL, -- '財務分析・企業価値評価'
  description TEXT, -- サブカテゴリーの詳細説明
  parent_category_id VARCHAR(100) NOT NULL, -- 親カテゴリーのcategory_id
  
  -- UI表示設定
  icon VARCHAR(10), -- 絵文字アイコン '💰'
  display_order INTEGER NOT NULL, -- 親カテゴリー内での表示順序
  
  -- 有効・無効制御
  is_active BOOLEAN DEFAULT true NOT NULL, -- 機能として利用可能
  is_visible BOOLEAN DEFAULT true NOT NULL, -- 管理画面で表示
  activation_date DATE, -- 有効化予定日（任意）
  
  -- 管理情報
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id), -- 作成者（任意）
  updated_by UUID REFERENCES auth.users(id), -- 更新者（任意）
  
  -- 外部キー制約
  FOREIGN KEY (parent_category_id) REFERENCES categories(category_id) ON DELETE CASCADE
);

-- サブカテゴリーテーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_subcategories_parent ON subcategories(parent_category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_active ON subcategories(is_active);
CREATE INDEX IF NOT EXISTS idx_subcategories_parent_active ON subcategories(parent_category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_subcategories_display_order ON subcategories(parent_category_id, display_order);

-- サブカテゴリーテーブル用コメント
COMMENT ON TABLE subcategories IS 'サブカテゴリーマスター（カテゴリー配下の詳細分類）';
COMMENT ON COLUMN subcategories.subcategory_id IS 'サブカテゴリーID（英語、システム用）';
COMMENT ON COLUMN subcategories.name IS 'サブカテゴリー名（日本語、表示用）';
COMMENT ON COLUMN subcategories.parent_category_id IS '親カテゴリーID（categoriesテーブルのcategory_idを参照）';
COMMENT ON COLUMN subcategories.display_order IS '親カテゴリー内での表示順序';

-- Row Level Security (RLS) 有効化
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

-- サブカテゴリー閲覧ポリシー（全ユーザー閲覧可能）
CREATE POLICY "Subcategories are viewable by everyone" ON subcategories
  FOR SELECT USING (true);

-- サブカテゴリー更新ポリシー（認証済みユーザーのみ、将来的には管理者のみに制限）
CREATE POLICY "Subcategories are updatable by authenticated users" ON subcategories
  FOR ALL USING (auth.role() = 'authenticated');

-- 3. スキルレベルマスターテーブル
-- システム全体で統一されたスキルレベル定義
CREATE TABLE IF NOT EXISTS skill_levels (
  -- 基本情報
  id VARCHAR(20) PRIMARY KEY, -- 'basic', 'intermediate', 'advanced', 'expert'
  name VARCHAR(50) NOT NULL, -- '基礎', '中級', '上級', 'エキスパート'
  display_name VARCHAR(50) NOT NULL, -- 表示用名称（将来的な多言語対応）
  description TEXT, -- スキルレベルの詳細説明
  target_experience VARCHAR(100), -- 対象経験年数・役職
  
  -- UI表示設定
  display_order INTEGER NOT NULL, -- 表示順序（1=基礎, 2=中級, 3=上級, 4=エキスパート）
  color VARCHAR(7), -- HEXカラーコード（難易度表示用）
  
  -- 管理情報
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- スキルレベルテーブル用インデックス
CREATE INDEX IF NOT EXISTS idx_skill_levels_display_order ON skill_levels(display_order);

-- スキルレベルテーブル用コメント
COMMENT ON TABLE skill_levels IS 'スキルレベルマスター（システム全体で統一）';
COMMENT ON COLUMN skill_levels.id IS 'スキルレベルID（英語、システム用）';
COMMENT ON COLUMN skill_levels.name IS 'スキルレベル名（日本語、表示用）';
COMMENT ON COLUMN skill_levels.target_experience IS '対象経験年数・役職（例：新人〜入社3年目）';

-- Row Level Security (RLS) 有効化
ALTER TABLE skill_levels ENABLE ROW LEVEL SECURITY;

-- スキルレベル閲覧ポリシー（全ユーザー閲覧可能）
CREATE POLICY "Skill levels are viewable by everyone" ON skill_levels
  FOR SELECT USING (true);

-- スキルレベル更新ポリシー（認証済みユーザーのみ、将来的には管理者のみに制限）
CREATE POLICY "Skill levels are updatable by authenticated users" ON skill_levels
  FOR ALL USING (auth.role() = 'authenticated');

-- 4. トリガー関数（updated_at自動更新）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- カテゴリーテーブルのupdated_at自動更新トリガー
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- サブカテゴリーテーブルのupdated_at自動更新トリガー
CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON subcategories 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- スキルレベルテーブルのupdated_at自動更新トリガー
CREATE TRIGGER update_skill_levels_updated_at BEFORE UPDATE ON skill_levels 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. 便利なビュー（統計情報取得用）
-- カテゴリー統計ビュー
CREATE OR REPLACE VIEW category_stats AS
SELECT 
  c.category_id,
  c.name,
  c.type,
  c.is_active,
  COUNT(s.id) as subcategory_count,
  COUNT(CASE WHEN s.is_active THEN 1 END) as active_subcategory_count
FROM categories c
LEFT JOIN subcategories s ON c.category_id = s.parent_category_id
GROUP BY c.category_id, c.name, c.type, c.is_active;

-- 完了メッセージ
DO $$
BEGIN
    RAISE NOTICE 'カテゴリー管理システム データベーススキーマ作成完了';
    RAISE NOTICE '作成されたテーブル: categories, subcategories, skill_levels';
    RAISE NOTICE '作成されたビュー: category_stats';
END $$;