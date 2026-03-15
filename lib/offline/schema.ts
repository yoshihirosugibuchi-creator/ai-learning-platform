/**
 * WatermelonDB スキーマ定義
 * Supabaseテーブル構造に対応するローカルDBスキーマ
 */
import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
  version: 2,
  tables: [
    // ==============================
    // マスタデータ（サーバー→ローカル同期、読み取り専用）
    // ==============================

    // クイズ問題
    tableSchema({
      name: 'quiz_questions',
      columns: [
        { name: 'server_id', type: 'number' }, // Supabase側はnumeric ID
        { name: 'category_id', type: 'string' },
        { name: 'subcategory_id', type: 'string', isOptional: true },
        { name: 'question', type: 'string' },
        { name: 'option1', type: 'string' },
        { name: 'option2', type: 'string' },
        { name: 'option3', type: 'string' },
        { name: 'option4', type: 'string' },
        { name: 'correct_answer', type: 'number' },
        { name: 'difficulty', type: 'string', isOptional: true },
        { name: 'explanation', type: 'string', isOptional: true },
        { name: 'level1_hint', type: 'string', isOptional: true },
        { name: 'level2_hint', type: 'string', isOptional: true },
        { name: 'level3_hint', type: 'string', isOptional: true },
        { name: 'time_limit', type: 'number', isOptional: true },
        { name: 'source', type: 'string', isOptional: true },
        { name: 'subcategory', type: 'string', isOptional: true },
        { name: 'is_deleted', type: 'boolean', isOptional: true },
        { name: 'related_topics', type: 'string', isOptional: true }, // JSON as string
        { name: 'created_at', type: 'number', isOptional: true }, // timestamp
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // クイズパック
    tableSchema({
      name: 'quiz_packs',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'question_count', type: 'number' },
        { name: 'categories', type: 'string' }, // JSON
        { name: 'difficulties', type: 'string' }, // JSON
        { name: 'subcategories', type: 'string', isOptional: true }, // JSON
        { name: 'display_order', type: 'number' },
        { name: 'is_published', type: 'boolean' },
        { name: 'icon_emoji', type: 'string', isOptional: true },
        { name: 'color_theme', type: 'string', isOptional: true },
        { name: 'total_attempts', type: 'number' },
        { name: 'average_score', type: 'number', isOptional: true },
        { name: 'created_by', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),

    // コース内クイズ
    tableSchema({
      name: 'session_quizzes',
      columns: [
        { name: 'session_id', type: 'string' },
        { name: 'question', type: 'string' },
        { name: 'correct_answer', type: 'number' },
        { name: 'options', type: 'string' }, // JSON
        { name: 'explanation', type: 'string' },
        { name: 'display_order', type: 'number' },
        { name: 'quiz_type', type: 'string' },
        { name: 'created_at', type: 'number', isOptional: true },
      ],
    }),

    // ケーススタディ問題
    tableSchema({
      name: 'case_study_problems',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'case_text', type: 'string' },
        { name: 'primary_category_id', type: 'string' },
        { name: 'primary_subcategory_id', type: 'string' },
        { name: 'difficulty', type: 'string' },
        { name: 'industry', type: 'string', isOptional: true },
        { name: 'scenario_type', type: 'string', isOptional: true },
        { name: 'estimated_minutes', type: 'number', isOptional: true },
        { name: 'step_count', type: 'number' },
        { name: 'step_template', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'is_ai_generated', type: 'boolean', isOptional: true },
        { name: 'custom_base_xp_per_step', type: 'number', isOptional: true },
        { name: 'scoring_ai_provider', type: 'string', isOptional: true },
        { name: 'featured_date', type: 'string', isOptional: true },
        { name: 'created_by', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // ケーススタディ ステップ
    tableSchema({
      name: 'case_study_steps',
      columns: [
        { name: 'problem_id', type: 'string' },
        { name: 'step_number', type: 'number' },
        { name: 'step_name', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'category_id', type: 'string' },
        { name: 'subcategory_id', type: 'string' },
        { name: 'question_type', type: 'string' },
        { name: 'options', type: 'string', isOptional: true }, // JSON
        { name: 'model_answer', type: 'string' }, // JSON
        { name: 'hint', type: 'string', isOptional: true },
        { name: 'target_skills', type: 'string' }, // JSON
        { name: 'max_score', type: 'number', isOptional: true },
        { name: 'display_order', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
      ],
    }),

    // ケーススタディ 評価ルーブリック（18軸）
    tableSchema({
      name: 'case_study_rubric_axes',
      columns: [
        { name: 'axis_code', type: 'string' },
        { name: 'axis_name', type: 'string' },
        { name: 'definition', type: 'string' },
        { name: 'rubric_group_code', type: 'string' },
        { name: 'rubric_group_name', type: 'string' },
        { name: 'score_anchors', type: 'string' }, // JSON
        { name: 'evaluation_points', type: 'string', isOptional: true }, // JSON (array)
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'boolean', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // ケーススタディ オプション
    tableSchema({
      name: 'case_study_options',
      columns: [
        { name: 'option_type', type: 'string' },
        { name: 'code', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'name_en', type: 'string', isOptional: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'target_skills', type: 'string', isOptional: true }, // JSON (array)
        { name: 'is_extended', type: 'boolean', isOptional: true },
        { name: 'is_active', type: 'boolean', isOptional: true },
        { name: 'display_order', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // ケーススタディ コースリンク
    tableSchema({
      name: 'case_study_course_links',
      columns: [
        { name: 'course_id', type: 'string' },
        { name: 'problem_id', type: 'string' },
        { name: 'display_after_session', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
      ],
    }),

    // 学習コース
    tableSchema({
      name: 'learning_courses',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'difficulty', type: 'string' },
        { name: 'icon', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'display_order', type: 'number' },
        { name: 'estimated_days', type: 'number' },
        { name: 'status', type: 'string' },
        { name: 'badge_data', type: 'string', isOptional: true }, // JSON
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // 学習ジャンル
    tableSchema({
      name: 'learning_genres',
      columns: [
        { name: 'course_id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'display_order', type: 'number' },
        { name: 'estimated_days', type: 'number' },
        { name: 'category_id', type: 'string' },
        { name: 'subcategory_id', type: 'string', isOptional: true },
        { name: 'badge_data', type: 'string', isOptional: true }, // JSON
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // 学習テーマ
    tableSchema({
      name: 'learning_themes',
      columns: [
        { name: 'genre_id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'display_order', type: 'number' },
        { name: 'estimated_minutes', type: 'number' },
        { name: 'subcategory_id', type: 'string', isOptional: true },
        { name: 'reward_card_data', type: 'string', isOptional: true }, // JSON
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // 学習セッション
    tableSchema({
      name: 'learning_sessions',
      columns: [
        { name: 'theme_id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'display_order', type: 'number' },
        { name: 'estimated_minutes', type: 'number' },
        { name: 'session_type', type: 'string' },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // セッションコンテンツ
    tableSchema({
      name: 'session_contents',
      columns: [
        { name: 'session_id', type: 'string' },
        { name: 'title', type: 'string', isOptional: true },
        { name: 'content', type: 'string' },
        { name: 'content_type', type: 'string' },
        { name: 'display_order', type: 'number' },
        { name: 'duration', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
      ],
    }),

    // スキルレベル
    tableSchema({
      name: 'skill_levels',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'display_name', type: 'string' },
        { name: 'display_order', type: 'number' },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'target_experience', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // カテゴリ
    tableSchema({
      name: 'categories',
      columns: [
        { name: 'category_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'type', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'icon', type: 'string', isOptional: true },
        { name: 'color', type: 'string', isOptional: true },
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'boolean' },
        { name: 'is_visible', type: 'boolean' },
        { name: 'activation_date', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // サブカテゴリ
    tableSchema({
      name: 'subcategories',
      columns: [
        { name: 'subcategory_id', type: 'string' },
        { name: 'parent_category_id', type: 'string' },
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'icon', type: 'string', isOptional: true },
        { name: 'display_order', type: 'number' },
        { name: 'is_active', type: 'boolean' },
        { name: 'is_visible', type: 'boolean' },
        { name: 'activation_date', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // XP設定
    tableSchema({
      name: 'xp_level_skp_settings',
      columns: [
        { name: 'server_id', type: 'number' }, // Supabase側はnumeric ID
        { name: 'setting_category', type: 'string' },
        { name: 'setting_key', type: 'string' },
        { name: 'setting_value', type: 'number' },
        { name: 'setting_description', type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // 格言カードマスタ
    tableSchema({
      name: 'wisdom_cards',
      columns: [
        { name: 'server_id', type: 'number' }, // Supabase側はnumeric ID
        { name: 'quote', type: 'string' },
        { name: 'author', type: 'string' },
        { name: 'category_id', type: 'string' },
        { name: 'subcategory_id', type: 'string', isOptional: true },
        { name: 'rarity', type: 'string' },
        { name: 'context', type: 'string' },
        { name: 'application_area', type: 'string' },
        { name: 'card_image_url', type: 'string', isOptional: true },
        { name: 'background_image_url', type: 'string', isOptional: true },
        { name: 'author_portrait_url', type: 'string', isOptional: true },
        { name: 'animation_url', type: 'string', isOptional: true },
        { name: 'category_icon_url', type: 'string', isOptional: true },
        { name: 'rarity_frame_url', type: 'string', isOptional: true },
        { name: 'special_badge_url', type: 'string', isOptional: true },
        { name: 'is_active', type: 'boolean', isOptional: true },
        { name: 'display_order', type: 'number', isOptional: true },
        { name: 'particle_effect_config', type: 'string', isOptional: true }, // JSON
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // ==============================
    // ユーザーデータ（ローカルキャッシュ＋サーバー送信）
    // ==============================

    // クイズセッション
    tableSchema({
      name: 'quiz_sessions',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'quiz_type', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'total_questions', type: 'number' },
        { name: 'correct_answers', type: 'number' },
        { name: 'accuracy_rate', type: 'number' },
        { name: 'total_xp', type: 'number' },
        { name: 'bonus_xp', type: 'number' },
        { name: 'duration_seconds', type: 'number', isOptional: true },
        { name: 'category_id', type: 'string', isOptional: true },
        { name: 'subcategory_id', type: 'string', isOptional: true },
        { name: 'pack_id', type: 'string', isOptional: true },
        { name: 'question_ids', type: 'string', isOptional: true }, // JSON
        { name: 'current_question_index', type: 'number', isOptional: true },
        { name: 'wisdom_cards_awarded', type: 'number', isOptional: true },
        { name: 'session_start_time', type: 'number' },
        { name: 'session_end_time', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // クイズ回答
    tableSchema({
      name: 'quiz_answers',
      columns: [
        { name: 'user_id', type: 'string', isOptional: true },
        { name: 'quiz_session_id', type: 'string', isOptional: true },
        { name: 'question_id', type: 'string' },
        { name: 'category_id', type: 'string' },
        { name: 'subcategory_id', type: 'string' },
        { name: 'difficulty', type: 'string' },
        { name: 'is_correct', type: 'boolean' },
        { name: 'is_timeout', type: 'boolean' },
        { name: 'user_answer', type: 'number', isOptional: true },
        { name: 'earned_xp', type: 'number' },
        { name: 'time_spent', type: 'number' },
        { name: 'hint_used', type: 'boolean' },
        { name: 'max_hint_level', type: 'number', isOptional: true },
        { name: 'hint_usage_details', type: 'string', isOptional: true }, // JSON
        { name: 'confidence_level', type: 'number', isOptional: true },
        { name: 'review_needed', type: 'boolean' },
        { name: 'review_reason', type: 'string', isOptional: true },
        { name: 'reviewed_at', type: 'number', isOptional: true },
        { name: 'course_id', type: 'string', isOptional: true },
        { name: 'course_session_id', type: 'string', isOptional: true },
        { name: 'theme_id', type: 'string', isOptional: true },
        { name: 'genre_id', type: 'string', isOptional: true },
        { name: 'session_type', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
      ],
    }),

    // ケーススタディ セッション
    tableSchema({
      name: 'case_study_sessions',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'problem_id', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'current_step', type: 'number', isOptional: true },
        { name: 'is_retry', type: 'boolean', isOptional: true },
        { name: 'hint_count', type: 'number', isOptional: true },
        { name: 'total_score', type: 'number', isOptional: true },
        { name: 'max_possible_score', type: 'number', isOptional: true },
        { name: 'score_percentage', type: 'number', isOptional: true },
        { name: 'scoring_result', type: 'string', isOptional: true }, // JSON
        { name: 'xp_earned', type: 'number', isOptional: true },
        { name: 'skp_earned', type: 'number', isOptional: true },
        { name: 'bonus_details', type: 'string', isOptional: true }, // JSON
        { name: 'total_time_seconds', type: 'number', isOptional: true },
        { name: 'started_at', type: 'number', isOptional: true },
        { name: 'completed_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // ケーススタディ ステップ詳細
    tableSchema({
      name: 'case_study_step_details',
      columns: [
        { name: 'session_id', type: 'string' },
        { name: 'step_id', type: 'string' },
        { name: 'quiz_answer_id', type: 'string' },
        { name: 'step_number', type: 'number' },
        { name: 'selected_choices', type: 'string', isOptional: true }, // JSON
        { name: 'reasoning_text', type: 'string', isOptional: true },
        { name: 'step_scoring', type: 'string', isOptional: true }, // JSON
        { name: 'step_started_at', type: 'number', isOptional: true },
        { name: 'step_answered_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
      ],
    }),

    // ケーススタディ 思考ログ
    tableSchema({
      name: 'case_study_thinking_logs',
      columns: [
        { name: 'session_id', type: 'string' },
        { name: 'step_number', type: 'number' },
        { name: 'action_type', type: 'string' },
        { name: 'action_data', type: 'string', isOptional: true }, // JSON
        { name: 'choices_at_action', type: 'string', isOptional: true }, // JSON
        { name: 'reasoning_length_at_action', type: 'number', isOptional: true },
        { name: 'time_since_step_start_ms', type: 'number', isOptional: true },
        { name: 'timestamp', type: 'number', isOptional: true },
      ],
    }),

    // 格言カード所持
    tableSchema({
      name: 'wisdom_card_collection',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'card_id', type: 'number' },
        { name: 'count', type: 'number', isOptional: true },
        { name: 'obtained_at', type: 'number', isOptional: true },
        { name: 'last_obtained_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
      ],
    }),

    // ナレッジカード所持
    tableSchema({
      name: 'user_knowledge_collection_v2',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'theme_id', type: 'string' },
        { name: 'obtained_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
      ],
    }),

    // ユーザーXP統計
    tableSchema({
      name: 'user_xp_stats_v2',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'total_xp', type: 'number' },
        { name: 'total_skp', type: 'number' },
        { name: 'current_level', type: 'number' },
        { name: 'quiz_xp', type: 'number' },
        { name: 'quiz_skp', type: 'number' },
        { name: 'course_xp', type: 'number' },
        { name: 'course_skp', type: 'number' },
        { name: 'bonus_xp', type: 'number' },
        { name: 'bonus_skp', type: 'number' },
        { name: 'streak_skp', type: 'number' },
        { name: 'case_study_xp', type: 'number', isOptional: true },
        { name: 'case_study_skp', type: 'number', isOptional: true },
        { name: 'quiz_sessions_completed', type: 'number' },
        { name: 'quiz_questions_answered', type: 'number' },
        { name: 'quiz_questions_correct', type: 'number' },
        { name: 'quiz_perfect_sessions', type: 'number' },
        { name: 'quiz_80plus_sessions', type: 'number' },
        { name: 'quiz_average_accuracy', type: 'number', isOptional: true },
        { name: 'quiz_learning_time_seconds', type: 'number', isOptional: true },
        { name: 'course_sessions_completed', type: 'number' },
        { name: 'course_completed', type: 'number', isOptional: true },
        { name: 'course_themes_completed', type: 'number', isOptional: true },
        { name: 'course_learning_time_seconds', type: 'number', isOptional: true },
        { name: 'case_study_sessions_completed', type: 'number', isOptional: true },
        { name: 'case_study_average_score', type: 'number', isOptional: true },
        { name: 'total_learning_time_seconds', type: 'number', isOptional: true },
        { name: 'badges_total', type: 'number' },
        { name: 'wisdom_cards_total', type: 'number' },
        { name: 'knowledge_cards_total', type: 'number' },
        { name: 'last_activity_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // コースセッション完了記録
    tableSchema({
      name: 'course_session_completions',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'session_id', type: 'string' },
        { name: 'course_id', type: 'string' },
        { name: 'genre_id', type: 'string' },
        { name: 'theme_id', type: 'string' },
        { name: 'category_id', type: 'string' },
        { name: 'subcategory_id', type: 'string' },
        { name: 'earned_xp', type: 'number' },
        { name: 'is_first_completion', type: 'boolean' },
        { name: 'session_quiz_correct', type: 'boolean' },
        { name: 'review_count', type: 'number' },
        { name: 'duration_seconds', type: 'number', isOptional: true },
        { name: 'completion_time', type: 'number' },
        { name: 'session_start_time', type: 'number', isOptional: true },
        { name: 'session_end_time', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
      ],
    }),

    // 選ばれし課題（ユーザーのダッシュボード選択）
    tableSchema({
      name: 'user_challenge_selections',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'slot_type', type: 'string' }, // 'course' | 'quiz_pack' | 'case_study'
        { name: 'content_id', type: 'string' },
        { name: 'content_name', type: 'string', isOptional: true },
        { name: 'selected_by', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number', isOptional: true },
      ],
    }),

    // 事前生成クイズセット
    tableSchema({
      name: 'precomputed_quiz_sets',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'quiz_type', type: 'string' }, // 'business-ai' | 'self-personalized' | 'review'
        { name: 'question_ids', type: 'string' }, // JSON array of numeric IDs
        { name: 'analysis_data', type: 'string', isOptional: true }, // JSON
        { name: 'used_at', type: 'number', isOptional: true },
        { name: 'expires_at', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
      ],
    }),

    // 日別XP記録
    tableSchema({
      name: 'daily_xp_records',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'date', type: 'string' },
        { name: 'total_xp_earned', type: 'number' },
        { name: 'quiz_xp_earned', type: 'number' },
        { name: 'course_xp_earned', type: 'number' },
        { name: 'bonus_xp_earned', type: 'number' },
        { name: 'case_study_xp_earned', type: 'number', isOptional: true },
        { name: 'quiz_sessions', type: 'number' },
        { name: 'course_sessions', type: 'number' },
        { name: 'case_study_sessions', type: 'number', isOptional: true },
        { name: 'study_time_minutes', type: 'number' },
        { name: 'total_time_seconds', type: 'number', isOptional: true },
        { name: 'quiz_time_seconds', type: 'number', isOptional: true },
        { name: 'course_time_seconds', type: 'number', isOptional: true },
        { name: 'case_study_time_seconds', type: 'number', isOptional: true },
        { name: 'hourly_efficiency_data', type: 'string', isOptional: true }, // JSON
        { name: 'learning_quality_score', type: 'number', isOptional: true },
        { name: 'peak_study_hour', type: 'number', isOptional: true },
        { name: 'created_at', type: 'number', isOptional: true },
      ],
    }),
  ],
})
