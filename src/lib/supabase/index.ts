export { supabase, isSupabaseConfigured, getCoreClient } from './client';
export { getPianoClient } from './pianoClient';
export { getBathClient } from './bathClient';
export { getPlatformClient } from './platformClient';
export type {
  Database,
  Organization,
  Profile,
  OrganizationMember,
  Customer,
  CustomerContact,
  Staff,
  Service,
  Schedule,
  Payment,
  PaymentTransaction,
  Consultation,
  Notification,
  MemberRole,
  ScheduleStatus,
  PaymentStatus,
  PaymentMethod,
  NotificationStatus,
  NotificationChannel,
  PianoAttendanceStatus,
  PianoInventoryTransactionType,
  PianoTextbookPaymentStatus,
} from './database.types';
