-- 難易度配分管理テーブル
-- 管理者が正答率別の難易度配分を設定可能にする

CREATE TABLE IF NOT EXISTS difficulty_distribution_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 正答率範囲
  accuracy_range_min INTEGER NOT NULL CHECK (accuracy_range_min >= 0 AND accuracy_range_min <= 100),
  accuracy_range_max INTEGER NOT NULL CHECK (accuracy_range_max >= 0 AND accuracy_range_max <= 100),
  
  -- 難易度別配分（パーセンテージ）
  basic_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (basic_percent >= 0.00 AND basic_percent <= 100.00),
  intermediate_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (intermediate_percent >= 0.00 AND intermediate_percent <= 100.00),
  advanced_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (advanced_percent >= 0.00 AND advanced_percent <= 100.00),
  expert_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00 CHECK (expert_percent >= 0.00 AND expert_percent <= 100.00),
  
  -- メタデータ
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  -- 制約
  CONSTRAINT check_accuracy_range CHECK (accuracy_range_min <= accuracy_range_max),
  CONSTRAINT check_percentage_sum CHECK (
    basic_percent + intermediate_percent + advanced_percent + expert_percent = 100.00
  )
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_difficulty_distribution_accuracy_range 
  ON difficulty_distribution_settings(accuracy_range_min, accuracy_range_max) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_difficulty_distribution_active 
  ON difficulty_distribution_settings(is_active, updated_at);

-- アクティブな範囲の重複を防ぐためのユニーク制約
ALTER TABLE difficulty_distribution_settings 
ADD CONSTRAINT unique_active_range 
UNIQUE (accuracy_range_min, accuracy_range_max);

-- RLS（Row Level Security）設定
ALTER TABLE difficulty_distribution_settings ENABLE ROW LEVEL SECURITY;

-- システム管理者のみ読み取り・編集可能
CREATE POLICY "System admins can view difficulty distribution settings" ON difficulty_distribution_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('system_admin')
    )
  );

CREATE POLICY "System admins can manage difficulty distribution settings" ON difficulty_distribution_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('system_admin')
    )
  );

-- デフォルトデータ投入
INSERT INTO difficulty_distribution_settings (
  accuracy_range_min, accuracy_range_max, 
  basic_percent, intermediate_percent, advanced_percent, expert_percent,
  description
) VALUES 
-- 90%以上: 上級・エキスパート中心
(90, 100, 10.00, 30.00, 40.00, 20.00, '正答率90%以上：上級・エキスパート中心'),
-- 75-89%: 中級・上級中心
(75, 89, 20.00, 40.00, 30.00, 10.00, '正答率75-89%：中級・上級中心'),
-- 60-74%: 初級・中級中心
(60, 74, 30.00, 40.00, 20.00, 10.00, '正答率60-74%：初級・中級中心'),
-- 60%未満: 初級中心
(0, 59, 50.00, 30.00, 20.00, 0.00, '正答率60%未満：初級中心')

ON CONFLICT (accuracy_range_min, accuracy_range_max)
DO UPDATE SET
  updated_at = NOW(),
  description = EXCLUDED.description;

-- テーブル作成確認
SELECT 
  accuracy_range_min,
  accuracy_range_max,
  basic_percent,
  intermediate_percent, 
  advanced_percent,
  expert_percent,
  description,
  is_active
FROM difficulty_distribution_settings 
WHERE is_active = true
ORDER BY accuracy_range_min;

-- 合計確認（全て100.00であることを確認）
SELECT 
  accuracy_range_min,
  accuracy_range_max,
  (basic_percent + intermediate_percent + advanced_percent + expert_percent) as total_percent
FROM difficulty_distribution_settings 
WHERE is_active = true;