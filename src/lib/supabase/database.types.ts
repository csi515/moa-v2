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
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id?: string | null;
          variant_id?: string | null;
          quantity?: number;
          updated_at?: string;
        };
        Update: Partial<Database['core']['Tables']['inventory']['Insert']>;
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
          created_at?: string;
        };
        Update: Partial<Database['core']['Tables']['stock_movements']['Insert']>;
        Relationships: [];
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
    };
    Views: Record<string, never>;
    Functions: {
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
      stock_movement_type: 'inbound' | 'sale' | 'return' | 'adjustment';
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
