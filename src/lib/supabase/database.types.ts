/**
 * Supabase schema snapshot (Database / Json / enum unions).
 * 앱 헬퍼(Organization, ReservationRow 등)는 database.aliases.ts.
 * 생성: npm run supabase:types  → database.generated.ts
 * 검증: npm run check:db-types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MemberRole = 
  | 'owner' 
  | 'admin' 
  | 'manager' 
  | 'staff' 
  | 'parent' 
  | 'instructor' 
  | 'member' 
  | 'customer' 
  | 'guardian';
export type ScheduleStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type ReservationStatus = 'requested' | 'confirmed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded' | 'cancelled';
export type PaymentMethod =
  | 'cash'
  | 'card'
  | 'transfer'
  | 'online'
  | 'other'
  | 'local_currency'
  | 'onsite_card';
export type SaleStatus = 'completed' | 'cancelled' | 'refunded';
export type PointTransactionType = 'earn' | 'redeem' | 'adjust';
export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'cancelled';
export type NotificationChannel = 'app' | 'email' | 'sms' | 'kakao';
export type CheckInMethod = 'pin' | 'qr' | 'nfc' | 'kiosk' | 'manual';
export type GuardianRelationship = 'father' | 'mother' | 'other' | 'self';
export type CareJournalMood = 'good' | 'normal' | 'tired' | 'sick';
export type MedicationStatus = 'requested' | 'administered' | 'cancelled';
export type CurriculumProgressStatus = 'not_started' | 'in_progress' | 'completed';
export type AssignmentStatus = 'assigned' | 'in_progress' | 'submitted' | 'reviewed';
export type AchievementType =
  | 'exam'
  | 'competition'
  | 'certificate'
  | 'grade'
  | 'recital'
  | 'other';
export type LearningReportStatus = 'draft' | 'published' | 'archived';

export interface Database {
  core: {
    Tables: {
      academy_data_sharing_consents: {
        Row: {
          id: string;
          parent_id: string;
          student_id: string;
          organization_id: string;
          shared_fields: Json;
          consented_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          student_id: string;
          organization_id: string;
          shared_fields?: Json;
          consented_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['academy_data_sharing_consents']['Insert']>;
        Relationships: [];
      };
      auth_providers: {
        Row: {
          id: string;
          user_id: string;
          provider: string;
          provider_user_id: string;
          email: string | null;
          phone: string | null;
          metadata: Json;
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          provider: string;
          provider_user_id: string;
          email?: string | null;
          phone?: string | null;
          metadata?: Json;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['auth_providers']['Insert']>;
        Relationships: [];
      };
      customer_join_requests: {
        Row: {
          id: string;
          organization_id: string;
          applicant_user_id: string;
          applicant_name: string;
          applicant_phone: string | null;
          applicant_email: string | null;
          request_type: string;
          message: string | null;
          customer_metadata: Json;
          status: string;
          reviewed_by: string | null;
          reviewed_at: string | null;
          reject_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          applicant_user_id: string;
          applicant_name: string;
          applicant_phone?: string | null;
          applicant_email?: string | null;
          request_type?: string;
          message?: string | null;
          customer_metadata?: Json;
          status?: string;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          reject_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['customer_join_requests']['Insert']>;
        Relationships: [];
      };
      guardian_enrollment_requests: {
        Row: {
          id: string;
          parent_id: string;
          student_id: string;
          organization_id: string;
          status: string;
          requested_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          rejection_reason: string | null;
          consent_fields: Json;
          notes: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          student_id: string;
          organization_id: string;
          status?: string;
          requested_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          rejection_reason?: string | null;
          consent_fields?: Json;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['guardian_enrollment_requests']['Insert']>;
        Relationships: [];
      };
      guardian_link_tokens: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string | null;
          enrollment_id: string | null;
          token_hash: string;
          token_type: string;
          expires_at: string | null;
          max_uses: number;
          used_count: number;
          created_by: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id?: string | null;
          enrollment_id?: string | null;
          token_hash: string;
          token_type?: string;
          expires_at?: string | null;
          max_uses?: number;
          used_count?: number;
          created_by?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['guardian_link_tokens']['Insert']>;
        Relationships: [];
      };
      org_parent_profiles: {
        Row: {
          parent_id: string;
          organization_id: string;
          customer_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          parent_id: string;
          organization_id: string;
          customer_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['org_parent_profiles']['Insert']>;
        Relationships: [];
      };
      organization_join_requests: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          requested_role: string;
          status: string;
          message: string | null;
          rejection_reason: string | null;
          approved_by: string | null;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          requested_role?: string;
          status?: string;
          message?: string | null;
          rejection_reason?: string | null;
          approved_by?: string | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
        Update: Partial<Database['core']['Tables']['organization_join_requests']['Insert']>;
        Relationships: [];
      };
      organization_quotas: {
        Row: {
          id: string;
          organization_id: string;
          quota_type: string;
          quota_limit: number;
          quota_used: number;
          reset_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          quota_type: string;
          quota_limit: number;
          quota_used?: number;
          reset_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['organization_quotas']['Insert']>;
        Relationships: [];
      };
      parent_invitations: {
        Row: {
          id: string;
          organization_id: string;
          parent_customer_id: string;
          email: string;
          role: string;
          invited_by: string | null;
          status: string;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          parent_customer_id: string;
          email: string;
          role?: string;
          invited_by?: string | null;
          status?: string;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: Partial<Database['core']['Tables']['parent_invitations']['Insert']>;
        Relationships: [];
      };
      parent_student_guardians: {
        Row: {
          parent_id: string;
          student_id: string;
          relationship: string;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          parent_id: string;
          student_id: string;
          relationship?: string;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['parent_student_guardians']['Insert']>;
        Relationships: [];
      };
      parents: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          phone: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name?: string;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['parents']['Insert']>;
        Relationships: [];
      };
      practice_rooms: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          capacity: number;
          open_time: string;
          close_time: string;
          is_active: boolean;
          memo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          capacity?: number;
          open_time?: string;
          close_time?: string;
          is_active?: boolean;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['practice_rooms']['Insert']>;
        Relationships: [];
      };
      push_device_tokens: {
        Row: {
          id: string;
          user_id: string;
          organization_id: string | null;
          token: string;
          platform: 'ios' | 'android' | 'web';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          organization_id?: string | null;
          token: string;
          platform: 'ios' | 'android' | 'web';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['push_device_tokens']['Insert']>;
        Relationships: [];
      };
      rate_limit_configs: {
        Row: {
          id: string;
          limit_type: string;
          max_requests: number;
          window_seconds: number;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          limit_type: string;
          max_requests: number;
          window_seconds: number;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['rate_limit_configs']['Insert']>;
        Relationships: [];
      };
      room_reservations: {
        Row: {
          id: string;
          organization_id: string;
          room_id: string;
          customer_id: string;
          requested_by: string;
          starts_at: string;
          ends_at: string;
          status: string;
          memo: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          room_id: string;
          customer_id: string;
          requested_by: string;
          starts_at: string;
          ends_at: string;
          status?: string;
          memo?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['room_reservations']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'room_reservations_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_reservations_room_id_fkey';
            columns: ['room_id'];
            referencedRelation: 'bookable_resources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_reservations_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_reservations_requested_by_fkey';
            columns: ['requested_by'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      staff_invitations: {
        Row: {
          id: string;
          organization_id: string;
          staff_id: string;
          email: string;
          role: string;
          invited_by: string | null;
          status: string;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          staff_id: string;
          email: string;
          role?: string;
          invited_by?: string | null;
          status?: string;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: Partial<Database['core']['Tables']['staff_invitations']['Insert']>;
        Relationships: [];
      };
      student_enrollments: {
        Row: {
          id: string;
          student_id: string;
          organization_id: string;
          customer_id: string;
          status: string;
          enrolled_at: string;
          left_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          organization_id: string;
          customer_id: string;
          status?: string;
          enrolled_at?: string;
          left_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['student_enrollments']['Insert']>;
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          display_name: string;
          birth_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          display_name: string;
          birth_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['students']['Insert']>;
        Relationships: [];
      };
      anonymous_grievances: {
        Row: {
          id: string;
          organization_id: string;
          author_user_id: string | null;
          visibility: string;
          ticket_code: string;
          access_pin_hash: string | null;
          category: string;
          subject_title: string;
          incident_content: string;
          evidence_attached: boolean;
          status: string;
          investigation_feedback: string | null;
          submitted_at: string;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          author_user_id?: string | null;
          visibility?: string;
          ticket_code: string;
          access_pin_hash?: string | null;
          category?: string;
          subject_title: string;
          incident_content: string;
          evidence_attached?: boolean;
          status?: string;
          investigation_feedback?: string | null;
          submitted_at?: string;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['anonymous_grievances']['Insert']>;
        Relationships: [];
      };
      booking_seat_locks: {
        Row: {
          id: string;
          organization_id: string;
          remaining: number;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          remaining?: number;
          deleted_at?: string | null;
        };
        Update: Partial<Database['core']['Tables']['booking_seat_locks']['Insert']>;
        Relationships: [];
      };
      departments: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          manager_staff_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          manager_staff_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['departments']['Insert']>;
        Relationships: [];
      };
      mbo_cycle_settings: {
        Row: {
          organization_id: string;
          goal_lock_enabled: boolean;
          goal_lock_month: number;
          goal_lock_day: number;
          review_start_month: number;
          review_start_day: number;
          review_end_month: number;
          review_end_day: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          organization_id: string;
          goal_lock_enabled?: boolean;
          goal_lock_month?: number;
          goal_lock_day?: number;
          review_start_month?: number;
          review_start_day?: number;
          review_end_month?: number;
          review_end_day?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: Partial<Database['core']['Tables']['mbo_cycle_settings']['Insert']>;
        Relationships: [];
      };
      promotional_deals: {
        Row: {
          id: string;
          tenant_id: string;
          title: string;
          target_type: 'PASS' | 'RETAIL';
          target_id: string;
          original_price: number;
          special_price: number;
          start_at: string;
          end_at: string;
          limited_quantity: number | null;
          sold_quantity: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          title: string;
          target_type: 'PASS' | 'RETAIL';
          target_id: string;
          original_price: number;
          special_price: number;
          start_at: string;
          end_at: string;
          limited_quantity?: number | null;
          sold_quantity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          title?: string;
          target_type?: 'PASS' | 'RETAIL';
          target_id?: string;
          original_price?: number;
          special_price?: number;
          start_at?: string;
          end_at?: string;
          limited_quantity?: number | null;
          sold_quantity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "promotional_deals_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      dispatch_orders: {
        Row: {
          id: string;
          tenant_id: string;
          customer_id: string | null;
          staff_id: string | null;
          service_name: string;
          service_address: string;
          address_detail: string | null;
          scheduled_at: string;
          estimated_duration_min: number;
          travel_buffer_min: number;
          status: 'BOOKED' | 'ASSIGNED' | 'EN_ROUTE' | 'WORKING' | 'COMPLETED' | 'CANCELLED';
          before_photo_url: string | null;
          after_photo_url: string | null;
          memo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          customer_id?: string | null;
          staff_id?: string | null;
          service_name: string;
          service_address: string;
          address_detail?: string | null;
          scheduled_at: string;
          estimated_duration_min?: number;
          travel_buffer_min?: number;
          status?: 'BOOKED' | 'ASSIGNED' | 'EN_ROUTE' | 'WORKING' | 'COMPLETED' | 'CANCELLED';
          before_photo_url?: string | null;
          after_photo_url?: string | null;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          customer_id?: string | null;
          staff_id?: string | null;
          service_name?: string;
          service_address?: string;
          address_detail?: string | null;
          scheduled_at?: string;
          estimated_duration_min?: number;
          travel_buffer_min?: number;
          status?: 'BOOKED' | 'ASSIGNED' | 'EN_ROUTE' | 'WORKING' | 'COMPLETED' | 'CANCELLED';
          before_photo_url?: string | null;
          after_photo_url?: string | null;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dispatch_orders_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      space_cleanings: {
        Row: {
          id: string;
          tenant_id: string;
          resource_id: string;
          turnaround_min: number;
          status: 'DIRTY' | 'CLEANING' | 'READY';
          cleaned_by: string | null;
          cleaned_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          resource_id: string;
          turnaround_min?: number;
          status?: 'DIRTY' | 'CLEANING' | 'READY';
          cleaned_by?: string | null;
          cleaned_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          resource_id?: string;
          turnaround_min?: number;
          status?: 'DIRTY' | 'CLEANING' | 'READY';
          cleaned_by?: string | null;
          cleaned_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "space_cleanings_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      booking_waitlists: {
        Row: {
          id: string;
          tenant_id: string;
          booking_slot_id: string;
          customer_id: string;
          pass_id: string | null;
          queue_order: number;
          status: 'WAITING' | 'OFFERED' | 'EXPIRED' | 'CONVERTED';
          offered_at: string | null;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          booking_slot_id: string;
          customer_id: string;
          pass_id?: string | null;
          queue_order?: number;
          status?: 'WAITING' | 'OFFERED' | 'EXPIRED' | 'CONVERTED';
          offered_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          booking_slot_id?: string;
          customer_id?: string;
          pass_id?: string | null;
          queue_order?: number;
          status?: 'WAITING' | 'OFFERED' | 'EXPIRED' | 'CONVERTED';
          offered_at?: string | null;
          expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "booking_waitlists_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      bookable_resource_reservations: {
        Row: {
          id: string;
          organization_id: string;
          resource_id: string;
          customer_id: string | null;
          requested_by: string | null;
          time_slot: string;
          status: 'requested' | 'confirmed' | 'cancelled' | 'completed';
          memo: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          resource_id: string;
          customer_id?: string | null;
          requested_by?: string | null;
          time_slot: string;
          status?: 'requested' | 'confirmed' | 'cancelled' | 'completed';
          memo?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          resource_id?: string;
          customer_id?: string | null;
          requested_by?: string | null;
          time_slot?: string;
          status?: 'requested' | 'confirmed' | 'cancelled' | 'completed';
          memo?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookable_resource_reservations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      fsm_transition_logs: {
        Row: {
          id: string;
          organization_id: string;
          domain: string;
          entity_id: string;
          from_state: string;
          to_state: string;
          actor_id: string | null;
          actor_role: string | null;
          reason: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          domain: string;
          entity_id: string;
          from_state: string;
          to_state: string;
          actor_id?: string | null;
          actor_role?: string | null;
          reason?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          domain?: string;
          entity_id?: string;
          from_state?: string;
          to_state?: string;
          actor_id?: string | null;
          actor_role?: string | null;
          reason?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fsm_transition_logs_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      resource_reservations: {
        Row: {
          id: string;
          organization_id: string;
          resource_id: string;
          customer_id: string | null;
          requested_by: string | null;
          time_slot: string;
          status: string;
          memo: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          resource_id: string;
          customer_id?: string | null;
          requested_by?: string | null;
          time_slot: string;
          status?: string;
          memo?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          resource_id?: string;
          customer_id?: string | null;
          requested_by?: string | null;
          time_slot?: string;
          status?: string;
          memo?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "resource_reservations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "resource_reservations_resource_id_fkey";
            columns: ["resource_id"];
            isOneToOne: false;
            referencedRelation: "bookable_resources";
            referencedColumns: ["id"];
          }
        ];
      };
      financial_ledgers: {
        Row: {
          id: string;
          organization_id: string;
          account_type: string;
          reference_entity_type: string;
          reference_entity_id: string;
          entry_type: 'DEBIT' | 'CREDIT';
          amount: number;
          balance_after: number;
          description: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          account_type: string;
          reference_entity_type: string;
          reference_entity_id: string;
          entry_type: 'DEBIT' | 'CREDIT';
          amount: number;
          balance_after: number;
          description: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          account_type?: string;
          reference_entity_type?: string;
          reference_entity_id?: string;
          entry_type?: 'DEBIT' | 'CREDIT';
          amount?: number;
          balance_after?: number;
          description?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "financial_ledgers_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      activities: {
        Row: {
          id: string;
          organization_id: string;
          actor_id: string | null;
          actor_name: string;
          target_type: string;
          target_id: string;
          activity_type: string;
          title: string;
          content: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          actor_id?: string | null;
          actor_name: string;
          target_type: string;
          target_id: string;
          activity_type: string;
          title: string;
          content?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          actor_id?: string | null;
          actor_name?: string;
          target_type?: string;
          target_id?: string;
          activity_type?: string;
          title?: string;
          content?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "activities_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      generic_entity_records: {
        Row: {
          id: string;
          organization_id: string;
          entity_type: string;
          reference_id: string | null;
          record_key: string | null;
          payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          entity_type: string;
          reference_id?: string | null;
          record_key?: string | null;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          entity_type?: string;
          reference_id?: string | null;
          record_key?: string | null;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generic_entity_records_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          }
        ];
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          industry_type: string;
          slug: string | null;
          settings: Json;
          is_active: boolean;
          public_code: string;
          postal: string | null;
          sido: string | null;
          sigungu: string | null;
          dong: string | null;
          jibun: string | null;
          road_address: string | null;
          address_detail: string | null;
          business_registration_number: string | null;
          biz_status: string | null;
          biz_checked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          industry_type?: string;
          slug?: string | null;
          settings?: Json;
          is_active?: boolean;
          public_code?: string;
          postal?: string | null;
          sido?: string | null;
          sigungu?: string | null;
          dong?: string | null;
          jibun?: string | null;
          road_address?: string | null;
          address_detail?: string | null;
          business_registration_number?: string | null;
          biz_status?: string | null;
          biz_checked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          industry_type?: string;
          slug?: string | null;
          settings?: Json;
          is_active?: boolean;
          public_code?: string;
          postal?: string | null;
          sido?: string | null;
          sigungu?: string | null;
          dong?: string | null;
          jibun?: string | null;
          road_address?: string | null;
          address_detail?: string | null;
          business_registration_number?: string | null;
          biz_status?: string | null;
          biz_checked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: MemberRole;
          staff_id: string | null;
          parent_customer_id: string | null;
          is_active: boolean;
          custom_role_id: string | null;
          organization_role_id: string | null;
          token_version: number;
          joined_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: MemberRole;
          staff_id?: string | null;
          parent_customer_id?: string | null;
          is_active?: boolean;
          custom_role_id?: string | null;
          organization_role_id?: string | null;
          token_version?: number;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: MemberRole;
          staff_id?: string | null;
          parent_customer_id?: string | null;
          is_active?: boolean;
          custom_role_id?: string | null;
          organization_role_id?: string | null;
          token_version?: number;
          joined_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'organization_members_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'organization_members_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      organization_roles: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          description: string;
          is_system: boolean;
          permissions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          description?: string;
          is_system?: boolean;
          permissions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['organization_roles']['Insert']>;
        Relationships: [];
      };
      parent_student_links: {
        Row: {
          organization_id: string;
          parent_customer_id: string;
          student_customer_id: string;
          relationship: GuardianRelationship;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          parent_customer_id: string;
          student_customer_id: string;
          relationship?: GuardianRelationship;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['parent_student_links']['Insert']>;
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          phone: string | null;
          email: string | null;
          status: string;
          metadata: Json;
          memo: string | null;
          deleted_at: string | null;
          chosung: string | null;
          check_in_pin_hash: string | null;
          /** NULL = 비회원(전화 예약·원 등록). 로그인 User와 연결되면 UUID */
          user_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          phone?: string | null;
          email?: string | null;
          status?: string;
          metadata?: Json;
          memo?: string | null;
          deleted_at?: string | null;
          chosung?: string | null;
          check_in_pin_hash?: string | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          phone?: string | null;
          email?: string | null;
          status?: string;
          metadata?: Json;
          memo?: string | null;
          deleted_at?: string | null;
          chosung?: string | null;
          check_in_pin_hash?: string | null;
          user_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customers_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customers_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      customer_phone_history: {
        Row: {
          id: string;
          customer_id: string;
          organization_id: string;
          old_phone: string | null;
          new_phone: string;
          changed_by: string | null;
          change_reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          organization_id: string;
          old_phone?: string | null;
          new_phone: string;
          changed_by?: string | null;
          change_reason?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          customer_id?: string;
          organization_id?: string;
          old_phone?: string | null;
          new_phone?: string;
          changed_by?: string | null;
          change_reason?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      attendance_sessions: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          session_date: string;
          check_in_at: string | null;
          check_out_at: string | null;
          check_in_method: CheckInMethod | null;
          check_out_method: CheckInMethod | null;
          memo: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          session_date: string;
          check_in_at?: string | null;
          check_out_at?: string | null;
          check_in_method?: CheckInMethod | null;
          check_out_method?: CheckInMethod | null;
          memo?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['attendance_sessions']['Insert']>;
        Relationships: [];
      };
      care_journals: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          journal_date: string;
          mood: CareJournalMood;
          meals: string;
          nap: string;
          activities: string;
          bowel: string | null;
          health_note: string | null;
          teacher_note: string;
          staff_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          journal_date: string;
          mood?: CareJournalMood;
          meals?: string;
          nap?: string;
          activities?: string;
          bowel?: string | null;
          health_note?: string | null;
          teacher_note?: string;
          staff_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['care_journals']['Insert']>;
        Relationships: [];
      };
      medication_requests: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          request_date: string;
          medicine_name: string;
          dosage: string;
          times: string;
          reason: string;
          guardian_name: string | null;
          status: MedicationStatus;
          administered_at: string | null;
          administered_by: string | null;
          note: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          request_date: string;
          medicine_name: string;
          dosage?: string;
          times?: string;
          reason?: string;
          guardian_name?: string | null;
          status?: MedicationStatus;
          administered_at?: string | null;
          administered_by?: string | null;
          note?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['medication_requests']['Insert']>;
        Relationships: [];
      };
      care_child_records: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          vaccination_checked_at: string | null;
          health_check_date: string | null;
          allergy_note: string | null;
          authorized_pickups: Json;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          vaccination_checked_at?: string | null;
          health_check_date?: string | null;
          allergy_note?: string | null;
          authorized_pickups?: Json;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['care_child_records']['Insert']>;
        Relationships: [];
      };
      care_incidents: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          occurred_at: string;
          content: string;
          action_taken: string;
          parent_notified_at: string | null;
          staff_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          occurred_at: string;
          content?: string;
          action_taken?: string;
          parent_notified_at?: string | null;
          staff_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['care_incidents']['Insert']>;
        Relationships: [];
      };
      care_staff_health_certs: {
        Row: {
          id: string;
          organization_id: string;
          staff_id: string;
          expires_at: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          staff_id: string;
          expires_at: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['care_staff_health_certs']['Insert']>;
        Relationships: [];
      };
      care_safety_logs: {
        Row: {
          id: string;
          organization_id: string;
          log_date: string;
          kind: 'fire_drill' | 'safety_inspection';
          items: Json;
          note: string | null;
          staff_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          log_date: string;
          kind: 'fire_drill' | 'safety_inspection';
          items?: Json;
          note?: string | null;
          staff_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['care_safety_logs']['Insert']>;
        Relationships: [];
      };
      care_meal_samples: {
        Row: {
          id: string;
          organization_id: string;
          menu_name: string;
          stored_at: string;
          dispose_at: string;
          staff_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          menu_name: string;
          stored_at: string;
          dispose_at: string;
          staff_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['care_meal_samples']['Insert']>;
        Relationships: [];
      };
      care_cctv_requests: {
        Row: {
          id: string;
          organization_id: string;
          requested_at: string;
          purpose: string;
          applicant_name: string;
          applicant_staff_id: string | null;
          status: 'requested' | 'approved' | 'rejected';
          reviewed_at: string | null;
          reviewed_by: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          requested_at: string;
          purpose?: string;
          applicant_name?: string;
          applicant_staff_id?: string | null;
          status?: 'requested' | 'approved' | 'rejected';
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['care_cctv_requests']['Insert']>;
        Relationships: [];
      };
      care_pickup_logs: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          pickup_date: string;
          picked_up_at: string;
          picker_name: string;
          relation: string;
          outside_consent: boolean;
          staff_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          pickup_date: string;
          picked_up_at: string;
          picker_name?: string;
          relation?: string;
          outside_consent?: boolean;
          staff_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['care_pickup_logs']['Insert']>;
        Relationships: [];
      };
      customer_contacts: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          name: string;
          relationship: string | null;
          phone: string | null;
          email: string | null;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          name: string;
          relationship?: string | null;
          phone?: string | null;
          email?: string | null;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          customer_id?: string;
          name?: string;
          relationship?: string | null;
          phone?: string | null;
          email?: string | null;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      staff: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string | null;
          name: string;
          phone: string | null;
          email: string | null;
          status: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id?: string | null;
          name: string;
          phone?: string | null;
          email?: string | null;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string | null;
          name?: string;
          phone?: string | null;
          email?: string | null;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          description: string | null;
          price: number;
          duration_minutes: number;
          is_active: boolean;
          is_schedulable: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          description?: string | null;
          price?: number;
          duration_minutes?: number;
          is_active?: boolean;
          is_schedulable?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          description?: string | null;
          price?: number;
          duration_minutes?: number;
          is_active?: boolean;
          is_schedulable?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      service_staff: {
        Row: {
          service_id: string;
          staff_id: string;
        };
        Insert: {
          service_id: string;
          staff_id: string;
        };
        Update: {
          service_id?: string;
          staff_id?: string;
        };
        Relationships: [];
      };
      schedules: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string | null;
          staff_id: string | null;
          service_id: string | null;
          starts_at: string;
          ends_at: string;
          status: ScheduleStatus;
          memo: string | null;
          metadata: Json;
          session_pass_id: string | null;
          room: string | null;
          room_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id?: string | null;
          staff_id?: string | null;
          service_id?: string | null;
          starts_at: string;
          ends_at: string;
          status?: ScheduleStatus;
          memo?: string | null;
          metadata?: Json;
          session_pass_id?: string | null;
          room?: string | null;
          room_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          customer_id?: string | null;
          staff_id?: string | null;
          service_id?: string | null;
          starts_at?: string;
          ends_at?: string;
          status?: ScheduleStatus;
          memo?: string | null;
          metadata?: Json;
          session_pass_id?: string | null;
          room?: string | null;
          room_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'schedules_session_pass_id_fkey';
            columns: ['session_pass_id'];
            referencedRelation: 'session_passes';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          title: string;
          billed_amount: number;
          paid_amount: number;
          due_date: string | null;
          status: PaymentStatus;
          payment_method: PaymentMethod | null;
          paid_at: string | null;
          receipt_number: string | null;
          memo: string | null;
          metadata: Json;
          sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          title: string;
          billed_amount?: number;
          paid_amount?: number;
          due_date?: string | null;
          status?: PaymentStatus;
          payment_method?: PaymentMethod | null;
          paid_at?: string | null;
          receipt_number?: string | null;
          memo?: string | null;
          metadata?: Json;
          sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          customer_id?: string;
          title?: string;
          billed_amount?: number;
          paid_amount?: number;
          due_date?: string | null;
          status?: PaymentStatus;
          payment_method?: PaymentMethod | null;
          paid_at?: string | null;
          receipt_number?: string | null;
          memo?: string | null;
          metadata?: Json;
          sent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_transactions: {
        Row: {
          id: string;
          organization_id: string;
          payment_id: string;
          amount: number;
          payment_method: PaymentMethod;
          paid_at: string;
          receipt_number: string | null;
          memo: string | null;
          cash_receipt_issued: boolean;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          payment_id: string;
          amount: number;
          payment_method: PaymentMethod;
          paid_at?: string;
          receipt_number?: string | null;
          memo?: string | null;
          cash_receipt_issued?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          payment_id?: string;
          amount?: number;
          payment_method?: PaymentMethod;
          paid_at?: string;
          receipt_number?: string | null;
          memo?: string | null;
          cash_receipt_issued?: boolean;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          organization_id: string;
          expense_date: string;
          category: string;
          amount: number;
          payment_method: PaymentMethod;
          description: string;
          recipient: string | null;
          vendor: string | null;
          memo: string | null;
          receipt_memo: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          expense_date: string;
          category: string;
          amount: number;
          payment_method?: PaymentMethod;
          description?: string;
          recipient?: string | null;
          vendor?: string | null;
          memo?: string | null;
          receipt_memo?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['expenses']['Insert']>;
        Relationships: [];
      };
      income_entries: {
        Row: {
          id: string;
          organization_id: string;
          income_date: string;
          category: string;
          amount: number;
          payment_method: PaymentMethod;
          description: string;
          payer: string | null;
          memo: string | null;
          source_type: string;
          source_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          income_date: string;
          category: string;
          amount: number;
          payment_method?: PaymentMethod;
          description?: string;
          payer?: string | null;
          memo?: string | null;
          source_type?: string;
          source_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['income_entries']['Insert']>;
        Relationships: [];
      };
      teacher_payroll_settlements: {
        Row: {
          id: string;
          organization_id: string;
          teacher_id: string;
          year_month: string;
          pay_type: string;
          quantity: number;
          rate: number;
          calculated_amount: number;
          adjustment_amount: number;
          adjustment_reason: string | null;
          final_amount: number;
          confirmed_at: string;
          expense_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          teacher_id: string;
          year_month: string;
          pay_type: string;
          quantity?: number;
          rate?: number;
          calculated_amount: number;
          adjustment_amount?: number;
          adjustment_reason?: string | null;
          final_amount: number;
          confirmed_at?: string;
          expense_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['teacher_payroll_settlements']['Insert']>;
        Relationships: [];
      };
      product_categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['product_categories']['Insert']>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          category_id: string | null;
          product_code: string | null;
          price: number;
          cost: number | null;
          image_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          category_id?: string | null;
          product_code?: string | null;
          price: number;
          cost?: number | null;
          image_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['products']['Insert']>;
        Relationships: [];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          name: string;
          sku: string | null;
          price: number | null;
          cost: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          name: string;
          sku?: string | null;
          price?: number | null;
          cost?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['product_variants']['Insert']>;
        Relationships: [];
      };
      inventory: {
        Row: {
          id: string;
          organization_id: string;
          product_id: string | null;
          variant_id: string | null;
          quantity: number;
          stock_location_id: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          quantity?: number;
          stock_location_id: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['inventory']['Insert']>;
        Relationships: [];
      };
      stock_locations: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          code: string;
          department_id: string | null;
          is_active: boolean;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          code: string;
          department_id?: string | null;
          is_active?: boolean;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['stock_locations']['Insert']>;
        Relationships: [];
      };
      stock_movements: {
        Row: {
          id: string;
          organization_id: string;
          product_id: string | null;
          variant_id: string | null;
          movement_type: Database['core']['Enums']['stock_movement_type'];
          quantity: number;
          reference_type: string | null;
          reference_id: string | null;
          reason: string | null;
          lot_number: string | null;
          expiry_date: string | null;
          stock_location_id: string | null;
          source_location_id: string | null;
          destination_location_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          movement_type: Database['core']['Enums']['stock_movement_type'];
          quantity: number;
          reference_type?: string | null;
          reference_id?: string | null;
          reason?: string | null;
          lot_number?: string | null;
          expiry_date?: string | null;
          stock_location_id?: string | null;
          source_location_id?: string | null;
          destination_location_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['stock_movements']['Insert']>;
        Relationships: [];
      };
      stock_lots: {
        Row: {
          id: string;
          organization_id: string;
          product_id: string;
          variant_id: string | null;
          lot_number: string;
          expiry_date: string | null;
          quantity: number;
          location_name: string | null;
          stock_location_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id: string;
          variant_id?: string | null;
          lot_number: string;
          expiry_date?: string | null;
          quantity?: number;
          location_name?: string | null;
          stock_location_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['stock_lots']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'stock_lots_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'stock_lots_product_id_fkey';
            columns: ['product_id'];
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
        ];
      };
      sales: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string | null;
          total_amount: number;
          points_used: number;
          payment_method: PaymentMethod;
          status: SaleStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id?: string | null;
          total_amount?: number;
          points_used?: number;
          payment_method?: PaymentMethod;
          status?: SaleStatus;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['sales']['Insert']>;
        Relationships: [];
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          product_id: string | null;
          variant_id: string | null;
          product_name_snapshot: string;
          quantity: number;
          unit_price: number;
          discount_amount: number;
          line_amount: number;
        };
        Insert: {
          id?: string;
          sale_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_name_snapshot: string;
          quantity: number;
          unit_price: number;
          discount_amount?: number;
          line_amount: number;
        };
        Update: Partial<Database['core']['Tables']['sale_items']['Insert']>;
        Relationships: [];
      };
      sale_returns: {
        Row: {
          id: string;
          organization_id: string;
          sale_id: string;
          total_amount: number;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          sale_id: string;
          total_amount?: number;
          reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['sale_returns']['Insert']>;
        Relationships: [];
      };
      sale_return_items: {
        Row: {
          id: string;
          sale_return_id: string;
          sale_item_id: string;
          product_id: string | null;
          variant_id: string | null;
          product_name_snapshot: string;
          quantity: number;
          unit_price: number;
          line_amount: number;
        };
        Insert: {
          id?: string;
          sale_return_id: string;
          sale_item_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          product_name_snapshot: string;
          quantity: number;
          unit_price: number;
          line_amount: number;
        };
        Update: Partial<Database['core']['Tables']['sale_return_items']['Insert']>;
        Relationships: [];
      };
      point_accounts: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          balance: number;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          balance?: number;
          updated_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['point_accounts']['Insert']>;
        Relationships: [];
      };
      point_transactions: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          type: PointTransactionType;
          amount: number;
          balance_after: number;
          earn_rate_percent: number | null;
          base_amount: number | null;
          reference_type: string | null;
          reference_id: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          type: PointTransactionType;
          amount: number;
          balance_after: number;
          earn_rate_percent?: number | null;
          base_amount?: number | null;
          reference_type?: string | null;
          reference_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['point_transactions']['Insert']>;
        Relationships: [];
      };
      consultations: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          staff_id: string | null;
          consultation_date: string;
          type: string;
          content: string | null;
          result: string | null;
          follow_up: string | null;
          next_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          staff_id?: string | null;
          consultation_date?: string;
          type?: string;
          content?: string | null;
          result?: string | null;
          follow_up?: string | null;
          next_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          customer_id?: string;
          staff_id?: string | null;
          consultation_date?: string;
          type?: string;
          content?: string | null;
          result?: string | null;
          follow_up?: string | null;
          next_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          organization_id: string;
          type: string;
          title: string;
          message: string;
          target_type: string | null;
          target_id: string | null;
          status: NotificationStatus;
          channel: NotificationChannel;
          scheduled_at: string | null;
          sent_at: string | null;
          metadata: Json;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          type: string;
          title: string;
          message: string;
          target_type?: string | null;
          target_id?: string | null;
          status?: NotificationStatus;
          channel?: NotificationChannel;
          scheduled_at?: string | null;
          sent_at?: string | null;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          type?: string;
          title?: string;
          message?: string;
          target_type?: string | null;
          target_id?: string | null;
          status?: NotificationStatus;
          channel?: NotificationChannel;
          scheduled_at?: string | null;
          sent_at?: string | null;
          metadata?: Json;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      availability_rules: {
        Row: {
          id: string;
          organization_id: string;
          staff_id: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          slot_minutes: number;
          title: string;
          max_capacity: number;
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          staff_id?: string | null;
          day_of_week: number;
          start_time: string;
          end_time: string;
          slot_minutes?: number;
          title?: string;
          max_capacity?: number;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          staff_id?: string | null;
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          slot_minutes?: number;
          title?: string;
          max_capacity?: number;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      availability_overrides: {
        Row: {
          id: string;
          organization_id: string;
          staff_id: string | null;
          override_date: string;
          is_closed: boolean;
          start_time: string | null;
          end_time: string | null;
          slot_minutes: number | null;
          title: string | null;
          max_capacity: number | null;
          is_active: boolean;
          reason: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          staff_id?: string | null;
          override_date: string;
          is_closed?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          slot_minutes?: number | null;
          title?: string | null;
          max_capacity?: number | null;
          is_active?: boolean;
          reason?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          staff_id?: string | null;
          override_date?: string;
          is_closed?: boolean;
          start_time?: string | null;
          end_time?: string | null;
          slot_minutes?: number | null;
          title?: string | null;
          max_capacity?: number | null;
          is_active?: boolean;
          reason?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          id: string;
          organization_id: string;
          schedule_id: string;
          customer_id: string | null;
          user_id: string | null;
          applicant_name: string;
          applicant_phone: string | null;
          applicant_email: string | null;
          request_message: string | null;
          status: ReservationStatus;
          confirmed_by: string | null;
          confirmed_at: string | null;
          cancelled_by: string | null;
          cancelled_at: string | null;
          cancel_reason: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          schedule_id: string;
          customer_id?: string | null;
          user_id?: string | null;
          applicant_name: string;
          applicant_phone?: string | null;
          applicant_email?: string | null;
          request_message?: string | null;
          status?: ReservationStatus;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          schedule_id?: string;
          customer_id?: string | null;
          user_id?: string | null;
          applicant_name?: string;
          applicant_phone?: string | null;
          applicant_email?: string | null;
          request_message?: string | null;
          status?: ReservationStatus;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          cancel_reason?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bookable_resources: {
        Row: {
          id: string;
          organization_id: string;
          kind: string;
          name: string;
          capacity: number;
          open_time: string;
          close_time: string;
          is_active: boolean;
          memo: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          kind: string;
          name: string;
          capacity?: number;
          open_time?: string;
          close_time?: string;
          is_active?: boolean;
          memo?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['bookable_resources']['Insert']>;
        Relationships: [];
      };
      customer_sessions: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          started_at: string;
          ended_at: string | null;
          status: CustomerSessionStatus;
          source: string;
          context: string | null;
          staff_id: string | null;
          booking_id: string | null;
          reservation_id: string | null;
          pass_id: string | null;
          payment_id: string | null;
          resource_id: string | null;
          memo: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          started_at?: string;
          ended_at?: string | null;
          status?: CustomerSessionStatus;
          source?: string;
          context?: string | null;
          staff_id?: string | null;
          booking_id?: string | null;
          reservation_id?: string | null;
          pass_id?: string | null;
          payment_id?: string | null;
          resource_id?: string | null;
          memo?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['customer_sessions']['Insert']>;
        Relationships: [];
      };
      waitlist_entries: {
        Row: {
          id: string;
          organization_id: string;
          target_type: string;
          target_id: string;
          customer_id: string;
          schedule_id: string | null;
          requested_time: string | null;
          status: WaitlistStatus;
          position: number;
          joined_at: string;
          notified_at: string | null;
          assigned_at: string | null;
          cancelled_at: string | null;
          expired_at: string | null;
          booking_id: string | null;
          reservation_id: string | null;
          notification_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          target_type: string;
          target_id: string;
          customer_id: string;
          schedule_id?: string | null;
          requested_time?: string | null;
          status?: WaitlistStatus;
          position: number;
          joined_at?: string;
          notified_at?: string | null;
          assigned_at?: string | null;
          cancelled_at?: string | null;
          expired_at?: string | null;
          booking_id?: string | null;
          reservation_id?: string | null;
          notification_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['waitlist_entries']['Insert']>;
        Relationships: [];
      };
      checklist_templates: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          purpose: string;
          target_type: string | null;
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          purpose?: string;
          target_type?: string | null;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['checklist_templates']['Insert']>;
        Relationships: [];
      };
      checklist_items: {
        Row: {
          id: string;
          organization_id: string;
          template_id: string;
          title: string;
          required: boolean;
          sort_order: number;
          metadata: Json;
        };
        Insert: {
          id?: string;
          organization_id: string;
          template_id: string;
          title: string;
          required?: boolean;
          sort_order: number;
          metadata?: Json;
        };
        Update: Partial<Database['core']['Tables']['checklist_items']['Insert']>;
        Relationships: [];
      };
      ops_tasks: {
        Row: {
          id: string;
          organization_id: string;
          target_type: string;
          target_id: string;
          template_id: string | null;
          assigned_staff_id: string | null;
          status: OpsTaskStatus;
          priority: OpsTaskPriority;
          due_at: string | null;
          completed_at: string | null;
          issue_id: string | null;
          notification_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          target_type: string;
          target_id: string;
          template_id?: string | null;
          assigned_staff_id?: string | null;
          status?: OpsTaskStatus;
          priority?: OpsTaskPriority;
          due_at?: string | null;
          completed_at?: string | null;
          issue_id?: string | null;
          notification_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['ops_tasks']['Insert']>;
        Relationships: [];
      };
      ops_task_checks: {
        Row: {
          id: string;
          organization_id: string;
          task_id: string;
          item_id: string | null;
          title: string;
          required: boolean;
          sort_order: number;
          completed: boolean;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          task_id: string;
          item_id?: string | null;
          title: string;
          required?: boolean;
          sort_order: number;
          completed?: boolean;
          completed_at?: string | null;
        };
        Update: Partial<Database['core']['Tables']['ops_task_checks']['Insert']>;
        Relationships: [];
      };
      maintenance_issues: {
        Row: {
          id: string;
          organization_id: string;
          target_type: string;
          target_id: string;
          reported_by: string;
          assigned_staff_id: string | null;
          task_id: string | null;
          status: OpsIssueStatus;
          description: string;
          resolution: string | null;
          resolved_at: string | null;
          notification_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          target_type: string;
          target_id: string;
          reported_by: string;
          assigned_staff_id?: string | null;
          task_id?: string | null;
          status?: OpsIssueStatus;
          description: string;
          resolution?: string | null;
          resolved_at?: string | null;
          notification_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['maintenance_issues']['Insert']>;
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          code: string;
          slug: string;
          address: string | null;
          phone: string | null;
          timezone: string;
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          code: string;
          slug: string;
          address?: string | null;
          phone?: string | null;
          timezone?: string;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['locations']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'locations_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      permission_catalog: {
        Row: {
          permission: string;
          resource: string;
          action: string;
          description: string;
        };
        Insert: {
          permission: string;
          resource: string;
          action: string;
          description: string;
        };
        Update: Partial<Database['core']['Tables']['permission_catalog']['Insert']>;
        Relationships: [];
      };
      authorization_grants: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          permission: string;
          scope_type: string;
          scope_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          permission: string;
          scope_type?: string;
          scope_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['authorization_grants']['Insert']>;
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          organization_id: string;
          location_id: string | null;
          actor_user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          before_data: Json | null;
          after_data: Json | null;
          request_id: string | null;
          idempotency_key: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          location_id?: string | null;
          actor_user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id: string;
          before_data?: Json | null;
          after_data?: Json | null;
          request_id?: string | null;
          idempotency_key?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['audit_logs']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'audit_logs_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'audit_logs_location_id_fkey';
            columns: ['location_id'];
            referencedRelation: 'locations';
            referencedColumns: ['id'];
          },
        ];
      };
      idempotency_keys: {
        Row: {
          id: string;
          organization_id: string;
          key: string;
          operation: string;
          actor_user_id: string | null;
          request_hash: string;
          status: IdempotencyKeyStatus;
          response_payload: Json | null;
          error_message: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          key: string;
          operation: string;
          actor_user_id?: string | null;
          request_hash: string;
          status: IdempotencyKeyStatus;
          response_payload?: Json | null;
          error_message?: string | null;
          created_at?: string;
          expires_at?: string;
        };
        Update: Partial<Database['core']['Tables']['idempotency_keys']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'idempotency_keys_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      outbox_events: {
        Row: {
          id: string;
          organization_id: string;
          location_id: string | null;
          aggregate_type: string;
          aggregate_id: string;
          event_type: OutboxEventType;
          payload: Json;
          status: OutboxEventStatus;
          attempts: number;
          available_at: string;
          processed_at: string | null;
          last_error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          location_id?: string | null;
          aggregate_type: string;
          aggregate_id: string;
          event_type: OutboxEventType;
          payload?: Json;
          status?: OutboxEventStatus;
          attempts?: number;
          available_at?: string;
          processed_at?: string | null;
          last_error?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['outbox_events']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'outbox_events_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'outbox_events_location_id_fkey';
            columns: ['location_id'];
            referencedRelation: 'locations';
            referencedColumns: ['id'];
          },
        ];
      };
      session_passes: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          customer_name: string;
          label: string;
          total_sessions: number;
          used_sessions: number;
          status: SessionPassStatus;
          purchased_at: string;
          expires_at: string | null;
          memo: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          customer_name?: string;
          label?: string;
          total_sessions: number;
          used_sessions?: number;
          status?: SessionPassStatus;
          purchased_at?: string;
          expires_at?: string | null;
          memo?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['session_passes']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'session_passes_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'session_passes_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'session_passes_customer_org_fkey';
            columns: ['customer_id', 'organization_id'];
            referencedRelation: 'customers';
            referencedColumns: ['id', 'organization_id'];
          },
        ];
      };
      /** 20260928 parent-link hotfix 감사 스냅샷. service_role 전용 (anon/authenticated 권한 없음). */
      security_profile_email_snapshot: {
        Row: {
          user_id: string;
          profile_email: string | null;
          auth_email: string | null;
          captured_at: string;
        };
        Insert: {
          user_id: string;
          profile_email?: string | null;
          auth_email?: string | null;
          captured_at?: string;
        };
        Update: Partial<Database['core']['Tables']['security_profile_email_snapshot']['Insert']>;
        Relationships: [];
      };
      /** 보호자 연결 코드 preview/redeem 시도 기록 (클라이언트 접근 불가, RPC 내부 전용) */
      guardian_link_attempts: {
        Row: {
          id: string;
          user_id: string;
          action: 'preview' | 'redeem';
          token_hash: string | null;
          success: boolean;
          reason: string | null;
          organization_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: 'preview' | 'redeem';
          token_hash?: string | null;
          success?: boolean;
          reason?: string | null;
          organization_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['guardian_link_attempts']['Insert']>;
        Relationships: [];
      };
      onboarding_tokens: {
        Row: {
          id: string;
          tenant_id: string;
          issuer_type: 'STORE' | 'CUSTOMER' | 'STORE_STAFF_INVITE';
          claim_token: string;
          customer_id: string | null;
          payload: Json;
          expires_at: string;
          is_used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          issuer_type: 'STORE' | 'CUSTOMER' | 'STORE_STAFF_INVITE';
          claim_token: string;
          customer_id?: string | null;
          payload?: Json;
          expires_at?: string;
          is_used?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['onboarding_tokens']['Insert']>;
        Relationships: [];
      };
      tenant_operating_hours: {
        Row: {
          id: string;
          tenant_id: string;
          day_type: string;
          start_time: string;
          end_time: string;
          slot_minutes: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          day_type: string;
          start_time: string;
          end_time: string;
          slot_minutes?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['tenant_operating_hours']['Insert']>;
        Relationships: [];
      };
      tenant_roles: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          rank_order: number;
          permissions: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          rank_order?: number;
          permissions?: Json;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['tenant_roles']['Insert']>;
        Relationships: [];
      };
      lockers: {
        Row: {
          id: string;
          tenant_id: string;
          locker_number: string;
          section: string;
          status: string;
          assigned_customer_id: string | null;
          deposit_amount: number | null;
          monthly_fee: number | null;
          created_at: string;
          updated_at: string;
          start_date: string | null;
          expires_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          locker_number: string;
          section?: string;
          status?: string;
          assigned_customer_id?: string | null;
          deposit_amount?: number | null;
          monthly_fee?: number | null;
          created_at?: string;
          updated_at?: string;
          start_date?: string | null;
          expires_at?: string | null;
        };
        Update: Partial<Database['core']['Tables']['lockers']['Insert']>;
        Relationships: [];
      };
      passes: {
        Row: {
          id: string;
          tenant_id: string;
          customer_id: string | null;
          pass_name: string;
          pass_type: string;
          total_count: number;
          remaining_count: number;
          status: string;
          is_active: boolean;
          start_date: string;
          expires_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          customer_id?: string | null;
          pass_name: string;
          pass_type?: string;
          total_count?: number;
          remaining_count?: number;
          status?: string;
          is_active?: boolean;
          start_date?: string;
          expires_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['passes']['Insert']>;
        Relationships: [];
      };
      web_push_subscriptions: {
        Row: {
          id: string;
          tenant_id: string | null;
          user_id: string | null;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          user_id?: string | null;
          endpoint: string;
          p256dh: string;
          auth: string;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['web_push_subscriptions']['Insert']>;
        Relationships: [];
      };
      customer_notifications: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          title: string;
          body: string;
          category: string;
          is_read: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          title: string;
          body: string;
          category?: string;
          is_read?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['customer_notifications']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'customer_notifications_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customer_notifications_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      customer_transfer_tokens: {
        Row: {
          id: string;
          organization_id: string;
          token_hash: string;
          target_phone: string;
          target_customer_name: string;
          target_customer_id: string | null;
          created_by: string | null;
          created_at: string;
          expires_at: string;
          used_at: string | null;
          metadata: Json;
        };
        Insert: {
          id?: string;
          organization_id: string;
          token_hash: string;
          target_phone: string;
          target_customer_name: string;
          target_customer_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          expires_at?: string;
          used_at?: string | null;
          metadata?: Json;
        };
        Update: Partial<Database['core']['Tables']['customer_transfer_tokens']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'customer_transfer_tokens_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customer_transfer_tokens_target_customer_id_fkey';
            columns: ['target_customer_id'];
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      workplace_policies: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          category: string;
          content: string;
          version: number;
          is_mandatory: boolean;
          effective_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          category?: string;
          content: string;
          version?: number;
          is_mandatory?: boolean;
          effective_date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['workplace_policies']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'workplace_policies_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      policy_acknowledgements: {
        Row: {
          id: string;
          organization_id: string;
          policy_id: string;
          policy_version: number;
          staff_id: string;
          acknowledged_at: string;
          signature_data_url: string;
          ip_address: string | null;
          user_agent: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          policy_id: string;
          policy_version: number;
          staff_id: string;
          acknowledged_at?: string;
          signature_data_url: string;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: Partial<Database['core']['Tables']['policy_acknowledgements']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'policy_acknowledgements_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'policy_acknowledgements_policy_id_fkey';
            columns: ['policy_id'];
            referencedRelation: 'workplace_policies';
            referencedColumns: ['id'];
          },
        ];
      };
      feedbacks: {
        Row: {
          id: string;
          organization_id: string;
          author_type: string;
          author_id: string | null;
          title: string;
          content: string;
          status: string;
          is_internal_only: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          author_type: string;
          author_id?: string | null;
          title: string;
          content: string;
          status?: string;
          is_internal_only?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['feedbacks']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'feedbacks_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      handover_notes: {
        Row: {
          id: string;
          organization_id: string;
          shift_date: string;
          shift_type: string;
          writer_staff_id: string;
          content: string;
          checklist_items: Json;
          confirmed_by_next_shift_staff_id: string | null;
          confirmed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          shift_date?: string;
          shift_type?: string;
          writer_staff_id: string;
          content: string;
          checklist_items?: Json;
          confirmed_by_next_shift_staff_id?: string | null;
          confirmed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['handover_notes']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'handover_notes_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      incident_logs: {
        Row: {
          id: string;
          organization_id: string;
          occurred_at: string;
          severity: string;
          title: string;
          description: string;
          reporter_staff_id: string | null;
          involved_customer_id: string | null;
          actions_taken: string | null;
          preventive_measures: string | null;
          is_resolved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          occurred_at?: string;
          severity?: string;
          title: string;
          description: string;
          reporter_staff_id?: string | null;
          involved_customer_id?: string | null;
          actions_taken?: string | null;
          preventive_measures?: string | null;
          is_resolved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['incident_logs']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'incident_logs_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      trial_leads: {
        Row: {
          id: string;
          organization_id: string;
          customer_name: string;
          phone: string;
          source: string;
          status: string;
          target_program: string | null;
          trial_date: string | null;
          assigned_staff_id: string | null;
          notes: string | null;
          drop_reason: string | null;
          converted_pass_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_name: string;
          phone: string;
          source?: string;
          status?: string;
          target_program?: string | null;
          trial_date?: string | null;
          assigned_staff_id?: string | null;
          notes?: string | null;
          drop_reason?: string | null;
          converted_pass_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['trial_leads']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'trial_leads_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      learning_journals: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string;
          author_staff_id: string;
          lesson_date: string;
          title: string;
          content: string;
          practice_homework: string | null;
          media_urls: string[];
          parent_viewed_at: string | null;
          parent_acknowledgement: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id: string;
          author_staff_id: string;
          lesson_date?: string;
          title: string;
          content: string;
          practice_homework?: string | null;
          media_urls?: string[];
          parent_viewed_at?: string | null;
          parent_acknowledgement?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['learning_journals']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'learning_journals_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      learning_journal_comments: {
        Row: {
          id: string;
          journal_id: string;
          author_id: string;
          author_role: string;
          author_name: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          journal_id: string;
          author_id: string;
          author_role: string;
          author_name: string;
          content: string;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['learning_journal_comments']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'learning_journal_comments_journal_id_fkey';
            columns: ['journal_id'];
            referencedRelation: 'learning_journals';
            referencedColumns: ['id'];
          },
        ];
      };
      level_assessments: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          target_program: string;
          assessment_date: string;
          passing_score: number;
          rubric_items: Json;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          target_program: string;
          assessment_date: string;
          passing_score?: number;
          rubric_items?: Json;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['level_assessments']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'level_assessments_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      assessment_results: {
        Row: {
          id: string;
          organization_id: string;
          assessment_id: string;
          student_id: string;
          student_name: string;
          current_level: string;
          target_level: string;
          scores: Json;
          total_score: number;
          is_passed: boolean;
          certificate_number: string | null;
          evaluator_feedback: string | null;
          evaluated_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          assessment_id: string;
          student_id: string;
          student_name: string;
          current_level: string;
          target_level: string;
          scores?: Json;
          total_score?: number;
          is_passed?: boolean;
          certificate_number?: string | null;
          evaluator_feedback?: string | null;
          evaluated_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['assessment_results']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'assessment_results_assessment_id_fkey';
            columns: ['assessment_id'];
            referencedRelation: 'level_assessments';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assessment_results_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      space_turnarounds: {
        Row: {
          id: string;
          organization_id: string;
          room_id: string;
          room_name: string;
          booking_id: string | null;
          service_start_at: string;
          service_end_at: string;
          buffer_minutes: number;
          buffer_end_at: string;
          status: string;
          cleaner_staff_id: string | null;
          checklist: Json;
          cleaned_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          room_id: string;
          room_name: string;
          booking_id?: string | null;
          service_start_at: string;
          service_end_at: string;
          buffer_minutes?: number;
          buffer_end_at: string;
          status?: string;
          cleaner_staff_id?: string | null;
          checklist?: Json;
          cleaned_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['space_turnarounds']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'space_turnarounds_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      supply_restock_items: {
        Row: {
          id: string;
          organization_id: string;
          item_name: string;
          category: string;
          current_quantity: number;
          safety_threshold: number;
          optimal_order_quantity: number;
          unit: string;
          unit_cost: number;
          vendor_name: string;
          vendor_contact: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          item_name: string;
          category?: string;
          current_quantity?: number;
          safety_threshold?: number;
          optimal_order_quantity?: number;
          unit?: string;
          unit_cost?: number;
          vendor_name: string;
          vendor_contact?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['supply_restock_items']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'supply_restock_items_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      purchase_orders: {
        Row: {
          id: string;
          organization_id: string;
          po_number: string;
          vendor_name: string;
          vendor_contact: string | null;
          order_items: Json;
          total_amount: number;
          status: string;
          memo: string | null;
          sent_at: string | null;
          received_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          po_number: string;
          vendor_name: string;
          vendor_contact?: string | null;
          order_items?: Json;
          total_amount?: number;
          status?: string;
          memo?: string | null;
          sent_at?: string | null;
          received_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['purchase_orders']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'purchase_orders_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      makeup_tokens: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string;
          student_name: string;
          origin_reason: string;
          origin_date: string;
          expires_at: string;
          status: string;
          used_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id: string;
          student_name: string;
          origin_reason?: string;
          origin_date: string;
          expires_at: string;
          status?: string;
          used_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['makeup_tokens']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'makeup_tokens_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      makeup_slots: {
        Row: {
          id: string;
          organization_id: string;
          instructor_id: string | null;
          instructor_name: string;
          room_name: string;
          slot_date: string;
          start_time: string;
          end_time: string;
          capacity: number;
          reserved_count: number;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          instructor_id?: string | null;
          instructor_name: string;
          room_name: string;
          slot_date: string;
          start_time: string;
          end_time: string;
          capacity?: number;
          reserved_count?: number;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['makeup_slots']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'makeup_slots_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      makeup_reservations: {
        Row: {
          id: string;
          organization_id: string;
          token_id: string;
          slot_id: string;
          student_id: string;
          student_name: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          token_id: string;
          slot_id: string;
          student_id: string;
          student_name: string;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['makeup_reservations']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'makeup_reservations_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      intake_templates: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          industry_target: string;
          question_sections: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          industry_target?: string;
          question_sections?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['intake_templates']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'intake_templates_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      intake_submissions: {
        Row: {
          id: string;
          organization_id: string;
          template_id: string;
          customer_id: string | null;
          customer_name: string;
          customer_phone: string | null;
          answers: Json;
          risk_flags: Json;
          has_critical_condition: boolean;
          summary_notes: string | null;
          signed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          template_id: string;
          customer_id?: string | null;
          customer_name: string;
          customer_phone?: string | null;
          answers?: Json;
          risk_flags?: Json;
          has_critical_condition?: boolean;
          summary_notes?: string | null;
          signed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['intake_submissions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'intake_submissions_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      daily_care_logs: {
        Row: {
          id: string;
          organization_id: string;
          subject_id: string;
          subject_name: string;
          subject_type: string;
          log_date: string;
          meal_status: string;
          potty_status: string;
          nap_minutes: number;
          medication_given: boolean;
          condition_rating: number;
          summary_comment: string;
          dispatch_status: string;
          dispatched_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          subject_id: string;
          subject_name: string;
          subject_type?: string;
          log_date: string;
          meal_status?: string;
          potty_status?: string;
          nap_minutes?: number;
          medication_given?: boolean;
          condition_rating?: number;
          summary_comment?: string;
          dispatch_status?: string;
          dispatched_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['daily_care_logs']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'daily_care_logs_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      care_timeline_entries: {
        Row: {
          id: string;
          organization_id: string;
          care_log_id: string;
          entry_time: string;
          category: string;
          note: string;
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          care_log_id: string;
          entry_time: string;
          category: string;
          note: string;
          image_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['care_timeline_entries']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'care_timeline_entries_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      substitute_requests: {
        Row: {
          id: string;
          organization_id: string;
          requester_staff_id: string;
          requester_name: string;
          class_name: string;
          target_date: string;
          start_time: string;
          end_time: string;
          reason: string;
          reason_detail: string | null;
          pay_rate_type: string;
          offered_fee: number;
          assigned_staff_id: string | null;
          assigned_name: string | null;
          status: string;
          approved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          requester_staff_id: string;
          requester_name: string;
          class_name: string;
          target_date: string;
          start_time: string;
          end_time: string;
          reason?: string;
          reason_detail?: string | null;
          pay_rate_type?: string;
          offered_fee?: number;
          assigned_staff_id?: string | null;
          assigned_name?: string | null;
          status?: string;
          approved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['substitute_requests']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'substitute_requests_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      substitute_bids: {
        Row: {
          id: string;
          organization_id: string;
          request_id: string;
          candidate_staff_id: string;
          candidate_name: string;
          bid_message: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          request_id: string;
          candidate_staff_id: string;
          candidate_name: string;
          bid_message?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['substitute_bids']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'substitute_bids_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      entry_pass_tickets: {
        Row: {
          id: string;
          organization_id: string;
          ticket_number: string;
          customer_name: string;
          customer_phone: string | null;
          ticket_type: string;
          valid_date: string;
          price: number;
          status: string;
          security_hash: string;
          checked_in_at: string | null;
          checked_out_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          ticket_number: string;
          customer_name: string;
          customer_phone?: string | null;
          ticket_type?: string;
          valid_date: string;
          price?: number;
          status?: string;
          security_hash: string;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['entry_pass_tickets']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'entry_pass_tickets_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      entry_pass_scans: {
        Row: {
          id: string;
          organization_id: string;
          ticket_id: string | null;
          ticket_number: string;
          scanner_staff_id: string | null;
          scan_action: string;
          scan_result: string;
          scan_message: string | null;
          scanned_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          ticket_id?: string | null;
          ticket_number: string;
          scanner_staff_id?: string | null;
          scan_action?: string;
          scan_result: string;
          scan_message?: string | null;
          scanned_at?: string;
        };
        Update: Partial<Database['core']['Tables']['entry_pass_scans']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'entry_pass_scans_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      event_contests: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          event_category: string;
          event_date: string;
          venue_name: string;
          entry_fee: number;
          registration_deadline: string;
          rubric_criteria: Json;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          event_category?: string;
          event_date: string;
          venue_name: string;
          entry_fee?: number;
          registration_deadline: string;
          rubric_criteria?: Json;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['event_contests']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'event_contests_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      event_contest_entries: {
        Row: {
          id: string;
          organization_id: string;
          contest_id: string;
          participant_id: string | null;
          participant_name: string;
          performance_piece: string;
          entry_order: number;
          score_details: Json;
          final_score: number;
          award_title: string | null;
          certificate_issued: boolean;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          contest_id: string;
          participant_id?: string | null;
          participant_name: string;
          performance_piece: string;
          entry_order?: number;
          score_details?: Json;
          final_score?: number;
          award_title?: string | null;
          certificate_issued?: boolean;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['event_contest_entries']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'event_contest_entries_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      facility_incident_reports: {
        Row: {
          id: string;
          organization_id: string;
          incident_title: string;
          incident_date: string;
          incident_type: string;
          severity: string;
          location_in_facility: string;
          involved_person_name: string;
          involved_person_role: string;
          witness_name: string | null;
          supervisor_name: string | null;
          description: string;
          injury_details: string | null;
          emergency_action_taken: string | null;
          guardian_notified_at: string | null;
          hospital_transported: boolean;
          insurance_claimed: boolean;
          insurance_claim_number: string | null;
          preventative_action: string | null;
          status: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          incident_title: string;
          incident_date?: string;
          incident_type?: string;
          severity?: string;
          location_in_facility: string;
          involved_person_name: string;
          involved_person_role?: string;
          witness_name?: string | null;
          supervisor_name?: string | null;
          description: string;
          injury_details?: string | null;
          emergency_action_taken?: string | null;
          guardian_notified_at?: string | null;
          hospital_transported?: boolean;
          insurance_claimed?: boolean;
          insurance_claim_number?: string | null;
          preventative_action?: string | null;
          status?: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['facility_incident_reports']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'facility_incident_reports_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      facility_incident_timelines: {
        Row: {
          id: string;
          organization_id: string;
          incident_id: string;
          recorded_at: string;
          action_type: string;
          actor_name: string;
          note: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          incident_id: string;
          recorded_at?: string;
          action_type?: string;
          actor_name: string;
          note: string;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['facility_incident_timelines']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'facility_incident_timelines_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'facility_incident_timelines_incident_id_fkey';
            columns: ['incident_id'];
            referencedRelation: 'facility_incident_reports';
            referencedColumns: ['id'];
          },
        ];
      };
      nps_survey_campaigns: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          target_audience: string;
          description: string | null;
          status: string;
          started_at: string | null;
          ended_at: string | null;
          survey_questions: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          target_audience?: string;
          description?: string | null;
          status?: string;
          started_at?: string | null;
          ended_at?: string | null;
          survey_questions?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['nps_survey_campaigns']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'nps_survey_campaigns_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      nps_survey_responses: {
        Row: {
          id: string;
          organization_id: string;
          campaign_id: string;
          respondent_name: string | null;
          respondent_phone: string | null;
          is_anonymous: boolean;
          nps_score: number;
          sentiment_category: string;
          instructor_rating: number | null;
          facility_rating: number | null;
          curriculum_rating: number | null;
          feedback_text: string | null;
          action_status: string;
          action_note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          campaign_id: string;
          respondent_name?: string | null;
          respondent_phone?: string | null;
          is_anonymous?: boolean;
          nps_score: number;
          sentiment_category?: string;
          instructor_rating?: number | null;
          facility_rating?: number | null;
          curriculum_rating?: number | null;
          feedback_text?: string | null;
          action_status?: string;
          action_note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['nps_survey_responses']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'nps_survey_responses_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'nps_survey_responses_campaign_id_fkey';
            columns: ['campaign_id'];
            referencedRelation: 'nps_survey_campaigns';
            referencedColumns: ['id'];
          },
        ];
      };
      achievement_quests: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          description: string | null;
          category: string;
          target_count: number;
          unit: string;
          badge_tier: string;
          badge_icon_name: string;
          reward_points: number;
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          description?: string | null;
          category?: string;
          target_count?: number;
          unit?: string;
          badge_tier?: string;
          badge_icon_name?: string;
          reward_points?: number;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['achievement_quests']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'achievement_quests_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      achievement_quest_members: {
        Row: {
          id: string;
          organization_id: string;
          quest_id: string;
          member_name: string;
          member_identifier: string | null;
          current_progress: number;
          is_completed: boolean;
          completed_at: string | null;
          badge_issued: boolean;
          badge_issued_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          quest_id: string;
          member_name: string;
          member_identifier?: string | null;
          current_progress?: number;
          is_completed?: boolean;
          completed_at?: string | null;
          badge_issued?: boolean;
          badge_issued_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['achievement_quest_members']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'achievement_quest_members_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'achievement_quest_members_quest_id_fkey';
            columns: ['quest_id'];
            referencedRelation: 'achievement_quests';
            referencedColumns: ['id'];
          },
        ];
      };
      parking_batches: {
        Row: {
          id: string;
          organization_id: string;
          batch_name: string;
          ticket_type: string;
          allocated_minutes: number;
          unit_cost: number;
          purchased_quantity: number;
          used_quantity: number;
          purchased_date: string;
          expires_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          batch_name: string;
          ticket_type?: string;
          allocated_minutes?: number;
          unit_cost?: number;
          purchased_quantity?: number;
          used_quantity?: number;
          purchased_date?: string;
          expires_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['parking_batches']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'parking_batches_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      parking_registrations: {
        Row: {
          id: string;
          organization_id: string;
          batch_id: string | null;
          vehicle_number: string;
          visitor_name: string;
          visitor_role: string;
          purpose: string;
          registered_at: string;
          free_minutes: number;
          tickets_used: number;
          status: string;
          memo: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          batch_id?: string | null;
          vehicle_number: string;
          visitor_name: string;
          visitor_role?: string;
          purpose?: string;
          registered_at?: string;
          free_minutes?: number;
          tickets_used?: number;
          status?: string;
          memo?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['parking_registrations']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'parking_registrations_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'parking_registrations_batch_id_fkey';
            columns: ['batch_id'];
            referencedRelation: 'parking_batches';
            referencedColumns: ['id'];
          },
        ];
      };
      emergency_broadcasts: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          emergency_type: string;
          severity: string;
          effective_start: string;
          effective_end: string | null;
          closure_reason: string;
          makeup_policy_notice: string | null;
          target_audience: string;
          is_active: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          emergency_type?: string;
          severity?: string;
          effective_start?: string;
          effective_end?: string | null;
          closure_reason: string;
          makeup_policy_notice?: string | null;
          target_audience?: string;
          is_active?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['emergency_broadcasts']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'emergency_broadcasts_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      emergency_broadcast_receipts: {
        Row: {
          id: string;
          organization_id: string;
          broadcast_id: string;
          recipient_name: string;
          recipient_phone: string | null;
          recipient_role: string;
          is_acknowledged: boolean;
          acknowledged_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          broadcast_id: string;
          recipient_name: string;
          recipient_phone?: string | null;
          recipient_role?: string;
          is_acknowledged?: boolean;
          acknowledged_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['emergency_broadcast_receipts']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'emergency_broadcast_receipts_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'emergency_broadcast_receipts_broadcast_id_fkey';
            columns: ['broadcast_id'];
            referencedRelation: 'emergency_broadcasts';
            referencedColumns: ['id'];
          },
        ];
      };
      digital_guestbook_entries: {
        Row: {
          id: string;
          organization_id: string;
          visitor_name: string;
          phone: string;
          visit_purpose: string;
          interested_program: string | null;
          referral_source: string | null;
          privacy_agreed: boolean;
          marketing_agreed: boolean;
          signature_svg: string | null;
          assigned_staff_name: string | null;
          notes: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          visitor_name: string;
          phone: string;
          visit_purpose?: string;
          interested_program?: string | null;
          referral_source?: string | null;
          privacy_agreed?: boolean;
          marketing_agreed?: boolean;
          signature_svg?: string | null;
          assigned_staff_name?: string | null;
          notes?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['digital_guestbook_entries']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'digital_guestbook_entries_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      mbo_objectives: {
        Row: {
          id: string;
          organization_id: string;
          parent_id: string | null;
          level: 'company' | 'department' | 'individual' | 'project';
          department_name: string | null;
          owner_id: string | null;
          owner_name: string;
          title: string;
          description: string | null;
          success_criteria: string | null;
          status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'canceled';
          start_date: string;
          target_date: string;
          weight: number;
          progress_rate: number;
          rejection_reason: string | null;
          approved_by: string | null;
          approved_at: string | null;
          revision: number;
          is_sample: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          parent_id?: string | null;
          level?: 'company' | 'department' | 'individual' | 'project';
          department_name?: string | null;
          owner_id?: string | null;
          owner_name: string;
          title: string;
          description?: string | null;
          success_criteria?: string | null;
          status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'canceled';
          start_date: string;
          target_date: string;
          weight?: number;
          progress_rate?: number;
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          revision?: number;
          is_sample?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['mbo_objectives']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'mbo_objectives_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mbo_objectives_parent_id_fkey';
            columns: ['parent_id'];
            referencedRelation: 'mbo_objectives';
            referencedColumns: ['id'];
          },
        ];
      };
      project_categories: {
        Row: {
          id: string;
          organization_id: string;
          category_key: string;
          label: string;
          color: string | null;
          sort_order: number;
          is_active: boolean;
          archived_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          category_key: string;
          label: string;
          color?: string | null;
          sort_order?: number;
          is_active?: boolean;
          archived_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['project_categories']['Insert']>;
        Relationships: [];
      };
      patents: {
        Row: {
          id: string;
          organization_id: string;
          application_no: string;
          title: string;
          summary: string | null;
          tech_field: string | null;
          inventor_ids: Json;
          status: string;
          filing_date: string | null;
          document_urls: Json;
          payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          application_no?: string;
          title: string;
          summary?: string | null;
          tech_field?: string | null;
          inventor_ids?: Json;
          status?: string;
          filing_date?: string | null;
          document_urls?: Json;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['patents']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'patents_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      shuttle_registrations: {
        Row: {
          id: string;
          tenant_id: string;
          member_id: string;
          route_id: string | null;
          pickup_stop_id: string | null;
          dropoff_stop_id: string | null;
          is_active: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          member_id: string;
          route_id?: string | null;
          pickup_stop_id?: string | null;
          dropoff_stop_id?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['shuttle_registrations']['Insert']>;
        Relationships: [];
      };
      shuttle_routes: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          direction: string;
          departure_time: string;
          capacity: number;
          is_active: boolean;
          driver_name: string | null;
          driver_phone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          direction?: string;
          departure_time: string;
          capacity?: number;
          is_active?: boolean;
          driver_name?: string | null;
          driver_phone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['shuttle_routes']['Insert']>;
        Relationships: [];
      };
      shuttle_stops: {
        Row: {
          id: string;
          route_id: string;
          stop_order: number;
          stop_name: string;
          pickup_time: string | null;
          dropoff_time: string | null;
          pickup_location_detail: string | null;
          is_pickup: boolean;
          is_dropoff: boolean;
        };
        Insert: {
          id?: string;
          route_id: string;
          stop_order: number;
          stop_name: string;
          pickup_time?: string | null;
          dropoff_time?: string | null;
          pickup_location_detail?: string | null;
          is_pickup?: boolean;
          is_dropoff?: boolean;
        };
        Update: Partial<Database['core']['Tables']['shuttle_stops']['Insert']>;
        Relationships: [];
      };
      volunteer_activities: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          activity_type: string;
          description: string | null;
          capacity: number;
          event_date: string | null;
          status: 'open' | 'closed' | 'cancelled';
          created_by_member_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          activity_type?: string;
          description?: string | null;
          capacity: number;
          event_date?: string | null;
          status?: 'open' | 'closed' | 'cancelled';
          created_by_member_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['volunteer_activities']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'volunteer_activities_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      volunteer_signups: {
        Row: {
          id: string;
          organization_id: string;
          activity_id: string;
          member_id: string;
          created_at: string;
          checked_in_at: string | null;
        };
        Insert: {
          id?: string;
          organization_id: string;
          activity_id: string;
          member_id: string;
          created_at?: string;
          checked_in_at?: string | null;
        };
        Update: Partial<Database['core']['Tables']['volunteer_signups']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'volunteer_signups_activity_id_fkey';
            columns: ['activity_id'];
            referencedRelation: 'volunteer_activities';
            referencedColumns: ['id'];
          },
        ];
      };
      meal_survey_settings: {
        Row: {
          organization_id: string;
          offer_breakfast: boolean;
          offer_lunch: boolean;
          offer_dinner: boolean;
          default_eating: boolean;
          breakfast_cutoff_time: string;
          breakfast_cutoff_prev_day: boolean;
          lunch_cutoff_time: string;
          lunch_cutoff_prev_day: boolean;
          dinner_cutoff_time: string;
          dinner_cutoff_prev_day: boolean;
          updated_at: string;
        };
        Insert: {
          organization_id: string;
          offer_breakfast?: boolean;
          offer_lunch?: boolean;
          offer_dinner?: boolean;
          default_eating?: boolean;
          breakfast_cutoff_time?: string;
          breakfast_cutoff_prev_day?: boolean;
          lunch_cutoff_time?: string;
          lunch_cutoff_prev_day?: boolean;
          dinner_cutoff_time?: string;
          dinner_cutoff_prev_day?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['meal_survey_settings']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'meal_survey_settings_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      meal_survey_responses: {
        Row: {
          id: string;
          organization_id: string;
          member_id: string;
          meal_date: string;
          meal_slot: 'breakfast' | 'lunch' | 'dinner';
          status: 'eating' | 'skipping';
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          member_id: string;
          meal_date: string;
          meal_slot: 'breakfast' | 'lunch' | 'dinner';
          status: 'eating' | 'skipping';
          updated_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['meal_survey_responses']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'meal_survey_responses_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      office_supply_catalog_items: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          unit: string;
          estimated_unit_price: number;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          unit?: string;
          estimated_unit_price?: number;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['office_supply_catalog_items']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'office_supply_catalog_items_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      office_supply_campaigns: {
        Row: {
          id: string;
          organization_id: string;
          year_month: string;
          deadline_at: string;
          status: 'open' | 'closed';
          closed_at: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          year_month: string;
          deadline_at: string;
          status?: 'open' | 'closed';
          closed_at?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['office_supply_campaigns']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'office_supply_campaigns_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      office_supply_request_lines: {
        Row: {
          id: string;
          organization_id: string;
          campaign_id: string;
          member_id: string;
          department_id: string | null;
          catalog_item_id: string;
          quantity: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          campaign_id: string;
          member_id: string;
          department_id?: string | null;
          catalog_item_id: string;
          quantity: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['office_supply_request_lines']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'office_supply_request_lines_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'office_supply_request_lines_campaign_id_fkey';
            columns: ['campaign_id'];
            referencedRelation: 'office_supply_campaigns';
            referencedColumns: ['id'];
          },
        ];
      };
      resource_types: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          category: 'EQUIPMENT' | 'SPACE';
          kind_slug: string;
          requires_approval: boolean;
          spec_schema: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          category: 'EQUIPMENT' | 'SPACE';
          kind_slug: string;
          requires_approval?: boolean;
          spec_schema?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['resource_types']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'resource_types_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      research_projects: {
        Row: {
          id: string;
          organization_id: string;
          code: string | null;
          title: string;
          summary: string | null;
          status: 'draft' | 'active' | 'gate_review' | 'completed' | 'suspended' | 'canceled';
          category_id: string | null;
          start_date: string;
          end_date: string;
          budget_planned: number;
          budget_spent: number;
          progress_rate: number;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          code?: string | null;
          title: string;
          summary?: string | null;
          status?: 'draft' | 'active' | 'gate_review' | 'completed' | 'suspended' | 'canceled';
          category_id?: string | null;
          start_date: string;
          end_date: string;
          budget_planned?: number;
          budget_spent?: number;
          progress_rate?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['research_projects']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'research_projects_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'research_projects_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'project_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      research_project_members: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          member_id: string | null;
          member_name: string;
          role: 'lead' | 'co_lead' | 'member';
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          member_id?: string | null;
          member_name: string;
          role: 'lead' | 'co_lead' | 'member';
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['research_project_members']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'research_project_members_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'research_projects';
            referencedColumns: ['id'];
          },
        ];
      };
      research_project_deliverables: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          title: string;
          due_date: string | null;
          status: 'planned' | 'submitted' | 'accepted' | 'rejected';
          evidence_url: string | null;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          title: string;
          due_date?: string | null;
          status?: 'planned' | 'submitted' | 'accepted' | 'rejected';
          evidence_url?: string | null;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['research_project_deliverables']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'research_project_deliverables_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'research_projects';
            referencedColumns: ['id'];
          },
        ];
      };
      research_project_gates: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          gate_order: number;
          title: string;
          criteria: string | null;
          status: 'pending' | 'in_approval' | 'approved' | 'rejected' | 'skipped';
          approval_request_id: string | null;
          decided_by: string | null;
          decided_by_name: string | null;
          decided_at: string | null;
          decision_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          gate_order: number;
          title: string;
          criteria?: string | null;
          status?: 'pending' | 'in_approval' | 'approved' | 'rejected' | 'skipped';
          approval_request_id?: string | null;
          decided_by?: string | null;
          decided_by_name?: string | null;
          decided_at?: string | null;
          decision_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['research_project_gates']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'research_project_gates_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'research_projects';
            referencedColumns: ['id'];
          },
        ];
      };
      mbo_projects: {
        Row: {
          id: string;
          organization_id: string;
          objective_id: string;
          title: string;
          description: string | null;
          owner_id: string | null;
          owner_name: string;
          status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'canceled';
          start_date: string;
          target_date: string;
          evaluation_period: string;
          progress_rate: number;
          rejection_reason: string | null;
          approved_by: string | null;
          approved_at: string | null;
          revision: number;
          category_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          objective_id: string;
          title: string;
          description?: string | null;
          owner_id?: string | null;
          owner_name: string;
          status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'canceled';
          start_date: string;
          target_date: string;
          evaluation_period?: string;
          progress_rate?: number;
          rejection_reason?: string | null;
          approved_by?: string | null;
          approved_at?: string | null;
          revision?: number;
          category_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['mbo_projects']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'mbo_projects_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mbo_projects_objective_id_fkey';
            columns: ['objective_id'];
            referencedRelation: 'mbo_objectives';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mbo_projects_category_id_fkey';
            columns: ['category_id'];
            referencedRelation: 'project_categories';
            referencedColumns: ['id'];
          },
        ];
      };
      mbo_progress_logs: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          author_id: string | null;
          author_name: string;
          log_date: string;
          progress_rate: number;
          achievements: string;
          issues_and_actions: string | null;
          next_steps: string | null;
          attachments: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          author_id?: string | null;
          author_name: string;
          log_date?: string;
          progress_rate: number;
          achievements: string;
          issues_and_actions?: string | null;
          next_steps?: string | null;
          attachments?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['mbo_progress_logs']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'mbo_progress_logs_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mbo_progress_logs_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'mbo_projects';
            referencedColumns: ['id'];
          },
        ];
      };
      mbo_feedback_comments: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          progress_log_id: string | null;
          author_id: string | null;
          author_name: string;
          author_role: string;
          feedback_type: 'comment' | 'revision_request' | 'praise';
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          progress_log_id?: string | null;
          author_id?: string | null;
          author_name: string;
          author_role?: string;
          feedback_type?: 'comment' | 'revision_request' | 'praise';
          content: string;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['mbo_feedback_comments']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'mbo_feedback_comments_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mbo_feedback_comments_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'mbo_projects';
            referencedColumns: ['id'];
          },
        ];
      };
      mbo_evaluations: {
        Row: {
          id: string;
          organization_id: string;
          project_id: string;
          target_user_id: string | null;
          evaluator_id: string | null;
          evaluator_name: string;
          evaluation_type: 'self' | 'peer' | 'manager' | 'final';
          score: number;
          grade: 'S' | 'A' | 'B' | 'C' | 'D';
          qualitative_feedback: string;
          is_confidential: boolean;
          workflow_status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'LOCKED';
          is_sample: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          project_id: string;
          target_user_id?: string | null;
          evaluator_id?: string | null;
          evaluator_name: string;
          evaluation_type?: 'self' | 'peer' | 'manager' | 'final';
          score: number;
          grade: 'S' | 'A' | 'B' | 'C' | 'D';
          qualitative_feedback: string;
          is_confidential?: boolean;
          workflow_status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'LOCKED';
          is_sample?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['mbo_evaluations']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'mbo_evaluations_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'mbo_evaluations_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'mbo_projects';
            referencedColumns: ['id'];
          },
        ];
      };
      mbo_goals: {
        Row: {
          id: string;
          organization_id: string;
          author_id: string;
          evaluator_id: string | null;
          title: string;
          key_results: Json;
          status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'LOCKED';
          is_sample: boolean;
          target_value: number | null;
          due_date: string | null;
          is_revised: boolean;
          revision_count: number;
          unmet_reason: string | null;
          revision_reason: string | null;
          visibility_type: 'PUBLIC' | 'PRIVATE' | 'PARTIAL';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          author_id: string;
          evaluator_id?: string | null;
          title: string;
          key_results?: Json;
          status?: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'LOCKED';
          is_sample?: boolean;
          target_value?: number | null;
          due_date?: string | null;
          is_revised?: boolean;
          revision_count?: number;
          unmet_reason?: string | null;
          revision_reason?: string | null;
          visibility_type?: 'PUBLIC' | 'PRIVATE' | 'PARTIAL';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['mbo_goals']['Insert']>;
        Relationships: [];
      };
      department_members: {
        Row: {
          id: string | null;
          organization_id: string;
          department_id: string;
          member_id: string;
          custom_role_id: string | null;
          scope_type: string;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          organization_id: string;
          department_id: string;
          member_id: string;
          custom_role_id?: string | null;
          scope_type?: string;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['department_members']['Insert']>;
        Relationships: [];
      };
      equipment_lifecycle: {
        Row: {
          id: string | null;
          organization_id: string;
          department_id: string | null;
          name: string;
          serial_no: string;
          status: string;
          purchased_at: string | null;
          next_service_at: string | null;
          meta: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | null;
          organization_id: string;
          department_id?: string | null;
          name: string;
          serial_no?: string;
          status?: string;
          purchased_at?: string | null;
          next_service_at?: string | null;
          meta?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['equipment_lifecycle']['Insert']>;
        Relationships: [];
      };
      hygiene_haccp_log: {
        Row: {
          id: string | null;
          organization_id: string;
          department_id: string | null;
          checkpoint: string;
          measured_at: string;
          value: string;
          passed: boolean;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | null;
          organization_id: string;
          department_id?: string | null;
          checkpoint: string;
          measured_at?: string;
          value?: string;
          passed?: boolean;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['hygiene_haccp_log']['Insert']>;
        Relationships: [];
      };
      maintenance_checklists: {
        Row: {
          id: string | null;
          organization_id: string;
          department_id: string | null;
          title: string;
          items: Json;
          status: string;
          due_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | null;
          organization_id: string;
          department_id?: string | null;
          title: string;
          items?: Json;
          status?: string;
          due_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['maintenance_checklists']['Insert']>;
        Relationships: [];
      };
      mbo_goal_revisions: {
        Row: {
          id: string | null;
          goal_id: string;
          organization_id: string;
          revised_by: string;
          previous_target_value: number | null;
          previous_due_date: string | null;
          previous_title: string | null;
          unmet_reason: string | null;
          revision_reason: string;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          goal_id: string;
          organization_id: string;
          revised_by: string;
          previous_target_value?: number | null;
          previous_due_date?: string | null;
          previous_title?: string | null;
          unmet_reason?: string | null;
          revision_reason: string;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['mbo_goal_revisions']['Insert']>;
        Relationships: [];
      };
      mbo_goal_shares: {
        Row: {
          id: string | null;
          organization_id: string;
          goal_id: string;
          shared_with_member_id: string;
          created_at: string;
        };
        Insert: {
          id?: string | null;
          organization_id: string;
          goal_id: string;
          shared_with_member_id: string;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['mbo_goal_shares']['Insert']>;
        Relationships: [];
      };
      rental_equipments: {
        Row: {
          id: string | null;
          organization_id: string;
          department_id: string | null;
          name: string;
          asset_tag: string;
          status: string;
          current_renter_id: string | null;
          rented_at: string | null;
          due_at: string | null;
          damage_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | null;
          organization_id: string;
          department_id?: string | null;
          name: string;
          asset_tag?: string;
          status?: string;
          current_renter_id?: string | null;
          rented_at?: string | null;
          due_at?: string | null;
          damage_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['rental_equipments']['Insert']>;
        Relationships: [];
      };
      safety_consent_signatures: {
        Row: {
          id: string | null;
          organization_id: string;
          consent_id: string;
          signer_name: string;
          signed_at: string;
          payload: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | null;
          organization_id: string;
          consent_id: string;
          signer_name: string;
          signed_at?: string;
          payload?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['safety_consent_signatures']['Insert']>;
        Relationships: [];
      };
      safety_consents: {
        Row: {
          id: string | null;
          organization_id: string;
          department_id: string | null;
          title: string;
          body: string;
          version: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | null;
          organization_id: string;
          department_id?: string | null;
          title: string;
          body?: string;
          version?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['safety_consents']['Insert']>;
        Relationships: [];
      };
      seat_rooms: {
        Row: {
          id: string | null;
          organization_id: string;
          department_id: string | null;
          name: string;
          capacity: number;
          status: string;
          meta: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | null;
          organization_id: string;
          department_id?: string | null;
          name: string;
          capacity?: number;
          status?: string;
          meta?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['seat_rooms']['Insert']>;
        Relationships: [];
      };
      sop_risk_assessment: {
        Row: {
          id: string | null;
          organization_id: string;
          department_id: string | null;
          title: string;
          hazard_level: string;
          controls: Json;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string | null;
          organization_id: string;
          department_id?: string | null;
          title: string;
          hazard_level?: string;
          controls?: Json;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['sop_risk_assessment']['Insert']>;
        Relationships: [];
      };
      risk_assessments: {
        Row: {
          id: string;
          organization_id: string;
          department_id: string | null;
          document_no: string;
          title: string;
          process_name: string;
          current_version: number;
          status: string;
          created_by: string;
          snapshot_payload: Json;
          occasional_review_required: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          department_id?: string | null;
          document_no: string;
          title: string;
          process_name: string;
          current_version?: number;
          status?: string;
          created_by: string;
          snapshot_payload?: Json;
          occasional_review_required?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['risk_assessments']['Insert']>;
        Relationships: [];
      };
      document_approval_lines: {
        Row: {
          id: string;
          assessment_id: string;
          organization_id: string;
          step_order: number;
          step_type: string;
          assignee_id: string;
          assignee_name: string | null;
          action_status: string;
          comment: string | null;
          signature_data: string | null;
          action_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          organization_id: string;
          step_order: number;
          step_type: string;
          assignee_id: string;
          assignee_name?: string | null;
          action_status?: string;
          comment?: string | null;
          signature_data?: string | null;
          action_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['document_approval_lines']['Insert']>;
        Relationships: [];
      };
      risk_assessment_revisions: {
        Row: {
          id: string;
          assessment_id: string;
          organization_id: string;
          version: number;
          revision_type: string;
          revision_reason: string;
          snapshot_payload: Json;
          approved_by: string;
          approved_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          organization_id: string;
          version: number;
          revision_type: string;
          revision_reason: string;
          snapshot_payload: Json;
          approved_by: string;
          approved_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['risk_assessment_revisions']['Insert']>;
        Relationships: [];
      };
      risk_assessment_worker_repledges: {
        Row: {
          id: string;
          organization_id: string;
          assessment_id: string;
          department_id: string | null;
          required_version: number;
          worker_user_id: string;
          pledged_at: string | null;
          signature_data: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          assessment_id: string;
          department_id?: string | null;
          required_version: number;
          worker_user_id: string;
          pledged_at?: string | null;
          signature_data?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['risk_assessment_worker_repledges']['Insert']>;
        Relationships: [];
      };
      mbo_evaluation_history: {
        Row: {
          id: string;
          organization_id: string;
          evaluation_id: string;
          action_type: 'CREATED' | 'SUBMITTED' | 'EVALUATED' | 'APPROVED';
          actor_id: string;
          score_payload: Json;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          evaluation_id: string;
          action_type: 'CREATED' | 'SUBMITTED' | 'EVALUATED' | 'APPROVED';
          actor_id: string;
          score_payload?: Json;
          comment?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['mbo_evaluation_history']['Insert']>;
        Relationships: [];
      };
      approval_templates: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          category: 'general' | 'expense' | 'purchase' | 'leave' | 'work_order' | 'it_change';
          description: string | null;
          form_schema: Json;
          default_steps: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          category?: 'general' | 'expense' | 'purchase' | 'leave' | 'work_order' | 'it_change';
          description?: string | null;
          form_schema?: Json;
          default_steps?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['approval_templates']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'approval_templates_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      approval_requests: {
        Row: {
          id: string;
          organization_id: string;
          template_id: string | null;
          title: string;
          content: Json;
          requester_id: string | null;
          requester_name: string;
          status: 'draft' | 'pending' | 'approved' | 'rejected' | 'canceled';
          current_step_order: number;
          total_steps: number;
          entity_type: string | null;
          entity_id: string | null;
          final_approved_at: string | null;
          rejected_at: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          template_id?: string | null;
          title: string;
          content?: Json;
          requester_id?: string | null;
          requester_name: string;
          status?: 'draft' | 'pending' | 'approved' | 'rejected' | 'canceled';
          current_step_order?: number;
          total_steps?: number;
          entity_type?: string | null;
          entity_id?: string | null;
          final_approved_at?: string | null;
          rejected_at?: string | null;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['approval_requests']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'approval_requests_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'approval_requests_template_id_fkey';
            columns: ['template_id'];
            referencedRelation: 'approval_templates';
            referencedColumns: ['id'];
          },
        ];
      };
      approval_steps: {
        Row: {
          id: string;
          organization_id: string;
          request_id: string;
          step_order: number;
          step_type: 'review' | 'approval' | 'consensus';
          approver_id: string | null;
          approver_name: string;
          approver_role: string | null;
          status: 'waiting' | 'pending' | 'approved' | 'rejected' | 'skipped';
          comment: string | null;
          signature_url: string | null;
          processed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          request_id: string;
          step_order: number;
          step_type?: 'review' | 'approval' | 'consensus';
          approver_id?: string | null;
          approver_name: string;
          approver_role?: string | null;
          status?: 'waiting' | 'pending' | 'approved' | 'rejected' | 'skipped';
          comment?: string | null;
          signature_url?: string | null;
          processed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['approval_steps']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'approval_steps_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'approval_steps_request_id_fkey';
            columns: ['request_id'];
            referencedRelation: 'approval_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      task_orders: {
        Row: {
          id: string;
          organization_id: string;
          order_number: string;
          order_type: 'custom_order' | 'repair' | 'manufacturing' | 'maintenance' | 'inspection';
          title: string;
          customer_id: string | null;
          customer_name: string | null;
          customer_phone: string | null;
          target_item_name: string | null;
          current_stage: 'RECEIVED' | 'IN_PROGRESS' | 'PARTS_WAITING' | 'INSPECTION' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
          stage_entered_at: string;
          assigned_staff_id: string | null;
          assigned_staff_name: string | null;
          sla_hours: number;
          labor_fee: number;
          parts_cost: number;
          total_amount: number;
          diagnosis: string | null;
          hold_reason: string | null;
          details: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          order_number: string;
          order_type?: 'custom_order' | 'repair' | 'manufacturing' | 'maintenance' | 'inspection';
          title: string;
          customer_id?: string | null;
          customer_name?: string | null;
          customer_phone?: string | null;
          target_item_name?: string | null;
          current_stage?: 'RECEIVED' | 'IN_PROGRESS' | 'PARTS_WAITING' | 'INSPECTION' | 'READY_FOR_PICKUP' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED';
          stage_entered_at?: string;
          assigned_staff_id?: string | null;
          assigned_staff_name?: string | null;
          sla_hours?: number;
          labor_fee?: number;
          parts_cost?: number;
          total_amount?: number;
          diagnosis?: string | null;
          hold_reason?: string | null;
          details?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['task_orders']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'task_orders_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_orders_customer_id_fkey';
            columns: ['customer_id'];
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_orders_assigned_staff_id_fkey';
            columns: ['assigned_staff_id'];
            referencedRelation: 'staff';
            referencedColumns: ['id'];
          },
        ];
      };
      task_order_timelines: {
        Row: {
          id: string;
          organization_id: string;
          task_order_id: string;
          from_stage: string | null;
          to_stage: string;
          changed_by_user_id: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          task_order_id: string;
          from_stage?: string | null;
          to_stage: string;
          changed_by_user_id?: string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['task_order_timelines']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'task_order_timelines_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'task_order_timelines_task_order_id_fkey';
            columns: ['task_order_id'];
            referencedRelation: 'task_orders';
            referencedColumns: ['id'];
          },
        ];
      };
      purchase_requisitions: {
        Row: {
          id: string;
          organization_id: string;
          pr_number: string;
          title: string;
          requester_id: string | null;
          requester_name: string;
          status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'ordered' | 'received';
          approval_request_id: string | null;
          needed_by_date: string | null;
          total_estimated_amount: number;
          items: Json;
          justification: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          pr_number: string;
          title: string;
          requester_id?: string | null;
          requester_name: string;
          status?: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'ordered' | 'received';
          approval_request_id?: string | null;
          needed_by_date?: string | null;
          total_estimated_amount?: number;
          items?: Json;
          justification?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['purchase_requisitions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'purchase_requisitions_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'purchase_requisitions_approval_request_id_fkey';
            columns: ['approval_request_id'];
            referencedRelation: 'approval_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      vendor_quotes: {
        Row: {
          id: string;
          organization_id: string;
          pr_id: string;
          vendor_id: string | null;
          vendor_name: string;
          quoted_amount: number;
          lead_time_days: number;
          is_selected: boolean;
          quote_file_url: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          pr_id: string;
          vendor_id?: string | null;
          vendor_name: string;
          quoted_amount: number;
          lead_time_days?: number;
          is_selected?: boolean;
          quote_file_url?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['vendor_quotes']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'vendor_quotes_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'vendor_quotes_pr_id_fkey';
            columns: ['pr_id'];
            referencedRelation: 'purchase_requisitions';
            referencedColumns: ['id'];
          },
        ];
      };
      quality_inspection_standards: {
        Row: {
          id: string;
          organization_id: string;
          item_name: string;
          process_stage: 'inbound' | 'in_process' | 'final' | 'outgoing';
          inspection_item: string;
          unit: string;
          target_value: number | null;
          min_threshold: number | null;
          max_threshold: number | null;
          sample_size: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          item_name: string;
          process_stage?: 'inbound' | 'in_process' | 'final' | 'outgoing';
          inspection_item: string;
          unit?: string;
          target_value?: number | null;
          min_threshold?: number | null;
          max_threshold?: number | null;
          sample_size?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['quality_inspection_standards']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'quality_inspection_standards_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
        ];
      };
      quality_inspection_records: {
        Row: {
          id: string;
          organization_id: string;
          standard_id: string | null;
          lot_number: string;
          sample_values: Json;
          mean_value: number;
          judgment: 'pass' | 'fail' | 'conditional_pass';
          defect_count: number;
          inspector_id: string | null;
          inspector_name: string;
          incident_report_id: string | null;
          notes: string | null;
          inspected_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          standard_id?: string | null;
          lot_number: string;
          sample_values?: Json;
          mean_value: number;
          judgment?: 'pass' | 'fail' | 'conditional_pass';
          defect_count?: number;
          inspector_id?: string | null;
          inspector_name: string;
          incident_report_id?: string | null;
          notes?: string | null;
          inspected_at?: string;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['quality_inspection_records']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'quality_inspection_records_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quality_inspection_records_standard_id_fkey';
            columns: ['standard_id'];
            referencedRelation: 'quality_inspection_standards';
            referencedColumns: ['id'];
          },
        ];
      };
      change_orders: {
        Row: {
          id: string;
          organization_id: string;
          change_number: string;
          title: string;
          category: 'man' | 'machine' | 'material' | 'method' | 'spec';
          reason: string;
          before_description: string;
          after_description: string;
          risk_level: 'low' | 'medium' | 'high' | 'critical';
          status: 'draft' | 'reviewing' | 'approved' | 'applied' | 'rejected' | 'cancelled';
          effective_date: string | null;
          requester_id: string | null;
          requester_name: string;
          approval_request_id: string | null;
          applied_at: string | null;
          applied_by: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          change_number: string;
          title: string;
          category: 'man' | 'machine' | 'material' | 'method' | 'spec';
          reason: string;
          before_description: string;
          after_description: string;
          risk_level?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'draft' | 'reviewing' | 'approved' | 'applied' | 'rejected' | 'cancelled';
          effective_date?: string | null;
          requester_id?: string | null;
          requester_name: string;
          approval_request_id?: string | null;
          applied_at?: string | null;
          applied_by?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['change_orders']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'change_orders_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'change_orders_approval_request_id_fkey';
            columns: ['approval_request_id'];
            referencedRelation: 'approval_requests';
            referencedColumns: ['id'];
          },
        ];
      };
      change_order_evaluations: {
        Row: {
          id: string;
          organization_id: string;
          change_order_id: string;
          evaluator_role: 'quality' | 'production' | 'safety' | 'procurement' | 'engineering';
          evaluator_name: string;
          impact_assessment: string;
          is_approved: boolean;
          risk_notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          change_order_id: string;
          evaluator_role: 'quality' | 'production' | 'safety' | 'procurement' | 'engineering';
          evaluator_name: string;
          impact_assessment: string;
          is_approved?: boolean;
          risk_notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['change_order_evaluations']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'change_order_evaluations_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'change_order_evaluations_change_order_id_fkey';
            columns: ['change_order_id'];
            referencedRelation: 'change_orders';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      approve_guardian_enrollment: {
        Args: {
          p_request_id: string;
        };
        Returns: Json;
      };
      reject_guardian_enrollment: {
        Args: {
          p_request_id: string;
          p_reason?: string | null;
        };
        Returns: Json;
      };
      get_org_enrollment_requests: {
        Args: {
          p_org_id: string;
          p_status?: string;
        };
        Returns: {
          id: string;
          parent_id: string;
          parent_name: string;
          parent_phone: string | null;
          parent_email: string | null;
          student_id: string;
          student_name: string;
          birth_date: string | null;
          relationship: string;
          status: string;
          requested_at: string;
          reviewed_at: string | null;
          reviewed_by_name: string | null;
          rejection_reason: string | null;
          notes: string | null;
          consent_fields?: string[] | null;
          gender?: string | null;
          school?: string | null;
          grade?: string | null;
        }[];
      };
      create_organization_with_preset: {
        Args: {
          p_org_name: string;
          p_industry: string;
          p_custom_config?: Json;
        };
        Returns: Json;
      };
      claim_staff_invite: {
        Args: {
          p_token: string;
        };
        Returns: Json;
      };
      revoke_member_access: {
        Args: {
          p_member_id: string;
        };
        Returns: Json;
      };
      deduct_pass_atomic: {
        Args: {
          p_pass_id: string;
        };
        Returns: Json;
      };
      claim_store_token: {
        Args: {
          p_token: string;
        };
        Returns: Json;
      };
      consume_customer_qr: {
        Args: {
          p_token: string;
          p_tenant_id: string;
        };
        Returns: Json;
      };
      create_organization: {
        Args: {
          p_name: string;
          p_business_registration_number?: string | null;
          p_representative_name: string;
          p_business_phone?: string | null;
          p_business_address: string;
          p_industry_category: string;
          p_industry_type?: string;
          p_slug?: string | null;
          p_settings?: Record<string, unknown> | null;
          p_postal?: string | null;
          p_sido?: string | null;
          p_sigungu?: string | null;
          p_dong?: string | null;
          p_jibun?: string | null;
          p_road_address?: string | null;
          p_address_detail?: string | null;
        };
        Returns: string;
      };
      is_org_member: {
        Args: { org_id: string };
        Returns: boolean;
      };
      get_org_role: {
        Args: { org_id: string };
        Returns: MemberRole;
      };
      is_org_admin: {
        Args: { org_id: string };
        Returns: boolean;
      };
      is_org_staff_actor: {
        Args: { p_org_id: string };
        Returns: boolean;
      };
      is_known_permission: {
        Args: { p_permission: string };
        Returns: boolean;
      };
      role_has_default_permission: {
        Args: { p_role: MemberRole; p_permission: string };
        Returns: boolean;
      };
      has_permission: {
        Args: {
          p_organization_id: string;
          p_permission: string;
          p_scope_type?: string;
          p_scope_id?: string | null;
        };
        Returns: boolean;
      };
      is_org_owner_or_admin: {
        Args: { org_id: string };
        Returns: boolean;
      };
      location_belongs_to_organization: {
        Args: { p_organization_id: string; p_location_id: string };
        Returns: boolean;
      };
      assert_location_in_organization: {
        Args: {
          p_organization_id: string;
          p_location_id: string | null;
          p_required?: boolean;
        };
        Returns: string | null;
      };
      location_aware_visible: {
        Args: {
          p_row_location_id: string | null;
          p_selected_location_id: string | null;
        };
        Returns: boolean;
      };
      sanitize_audit_payload: {
        Args: { p_entity_type: string; p_data: Json };
        Returns: Json;
      };
      append_audit_log: {
        Args: {
          p_organization_id: string;
          p_entity_type: string;
          p_entity_id: string;
          p_action: string;
          p_location_id?: string | null;
          p_before_data?: Json | null;
          p_after_data?: Json | null;
          p_request_id?: string | null;
          p_idempotency_key?: string | null;
        };
        Returns: string;
      };
      insert_default_organization_location: {
        Args: { p_organization_id: string };
        Returns: string;
      };
      begin_idempotency: {
        Args: {
          p_organization_id: string;
          p_key: string;
          p_operation: string;
          p_request_hash: string;
        };
        Returns: Json;
      };
      complete_idempotency: {
        Args: { p_organization_id: string; p_key: string; p_response: Json };
        Returns: undefined;
      };
      fail_idempotency: {
        Args: { p_organization_id: string; p_key: string; p_error?: string | null };
        Returns: undefined;
      };
      update_booking_status_with_pass: {
        Args: {
          p_organization_id: string;
          p_booking_id: string;
          p_new_status: ScheduleStatus;
          p_consume_on_no_show?: boolean;
        };
        Returns: Json;
      };
      update_booking_status_with_pass_idempotent: {
        Args: {
          p_organization_id: string;
          p_booking_id: string;
          p_new_status: ScheduleStatus;
          p_consume_on_no_show?: boolean;
          p_idempotency_key?: string | null;
        };
        Returns: Json;
      };
      record_tuition_payment_idempotent: {
        Args: {
          p_organization_id: string;
          p_invoice_id: string;
          p_amount: number;
          p_payment_method: string;
          p_paid_at?: string;
          p_memo?: string | null;
          p_cash_receipt_issued?: boolean;
          p_idempotency_key?: string | null;
        };
        Returns: Json;
      };
      record_combined_payment: {
        Args: {
          p_organization_id: string;
          p_tuition_items: Json;
          p_textbook_items: Json;
          p_payment_method: string;
          p_paid_at?: string;
          p_memo?: string | null;
          p_cash_receipt_issued?: boolean;
          p_command_key?: string | null;
        };
        Returns: Json;
      };
      enqueue_outbox_event: {
        Args: {
          p_organization_id: string;
          p_aggregate_type: string;
          p_aggregate_id: string;
          p_event_type: string;
          p_payload?: Json;
          p_location_id?: string | null;
        };
        Returns: string;
      };
      claim_outbox_events: {
        Args: { p_organization_id: string; p_limit?: number };
        Returns: Json;
      };
      complete_outbox_event: {
        Args: { p_event_id: string };
        Returns: undefined;
      };
      fail_outbox_event: {
        Args: { p_event_id: string; p_last_error?: string | null };
        Returns: undefined;
      };
      ensure_guest_customer: {
        Args: {
          p_org_id: string;
          p_name: string;
          p_phone?: string | null;
          p_email?: string | null;
          p_source?: string | null;
        };
        Returns: string;
      };
      link_customer_to_current_user: {
        Args: {
          p_customer_id: string;
          p_expected_phone?: string | null;
        };
        Returns: Json;
      };
      request_reservation: {
        Args: {
          p_schedule_id: string;
          p_applicant_name: string;
          p_applicant_phone?: string | null;
          p_applicant_email?: string | null;
          p_request_message?: string | null;
        };
        Returns: string;
      };
      confirm_reservation: {
        Args: {
          p_reservation_id: string;
        };
        Returns: boolean;
      };
      cancel_reservation: {
        Args: {
          p_reservation_id: string;
          p_cancel_reason?: string | null;
        };
        Returns: boolean;
      };
      get_organization_reservations: {
        Args: {
          p_org_id: string;
          p_status?: ReservationStatus | null;
          p_from_date?: string | null;
          p_limit?: number;
          p_offset?: number;
        };
        Returns: {
          id: string;
          schedule_id: string;
          schedule_title: string | null;
          schedule_starts_at: string;
          schedule_ends_at: string;
          customer_id: string | null;
          applicant_name: string;
          applicant_phone: string | null;
          applicant_email: string | null;
          request_message: string | null;
          status: ReservationStatus;
          confirmed_by_name: string | null;
          confirmed_at: string | null;
          cancelled_by_name: string | null;
          cancelled_at: string | null;
          cancel_reason: string | null;
          created_at: string;
        }[];
      };
      get_my_reservations: {
        Args: {
          p_status?: ReservationStatus | null;
          p_limit?: number;
        };
        Returns: {
          id: string;
          organization_id: string;
          organization_name: string;
          schedule_id: string;
          schedule_title: string | null;
          schedule_starts_at: string;
          schedule_ends_at: string;
          status: ReservationStatus;
          request_message: string | null;
          confirmed_at: string | null;
          cancelled_at: string | null;
          cancel_reason: string | null;
          created_at: string;
        }[];
      };
      delete_my_account: {
        Args: Record<string, never>;
        Returns: Json;
      };
      parent_set_child_check_in_pin: {
        Args: { p_org_id: string; p_customer_id: string; p_pin: string };
        Returns: Json;
      };
      parent_clear_child_check_in_pin: {
        Args: { p_org_id: string; p_customer_id: string };
        Returns: Json;
      };
      parent_generate_child_check_in_pin: {
        Args: { p_org_id: string; p_customer_id: string };
        Returns: Json;
      };
      invite_staff_member: {
        Args: { p_org_id: string; p_staff_id: string; p_email: string };
        Returns: Json;
      };
      revoke_staff_invitation: {
        Args: { p_org_id: string; p_staff_id: string };
        Returns: undefined;
      };
      get_staff_account_statuses: {
        Args: { p_org_id: string };
        Returns: Json;
      };
      preview_staff_invite: {
        Args: { p_token: string };
        Returns: Json;
      };
      accept_staff_invite: {
        Args: { p_token: string };
        Returns: Json;
      };
      connect_parent_on_login: {
        Args: Record<string, never>;
        Returns: Json;
      };
      connect_staff_on_login: {
        Args: Record<string, never>;
        Returns: Json;
      };
      submit_join_request: {
        Args: { p_org_id: string; p_message?: string | null };
        Returns: string;
      };
      approve_join_request: {
        Args: { p_request_id: string };
        Returns: Json;
      };
      reject_join_request: {
        Args: { p_request_id: string; p_reason?: string | null };
        Returns: boolean;
      };
      get_organization_join_requests: {
        Args: { p_org_id: string; p_status?: string };
        Returns: Json;
      };
      get_my_join_requests: {
        Args: Record<string, never>;
        Returns: Json;
      };
      sync_auth_providers_on_login: {
        Args: Record<string, never>;
        Returns: Json;
      };
      register_auth_provider: {
        Args: {
          p_provider: string;
          p_provider_user_id: string;
          p_email?: string | null;
          p_phone?: string | null;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      invite_parent_member: {
        Args: { p_org_id: string; p_parent_customer_id: string; p_email: string };
        Returns: Json;
      };
      revoke_parent_invitation: {
        Args: { p_org_id: string; p_parent_customer_id: string };
        Returns: undefined;
      };
      get_parent_account_statuses: {
        Args: { p_org_id: string };
        Returns: Json;
      };
      ensure_global_parent_profile: {
        Args: Record<string, never>;
        Returns: string;
      };
      get_my_parent_portal_tree: {
        Args: Record<string, never>;
        Returns: Json;
      };
      create_guardian_link_token: {
        Args: {
          p_org_id: string;
          p_customer_id: string;
          p_expires_days?: number;
          p_max_uses?: number;
        };
        Returns: Json;
      };
      list_guardian_link_tokens: {
        Args: { p_org_id: string };
        Returns: Json;
      };
      revoke_guardian_link_token: {
        Args: { p_org_id: string; p_token_id: string };
        Returns: undefined;
      };
      redeem_guardian_link_token: {
        Args: { p_token: string; p_shared_fields?: Json };
        Returns: Json;
      };
      preview_guardian_link_token: {
        Args: { p_token: string };
        Returns: Json;
      };
      max_linked_guardians_per_student: {
        Args: Record<string, never>;
        Returns: number;
      };
      parent_register_child: {
        Args: {
          p_display_name: string;
          p_birth_date?: string | null;
          p_relationship?: string;
          p_is_primary?: boolean;
        };
        Returns: Json;
      };
      ensure_org_parent_customer: {
        Args: { p_parent_id: string; p_org_id: string };
        Returns: string;
      };
      sync_org_parent_student_bridge: {
        Args: { p_org_id: string };
        Returns: Json;
      };
      sync_guardians_for_parent_org: {
        Args: { p_parent_id: string; p_org_id: string };
        Returns: number;
      };
      sync_parent_student_links_for_parent_org: {
        Args: { p_parent_id: string; p_org_id: string };
        Returns: number;
      };
      sync_org_parent_student_links_reverse: {
        Args: { p_org_id: string };
        Returns: Json;
      };
      create_parent_invite_link_tokens: {
        Args: {
          p_org_id: string;
          p_parent_customer_id: string;
          p_expires_days?: number;
        };
        Returns: Json;
      };
      // Phase 2: Customer join & org discovery RPCs
      search_public_organizations: {
        Args: {
          p_query: string;
          p_industry_type?: string | null;
          p_limit?: number;
        };
        Returns: Array<{
          id: string;
          name: string;
          industry_type: string;
          public_code: string;
          slug: string | null;
          address: string | null;
          phone: string | null;
          is_active: boolean;
        }>;
      };
      get_public_organization_by_code: {
        Args: {
          p_code: string;
        };
        Returns: Array<{
          id: string;
          name: string;
          industry_type: string;
          public_code: string;
          slug: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          description: string | null;
          business_hours: string | null;
          is_active: boolean;
        }>;
      };
      submit_customer_join_request: {
        Args: {
          p_org_id: string;
          p_applicant_name: string;
          p_applicant_phone?: string | null;
          p_applicant_email?: string | null;
          p_request_type?: string;
          p_message?: string | null;
          p_customer_metadata?: Json;
        };
        Returns: string;
      };
      approve_customer_join_request: {
        Args: {
          p_request_id: string;
          p_role?: string;
        };
        Returns: Json;
      };
      reject_customer_join_request: {
        Args: {
          p_request_id: string;
          p_reject_reason?: string | null;
        };
        Returns: boolean;
      };
      submit_public_consultation: {
        Args: {
          p_org_id: string;
          p_contact_name: string;
          p_contact_phone: string;
          p_message: string;
          p_preferred_time?: string | null;
        };
        Returns: string;
      };
      list_org_bookable_resources: {
        Args: { p_org_id: string; p_kind?: string | null };
        Returns: Database['core']['Tables']['bookable_resources']['Row'][];
      };
      upsert_bookable_resource: {
        Args: {
          p_org_id: string;
          p_kind: string;
          p_name: string;
          p_capacity?: number;
          p_open_time?: string;
          p_close_time?: string;
          p_id?: string | null;
          p_memo?: string | null;
        };
        Returns: string;
      };
      set_bookable_resource_active: {
        Args: { p_org_id: string; p_id: string; p_active: boolean };
        Returns: boolean;
      };
      start_customer_session: {
        Args: {
          p_organization_id: string;
          p_customer_id: string;
          p_staff_id?: string | null;
          p_source?: string | null;
          p_context?: string | null;
          p_booking_id?: string | null;
          p_reservation_id?: string | null;
          p_pass_id?: string | null;
          p_payment_id?: string | null;
          p_resource_id?: string | null;
          p_memo?: string | null;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      finish_customer_session: {
        Args: { p_organization_id: string; p_session_id: string };
        Returns: Json;
      };
      cancel_customer_session: {
        Args: { p_organization_id: string; p_session_id: string };
        Returns: Json;
      };
      join_volunteer_activity: {
        Args: { p_activity_id: string };
        Returns: Json;
      };
      cancel_volunteer_signup: {
        Args: { p_activity_id: string };
        Returns: Json;
      };
      can_manage_volunteer: {
        Args: { p_org: string };
        Returns: boolean;
      };
      can_manage_meal_survey: {
        Args: { p_org: string };
        Returns: boolean;
      };
      ensure_meal_survey_settings: {
        Args: { p_org: string };
        Returns: Json;
      };
      upsert_meal_survey_settings: {
        Args: {
          p_organization_id: string;
          p_offer_breakfast: boolean;
          p_offer_lunch: boolean;
          p_offer_dinner: boolean;
          p_default_eating?: boolean;
          p_breakfast_cutoff_time?: string;
          p_breakfast_cutoff_prev_day?: boolean;
          p_lunch_cutoff_time?: string;
          p_lunch_cutoff_prev_day?: boolean;
          p_dinner_cutoff_time?: string;
          p_dinner_cutoff_prev_day?: boolean;
        };
        Returns: Json;
      };
      meal_survey_slot_writable: {
        Args: {
          p_org: string;
          p_meal_date: string;
          p_meal_slot: string;
          p_now?: string;
        };
        Returns: boolean;
      };
      bulk_skip_meal_survey_range: {
        Args: { p_organization_id: string; p_from: string; p_to: string };
        Returns: Json;
      };
      set_volunteer_signup_checkin: {
        Args: {
          p_organization_id: string;
          p_activity_id: string;
          p_member_id: string;
          p_checked_in: boolean;
        };
        Returns: Json;
      };
      upsert_meal_survey_response: {
        Args: {
          p_organization_id: string;
          p_meal_date: string;
          p_meal_slot: string;
          p_status: string;
        };
        Returns: Json;
      };
      clear_meal_survey_response: {
        Args: {
          p_organization_id: string;
          p_meal_date: string;
          p_meal_slot: string;
        };
        Returns: Json;
      };
      list_meal_survey_overview: {
        Args: {
          p_organization_id: string;
          p_from: string;
          p_to: string;
        };
        Returns: Json;
      };
      can_manage_office_supply_request: {
        Args: { p_org: string };
        Returns: boolean;
      };
      office_supply_campaign_is_writable: {
        Args: { p_campaign: Json };
        Returns: boolean;
      };
      resolve_member_primary_department: {
        Args: { p_organization_id: string; p_member_id: string };
        Returns: string;
      };
      upsert_office_supply_campaign: {
        Args: {
          p_organization_id: string;
          p_year_month: string;
          p_deadline_at: string;
          p_note?: string | null;
        };
        Returns: Json;
      };
      close_office_supply_campaign: {
        Args: { p_organization_id: string; p_campaign_id: string };
        Returns: Json;
      };
      reopen_office_supply_campaign: {
        Args: {
          p_organization_id: string;
          p_campaign_id: string;
          p_deadline_at?: string | null;
        };
        Returns: Json;
      };
      upsert_office_supply_request_lines: {
        Args: {
          p_organization_id: string;
          p_campaign_id: string;
          p_lines: Json;
        };
        Returns: Json;
      };
      list_office_supply_dept_aggregate: {
        Args: { p_organization_id: string; p_campaign_id: string };
        Returns: Json;
      };
      join_waitlist: {
        Args: {
          p_organization_id: string;
          p_target_type: string;
          p_target_id: string;
          p_customer_id: string;
          p_schedule_id?: string | null;
          p_requested_time?: string | null;
          p_booking_id?: string | null;
          p_reservation_id?: string | null;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      cancel_waitlist: {
        Args: { p_organization_id: string; p_entry_id: string };
        Returns: Json;
      };
      expire_waitlist: {
        Args: { p_organization_id: string; p_entry_id: string };
        Returns: Json;
      };
      notify_waitlist: {
        Args: { p_organization_id: string; p_entry_id: string };
        Returns: Json;
      };
      claim_waitlist_vacancy: {
        Args: {
          p_organization_id: string;
          p_target_type: string;
          p_target_id: string;
          p_booking_id?: string | null;
          p_reservation_id?: string | null;
        };
        Returns: Json;
      };
      upsert_checklist_template: {
        Args: {
          p_organization_id: string;
          p_name: string;
          p_items?: Json;
          p_id?: string | null;
          p_target_type?: string | null;
          p_purpose?: string | null;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      deactivate_checklist_template: {
        Args: { p_organization_id: string; p_template_id: string };
        Returns: Json;
      };
      create_ops_task: {
        Args: {
          p_organization_id: string;
          p_target_type: string;
          p_target_id: string;
          p_template_id?: string | null;
          p_assigned_staff_id?: string | null;
          p_priority?: OpsTaskPriority;
          p_due_at?: string | null;
          p_issue_id?: string | null;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      assign_ops_task: {
        Args: { p_organization_id: string; p_task_id: string; p_staff_id: string };
        Returns: Json;
      };
      set_ops_task_status: {
        Args: { p_organization_id: string; p_task_id: string; p_status: OpsTaskStatus };
        Returns: Json;
      };
      set_ops_task_check: {
        Args: {
          p_organization_id: string;
          p_task_id: string;
          p_check_id: string;
          p_completed: boolean;
        };
        Returns: Json;
      };
      report_maintenance_issue: {
        Args: {
          p_organization_id: string;
          p_target_type: string;
          p_target_id: string;
          p_reported_by: string;
          p_description: string;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      set_maintenance_issue_status: {
        Args: {
          p_organization_id: string;
          p_issue_id: string;
          p_status: OpsIssueStatus;
          p_resolution?: string | null;
        };
        Returns: Json;
      };
      ensure_default_organization_location: {
        Args: { p_organization_id: string };
        Returns: string;
      };
      upsert_location: {
        Args: {
          p_organization_id: string;
          p_name: string;
          p_code?: string | null;
          p_slug?: string | null;
          p_address?: string | null;
          p_phone?: string | null;
          p_timezone?: string | null;
          p_id?: string | null;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      set_location_active: {
        Args: { p_organization_id: string; p_location_id: string; p_active: boolean };
        Returns: Json;
      };
    };
    Enums: {
      member_role: MemberRole;
      schedule_status: ScheduleStatus;
      reservation_status: ReservationStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
      sale_status: SaleStatus;
      point_transaction_type: PointTransactionType;
      notification_status: NotificationStatus;
      notification_channel: NotificationChannel;
      stock_movement_type: 'inbound' | 'sale' | 'return' | 'adjustment' | 'transfer';
      customer_session_status: CustomerSessionStatus;
      waitlist_status: WaitlistStatus;
      ops_task_status: OpsTaskStatus;
      ops_task_priority: OpsTaskPriority;
      ops_issue_status: OpsIssueStatus;
    };
    CompositeTypes: Record<string, never>;
  };
  piano: {
    Tables: {
      song_progress: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          book_name: string;
          song_title: string;
          status: string;
          stamps_awarded: number;
          requested_at: string;
          approved_at: string | null;
          approved_by: string | null;
          memo: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          book_name: string;
          song_title: string;
          status?: string;
          stamps_awarded?: number;
          requested_at?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          memo?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['song_progress']['Insert']>;
        Relationships: [];
      };
      customers: {
        Row: {
          customer_id: string;
          organization_id: string;
          student_number: string;
          gender: string;
          birth_date: string | null;
          school: string | null;
          grade: string | null;
          level: string;
          tuition_fee: number;
          payment_day: number;
          teacher_id: string | null;
          join_date: string | null;
          leave_date: string | null;
          special_notes: string | null;
          avatar_color: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          customer_id: string;
          organization_id: string;
          student_number?: string;
          gender?: string;
          birth_date?: string | null;
          school?: string | null;
          grade?: string | null;
          level?: string;
          tuition_fee?: number;
          payment_day?: number;
          teacher_id?: string | null;
          join_date?: string | null;
          leave_date?: string | null;
          special_notes?: string | null;
          avatar_color?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['customers']['Insert']>;
        Relationships: [];
      };
      class_members: {
        Row: {
          organization_id: string;
          service_id: string;
          customer_id: string;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          service_id: string;
          customer_id: string;
          created_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['class_members']['Insert']>;
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          service_id: string | null;
          attendance_date: string;
          status: PianoAttendanceStatus;
          absent_reason: string | null;
          make_up_required: boolean;
          make_up_date: string | null;
          memo: string | null;
          created_by: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          service_id?: string | null;
          attendance_date: string;
          status?: PianoAttendanceStatus;
          absent_reason?: string | null;
          make_up_required?: boolean;
          make_up_date?: string | null;
          memo?: string | null;
          created_by?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['attendance']['Insert']>;
        Relationships: [];
      };
      lesson_records: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          staff_id: string | null;
          service_id: string | null;
          lesson_date: string;
          song_title: string;
          progress: string | null;
          lesson_content: string | null;
          strengths: string | null;
          weaknesses: string | null;
          homework: string | null;
          next_plan: string | null;
          teacher_notes: string | null;
          memo: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          staff_id?: string | null;
          service_id?: string | null;
          lesson_date: string;
          song_title?: string;
          progress?: string | null;
          lesson_content?: string | null;
          strengths?: string | null;
          weaknesses?: string | null;
          homework?: string | null;
          next_plan?: string | null;
          teacher_notes?: string | null;
          memo?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['lesson_records']['Insert']>;
        Relationships: [];
      };
      practice_records: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          practice_date: string;
          minutes: number;
          song_title: string;
          textbook: string | null;
          page: string | null;
          homework: string | null;
          teacher_evaluation: string | null;
          difficulty_part: string | null;
          next_assignment: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          practice_date: string;
          minutes?: number;
          song_title?: string;
          textbook?: string | null;
          page?: string | null;
          homework?: string | null;
          teacher_evaluation?: string | null;
          difficulty_part?: string | null;
          next_assignment?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['practice_records']['Insert']>;
        Relationships: [];
      };
      textbooks: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          publisher: string;
          author: string | null;
          isbn: string | null;
          level: string;
          sale_price: number;
          cost_price: number;
          stock: number;
          min_stock: number;
          is_for_sale: boolean;
          memo: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          publisher?: string;
          author?: string | null;
          isbn?: string | null;
          level?: string;
          sale_price?: number;
          cost_price?: number;
          stock?: number;
          min_stock?: number;
          is_for_sale?: boolean;
          memo?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['textbooks']['Insert']>;
        Relationships: [];
      };
      textbook_sales: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          textbook_id: string;
          sale_date: string;
          quantity: number;
          unit_price: number;
          discount: number;
          total_amount: number;
          paid_amount: number;
          status: PianoTextbookPaymentStatus;
          payment_method: PaymentMethod | null;
          memo: string | null;
          staff_id: string | null;
          /** Core sales.id 연결 (nullable) */
          core_sale_id: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          textbook_id: string;
          sale_date?: string;
          quantity?: number;
          unit_price?: number;
          discount?: number;
          total_amount?: number;
          paid_amount?: number;
          status?: PianoTextbookPaymentStatus;
          payment_method?: PaymentMethod | null;
          memo?: string | null;
          staff_id?: string | null;
          core_sale_id?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['textbook_sales']['Insert']>;
        Relationships: [];
      };
      textbook_payments: {
        Row: {
          id: string;
          organization_id: string;
          textbook_sale_id: string;
          payment_date: string;
          amount: number;
          payment_method: PaymentMethod;
          memo: string | null;
          receipt_number: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          textbook_sale_id: string;
          payment_date?: string;
          amount: number;
          payment_method?: PaymentMethod;
          memo?: string | null;
          receipt_number?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['textbook_payments']['Insert']>;
        Relationships: [];
      };
      textbook_inventory_transactions: {
        Row: {
          id: string;
          organization_id: string;
          textbook_id: string;
          transaction_type: PianoInventoryTransactionType;
          quantity: number;
          previous_stock: number;
          current_stock: number;
          reference_id: string | null;
          transaction_date: string;
          memo: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          textbook_id: string;
          transaction_type: PianoInventoryTransactionType;
          quantity: number;
          previous_stock?: number;
          current_stock?: number;
          reference_id?: string | null;
          transaction_date?: string;
          memo?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['textbook_inventory_transactions']['Insert']>;
        Relationships: [];
      };
      songs: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          composer: string;
          difficulty: string;
          genre: string;
          related_textbook: string | null;
          memo: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          composer?: string;
          difficulty?: string;
          genre?: string;
          related_textbook?: string | null;
          memo?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['songs']['Insert']>;
        Relationships: [];
      };
      expenses: {
        Row: {
          id: string;
          organization_id: string;
          expense_date: string;
          category: string;
          amount: number;
          payment_method: PaymentMethod;
          description: string;
          recipient: string | null;
          vendor: string | null;
          memo: string | null;
          receipt_memo: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          expense_date: string;
          category: string;
          amount: number;
          payment_method?: PaymentMethod;
          description?: string;
          recipient?: string | null;
          vendor?: string | null;
          memo?: string | null;
          receipt_memo?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['expenses']['Insert']>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          start_date: string;
          end_date: string | null;
          event_type: string;
          description: string | null;
          color: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          start_date: string;
          end_date?: string | null;
          event_type?: string;
          description?: string | null;
          color?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['events']['Insert']>;
        Relationships: [];
      };
      performance_videos: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          title: string;
          youtube_url: string;
          recorded_date: string | null;
          event_type: string;
          song_title: string | null;
          memo: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          title: string;
          youtube_url: string;
          recorded_date?: string | null;
          event_type?: string;
          song_title?: string | null;
          memo?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['performance_videos']['Insert']>;
        Relationships: [];
      };
      curriculum_levels: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          sort_order: number;
          description: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          sort_order?: number;
          description?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['curriculum_levels']['Insert']>;
        Relationships: [];
      };
      curriculum_items: {
        Row: {
          id: string;
          organization_id: string;
          level_id: string;
          song_id: string | null;
          title: string;
          sort_order: number;
          required: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          level_id: string;
          song_id?: string | null;
          title: string;
          sort_order?: number;
          required?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['curriculum_items']['Insert']>;
        Relationships: [];
      };
      student_curriculum_progress: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          curriculum_item_id: string;
          status: CurriculumProgressStatus;
          completed_at: string | null;
          notes: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          curriculum_item_id: string;
          status?: CurriculumProgressStatus;
          completed_at?: string | null;
          notes?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['student_curriculum_progress']['Insert']>;
        Relationships: [];
      };
      weekly_assignments: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          staff_id: string | null;
          week_start: string;
          title: string | null;
          status: AssignmentStatus;
          teacher_notes: string | null;
          parent_notes: string | null;
          due_date: string | null;
          published_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          staff_id?: string | null;
          week_start: string;
          title?: string | null;
          status?: AssignmentStatus;
          teacher_notes?: string | null;
          parent_notes?: string | null;
          due_date?: string | null;
          published_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['weekly_assignments']['Insert']>;
        Relationships: [];
      };
      assignment_items: {
        Row: {
          id: string;
          assignment_id: string;
          organization_id: string;
          song_title: string;
          target_minutes: number | null;
          instructions: string;
          sort_order: number;
          parent_confirmed: boolean;
          parent_confirmed_at: string | null;
          completed: boolean;
          completed_at: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          assignment_id: string;
          organization_id: string;
          song_title: string;
          target_minutes?: number | null;
          instructions?: string;
          sort_order?: number;
          parent_confirmed?: boolean;
          parent_confirmed_at?: string | null;
          completed?: boolean;
          completed_at?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['assignment_items']['Insert']>;
        Relationships: [];
      };
      achievements: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          type: AchievementType;
          title: string;
          event_date: string | null;
          result: string | null;
          level_label: string | null;
          song_title: string | null;
          certificate_url: string | null;
          staff_id: string | null;
          memo: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          type: AchievementType;
          title: string;
          event_date?: string | null;
          result?: string | null;
          level_label?: string | null;
          song_title?: string | null;
          certificate_url?: string | null;
          staff_id?: string | null;
          memo?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['achievements']['Insert']>;
        Relationships: [];
      };
      learning_reports: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          staff_id: string | null;
          year_month: string;
          status: LearningReportStatus;
          summary: string | null;
          strengths: string | null;
          improvements: string | null;
          goals_next_month: string | null;
          attendance_rate: number | null;
          practice_minutes: number | null;
          lessons_count: number | null;
          songs_completed: number | null;
          published_at: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          staff_id?: string | null;
          year_month: string;
          status?: LearningReportStatus;
          summary?: string | null;
          strengths?: string | null;
          improvements?: string | null;
          goals_next_month?: string | null;
          attendance_rate?: number | null;
          practice_minutes?: number | null;
          lessons_count?: number | null;
          songs_completed?: number | null;
          published_at?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['piano']['Tables']['learning_reports']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      attendance_status: PianoAttendanceStatus;
      inventory_transaction_type: PianoInventoryTransactionType;
      textbook_payment_status: PianoTextbookPaymentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
  bath: {
    Tables: {
      visits: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          check_in_at: string;
          check_out_at: string | null;
          status: BathVisitStatus;
          entry_product_id: string | null;
          pass_id: string | null;
          locker_id: string | null;
          room_reservation_id: string | null;
          staff_id: string | null;
          memo: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          check_in_at?: string;
          check_out_at?: string | null;
          status?: BathVisitStatus;
          entry_product_id?: string | null;
          pass_id?: string | null;
          locker_id?: string | null;
          room_reservation_id?: string | null;
          staff_id?: string | null;
          memo?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['bath']['Tables']['visits']['Insert']>;
        Relationships: [];
      };
      rooms: {
        Row: {
          id: string;
          organization_id: string;
          resource_id: string;
          room_number: string;
          name: string;
          room_type: BathRoomType;
          floor_type: BathFloorType;
          capacity: number;
          bathtub_count: number;
          has_scrub_station: boolean;
          has_shower: boolean;
          has_toilet: boolean;
          base_price: number;
          active: boolean;
          sort_order: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          resource_id: string;
          room_number: string;
          name: string;
          room_type: BathRoomType;
          floor_type: BathFloorType;
          capacity: number;
          bathtub_count?: number;
          has_scrub_station?: boolean;
          has_shower?: boolean;
          has_toilet?: boolean;
          base_price?: number;
          active?: boolean;
          sort_order?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['bath']['Tables']['rooms']['Insert']>;
        Relationships: [];
      };
      services: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          category: BathServiceCategory;
          duration_minutes: number;
          base_price: number;
          requires_staff: boolean;
          requires_resource: boolean;
          product_id: string | null;
          active: boolean;
          sort_order: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          category: BathServiceCategory;
          duration_minutes: number;
          base_price?: number;
          requires_staff?: boolean;
          requires_resource?: boolean;
          product_id?: string | null;
          active?: boolean;
          sort_order?: number;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['bath']['Tables']['services']['Insert']>;
        Relationships: [];
      };
      service_resources: {
        Row: {
          organization_id: string;
          service_id: string;
          resource_id: string;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          service_id: string;
          resource_id: string;
          created_at?: string;
        };
        Update: Partial<Database['bath']['Tables']['service_resources']['Insert']>;
        Relationships: [];
      };
      service_staff: {
        Row: {
          organization_id: string;
          service_id: string;
          staff_id: string;
          created_at: string;
        };
        Insert: {
          organization_id: string;
          service_id: string;
          staff_id: string;
          created_at?: string;
        };
        Update: Partial<Database['bath']['Tables']['service_staff']['Insert']>;
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string;
          reservation_id: string;
          staff_reservation_id: string | null;
          service_id: string | null;
          resource_id: string;
          staff_id: string | null;
          room_id: string | null;
          kind: BathBookingKind;
          starts_at: string;
          ends_at: string;
          status: BathBookingStatus;
          memo: string | null;
          idempotency_key: string;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id: string;
          reservation_id: string;
          staff_reservation_id?: string | null;
          service_id?: string | null;
          resource_id: string;
          staff_id?: string | null;
          room_id?: string | null;
          kind: BathBookingKind;
          starts_at: string;
          ends_at: string;
          status?: BathBookingStatus;
          memo?: string | null;
          idempotency_key: string;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['bath']['Tables']['bookings']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_in_visit: {
        Args: {
          p_organization_id: string;
          p_customer_id: string;
          p_staff_id?: string | null;
          p_entry_product_id?: string | null;
          p_pass_id?: string | null;
          p_locker_id?: string | null;
          p_room_reservation_id?: string | null;
          p_memo?: string | null;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      check_out_visit: {
        Args: { p_organization_id: string; p_visit_id: string };
        Returns: Json;
      };
      cancel_visit: {
        Args: { p_organization_id: string; p_visit_id: string };
        Returns: Json;
      };
      upsert_room: {
        Args: {
          p_organization_id: string;
          p_room_number: string;
          p_name: string;
          p_room_type: BathRoomType;
          p_floor_type: BathFloorType;
          p_capacity: number;
          p_id?: string | null;
          p_bathtub_count?: number;
          p_has_scrub_station?: boolean;
          p_has_shower?: boolean;
          p_has_toilet?: boolean;
          p_base_price?: number;
          p_active?: boolean;
          p_sort_order?: number;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      set_room_active: {
        Args: { p_organization_id: string; p_room_id: string; p_active: boolean };
        Returns: Json;
      };
      delete_room: {
        Args: { p_organization_id: string; p_room_id: string };
        Returns: Json;
      };
      upsert_service: {
        Args: {
          p_organization_id: string;
          p_name: string;
          p_category: BathServiceCategory;
          p_duration_minutes: number;
          p_id?: string | null;
          p_base_price?: number;
          p_requires_staff?: boolean;
          p_requires_resource?: boolean;
          p_product_id?: string | null;
          p_active?: boolean;
          p_sort_order?: number;
          p_metadata?: Json;
        };
        Returns: Json;
      };
      set_service_active: {
        Args: { p_organization_id: string; p_service_id: string; p_active: boolean };
        Returns: Json;
      };
      delete_service: {
        Args: { p_organization_id: string; p_service_id: string };
        Returns: Json;
      };
      set_service_resources: {
        Args: {
          p_organization_id: string;
          p_service_id: string;
          p_resource_ids: string[];
        };
        Returns: Json;
      };
      set_service_staff: {
        Args: {
          p_organization_id: string;
          p_service_id: string;
          p_staff_ids: string[];
        };
        Returns: Json;
      };
      create_booking: {
        Args: {
          p_organization_id: string;
          p_customer_id: string;
          p_resource_id: string;
          p_starts_at: string;
          p_ends_at: string;
          p_service_id?: string | null;
          p_staff_id?: string | null;
          p_room_id?: string | null;
          p_memo?: string | null;
          p_idempotency_key?: string | null;
        };
        Returns: Json;
      };
      cancel_booking: {
        Args: { p_organization_id: string; p_booking_id: string };
        Returns: Json;
      };
      set_booking_status: {
        Args: {
          p_organization_id: string;
          p_booking_id: string;
          p_status: BathBookingStatus;
        };
        Returns: Json;
      };
    };
    Enums: {
      visit_status: BathVisitStatus;
      room_type: BathRoomType;
      floor_type: BathFloorType;
      service_category: BathServiceCategory;
      booking_kind: BathBookingKind;
    };
    CompositeTypes: Record<string, never>;
  };
  platform: {
    Tables: {
      plans: {
        Row: {
          id: string;
          code: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['platform']['Tables']['plans']['Insert']>;
        Relationships: [];
      };
      feature_entitlements: {
        Row: {
          id: string;
          plan_id: string;
          feature_key: PlatformFeatureKey;
          enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          feature_key: PlatformFeatureKey;
          enabled?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['platform']['Tables']['feature_entitlements']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'feature_entitlements_plan_id_fkey';
            columns: ['plan_id'];
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      subscriptions: {
        Row: {
          id: string;
          organization_id: string;
          plan_id: string;
          billing_status: PlatformBillingStatus;
          starts_at: string;
          ends_at: string | null;
          canceled_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          plan_id: string;
          billing_status?: PlatformBillingStatus;
          starts_at?: string;
          ends_at?: string | null;
          canceled_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['platform']['Tables']['subscriptions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'subscriptions_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscriptions_plan_id_fkey';
            columns: ['plan_id'];
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      subscription_items: {
        Row: {
          id: string;
          organization_id: string;
          subscription_id: string;
          feature_key: PlatformFeatureKey;
          enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          subscription_id: string;
          feature_key: PlatformFeatureKey;
          enabled: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['platform']['Tables']['subscription_items']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'subscription_items_organization_id_fkey';
            columns: ['organization_id'];
            referencedRelation: 'organizations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'subscription_items_subscription_id_fkey';
            columns: ['subscription_id'];
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_feature_enabled: {
        Args: { p_organization_id: string; p_feature_key: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type PlatformBillingStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'paused'
  | 'canceled'
  | 'expired';
export type PlatformFeatureKey = 'booking' | 'loyalty' | 'maintenance';
export type SessionPassStatus = 'active' | 'exhausted' | 'cancelled';
export type IdempotencyKeyStatus = 'processing' | 'succeeded' | 'failed';
export type OutboxEventStatus = 'pending' | 'processing' | 'processed' | 'failed';
export type OutboxEventType =
  | 'reservation.confirmed'
  | 'reservation.requested'
  | 'booking.completed'
  | 'payment.completed'
  | 'refund.completed'
  | 'pass.purchased'
  | 'staff.assigned'
  | 'waitlist.notified';
export type CustomerSessionStatus = 'active' | 'completed' | 'cancelled';
export type WaitlistStatus = 'waiting' | 'notified' | 'assigned' | 'cancelled' | 'expired';
export type OpsTaskStatus = 'open' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type OpsTaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export type OpsIssueStatus = 'reported' | 'acknowledged' | 'in_progress' | 'resolved' | 'cancelled';
export type BathVisitStatus = 'checked_in' | 'checked_out' | 'cancelled';
export type BathRoomType = 'private' | 'family' | 'couple' | 'vip' | 'rest';
export type BathFloorType = 'ondol' | 'wood' | 'tile' | 'mixed';
export type BathServiceCategory = 'scrub' | 'massage' | 'other';
export type BathBookingKind = 'room' | 'scrub' | 'massage' | 'other';
export type BathBookingStatus = 'pending' | 'approved' | 'cancelled' | 'rejected' | 'completed';
export type PianoAttendanceStatus = 'present' | 'absent' | 'late' | 'early_leave' | 'make_up';
export type PianoInventoryTransactionType = 'inbound' | 'sale' | 'return' | 'adjust';
export type PianoTextbookPaymentStatus = 'unpaid' | 'partial' | 'paid';

export type {
  AuditLogRow,
  AvailabilityOverrideRow,
  AvailabilityRuleRow,
  Consultation,
  CoreTables,
  Customer,
  CustomerContact,
  IdempotencyKeyRow,
  LocationRow,
  MyReservationRpcRow,
  Notification,
  Organization,
  OrganizationMember,
  OrganizationReservationRpcRow,
  OutboxEventRow,
  Payment,
  PaymentTransaction,
  PlatformFeatureEntitlementRow,
  PlatformPlanRow,
  PlatformSubscriptionItemRow,
  PlatformSubscriptionRow,
  PointAccountRow,
  PointTransactionRow,
  Profile,
  ReservationRow,
  SaleItemRow,
  SaleRow,
  Schedule,
  Service,
  SessionPassRow,
  Staff,
} from './database.aliases';
