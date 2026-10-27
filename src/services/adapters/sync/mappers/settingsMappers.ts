import type {
  AppNotification,
  AttendanceRecord,
  ClassItem,
  Consultation,
  Parent,
  Student,
  TuitionInvoice,
} from '../../../../types';
import type { Json, PaymentMethod as DbPaymentMethod, PaymentStatus } from '../../../../lib/supabase/database.types';
import type { StaffMetadata } from '../../types';
import type { AcademySettings, Teacher } from '../../../../types';
import type { Booking, ServiceOffering } from '../../../../core/types/schedule';
import type { PickupAddress } from '../../../../core/transport/types';


// ─── Settings ─────────────────────────────────────────────────────

export function parseOrganizationSettings(
  settings: Json | null | undefined,
  fallback: AcademySettings
): AcademySettings {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return fallback;
  }
  return { ...fallback, ...(settings as unknown as AcademySettings) };
}

