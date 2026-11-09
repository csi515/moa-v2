/**
 * Supabase 및 PostgreSQL 에러 정규화 파서 (Canonical Error Parser)
 *
 * PostgreSQL 에러 코드(RLS 403, FK 위반, 유니크 충돌, 락 경합 등)를 사람이 읽기 쉬운
 * 사용자 친화적 한국어 에러 메시지 및 도메인 에러 객체로 변환합니다.
 */

export interface ParsedSupabaseError {
  /** 정규화된 오류 코드 (예: PERMISSION_DENIED, CONFLICT, LOCKED, NOT_FOUND 등) */
  code:
    | 'PERMISSION_DENIED'
    | 'UNIQUE_VIOLATION'
    | 'FOREIGN_KEY_VIOLATION'
    | 'LOCK_NOT_AVAILABLE'
    | 'CHECK_VIOLATION'
    | 'INVALID_CLIENT'
    | 'NETWORK_ERROR'
    | 'UNKNOWN_ERROR';
  /** 사용자 화면/토스트에 즉시 노출 가능한 한국어 메시지 */
  userMessage: string;
  /** 원본 PostgreSQL 또는 HTTP 상태 코드 */
  originalCode?: string | number;
  /** 디버깅용 기술 상세 메시지 */
  technicalMessage: string;
}

export interface ParseErrorOptions {
  /** 에러가 발생한 엔티티 또는 도메인 명칭 (예: '수강생', '이용권', '결제') */
  entity?: string;
  /** 작업 명칭 (예: '등록', '수정', '삭제', '조회') */
  action?: string;
  /** 기본 폴백 메시지 */
  fallbackMessage?: string;
}

export function parseSupabaseError(
  error: unknown,
  options: ParseErrorOptions = {}
): ParsedSupabaseError {
  const { entity = '데이터', action = '처리', fallbackMessage } = options;

  if (!error) {
    return {
      code: 'UNKNOWN_ERROR',
      userMessage: fallbackMessage || `${entity} ${action} 중 알 수 없는 오류가 발생했습니다.`,
      technicalMessage: 'Empty or undefined error passed.',
    };
  }

  const errObj = typeof error === 'object' && error !== null ? (error as Record<string, any>) : {};
  const pgCode = String(errObj.code || errObj.status || '');
  const rawMessage = String(errObj.message || errObj.error_description || String(error));
  const details = String(errObj.details || '');

  // 1. RLS 권한 거부 (PostgreSQL 42501 또는 HTTP 403)
  if (
    pgCode === '42501' ||
    pgCode === '403' ||
    rawMessage.includes('row-level security') ||
    rawMessage.includes('permission denied')
  ) {
    return {
      code: 'PERMISSION_DENIED',
      userMessage: `${entity} ${action} 권한이 없습니다. (사업장 관리자에게 권한을 요청하세요)`,
      originalCode: pgCode,
      technicalMessage: rawMessage,
    };
  }

  // 2. 유니크 키 / 멱등성 중복 충돌 (PostgreSQL 23505 또는 HTTP 409)
  if (
    pgCode === '23505' ||
    pgCode === '409' ||
    rawMessage.includes('duplicate key') ||
    rawMessage.includes('unique constraint')
  ) {
    return {
      code: 'UNIQUE_VIOLATION',
      userMessage: `이미 등록된 ${entity} 정보가 존재합니다. 중복 여부를 확인해주세요.`,
      originalCode: pgCode,
      technicalMessage: rawMessage,
    };
  }

  // 3. 외래키 제약조건 위반 (PostgreSQL 23503)
  if (pgCode === '23503' || rawMessage.includes('foreign key constraint')) {
    return {
      code: 'FOREIGN_KEY_VIOLATION',
      userMessage: `연결된 상위 정보가 존재하지 않거나 삭제되어 ${entity}을(를) ${action}할 수 없습니다.`,
      originalCode: pgCode,
      technicalMessage: rawMessage,
    };
  }

  // 4. 비관적 락 경합 및 타임아웃 (PostgreSQL 55P03 lock_not_available)
  if (
    pgCode === '55P03' ||
    rawMessage.includes('could not obtain lock') ||
    rawMessage.includes('lock_not_available')
  ) {
    return {
      code: 'LOCK_NOT_AVAILABLE',
      userMessage: `다른 사용자가 동일한 ${entity}을(를) 처리 중입니다. 잠시 후 다시 시도해주세요.`,
      originalCode: pgCode,
      technicalMessage: rawMessage,
    };
  }

  // 5. 체크 제약조건 위반 (PostgreSQL 23514)
  if (pgCode === '23514' || rawMessage.includes('check constraint')) {
    return {
      code: 'CHECK_VIOLATION',
      userMessage: `입력한 ${entity} 정보가 허용된 기준이나 형식에 맞지 않습니다.`,
      originalCode: pgCode,
      technicalMessage: rawMessage,
    };
  }

  // 6. Supabase 환경설정 누락
  if (
    rawMessage.includes('VITE_SUPABASE_URL') ||
    rawMessage.includes('Supabase client is not configured')
  ) {
    return {
      code: 'INVALID_CLIENT',
      userMessage: '서버 연결 설정이 올바르지 않습니다. 환경설정을 확인해주세요.',
      originalCode: pgCode,
      technicalMessage: rawMessage,
    };
  }

  // 7. 네트워크 및 통신 오류
  if (
    rawMessage.includes('Failed to fetch') ||
    rawMessage.includes('NetworkError') ||
    rawMessage.includes('ERR_CONNECTION')
  ) {
    return {
      code: 'NETWORK_ERROR',
      userMessage: '네트워크 연결이 원활하지 않습니다. 인터넷 연결을 확인하고 다시 시도해주세요.',
      originalCode: pgCode,
      technicalMessage: rawMessage,
    };
  }

  // 8. 기타 일반 오류
  return {
    code: 'UNKNOWN_ERROR',
    userMessage: fallbackMessage || `${entity} ${action} 중 오류가 발생했습니다: ${rawMessage}`,
    originalCode: pgCode,
    technicalMessage: details ? `${rawMessage} (${details})` : rawMessage,
  };
}
