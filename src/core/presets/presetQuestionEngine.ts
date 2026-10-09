import { z } from 'zod';
import {
  CAPABILITY_BUNDLES,
  getIndustryPreset,
  type CapabilityModuleBundle,
} from './presetRegistry';
import type {
  CapabilitySetupSchema,
  PresetCapabilityId,
  SetupFieldDefinition,
} from './types';

export interface IndustryQuestionField extends SetupFieldDefinition {
  capabilityId: PresetCapabilityId;
  capabilityTitle: string;
}

export interface PresetRoleConfig {
  name: string;
  rank_order: number;
  permissions: string[];
}

export interface PresetRoomConfig {
  name: string;
  capacity?: number;
}

export interface PresetOperatingHoursConfig {
  day_type: string;
  start_time: string;
  end_time: string;
  slot_minutes: number;
}

export interface PresetPayload {
  industry: string;
  roles: PresetRoleConfig[];
  rooms?: PresetRoomConfig[];
  locker_count?: number;
  operating_hours: PresetOperatingHoursConfig;
  [key: string]: unknown;
}

// 4대 주요 업종 및 기본 Capability 맵
const INDUSTRY_CAPABILITY_MAP: Record<string, PresetCapabilityId[]> = {
  piano: ['seat_room', 'attendance', 'passes', 'consultation_crm'],
  piano_academy: ['seat_room', 'attendance', 'passes', 'consultation_crm'],
  sauna: ['locker', 'passes', 'credit_wallet'],
  sauna_jjimjilbang: ['locker', 'passes', 'credit_wallet'],
  pilates: ['seat_room', 'booking', 'passes', 'instructor_match'],
  custom: [],
};

// 업종 정규화 순수 함수
export function normalizeIndustryKey(industry: string): string {
  const norm = (industry || '').toLowerCase().trim();
  if (norm === 'piano_academy' || norm === 'piano') return 'piano';
  if (norm === 'sauna' || norm === 'sauna_jjimjilbang') return 'sauna';
  if (norm === 'pilates') return 'pilates';
  if (norm === 'custom') return 'custom';
  return norm;
}

// 업종별 활성 Capability 질문 목록 반환
export function getQuestionsForIndustry(industry: string): IndustryQuestionField[] {
  const normKey = normalizeIndustryKey(industry);

  let capIds: readonly PresetCapabilityId[] = [];

  if (normKey in INDUSTRY_CAPABILITY_MAP) {
    capIds = INDUSTRY_CAPABILITY_MAP[normKey];
  } else {
    // 8대 기존 프리셋에서 조회
    const preset = getIndustryPreset(normKey);
    if (preset) {
      capIds = preset.capabilities;
    }
  }

  const questions: IndustryQuestionField[] = [];
  const seenFieldIds = new Set<string>();

  for (const capId of capIds) {
    const bundle: CapabilityModuleBundle | undefined = CAPABILITY_BUNDLES[capId];
    if (!bundle || !bundle.setupSchema) continue;

    for (const field of bundle.setupSchema.fields) {
      const fieldKey = `${capId}_${field.id}`;
      if (!seenFieldIds.has(fieldKey)) {
        seenFieldIds.add(fieldKey);
        questions.push({
          ...field,
          capabilityId: capId,
          capabilityTitle: bundle.setupSchema.title,
        });
      }
    }
  }

  return questions;
}

