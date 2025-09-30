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
      category_progress: {
        Row: {
          category_id: string
          correct_answers: number | null
          created_at: string | null
          current_level: number | null
          id: string
          last_answered_at: string | null
          total_answers: number | null
          total_xp: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          category_id: string
          correct_answers?: number | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          last_answered_at?: string | null
          total_answers?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          category_id?: string
          correct_answers?: number | null
          created_at?: string | null
          current_level?: number | null
          id?: string
          last_answered_at?: string | null
          total_answers?: number | null
          total_xp?: number | null
          updated_at?: string | null
          user_id?: string | null
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
      detailed_quiz_data: {
        Row: {
          category: string
          confidence_level: number | null
          correct_answer: string
          created_at: string | null
          difficulty: string | null
          id: string
          is_correct: boolean
          question_id: string
          question_text: string
          quiz_result_id: string | null
          response_time: number
          selected_answer: string
          user_id: string | null
        }
        Insert: {
          category: string
          confidence_level?: number | null
          correct_answer: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          is_correct: boolean
          question_id: string
          question_text: string
          quiz_result_id?: string | null
          response_time: number
          selected_answer: string
          user_id?: string | null
        }
        Update: {
          category?: string
          confidence_level?: number | null
          correct_answer?: string
          created_at?: string | null
          difficulty?: string | null
          id?: string
          is_correct?: boolean
          question_id?: string
          question_text?: string
          quiz_result_id?: string | null
          response_time?: number
          selected_answer?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detailed_quiz_data_quiz_result_id_fkey"
            columns: ["quiz_result_id"]
            isOneToOne: false
            referencedRelation: "quiz_results"
            referencedColumns: ["id"]
          },
        ]
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
      quiz_results: {
        Row: {
          answers: Json
          category_id: string
          completed_at: string | null
          created_at: string
          id: string
          questions: Json
          score: number
          subcategory_id: string | null
          time_taken: number
          total_questions: number
          user_id: string
        }
        Insert: {
          answers: Json
          category_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          questions: Json
          score: number
          subcategory_id?: string | null
          time_taken: number
          total_questions: number
          user_id?: string
        }
        Update: {
          answers?: Json
          category_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          questions?: Json
          score?: number
          subcategory_id?: string | null
          time_taken?: number
          total_questions?: number
          user_id?: string
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
      user_category_xp_stats: {
        Row: {
          category_id: string
          course_completions: number
          course_sessions_completed: number
          course_themes_completed: number
          course_xp: number
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
      user_progress: {
        Row: {
          category_id: string
          correct_answers: number | null
          created_at: string | null
          id: string
          last_accessed: string | null
          subcategory_id: string | null
          total_attempts: number | null
          user_id: string
        }
        Insert: {
          category_id: string
          correct_answers?: number | null
          created_at?: string | null
          id?: string
          last_accessed?: string | null
          subcategory_id?: string | null
          total_attempts?: number | null
          user_id: string
        }
        Update: {
          category_id?: string
          correct_answers?: number | null
          created_at?: string | null
          id?: string
          last_accessed?: string | null
          subcategory_id?: string | null
          total_attempts?: number | null
          user_id?: string
        }
        Relationships: []
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
      user_subcategory_xp_stats: {
        Row: {
          category_id: string
          course_sessions_completed: number
          course_themes_completed: number
          course_xp: number
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
      user_xp_stats: {
        Row: {
          badges_total: number
          bonus_xp: number
          course_completions: number
          course_sessions_completed: number
          course_themes_completed: number
          course_xp: number
          current_level: number
          knowledge_cards_total: number
          last_activity_at: string | null
          quiz_80plus_sessions: number
          quiz_average_accuracy: number
          quiz_perfect_sessions: number
          quiz_questions_answered: number
          quiz_questions_correct: number
          quiz_sessions_completed: number
          quiz_xp: number
          total_xp: number
          updated_at: string | null
          user_id: string
          wisdom_cards_total: number
        }
        Insert: {
          badges_total?: number
          bonus_xp?: number
          course_completions?: number
          course_sessions_completed?: number
          course_themes_completed?: number
          course_xp?: number
          current_level?: number
          knowledge_cards_total?: number
          last_activity_at?: string | null
          quiz_80plus_sessions?: number
          quiz_average_accuracy?: number
          quiz_perfect_sessions?: number
          quiz_questions_answered?: number
          quiz_questions_correct?: number
          quiz_sessions_completed?: number
          quiz_xp?: number
          total_xp?: number
          updated_at?: string | null
          user_id: string
          wisdom_cards_total?: number
        }
        Update: {
          badges_total?: number
          bonus_xp?: number
          course_completions?: number
          course_sessions_completed?: number
          course_themes_completed?: number
          course_xp?: number
          current_level?: number
          knowledge_cards_total?: number
          last_activity_at?: string | null
          quiz_80plus_sessions?: number
          quiz_average_accuracy?: number
          quiz_perfect_sessions?: number
          quiz_questions_answered?: number
          quiz_questions_correct?: number
          quiz_sessions_completed?: number
          quiz_xp?: number
          total_xp?: number
          updated_at?: string | null
          user_id?: string
          wisdom_cards_total?: number
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
      xp_settings: {
        Row: {
          setting_description: string | null
          setting_key: string
          setting_type: string | null
          setting_value: string
          updated_at: string | null
        }
        Insert: {
          setting_description?: string | null
          setting_key: string
          setting_type?: string | null
          setting_value: string
          updated_at?: string | null
        }
        Update: {
          setting_description?: string | null
          setting_key?: string
          setting_type?: string | null
          setting_value?: string
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
      get_xp_setting: {
        Args: { setting_key: string }
        Returns: number
      }
      process_course_completion_bonus: {
        Args: { p_course_id: string; p_user_id: string }
        Returns: undefined
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
      update_quiz_session_stats: {
        Args: { p_session_id: string; p_user_id: string }
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
      calculate_learning_streak: {
        Args: { p_user_id: string }
        Returns: {
          current_streak: number
          new_bonus_amount: number
        }
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

// Type aliases for easier use (added for compatibility)
export type CourseCompletion = Database['public']['Tables']['course_completions']['Row']
export type CourseThemeCompletion = Database['public']['Tables']['course_theme_completions']['Row']
export type KnowledgeCardCollection = Database['public']['Tables']['knowledge_card_collection']['Row']
export type UserBadge = Database['public']['Tables']['user_badges']['Row']
export type UserXPStatsV2 = Database['public']['Tables']['user_xp_stats_v2']['Row']
export type SKPTransaction = Database['public']['Tables']['skp_transactions']['Row']
export type CourseSessionCompletion = Database['public']['Tables']['course_session_completions']['Row']

// Insert types
export type CourseCompletionInsert = Database['public']['Tables']['course_completions']['Insert']
export type CourseThemeCompletionInsert = Database['public']['Tables']['course_theme_completions']['Insert']
export type KnowledgeCardCollectionInsert = Database['public']['Tables']['knowledge_card_collection']['Insert']
export type UserBadgeInsert = Database['public']['Tables']['user_badges']['Insert']
export type UserXPStatsV2Update = Database['public']['Tables']['user_xp_stats_v2']['Update']
export type SKPTransactionInsert = Database['public']['Tables']['skp_transactions']['Insert']
