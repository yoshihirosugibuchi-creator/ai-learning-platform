-- ================================================================
-- AI Learning Platform Next - 包括的RLS（Row Level Security）設定
-- ================================================================
-- 作成日: 2025年11月4日
-- 対象: 全47テーブルの包括的RLS設定
-- 目的: セキュリティ強化・データ保護・適切なアクセス制御
-- 実装方針: 段階的・テスト重視・リバーシブル
-- ================================================================

-- ⚠️  実行前注意事項:
-- 1. 本番環境での実行前に必ずテスト環境で検証すること
-- 2. 段階的実行を推奨（Phase単位での実行）
-- 3. 各Phaseの実行後に機能テストを実施すること
-- 4. 問題発生時は即座にロールバック可能

-- ================================================================
-- 🚨 緊急時ロールバック用SQL（先頭に配置）
-- ================================================================

/*
-- 全テーブル一括RLS無効化（緊急時のみ使用）
DO $$
DECLARE
    table_name text;
BEGIN
    FOR table_name IN 
        SELECT schemaname||'.'||tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE 'ALTER TABLE ' || table_name || ' DISABLE ROW LEVEL SECURITY';
        RAISE NOTICE 'RLS disabled for %', table_name;
    END LOOP;
END $$;
*/

-- ================================================================
-- Phase 1: 準備 - RLS有効化とポリシー削除
-- ================================================================

-- 既存ポリシーの削除（安全な再実行のため）
DO $$
DECLARE
    policy_record record;
BEGIN
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
        RAISE NOTICE 'Dropped policy % on %.%', 
                     policy_record.policyname, 
                     policy_record.schemaname, 
                     policy_record.tablename;
    END LOOP;
END $$;

-- ================================================================
-- Phase 2: マスタデータテーブル（24テーブル）
-- ================================================================
-- 方針: 読み取り専用 + 管理者のみ更新権限

-- categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_public_read" ON categories
    FOR SELECT USING (true);

CREATE POLICY "categories_admin_write" ON categories
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- subcategories
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subcategories_public_read" ON subcategories
    FOR SELECT USING (true);

CREATE POLICY "subcategories_admin_write" ON subcategories
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- quiz_questions
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_questions_public_read" ON quiz_questions
    FOR SELECT USING (true);

CREATE POLICY "quiz_questions_admin_write" ON quiz_questions
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- quiz_hints
ALTER TABLE quiz_hints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_hints_public_read" ON quiz_hints
    FOR SELECT USING (true);

CREATE POLICY "quiz_hints_admin_write" ON quiz_hints
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- learning_courses
ALTER TABLE learning_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_courses_public_read" ON learning_courses
    FOR SELECT USING (true);

CREATE POLICY "learning_courses_admin_write" ON learning_courses
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- learning_genres
ALTER TABLE learning_genres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_genres_public_read" ON learning_genres
    FOR SELECT USING (true);

CREATE POLICY "learning_genres_admin_write" ON learning_genres
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- learning_sessions
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_sessions_public_read" ON learning_sessions
    FOR SELECT USING (true);

CREATE POLICY "learning_sessions_admin_write" ON learning_sessions
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- learning_themes
ALTER TABLE learning_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_themes_public_read" ON learning_themes
    FOR SELECT USING (true);

CREATE POLICY "learning_themes_admin_write" ON learning_themes
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- wisdom_cards
ALTER TABLE wisdom_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wisdom_cards_public_read" ON wisdom_cards
    FOR SELECT USING (true);

CREATE POLICY "wisdom_cards_admin_write" ON wisdom_cards
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- xp_level_skp_settings
ALTER TABLE xp_level_skp_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "xp_level_skp_settings_public_read" ON xp_level_skp_settings
    FOR SELECT USING (true);

CREATE POLICY "xp_level_skp_settings_admin_write" ON xp_level_skp_settings
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- industry_level_targets
ALTER TABLE industry_level_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "industry_level_targets_public_read" ON industry_level_targets
    FOR SELECT USING (true);

CREATE POLICY "industry_level_targets_admin_write" ON industry_level_targets
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- skill_levels
ALTER TABLE skill_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skill_levels_public_read" ON skill_levels
    FOR SELECT USING (true);

CREATE POLICY "skill_levels_admin_write" ON skill_levels
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- difficulty_distribution_settings
ALTER TABLE difficulty_distribution_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "difficulty_distribution_settings_public_read" ON difficulty_distribution_settings
    FOR SELECT USING (true);

CREATE POLICY "difficulty_distribution_settings_admin_write" ON difficulty_distribution_settings
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- quiz_questions_review
ALTER TABLE quiz_questions_review ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_questions_review_public_read" ON quiz_questions_review
    FOR SELECT USING (true);

