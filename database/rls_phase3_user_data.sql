-- RLS Phase 3: ユーザーデータテーブル（残り21テーブル）のRLS設定
-- 作成日: 2025年11月4日
-- 対象: Phase2以外のユーザーデータテーブル

-- 前提: Phase 1,2が実行済みであること

-- =============================================================================
-- ユーザー統計系テーブル（3テーブル）
-- =============================================================================

-- user_category_xp_stats_v2
ALTER TABLE user_category_xp_stats_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_category_xp_stats_v2_user_access" ON user_category_xp_stats_v2
  FOR ALL USING (is_owner_or_admin(user_id::uuid));

-- user_subcategory_xp_stats_v2
ALTER TABLE user_subcategory_xp_stats_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_subcategory_xp_stats_v2_user_access" ON user_subcategory_xp_stats_v2
  FOR ALL USING (is_owner_or_admin(user_id::uuid));

-- user_knowledge_collection_v2
ALTER TABLE user_knowledge_collection_v2 ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_knowledge_collection_v2_user_access" ON user_knowledge_collection_v2
  FOR ALL USING (is_owner_or_admin(user_id));

-- =============================================================================
-- コース関連テーブル（3テーブル）
-- =============================================================================

-- course_completions
ALTER TABLE course_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_completions_user_access" ON course_completions
  FOR ALL USING (is_owner_or_admin(user_id));

-- course_session_completions
ALTER TABLE course_session_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_session_completions_user_access" ON course_session_completions
  FOR ALL USING (is_owner_or_admin(user_id));

-- course_theme_completions
ALTER TABLE course_theme_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_theme_completions_user_access" ON course_theme_completions
  FOR ALL USING (is_owner_or_admin(user_id));

-- =============================================================================
-- 学習記録・分析系テーブル（6テーブル）
-- =============================================================================

-- daily_xp_records
ALTER TABLE daily_xp_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_xp_records_user_access" ON daily_xp_records
  FOR ALL USING (is_owner_or_admin(user_id));

-- daily_analytics_batch_log (システムテーブル - 管理者のみアクセス)
ALTER TABLE daily_analytics_batch_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_analytics_batch_log_admin_only" ON daily_analytics_batch_log
  FOR ALL USING (is_admin());

-- learning_analytics_summary
ALTER TABLE learning_analytics_summary ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learning_analytics_summary_user_access" ON learning_analytics_summary
  FOR ALL USING (is_owner_or_admin(user_id));

-- learning_effectiveness_tracking
ALTER TABLE learning_effectiveness_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learning_effectiveness_tracking_user_access" ON learning_effectiveness_tracking
  FOR ALL USING (is_owner_or_admin(user_id));

-- unified_learning_session_analytics
ALTER TABLE unified_learning_session_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unified_learning_session_analytics_user_access" ON unified_learning_session_analytics
  FOR ALL USING (is_owner_or_admin(user_id));

-- spaced_repetition_schedule
ALTER TABLE spaced_repetition_schedule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spaced_repetition_schedule_user_access" ON spaced_repetition_schedule
  FOR ALL USING (is_owner_or_admin(user_id));

-- =============================================================================
-- ユーザー設定・プロフィール系テーブル（4テーブル）
-- =============================================================================

-- user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_settings_user_access" ON user_settings
  FOR ALL USING (is_owner_or_admin(user_id));

-- user_learning_profiles
ALTER TABLE user_learning_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_learning_profiles_user_access" ON user_learning_profiles
  FOR ALL USING (is_owner_or_admin(user_id));

-- user_badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_badges_user_access" ON user_badges
  FOR ALL USING (is_owner_or_admin(user_id));

-- user_question_usage
ALTER TABLE user_question_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_question_usage_user_access" ON user_question_usage
  FOR ALL USING (is_owner_or_admin(user_id));

-- =============================================================================
-- コレクション・カード系テーブル（2テーブル）
-- =============================================================================

-- wisdom_card_collection
ALTER TABLE wisdom_card_collection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wisdom_card_collection_user_access" ON wisdom_card_collection
  FOR ALL USING (is_owner_or_admin(user_id));

-- knowledge_card_collection
ALTER TABLE knowledge_card_collection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "knowledge_card_collection_user_access" ON knowledge_card_collection
  FOR ALL USING (is_owner_or_admin(user_id));

-- =============================================================================
-- その他ユーザーデータテーブル（3テーブル）
-- =============================================================================

-- learning_progress
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learning_progress_user_access" ON learning_progress
  FOR ALL USING (is_owner_or_admin(user_id));

-- learning_recommendations
ALTER TABLE learning_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "learning_recommendations_user_access" ON learning_recommendations
  FOR ALL USING (is_owner_or_admin(user_id));

-- precomputed_quiz_sets
ALTER TABLE precomputed_quiz_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "precomputed_quiz_sets_user_access" ON precomputed_quiz_sets
  FOR ALL USING (is_owner_or_admin(user_id));

-- review_settings
ALTER TABLE review_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "review_settings_user_access" ON review_settings
  FOR ALL USING (is_owner_or_admin(user_id));

-- =============================================================================
-- Phase 3 実行確認
-- =============================================================================

-- Phase 3対象テーブルのRLS有効化状況確認
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'user_category_xp_stats_v2', 'user_subcategory_xp_stats_v2', 'user_knowledge_collection_v2',
    'course_completions', 'course_session_completions', 'course_theme_completions',
    'daily_xp_records', 'daily_analytics_batch_log', 'learning_analytics_summary',
    'learning_effectiveness_tracking', 'unified_learning_session_analytics', 'spaced_repetition_schedule',
    'user_settings', 'user_learning_profiles', 'user_badges', 'user_question_usage',
    'wisdom_card_collection', 'knowledge_card_collection',
    'learning_progress', 'learning_recommendations', 'precomputed_quiz_sets', 'review_settings'
  )
ORDER BY tablename;

-- ポリシー数確認
SELECT 
  COUNT(*) as policy_count,
  'Phase 3 policies created' as description
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN (
    'user_category_xp_stats_v2', 'user_subcategory_xp_stats_v2', 'user_knowledge_collection_v2',
    'course_completions', 'course_session_completions', 'course_theme_completions',
    'daily_xp_records', 'daily_analytics_batch_log', 'learning_analytics_summary',
    'learning_effectiveness_tracking', 'unified_learning_session_analytics', 'spaced_repetition_schedule',
    'user_settings', 'user_learning_profiles', 'user_badges', 'user_question_usage',
    'wisdom_card_collection', 'knowledge_card_collection',
    'learning_progress', 'learning_recommendations', 'precomputed_quiz_sets', 'review_settings'
  );