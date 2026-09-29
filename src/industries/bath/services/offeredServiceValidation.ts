import {
  BATH_SERVICE_CATEGORIES,
  type BathService,
  type BathServiceCategory,
  type BathServiceTimeSlot,
  type BathServiceWriteInput,
} from '../types/service';

export type BathServiceValidationError =
  | 'name'
  | 'category'
  | 'duration'
  | 'base_price'
  | 'sort_order';

const CATEGORY_SET = new Set<string>(BATH_SERVICE_CATEGORIES);

export function isBathServiceCategory(value: string): value is BathServiceCategory {
  return CATEGORY_SET.has(value);
}

export function validateBathServiceInput(
  input: BathServiceWriteInput
): { ok: true } | { ok: false; reason: BathServiceValidationError } {
  if (!input.name.trim()) return { ok: false, reason: 'name' };
  if (!isBathServiceCategory(input.category)) return { ok: false, reason: 'category' };
  if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 5) {
    return { ok: false, reason: 'duration' };
  }
  const price = input.basePrice ?? 0;
  if (!Number.isFinite(price) || price < 0) {
    return { ok: false, reason: 'base_price' };
  }
  const sortOrder = input.sortOrder ?? 0;
  if (!Number.isInteger(sortOrder)) return { ok: false, reason: 'sort_order' };
  return { ok: true };
}

export function bathServiceValidationMessage(reason: BathServiceValidationError): string {
  if (reason === 'name') return '서비스 이름을 입력하세요.';
  if (reason === 'category') return '서비스 분류가 올바르지 않습니다.';
  if (reason === 'duration') return '기본 시간은 5분 이상이어야 합니다.';
  if (reason === 'base_price') return '기본 요금은 0 이상이어야 합니다.';
  return '정렬 값이 올바르지 않습니다.';
}

export function buildBathServiceTimeSlot(params: {
  service: Pick<BathService, 'id' | 'durationMinutes' | 'requiresStaff' | 'requiresResource'>;
  startsAt: string;
  resourceId?: string;
  staffId?: string;
}): BathServiceTimeSlot {
  const start = new Date(params.startsAt);
  const endsAt = Number.isNaN(start.getTime())
    ? params.startsAt
    : new Date(start.getTime() + params.service.durationMinutes * 60_000).toISOString();
  return {
    serviceId: params.service.id,
    resourceId: params.resourceId,
    staffId: params.staffId,
    startsAt: params.startsAt,
    endsAt,
    durationMinutes: params.service.durationMinutes,
  };
}
