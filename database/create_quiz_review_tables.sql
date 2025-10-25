-- ======================================================================
-- AI生成クイズ問題レビューワークフローシステム
-- ======================================================================
-- 作成日: 2025年1月20日
-- 説明: AI生成問題のレビュー・承認・取込を管理するためのテーブル構造

-- ======================================================================
-- 1. レビュー問題管理テーブル
-- ======================================================================
-- 説明: AI生成された問題を格納し、レビュー・承認プロセスを管理

CREATE TABLE IF NOT EXISTS quiz_questions_review (
  id BIGSERIAL PRIMARY KEY,
  
  -- ======================================================================
  -- 基本問題情報
  -- ======================================================================
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer INTEGER NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
  explanation TEXT,
  
  -- ======================================================================
  -- カテゴリー・分類情報
  -- ======================================================================
  category_id TEXT NOT NULL,
  subcategory TEXT,
  subcategory_id TEXT,
  difficulty TEXT NOT NULL,
  time_limit INTEGER DEFAULT 45,
  tags TEXT[],
  source TEXT,
  
  -- ======================================================================
  -- ワークフロー管理
  -- ======================================================================
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'editing')),
  priority INTEGER DEFAULT 0 CHECK (priority BETWEEN 0 AND 2), -- 0: 通常, 1: 高, 2: 緊急
  
  -- ======================================================================
  -- AI生成情報
  -- ======================================================================
  ai_prompt TEXT, -- 使用したプロンプト
  ai_model TEXT, -- 使用したAIモデル（例: claude-3-opus）
  generation_params JSONB, -- 生成パラメータ（温度、トークン数など）
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by UUID NOT NULL, -- 生成者のユーザーID
  generation_batch_id TEXT, -- バッチ生成時のグループID
  
  -- ======================================================================
  -- レビュー情報
  -- ======================================================================
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID, -- レビュー者のユーザーID
  review_notes TEXT, -- レビューコメント
  review_score INTEGER CHECK (review_score BETWEEN 1 AND 5), -- レビュー評価（1-5）
  review_changes JSONB, -- 編集履歴（変更前後の差分）
  
  -- ======================================================================
  -- 取込情報
  -- ======================================================================
  imported_at TIMESTAMP WITH TIME ZONE,
  imported_by UUID, -- 取込実行者のユーザーID
  production_question_id BIGINT, -- 本番DB（quiz_questions）のID
  import_batch_id TEXT, -- 一括取込時のバッチID
  
  -- ======================================================================
  -- メタデータ
  -- ======================================================================
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================================================================
-- 2. レビュー履歴テーブル
-- ======================================================================
-- 説明: レビュー・編集の詳細履歴を保存

CREATE TABLE IF NOT EXISTS quiz_review_history (
  id BIGSERIAL PRIMARY KEY,
  review_question_id BIGINT NOT NULL REFERENCES quiz_questions_review(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('created', 'edited', 'status_changed', 'reviewed', 'imported')),
  
  -- アクション詳細
  previous_status TEXT,
  new_status TEXT,
  changes JSONB, -- 変更内容の詳細
  comment TEXT, -- アクションに対するコメント
  
  -- 実行者情報
  performed_by UUID NOT NULL, -- アクション実行者のユーザーID
  performed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ======================================================================
-- 3. レビューバッチ管理テーブル
-- ======================================================================
-- 説明: 一括生成・一括取込のバッチ処理を管理

CREATE TABLE IF NOT EXISTS quiz_review_batches (
  id TEXT PRIMARY KEY, -- バッチID（UUID形式）
  batch_type TEXT NOT NULL CHECK (batch_type IN ('generation', 'import')),
  
  -- バッチ情報
  total_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  
  -- 処理パラメータ
  parameters JSONB, -- バッチ処理のパラメータ
  
  -- 実行情報
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  executed_by UUID NOT NULL,
  
  -- エラー情報
  errors JSONB -- エラーの詳細
);

-- ======================================================================
-- インデックス作成
-- ======================================================================

-- パフォーマンス最適化用インデックス
CREATE INDEX idx_quiz_questions_review_status ON quiz_questions_review(status);
CREATE INDEX idx_quiz_questions_review_category ON quiz_questions_review(category_id, difficulty);
CREATE INDEX idx_quiz_questions_review_generated_at ON quiz_questions_review(generated_at DESC);
CREATE INDEX idx_quiz_questions_review_reviewed_at ON quiz_questions_review(reviewed_at DESC);
CREATE INDEX idx_quiz_questions_review_batch_id ON quiz_questions_review(generation_batch_id);

-- 履歴テーブル用インデックス
CREATE INDEX idx_quiz_review_history_question_id ON quiz_review_history(review_question_id);
CREATE INDEX idx_quiz_review_history_performed_at ON quiz_review_history(performed_at DESC);

-- バッチテーブル用インデックス
CREATE INDEX idx_quiz_review_batches_type ON quiz_review_batches(batch_type);
CREATE INDEX idx_quiz_review_batches_started_at ON quiz_review_batches(started_at DESC);

-- ======================================================================
-- トリガー関数
-- ======================================================================

-- 更新日時自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー設定
CREATE TRIGGER update_quiz_questions_review_updated_at
  BEFORE UPDATE ON quiz_questions_review
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ======================================================================
-- ビュー作成
-- ======================================================================

-- レビュー統計ビュー
CREATE OR REPLACE VIEW quiz_review_stats AS
SELECT 
  category_id,
  difficulty,
  status,
  COUNT(*) as count,
  AVG(review_score) as avg_review_score,
  MAX(generated_at) as latest_generation,
  MAX(reviewed_at) as latest_review
FROM quiz_questions_review
GROUP BY category_id, difficulty, status;

-- 保留中問題ビュー（レビュー画面用）
CREATE OR REPLACE VIEW quiz_review_pending AS
SELECT 
  qr.*,
  c.name as category_name,
  sc.name as subcategory_name,
  u1.display_name as generator_name,
  u2.display_name as reviewer_name
FROM quiz_questions_review qr
LEFT JOIN categories c ON c.category_id = qr.category_id
LEFT JOIN subcategories sc ON sc.subcategory_id = qr.subcategory_id
LEFT JOIN users u1 ON u1.id = qr.generated_by
LEFT JOIN users u2 ON u2.id = qr.reviewed_by
WHERE qr.status = 'pending'
ORDER BY qr.priority DESC, qr.generated_at ASC;

-- ======================================================================
-- 初期データ・サンプル
-- ======================================================================

-- サンプルデータは必要に応じて追加

-- ======================================================================
-- 権限設定（Supabaseの場合）
-- ======================================================================

-- RLSポリシーは必要に応じて設定
-- ALTER TABLE quiz_questions_review ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE quiz_review_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE quiz_review_batches ENABLE ROW LEVEL SECURITY;

-- ======================================================================
-- コメント追加
-- ======================================================================

COMMENT ON TABLE quiz_questions_review IS 'AI生成クイズ問題のレビュー管理テーブル';
COMMENT ON TABLE quiz_review_history IS 'レビュー・編集履歴の詳細記録';
COMMENT ON TABLE quiz_review_batches IS 'バッチ処理（一括生成・一括取込）の管理';
COMMENT ON VIEW quiz_review_stats IS 'レビュー問題の統計情報';
COMMENT ON VIEW quiz_review_pending IS '保留中問題の詳細ビュー';