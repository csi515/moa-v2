/** 어린이집 알림장 */
export type CareJournalMood = 'good' | 'normal' | 'tired' | 'sick';

export interface CareJournal {
  id: string;
  studentId: string;
  studentName: string;
  journalDate: string; // YYYY-MM-DD
  mood: CareJournalMood;
  meals: string;
  nap: string;
  activities: string;
  bowel?: string;
  healthNote?: string;
  teacherNote: string;
  teacherId?: string;
  teacherName?: string;
  createdAt: string;
  updatedAt: string;
}

/** 투약 의뢰 상태 */
export type MedicationStatus = 'requested' | 'administered' | 'cancelled';

export interface MedicationRequest {
  id: string;
  studentId: string;
  studentName: string;
  requestDate: string; // YYYY-MM-DD
  medicineName: string;
  dosage: string;
  times: string;
  reason: string;
  guardianName?: string;
  status: MedicationStatus;
  administeredAt?: string;
  administeredBy?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export const CARE_JOURNAL_MOOD_LABEL: Record<CareJournalMood, string> = {
  good: '좋음',
  normal: '보통',
  tired: '피곤',
  sick: '아픔',
};

export const MEDICATION_STATUS_LABEL: Record<MedicationStatus, string> = {
  requested: '투약 대기',
  administered: '투약 완료',
  cancelled: '취소',
};

/** 데려갈 수 있는 보호자 — 사진은 받지 않음 */
export interface AuthorizedPickup {
  name: string;
  relation: string;
  phone: string;
}

/** 원아별 건강·귀가 기록. SoT = core.care_child_records */
export interface ChildLegalRecord {
  id: string;
  studentId: string;
  studentName: string;
  vaccinationCheckedAt?: string;
  healthCheckDate?: string;
  allergyNote?: string;
  authorizedPickups: AuthorizedPickup[];
  createdAt: string;
  updatedAt: string;
}

/** 원내 사고 기록. SoT = core.care_incidents. 관청 보고는 하지 않음 */
export interface CareIncident {
  id: string;
  studentId: string;
  studentName: string;
  occurredAt: string;
  content: string;
  actionTaken: string;
  parentNotifiedAt?: string;
  teacherId?: string;
  teacherName?: string;
  createdAt: string;
  updatedAt: string;
}

export const CHILD_RECORD_GAP_LABEL = {
  vaccine: '예방접종 확인',
  checkup: '올해 건강검진',
  allergy: '알레르기·특이질환',
  pickup: '귀가 동의',
} as const;

export type ChildRecordGap = keyof typeof CHILD_RECORD_GAP_LABEL;

/** 교사 보건증 만료일. SoT = core.care_staff_health_certs */
export interface StaffHealthCert {
  id: string;
  teacherId: string;
  teacherName: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export type SafetyCheckKind = 'fire_drill' | 'safety_inspection';

export interface SafetyChecklistItem {
  key: string;
  label: string;
  checked: boolean;
}

/** 안전점검·대피훈련. SoT = core.care_safety_logs */
export interface SafetyInspectionLog {
  id: string;
  logDate: string;
  kind: SafetyCheckKind;
  items: SafetyChecklistItem[];
  note?: string;
  teacherId?: string;
  teacherName?: string;
  createdAt: string;
  updatedAt: string;
}

/** 보존식. SoT = core.care_meal_samples. 저장 시각 + 144시간 */
export interface MealSampleLog {
  id: string;
  menuName: string;
  storedAt: string;
  disposeAt: string;
  teacherId?: string;
  teacherName?: string;
  createdAt: string;
  updatedAt: string;
}

export type CctvViewStatus = 'requested' | 'approved' | 'rejected';

/** CCTV 열람 신청. SoT = core.care_cctv_requests */
export interface CctvViewRequest {
  id: string;
  requestedAt: string;
  purpose: string;
  applicantName: string;
  applicantTeacherId?: string;
  status: CctvViewStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export const SAFETY_CHECK_KIND_LABEL: Record<SafetyCheckKind, string> = {
  fire_drill: '소방대피훈련',
  safety_inspection: '안전점검',
};

export const CCTV_VIEW_STATUS_LABEL: Record<CctvViewStatus, string> = {
  requested: '승인 대기',
  approved: '승인',
  rejected: '반려',
};

/** 어린이집 하원 인수. SoT = core.care_pickup_logs. 출결 퇴실과 별도 */
export interface CarePickupLog {
  id: string;
  studentId: string;
  studentName: string;
  pickupDate: string;
  pickedUpAt: string;
  pickerName: string;
  relation: string;
  outsideConsent: boolean;
  teacherId?: string;
  teacherName?: string;
  createdAt: string;
  updatedAt: string;
}

export const PICKUP_OUTSIDE_LABEL = '동의 외';

export const HEALTH_CERT_WARN_DAYS = 30;
export const MEAL_SAMPLE_HOLD_HOURS = 144;
