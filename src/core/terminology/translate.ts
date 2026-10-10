/**
 * Terminology translation helper & factory.
 *
 * dot-notation ('customer.singular', 'billing.fee' 등) 및 단축 별칭 ('customer', 'fee' 등)을
 * 해석하여 사전에서 안전하게 단어를 추출합니다.
 */

import type { TerminologyDictionary, TermKey } from './types';

const SHORTCUT_MAP: Record<string, string> = {
  customer: 'customer.singular',
  contact: 'contact.singular',
  staff: 'staff.singular',
  service: 'service.singular',
  schedule: 'schedule.singular',
  fee: 'billing.fee',
  place: 'facility.place',
  attendance: 'attendance.noun',
};

/**
 * 사전과 키를 받아 번역된 도메인 용어를 반환합니다.
 */
export function translateTerm(
  dict: TerminologyDictionary,
  key: TermKey,
  fallback?: string
): string {
  if (!key) return fallback ?? '';

  const resolvedKey = SHORTCUT_MAP[key] ?? key;
  const parts = resolvedKey.split('.');
  let current: any = dict;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      current = undefined;
      break;
    }
    current = current[part];
  }

  if (typeof current === 'string' && current.length > 0) {
    return current;
  }

  // 특수 폴백 처리
  if (resolvedKey === 'customer.statusPaused') {
    const active = dict.customer?.statusActive;
    return active === '재원' ? '휴원' : '휴회';
  }

  if (resolvedKey === 'attendance.noun') {
    return fallback ?? '출결';
  }
  if (resolvedKey === 'attendance.checkIn') {
    return fallback ?? '출석';
  }
  if (resolvedKey === 'attendance.checkOut') {
    return fallback ?? '퇴실';
  }

  return fallback ?? '';
}

/**
 * 특정 사전에 고정된 번역 함수 t(key, fallback)를 생성합니다.
 */
export function createTranslator(dict: TerminologyDictionary) {
  return function t(key: TermKey, fallback?: string): string {
    return translateTerm(dict, key, fallback);
  };
}
