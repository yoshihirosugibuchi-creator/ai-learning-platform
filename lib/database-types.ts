// Complete Database type definitions for AI Learning Platform
// Generated based on actual database schema

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          name: string | null
          skill_level: string | null
          learning_style: string | null
          experience_level: number | null
          total_xp: number | null
          current_level: number | null
          streak: number | null
          last_active: string | null
          created_at: string
          updated_at: string
          display_name: string | null
          job_title: string | null
          position_level: string | null
          learning_level: string | null
          industry: string | null
          experience_years: number | null
          interested_industries: string[] | null
          learning_goals: string[] | null
          selected_categories: string[] | null
          selected_industry_categories: string[] | null
          weekly_goal: string | null
          profile_completed_at: string | null
          last_profile_update: string | null
        }
        Insert: {
          id?: string
          email: string
          name: string
          skill_level?: string
          learning_style?: string
          experience_level?: number
          total_xp?: number
          current_level?: number
          streak?: number
          last_active?: string
          created_at?: string
          updated_at?: string
          display_name?: string
          job_title?: string
          position_level?: string
          learning_level?: string
          industry?: string
          experience_years?: number
          interested_industries?: string[]
          learning_goals?: string[]
          selected_categories?: string[]
          selected_industry_categories?: string[]
          weekly_goal?: string
          profile_completed_at?: string
          last_profile_update?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          skill_level?: string
          learning_style?: string
          experience_level?: number
          total_xp?: number
          current_level?: number
          streak?: number
          last_active?: string
          created_at?: string
          updated_at?: string
          display_name?: string
          job_title?: string
          position_level?: string
          learning_level?: string
          industry?: string
          experience_years?: number
          interested_industries?: string[]
          learning_goals?: string[]
          selected_categories?: string[]
          selected_industry_categories?: string[]
          weekly_goal?: string
          profile_completed_at?: string
          last_profile_update?: string
        }
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          setting_key: string
          setting_value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          setting_key: string
          setting_value: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          setting_key?: string
          setting_value?: Json
          created_at?: string
          updated_at?: string
        }
      }
      // user_progress: レガシーテーブル（削除済み）
      // Note: 代わりにuser_category_xp_stats_v2を使用してください
      // quiz_results: レガシーテーブル（削除済み）
      // Note: 代わりにquiz_sessionsを使用してください
      quiz_answers: {
        Row: {
          id: string
          quiz_session_id: string
          question_id: string
          user_answer: number
          is_correct: boolean
          time_spent: number
          is_timeout: boolean
          category_id: string
          subcategory_id: string
          difficulty: string
          earned_xp: number
          created_at: string
          session_type: string
          course_session_id: string | null
          course_id: string | null
          theme_id: string | null
          genre_id: string | null
        }
        Insert: {
          id?: string
          quiz_session_id?: string
          question_id: string
          user_answer: number
          is_correct: boolean
          time_spent: number
          is_timeout: boolean
          category_id: string
          subcategory_id: string
          difficulty: string
          earned_xp: number
          created_at?: string
          session_type?: string
          course_session_id?: string
          course_id?: string
          theme_id?: string
          genre_id?: string
        }
        Update: {
          id?: string
          quiz_session_id?: string
          question_id?: string
          user_answer?: number
          is_correct?: boolean
          time_spent?: number
          is_timeout?: boolean
          category_id?: string
          subcategory_id?: string
          difficulty?: string
          earned_xp?: number
          created_at?: string
          session_type?: string
          course_session_id?: string
          course_id?: string
          theme_id?: string
          genre_id?: string
        }
      }
      categories: {
        Row: {
          id: string
          category_id: string
          name: string
          description: string
          type: string
          icon: string
          color: string
          display_order: number
          is_active: boolean
          is_visible: boolean
          activation_date: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          description?: string
          type?: string
          icon?: string
          color?: string
          display_order?: number
          is_active?: boolean
          is_visible?: boolean
          activation_date?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          description?: string
          type?: string
          icon?: string
          color?: string
          display_order?: number
          is_active?: boolean
          is_visible?: boolean
          activation_date?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
        }
      }
      subcategories: {
        Row: {
          id: string
          subcategory_id: string
          name: string
          description: string
          parent_category_id: string
          icon: string
          display_order: number
          is_active: boolean
          is_visible: boolean
          activation_date: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          subcategory_id: string
          name: string
          description?: string
          parent_category_id: string
          icon?: string
          display_order?: number
          is_active?: boolean
          is_visible?: boolean
          activation_date?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
        }
        Update: {
          id?: string
          subcategory_id?: string
          name?: string
          description?: string
          parent_category_id?: string
          icon?: string
          display_order?: number
          is_active?: boolean
          is_visible?: boolean
          activation_date?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string
          updated_by?: string
        }
      }
      learning_courses: {
        Row: {
          id: string
          title: string
          description: string
          estimated_days: number
          difficulty: string
          icon: string
          color: string
          display_order: number
          status: string
          badge_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          estimated_days?: number
          difficulty?: string
          icon?: string
          color?: string
          display_order?: number
          status?: string
          badge_data?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          estimated_days?: number
          difficulty?: string
          icon?: string
          color?: string
          display_order?: number
          status?: string
          badge_data?: Json
          created_at?: string
          updated_at?: string
        }
      }
      learning_progress: {
        Row: {
          id: string
          user_id: string
          course_id: string
          session_id: string
          progress_data: Json
          completion_percentage: number
          completed_at: string | null
          created_at: string
          updated_at: string
          session_start_time: string | null
          session_end_time: string | null
          duration_seconds: number
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          session_id: string
          progress_data?: Json
          completion_percentage?: number
          completed_at?: string
          created_at?: string
          updated_at?: string
          session_start_time?: string
          session_end_time?: string
          duration_seconds?: number
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          session_id?: string
          progress_data?: Json
          completion_percentage?: number
          completed_at?: string
          created_at?: string
          updated_at?: string
          session_start_time?: string
          session_end_time?: string
          duration_seconds?: number
        }
      }
      user_xp_stats_v2: {
        Row: {
          user_id: string
          total_xp: number
          quiz_xp: number
          course_xp: number
          bonus_xp: number
          quiz_sessions_completed: number
          course_sessions_completed: number
          quiz_questions_answered: number
          quiz_questions_correct: number
          quiz_average_accuracy: number
          wisdom_cards_total: number
          knowledge_cards_total: number
          badges_total: number
          current_level: number
          last_activity_at: string
          created_at: string
          updated_at: string
          total_skp: number
          quiz_skp: number
          course_skp: number
          bonus_skp: number
          streak_skp: number
          total_learning_time_seconds: number
          quiz_learning_time_seconds: number
          course_learning_time_seconds: number
        }
        Insert: {
          user_id: string
          total_xp?: number
          quiz_xp?: number
          course_xp?: number
          bonus_xp?: number
          quiz_sessions_completed?: number
          course_sessions_completed?: number
          quiz_questions_answered?: number
          quiz_questions_correct?: number
          quiz_average_accuracy?: number
          wisdom_cards_total?: number
          knowledge_cards_total?: number
          badges_total?: number
          current_level?: number
          last_activity_at?: string
          created_at?: string
          updated_at?: string
          total_skp?: number
          quiz_skp?: number
          course_skp?: number
          bonus_skp?: number
          streak_skp?: number
          total_learning_time_seconds?: number
          quiz_learning_time_seconds?: number
          course_learning_time_seconds?: number
        }
        Update: {
          user_id?: string
          total_xp?: number
          quiz_xp?: number
          course_xp?: number
          bonus_xp?: number
          quiz_sessions_completed?: number
          course_sessions_completed?: number
          quiz_questions_answered?: number
          quiz_questions_correct?: number
          quiz_average_accuracy?: number
          wisdom_cards_total?: number
          knowledge_cards_total?: number
          badges_total?: number
          current_level?: number
          last_activity_at?: string
          created_at?: string
          updated_at?: string
          total_skp?: number
          quiz_skp?: number
          course_skp?: number
          bonus_skp?: number
          streak_skp?: number
          total_learning_time_seconds?: number
          quiz_learning_time_seconds?: number
          course_learning_time_seconds?: number
        }
      }
      user_category_xp_stats_v2: {
        Row: {
          id: string
          user_id: string
          category_id: string
          total_xp: number
          quiz_xp: number
          course_xp: number
          current_level: number
          quiz_sessions_completed: number
          quiz_questions_answered: number
          quiz_questions_correct: number
          quiz_average_accuracy: number
          course_sessions_completed: number
          course_themes_completed: number
          course_completions: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          total_xp?: number
          quiz_xp?: number
          course_xp?: number
          current_level?: number
          quiz_sessions_completed?: number
          quiz_questions_answered?: number
          quiz_questions_correct?: number
          quiz_average_accuracy?: number
          course_sessions_completed?: number
          course_themes_completed?: number
          course_completions?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          total_xp?: number
          quiz_xp?: number
          course_xp?: number
          current_level?: number
          quiz_sessions_completed?: number
          quiz_questions_answered?: number
          quiz_questions_correct?: number
          quiz_average_accuracy?: number
          course_sessions_completed?: number
          course_themes_completed?: number
          course_completions?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_subcategory_xp_stats_v2: {
        Row: {
          id: string
          user_id: string
          category_id: string
          subcategory_id: string
          total_xp: number
          quiz_xp: number
          course_xp: number
          current_level: number
          quiz_sessions_completed: number
          quiz_questions_answered: number
          quiz_questions_correct: number
          quiz_average_accuracy: number
          quiz_perfect_sessions: number
          quiz_80plus_sessions: number
          course_sessions_completed: number
          course_themes_completed: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          category_id: string
          subcategory_id: string
          total_xp?: number
          quiz_xp?: number
          course_xp?: number
          current_level?: number
          quiz_sessions_completed?: number
          quiz_questions_answered?: number
          quiz_questions_correct?: number
          quiz_average_accuracy?: number
          quiz_perfect_sessions?: number
          quiz_80plus_sessions?: number
          course_sessions_completed?: number
          course_themes_completed?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          category_id?: string
          subcategory_id?: string
          total_xp?: number
          quiz_xp?: number
          course_xp?: number
          current_level?: number
          quiz_sessions_completed?: number
          quiz_questions_answered?: number
          quiz_questions_correct?: number
          quiz_average_accuracy?: number
          quiz_perfect_sessions?: number
          quiz_80plus_sessions?: number
          course_sessions_completed?: number
          course_themes_completed?: number
          created_at?: string
          updated_at?: string
        }
      }
      course_session_completions: {
        Row: {
          id: string
          user_id: string
          session_id: string
          course_id: string
          theme_id: string
          genre_id: string
          category_id: string
          subcategory_id: string
          is_first_completion: boolean
          session_quiz_correct: boolean
          earned_xp: number
          completion_time: string
          review_count: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id: string
          course_id: string
          theme_id: string
          genre_id: string
          category_id: string
          subcategory_id: string
          is_first_completion?: boolean
          session_quiz_correct?: boolean
          earned_xp?: number
          completion_time?: string
          review_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string
          course_id?: string
          theme_id?: string
          genre_id?: string
          category_id?: string
          subcategory_id?: string
          is_first_completion?: boolean
          session_quiz_correct?: boolean
          earned_xp?: number
          completion_time?: string
          review_count?: number
          created_at?: string
        }
      }
      course_completions: {
        Row: {
          id: string
          user_id: string
          course_id: string
          category_id: string
          subcategory_id: string
          completed_at: string
          completion_bonus_xp: number
          completion_bonus_skp: number
          certificate_awarded: boolean
          badges_awarded: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          category_id: string
          subcategory_id: string
          completed_at?: string
          completion_bonus_xp?: number
          completion_bonus_skp?: number
          certificate_awarded?: boolean
          badges_awarded?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          category_id?: string
          subcategory_id?: string
          completed_at?: string
          completion_bonus_xp?: number
          completion_bonus_skp?: number
          certificate_awarded?: boolean
          badges_awarded?: number
          created_at?: string
          updated_at?: string
        }
      }
      course_theme_completions: {
        Row: {
          id: string
          user_id: string
          course_id: string
          theme_id: string
          genre_id: string
          category_id: string
          subcategory_id: string
          completed_at: string
          knowledge_card_awarded: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          theme_id: string
          genre_id: string
          category_id: string
          subcategory_id: string
          completed_at?: string
          knowledge_card_awarded?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          theme_id?: string
          genre_id?: string
          category_id?: string
          subcategory_id?: string
          completed_at?: string
          knowledge_card_awarded?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      knowledge_card_collection: {
        Row: {
          id: string
          user_id: string
          card_id: string
          count: number
          obtained_at: string
          last_obtained_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          card_id: string
          count?: number
          obtained_at?: string
          last_obtained_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          card_id?: string
          count?: number
          obtained_at?: string
          last_obtained_at?: string
          created_at?: string
        }
      }
      user_badges: {
        Row: {
          id: string
          user_id: string
          course_id: string
          course_name: string
          badge_id: string
          badge_title: string
          badge_description: string
          badge_image_url: string
          badge_color: string
          difficulty: string
          earned_at: string
          expires_at: string | null
          validity_period_months: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          course_name?: string
          badge_id: string
          badge_title: string
          badge_description?: string
          badge_image_url?: string
          badge_color?: string
          difficulty?: string
          earned_at?: string
          expires_at?: string
          validity_period_months?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          course_name?: string
          badge_id?: string
          badge_title?: string
          badge_description?: string
          badge_image_url?: string
          badge_color?: string
          difficulty?: string
          earned_at?: string
          expires_at?: string
          validity_period_months?: number
          created_at?: string
        }
      }
      skp_transactions: {
        Row: {
          id: string
          user_id: string
          type: string
          amount: number
          source: string
          description: string
          timestamp: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          amount: number
          source: string
          description?: string
          timestamp?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          amount?: number
          source?: string
          description?: string
          timestamp?: string
          created_at?: string
        }
      }
      daily_xp_records: {
        Row: {
          id: string
          user_id: string
          date: string
          total_xp_earned: number
          quiz_xp_earned: number
          course_xp_earned: number
          bonus_xp_earned: number
          quiz_sessions: number
          course_sessions: number
          study_time_minutes: number
          created_at: string
          quiz_time_seconds: number
          course_time_seconds: number
          total_time_seconds: number
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          total_xp_earned?: number
          quiz_xp_earned?: number
          course_xp_earned?: number
          bonus_xp_earned?: number
          quiz_sessions?: number
          course_sessions?: number
          study_time_minutes?: number
          created_at?: string
          quiz_time_seconds?: number
          course_time_seconds?: number
          total_time_seconds?: number
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          total_xp_earned?: number
          quiz_xp_earned?: number
          course_xp_earned?: number
          bonus_xp_earned?: number
          quiz_sessions?: number
          course_sessions?: number
          study_time_minutes?: number
          created_at?: string
          quiz_time_seconds?: number
          course_time_seconds?: number
          total_time_seconds?: number
        }
      }
      xp_level_skp_settings: {
        Row: {
          id: string
          setting_category: string
          setting_key: string
          setting_value: number
          setting_description: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          setting_category: string
          setting_key: string
          setting_value: number
          setting_description?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          setting_category?: string
          setting_key?: string
          setting_value?: number
          setting_description?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      // category_progress: レガシーテーブル（削除済み）
      // Note: 代わりにuser_category_xp_stats_v2を使用してください
      category_stats: {
        Row: {
          category_id: string
          name: string
          type: string
          is_active: boolean
          subcategory_count: number
          active_subcategory_count: number
        }
        Insert: {
          category_id: string
          name: string
          type: string
          is_active?: boolean
          subcategory_count?: number
          active_subcategory_count?: number
        }
        Update: {
          category_id?: string
          name?: string
          type?: string
          is_active?: boolean
          subcategory_count?: number
          active_subcategory_count?: number
        }
      }
      learning_genres: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string
          category_id: string
          subcategory_id: string
          estimated_days: number
          display_order: number
          badge_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string
          category_id: string
          subcategory_id: string
          estimated_days?: number
          display_order?: number
          badge_data?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string
          category_id?: string
          subcategory_id?: string
          estimated_days?: number
          display_order?: number
          badge_data?: Json
          created_at?: string
          updated_at?: string
        }
      }
      learning_sessions: {
        Row: {
          id: string
          theme_id: string
          title: string
          estimated_minutes: number
          session_type: string
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          theme_id: string
          title: string
          estimated_minutes?: number
          session_type?: string
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          theme_id?: string
          title?: string
          estimated_minutes?: number
          session_type?: string
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
      learning_themes: {
        Row: {
          id: string
          genre_id: string
          title: string
          description: string
          estimated_minutes: number
          display_order: number
          reward_card_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          genre_id: string
          title: string
          description?: string
          estimated_minutes?: number
          display_order?: number
          reward_card_data?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          genre_id?: string
          title?: string
          description?: string
          estimated_minutes?: number
          display_order?: number
          reward_card_data?: Json
          created_at?: string
          updated_at?: string
        }
      }
      quiz_questions: {
        Row: {
          id: string
          legacy_id: number
          category_id: string
          subcategory: string
          subcategory_id: string
          question: string
          option1: string
          option2: string
          option3: string
          option4: string
          correct_answer: number
          explanation: string
          difficulty: string
          time_limit: number
          related_topics: string
          source: string
          is_deleted: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          legacy_id?: number
          category_id: string
          subcategory?: string
          subcategory_id: string
          question: string
          option1: string
          option2: string
          option3: string
          option4: string
          correct_answer: number
          explanation?: string
          difficulty?: string
          time_limit?: number
          related_topics?: string
          source?: string
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          legacy_id?: number
          category_id?: string
          subcategory?: string
          subcategory_id?: string
          question?: string
          option1?: string
          option2?: string
          option3?: string
          option4?: string
          correct_answer?: number
          explanation?: string
          difficulty?: string
          time_limit?: number
          related_topics?: string
          source?: string
          is_deleted?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      quiz_sessions: {
        Row: {
          id: string
          user_id: string
          session_start_time: string
          session_end_time: string
          total_questions: number
          correct_answers: number
          accuracy_rate: number
          status: string
          bonus_xp: number
          total_xp: number
          wisdom_cards_awarded: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_start_time?: string
          session_end_time?: string
          total_questions?: number
          correct_answers?: number
          accuracy_rate?: number
          status?: string
          bonus_xp?: number
          total_xp?: number
          wisdom_cards_awarded?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_start_time?: string
          session_end_time?: string
          total_questions?: number
          correct_answers?: number
          accuracy_rate?: number
          status?: string
          bonus_xp?: number
          total_xp?: number
          wisdom_cards_awarded?: number
          created_at?: string
          updated_at?: string
        }
      }
      session_contents: {
        Row: {
          id: string
          session_id: string
          content_type: string
          title: string
          content: string
          duration: number
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          content_type: string
          title: string
          content: string
          duration?: number
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          content_type?: string
          title?: string
          content?: string
          duration?: number
          display_order?: number
          created_at?: string
        }
      }
      session_quizzes: {
        Row: {
          id: string
          session_id: string
          question: string
          options: Json
          correct_answer: number
          explanation: string
          quiz_type: string
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          question: string
          options: Json
          correct_answer: number
          explanation?: string
          quiz_type?: string
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          question?: string
          options?: Json
          correct_answer?: number
          explanation?: string
          quiz_type?: string
          display_order?: number
          created_at?: string
        }
      }
      skill_levels: {
        Row: {
          id: string
          name: string
          display_name: string
          description: string
          target_experience: number
          display_order: number
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          description?: string
          target_experience?: number
          display_order?: number
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          description?: string
          target_experience?: number
          display_order?: number
          color?: string
          created_at?: string
          updated_at?: string
        }
      }
      wisdom_card_collection: {
        Row: {
          id: string
          user_id: string
          card_id: string
          count: number
          obtained_at: string
          last_obtained_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          card_id: string
          count?: number
          obtained_at?: string
          last_obtained_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          card_id?: string
          count?: number
          obtained_at?: string
          last_obtained_at?: string
          created_at?: string
        }
      }
      unified_learning_session_analytics: {
        Row: {
          id: string
          user_id: string
          session_type: string
          session_start_time: string
          session_end_time: string
          duration_seconds: number
          quiz_session_id: string | null
          course_session_id: string | null
          course_id: string | null
          theme_id: string | null
          genre_id: string | null
          category_id: string
          subcategory_id: string
          difficulty_level: string
          questions_total: number
          questions_correct: number
          accuracy_rate: number
          completion_rate: number
          average_response_time_ms: number
          cognitive_load_score: number
          attention_breaks: number
          flow_state_duration: number
          flow_state_index: number
          forgetting_curve_data: Json | null
          spaced_repetition_due: string | null
          optimal_review_interval: number | null
          time_of_day: string
          day_of_week: number
          device_type: string | null
          interruption_count: number
          energy_level_reported: number | null
          engagement_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_type: string
          session_start_time: string
          session_end_time: string
          duration_seconds: number
          quiz_session_id?: string | null
          course_session_id?: string | null
          course_id?: string | null
          theme_id?: string | null
          genre_id?: string | null
          category_id: string
          subcategory_id: string
          difficulty_level: string
          questions_total?: number
          questions_correct?: number
          accuracy_rate?: number
          completion_rate?: number
          average_response_time_ms?: number
          cognitive_load_score?: number
          attention_breaks?: number
          flow_state_duration?: number
          flow_state_index?: number
          forgetting_curve_data?: Json | null
          spaced_repetition_due?: string | null
          optimal_review_interval?: number | null
          time_of_day: string
          day_of_week: number
          device_type?: string | null
          interruption_count?: number
          energy_level_reported?: number | null
          engagement_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_type?: string
          session_start_time?: string
          session_end_time?: string
          duration_seconds?: number
          quiz_session_id?: string | null
          course_session_id?: string | null
          course_id?: string | null
          theme_id?: string | null
          genre_id?: string | null
          category_id?: string
          subcategory_id?: string
          difficulty_level?: string
          questions_total?: number
          questions_correct?: number
          accuracy_rate?: number
          completion_rate?: number
          average_response_time_ms?: number
          cognitive_load_score?: number
          attention_breaks?: number
          flow_state_duration?: number
          flow_state_index?: number
          forgetting_curve_data?: Json | null
          spaced_repetition_due?: string | null
          optimal_review_interval?: number | null
          time_of_day?: string
          day_of_week?: number
          device_type?: string | null
          interruption_count?: number
          energy_level_reported?: number | null
          engagement_score?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_learning_profiles: {
        Row: {
          user_id: string
          optimal_session_length: number
          peak_performance_hours: number[]
          fatigue_threshold: number
          recovery_time_needed: number
          difficulty_progression_rate: number
          learning_style_type: string
          chronotype: string
          cognitive_load_tolerance: number
          flow_state_preference: Json
          forgetting_curve_parameters: Json
          optimal_review_intervals: number[]
          attention_span_minutes: number
          motivation_factors: string[]
          stress_indicators: Json
          last_analysis_update: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          optimal_session_length?: number
          peak_performance_hours?: number[]
          fatigue_threshold?: number
          recovery_time_needed?: number
          difficulty_progression_rate?: number
          learning_style_type?: string
          chronotype?: string
          cognitive_load_tolerance?: number
          flow_state_preference?: Json
          forgetting_curve_parameters?: Json
          optimal_review_intervals?: number[]
          attention_span_minutes?: number
          motivation_factors?: string[]
          stress_indicators?: Json
          last_analysis_update?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          optimal_session_length?: number
          peak_performance_hours?: number[]
          fatigue_threshold?: number
          recovery_time_needed?: number
          difficulty_progression_rate?: number
          learning_style_type?: string
          chronotype?: string
          cognitive_load_tolerance?: number
          flow_state_preference?: Json
          forgetting_curve_parameters?: Json
          optimal_review_intervals?: number[]
          attention_span_minutes?: number
          motivation_factors?: string[]
          stress_indicators?: Json
          last_analysis_update?: string
          created_at?: string
          updated_at?: string
        }
      }
      spaced_repetition_schedule: {
        Row: {
          id: string
          user_id: string
          content_type: string
          content_id: string
          category_id: string
          subcategory_id: string
          initial_learning_date: string
          last_review_date: string | null
          next_review_date: string
          review_count: number
          mastery_level: number
          difficulty_adjustment: number
          retention_strength: number
          forgetting_curve_slope: number
          optimal_interval_days: number
          priority_score: number
          is_mastered: boolean
          scheduled_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_type: string
          content_id: string
          category_id: string
          subcategory_id: string
          initial_learning_date: string
          last_review_date?: string | null
          next_review_date: string
          review_count?: number
          mastery_level?: number
          difficulty_adjustment?: number
          retention_strength?: number
          forgetting_curve_slope?: number
          optimal_interval_days?: number
          priority_score?: number
          is_mastered?: boolean
          scheduled_by?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_type?: string
          content_id?: string
          category_id?: string
          subcategory_id?: string
          initial_learning_date?: string
          last_review_date?: string | null
          next_review_date?: string
          review_count?: number
          mastery_level?: number
          difficulty_adjustment?: number
          retention_strength?: number
          forgetting_curve_slope?: number
          optimal_interval_days?: number
          priority_score?: number
          is_mastered?: boolean
          scheduled_by?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      count_theme_sessions: {
        Args: {
          course_id: string
          theme_id: string
        }
        Returns: number
      }
      count_course_themes: {
        Args: {
          course_id: string
        }
        Returns: number
      }
      calculate_learning_streak: {
        Args: {
          p_user_id: string
        }
        Returns: {
          current_streak: number
          new_bonus_amount: number
        }
      }
    }
  }
}

// Type aliases for easier use
export type CourseCompletion = Database['public']['Tables']['course_completions']['Row']
export type CourseThemeCompletion = Database['public']['Tables']['course_theme_completions']['Row']
export type KnowledgeCardCollection = Database['public']['Tables']['knowledge_card_collection']['Row']
export type UserBadge = Database['public']['Tables']['user_badges']['Row']
export type UserXPStatsV2 = Database['public']['Tables']['user_xp_stats_v2']['Row']
export type SKPTransaction = Database['public']['Tables']['skp_transactions']['Row']
export type CourseSessionCompletion = Database['public']['Tables']['course_session_completions']['Row']

// Learning structure types
export type LearningGenre = Database['public']['Tables']['learning_genres']['Row']
export type LearningTheme = Database['public']['Tables']['learning_themes']['Row']
export type LearningSession = Database['public']['Tables']['learning_sessions']['Row']

// Quiz types
export type QuizQuestion = Database['public']['Tables']['quiz_questions']['Row']
export type QuizSession = Database['public']['Tables']['quiz_sessions']['Row']
export type SessionContent = Database['public']['Tables']['session_contents']['Row']
export type SessionQuiz = Database['public']['Tables']['session_quizzes']['Row']

// Additional types
export type CategoryStats = Database['public']['Tables']['category_stats']['Row']
export type SkillLevel = Database['public']['Tables']['skill_levels']['Row']
export type WisdomCardCollection = Database['public']['Tables']['wisdom_card_collection']['Row']

// Insert types
export type CourseCompletionInsert = Database['public']['Tables']['course_completions']['Insert']
export type CourseThemeCompletionInsert = Database['public']['Tables']['course_theme_completions']['Insert']
export type KnowledgeCardCollectionInsert = Database['public']['Tables']['knowledge_card_collection']['Insert']
export type UserBadgeInsert = Database['public']['Tables']['user_badges']['Insert']
export type UserXPStatsV2Update = Database['public']['Tables']['user_xp_stats_v2']['Update']
export type SKPTransactionInsert = Database['public']['Tables']['skp_transactions']['Insert']

// Additional insert types
export type QuizQuestionInsert = Database['public']['Tables']['quiz_questions']['Insert']
export type QuizSessionInsert = Database['public']['Tables']['quiz_sessions']['Insert']
export type WisdomCardCollectionInsert = Database['public']['Tables']['wisdom_card_collection']['Insert']

// Unified Learning Analytics types
export type UnifiedLearningSessionAnalytics = Database['public']['Tables']['unified_learning_session_analytics']['Row']
export type UnifiedLearningSessionAnalyticsInsert = Database['public']['Tables']['unified_learning_session_analytics']['Insert']
export type UnifiedLearningSessionAnalyticsUpdate = Database['public']['Tables']['unified_learning_session_analytics']['Update']

// User Learning Profile types
export type UserLearningProfile = Database['public']['Tables']['user_learning_profiles']['Row']
export type UserLearningProfileInsert = Database['public']['Tables']['user_learning_profiles']['Insert']
export type UserLearningProfileUpdate = Database['public']['Tables']['user_learning_profiles']['Update']

// Spaced Repetition Schedule types
export type SpacedRepetitionSchedule = Database['public']['Tables']['spaced_repetition_schedule']['Row']
export type SpacedRepetitionScheduleInsert = Database['public']['Tables']['spaced_repetition_schedule']['Insert']
export type SpacedRepetitionScheduleUpdate = Database['public']['Tables']['spaced_repetition_schedule']['Update']