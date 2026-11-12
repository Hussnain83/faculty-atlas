
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.18'
  }
  "public": {
          Tables: {
            "achievements": {
                  Row: {
                    "created_at": string,"id": string,"kind": Database["public"]['Enums']["achievement_kind"],"organization": string,"person_id": string,"title": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["achievement_kind"],"organization"?: string,"person_id": string,"title": string,"year": number
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["achievement_kind"],"organization"?: string,"person_id"?: string,"title"?: string,"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "achievements_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    }
                  ]
                },"activity": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"id": number,"kind": Database["public"]['Enums']["activity_kind"],"subject": string,"summary": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"id"?: never,"kind": Database["public"]['Enums']["activity_kind"],"subject"?: string,"summary": string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"id"?: never,"kind"?: Database["public"]['Enums']["activity_kind"],"subject"?: string,"summary"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    }
                  ]
                },"cvs": {
                  Row: {
                    "file_name": string,"file_path": string,"pages": number | null,"person_id": string,"size_bytes": number,"uploaded_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "file_name": string,"file_path": string,"pages"?: number | null,"person_id": string,"size_bytes": number,"uploaded_at"?: string
                  }
                  Update: {
                    "file_name"?: string,"file_path"?: string,"pages"?: number | null,"person_id"?: string,"size_bytes"?: number,"uploaded_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cvs_person_id_fkey"
      columns: ["person_id"]
isOneToOne: true
      referencedRelation: "people"
      referencedColumns: ["id"]
    }
                  ]
                },"experiences": {
                  Row: {
                    "created_at": string,"description": string | null,"end_year": number | null,"id": string,"is_education": boolean,"organization": string,"person_id": string,"role": string,"start_year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"description"?: string | null,"end_year"?: number | null,"id"?: string,"is_education"?: boolean,"organization"?: string,"person_id": string,"role": string,"start_year": number
                  }
                  Update: {
                    "created_at"?: string,"description"?: string | null,"end_year"?: number | null,"id"?: string,"is_education"?: boolean,"organization"?: string,"person_id"?: string,"role"?: string,"start_year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "experiences_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    }
                  ]
                },"group_members": {
                  Row: {
                    "added_at": string,"added_by": string | null,"group_id": string,"person_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_at"?: string,"added_by"?: string | null,"group_id": string,"person_id": string
                  }
                  Update: {
                    "added_at"?: string,"added_by"?: string | null,"group_id"?: string,"person_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "group_members_group_id_fkey"
      columns: ["group_id"]
isOneToOne: false
      referencedRelation: "groups"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "group_members_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    }
                  ]
                },"groups": {
                  Row: {
                    "archived_at": string | null,"color": Database["public"]['Enums']["group_color"],"created_at": string,"description": string,"founded_year": number | null,"id": string,"lead_id": string | null,"name": string,"short_code": string,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"color"?: Database["public"]['Enums']["group_color"],"created_at"?: string,"description"?: string,"founded_year"?: number | null,"id"?: string,"lead_id"?: string | null,"name": string,"short_code": string,"slug": string
                  }
                  Update: {
                    "archived_at"?: string | null,"color"?: Database["public"]['Enums']["group_color"],"created_at"?: string,"description"?: string,"founded_year"?: number | null,"id"?: string,"lead_id"?: string | null,"name"?: string,"short_code"?: string,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "groups_lead_id_fkey"
      columns: ["lead_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    }
                  ]
                },"people": {
                  Row: {
                    "bio": string | null,"created_at": string,"department": string,"email": string,"full_name": string,"id": string,"joined_year": number | null,"office": string | null,"orcid": string | null,"phone_ext": string | null,"photo_path": string | null,"status": Database["public"]['Enums']["person_status"],"title": string,"updated_at": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "bio"?: string | null,"created_at"?: string,"department"?: string,"email": string,"full_name": string,"id"?: string,"joined_year"?: number | null,"office"?: string | null,"orcid"?: string | null,"phone_ext"?: string | null,"photo_path"?: string | null,"status"?: Database["public"]['Enums']["person_status"],"title"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Update: {
                    "bio"?: string | null,"created_at"?: string,"department"?: string,"email"?: string,"full_name"?: string,"id"?: string,"joined_year"?: number | null,"office"?: string | null,"orcid"?: string | null,"phone_ext"?: string | null,"photo_path"?: string | null,"status"?: Database["public"]['Enums']["person_status"],"title"?: string,"updated_at"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"person_skills": {
                  Row: {
                    "category": Database["public"]['Enums']["skill_category"],"person_id": string,"position": number,"skill": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: Database["public"]['Enums']["skill_category"],"person_id": string,"position"?: number,"skill": string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["skill_category"],"person_id"?: string,"position"?: number,"skill"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "person_skills_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    }
                  ]
                },"publication_authors": {
                  Row: {
                    "author_order": number,"person_id": string,"publication_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_order"?: number,"person_id": string,"publication_id": string
                  }
                  Update: {
                    "author_order"?: number,"person_id"?: string,"publication_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "publication_authors_person_id_fkey"
      columns: ["person_id"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "publication_authors_publication_id_fkey"
      columns: ["publication_id"]
isOneToOne: false
      referencedRelation: "publications"
      referencedColumns: ["id"]
    }
                  ]
                },"publications": {
                  Row: {
                    "citations": number,"created_at": string,"created_by": string | null,"doi": string | null,"external_authors": (string)[],"id": string,"kind": Database["public"]['Enums']["publication_kind"],"title": string,"updated_at": string,"venue": string,"year": number
                  }
                  ComputedFields: never
                  Insert: {
                    "citations"?: number,"created_at"?: string,"created_by"?: string | null,"doi"?: string | null,"external_authors"?: (string)[],"id"?: string,"kind": Database["public"]['Enums']["publication_kind"],"title": string,"updated_at"?: string,"venue"?: string,"year": number
                  }
                  Update: {
                    "citations"?: number,"created_at"?: string,"created_by"?: string | null,"doi"?: string | null,"external_authors"?: (string)[],"id"?: string,"kind"?: Database["public"]['Enums']["publication_kind"],"title"?: string,"updated_at"?: string,"venue"?: string,"year"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "publications_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "people"
      referencedColumns: ["id"]
    }
                  ]
                },"user_roles": {
                  Row: {
                    "created_at": string,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"role": Database["public"]['Enums']["app_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: Database["public"]['Enums']["app_role"],"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "activate_my_account":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"log_activity":
{ Args: { "p_actor": string,"p_kind": Database["public"]['Enums']["activity_kind"],"p_subject": string,"p_summary": string }; Returns: undefined
                           },
"my_account":
{ Args: Record<PropertyKey, never>; Returns: {
              "department": string,"full_name": string,"is_admin": boolean,"person_id": string,"photo_path": string,"status": Database["public"]['Enums']["person_status"],"title": string
            }[]
                           },
"person_publications":
{ Args: { "pid": string }; Returns: {
              "authors": Json,"citations": number,"doi": string,"external_authors": (string)[],"id": string,"kind": Database["public"]['Enums']["publication_kind"],"title": string,"venue": string,"year": number
            }[]
                           },
"publication_author_names":
{ Args: { "pub": string }; Returns: {
              "author_order": number,"display_name": string,"person_id": string,"visible": boolean
            }[]
                           }
          }
          Enums: {
            "achievement_kind": "award"|"grant"|"certificate","activity_kind": "publication"|"cv"|"person"|"award"|"group","app_role": "admin","group_color": "lagoon"|"coral"|"iris"|"saffron"|"mint","person_status": "invited"|"active"|"deactivated","publication_kind": "journal"|"conference","skill_category": "research"|"tools"|"teaching"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "achievement_kind": ["award", "grant", "certificate"],"activity_kind": ["publication", "cv", "person", "award", "group"],"app_role": ["admin"],"group_color": ["lagoon", "coral", "iris", "saffron", "mint"],"person_status": ["invited", "active", "deactivated"],"publication_kind": ["journal", "conference"],"skill_category": ["research", "tools", "teaching"]
          }
        }
} as const
