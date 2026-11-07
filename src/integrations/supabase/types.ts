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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          metadata: Json
          organization_id: string
          project_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          metadata?: Json
          organization_id: string
          project_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          metadata?: Json
          organization_id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_project_id_organization_id_fkey"
            columns: ["project_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      ai_interpretation_access: {
        Row: {
          blocked_at: string
          error_message: string
          id: string
          status_code: number
        }
        Insert: {
          blocked_at?: string
          error_message: string
          id: string
          status_code: number
        }
        Update: {
          blocked_at?: string
          error_message?: string
          id?: string
          status_code?: number
        }
        Relationships: []
      }
      assessment_evidence: {
        Row: {
          assessment_id: string
          created_at: string
          design_interpretation_id: string | null
          design_version_id: string
          extracted_element_id: string | null
          finding_id: string
          id: string
          measured_mm: number | null
          measured_unit: string | null
          measured_value: number | null
          page_number: number | null
          project_id: string
          rule_outcome: string | null
          source_quote: string
          threshold: Json | null
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          assessment_id: string
          created_at?: string
          design_interpretation_id?: string | null
          design_version_id: string
          extracted_element_id?: string | null
          finding_id: string
          id?: string
          measured_mm?: number | null
          measured_unit?: string | null
          measured_value?: number | null
          page_number?: number | null
          project_id: string
          rule_outcome?: string | null
          source_quote: string
          threshold?: Json | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          assessment_id?: string
          created_at?: string
          design_interpretation_id?: string | null
          design_version_id?: string
          extracted_element_id?: string | null
          finding_id?: string
          id?: string
          measured_mm?: number | null
          measured_unit?: string | null
          measured_value?: number | null
          page_number?: number | null
          project_id?: string
          rule_outcome?: string | null
          source_quote?: string
          threshold?: Json | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessment_evidence_assessment_id_project_id_design_versio_fkey"
            columns: ["assessment_id", "project_id", "design_version_id"]
            isOneToOne: false
            referencedRelation: "compliance_assessments"
            referencedColumns: ["id", "project_id", "design_version_id"]
          },
          {
            foreignKeyName: "assessment_evidence_design_interpretation_id_fkey"
            columns: ["design_interpretation_id"]
            isOneToOne: false
            referencedRelation: "design_interpretations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assessment_evidence_extracted_element_id_design_version_id_fkey"
            columns: ["extracted_element_id", "design_version_id", "project_id"]
            isOneToOne: false
            referencedRelation: "extracted_design_elements"
            referencedColumns: ["id", "design_version_id", "project_id"]
          },
          {
            foreignKeyName: "assessment_evidence_finding_id_assessment_id_project_id_fkey"
            columns: ["finding_id", "assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "compliance_findings"
            referencedColumns: ["id", "assessment_id", "project_id"]
          },
          {
            foreignKeyName: "assessment_evidence_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_assessments: {
        Row: {
          completed_at: string | null
          created_at: string
          design_version_id: string
          engine_version: string | null
          id: string
          overall_status: string
          project_id: string
          regulatory_source_id: string
          requested_by: string
          rule_set_version: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          design_version_id: string
          engine_version?: string | null
          id?: string
          overall_status?: string
          project_id: string
          regulatory_source_id: string
          requested_by: string
          rule_set_version: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          design_version_id?: string
          engine_version?: string | null
          id?: string
          overall_status?: string
          project_id?: string
          regulatory_source_id?: string
          requested_by?: string
          rule_set_version?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_assessments_design_version_id_project_id_fkey"
            columns: ["design_version_id", "project_id"]
            isOneToOne: false
            referencedRelation: "design_versions"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "compliance_assessments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_assessments_regulatory_source_id_rule_set_versi_fkey"
            columns: ["regulatory_source_id", "rule_set_version"]
            isOneToOne: false
            referencedRelation: "regulatory_sources"
            referencedColumns: ["id", "rule_set_version"]
          },
          {
            foreignKeyName: "compliance_assessments_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_findings: {
        Row: {
          assessment_id: string
          created_at: string
          deterministic_status: string
          engine_version: string | null
          id: string
          interpretation: string | null
          project_id: string
          recommendation: string | null
          regulatory_requirement_id: string
          regulatory_source_id: string
          review_status: string
          rule_set_version: string
          severity: string
          title: string
          updated_at: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          deterministic_status?: string
          engine_version?: string | null
          id?: string
          interpretation?: string | null
          project_id: string
          recommendation?: string | null
          regulatory_requirement_id: string
          regulatory_source_id: string
          review_status?: string
          rule_set_version: string
          severity?: string
          title: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          deterministic_status?: string
          engine_version?: string | null
          id?: string
          interpretation?: string | null
          project_id?: string
          recommendation?: string | null
          regulatory_requirement_id?: string
          regulatory_source_id?: string
          review_status?: string
          rule_set_version?: string
          severity?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_findings_assessment_id_project_id_regulatory_so_fkey"
            columns: [
              "assessment_id",
              "project_id",
              "regulatory_source_id",
              "rule_set_version",
            ]
            isOneToOne: false
            referencedRelation: "compliance_assessments"
            referencedColumns: [
              "id",
              "project_id",
              "regulatory_source_id",
              "rule_set_version",
            ]
          },
          {
            foreignKeyName: "compliance_findings_regulatory_requirement_id_regulatory_s_fkey"
            columns: [
              "regulatory_requirement_id",
              "regulatory_source_id",
              "rule_set_version",
            ]
            isOneToOne: false
            referencedRelation: "regulatory_requirements"
            referencedColumns: [
              "id",
              "regulatory_source_id",
              "rule_set_version",
            ]
          },
        ]
      }
      design_documents: {
        Row: {
          category: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          file_format: string
          id: string
          project_id: string
          revision: string
          size_bytes: number
          status: string
          storage_path: string
          title: string
          updated_at: string
          user_id: string
          vessel_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          file_format?: string
          id?: string
          project_id: string
          revision?: string
          size_bytes: number
          status?: string
          storage_path: string
          title: string
          updated_at?: string
          user_id: string
          vessel_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          file_format?: string
          id?: string
          project_id?: string
          revision?: string
          size_bytes?: number
          status?: string
          storage_path?: string
          title?: string
          updated_at?: string
          user_id?: string
          vessel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_documents_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_documents_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      design_interpretation_reviews: {
        Row: {
          after_element: Json
          before_element: Json
          created_at: string
          decision: string
          id: string
          interpretation_id: string
          project_id: string
          rationale: string
          reviewer_id: string
        }
        Insert: {
          after_element: Json
          before_element: Json
          created_at?: string
          decision: string
          id?: string
          interpretation_id: string
          project_id: string
          rationale: string
          reviewer_id: string
        }
        Update: {
          after_element?: Json
          before_element?: Json
          created_at?: string
          decision?: string
          id?: string
          interpretation_id?: string
          project_id?: string
          rationale?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_interpretation_reviews_interpretation_id_fkey"
            columns: ["interpretation_id"]
            isOneToOne: false
            referencedRelation: "design_interpretations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_interpretation_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_interpretation_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      design_interpretation_runs: {
        Row: {
          created_at: string
          design_version_id: string
          document_id: string
          error_message: string | null
          id: string
          model: string
          page_number: number
          project_id: string
          requested_by: string
          run_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          design_version_id: string
          document_id: string
          error_message?: string | null
          id?: string
          model: string
          page_number: number
          project_id: string
          requested_by: string
          run_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          design_version_id?: string
          document_id?: string
          error_message?: string | null
          id?: string
          model?: string
          page_number?: number
          project_id?: string
          requested_by?: string
          run_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_interpretation_runs_design_version_id_project_id_fkey"
            columns: ["design_version_id", "project_id"]
            isOneToOne: false
            referencedRelation: "design_versions"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "design_interpretation_runs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "design_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_interpretation_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_interpretation_runs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      design_interpretations: {
        Row: {
          confidence: number
          created_at: string
          deck: string
          design_version_id: string
          document_id: string
          element_name: string
          element_type: string
          id: string
          information_origin: string
          location: string
          measured_value: number | null
          original_element: Json
          page_number: number
          project_id: string
          region: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          run_id: string
          source_document: string
          source_quote: string
          unit: string | null
          updated_at: string
          verification_status: string
        }
        Insert: {
          confidence: number
          created_at?: string
          deck?: string
          design_version_id: string
          document_id: string
          element_name: string
          element_type: string
          id?: string
          information_origin: string
          location?: string
          measured_value?: number | null
          original_element: Json
          page_number: number
          project_id: string
          region?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_id: string
          source_document: string
          source_quote?: string
          unit?: string | null
          updated_at?: string
          verification_status?: string
        }
        Update: {
          confidence?: number
          created_at?: string
          deck?: string
          design_version_id?: string
          document_id?: string
          element_name?: string
          element_type?: string
          id?: string
          information_origin?: string
          location?: string
          measured_value?: number | null
          original_element?: Json
          page_number?: number
          project_id?: string
          region?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          run_id?: string
          source_document?: string
          source_quote?: string
          unit?: string | null
          updated_at?: string
          verification_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_interpretations_design_version_id_project_id_fkey"
            columns: ["design_version_id", "project_id"]
            isOneToOne: false
            referencedRelation: "design_versions"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "design_interpretations_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "design_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_interpretations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_interpretations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_interpretations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "design_interpretation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      design_versions: {
        Row: {
          content_sha256: string | null
          created_at: string
          created_by: string
          document_id: string
          file_format: string
          id: string
          mime_type: string
          original_filename: string | null
          processing_error: string | null
          processing_metadata: Json
          project_id: string
          revision: string
          size_bytes: number | null
          status: string
          storage_path: string
          updated_at: string
          version_number: number
          vessel_id: string | null
        }
        Insert: {
          content_sha256?: string | null
          created_at?: string
          created_by: string
          document_id: string
          file_format?: string
          id?: string
          mime_type?: string
          original_filename?: string | null
          processing_error?: string | null
          processing_metadata?: Json
          project_id: string
          revision?: string
          size_bytes?: number | null
          status?: string
          storage_path: string
          updated_at?: string
          version_number?: number
          vessel_id?: string | null
        }
        Update: {
          content_sha256?: string | null
          created_at?: string
          created_by?: string
          document_id?: string
          file_format?: string
          id?: string
          mime_type?: string
          original_filename?: string | null
          processing_error?: string | null
          processing_metadata?: Json
          project_id?: string
          revision?: string
          size_bytes?: number | null
          status?: string
          storage_path?: string
          updated_at?: string
          version_number?: number
          vessel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "design_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_versions_document_id_project_id_fkey"
            columns: ["document_id", "project_id"]
            isOneToOne: false
            referencedRelation: "design_documents"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "design_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_versions_vessel_id_fkey"
            columns: ["vessel_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id"]
          },
        ]
      }
      document_processing_jobs: {
        Row: {
          created_at: string
          design_version_id: string
          document_id: string
          error: string | null
          id: string
          page_metadata: Json
          project_id: string
          provider_job_id: string | null
          provider_result: Json | null
          requested_by: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          design_version_id: string
          document_id: string
          error?: string | null
          id?: string
          page_metadata?: Json
          project_id: string
          provider_job_id?: string | null
          provider_result?: Json | null
          requested_by: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          design_version_id?: string
          document_id?: string
          error?: string | null
          id?: string
          page_metadata?: Json
          project_id?: string
          provider_job_id?: string | null
          provider_result?: Json | null
          requested_by?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_processing_jobs_design_version_id_fkey"
            columns: ["design_version_id"]
            isOneToOne: false
            referencedRelation: "design_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "design_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_processing_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      engineering_reviews: {
        Row: {
          assessment_id: string
          created_at: string
          decision: string
          finding_id: string
          id: string
          project_id: string
          rationale: string
          reviewer_id: string
        }
        Insert: {
          assessment_id: string
          created_at?: string
          decision: string
          finding_id: string
          id?: string
          project_id: string
          rationale: string
          reviewer_id: string
        }
        Update: {
          assessment_id?: string
          created_at?: string
          decision?: string
          finding_id?: string
          id?: string
          project_id?: string
          rationale?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engineering_reviews_finding_id_assessment_id_project_id_fkey"
            columns: ["finding_id", "assessment_id", "project_id"]
            isOneToOne: false
            referencedRelation: "compliance_findings"
            referencedColumns: ["id", "assessment_id", "project_id"]
          },
          {
            foreignKeyName: "engineering_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      extracted_design_elements: {
        Row: {
          confidence: number | null
          corrected_at: string | null
          corrected_by: string | null
          corrected_text: string | null
          created_at: string
          design_version_id: string
          document_id: string | null
          element_type: string
          extracted_text: string | null
          extraction_method: string
          id: string
          name: string
          page_number: number | null
          project_id: string
          source_location: Json | null
          source_quote: string | null
          status: string
          unit: string | null
          updated_at: string
          value: Json
        }
        Insert: {
          confidence?: number | null
          corrected_at?: string | null
          corrected_by?: string | null
          corrected_text?: string | null
          created_at?: string
          design_version_id: string
          document_id?: string | null
          element_type: string
          extracted_text?: string | null
          extraction_method?: string
          id?: string
          name: string
          page_number?: number | null
          project_id: string
          source_location?: Json | null
          source_quote?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
          value?: Json
        }
        Update: {
          confidence?: number | null
          corrected_at?: string | null
          corrected_by?: string | null
          corrected_text?: string | null
          created_at?: string
          design_version_id?: string
          document_id?: string | null
          element_type?: string
          extracted_text?: string | null
          extraction_method?: string
          id?: string
          name?: string
          page_number?: number | null
          project_id?: string
          source_location?: Json | null
          source_quote?: string | null
          status?: string
          unit?: string | null
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "extracted_design_elements_corrected_by_fkey"
            columns: ["corrected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "extracted_design_elements_design_version_id_project_id_fkey"
            columns: ["design_version_id", "project_id"]
            isOneToOne: false
            referencedRelation: "design_versions"
            referencedColumns: ["id", "project_id"]
          },
          {
            foreignKeyName: "extracted_design_elements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "design_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["organization_role"]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_role"]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          default_organization_id: string | null
          full_name: string
          id: string
          organisation: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_organization_id?: string | null
          full_name?: string
          id: string
          organisation?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_organization_id?: string | null
          full_name?: string
          id?: string
          organisation?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_organization_id_fkey"
            columns: ["default_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          class_society: string
          created_at: string
          flag: string
          id: string
          lead_engineer: string
          length_m: number
          name: string
          organization_id: string
          status: string
          updated_at: string
          user_id: string
          version: string
          vessel: string
          vessel_id: string
          vessel_type: string
        }
        Insert: {
          class_society: string
          created_at?: string
          flag: string
          id?: string
          lead_engineer: string
          length_m: number
          name?: string
          organization_id: string
          status?: string
          updated_at?: string
          user_id: string
          version?: string
          vessel: string
          vessel_id: string
          vessel_type: string
        }
        Update: {
          class_society?: string
          created_at?: string
          flag?: string
          id?: string
          lead_engineer?: string
          length_m?: number
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          version?: string
          vessel?: string
          vessel_id?: string
          vessel_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_vessel_organization_fk"
            columns: ["vessel_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "vessels"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      regulatory_requirements: {
        Row: {
          annex_reference: string | null
          applicability: Json
          article_reference: string | null
          category: string
          clause_reference: string
          created_at: string
          deterministic_rule: Json
          id: string
          imported_at: string | null
          regulatory_source_id: string
          required_evidence: Json
          requirement_text: string
          rule_set_version: string
          status: string
          updated_at: string
          verification_status: string
          wording_sha256: string | null
        }
        Insert: {
          annex_reference?: string | null
          applicability?: Json
          article_reference?: string | null
          category: string
          clause_reference: string
          created_at?: string
          deterministic_rule?: Json
          id?: string
          imported_at?: string | null
          regulatory_source_id: string
          required_evidence?: Json
          requirement_text: string
          rule_set_version: string
          status?: string
          updated_at?: string
          verification_status?: string
          wording_sha256?: string | null
        }
        Update: {
          annex_reference?: string | null
          applicability?: Json
          article_reference?: string | null
          category?: string
          clause_reference?: string
          created_at?: string
          deterministic_rule?: Json
          id?: string
          imported_at?: string | null
          regulatory_source_id?: string
          required_evidence?: Json
          requirement_text?: string
          rule_set_version?: string
          status?: string
          updated_at?: string
          verification_status?: string
          wording_sha256?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_requirements_regulatory_source_id_rule_set_vers_fkey"
            columns: ["regulatory_source_id", "rule_set_version"]
            isOneToOne: false
            referencedRelation: "regulatory_sources"
            referencedColumns: ["id", "rule_set_version"]
          },
        ]
      }
      regulatory_sources: {
        Row: {
          celex_id: string | null
          created_at: string
          id: string
          imported_at: string | null
          legal_version: string | null
          legal_version_date: string | null
          library_catalog: boolean
          organization_id: string | null
          published_at: string | null
          publisher: string
          regulation_number: string | null
          rule_set_key: string
          rule_set_version: string
          source_url: string
          status: string
          title: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          version_note: string | null
        }
        Insert: {
          celex_id?: string | null
          created_at?: string
          id?: string
          imported_at?: string | null
          legal_version?: string | null
          legal_version_date?: string | null
          library_catalog?: boolean
          organization_id?: string | null
          published_at?: string | null
          publisher: string
          regulation_number?: string | null
          rule_set_key: string
          rule_set_version: string
          source_url: string
          status?: string
          title: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          version_note?: string | null
        }
        Update: {
          celex_id?: string | null
          created_at?: string
          id?: string
          imported_at?: string | null
          legal_version?: string | null
          legal_version_date?: string | null
          library_catalog?: boolean
          organization_id?: string | null
          published_at?: string | null
          publisher?: string
          regulation_number?: string | null
          rule_set_key?: string
          rule_set_version?: string
          source_url?: string
          status?: string
          title?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          version_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regulatory_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regulatory_sources_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vessels: {
        Row: {
          class_society: string
          created_at: string
          flag: string
          id: string
          imo_number: string | null
          length_m: number
          name: string
          organization_id: string
          status: string
          updated_at: string
          vessel_type: string
        }
        Insert: {
          class_society: string
          created_at?: string
          flag: string
          id?: string
          imo_number?: string | null
          length_m: number
          name: string
          organization_id: string
          status?: string
          updated_at?: string
          vessel_type: string
        }
        Update: {
          class_society?: string
          created_at?: string
          flag?: string
          id?: string
          imo_number?: string | null
          length_m?: number
          name?: string
          organization_id?: string
          status?: string
          updated_at?: string
          vessel_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vessels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adopt_verified_rule_set: {
        Args: {
          _catalog_source_id: string
          _organization_id: string
          _rationale: string
        }
        Returns: string
      }
      archive_design_document: {
        Args: { _document_id: string }
        Returns: undefined
      }
      complete_document_processing: {
        Args: { _items: Json; _job_id: string; _provider_result?: Json }
        Returns: undefined
      }
      correct_extracted_item: {
        Args: { _id: string; _text: string }
        Returns: undefined
      }
      create_engineering_project: {
        Args: {
          _class_society: string
          _flag: string
          _lead_engineer: string
          _length_m: number
          _organization_id?: string
          _vessel: string
          _vessel_type: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      length_is_imperial: { Args: { _unit: string }; Returns: boolean }
      length_to_mm: { Args: { _unit: string; _value: number }; Returns: number }
      list_organization_members: {
        Args: { _organization_id: string }
        Returns: {
          full_name: string
          id: string
          role: Database["public"]["Enums"]["organization_role"]
          status: string
          user_id: string
        }[]
      }
      manage_organization_member: {
        Args: {
          _organization_id: string
          _role: Database["public"]["Enums"]["organization_role"]
          _status?: string
          _user_id: string
        }
        Returns: string
      }
      organization_access: {
        Args: {
          _organization_id: string
          _roles?: Database["public"]["Enums"]["organization_role"][]
        }
        Returns: boolean
      }
      project_access: {
        Args: {
          _project_id: string
          _roles?: Database["public"]["Enums"]["organization_role"][]
        }
        Returns: boolean
      }
      register_design_asset: {
        Args: {
          _category: string
          _document_id: string
          _filename: string
          _format: string
          _mime: string
          _path: string
          _project_id: string
          _revision: string
          _sha256: string
          _size: number
        }
        Returns: string
      }
      register_design_file: {
        Args: {
          _category: string
          _document_id: string
          _filename: string
          _path: string
          _project_id: string
          _revision: string
          _sha256: string
          _size: number
        }
        Returns: string
      }
      review_design_interpretation: {
        Args: {
          _decision: string
          _element: Json
          _id: string
          _rationale: string
        }
        Returns: undefined
      }
      run_compliance_assessment: {
        Args: { _assessment_id: string }
        Returns: number
      }
      storage_project_access: {
        Args: {
          _name: string
          _roles?: Database["public"]["Enums"]["organization_role"][]
        }
        Returns: boolean
      }
      uncommitted_design_file: { Args: { _name: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "engineer" | "reviewer" | "viewer"
      organization_role:
        | "administrator"
        | "project_manager"
        | "engineer"
        | "reviewer"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "engineer", "reviewer", "viewer"],
      organization_role: [
        "administrator",
        "project_manager",
        "engineer",
        "reviewer",
      ],
    },
  },
} as const
