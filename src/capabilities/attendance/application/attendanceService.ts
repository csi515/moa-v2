import type { Student } from '@/types';
import { businessDateInTimezone } from '@/shared/utils/localDate';
import type { AttendanceSession, CheckInMethod, PinCheckResult } from '../domain/types';
import { generatePinCode, hashCheckInPin, isValidPinFormat } from './pinService';

export interface CustomerPinRecord {
  customerId: string;
  pinHash: string;
}

/** core.attendance_sessions.id 는 UUID. 로컬 prefix ID는 원격 upsert가 거절된다. */
export function newAttendanceSessionId(): string {
  return crypto.randomUUID();
}

/** 영업일(기본 Asia/Seoul). UTC toISOString 날짜와 섞지 않는다. */
function todayDateString(now: Date = new Date()): string {
  return businessDateInTimezone(now);
}

function nowIso(): string {
  return new Date().toISOString();
}

/** 고객별 PIN 해시 맵에서 PIN 검색 */
export async function findCustomerByPinAsync(
  pin: string,
  pinRecords: CustomerPinRecord[],
  organizationId: string
): Promise<CustomerPinRecord | null> {
  const trimmed = pin.trim();
  if (!isValidPinFormat(trimmed)) return null;

  for (const record of pinRecords) {
    const hash = await hashCheckInPin(organizationId, record.customerId, trimmed);
    if (hash === record.pinHash) return record;
  }
  return null;
}

/**
 * PIN Attendance 체크인만 처리 (core.attendance_sessions).
 * 방문 Session·수업 출석 원장을 만들지 않는다. 퇴실 토글 없음.
 * 당일 이미 checkInAt이 있으면 already_checked_in.
 */
export async function toggleCheckInByPinLocal(params: {
  organizationId: string;
  pin: string;
  method: CheckInMethod;
  pinRecords: CustomerPinRecord[];
  sessions: AttendanceSession[];
  students: Student[];
  moduleEnabled: boolean;
}): Promise<{ result: PinCheckResult; sessions: AttendanceSession[] }> {
  const { organizationId, pin, method, pinRecords, sessions, students, moduleEnabled } = params;

  if (!moduleEnabled) {
    return { result: { success: false, error: 'module_disabled' }, sessions };
  }

  const pinRecord = await findCustomerByPinAsync(pin, pinRecords, organizationId);
  if (!pinRecord) {
    return { result: { success: false, error: 'invalid_pin' }, sessions };
  }

  const student = students.find((s) => s.id === pinRecord.customerId && s.status === 'active');
  if (!student) {
    return { result: { success: false, error: 'invalid_pin' }, sessions };
  }

  const today = todayDateString();
  const now = nowIso();
  const next = [...sessions];
  const idx = next.findIndex(
    (s) => s.customerId === pinRecord.customerId && s.sessionDate === today
  );

  if (idx >= 0 && next[idx].checkInAt) {
    return {
      result: {
        success: false,
        error: 'already_checked_in',
        customerName: student.name,
      },
      sessions: next,
    };
  }

  if (idx < 0) {
    const created: AttendanceSession = {
      id: newAttendanceSessionId(),
      customerId: student.id,
      customerName: student.name,
      sessionDate: today,
      checkInAt: now,
      checkInMethod: method,
      createdAt: now,
    };
    next.unshift(created);
  } else {
    next[idx] = {
      ...next[idx],
      checkInAt: now,
      checkInMethod: method,
      updatedAt: now,
    };
  }

  return {
    result: {
      success: true,
      action: 'check_in',
      customerId: student.id,
      customerName: student.name,
      at: now,
    },
    sessions: next,
  };
}

/** PIN 중복 검사 후 해시 생성 (학원 내 동일 숫자 PIN 금지) */
export async function assignCustomerPin(params: {
  organizationId: string;
  customerId: string;
  pin: string;
  pinRecords: CustomerPinRecord[];
}): Promise<{ ok: true; pinHash: string } | { ok: false; error: 'invalid_pin_format' | 'pin_already_used' }> {
  const { organizationId, customerId, pin, pinRecords } = params;
  if (!isValidPinFormat(pin)) {
    return { ok: false, error: 'invalid_pin_format' };
  }

  for (const record of pinRecords) {
    if (record.customerId === customerId) continue;
    const otherHash = await hashCheckInPin(organizationId, record.customerId, pin);
    if (otherHash === record.pinHash) {
      return { ok: false, error: 'pin_already_used' };
    }
  }

  const pinHash = await hashCheckInPin(organizationId, customerId, pin);
  return { ok: true, pinHash };
}

/** 충돌 없는 PIN 자동 발급 */
export async function generateUniquePin(params: {
  organizationId: string;
  customerId: string;
  pinRecords: CustomerPinRecord[];
}): Promise<{ pin: string; pinHash: string }> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const pin = generatePinCode(4);
    const result = await assignCustomerPin({
      organizationId: params.organizationId,
      customerId: params.customerId,
      pin,
      pinRecords: params.pinRecords,
    });
    if (result.ok) {
      return { pin, pinHash: result.pinHash };
    }
  }
  const pin = generatePinCode(6);
  const result = await assignCustomerPin({
    organizationId: params.organizationId,
    customerId: params.customerId,
    pin,
    pinRecords: params.pinRecords,
  });
  if (!result.ok) throw new Error('PIN 생성 실패');
  return { pin, pinHash: result.pinHash };
}

/** 세션 상태 라벨 (출석만 — 퇴실 미사용) */
export function getSessionStatusLabel(session?: AttendanceSession): {
  label: string;
  tone: 'success' | 'warning' | 'muted' | 'error';
} {
  if (!session || !session.checkInAt) {
    return { label: '미출석', tone: 'muted' };
  }
  return { label: '출석', tone: 'success' };
}

export function formatSessionTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}
