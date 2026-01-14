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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      blockchain_attestations: {
        Row: {
          attested_at: string
          block_number: number | null
          data_hash: string
          id: string
          ipfs_hash: string | null
          kpi_id: string
          network: string
          transaction_hash: string
          verification_id: string | null
        }
        Insert: {
          attested_at?: string
          block_number?: number | null
          data_hash: string
          id?: string
          ipfs_hash?: string | null
          kpi_id: string
          network?: string
          transaction_hash: string
          verification_id?: string | null
        }
        Update: {
          attested_at?: string
          block_number?: number | null
          data_hash?: string
          id?: string
          ipfs_hash?: string | null
          kpi_id?: string
          network?: string
          transaction_hash?: string
          verification_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blockchain_attestations_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blockchain_attestations_verification_id_fkey"
            columns: ["verification_id"]
            isOneToOne: false
            referencedRelation: "verifications"
            referencedColumns: ["id"]
          },
        ]
      }
      borrowers: {
        Row: {
          country: string
          created_at: string
          id: string
          name: string
          sector: string
          size: Database["public"]["Enums"]["company_size"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          country: string
          created_at?: string
          id?: string
          name: string
          sector: string
          size?: Database["public"]["Enums"]["company_size"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          name?: string
          sector?: string
          size?: Database["public"]["Enums"]["company_size"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      esg_passports: {
        Row: {
          borrower_id: string
          environmental_score: number | null
          generated_at: string
          governance_score: number | null
          id: string
          is_public: boolean
          overall_score: number
          social_score: number | null
          valid_until: string
        }
        Insert: {
          borrower_id: string
          environmental_score?: number | null
          generated_at?: string
          governance_score?: number | null
          id?: string
          is_public?: boolean
          overall_score?: number
          social_score?: number | null
          valid_until: string
        }
        Update: {
          borrower_id?: string
          environmental_score?: number | null
          generated_at?: string
          governance_score?: number | null
          id?: string
          is_public?: boolean
          overall_score?: number
          social_score?: number | null
          valid_until?: string
        }
        Relationships: [
          {
            foreignKeyName: "esg_passports_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: true
            referencedRelation: "borrowers"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_submissions: {
        Row: {
          baseline: number | null
          borrower_id: string
          category: Database["public"]["Enums"]["kpi_category"]
          created_at: string
          id: string
          kpi_type: string
          notes: string | null
          period: string
          status: Database["public"]["Enums"]["verification_status"]
          target: number | null
          unit: string
          updated_at: string
          value: number
        }
        Insert: {
          baseline?: number | null
          borrower_id: string
          category: Database["public"]["Enums"]["kpi_category"]
          created_at?: string
          id?: string
          kpi_type: string
          notes?: string | null
          period: string
          status?: Database["public"]["Enums"]["verification_status"]
          target?: number | null
          unit: string
          updated_at?: string
          value: number
        }
        Update: {
          baseline?: number | null
          borrower_id?: string
          category?: Database["public"]["Enums"]["kpi_category"]
          created_at?: string
          id?: string
          kpi_type?: string
          notes?: string | null
          period?: string
          status?: Database["public"]["Enums"]["verification_status"]
          target?: number | null
          unit?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "kpi_submissions_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "borrowers"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_validations: {
        Row: {
          anomaly_score: number
          confidence_score: number
          flags: string[] | null
          id: string
          kpi_id: string
          recommendations: string[] | null
          sector_benchmark: number | null
          validated_at: string
          yoy_change: number | null
        }
        Insert: {
          anomaly_score?: number
          confidence_score?: number
          flags?: string[] | null
          id?: string
          kpi_id: string
          recommendations?: string[] | null
          sector_benchmark?: number | null
          validated_at?: string
          yoy_change?: number | null
        }
        Update: {
          anomaly_score?: number
          confidence_score?: number
          flags?: string[] | null
          id?: string
          kpi_id?: string
          recommendations?: string[] | null
          sector_benchmark?: number | null
          validated_at?: string
          yoy_change?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_validations_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_simulations: {
        Row: {
          base_rate: number
          borrower_id: string
          esg_discount_bps: number
          final_rate: number
          id: string
          lender_id: string
          loan_amount: number | null
          potential_savings: number | null
          simulated_at: string
        }
        Insert: {
          base_rate: number
          borrower_id: string
          esg_discount_bps?: number
          final_rate: number
          id?: string
          lender_id: string
          loan_amount?: number | null
          potential_savings?: number | null
          simulated_at?: string
        }
        Update: {
          base_rate?: number
          borrower_id?: string
          esg_discount_bps?: number
          final_rate?: number
          id?: string
          lender_id?: string
          loan_amount?: number | null
          potential_savings?: number | null
          simulated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_simulations_borrower_id_fkey"
            columns: ["borrower_id"]
            isOneToOne: false
            referencedRelation: "borrowers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          organization_name: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          organization_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          organization_name?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      supporting_documents: {
        Row: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          kpi_id: string
          uploaded_at: string
        }
        Insert: {
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          kpi_id: string
          uploaded_at?: string
        }
        Update: {
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          kpi_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supporting_documents_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
      verifications: {
        Row: {
          confidence_score: number
          expires_at: string
          id: string
          kpi_id: string
          method: Database["public"]["Enums"]["verification_method"]
          notes: string | null
          signature: string
          verified_at: string
          verifier_id: string
          verifier_name: string
          verifier_organization: string | null
        }
        Insert: {
          confidence_score: number
          expires_at: string
          id?: string
          kpi_id: string
          method?: Database["public"]["Enums"]["verification_method"]
          notes?: string | null
          signature: string
          verified_at?: string
          verifier_id: string
          verifier_name: string
          verifier_organization?: string | null
        }
        Update: {
          confidence_score?: number
          expires_at?: string
          id?: string
          kpi_id?: string
          method?: Database["public"]["Enums"]["verification_method"]
          notes?: string | null
          signature?: string
          verified_at?: string
          verifier_id?: string
          verifier_name?: string
          verifier_organization?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verifications_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      company_size: "small" | "medium" | "large"
      kpi_category: "environmental" | "social" | "governance"
      user_role: "borrower" | "verifier" | "lender" | "admin"
      verification_method: "audit" | "third_party" | "self_declared"
      verification_status: "pending" | "verified" | "expired" | "rejected"
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
    Enums: {
      company_size: ["small", "medium", "large"],
      kpi_category: ["environmental", "social", "governance"],
      user_role: ["borrower", "verifier", "lender", "admin"],
      verification_method: ["audit", "third_party", "self_declared"],
      verification_status: ["pending", "verified", "expired", "rejected"],
    },
  },
} as const
