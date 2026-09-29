import type { SafetyCheckKind, SafetyChecklistItem, StaffHealthCert } from './types';
import { HEALTH_CERT_WARN_DAYS, MEAL_SAMPLE_HOLD_HOURS } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export function healthCertDaysLeft(expiresAt?: string, now = new Date()): number | null {
  if (!expiresAt) return null;
  const end = new Date(`${expiresAt.slice(0, 10)}T23:59:59`);
  if (Number.isNaN(end.getTime())) return null;
  return Math.ceil((end.getTime() - now.getTime()) / DAY_MS);
}

export function isHealthCertWarning(expiresAt?: string, now = new Date()): boolean {
  const days = healthCertDaysLeft(expiresAt, now);
  return days === null || days <= HEALTH_CERT_WARN_DAYS;
}

export function healthCertWarningLabel(expiresAt?: string, now = new Date()): string {
  if (!expiresAt) return '보건증 미등록';
  const days = healthCertDaysLeft(expiresAt, now);
  if (days === null) return '보건증 미등록';
  if (days < 0) return `보건증 만료 ${Math.abs(days)}일`;
  if (days === 0) return '보건증 오늘 만료';
  return `보건증 D-${days}`;
}

export function mealDisposeAt(storedAt: string): string {
  return new Date(new Date(storedAt).getTime() + MEAL_SAMPLE_HOLD_HOURS * 60 * 60 * 1000).toISOString();
}

export function findHealthCert(certs: StaffHealthCert[], teacherId: string): StaffHealthCert | undefined {
  return certs.find((item) => item.teacherId === teacherId);
}

const FIRE_ITEMS = ['대피 경로 안내', '인원 점검', '집결 장소 확인', '비상벨 확인'];
const SAFETY_ITEMS = ['소화기', '비상구', '전기 콘센트', '놀이시설'];

export function defaultSafetyItems(kind: SafetyCheckKind): SafetyChecklistItem[] {
  const labels = kind === 'fire_drill' ? FIRE_ITEMS : SAFETY_ITEMS;
  return labels.map((label) => ({ key: label, label, checked: false }));
}
