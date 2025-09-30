// Simplified Database types for testing
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
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
          created_by: string
          updated_by: string
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
          created_by: string
          updated_by: string
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
    }
  }
}