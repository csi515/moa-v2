/**
 * 피아노 학원 가족/형제자매 동시 관리 & 수강료 결제 묶음 처리 도메인 엔진
 */

export interface PianoStudentSummary {
  id: string;
  name: string;
  studentNumber?: string;
  grade?: string;
  phone?: string;
  parentPhone?: string;
  parentName?: string;
  tuitionFee: number;
  status?: string;
}

export interface PianoInvoiceSummary {
  id: string;
  studentId: string;
  studentName?: string;
  yearMonth: string;
  title: string;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  status: 'paid' | 'partial' | 'unpaid' | 'cancelled' | string;
  dueDate?: string;
}

export interface FamilyGroup {
  groupId: string;
  familyName: string;
  representativeName: string;
  representativePhone: string;
  studentIds: string[];
  sharedCreditBalance: number;
  customDiscountRatePercent?: number;
  createdAt: string;
  isAutoDetected?: boolean;
}

export interface FamilyGroupDetail {
  group: FamilyGroup;
  students: PianoStudentSummary[];
  invoices: PianoInvoiceSummary[];
  totalTuition: number;
  discountRatePercent: number;
  discountAmount: number;
  netPayableAmount: number;
  unpaidInvoiceCount: number;
  totalUnpaidAmount: number;
}

export interface FamilyBundlePaymentCalculation {
  totalOriginalAmount: number;
  discountRatePercent: number;
  discountAmount: number;
  netPayableAmount: number;
  appliedSharedCredit: number;
  finalOutOfPocketAmount: number;
  remainingSharedCredit: number;
}

const STORAGE_KEY_CUSTOM_FAMILY_GROUPS = 'moa_piano_custom_family_groups';
const STORAGE_KEY_FAMILY_CREDITS = 'moa_piano_family_credits';

/**
 * 전화번호 정규화 (숫자만 추출)
 */
export function normalizePhoneNumber(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/[^0-9]/g, '');
}

/**
 * 형제/자매 수에 따른 표준 결합 할인율 산출
 * - 1인: 0%
 * - 2인: 10%
 * - 3인 이상: 15%
 */
export function calculateFamilyDiscountRate(activeMemberCount: number, baseRatePercent: number = 10): number {
  if (activeMemberCount <= 1) return 0;
  if (activeMemberCount === 2) return baseRatePercent;
  return baseRatePercent + 5;
}

/**
 * 학생 목록으로부터 동일 학부모 연락처를 가진 가족 그룹을 자동 감지하고,
 * 수동 등록된 커스텀 그룹과 병합합니다.
 */
export function detectAndMergeFamilyGroups(
  students: PianoStudentSummary[],
  customGroups: FamilyGroup[] = []
): FamilyGroup[] {
  const activeStudents = students.filter(s => s.status !== 'withdrawn' && s.status !== 'expelled');

  // 1. 수동 등록된 그룹에 이미 속한 학생 ID 집합
  const assignedStudentIds = new Set<string>();
  for (const group of customGroups) {
    for (const sid of group.studentIds) {
      assignedStudentIds.add(sid);
    }
  }

  // 2. 전화번호별 학생 매핑 (parentPhone 우선, 없으면 phone)
  const phoneToStudents = new Map<string, PianoStudentSummary[]>();

  for (const student of activeStudents) {
    if (assignedStudentIds.has(student.id)) continue;

    const rawPhone = student.parentPhone || student.phone;
    const cleanPhone = normalizePhoneNumber(rawPhone);

    // 유효한 전화번호(9자리 이상)인 경우에만 자동 감지 대상
    if (cleanPhone.length >= 9) {
      const existing = phoneToStudents.get(cleanPhone) || [];
      existing.push(student);
      phoneToStudents.set(cleanPhone, existing);
    }
  }

  // 3. 2명 이상 동일 연락처를 공유하는 학생들을 자동 가족 그룹으로 생성
  const autoDetectedGroups: FamilyGroup[] = [];

  phoneToStudents.forEach((siblings, cleanPhone) => {
    if (siblings.length >= 2) {
      const first = siblings[0];
      const representativeName = first.parentName || `${first.name} 학부모`;
      const familyName = `${siblings.map(s => s.name).join(' & ')} 가족`;
      const groupId = `auto-fam-${cleanPhone}`;

      autoDetectedGroups.push({
        groupId,
        familyName,
        representativeName,
        representativePhone: first.parentPhone || first.phone || cleanPhone,
        studentIds: siblings.map(s => s.id),
        sharedCreditBalance: 0,
        createdAt: new Date().toISOString().slice(0, 10),
        isAutoDetected: true,
      });
    }
  });

  return [...customGroups, ...autoDetectedGroups];
}

/**
 * 패밀리 그룹 상세 정보(소속 원생, 미납 청구서, 할인 계산) 집계
 */
