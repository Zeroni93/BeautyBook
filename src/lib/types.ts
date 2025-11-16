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
      admin_users: {
        Row: {
          created_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string | null
          diff: Json | null
          id: string
          target_id: string
          target_table: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string | null
          diff?: Json | null
          id?: string
          target_id: string
          target_table: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string | null
          diff?: Json | null
          id?: string
          target_id?: string
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      availability_exceptions: {
        Row: {
          created_at: string | null
          date: string
          end_time: string | null
          id: string
          is_open: boolean | null
          note: string | null
          provider_id: string
          start_time: string | null
        }
        Insert: {
          created_at?: string | null
          date: string
          end_time?: string | null
          id?: string
          is_open?: boolean | null
          note?: string | null
          provider_id: string
          start_time?: string | null
        }
        Update: {
          created_at?: string | null
          date?: string
          end_time?: string | null
          id?: string
          is_open?: boolean | null
          note?: string | null
          provider_id?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "availability_exceptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["provider_id"]
          }
        ]
      }
      availability_rules: {
        Row: {
          buffer_minutes: number | null
          created_at: string | null
          end_time: string
          id: string
          is_active: boolean | null
          provider_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          buffer_minutes?: number | null
          created_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          provider_id: string
          start_time: string
          weekday: number
        }
        Update: {
          buffer_minutes?: number | null
          created_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          provider_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_rules_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["provider_id"]
          }
        ]
      }
      bookings: {
        Row: {
          cancellation_reason: string | null
          client_id: string
          created_at: string | null
          end_time: string
          id: string
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          platform_fee_cents: number
          provider_id: string
          service_id: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"] | null
          tax_cents: number | null
          tip_cents: number | null
          timezone: string
          total_price_cents: number
          updated_at: string | null
        }
        Insert: {
          cancellation_reason?: string | null
          client_id: string
          created_at?: string | null
          end_time: string
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          platform_fee_cents: number
          provider_id: string
          service_id: string
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          tax_cents?: number | null
          tip_cents?: number | null
          timezone: string
          total_price_cents: number
          updated_at?: string | null
        }
        Update: {
          cancellation_reason?: string | null
          client_id?: string
          created_at?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          platform_fee_cents?: number
          provider_id?: string
          service_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"] | null
          tax_cents?: number | null
          tip_cents?: number | null
          timezone?: string
          total_price_cents?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["provider_id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          }
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          height: number | null
          id: string
          is_public: boolean | null
          provider_id: string
          size_bytes: number
          storage_path: string
          type: Database["public"]["Enums"]["media_type"]
          width: number | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          height?: number | null
          id?: string
          is_public?: boolean | null
          provider_id: string
          size_bytes: number
          storage_path: string
          type: Database["public"]["Enums"]["media_type"]
          width?: number | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          height?: number | null
          id?: string
          is_public?: boolean | null
          provider_id?: string
          size_bytes?: number
          storage_path?: string
          type?: Database["public"]["Enums"]["media_type"]
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["provider_id"]
          }
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          booking_id: string
          created_at: string | null
          currency: string | null
          id: string
          refund_amount_cents: number | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_charge_id: string | null
          stripe_payment_intent_id: string
        }
        Insert: {
          amount_cents: number
          booking_id: string
          created_at?: string | null
          currency?: string | null
          id?: string
          refund_amount_cents?: number | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_charge_id?: string | null
          stripe_payment_intent_id: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          refund_amount_cents?: number | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          }
        ]
      }
      payouts: {
        Row: {
          amount_cents: number
          booking_id: string
          created_at: string | null
          currency: string | null
          id: string
          provider_id: string
          status: string
          stripe_transfer_id: string
        }
        Insert: {
          amount_cents: number
          booking_id: string
          created_at?: string | null
          currency?: string | null
          id?: string
          provider_id: string
          status: string
          stripe_transfer_id: string
        }
        Update: {
          amount_cents?: number
          booking_id?: string
          created_at?: string | null
          currency?: string | null
          id?: string
          provider_id?: string
          status?: string
          stripe_transfer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["provider_id"]
          }
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string
          locale: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name: string
          locale?: string | null
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string
          locale?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          stripe_customer_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      provider_profiles: {
        Row: {
          address_line1: string
          address_line2: string | null
          allow_double_booking: boolean | null
          bio: string | null
          business_name: string
          cancellation_fee_bps: number | null
          cancellation_window_hours: number | null
          city: string
          created_at: string | null
          hero_image_url: string | null
          is_verified: boolean | null
          lat: number | null
          lead_time_hours: number | null
          lng: number | null
          max_future_days: number | null
          no_show_fee_bps: number | null
          provider_id: string
          state: string
          stripe_connect_id: string | null
          subscription_current_period_end: string | null
          subscription_price_id: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"] | null
          updated_at: string | null
          zip: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          allow_double_booking?: boolean | null
          bio?: string | null
          business_name: string
          cancellation_fee_bps?: number | null
          cancellation_window_hours?: number | null
          city: string
          created_at?: string | null
          hero_image_url?: string | null
          is_verified?: boolean | null
          lat?: number | null
          lead_time_hours?: number | null
          lng?: number | null
          max_future_days?: number | null
          no_show_fee_bps?: number | null
          provider_id: string
          state: string
          stripe_connect_id?: string | null
          subscription_current_period_end?: string | null
          subscription_price_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string | null
          zip: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          allow_double_booking?: boolean | null
          bio?: string | null
          business_name?: string
          cancellation_fee_bps?: number | null
          cancellation_window_hours?: number | null
          city?: string
          created_at?: string | null
          hero_image_url?: string | null
          is_verified?: boolean | null
          lat?: number | null
          lead_time_hours?: number | null
          lng?: number | null
          max_future_days?: number | null
          no_show_fee_bps?: number | null
          provider_id?: string
          state?: string
          stripe_connect_id?: string | null
          subscription_current_period_end?: string | null
          subscription_price_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string | null
          zip?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_profiles_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          id: string
          reason: string
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"] | null
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"] | null
          target_id: string
          target_type: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"] | null
          target_id?: string
          target_type?: Database["public"]["Enums"]["target_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          created_at: string | null
          id: string
          is_reported: boolean | null
          rating: number
          reviewer_id: string
          reviewee_id: string
          text: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string | null
          id?: string
          is_reported?: boolean | null
          rating: number
          reviewer_id: string
          reviewee_id: string
          text?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string | null
          id?: string
          is_reported?: boolean | null
          rating?: number
          reviewer_id?: string
          reviewee_id?: string
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          }
        ]
      }
      services: {
        Row: {
          category_id: string
          created_at: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean | null
          price_cents: number
          provider_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          category_id: string
          created_at?: string | null
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean | null
          price_cents: number
          provider_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          price_cents?: number
          provider_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "provider_profiles"
            referencedColumns: ["provider_id"]
          }
        ]
      }
      user_settings: {
        Row: {
          id: string
          user_id: string
          email_notifications: boolean
          dark_mode: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          email_notifications?: boolean
          dark_mode?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          email_notifications?: boolean
          dark_mode?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: {
          user_uuid: string
        }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: {
        Args: {
          user_uuid: string
        }
        Returns: boolean
      }
      insert_user_settings: {
        Args: {
          user_uuid: string
        }
        Returns: undefined
      }
      upsert_user_settings: {
        Args: {
          user_uuid: string
          email_notifications: boolean
          dark_mode: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      booking_status: "pending" | "confirmed" | "canceled" | "completed" | "refunded" | "no_show"
      media_type: "image" | "video"
      payment_status: "unpaid" | "paid" | "refunded"
      report_status: "open" | "under_review" | "resolved" | "rejected"
      subscription_status: "active" | "inactive" | "past_due" | "canceled"
      target_type: "review" | "media" | "profile"
      user_role: "client" | "provider"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}