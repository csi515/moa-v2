import type { Json } from '@/lib/supabase/database.types';

/**
 * 임의의 객체나 값을 Supabase Json 타입으로 안전하게 변환합니다.
 * 매퍼 계층에서 `as unknown as Json` 이중 단언 안티패턴을 제거하기 위한 정규 헬퍼입니다.
 */
export function toJsonValue(value: unknown): Json {
  if (value === undefined) {
    return null;
  }
  return value as Json;
}

/**
 * DB에서 조회된 JSON/메타데이터를 지정된 도메인 인터페이스 타입으로 안전하게 파싱합니다.
 * null, undefined, 또는 잘못된 타입이 들어왔을 때 빈 객체나 기본값을 반환하여 런타임 오류를 방지합니다.
 */
export function parseMetadata<T extends object>(
  raw: unknown,
  fallback: T = {} as T
): T {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return fallback;
  }
  return raw as T;
}