export function buildFamilyGroupDetail(
  group: FamilyGroup,
  students: PianoStudentSummary[],
  invoices: PianoInvoiceSummary[],
  savedCredits?: Record<string, number>
): FamilyGroupDetail {
  const studentMap = new Map(students.map(s => [s.id, s]));
  const groupStudents: PianoStudentSummary[] = [];

  for (const sid of group.studentIds) {
    const s = studentMap.get(sid);
    if (s) groupStudents.push(s);
  }

  const groupStudentIdSet = new Set(group.studentIds);
  const groupInvoices = invoices.filter(inv => groupStudentIdSet.has(inv.studentId));
  const unpaidInvoices = groupInvoices.filter(inv => inv.status === 'unpaid' || inv.status === 'partial');

  const totalTuition = groupStudents.reduce((sum, s) => sum + (s.tuitionFee || 0), 0);
  const totalUnpaidAmount = unpaidInvoices.reduce((sum, inv) => sum + inv.unpaidAmount, 0);

  const discountRatePercent = group.customDiscountRatePercent !== undefined
    ? group.customDiscountRatePercent
    : calculateFamilyDiscountRate(groupStudents.length);

  const discountAmount = Math.round(totalTuition * (discountRatePercent / 100));
  const netPayableAmount = Math.max(0, totalTuition - discountAmount);

  const creditBalance = savedCredits && savedCredits[group.groupId] !== undefined
    ? savedCredits[group.groupId]
    : group.sharedCreditBalance;

  return {
    group: {
      ...group,
      sharedCreditBalance: creditBalance,
    },
    students: groupStudents,
    invoices: groupInvoices,
    totalTuition,
    discountRatePercent,
    discountAmount,
    netPayableAmount,
    unpaidInvoiceCount: unpaidInvoices.length,
    totalUnpaidAmount,
  };
}

/**
 * 패밀리 묶음 수강료 결제 계산 (할인 및 공용 크레딧 상계 시뮬레이션)
 */
export function calculateFamilyBundlePayment(
  originalAmount: number,
  discountRatePercent: number,
  sharedCreditBalance: number,
  useCreditRequested: boolean | number = false
): FamilyBundlePaymentCalculation {
  const discountAmount = Math.round(originalAmount * (discountRatePercent / 100));
  const netPayableAmount = Math.max(0, originalAmount - discountAmount);

  let creditToApply = 0;
  if (typeof useCreditRequested === 'number') {
    creditToApply = Math.max(0, Math.min(useCreditRequested, sharedCreditBalance, netPayableAmount));
  } else if (useCreditRequested === true) {
    creditToApply = Math.min(sharedCreditBalance, netPayableAmount);
  }

  const finalOutOfPocketAmount = Math.max(0, netPayableAmount - creditToApply);
  const remainingSharedCredit = Math.max(0, sharedCreditBalance - creditToApply);

  return {
    totalOriginalAmount: originalAmount,
    discountRatePercent,
    discountAmount,
    netPayableAmount,
    appliedSharedCredit: creditToApply,
    finalOutOfPocketAmount,
    remainingSharedCredit,
  };
}

/**
 * 특정 원생이 속한 패밀리 그룹 및 형제자매 목록을 반환
 */
export function findStudentFamilyInfo(
  studentId: string,
  allGroups: FamilyGroup[],
  allStudents: PianoStudentSummary[]
): {
  familyGroup?: FamilyGroup;
  siblings: PianoStudentSummary[];
  isSiblingEnrolled: boolean;
  siblingCount: number;
} {
  const group = allGroups.find(g => g.studentIds.includes(studentId));
  if (!group) {
    return {
      siblings: [],
      isSiblingEnrolled: false,
      siblingCount: 0,
    };
  }

  const studentMap = new Map(allStudents.map(s => [s.id, s]));
  const siblings = group.studentIds
    .filter(id => id !== studentId)
    .map(id => studentMap.get(id))
    .filter((s): s is PianoStudentSummary => Boolean(s));

  return {
    familyGroup: group,
    siblings,
    isSiblingEnrolled: siblings.length > 0,
    siblingCount: siblings.length,
  };
}

/**
 * 로컬스토리지에서 커스텀 패밀리 그룹 목록을 로드
 */
export function loadCustomFamilyGroups(): FamilyGroup[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_CUSTOM_FAMILY_GROUPS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 로컬스토리지에 커스텀 패밀리 그룹 목록 저장
 */
export function saveCustomFamilyGroups(groups: FamilyGroup[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY_CUSTOM_FAMILY_GROUPS, JSON.stringify(groups));
  } catch {
    // ignore
  }
}

/**
 * 로컬스토리지에서 가족 공용 크레딧 맵 로드
 */
export function loadFamilyCredits(): Record<string, number> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_FAMILY_CREDITS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * 특정 가족의 공용 크레딧 잔액 저장
 */
export function updateFamilyCreditBalance(groupId: string, newBalance: number): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const credits = loadFamilyCredits();
    credits[groupId] = Math.max(0, newBalance);
    window.localStorage.setItem(STORAGE_KEY_FAMILY_CREDITS, JSON.stringify(credits));
  } catch {
    // ignore
  }
}
