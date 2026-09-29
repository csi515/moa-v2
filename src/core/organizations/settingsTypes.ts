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

export interface AcademySettings {
  name: string;
  directorName?: string;
  representative?: string;
  address: string;
  phone: string;
  businessNumber?: string;
  defaultTuitionFee: number;
  defaultPaymentDay?: number;
  defaultBillingMode?: StudentBillingMode;
  includeExtrasInMonthlyInvoice?: boolean;
  defaultLessonMinutes?: number;
  consultationSlotMinutes?: number;
  attendanceAlertEnabled?: boolean;
  tuitionReminderDaysBefore?: number;
  bankAccount?: string | {
    bank: string;
    accountNumber: string;
    holder: string;
  };
  announcement?: string;
  business_hours?: string;
  rooms?: AcademyRoom[];
  retailCatalog?: SettingsRetailCatalogItem[];
  skinRetailCoreMigratedAt?: string | null;
  skinRetailCoreMigratedAtByOrg?: Record<string, string>;
  skinRetailMigratedProductIdsByOrg?: Record<string, string[]>;
  depositEnabled?: boolean;
  depositAmount?: number;
  slotRecruitments?: SlotRecruitment[];
  staffHours?: StaffWorkWindow[];
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
