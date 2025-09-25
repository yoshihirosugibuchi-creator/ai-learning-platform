-- 一時的なテスト用：XPテーブルのRLS無効化
-- 注意: 本番環境では使用しないでください

-- クイズ関連テーブルのRLS無効化
ALTER TABLE public.quiz_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_answers DISABLE ROW LEVEL SECURITY;

-- コース学習関連テーブルのRLS無効化  
ALTER TABLE public.course_session_completions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_theme_completions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_completions DISABLE ROW LEVEL SECURITY;

-- 統計テーブルのRLS無効化
ALTER TABLE public.user_xp_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_category_xp_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subcategory_xp_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_xp_records DISABLE ROW LEVEL SECURITY;