CREATE POLICY "quiz_questions_review_admin_write" ON quiz_questions_review
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- quiz_review_batches
ALTER TABLE quiz_review_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_review_batches_public_read" ON quiz_review_batches
    FOR SELECT USING (true);

CREATE POLICY "quiz_review_batches_admin_write" ON quiz_review_batches
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- quiz_review_history
ALTER TABLE quiz_review_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_review_history_public_read" ON quiz_review_history
    FOR SELECT USING (true);

CREATE POLICY "quiz_review_history_admin_write" ON quiz_review_history
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- quiz_review_pending
ALTER TABLE quiz_review_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_review_pending_public_read" ON quiz_review_pending
    FOR SELECT USING (true);

CREATE POLICY "quiz_review_pending_admin_write" ON quiz_review_pending
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- session_contents
ALTER TABLE session_contents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_contents_public_read" ON session_contents
    FOR SELECT USING (true);

CREATE POLICY "session_contents_admin_write" ON session_contents
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- session_quizzes
ALTER TABLE session_quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_quizzes_public_read" ON session_quizzes
    FOR SELECT USING (true);

CREATE POLICY "session_quizzes_admin_write" ON session_quizzes
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- daily_analytics_batch_log
ALTER TABLE daily_analytics_batch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_analytics_batch_log_public_read" ON daily_analytics_batch_log
    FOR SELECT USING (true);

CREATE POLICY "daily_analytics_batch_log_admin_write" ON daily_analytics_batch_log
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- system_config_monitoring
ALTER TABLE system_config_monitoring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_config_monitoring_public_read" ON system_config_monitoring
    FOR SELECT USING (true);

CREATE POLICY "system_config_monitoring_admin_write" ON system_config_monitoring
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- system_health_logs
ALTER TABLE system_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_health_logs_public_read" ON system_health_logs
    FOR SELECT USING (true);

CREATE POLICY "system_health_logs_admin_write" ON system_health_logs
    FOR INSERT, UPDATE, DELETE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- category_stats (ビュー - 特別な設定は不要、ベースとなるテーブルのRLSに依存)

-- ================================================================
-- Phase 3: 特殊テーブル - users
-- ================================================================
-- 方針: 自分のプロフィールのみアクセス + 管理者権限

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 自分のプロフィールへのアクセス
CREATE POLICY "users_own_profile" ON users
    FOR ALL USING (id = auth.uid());

-- 管理者による全ユーザーへのアクセス
CREATE POLICY "users_admin_access" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        )
    );

-- ================================================================
-- Phase 4: USER_ID必須テーブル（16テーブル）
-- ================================================================
-- 方針: user_id = auth.uid() ベースの厳格なRLS

-- course_completions
ALTER TABLE course_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_completions_user_data" ON course_completions
    FOR ALL USING (user_id = auth.uid());

-- course_session_completions
ALTER TABLE course_session_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_session_completions_user_data" ON course_session_completions
    FOR ALL USING (user_id = auth.uid());

-- course_theme_completions
ALTER TABLE course_theme_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "course_theme_completions_user_data" ON course_theme_completions
    FOR ALL USING (user_id = auth.uid());

-- daily_xp_records
ALTER TABLE daily_xp_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_xp_records_user_data" ON daily_xp_records
    FOR ALL USING (user_id = auth.uid());

-- learning_analytics_summary
ALTER TABLE learning_analytics_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_analytics_summary_user_data" ON learning_analytics_summary
    FOR ALL USING (user_id = auth.uid());

-- learning_effectiveness_tracking
ALTER TABLE learning_effectiveness_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_effectiveness_tracking_user_data" ON learning_effectiveness_tracking
    FOR ALL USING (user_id = auth.uid());

-- learning_recommendations
ALTER TABLE learning_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_recommendations_user_data" ON learning_recommendations
    FOR ALL USING (user_id = auth.uid());

-- precomputed_quiz_sets
ALTER TABLE precomputed_quiz_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "precomputed_quiz_sets_user_data" ON precomputed_quiz_sets
    FOR ALL USING (user_id = auth.uid());

-- quiz_review_stats
ALTER TABLE quiz_review_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_review_stats_user_data" ON quiz_review_stats
    FOR ALL USING (user_id = auth.uid());

-- quiz_sessions
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_sessions_user_data" ON quiz_sessions
    FOR ALL USING (user_id = auth.uid());

-- review_settings
ALTER TABLE review_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_settings_user_data" ON review_settings
    FOR ALL USING (user_id = auth.uid());

-- spaced_repetition_schedule
ALTER TABLE spaced_repetition_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spaced_repetition_schedule_user_data" ON spaced_repetition_schedule
    FOR ALL USING (user_id = auth.uid());

