-- ユーザーの「選ばれし課題」選択を保存するテーブル
-- 各ユーザーが自分のダッシュボードに表示するコース/クイズパック/ケーススタディを選択

CREATE TABLE IF NOT EXISTS user_challenge_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_type VARCHAR(20) NOT NULL CHECK (slot_type IN ('course', 'quiz_pack', 'case_study')),
  content_id VARCHAR(100) NOT NULL,  -- コースID / パックID / ケーススタディID
  content_name VARCHAR(200),          -- 表示名（キャッシュ用）
  selected_by VARCHAR(10) DEFAULT 'user' CHECK (selected_by IN ('user', 'ai', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 各ユーザーの各スロットタイプに1つだけ
  UNIQUE(user_id, slot_type)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_user_challenge_selections_user_id
  ON user_challenge_selections(user_id);

-- RLSポリシー
ALTER TABLE user_challenge_selections ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の選択のみ参照・更新可能
CREATE POLICY "Users can view own challenge selections"
  ON user_challenge_selections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge selections"
  ON user_challenge_selections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge selections"
  ON user_challenge_selections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own challenge selections"
  ON user_challenge_selections FOR DELETE
  USING (auth.uid() = user_id);

-- 管理者は全員の選択を参照・更新可能（将来のアサイン機能用）
CREATE POLICY "Admins can manage all challenge selections"
  ON user_challenge_selections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'system_admin')
    )
  );

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_user_challenge_selections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_challenge_selections_updated_at
  BEFORE UPDATE ON user_challenge_selections
  FOR EACH ROW
  EXECUTE FUNCTION update_user_challenge_selections_updated_at();

-- コメント
COMMENT ON TABLE user_challenge_selections IS 'ユーザーのダッシュボード「選ばれし課題」の選択';
COMMENT ON COLUMN user_challenge_selections.slot_type IS 'スロットタイプ: course, quiz_pack, case_study';
COMMENT ON COLUMN user_challenge_selections.content_id IS '選択されたコンテンツのID';
COMMENT ON COLUMN user_challenge_selections.selected_by IS '選択者: user(本人), ai(AI推奨), admin(管理者アサイン)';
