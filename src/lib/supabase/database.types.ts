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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      client_requirements: {
        Row: {
          audio_file_url: string | null
          client_name: string | null
          created_at: string
          error_message: string | null
          id: string
          input_type: string
          raw_input: string | null
          refined_requirements_json: Json | null
          requirements_json: Json | null
          source_url: string | null
          status: string
          transcribed_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          audio_file_url?: string | null
          client_name?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_type: string
          raw_input?: string | null
          refined_requirements_json?: Json | null
          requirements_json?: Json | null
          source_url?: string | null
          status?: string
          transcribed_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          audio_file_url?: string | null
          client_name?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_type?: string
          raw_input?: string | null
          refined_requirements_json?: Json | null
          requirements_json?: Json | null
          source_url?: string | null
          status?: string
          transcribed_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generated_pdfs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          input_json: Json | null
          page_count: number | null
          pdf_url: string | null
          run_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_json?: Json | null
          page_count?: number | null
          pdf_url?: string | null
          run_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          input_json?: Json | null
          page_count?: number | null
          pdf_url?: string | null
          run_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_pdfs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "recommendation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_videos: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_seconds: number
          error_message: string | null
          format: string
          fps: number
          id: string
          input_json: Json | null
          provider: string
          provider_job_id: string | null
          recommendation_id: string | null
          retry_count: number
          run_id: string
          script: string | null
          status: string
          updated_at: string
          user_id: string
          video_plan_json: Json | null
          video_url: string | null
          voiceover_script_json: Json | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number
          error_message?: string | null
          format?: string
          fps?: number
          id?: string
          input_json?: Json | null
          provider?: string
          provider_job_id?: string | null
          recommendation_id?: string | null
          retry_count?: number
          run_id: string
          script?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_plan_json?: Json | null
          video_url?: string | null
          voiceover_script_json?: Json | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number
          error_message?: string | null
          format?: string
          fps?: number
          id?: string
          input_json?: Json | null
          provider?: string
          provider_job_id?: string | null
          recommendation_id?: string | null
          retry_count?: number
          run_id?: string
          script?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_plan_json?: Json | null
          video_url?: string | null
          voiceover_script_json?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_videos_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "property_recommendations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_videos_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "recommendation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      property_internal_traces: {
        Row: {
          agent_email: string | null
          agent_name: string | null
          agent_phone: string | null
          created_at: string
          id: string
          internal_notes: string | null
          listing_id: string | null
          platform: string | null
          raw_trace_json: Json | null
          recommendation_id: string
          source_url: string | null
          user_id: string
        }
        Insert: {
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          created_at?: string
          id?: string
          internal_notes?: string | null
          listing_id?: string | null
          platform?: string | null
          raw_trace_json?: Json | null
          recommendation_id: string
          source_url?: string | null
          user_id: string
        }
        Update: {
          agent_email?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          created_at?: string
          id?: string
          internal_notes?: string | null
          listing_id?: string | null
          platform?: string | null
          raw_trace_json?: Json | null
          recommendation_id?: string
          source_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_internal_traces_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "property_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      property_recommendations: {
        Row: {
          area: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          client_safe_data: Json | null
          created_at: string
          currency: string | null
          description: string | null
          external_property_id: string | null
          handoff_notes: Json | null
          headline: string | null
          highlights: Json
          id: string
          images: Json
          missing_data_warnings: Json
          price: number | null
          price_label: string | null
          property_category: string | null
          property_type: string | null
          rent_or_buy: string | null
          run_id: string
          size_label: string | null
          sort_order: number | null
          sqft: number | null
          title: string | null
          user_id: string
        }
        Insert: {
          area?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          client_safe_data?: Json | null
          created_at?: string
          currency?: string | null
          description?: string | null
          external_property_id?: string | null
          handoff_notes?: Json | null
          headline?: string | null
          highlights?: Json
          id?: string
          images?: Json
          missing_data_warnings?: Json
          price?: number | null
          price_label?: string | null
          property_category?: string | null
          property_type?: string | null
          rent_or_buy?: string | null
          run_id: string
          size_label?: string | null
          sort_order?: number | null
          sqft?: number | null
          title?: string | null
          user_id: string
        }
        Update: {
          area?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          client_safe_data?: Json | null
          created_at?: string
          currency?: string | null
          description?: string | null
          external_property_id?: string | null
          handoff_notes?: Json | null
          headline?: string | null
          highlights?: Json
          id?: string
          images?: Json
          missing_data_warnings?: Json
          price?: number | null
          price_label?: string | null
          property_category?: string | null
          property_type?: string | null
          rent_or_buy?: string | null
          run_id?: string
          size_label?: string | null
          sort_order?: number | null
          sqft?: number | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_recommendations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "recommendation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_packages: {
        Row: {
          created_at: string
          follow_up_message: string | null
          id: string
          package_summary_json: Json | null
          package_title: string | null
          pdf_id: string | null
          requirement_id: string
          run_id: string
          share_slug: string | null
          status: string
          updated_at: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          created_at?: string
          follow_up_message?: string | null
          id?: string
          package_summary_json?: Json | null
          package_title?: string | null
          pdf_id?: string | null
          requirement_id: string
          run_id: string
          share_slug?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          created_at?: string
          follow_up_message?: string | null
          id?: string
          package_summary_json?: Json | null
          package_title?: string | null
          pdf_id?: string | null
          requirement_id?: string
          run_id?: string
          share_slug?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_packages_pdf_id_fkey"
            columns: ["pdf_id"]
            isOneToOne: false
            referencedRelation: "generated_pdfs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_packages_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "client_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_packages_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "recommendation_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recommendation_packages_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "generated_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          requirement_id: string
          retry_count: number
          search_output_json: Json | null
          search_summary_json: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          requirement_id: string
          retry_count?: number
          search_output_json?: Json | null
          search_summary_json?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          requirement_id?: string
          retry_count?: number
          search_output_json?: Json | null
          search_summary_json?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendation_runs_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "client_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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