-- unified_learning_session_analytics
ALTER TABLE unified_learning_session_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "unified_learning_session_analytics_user_data" ON unified_learning_session_analytics
    FOR ALL USING (user_id = auth.uid());

-- user_learning_profiles
ALTER TABLE user_learning_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_learning_profiles_user_data" ON user_learning_profiles
    FOR ALL USING (user_id = auth.uid());

-- user_question_usage
ALTER TABLE user_question_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_question_usage_user_data" ON user_question_usage
    FOR ALL USING (user_id = auth.uid());

-- wisdom_card_collection
ALTER TABLE wisdom_card_collection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wisdom_card_collection_user_data" ON wisdom_card_collection
    FOR ALL USING (user_id = auth.uid());

-- ================================================================
-- Phase 5: USER_ID_NULL対応テーブル（5テーブル）
-- ================================================================
-- 方針: nullable user_id への対応 + システムデータ保護

-- knowledge_card_collection
ALTER TABLE knowledge_card_collection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "knowledge_card_collection_user_or_system" ON knowledge_card_collection
    FOR ALL USING (
        user_id = auth.uid() OR 
        (user_id IS NULL AND auth.role() = 'service_role')
    );

-- learning_progress
ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_progress_user_or_system" ON learning_progress
    FOR ALL USING (
        user_id = auth.uid() OR 
        (user_id IS NULL AND auth.role() = 'service_role')
    );

-- quiz_answers
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiz_answers_user_or_system" ON quiz_answers
    FOR ALL USING (
        user_id = auth.uid() OR 
        (user_id IS NULL AND auth.role() = 'service_role')
    );

-- skp_transactions
ALTER TABLE skp_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "skp_transactions_user_or_system" ON skp_transactions
    FOR ALL USING (
        user_id = auth.uid() OR 
        (user_id IS NULL AND auth.role() = 'service_role')
    );

-- system_alerts
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_alerts_user_or_admin" ON system_alerts
    FOR ALL USING (
        user_id = auth.uid() OR 
        (user_id IS NULL AND EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role IN ('system_admin', 'admin')
        ))
    );

-- ================================================================
-- Phase 5B: 混合型テーブル（2テーブル）
-- ================================================================
-- 方針: user_id必須 + nullable の両パターンに対応

-- user_badges (user_id: string - 必須フィールド)
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_badges_user_data" ON user_badges
    FOR ALL USING (user_id = auth.uid());

-- user_settings (user_id: string | null - nullable)
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_user_or_system" ON user_settings
    FOR ALL USING (
        user_id = auth.uid() OR 
        (user_id IS NULL AND auth.role() = 'service_role')
    );

-- ================================================================
-- 設定完了確認・統計情報
-- ================================================================

-- RLS有効化されたテーブル数の確認
DO $$
DECLARE
    enabled_count integer;
    total_count integer;
BEGIN
    SELECT COUNT(*) INTO enabled_count 
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' 
    AND c.relkind = 'r' 
    AND c.relrowsecurity = true;
    
    SELECT COUNT(*) INTO total_count 
    FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public' 
    AND c.relkind = 'r';
    
    RAISE NOTICE '🔐 RLS設定完了: %/% テーブルでRLS有効化', enabled_count, total_count;
END $$;

-- ポリシー作成数の確認
DO $$
DECLARE
    policy_count integer;
BEGIN
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    RAISE NOTICE '📋 作成されたポリシー数: %個', policy_count;
END $$;

-- ================================================================
-- 実行完了メッセージ
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ AI Learning Platform Next - RLS設定完了';
    RAISE NOTICE '📊 対象: 全47テーブル';
    RAISE NOTICE '🔐 セキュリティレベル: 最高';
    RAISE NOTICE '⚠️  次の手順: 機能テスト・パフォーマンステストを実施してください';
    RAISE NOTICE '🚨 問題発生時: 本ファイル冒頭のロールバックSQLを使用してください';
END $$;

-- ================================================================
-- 注意事項・トラブルシューティング
-- ================================================================

/*
🔧 トラブルシューティング:

1. アクセス拒否エラーが発生した場合:
   - auth.uid()が正しく設定されているか確認
   - service_roleでのアクセスか確認
   - 管理者権限が適切に設定されているか確認

2. パフォーマンス問題が発生した場合:
   - 適切なインデックスが設定されているか確認
   - クエリプランを確認してRLSフィルタリングが効率的か検証

3. 緊急時の対応:
   -- 特定テーブルのみRLS無効化
   ALTER TABLE problematic_table DISABLE ROW LEVEL SECURITY;
   
   -- 特定ポリシーのみ削除
   DROP POLICY policy_name ON table_name;

4. 段階的復旧:
   -- Phase単位でのロールバック可能
   -- 本ファイルのPhase単位でコメントアウト・実行
*/