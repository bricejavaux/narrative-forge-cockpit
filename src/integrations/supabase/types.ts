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
      agent_parameters: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "agent_parameters_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_presets: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          name: string
          parameters: Json
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          name: string
          parameters?: Json
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          name?: string
          parameters?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_presets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          category: string
          created_at: string
          criticality: string | null
          external_id: string | null
          future_indexes: Json
          id: string
          last_run: string | null
          metadata: Json
          name: string
          objective: string | null
          permission_level: string | null
          rewrite_rights: boolean
          simulated_cost: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          criticality?: string | null
          external_id?: string | null
          future_indexes?: Json
          id?: string
          last_run?: string | null
          metadata?: Json
          name: string
          objective?: string | null
          permission_level?: string | null
          rewrite_rights?: boolean
          simulated_cost?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          criticality?: string | null
          external_id?: string | null
          future_indexes?: Json
          id?: string
          last_run?: string | null
          metadata?: Json
          name?: string
          objective?: string | null
          permission_level?: string | null
          rewrite_rights?: boolean
          simulated_cost?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      annotation_targets: {
        Row: {
          created_at: string
          id: string
          label: string | null
          metadata: Json
          target_id: string
          target_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          metadata?: Json
          target_id: string
          target_type: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          metadata?: Json
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      asset_versions: {
        Row: {
          asset_id: string | null
          created_at: string
          id: string
          snapshot: Json
          storage_path: string | null
          version: number
        }
        Insert: {
          asset_id?: string | null
          created_at?: string
          id?: string
          snapshot?: Json
          storage_path?: string | null
          version: number
        }
        Update: {
          asset_id?: string | null
          created_at?: string
          id?: string
          snapshot?: Json
          storage_path?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "asset_versions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          created_at: string
          id: string
          indexation_status: string
          integration_status: string
          metadata: Json
          name: string
          notes: string | null
          project_id: string | null
          size: string | null
          source: string | null
          source_file_id: string | null
          storage_path: string | null
          target_index: string | null
          type: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          indexation_status?: string
          integration_status?: string
          metadata?: Json
          name: string
          notes?: string | null
          project_id?: string | null
          size?: string | null
          source?: string | null
          source_file_id?: string | null
          storage_path?: string | null
          target_index?: string | null
          type?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          indexation_status?: string
          integration_status?: string
          metadata?: Json
          name?: string
          notes?: string | null
          project_id?: string | null
          size?: string | null
          source?: string | null
          source_file_id?: string | null
          storage_path?: string | null
          target_index?: string | null
          type?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "source_files"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_notes: {
        Row: {
          author: string | null
          created_at: string
          duration: string | null
          id: string
          impact: string | null
          linked_canon_ids: Json
          linked_chapter_ids: Json
          linked_character_ids: Json
          metadata: Json
          project_id: string | null
          proposed_action: string | null
          storage_path: string | null
          target: string
          target_id: string | null
          target_type: string
          transcription_status: string
          treatment_status: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          impact?: string | null
          linked_canon_ids?: Json
          linked_chapter_ids?: Json
          linked_character_ids?: Json
          metadata?: Json
          project_id?: string | null
          proposed_action?: string | null
          storage_path?: string | null
          target: string
          target_id?: string | null
          target_type: string
          transcription_status?: string
          treatment_status?: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          created_at?: string
          duration?: string | null
          id?: string
          impact?: string | null
          linked_canon_ids?: Json
          linked_chapter_ids?: Json
          linked_character_ids?: Json
          metadata?: Json
          project_id?: string | null
          proposed_action?: string | null
          storage_path?: string | null
          target?: string
          target_id?: string | null
          target_type?: string
          transcription_status?: string
          treatment_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audio_transcripts: {
        Row: {
          audio_note_id: string | null
          created_at: string
          id: string
          model: string | null
          raw_text: string | null
          status: string
          structured: Json
          updated_at: string
        }
        Insert: {
          audio_note_id?: string | null
          created_at?: string
          id?: string
          model?: string | null
          raw_text?: string | null
          status?: string
          structured?: Json
          updated_at?: string
        }
        Update: {
          audio_note_id?: string | null
          created_at?: string
          id?: string
          model?: string | null
          raw_text?: string | null
          status?: string
          structured?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_transcripts_audio_note_id_fkey"
            columns: ["audio_note_id"]
            isOneToOne: false
            referencedRelation: "audio_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_findings: {
        Row: {
          agent_id: string | null
          created_at: string
          detail: string | null
          id: string
          metadata: Json
          recommendation: string | null
          run_id: string | null
          severity: string | null
          status: string
          target_id: string | null
          target_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
          recommendation?: string | null
          run_id?: string | null
          severity?: string | null
          status?: string
          target_id?: string | null
          target_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
          recommendation?: string | null
          run_id?: string | null
          severity?: string | null
          status?: string
          target_id?: string | null
          target_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_findings_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_findings_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      beats: {
        Row: {
          chapter_id: string | null
          created_at: string
          detail: string | null
          id: string
          metadata: Json
          order_index: number
          scale: string | null
          title: string
          updated_at: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
          order_index: number
          scale?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
          order_index?: number
          scale?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beats_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      canon_objects: {
        Row: {
          category: string
          created_at: string
          criticality: string | null
          description: string | null
          exceptions: string | null
          external_id: string | null
          id: string
          index_associated: string | null
          linked_arc_ids: Json
          linked_asset_ids: Json
          linked_audio_note_ids: Json
          linked_chapter_ids: Json
          linked_character_ids: Json
          metadata: Json
          needs_index_refresh: boolean
          needs_review: boolean
          project_id: string | null
          rigidity: string | null
          source_reference: string | null
          status: string
          summary: string | null
          title: string
          updated_at: string
          validation_status: string
          version: number
        }
        Insert: {
          category: string
          created_at?: string
          criticality?: string | null
          description?: string | null
          exceptions?: string | null
          external_id?: string | null
          id?: string
          index_associated?: string | null
          linked_arc_ids?: Json
          linked_asset_ids?: Json
          linked_audio_note_ids?: Json
          linked_chapter_ids?: Json
          linked_character_ids?: Json
          metadata?: Json
          needs_index_refresh?: boolean
          needs_review?: boolean
          project_id?: string | null
          rigidity?: string | null
          source_reference?: string | null
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          validation_status?: string
          version?: number
        }
        Update: {
          category?: string
          created_at?: string
          criticality?: string | null
          description?: string | null
          exceptions?: string | null
          external_id?: string | null
          id?: string
          index_associated?: string | null
          linked_arc_ids?: Json
          linked_asset_ids?: Json
          linked_audio_note_ids?: Json
          linked_chapter_ids?: Json
          linked_character_ids?: Json
          metadata?: Json
          needs_index_refresh?: boolean
          needs_review?: boolean
          project_id?: string | null
          rigidity?: string | null
          source_reference?: string | null
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          validation_status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "canon_objects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          arc_ids: Json
          audio_review_status: string | null
          cost_type: string | null
          created_at: string
          emotion: number | null
          external_id: string | null
          has_audio: boolean
          id: string
          linked_character_ids: Json
          main_arc: string | null
          metadata: Json
          number: number
          phrase_couteau: string | null
          scale: string | null
          sci_density: number | null
          score: number | null
          status: string
          technical_detail: string | null
          tension: number | null
          title: string
          tome_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          arc_ids?: Json
          audio_review_status?: string | null
          cost_type?: string | null
          created_at?: string
          emotion?: number | null
          external_id?: string | null
          has_audio?: boolean
          id?: string
          linked_character_ids?: Json
          main_arc?: string | null
          metadata?: Json
          number: number
          phrase_couteau?: string | null
          scale?: string | null
          sci_density?: number | null
          score?: number | null
          status?: string
          technical_detail?: string | null
          tension?: number | null
          title: string
          tome_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          arc_ids?: Json
          audio_review_status?: string | null
          cost_type?: string | null
          created_at?: string
          emotion?: number | null
          external_id?: string | null
          has_audio?: boolean
          id?: string
          linked_character_ids?: Json
          main_arc?: string | null
          metadata?: Json
          number?: number
          phrase_couteau?: string | null
          scale?: string | null
          sci_density?: number | null
          score?: number | null
          status?: string
          technical_detail?: string | null
          tension?: number | null
          title?: string
          tome_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "chapters_tome_id_fkey"
            columns: ["tome_id"]
            isOneToOne: false
            referencedRelation: "tomes"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          apparent_goal: string | null
          breaking_point: string | null
          created_at: string
          dramatic_debt: number | null
          emotional_trajectory: string | null
          exposure_level: number | null
          external_id: string | null
          flaw: string | null
          forbidden: string | null
          function: string | null
          future_index: string | null
          id: string
          linked_arc_ids: Json
          linked_chapter_ids: Json
          metadata: Json
          name: string
          narrative_weight: number | null
          needs_review: boolean
          project_id: string | null
          real_goal: string | null
          role: string | null
          secret: string | null
          updated_at: string
          validation_status: string
        }
        Insert: {
          apparent_goal?: string | null
          breaking_point?: string | null
          created_at?: string
          dramatic_debt?: number | null
          emotional_trajectory?: string | null
          exposure_level?: number | null
          external_id?: string | null
          flaw?: string | null
          forbidden?: string | null
          function?: string | null
          future_index?: string | null
          id?: string
          linked_arc_ids?: Json
          linked_chapter_ids?: Json
          metadata?: Json
          name: string
          narrative_weight?: number | null
          needs_review?: boolean
          project_id?: string | null
          real_goal?: string | null
          role?: string | null
          secret?: string | null
          updated_at?: string
          validation_status?: string
        }
        Update: {
          apparent_goal?: string | null
          breaking_point?: string | null
          created_at?: string
          dramatic_debt?: number | null
          emotional_trajectory?: string | null
          exposure_level?: number | null
          external_id?: string | null
          flaw?: string | null
          forbidden?: string | null
          function?: string | null
          future_index?: string | null
          id?: string
          linked_arc_ids?: Json
          linked_chapter_ids?: Json
          metadata?: Json
          name?: string
          narrative_weight?: number | null
          needs_review?: boolean
          project_id?: string | null
          real_goal?: string | null
          role?: string | null
          secret?: string | null
          updated_at?: string
          validation_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      connector_status: {
        Row: {
          connector_id: string
          created_at: string
          details: Json
          id: string
          last_check: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          connector_id: string
          created_at?: string
          details?: Json
          id?: string
          last_check?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          connector_id?: string
          created_at?: string
          details?: Json
          id?: string
          last_check?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      consequences: {
        Row: {
          biosecurity: string | null
          chapter_id: string | null
          created_at: string
          family: string | null
          id: string
          metadata: Json
          physical: string | null
          political: string | null
          social: string | null
          updated_at: string
        }
        Insert: {
          biosecurity?: string | null
          chapter_id?: string | null
          created_at?: string
          family?: string | null
          id?: string
          metadata?: Json
          physical?: string | null
          political?: string | null
          social?: string | null
          updated_at?: string
        }
        Update: {
          biosecurity?: string | null
          chapter_id?: string | null
          created_at?: string
          family?: string | null
          id?: string
          metadata?: Json
          physical?: string | null
          political?: string | null
          social?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consequences_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_tracking: {
        Row: {
          amount_usd: number | null
          created_at: string
          id: string
          metadata: Json
          ref_id: string | null
          source: string
          tokens: number | null
        }
        Insert: {
          amount_usd?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          ref_id?: string | null
          source: string
          tokens?: number | null
        }
        Update: {
          amount_usd?: number | null
          created_at?: string
          id?: string
          metadata?: Json
          ref_id?: string | null
          source?: string
          tokens?: number | null
        }
        Relationships: []
      }
      export_jobs: {
        Row: {
          created_at: string
          error: string | null
          export_id: string | null
          finished_at: string | null
          id: string
          output: Json
          payload: Json
          started_at: string | null
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          export_id?: string | null
          finished_at?: string | null
          id?: string
          output?: Json
          payload?: Json
          started_at?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          export_id?: string | null
          finished_at?: string | null
          id?: string
          output?: Json
          payload?: Json
          started_at?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_jobs_export_id_fkey"
            columns: ["export_id"]
            isOneToOne: false
            referencedRelation: "exports"
            referencedColumns: ["id"]
          },
        ]
      }
      exports: {
        Row: {
          category: string | null
          created_at: string
          dependencies: Json
          destination: string | null
          engine_status: string
          format: string
          id: string
          last_generation: string | null
          metadata: Json
          name: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          dependencies?: Json
          destination?: string | null
          engine_status?: string
          format: string
          id?: string
          last_generation?: string | null
          metadata?: Json
          name: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          dependencies?: Json
          destination?: string | null
          engine_status?: string
          format?: string
          id?: string
          last_generation?: string | null
          metadata?: Json
          name?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      global_arcs: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          linked_character_ids: Json
          metadata: Json
          name: string
          payoff_status: string | null
          progress: number | null
          project_id: string | null
          risk_level: string | null
          status: string
          tension: number | null
          type: string | null
          unresolved_questions: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          linked_character_ids?: Json
          metadata?: Json
          name: string
          payoff_status?: string | null
          progress?: number | null
          project_id?: string | null
          risk_level?: string | null
          status?: string
          tension?: number | null
          type?: string | null
          unresolved_questions?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          linked_character_ids?: Json
          metadata?: Json
          name?: string
          payoff_status?: string | null
          progress?: number | null
          project_id?: string | null
          risk_level?: string | null
          status?: string
          tension?: number | null
          type?: string | null
          unresolved_questions?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "global_arcs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      import_jobs: {
        Row: {
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          import_id: string | null
          input: Json
          output: Json
          started_at: string | null
          status: string
          step: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          import_id?: string | null
          input?: Json
          output?: Json
          started_at?: string | null
          status?: string
          step: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          import_id?: string | null
          input?: Json
          output?: Json
          started_at?: string | null
          status?: string
          step?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_jobs_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "imports"
            referencedColumns: ["id"]
          },
        ]
      }
      imports: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          project_id: string | null
          source_file_id: string | null
          status: string
          target: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          project_id?: string | null
          source_file_id?: string | null
          status?: string
          target: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          project_id?: string | null
          source_file_id?: string | null
          status?: string
          target?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imports_source_file_id_fkey"
            columns: ["source_file_id"]
            isOneToOne: false
            referencedRelation: "source_files"
            referencedColumns: ["id"]
          },
        ]
      }
      index_bindings: {
        Row: {
          created_at: string
          id: string
          index_name: string
          last_refresh: string | null
          linked_agent_ids: Json
          linked_asset_ids: Json
          metadata: Json
          migration_strategy: string | null
          purpose: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          index_name: string
          last_refresh?: string | null
          linked_agent_ids?: Json
          linked_asset_ids?: Json
          metadata?: Json
          migration_strategy?: string | null
          purpose?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          index_name?: string
          last_refresh?: string | null
          linked_agent_ids?: Json
          linked_asset_ids?: Json
          metadata?: Json
          migration_strategy?: string | null
          purpose?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      latency_tracking: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          ms: number
          ref_id: string | null
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          ms: number
          ref_id?: string | null
          source: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          ms?: number
          ref_id?: string | null
          source?: string
        }
        Relationships: []
      }
      logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          payload: Json
          source: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          payload?: Json
          source?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          payload?: Json
          source?: string | null
        }
        Relationships: []
      }
      payoffs: {
        Row: {
          arc_id: string | null
          created_at: string
          delay: string | null
          id: string
          label: string
          metadata: Json
          payoff_chapter: string | null
          project_id: string | null
          risk: string | null
          setup_chapter: number | null
          status: string
          updated_at: string
        }
        Insert: {
          arc_id?: string | null
          created_at?: string
          delay?: string | null
          id?: string
          label: string
          metadata?: Json
          payoff_chapter?: string | null
          project_id?: string | null
          risk?: string | null
          setup_chapter?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          arc_id?: string | null
          created_at?: string
          delay?: string | null
          id?: string
          label?: string
          metadata?: Json
          payoff_chapter?: string | null
          project_id?: string | null
          risk?: string | null
          setup_chapter?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payoffs_arc_id_fkey"
            columns: ["arc_id"]
            isOneToOne: false
            referencedRelation: "global_arcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payoffs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          name: string
          pitch: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          name: string
          pitch?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          pitch?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      revelations: {
        Row: {
          arc_id: string | null
          created_at: string
          delay: string | null
          id: string
          label: string
          metadata: Json
          payoff_chapter: string | null
          project_id: string | null
          risk: string | null
          setup_chapter: number | null
          status: string
          updated_at: string
        }
        Insert: {
          arc_id?: string | null
          created_at?: string
          delay?: string | null
          id?: string
          label: string
          metadata?: Json
          payoff_chapter?: string | null
          project_id?: string | null
          risk?: string | null
          setup_chapter?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          arc_id?: string | null
          created_at?: string
          delay?: string | null
          id?: string
          label?: string
          metadata?: Json
          payoff_chapter?: string | null
          project_id?: string | null
          risk?: string | null
          setup_chapter?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "revelations_arc_id_fkey"
            columns: ["arc_id"]
            isOneToOne: false
            referencedRelation: "global_arcs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revelations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      review_sessions: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          project_id: string | null
          scope: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          project_id?: string | null
          scope?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          project_id?: string | null
          scope?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_sessions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rewrite_tasks: {
        Row: {
          created_at: string
          diff: Json
          id: string
          metadata: Json
          project_id: string | null
          proposal: string | null
          requires_validation: boolean
          status: string
          target_id: string | null
          target_type: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          diff?: Json
          id?: string
          metadata?: Json
          project_id?: string | null
          proposal?: string | null
          requires_validation?: boolean
          status?: string
          target_id?: string | null
          target_type: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          diff?: Json
          id?: string
          metadata?: Json
          project_id?: string | null
          proposal?: string | null
          requires_validation?: boolean
          status?: string
          target_id?: string | null
          target_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewrite_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      run_inputs: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          ref_id: string | null
          run_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          ref_id?: string | null
          run_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          ref_id?: string | null
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "run_inputs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_outputs: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          run_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          run_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "run_outputs_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      run_steps: {
        Row: {
          agent_id: string | null
          created_at: string
          error: string | null
          finished_at: string | null
          id: string
          order_index: number
          output: Json
          payload: Json
          run_id: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          order_index: number
          output?: Json
          payload?: Json
          run_id?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          order_index?: number
          output?: Json
          payload?: Json
          run_id?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_steps_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      runs: {
        Row: {
          cost: string | null
          created_at: string
          duration: string | null
          findings: number
          finished_at: string | null
          id: string
          mode: string
          name: string
          payload: Json
          project_id: string | null
          result: Json
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cost?: string | null
          created_at?: string
          duration?: string | null
          findings?: number
          finished_at?: string | null
          id?: string
          mode?: string
          name: string
          payload?: Json
          project_id?: string | null
          result?: Json
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cost?: string | null
          created_at?: string
          duration?: string | null
          findings?: number
          finished_at?: string | null
          id?: string
          mode?: string
          name?: string
          payload?: Json
          project_id?: string | null
          result?: Json
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          chapter_id: string | null
          created_at: string
          id: string
          metadata: Json
          order_index: number
          summary: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          order_index: number
          summary?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          order_index?: number
          summary?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          created_at: string
          dimension: string
          id: string
          metadata: Json
          project_id: string | null
          rationale: string | null
          target_id: string | null
          target_type: string | null
          value: number
        }
        Insert: {
          created_at?: string
          dimension: string
          id?: string
          metadata?: Json
          project_id?: string | null
          rationale?: string | null
          target_id?: string | null
          target_type?: string | null
          value: number
        }
        Update: {
          created_at?: string
          dimension?: string
          id?: string
          metadata?: Json
          project_id?: string | null
          rationale?: string | null
          target_id?: string | null
          target_type?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "scores_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      source_files: {
        Row: {
          created_at: string
          id: string
          last_sync: string | null
          metadata: Json
          mime_type: string | null
          name: string
          remote_path: string
          repository_id: string | null
          size: number | null
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_sync?: string | null
          metadata?: Json
          mime_type?: string | null
          name: string
          remote_path: string
          repository_id?: string | null
          size?: number | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_sync?: string | null
          metadata?: Json
          mime_type?: string | null
          name?: string
          remote_path?: string
          repository_id?: string | null
          size?: number | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_files_repository_id_fkey"
            columns: ["repository_id"]
            isOneToOne: false
            referencedRelation: "source_repositories"
            referencedColumns: ["id"]
          },
        ]
      }
      source_repositories: {
        Row: {
          config: Json
          created_at: string
          id: string
          last_sync: string | null
          provider: string
          root_path: string
          status: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          last_sync?: string | null
          provider: string
          root_path: string
          status?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          last_sync?: string | null
          provider?: string
          root_path?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      text_annotations: {
        Row: {
          content: string | null
          created_at: string
          id: string
          payload: Json
          review_session_id: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          payload?: Json
          review_session_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          payload?: Json
          review_session_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "text_annotations_review_session_id_fkey"
            columns: ["review_session_id"]
            isOneToOne: false
            referencedRelation: "review_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tomes: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          number: number
          project_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          number: number
          project_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          number?: number
          project_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tomes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          payload: Json
          target_id: string | null
          target_type: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          payload?: Json
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          payload?: Json
          target_id?: string | null
          target_type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      voice_annotations: {
        Row: {
          audio_note_id: string | null
          created_at: string
          id: string
          payload: Json
          review_session_id: string | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          audio_note_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          review_session_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          audio_note_id?: string | null
          created_at?: string
          id?: string
          payload?: Json
          review_session_id?: string | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "voice_annotations_audio_note_id_fkey"
            columns: ["audio_note_id"]
            isOneToOne: false
            referencedRelation: "audio_notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_annotations_review_session_id_fkey"
            columns: ["review_session_id"]
            isOneToOne: false
            referencedRelation: "review_sessions"
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
