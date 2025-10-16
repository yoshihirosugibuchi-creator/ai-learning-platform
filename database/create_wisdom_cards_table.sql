-- 格言カードマスターテーブル作成
-- 作成日: 2025年10月16日
-- 目的: 格言カードのDB化（ビジュアル要素含む）

CREATE TABLE wisdom_cards (
  id SERIAL PRIMARY KEY,
  
  -- 基本情報
  author VARCHAR(100) NOT NULL,
  quote TEXT NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  subcategory_id VARCHAR(100),
  rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('コモン', 'レア', 'エピック', 'レジェンダリー')),
  context TEXT NOT NULL,
  application_area TEXT NOT NULL,
  
  -- ビジュアル要素
  card_image_url VARCHAR(500),           -- メインカード画像
  background_image_url VARCHAR(500),     -- 背景画像
  author_portrait_url VARCHAR(500),      -- 著者肖像画
  animation_url VARCHAR(500),            -- Lottieアニメーション等
  particle_effect_config JSONB,         -- パーティクルエフェクト設定
  category_icon_url VARCHAR(500),        -- カスタムカテゴリーアイコン
  rarity_frame_url VARCHAR(500),         -- レアリティ別フレーム画像
  special_badge_url VARCHAR(500),        -- 特別バッジ（期間限定等）
  
  -- 管理用フィールド
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス作成
CREATE INDEX idx_wisdom_cards_active ON wisdom_cards(is_active);
CREATE INDEX idx_wisdom_cards_rarity ON wisdom_cards(rarity);
CREATE INDEX idx_wisdom_cards_category ON wisdom_cards(category_id);
CREATE INDEX idx_wisdom_cards_display_order ON wisdom_cards(display_order);

-- 更新時刻自動更新のトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wisdom_cards_updated_at
    BEFORE UPDATE ON wisdom_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- コメント追加
COMMENT ON TABLE wisdom_cards IS '格言カードマスターテーブル（ビジュアル要素含む）';
COMMENT ON COLUMN wisdom_cards.author IS '著者名';
COMMENT ON COLUMN wisdom_cards.quote IS '格言・名言';
COMMENT ON COLUMN wisdom_cards.category_id IS 'カテゴリーID（strategy_management等）';
COMMENT ON COLUMN wisdom_cards.subcategory_id IS 'サブカテゴリー名（経営戦略・事業戦略等）';
COMMENT ON COLUMN wisdom_cards.rarity IS 'レアリティ（コモン/レア/エピック/レジェンダリー）';
COMMENT ON COLUMN wisdom_cards.context IS '格言の背景・文脈';
COMMENT ON COLUMN wisdom_cards.application_area IS '活用分野・適用領域';
COMMENT ON COLUMN wisdom_cards.card_image_url IS 'メインカード画像URL';
COMMENT ON COLUMN wisdom_cards.background_image_url IS '背景画像URL';
COMMENT ON COLUMN wisdom_cards.author_portrait_url IS '著者肖像画URL';
COMMENT ON COLUMN wisdom_cards.animation_url IS 'Lottieアニメーション等のURL';
COMMENT ON COLUMN wisdom_cards.particle_effect_config IS 'パーティクルエフェクト設定JSON';
COMMENT ON COLUMN wisdom_cards.category_icon_url IS 'カスタムカテゴリーアイコンURL';
COMMENT ON COLUMN wisdom_cards.rarity_frame_url IS 'レアリティ別フレーム画像URL';
COMMENT ON COLUMN wisdom_cards.special_badge_url IS '特別バッジURL（期間限定・イベント用）';
COMMENT ON COLUMN wisdom_cards.is_active IS 'アクティブ状態';
COMMENT ON COLUMN wisdom_cards.display_order IS '表示順';