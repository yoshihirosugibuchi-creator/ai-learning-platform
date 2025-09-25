-- 統合XP/Level/SKP設定管理テーブル作成
-- 作成日: 2024年
-- 目的: XP計算、レベル閾値、SKP設定を一元管理し、管理画面から動的に変更可能にする

CREATE TABLE IF NOT EXISTS xp_level_skp_settings (
  id SERIAL PRIMARY KEY,
  setting_category VARCHAR(20) NOT NULL,  -- 'xp_quiz', 'xp_course', 'xp_bonus', 'level', 'skp'
  setting_key VARCHAR(50) NOT NULL,       -- 'basic', 'intermediate', 'overall_threshold', etc.
  setting_value INTEGER NOT NULL,         -- 設定値（整数）
  setting_description TEXT,               -- 設定の説明
  is_active BOOLEAN DEFAULT true,         -- 有効/無効フラグ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(setting_category, setting_key)   -- カテゴリ+キーの組み合わせは一意
);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_xp_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_xp_level_skp_settings_updated_at
  BEFORE UPDATE ON xp_level_skp_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_xp_settings_updated_at();

-- 初期データ投入
INSERT INTO xp_level_skp_settings (setting_category, setting_key, setting_value, setting_description) VALUES
-- === クイズXP設定（難易度別固定値） ===
('xp_quiz', 'basic', 10, 'クイズ基礎難易度XP'),
('xp_quiz', 'intermediate', 20, 'クイズ中級難易度XP'),
('xp_quiz', 'advanced', 30, 'クイズ上級難易度XP'),
('xp_quiz', 'expert', 50, 'クイズエキスパート難易度XP'),

-- === コース学習XP設定（難易度別固定値） ===
('xp_course', 'basic', 15, 'コース学習基礎難易度XP'),
('xp_course', 'intermediate', 25, 'コース学習中級難易度XP'),
('xp_course', 'advanced', 35, 'コース学習上級難易度XP'),
('xp_course', 'expert', 55, 'コース学習エキスパート難易度XP'),

-- === ボーナスXP設定 ===
('xp_bonus', 'quiz_accuracy_80', 20, 'クイズ80%以上正解ボーナスXP'),
('xp_bonus', 'quiz_accuracy_100', 30, 'クイズ100%正解ボーナスXP'),
('xp_bonus', 'course_completion', 50, 'コース完了ボーナスXP'),

-- === レベル閾値設定 ===
('level', 'overall_threshold', 1000, '総合レベルアップ閾値XP'),
('level', 'main_category_threshold', 500, 'メインカテゴリーレベルアップ閾値XP'),
('level', 'industry_category_threshold', 1000, '業界カテゴリーレベルアップ閾値XP'),
('level', 'industry_subcategory_threshold', 500, '業界サブカテゴリーレベルアップ閾値XP'),

-- === SKP設定 ===
('skp', 'quiz_correct', 10, 'クイズ正解1問SKP'),
('skp', 'quiz_incorrect', 2, 'クイズ不正解1問SKP'),
('skp', 'quiz_perfect_bonus', 50, 'クイズ全問正解ボーナスSKP'),
('skp', 'course_correct', 10, 'コース学習正解1問SKP'),
('skp', 'course_incorrect', 2, 'コース学習不正解1問SKP'),
('skp', 'course_complete_bonus', 50, 'コース完了ボーナスSKP'),
('skp', 'daily_streak_bonus', 10, '毎日継続ボーナスSKP'),
('skp', 'ten_day_streak_bonus', 100, '10日連続ボーナスSKP')

ON CONFLICT (setting_category, setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  setting_description = EXCLUDED.setting_description,
  updated_at = NOW();

-- インデックス作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_xp_level_skp_settings_category ON xp_level_skp_settings(setting_category);
CREATE INDEX IF NOT EXISTS idx_xp_level_skp_settings_active ON xp_level_skp_settings(is_active);

-- コメント追加
COMMENT ON TABLE xp_level_skp_settings IS '統合XP/Level/SKP設定管理テーブル - 全ての報酬・レベル設定を一元管理';
COMMENT ON COLUMN xp_level_skp_settings.setting_category IS '設定カテゴリ: xp_quiz, xp_course, xp_bonus, level, skp';
COMMENT ON COLUMN xp_level_skp_settings.setting_key IS '設定キー: basic, intermediate, advanced, expert, overall_threshold等';
COMMENT ON COLUMN xp_level_skp_settings.setting_value IS '設定値（整数のみ）';
COMMENT ON COLUMN xp_level_skp_settings.is_active IS '設定の有効/無効フラグ';