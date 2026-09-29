/**
 * database.types.ts 의 Database 인터페이스와 분리한 앱 헬퍼 타입.
 * schema snapshot을 생성할 때 이 파일은 덮어쓰지 않는다.
 */
import type { Database } from './database.types';

export type CoreTables<T extends keyof Database['core']['Tables']> =
  Database['core']['Tables'][T]['Row'];

export type Organization = CoreTables<'organizations'>;
export type LocationRow = CoreTables<'locations'>;
export type AuditLogRow = CoreTables<'audit_logs'>;
export type IdempotencyKeyRow = CoreTables<'idempotency_keys'>;
export type OutboxEventRow = CoreTables<'outbox_events'>;
export type SessionPassRow = CoreTables<'session_passes'>;
export type PlatformPlanRow = Database['platform']['Tables']['plans']['Row'];
export type PlatformSubscriptionRow = Database['platform']['Tables']['subscriptions']['Row'];
export type PlatformSubscriptionItemRow =
  Database['platform']['Tables']['subscription_items']['Row'];
export type PlatformFeatureEntitlementRow =
  Database['platform']['Tables']['feature_entitlements']['Row'];
export type Profile = CoreTables<'profiles'>;
export type OrganizationMember = CoreTables<'organization_members'>;
export type Customer = CoreTables<'customers'>;
export type CustomerContact = CoreTables<'customer_contacts'>;
export type Staff = CoreTables<'staff'>;
export type Service = CoreTables<'services'>;
export type Schedule = CoreTables<'schedules'>;
export type Payment = CoreTables<'payments'>;
export type PaymentTransaction = CoreTables<'payment_transactions'>;
export type Consultation = CoreTables<'consultations'>;
export type Notification = CoreTables<'notifications'>;
export type AvailabilityRuleRow = CoreTables<'availability_rules'>;
export type AvailabilityOverrideRow = CoreTables<'availability_overrides'>;
export type ReservationRow = CoreTables<'reservations'>;
export type SaleRow = CoreTables<'sales'>;
export type SaleItemRow = CoreTables<'sale_items'>;
export type PointAccountRow = CoreTables<'point_accounts'>;
export type PointTransactionRow = CoreTables<'point_transactions'>;

export type OrganizationReservationRpcRow =
  Database['core']['Functions']['get_organization_reservations']['Returns'][number];
export type MyReservationRpcRow =
  Database['core']['Functions']['get_my_reservations']['Returns'][number];
