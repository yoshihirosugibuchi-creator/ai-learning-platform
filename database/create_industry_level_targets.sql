-- 業界レベル別目標XPテーブル作成
CREATE TABLE IF NOT EXISTS industry_level_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  industry_category_id VARCHAR NOT NULL,     -- categories.category_id (industry type)
  subcategory_id VARCHAR NOT NULL,           -- subcategories.subcategory_id
  level VARCHAR NOT NULL,                    -- 'basic','intermediate','advanced','expert'
  target_xp INTEGER NOT NULL DEFAULT 0,     -- 目標XP値
  importance_weight DECIMAL(3,2) DEFAULT 1.0, -- 重要度（レーダーチャート選択用）
  display_in_radar BOOLEAN DEFAULT false,   -- レーダーチャート表示フラグ（最大10個）
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- インデックス・制約
  UNIQUE(industry_category_id, subcategory_id, level),
  FOREIGN KEY (industry_category_id) REFERENCES categories(category_id),
  FOREIGN KEY (subcategory_id) REFERENCES subcategories(subcategory_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_industry_level_targets_industry 
ON industry_level_targets(industry_category_id);

CREATE INDEX IF NOT EXISTS idx_industry_level_targets_level 
ON industry_level_targets(level);

CREATE INDEX IF NOT EXISTS idx_industry_level_targets_radar 
ON industry_level_targets(industry_category_id, display_in_radar) 
WHERE display_in_radar = true;

-- 初期データ投入用関数
CREATE OR REPLACE FUNCTION insert_initial_industry_targets()
RETURNS void AS $$
DECLARE
  industry RECORD;
  subcategory RECORD;
  levels TEXT[] := ARRAY['basic', 'intermediate', 'advanced', 'expert'];
  level_multipliers INTEGER[] := ARRAY[100, 300, 500, 800]; -- 基準XP値
  level_name TEXT;
  multiplier INTEGER;
  i INTEGER;
BEGIN
  -- 業界カテゴリーを取得
  FOR industry IN 
    SELECT category_id, name 
    FROM categories 
    WHERE type = 'industry' AND is_visible = true
  LOOP
    
    -- 各業界のサブカテゴリーを取得
    FOR subcategory IN
      SELECT s.subcategory_id, s.name,
             -- 重要度による基準XP調整（仮の重要度設定）
             CASE 
               WHEN s.name LIKE '%基礎%' OR s.name LIKE '%入門%' THEN 0.8
               WHEN s.name LIKE '%応用%' OR s.name LIKE '%実践%' THEN 1.2
               WHEN s.name LIKE '%マネジメント%' OR s.name LIKE '%戦略%' THEN 1.5
               ELSE 1.0
             END as importance_factor
      FROM subcategories s
      WHERE s.parent_category_id = industry.category_id
    LOOP
      
      -- 各レベルに対してデータ投入
      FOR i IN 1..array_length(levels, 1) LOOP
        level_name := levels[i];
        multiplier := level_multipliers[i];
        
        INSERT INTO industry_level_targets (
          industry_category_id,
          subcategory_id,
          level,
          target_xp,
          importance_weight,
          display_in_radar
        ) VALUES (
          industry.category_id,
          subcategory.subcategory_id,
          level_name,
          ROUND(multiplier * subcategory.importance_factor),
          subcategory.importance_factor,
          -- 重要度の高いもの上位10個をレーダーチャート表示対象に設定
          -- （後で管理者が調整可能）
          subcategory.importance_factor >= 1.0 AND 
          (SELECT COUNT(*) FROM industry_level_targets ilt 
           WHERE ilt.industry_category_id = industry.category_id 
           AND ilt.display_in_radar = true) < 10
        )
        ON CONFLICT (industry_category_id, subcategory_id, level) 
        DO NOTHING;
        
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE '業界レベル別目標XP初期データの投入が完了しました';
END;
$$ LANGUAGE plpgsql;

-- 初期データ投入実行
SELECT insert_initial_industry_targets();

-- 確認用クエリ
SELECT 
  c.name as industry_name,
  s.name as subcategory_name,
  ilt.level,
  ilt.target_xp,
  ilt.importance_weight,
  ilt.display_in_radar
FROM industry_level_targets ilt
JOIN categories c ON ilt.industry_category_id = c.category_id
JOIN subcategories s ON ilt.subcategory_id = s.subcategory_id
ORDER BY c.name, ilt.importance_weight DESC, s.name, 
  CASE ilt.level 
    WHEN 'basic' THEN 1 
    WHEN 'intermediate' THEN 2 
    WHEN 'advanced' THEN 3 
    WHEN 'expert' THEN 4 
  END;