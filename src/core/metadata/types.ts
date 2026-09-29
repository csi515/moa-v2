/**
 * 핵심 업무 필드는 컬럼/관계. metadata는 확장용.
 * 한 번에 전 도메인을 옮기지 않는다.
 */

export const PROMOTED_FIELD_KEYS = [
  'organization_id',
  'location_id',
  'customer_id',
  'staff_id',
  'service_id',
  'resource_id',
  'price',
  'status',
  'start_at',
  'end_at',
  'teacher_id',
  'room_id',
  'session_pass_id',
] as const;

export type PromotedFieldKey = (typeof PROMOTED_FIELD_KEYS)[number];

export const METADATA_COMPAT_KEYS = [
  'teacherId',
  'staffId',
  'locationId',
  'room',
  'roomId',
  'sessionPassId',
] as const;

export type MetadataDomainPromotion = {
  domain: string;
  table: string;
  /** 이번 파일럿에서 컬럼으로 올린 필드 */
  promotedColumns: readonly string[];
  /** compatibility 기간 동안 metadata에서 읽는 키 */
  metadataFallbacks: readonly string[];
  phase: 'dual-read' | 'migrating' | 'single-read';
};

export const SCHEDULE_METADATA_PROMOTION: MetadataDomainPromotion = {
  domain: 'schedules',
  table: 'schedules',
  promotedColumns: ['staff_id', 'session_pass_id', 'room', 'room_id'],
  metadataFallbacks: ['teacherId', 'sessionPassId', 'room', 'roomId'],
  phase: 'dual-read',
};
