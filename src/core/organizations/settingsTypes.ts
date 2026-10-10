import type { StudentBillingMode } from '@/core/students/billingMode';
import type { SlotRecruitment } from '@/core/types/schedule';
import type { StaffWorkWindow } from '@/core/staff/workWindow';

export type AcademyRoomKind = 'classroom' | 'practice' | 'treatment';

export interface AcademyRoom {
  id: string;
  name: string;
  kind: AcademyRoomKind;
}

/** Skin 설정 JSON 카탈로그 행. Industry 이름은 RetailProduct */
export interface SettingsRetailCatalogItem {
  id: string;
  name: string;
  price: number;
  stock: number;
}

/** 1. 모든 업종 공통 기본 사업장 정보 */
export interface CommonWorkplaceSettings {
  name: string;
  directorName?: string;
  representative?: string;
  address: string;
  phone: string;
  businessNumber?: string;
  announcement?: string;
  business_hours?: string;
  bankAccount?: string | {
    bank: string;
    accountNumber: string;
    holder: string;
  };
}

/** 2. 공간/룸 설정 (공통) */
export interface WorkplaceRoomSettings {
  rooms?: AcademyRoom[];
}

/** 3. 기능 플래그 및 부가 설정 (공통) */
export interface WorkplaceFeatureSettings {
  features?: {
    attendance?: {
      enabled?: boolean;
    };
    points?: {
      enabled?: boolean;
      earnEnabled?: boolean;
      earnRatePercent?: number;
    };
  };
}

/** 4. 업종별 특화 설정 (격리된 파티션) */
export interface IndustryPartitionedSettings {
  /** 학원형 (교육/피아노 등) */
  education?: {
    defaultTuitionFee?: number;
    defaultPaymentDay?: number;
    defaultBillingMode?: StudentBillingMode;
    includeExtrasInMonthlyInvoice?: boolean;
    defaultLessonMinutes?: number;
    attendanceAlertEnabled?: boolean;
    tuitionReminderDaysBefore?: number;
  };
  /** 예약/서비스형 (필라테스, 피부 등) */
  booking?: {
    depositEnabled?: boolean;
    depositAmount?: number;
    consultationSlotMinutes?: number;
    slotRecruitments?: SlotRecruitment[];
    staffHours?: StaffWorkWindow[];
  };
  /** 소매/뷰티 카탈로그 및 마이그레이션 메타데이터 */
  retail?: {
    catalog?: SettingsRetailCatalogItem[];
    migratedAt?: string | null;
  };
}

/** 통합 사업장 설정 규격 */
export interface UnifiedOrganizationSettings
  extends CommonWorkplaceSettings,
    WorkplaceRoomSettings,
    WorkplaceFeatureSettings {
  industrySettings?: IndustryPartitionedSettings;
}

/**
 * 하위 호환용 종합 설정 인터페이스 (Legacy AcademySettings)
 */
export interface AcademySettings extends UnifiedOrganizationSettings {
  defaultTuitionFee: number;
  defaultPaymentDay?: number;
  defaultBillingMode?: StudentBillingMode;
  includeExtrasInMonthlyInvoice?: boolean;
  defaultLessonMinutes?: number;
  consultationSlotMinutes?: number;
  attendanceAlertEnabled?: boolean;
  tuitionReminderDaysBefore?: number;
  retailCatalog?: SettingsRetailCatalogItem[];
  skinRetailCoreMigratedAt?: string | null;
  skinRetailCoreMigratedAtByOrg?: Record<string, string>;
  skinRetailMigratedProductIdsByOrg?: Record<string, string[]>;
  depositEnabled?: boolean;
  depositAmount?: number;
  slotRecruitments?: SlotRecruitment[];
  staffHours?: StaffWorkWindow[];
}

export type OrganizationRoomKind = AcademyRoomKind;
export type OrganizationRoom = AcademyRoom;
export type OrganizationSettings = AcademySettings;
