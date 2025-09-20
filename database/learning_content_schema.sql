-- 学習コンテンツ データベーススキーマ設計
-- 実行方法: Supabaseダッシュボード > SQL Editor で実行

-- =====================================
-- 1. コーステーブル (learning_courses)
-- =====================================
CREATE TABLE IF NOT EXISTS learning_courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_days INTEGER NOT NULL CHECK (estimated_days > 0),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'available', 'coming_soon', 'archived')),
  
  -- バッジ情報（正規化せずJSON形式で格納）
  badge_data JSONB,
  
  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- 2. ジャンルテーブル (learning_genres)
-- =====================================
CREATE TABLE IF NOT EXISTS learning_genres (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES learning_courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id TEXT NOT NULL, -- メインカテゴリーID（quiz_questionsと連携）
  subcategory_id TEXT,       -- サブカテゴリーID（任意）
  estimated_days INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- バッジ情報
  badge_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- 3. テーマテーブル (learning_themes)
-- =====================================
CREATE TABLE IF NOT EXISTS learning_themes (
  id TEXT PRIMARY KEY,
  genre_id TEXT NOT NULL REFERENCES learning_genres(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 15,
  display_order INTEGER NOT NULL DEFAULT 0,
  
  -- リワードカード情報
  reward_card_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- 4. セッションテーブル (learning_sessions)
-- =====================================
CREATE TABLE IF NOT EXISTS learning_sessions (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL REFERENCES learning_themes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL DEFAULT 5,
  session_type TEXT NOT NULL CHECK (session_type IN ('knowledge', 'practice', 'case_study')),
  display_order INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- 5. セッションコンテンツテーブル (session_contents)
-- =====================================
CREATE TABLE IF NOT EXISTS session_contents (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL CHECK (content_type IN ('text', 'image', 'video', 'example', 'key_points')),
  title TEXT,
  content TEXT NOT NULL,
  duration INTEGER, -- 分（動画用）
  display_order INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- 6. セッションクイズテーブル (session_quizzes)
-- =====================================
CREATE TABLE IF NOT EXISTS session_quizzes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES learning_sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- ['選択肢1', '選択肢2', '選択肢3', '選択肢4']
  correct_answer INTEGER NOT NULL CHECK (correct_answer >= 0 AND correct_answer <= 3),
  explanation TEXT NOT NULL,
  quiz_type TEXT NOT NULL DEFAULT 'single_choice' CHECK (quiz_type IN ('single_choice', 'multiple_choice')),
  display_order INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================
-- インデックス作成（パフォーマンス最適化）
-- =====================================

-- コース
CREATE INDEX IF NOT EXISTS idx_learning_courses_status ON learning_courses(status);
CREATE INDEX IF NOT EXISTS idx_learning_courses_display_order ON learning_courses(display_order);

-- ジャンル
CREATE INDEX IF NOT EXISTS idx_learning_genres_course_id ON learning_genres(course_id);
CREATE INDEX IF NOT EXISTS idx_learning_genres_category ON learning_genres(category_id);

-- テーマ
CREATE INDEX IF NOT EXISTS idx_learning_themes_genre_id ON learning_themes(genre_id);

-- セッション
CREATE INDEX IF NOT EXISTS idx_learning_sessions_theme_id ON learning_sessions(theme_id);

-- コンテンツ
CREATE INDEX IF NOT EXISTS idx_session_contents_session_id ON session_contents(session_id);
CREATE INDEX IF NOT EXISTS idx_session_contents_type ON session_contents(content_type);

-- クイズ
CREATE INDEX IF NOT EXISTS idx_session_quizzes_session_id ON session_quizzes(session_id);

-- =====================================
-- RLS設定（セキュリティ）
-- =====================================

-- 開発段階ではRLS無効（本番では有効化必要）
ALTER TABLE learning_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_genres DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_themes DISABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_contents DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_quizzes DISABLE ROW LEVEL SECURITY;

-- =====================================
-- コメント追加（ドキュメント）
-- =====================================

COMMENT ON TABLE learning_courses IS 'コース基本情報 - 学習コースのメタデータ';
COMMENT ON TABLE learning_genres IS 'ジャンル情報 - コース内のジャンル分類';
COMMENT ON TABLE learning_themes IS 'テーマ情報 - ジャンル内の学習テーマ';
COMMENT ON TABLE learning_sessions IS 'セッション情報 - テーマ内の学習セッション';
COMMENT ON TABLE session_contents IS 'セッションコンテンツ - 各セッションの学習コンテンツ';
COMMENT ON TABLE session_quizzes IS 'セッションクイズ - 各セッションの確認問題';

-- 作成確認メッセージ
SELECT 'Learning content tables created successfully' AS result;