export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          activation_date: string | null
          category_id: string
          color: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          is_visible: boolean
          name: string
          type: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activation_date?: string | null
          category_id: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_visible?: boolean
          name: string
          type: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activation_date?: string | null
          category_id?: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_visible?: boolean
          name?: string
          type?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      course_completions: {
        Row: {
          badges_awarded: number | null
          completed_sessions: number
          completed_themes: number
          completion_bonus_xp: number
          completion_rate: number
          course_id: string
          created_at: string | null
          first_completion_time: string
          id: string
          total_earned_xp: number
          total_session_xp: number
          total_sessions: number
          total_themes: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          badges_awarded?: number | null
          completed_sessions: number
          completed_themes: number
          completion_bonus_xp?: number
          completion_rate?: number
          course_id: string
          created_at?: string | null
          first_completion_time?: string
          id?: string
          total_earned_xp?: number
          total_session_xp?: number
          total_sessions: number
          total_themes: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          badges_awarded?: number | null
          completed_sessions?: number
          completed_themes?: number
          completion_bonus_xp?: number
          completion_rate?: number
          course_id?: string
          created_at?: string | null
          first_completion_time?: string
          id?: string
          total_earned_xp?: number
          total_session_xp?: number
          total_sessions?: number
          total_themes?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      course_session_completions: {
        Row: {
          category_id: string
          completion_time: string
          course_id: string
          created_at: string | null
          earned_xp: number
          genre_id: string
          id: string
          is_first_completion: boolean
          review_count: number
          session_id: string
          session_quiz_correct: boolean
          subcategory_id: string
          theme_id: string
          user_id: string
        }
        Insert: {
          category_id: string
          completion_time?: string
          course_id: string
          created_at?: string | null
          earned_xp?: number
          genre_id: string
          id?: string
          is_first_completion?: boolean
          review_count?: number
          session_id: string
          session_quiz_correct?: boolean
          subcategory_id: string
          theme_id: string
          user_id: string
        }
        Update: {
          category_id?: string
          completion_time?: string
          course_id?: string
          created_at?: string | null
          earned_xp?: number
          genre_id?: string
          id?: string
          is_first_completion?: boolean
          review_count?: number
          session_id?: string
          session_quiz_correct?: boolean
          subcategory_id?: string
          theme_id?: string
          user_id?: string
        }
        Relationships: []
      }
      course_theme_completions: {
        Row: {
          category_id: string
          completed_sessions: number
          completion_rate: number
          course_id: string
          created_at: string | null
          first_completion_time: string
          genre_id: string
          id: string
          knowledge_cards_awarded: number | null
          subcategory_id: string
          theme_id: string
          total_sessions: number
          user_id: string
        }
        Insert: {
          category_id: string
          completed_sessions: number
          completion_rate?: number
          course_id: string
          created_at?: string | null
          first_completion_time?: string
          genre_id: string
          id?: string
          knowledge_cards_awarded?: number | null
          subcategory_id: string
          theme_id: string
          total_sessions: number
          user_id: string
        }
        Update: {
          category_id?: string
          completed_sessions?: number
          completion_rate?: number
          course_id?: string
          created_at?: string | null
          first_completion_time?: string
          genre_id?: string
          id?: string
          knowledge_cards_awarded?: number | null
          subcategory_id?: string
          theme_id?: string
          total_sessions?: number
          user_id?: string
        }
        Relationships: []
      }
      daily_xp_records: {
        Row: {
          bonus_xp_earned: number
          course_sessions: number
          course_time_seconds: number | null
          course_xp_earned: number
          created_at: string | null
          date: string
          id: string
          quiz_sessions: number
          quiz_time_seconds: number | null
          quiz_xp_earned: number
          study_time_minutes: number
          total_time_seconds: number | null
          total_xp_earned: number
          user_id: string
        }
        Insert: {
          bonus_xp_earned?: number
          course_sessions?: number
          course_time_seconds?: number | null
          course_xp_earned?: number
          created_at?: string | null
          date: string
          id?: string
          quiz_sessions?: number
          quiz_time_seconds?: number | null
          quiz_xp_earned?: number
          study_time_minutes?: number
          total_time_seconds?: number | null
          total_xp_earned?: number
          user_id: string
        }
        Update: {
          bonus_xp_earned?: number
          course_sessions?: number
          course_time_seconds?: number | null
          course_xp_earned?: number
          created_at?: string | null
          date?: string
          id?: string
          quiz_sessions?: number
          quiz_time_seconds?: number | null
          quiz_xp_earned?: number
          study_time_minutes?: number
          total_time_seconds?: number | null
          total_xp_earned?: number
          user_id?: string
        }
        Relationships: []
      }
      knowledge_card_collection: {
        Row: {
          card_id: number
          count: number | null
          created_at: string | null
          id: string
          last_obtained_at: string | null
          obtained_at: string | null
          user_id: string | null
        }
        Insert: {
          card_id: number
          count?: number | null
          created_at?: string | null
          id?: string
          last_obtained_at?: string | null
          obtained_at?: string | null
          user_id?: string | null
        }
        Update: {
          card_id?: number
          count?: number | null
          created_at?: string | null
          id?: string
          last_obtained_at?: string | null
          obtained_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      learning_courses: {
        Row: {
          badge_data: Json | null
          color: string
          created_at: string | null
          description: string
          difficulty: string
          display_order: number
          estimated_days: number
          icon: string
          id: string
          status: string
          title: string
          updated_at: string | null
        }
        Insert: {
          badge_data?: Json | null
          color: string
          created_at?: string | null
          description: string
          difficulty: string
          display_order?: number
          estimated_days: number
          icon: string
          id: string
          status?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          badge_data?: Json | null
          color?: string
          created_at?: string | null
          description?: string
          difficulty?: string
          display_order?: number
          estimated_days?: number
          icon?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      learning_genres: {
        Row: {
          badge_data: Json | null
          category_id: string
          course_id: string
          created_at: string | null
          description: string
          display_order: number
          estimated_days: number
          id: string
          subcategory_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          badge_data?: Json | null
          category_id: string
          course_id: string
          created_at?: string | null
          description: string
          display_order?: number
          estimated_days?: number
          id: string
          subcategory_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          badge_data?: Json | null
          category_id?: string
          course_id?: string
          created_at?: string | null
          description?: string
          display_order?: number
          estimated_days?: number
          id?: string
          subcategory_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_genres_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "learning_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_progress: {
        Row: {
          completed_at: string | null
          completion_percentage: number | null
          course_id: string
          created_at: string | null
          duration_seconds: number | null
          id: string
          progress_data: Json | null
          session_end_time: string | null
          session_id: string | null
          session_start_time: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          completion_percentage?: number | null
          course_id: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          progress_data?: Json | null
          session_end_time?: string | null
          session_id?: string | null
          session_start_time?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          completion_percentage?: number | null
          course_id?: string
          created_at?: string | null
          duration_seconds?: number | null
          id?: string
          progress_data?: Json | null
          session_end_time?: string | null
          session_id?: string | null
          session_start_time?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      learning_sessions: {
        Row: {
          created_at: string | null
          display_order: number
          estimated_minutes: number
          id: string
          session_type: string
          theme_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_order?: number
          estimated_minutes?: number
          id: string
          session_type: string
          theme_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_order?: number
          estimated_minutes?: number
          id?: string
          session_type?: string
          theme_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_sessions_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "learning_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_themes: {
        Row: {
          created_at: string | null
          description: string
          display_order: number
          estimated_minutes: number
          genre_id: string
          id: string
          reward_card_data: Json | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          display_order?: number
          estimated_minutes?: number
          genre_id: string
          id: string
          reward_card_data?: Json | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          display_order?: number
          estimated_minutes?: number
          genre_id?: string
          id?: string
          reward_card_data?: Json | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_themes_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "learning_genres"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_answers: {
        Row: {
          category_id: string
          course_id: string | null
          course_session_id: string | null
          created_at: string | null
          difficulty: string
          earned_xp: number
          genre_id: string | null
          id: string
          is_correct: boolean
          is_timeout: boolean
          question_id: string
          quiz_session_id: string | null
          session_type: string | null
          subcategory_id: string
          theme_id: string | null
          time_spent: number
          user_answer: number | null
        }
        Insert: {
          category_id: string
          course_id?: string | null
          course_session_id?: string | null
          created_at?: string | null
          difficulty: string
          earned_xp?: number
          genre_id?: string | null
          id?: string
          is_correct?: boolean
          is_timeout?: boolean
          question_id: string
          quiz_session_id?: string | null
          session_type?: string | null
          subcategory_id: string
          theme_id?: string | null
          time_spent?: number
          user_answer?: number | null
        }
        Update: {
          category_id?: string
          course_id?: string | null
          course_session_id?: string | null
          created_at?: string | null
          difficulty?: string
          earned_xp?: number
          genre_id?: string | null
          id?: string
          is_correct?: boolean
          is_timeout?: boolean
          question_id?: string
          quiz_session_id?: string | null
          session_type?: string | null
          subcategory_id?: string
          theme_id?: string | null
          time_spent?: number
          user_answer?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_answers_quiz_session_id_fkey"
            columns: ["quiz_session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          category_id: string
          correct_answer: number
          created_at: string | null
          difficulty: string | null
          explanation: string | null
          id: number
          is_deleted: boolean | null
          legacy_id: number
          option1: string
          option2: string
          option3: string
          option4: string
          question: string
          related_topics: Json | null
          source: string | null
          subcategory: string | null
          subcategory_id: string | null
          time_limit: number | null
          updated_at: string | null
        }
        Insert: {
          category_id: string
          correct_answer: number
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: number
          is_deleted?: boolean | null
          legacy_id: number
          option1: string
          option2: string
          option3: string
          option4: string
          question: string
          related_topics?: Json | null
          source?: string | null
          subcategory?: string | null
          subcategory_id?: string | null
          time_limit?: number | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          correct_answer?: number
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          id?: number
          is_deleted?: boolean | null
          legacy_id?: number
          option1?: string
          option2?: string
          option3?: string
          option4?: string
          question?: string
          related_topics?: Json | null
          source?: string | null
          subcategory?: string | null
          subcategory_id?: string | null
          time_limit?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      quiz_sessions: {
        Row: {
          accuracy_rate: number
          bonus_xp: number
          correct_answers: number
          created_at: string | null
          id: string
          session_end_time: string | null
          session_start_time: string
          status: string
          total_questions: number
          total_xp: number
          updated_at: string | null
          user_id: string
          wisdom_cards_awarded: number | null
        }
        Insert: {
          accuracy_rate?: number
          bonus_xp?: number
          correct_answers?: number
          created_at?: string | null
          id?: string
          session_end_time?: string | null
          session_start_time?: string
          status?: string
          total_questions?: number
          total_xp?: number
          updated_at?: string | null
          user_id: string
          wisdom_cards_awarded?: number | null
        }
        Update: {
          accuracy_rate?: number
          bonus_xp?: number
          correct_answers?: number
          created_at?: string | null
          id?: string
          session_end_time?: string | null
          session_start_time?: string
          status?: string
          total_questions?: number
          total_xp?: number
          updated_at?: string | null
          user_id?: string
          wisdom_cards_awarded?: number | null
        }
        Relationships: []
      }
      session_contents: {
        Row: {
          content: string
          content_type: string
          created_at: string | null
          display_order: number
          duration: number | null
          id: string
          session_id: string
          title: string | null
        }
        Insert: {
          content: string
          content_type: string
          created_at?: string | null
          display_order?: number
          duration?: number | null
          id: string
          session_id: string
          title?: string | null
        }
        Update: {
          content?: string
          content_type?: string
          created_at?: string | null
          display_order?: number
          duration?: number | null
          id?: string
          session_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_contents_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "learning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_quizzes: {
        Row: {
          correct_answer: number
          created_at: string | null
          display_order: number
          explanation: string
          id: string
          options: Json
          question: string
          quiz_type: string
          session_id: string
        }
        Insert: {
          correct_answer: number
          created_at?: string | null
          display_order?: number
          explanation: string
          id: string
          options: Json
          question: string
          quiz_type?: string
          session_id: string
        }
        Update: {
          correct_answer?: number
          created_at?: string | null
          display_order?: number
          explanation?: string
          id?: string
          options?: Json
          question?: string
          quiz_type?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_quizzes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "learning_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_levels: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          display_name: string
          display_order: number
          id: string
          name: string
          target_experience: string | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          display_order: number
          id: string
          name: string
          target_experience?: string | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          display_order?: number
          id?: string
          name?: string
          target_experience?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      skp_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          id: string
          source: string
          timestamp: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          id?: string
          source: string
          timestamp?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          id?: string
          source?: string
          timestamp?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      spaced_repetition_schedule: {
        Row: {
          category_id: string
          content_id: string
          content_type: string
          created_at: string | null
          difficulty_adjustment: number | null
          forgetting_curve_slope: number | null
          id: string
          initial_learning_date: string
          is_mastered: boolean | null
          last_review_date: string | null
          mastery_level: number | null
          next_review_date: string
          optimal_interval_days: number | null
          priority_score: number | null
          retention_strength: number | null
          review_count: number | null
          scheduled_by: string | null
          subcategory_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          content_id: string
          content_type: string
          created_at?: string | null
          difficulty_adjustment?: number | null
          forgetting_curve_slope?: number | null
          id?: string
          initial_learning_date: string
          is_mastered?: boolean | null
          last_review_date?: string | null
          mastery_level?: number | null
          next_review_date: string
          optimal_interval_days?: number | null
          priority_score?: number | null
          retention_strength?: number | null
          review_count?: number | null
          scheduled_by?: string | null
          subcategory_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          content_id?: string
          content_type?: string
          created_at?: string | null
          difficulty_adjustment?: number | null
          forgetting_curve_slope?: number | null
          id?: string
          initial_learning_date?: string
          is_mastered?: boolean | null
          last_review_date?: string | null
          mastery_level?: number | null
          next_review_date?: string
          optimal_interval_days?: number | null
          priority_score?: number | null
          retention_strength?: number | null
          review_count?: number | null
          scheduled_by?: string | null
          subcategory_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "spaced_repetition_schedule_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          activation_date: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          display_order: number
          icon: string | null
          id: string
          is_active: boolean
          is_visible: boolean
          name: string
          parent_category_id: string
          subcategory_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          activation_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_visible?: boolean
          name: string
          parent_category_id: string
          subcategory_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          activation_date?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          display_order?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          is_visible?: boolean
          name?: string
          parent_category_id?: string
          subcategory_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["category_id"]
          },
          {
            foreignKeyName: "subcategories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "category_stats"
            referencedColumns: ["category_id"]
          },
        ]
      }
      unified_learning_session_analytics: {
        Row: {
          accuracy_rate: number | null
          attention_breaks: number | null
          average_response_time_ms: number | null
          category_id: string
          cognitive_load_score: number | null
          completion_rate: number | null
          course_id: string | null
          course_session_id: string | null
          created_at: string | null
          day_of_week: number
          device_type: string | null
          difficulty_level: string
          duration_seconds: number
          energy_level_reported: number | null
          engagement_score: number | null
          flow_state_duration: number | null
          flow_state_index: number | null
          forgetting_curve_data: Json | null
          genre_id: string | null
          id: string
          interruption_count: number | null
          optimal_review_interval: number | null
          questions_correct: number | null
          questions_total: number | null
          quiz_session_id: string | null
          session_end_time: string
          session_start_time: string
          session_type: string
          spaced_repetition_due: string | null
          subcategory_id: string
          theme_id: string | null
          time_of_day: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy_rate?: number | null
          attention_breaks?: number | null
          average_response_time_ms?: number | null
          category_id: string
          cognitive_load_score?: number | null
          completion_rate?: number | null
          course_id?: string | null
          course_session_id?: string | null
          created_at?: string | null
          day_of_week: number
          device_type?: string | null
          difficulty_level: string
          duration_seconds: number
          energy_level_reported?: number | null
          engagement_score?: number | null
          flow_state_duration?: number | null
          flow_state_index?: number | null
          forgetting_curve_data?: Json | null
          genre_id?: string | null
          id?: string
          interruption_count?: number | null
          optimal_review_interval?: number | null
          questions_correct?: number | null
          questions_total?: number | null
          quiz_session_id?: string | null
          session_end_time: string
          session_start_time: string
          session_type: string
          spaced_repetition_due?: string | null
          subcategory_id: string
          theme_id?: string | null
          time_of_day: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy_rate?: number | null
          attention_breaks?: number | null
          average_response_time_ms?: number | null
          category_id?: string
          cognitive_load_score?: number | null
          completion_rate?: number | null
          course_id?: string | null
          course_session_id?: string | null
          created_at?: string | null
          day_of_week?: number
          device_type?: string | null
          difficulty_level?: string
          duration_seconds?: number
          energy_level_reported?: number | null
          engagement_score?: number | null
          flow_state_duration?: number | null
          flow_state_index?: number | null
          forgetting_curve_data?: Json | null
          genre_id?: string | null
          id?: string
          interruption_count?: number | null
          optimal_review_interval?: number | null
          questions_correct?: number | null
          questions_total?: number | null
          quiz_session_id?: string | null
          session_end_time?: string
          session_start_time?: string
          session_type?: string
          spaced_repetition_due?: string | null
          subcategory_id?: string
          theme_id?: string | null
          time_of_day?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unified_learning_session_analytics_quiz_session_id_fkey"
            columns: ["quiz_session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_learning_session_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_color: string | null
          badge_description: string | null
          badge_id: string
          badge_image_url: string | null
          badge_title: string
          course_id: string
          course_name: string
          created_at: string | null
          difficulty: string
          earned_at: string
          expires_at: string | null
          id: string
          user_id: string | null
          validity_period_months: number | null
        }
        Insert: {
          badge_color?: string | null
          badge_description?: string | null
          badge_id: string
          badge_image_url?: string | null
          badge_title: string
          course_id: string
          course_name: string
          created_at?: string | null
          difficulty: string
          earned_at: string
          expires_at?: string | null
          id?: string
          user_id?: string | null
          validity_period_months?: number | null
        }
        Update: {
          badge_color?: string | null
          badge_description?: string | null
          badge_id?: string
          badge_image_url?: string | null
          badge_title?: string
          course_id?: string
          course_name?: string
          created_at?: string | null
          difficulty?: string
          earned_at?: string
          expires_at?: string | null
          id?: string
          user_id?: string | null
          validity_period_months?: number | null
        }
        Relationships: []
      }
      user_category_xp_stats_v2: {
        Row: {
          category_id: string
          course_completions: number
          course_sessions_completed: number
          course_themes_completed: number
          course_xp: number
          created_at: string | null
          current_level: number
          id: string
          quiz_average_accuracy: number
          quiz_questions_answered: number
          quiz_questions_correct: number
          quiz_sessions_completed: number
          quiz_xp: number
          total_xp: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          course_completions?: number
          course_sessions_completed?: number
          course_themes_completed?: number
          course_xp?: number
          created_at?: string | null
          current_level?: number
          id?: string
          quiz_average_accuracy?: number
          quiz_questions_answered?: number
          quiz_questions_correct?: number
          quiz_sessions_completed?: number
          quiz_xp?: number
          total_xp?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          course_completions?: number
          course_sessions_completed?: number
          course_themes_completed?: number
          course_xp?: number
          created_at?: string | null
          current_level?: number
          id?: string
          quiz_average_accuracy?: number
          quiz_questions_answered?: number
          quiz_questions_correct?: number
          quiz_sessions_completed?: number
          quiz_xp?: number
          total_xp?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_learning_profiles: {
        Row: {
          attention_span_minutes: number | null
          chronotype: string | null
          cognitive_load_tolerance: number | null
          created_at: string | null
          difficulty_progression_rate: number | null
          fatigue_threshold: number | null
          flow_state_preference: Json | null
          forgetting_curve_parameters: Json | null
          last_analysis_update: string | null
          learning_style_type: string | null
          motivation_factors: string[] | null
          optimal_review_intervals: number[] | null
          optimal_session_length: number | null
          peak_performance_hours: number[] | null
          recovery_time_needed: number | null
          stress_indicators: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          attention_span_minutes?: number | null
          chronotype?: string | null
          cognitive_load_tolerance?: number | null
          created_at?: string | null
          difficulty_progression_rate?: number | null
          fatigue_threshold?: number | null
          flow_state_preference?: Json | null
          forgetting_curve_parameters?: Json | null
          last_analysis_update?: string | null
          learning_style_type?: string | null
          motivation_factors?: string[] | null
          optimal_review_intervals?: number[] | null
          optimal_session_length?: number | null
          peak_performance_hours?: number[] | null
          recovery_time_needed?: number | null
          stress_indicators?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          attention_span_minutes?: number | null
          chronotype?: string | null
          cognitive_load_tolerance?: number | null
          created_at?: string | null
          difficulty_progression_rate?: number | null
          fatigue_threshold?: number | null
          flow_state_preference?: Json | null
          forgetting_curve_parameters?: Json | null
          last_analysis_update?: string | null
          learning_style_type?: string | null
          motivation_factors?: string[] | null
          optimal_review_intervals?: number[] | null
          optimal_session_length?: number | null
          peak_performance_hours?: number[] | null
          recovery_time_needed?: number | null
          stress_indicators?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_learning_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_subcategory_xp_stats_v2: {
        Row: {
          category_id: string
          course_sessions_completed: number
          course_themes_completed: number
          course_xp: number
          created_at: string | null
          current_level: number
          id: string
          quiz_80plus_sessions: number
          quiz_average_accuracy: number
          quiz_perfect_sessions: number
          quiz_questions_answered: number
          quiz_questions_correct: number
          quiz_sessions_completed: number
          quiz_xp: number
          subcategory_id: string
          total_xp: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          course_sessions_completed?: number
          course_themes_completed?: number
          course_xp?: number
          created_at?: string | null
          current_level?: number
          id?: string
          quiz_80plus_sessions?: number
          quiz_average_accuracy?: number
          quiz_perfect_sessions?: number
          quiz_questions_answered?: number
          quiz_questions_correct?: number
          quiz_sessions_completed?: number
          quiz_xp?: number
          subcategory_id: string
          total_xp?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          course_sessions_completed?: number
          course_themes_completed?: number
          course_xp?: number
          created_at?: string | null
          current_level?: number
          id?: string
          quiz_80plus_sessions?: number
          quiz_average_accuracy?: number
          quiz_perfect_sessions?: number
          quiz_questions_answered?: number
          quiz_questions_correct?: number
          quiz_sessions_completed?: number
          quiz_xp?: number
          subcategory_id?: string
          total_xp?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_xp_stats_v2: {
        Row: {
          badges_total: number
          bonus_skp: number
          bonus_xp: number
          course_learning_time_seconds: number | null
          course_sessions_completed: number
          course_skp: number
          course_xp: number
          created_at: string | null
          current_level: number
          knowledge_cards_total: number
          last_activity_at: string | null
          quiz_average_accuracy: number | null
          quiz_learning_time_seconds: number | null
          quiz_questions_answered: number
          quiz_questions_correct: number
          quiz_sessions_completed: number
          quiz_skp: number
          quiz_xp: number
          streak_skp: number
          total_learning_time_seconds: number | null
          total_skp: number
          total_xp: number
          updated_at: string | null
          user_id: string
          wisdom_cards_total: number
        }
        Insert: {
          badges_total?: number
          bonus_skp?: number
          bonus_xp?: number
          course_learning_time_seconds?: number | null
          course_sessions_completed?: number
          course_skp?: number
          course_xp?: number
          created_at?: string | null
          current_level?: number
          knowledge_cards_total?: number
          last_activity_at?: string | null
          quiz_average_accuracy?: number | null
          quiz_learning_time_seconds?: number | null
          quiz_questions_answered?: number
          quiz_questions_correct?: number
          quiz_sessions_completed?: number
          quiz_skp?: number
          quiz_xp?: number
          streak_skp?: number
          total_learning_time_seconds?: number | null
          total_skp?: number
          total_xp?: number
          updated_at?: string | null
          user_id: string
          wisdom_cards_total?: number
        }
        Update: {
          badges_total?: number
          bonus_skp?: number
          bonus_xp?: number
          course_learning_time_seconds?: number | null
          course_sessions_completed?: number
          course_skp?: number
          course_xp?: number
          created_at?: string | null
          current_level?: number
          knowledge_cards_total?: number
          last_activity_at?: string | null
          quiz_average_accuracy?: number | null
          quiz_learning_time_seconds?: number | null
          quiz_questions_answered?: number
          quiz_questions_correct?: number
          quiz_sessions_completed?: number
          quiz_skp?: number
          quiz_xp?: number
          streak_skp?: number
          total_learning_time_seconds?: number | null
          total_skp?: number
          total_xp?: number
          updated_at?: string | null
          user_id?: string
          wisdom_cards_total?: number
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          current_level: number | null
          display_name: string | null
          email: string
          experience_level: string | null
          experience_years: number | null
          id: string
          industry: string | null
          interested_industries: Json | null
          job_title: string | null
          last_active: string | null
          last_profile_update: string | null
          learning_goals: Json | null
          learning_level: string | null
          learning_style: string | null
          name: string | null
          position_level: string | null
          profile_completed_at: string | null
          selected_categories: Json | null
          selected_industry_categories: Json | null
          skill_level: string | null
          streak: number | null
          total_xp: number | null
          updated_at: string | null
          weekly_goal: string | null
        }
        Insert: {
          created_at?: string | null
          current_level?: number | null
          display_name?: string | null
          email: string
          experience_level?: string | null
          experience_years?: number | null
          id: string
          industry?: string | null
          interested_industries?: Json | null
          job_title?: string | null
          last_active?: string | null
          last_profile_update?: string | null
          learning_goals?: Json | null
          learning_level?: string | null
          learning_style?: string | null
          name?: string | null
          position_level?: string | null
          profile_completed_at?: string | null
          selected_categories?: Json | null
          selected_industry_categories?: Json | null
          skill_level?: string | null
          streak?: number | null
          total_xp?: number | null
          updated_at?: string | null
          weekly_goal?: string | null
        }
        Update: {
          created_at?: string | null
          current_level?: number | null
          display_name?: string | null
          email?: string
          experience_level?: string | null
          experience_years?: number | null
          id?: string
          industry?: string | null
          interested_industries?: Json | null
          job_title?: string | null
          last_active?: string | null
          last_profile_update?: string | null
          learning_goals?: Json | null
          learning_level?: string | null
          learning_style?: string | null
          name?: string | null
          position_level?: string | null
          profile_completed_at?: string | null
          selected_categories?: Json | null
          selected_industry_categories?: Json | null
          skill_level?: string | null
          streak?: number | null
          total_xp?: number | null
          updated_at?: string | null
          weekly_goal?: string | null
        }
        Relationships: []
      }
      wisdom_card_collection: {
        Row: {
          card_id: number
          count: number | null
          created_at: string | null
          id: string
          last_obtained_at: string | null
          obtained_at: string | null
          user_id: string
        }
        Insert: {
          card_id: number
          count?: number | null
          created_at?: string | null
          id?: string
          last_obtained_at?: string | null
          obtained_at?: string | null
          user_id: string
        }
        Update: {
          card_id?: number
          count?: number | null
          created_at?: string | null
          id?: string
          last_obtained_at?: string | null
          obtained_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      xp_level_skp_settings: {
        Row: {
          created_at: string | null
          id: number
          is_active: boolean | null
          setting_category: string
          setting_description: string | null
          setting_key: string
          setting_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          setting_category: string
          setting_description?: string | null
          setting_key: string
          setting_value: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          is_active?: boolean | null
          setting_category?: string
          setting_description?: string | null
          setting_key?: string
          setting_value?: number
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      category_stats: {
        Row: {
          active_subcategory_count: number | null
          category_id: string | null
          is_active: boolean | null
          name: string | null
          subcategory_count: number | null
          type: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_to_spaced_repetition: {
        Args: {
          p_category_id: string
          p_content_id: string
          p_content_type: string
          p_initial_difficulty?: number
          p_subcategory_id: string
          p_user_id: string
        }
        Returns: string
      }
      analyze_category_forgetting_patterns: {
        Args: { p_user_id: string }
        Returns: {
          avg_retention_24h: number
          avg_retention_7d: number
          category_id: string
          category_name: string
          difficulty_factor: number
          recommended_review_frequency: number
        }[]
      }
      analyze_user_cognitive_load_patterns: {
        Args: { p_user_id: string }
        Returns: {
          avg_cognitive_load: number
          fatigue_indicators: Json
          optimal_session_length: number
          peak_load_threshold: number
          time_of_day: string
        }[]
      }
      analyze_user_flow_patterns: {
        Args: { p_user_id: string }
        Returns: {
          avg_accuracy: number
          avg_duration: number
          avg_flow_index: number
          condition_type: string
          condition_value: string
          flow_frequency_pct: number
          session_count: number
        }[]
      }
      calculate_cognitive_load_score: {
        Args: {
          p_accuracy_rate: number
          p_average_response_time_ms: number
          p_difficulty_level: string
          p_interruption_count?: number
          p_questions_total: number
          p_session_id: string
        }
        Returns: number
      }
      calculate_flow_state_index: {
        Args: {
          p_accuracy_rate: number
          p_content_difficulty: number
          p_engagement_indicators?: Json
          p_interruption_count?: number
          p_response_time_consistency: number
          p_session_duration_minutes: number
          p_user_skill_level: number
        }
        Returns: number
      }
      calculate_forgetting_curve_parameters: {
        Args: { p_user_id: string }
        Returns: {
          consolidation_factor: number
          decay_rate: number
          optimal_review_intervals: number[]
          retention_at_24h: number
          retention_at_7d: number
        }[]
      }
      calculate_next_review_date: {
        Args: {
          p_content_id: string
          p_performance_score: number
          p_response_time_ms?: number
          p_user_id: string
        }
        Returns: string
      }
      calculate_question_xp: {
        Args: { difficulty: string }
        Returns: number
      }
      calculate_user_course_time: {
        Args: { target_user_id: string }
        Returns: number
      }
      calculate_user_quiz_time: {
        Args: { target_user_id: string }
        Returns: number
      }
      detect_cognitive_overload: {
        Args: {
          p_current_session_id: string
          p_recent_accuracy: number
          p_response_times: number[]
          p_user_id: string
        }
        Returns: {
          break_duration_minutes: number
          overload_detected: boolean
          overload_severity: string
          reasoning: string
          recommended_action: string
        }[]
      }
      get_cognitive_load_recommendations: {
        Args: { p_user_id: string }
        Returns: {
          break_suggestions: string[]
          expected_cognitive_load: number
          optimal_difficulty: string
          preparation_tips: string[]
          recommended_time_slot: string
          session_duration_minutes: number
        }[]
      }
      get_due_reviews: {
        Args: { p_limit?: number; p_user_id: string }
        Returns: {
          category_id: string
          content_id: string
          content_type: string
          days_overdue: number
          id: string
          mastery_level: number
          priority_score: number
          subcategory_id: string
        }[]
      }
      get_flow_state_insights: {
        Args: { p_user_id: string }
        Returns: {
          avg_flow_index: number
          best_flow_conditions: Json
          flow_trend: string
          improvement_suggestions: string[]
          total_flow_sessions: number
        }[]
      }
      get_forgetting_curve_recommendations: {
        Args: { p_user_id: string }
        Returns: {
          category_id: string
          content_id: string
          content_type: string
          days_since_learning: number
          predicted_retention: number
          recommended_action: string
          urgency_score: number
        }[]
      }
      get_xp_setting: {
        Args: { setting_key: string }
        Returns: number
      }
      initialize_user_learning_profile: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      optimize_session_parameters: {
        Args: { p_user_id: string }
        Returns: {
          break_frequency: number
          cognitive_load_target: number
          max_questions_per_session: number
          optimal_session_duration: number
          recommended_difficulty: string
        }[]
      }
      predict_flow_opportunities: {
        Args: { p_user_id: string }
        Returns: {
          estimated_flow_probability: number
          opportunity_type: string
          optimal_difficulty: string
          preparation_tips: string[]
          recommended_time: string
          suggested_duration: number
        }[]
      }
      predict_retention_rate: {
        Args: {
          p_content_id: string
          p_days_since_learning: number
          p_user_id: string
        }
        Returns: number
      }
      process_course_completion_bonus: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: undefined
      }
      provide_flow_guidance: {
        Args: {
          p_current_accuracy: number
          p_current_session_id: string
          p_recent_response_times: number[]
          p_time_elapsed_minutes: number
          p_user_id: string
        }
        Returns: {
          adjustment_suggestion: string
          continue_recommendation: boolean
          current_flow_estimate: number
          flow_status: string
          recommended_action: string
        }[]
      }
      recalculate_daily_learning_time: {
        Args: { target_user_id: string }
        Returns: {
          course_time_seconds: number
          date_str: string
          quiz_time_seconds: number
          total_time_seconds: number
        }[]
      }
      update_course_session_stats: {
        Args: {
          p_category_id: string
          p_course_id: string
          p_genre_id: string
          p_is_first_completion?: boolean
          p_quiz_correct: boolean
          p_session_id: string
          p_subcategory_id: string
          p_theme_id: string
          p_user_id: string
        }
        Returns: undefined
      }
      update_flow_state_preferences: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      update_learning_profile_from_sessions: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      update_quiz_session_stats: {
        Args: { p_session_id: string; p_user_id: string }
        Returns: undefined
      }
      update_review_schedule: {
        Args: {
          p_content_id: string
          p_performance_score: number
          p_response_time_ms?: number
          p_user_id: string
        }
        Returns: undefined
      }
      update_session_cognitive_load: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      update_user_forgetting_profile: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      update_user_learning_time_stats: {
        Args: { target_user_id: string }
        Returns: {
          course_time: number
          quiz_time: number
          total_time: number
          updated_rows: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const

// Type aliases for easier use (from previous database-types.ts)
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

// Additional types
export type CategoryStats = Database['public']['Views']['category_stats']['Row']
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
