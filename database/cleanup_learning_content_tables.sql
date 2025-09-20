-- 学習コンテンツテーブル削除スクリプト（エラー時の初期化用）
-- 実行方法: Supabaseダッシュボード > SQL Editor で実行
-- 注意: 既存データが完全に削除されます

-- =====================================
-- テーブル削除（依存関係順）
-- =====================================

-- 子テーブルから順番に削除
DROP TABLE IF EXISTS session_quizzes;
DROP TABLE IF EXISTS session_contents;
DROP TABLE IF EXISTS learning_sessions;
DROP TABLE IF EXISTS learning_themes;
DROP TABLE IF EXISTS learning_genres;
DROP TABLE IF EXISTS learning_courses;

-- 削除確認メッセージ
SELECT 'All learning content tables dropped successfully' AS cleanup_result;