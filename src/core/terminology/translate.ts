/**
 * Terminology translation helper & factory.
 *
 * dot-notation ('customer.singular', 'billing.fee' 등)을 해석하여
 * 사전에서 안전하게 단어를 추출합니다.
 */

import type { TerminologyDictionary, TermKey } from './types';

/**
 * 사전과 키를 받아 번역된 도메인 용어를 반환합니다.
 */
export function translateTerm(
  dict: TerminologyDictionary,
  key: TermKey,
  fallback?: string
): string {
  if (!key) return fallback ?? '';

  const parts = key.split('.');
  let current: any = dict;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') {
      return fallback ?? '';
    }
    current = current[part];
  }

  if (typeof current === 'string') {
    return current;
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
