import React, { type HTMLAttributes, type ReactNode } from 'react';

export type StatusBadgeTone =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'brand';

export type StatusBadgeSize = 'sm' | 'md';

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status?: StatusBadgeTone;
  /**
   * 한국어 도메인 상태명 (자동으로 status tone 매핑)
   * 예: '출석', '납부완료', '승인' -> success
   *     '미납', '결석', '반려', '위험' -> danger
   *     '지각', '대기', '보류', '부분납부' -> warning
   *     '예정', '상담', '신규' -> info
   */
  semantic?: string;
  size?: StatusBadgeSize;
  dot?: boolean;
  pill?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
}

const TONE_CLASSES: Record<StatusBadgeTone, { container: string; dot: string }> = {
  success: {
    container: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    dot: 'bg-emerald-500',
  },
  warning: {
    container: 'bg-amber-50 text-amber-700 border-amber-200/80',
    dot: 'bg-amber-500',
  },
  danger: {
    container: 'bg-rose-50 text-rose-700 border-rose-200/80',
    dot: 'bg-rose-500',
  },
  info: {
    container: 'bg-sky-50 text-sky-700 border-sky-200/80',
    dot: 'bg-sky-500',
  },
  neutral: {
    container: 'bg-slate-100 text-slate-700 border-slate-200/80',
    dot: 'bg-slate-400',
  },
  brand: {
    container: 'bg-slate-900 text-white border-slate-900',
    dot: 'bg-blue-400',
  },
};

const SIZE_CLASSES: Record<StatusBadgeSize, string> = {
  sm: 'text-[11px] px-2 py-0.5 gap-1 leading-tight',
  md: 'text-xs px-2.5 py-1 gap-1.5 leading-normal',
};

/**
 * semantic 문자열로부터 tone 자동 추론
 */
export function resolveSemanticStatusTone(semantic?: string): StatusBadgeTone {
  if (!semantic) return 'neutral';
  const text = semantic.trim().toLowerCase();

  // 1. Success
  if (/출석|완료|납부완료|수납완료|정상|승인|재직|활성|동의|배차완료|입고완료|양호|합격|등록완료/.test(text)) {
    return 'success';
  }
  // 2. Danger
  if (/미납|결석|반려|위험|퇴직|해지|차단|정지|폐기|파손|불량|불합격|기한만료|경고/.test(text)) {
    return 'danger';
  }
  // 3. Warning
  if (/지각|대기|보류|휴직|부분|조퇴|검토중|진행중|처리중|미확인|임박/.test(text)) {
    return 'warning';
  }
  // 4. Info
  if (/예정|상담|신규|안내|문의|신청|접수|배정|예약/.test(text)) {
    return 'info';
  }
  // 5. Brand/Active
  if (/원장|관리자|대표|공지|메인/.test(text)) {
    return 'brand';
  }

  return 'neutral';
}

/**
 * Moa-v2 표준 상태 배지 (StatusBadge)
 * - `whitespace-nowrap`을 강제하여 좁은 테이블/모바일 컬럼에서도 글자가 절대 깨지지 않음
 * - 시맨틱 컬러 토큰 및 점(dot) 표시 지원
 * - 고정폭 숫자(`tabular-nums`) 적용
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  semantic,
  size = 'sm',
  dot = false,
  pill = false,
  icon,
  className = '',
  children,
  ...rest
}) => {
  const resolvedTone = status ?? resolveSemanticStatusTone(semantic ?? (typeof children === 'string' ? children : ''));
  const toneStyle = TONE_CLASSES[resolvedTone] ?? TONE_CLASSES.neutral;
  const radiusClass = pill ? 'rounded-full' : size === 'sm' ? 'rounded-md' : 'rounded-lg';

  const content = children ?? semantic ?? '';

  return (
    <span
      className={`inline-flex items-center border font-semibold tracking-tight whitespace-nowrap select-none tabular-nums transition-colors ${toneStyle.container} ${SIZE_CLASSES[size]} ${radiusClass} ${className}`}
      {...rest}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${toneStyle.dot}`}
          aria-hidden="true"
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{content}</span>
    </span>
  );
};