// 업종별 표준 추천값 (Pre-fill Recommendations)
export function getStandardPresetsForIndustry(industry: string): {
  roles: PresetRoleConfig[];
  rooms?: PresetRoomConfig[];
  locker_count?: number;
  operating_hours: PresetOperatingHoursConfig;
} {
  const normKey = normalizeIndustryKey(industry);

  switch (normKey) {
    case 'piano':
      return {
        roles: [
          { name: '원장', rank_order: 1, permissions: ['*'] },
          { name: '전임강사', rank_order: 2, permissions: ['attendance:*', 'passes:view'] },
          { name: '파트타임', rank_order: 3, permissions: ['attendance:checkin'] },
        ],
        rooms: [
          { name: '그랜드룸', capacity: 2 },
          { name: '일반 1호', capacity: 1 },
          { name: '일반 2호', capacity: 1 },
          { name: '일반 3호', capacity: 1 },
          { name: '일반 4호', capacity: 1 },
        ],
        operating_hours: {
          day_type: 'WEEKDAY',
          start_time: '13:00',
          end_time: '19:00',
          slot_minutes: 30,
        },
      };

    case 'sauna':
      return {
        roles: [
          { name: '사장', rank_order: 1, permissions: ['*'] },
          { name: '주간 카운터', rank_order: 2, permissions: ['passes:*', 'lockers:*'] },
          { name: '야간 카운터', rank_order: 3, permissions: ['passes:deduct', 'lockers:assign'] },
        ],
        locker_count: 50,
        operating_hours: {
          day_type: 'ALL_WEEK',
          start_time: '05:00',
          end_time: '23:00',
          slot_minutes: 60,
        },
      };

    case 'pilates':
      return {
        roles: [
          { name: '대표', rank_order: 1, permissions: ['*'] },
          { name: '수석강사', rank_order: 2, permissions: ['passes:*', 'booking:*'] },
          { name: '강사', rank_order: 3, permissions: ['attendance:checkin'] },
        ],
        rooms: [
          { name: '리포머룸', capacity: 6 },
          { name: '체어룸', capacity: 6 },
          { name: '개인레슨실', capacity: 1 },
        ],
        operating_hours: {
          day_type: 'WEEKDAY',
          start_time: '09:00',
          end_time: '21:00',
          slot_minutes: 50,
        },
      };

    case 'custom':
    default:
      return {
        roles: [{ name: '관리자', rank_order: 1, permissions: ['*'] }],
        operating_hours: {
          day_type: 'WEEKDAY',
          start_time: '09:00',
          end_time: '18:00',
          slot_minutes: 60,
        },
      };
  }
}

// Zod 검증식: 퀵 온보딩 폼 기본 스키마
export const QuickSetupFormZodSchema = z.object({
  name: z.string().min(1, '사업장 이름을 입력해주세요.'),
  industry: z.string().min(1, '업종을 선택해주세요.'),
  locker_count: z.number().int().positive().optional(),
  totalLockerCount: z.number().int().positive().optional(),
  roles: z
    .array(
      z.object({
        name: z.string().min(1),
        rank_order: z.number().int(),
        permissions: z.array(z.string()),
      })
    )
    .optional(),
  rooms: z
    .array(
      z.object({
        name: z.string().min(1),
        capacity: z.number().int().positive().optional(),
      })
    )
    .optional(),
  operating_hours: z
    .object({
      day_type: z.string(),
      start_time: z.string(),
      end_time: z.string(),
      slot_minutes: z.number().int().positive(),
    })
    .optional(),
});

// 순수 함수: 기본값과 폼 입력값을 병합하여 RPC payload JSONB 빌드
export function buildPresetPayload(
  industry: string,
  formValues: Record<string, any> = {}
): PresetPayload {
  const normKey = normalizeIndustryKey(industry);
  const defaults = getStandardPresetsForIndustry(normKey);

  // 1. Roles 병합 (사용자 지정 roles 우선)
  const roles: PresetRoleConfig[] =
    Array.isArray(formValues.roles) && formValues.roles.length > 0
      ? formValues.roles
      : defaults.roles;

  // 2. Rooms 병합 (사용자 지정 rooms 우선)
  const rooms: PresetRoomConfig[] | undefined =
    Array.isArray(formValues.rooms) && formValues.rooms.length > 0
      ? formValues.rooms
      : defaults.rooms;

  // 3. 락커 수량 오버라이드 병합
  let locker_count: number | undefined;
  if (typeof formValues.locker_count === 'number') {
    locker_count = formValues.locker_count;
  } else if (typeof formValues.totalLockerCount === 'number') {
    locker_count = formValues.totalLockerCount;
  } else if (defaults.locker_count !== undefined) {
    locker_count = defaults.locker_count;
  }

  // 4. 운영 시간 병합
  const operating_hours: PresetOperatingHoursConfig = {
    day_type: formValues.operating_hours?.day_type || defaults.operating_hours.day_type,
    start_time: formValues.operating_hours?.start_time || defaults.operating_hours.start_time,
    end_time: formValues.operating_hours?.end_time || defaults.operating_hours.end_time,
    slot_minutes:
      Number(formValues.operating_hours?.slot_minutes) || defaults.operating_hours.slot_minutes,
  };

  const payload: PresetPayload = {
    industry: normKey,
    roles,
    operating_hours,
    ...formValues,
  };

  if (rooms) {
    payload.rooms = rooms;
  }
  if (locker_count !== undefined) {
    payload.locker_count = locker_count;
  }

  return payload;
}
