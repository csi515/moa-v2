/**
 * 동적 직급 RBAC 권한 카탈로그 SSOT.
 * RolePermissionMatrix·MemberList·권한 사전 UI가 이 정의를 공유한다.
 */
import {
  ROLE_PERMISSION_KEYS,
  type RolePermissionKey,
  type RolePermissionMap,
} from './permissions';
import { isPermissionKeyVisible } from './permissionVisibility';

export type PermissionCatalogGroupId =
  | 'ops'
  | 'finance'
  | 'hr_rbac'
  | 'facilities'
  | 'intranet';

export type PermissionCatalogEntry = {
  key: RolePermissionKey;
  label: string;
  group: PermissionCatalogGroupId;
  description: string;
  /** 매트릭스에서 숨김(alias 중복 키) */
  hideInMatrix?: boolean;
};

export const PERMISSION_GROUP_TITLES: Record<PermissionCatalogGroupId, string> = {
  ops: '출결 및 수업 운영',
  finance: '재무 및 매출 장부 (사업주 전용)',
  hr_rbac: '매장 운영 및 인사/권한 위임',
  facilities: '공용 자원 및 시설/공간 관리',
  intranet: '사내 인트라넷·복지',
};

/** 직급 매트릭스·위임 grants로 열 수 없는 재무 관련 키 */
export const OWNER_ONLY_ROLE_PERMISSION_KEYS: readonly RolePermissionKey[] = [
  'billing_invoices',
  'statistics',
] as const;

export const PERMISSION_CATALOG: readonly PermissionCatalogEntry[] = [
  {
    key: 'attendance',
    label: '출결 체크',
    group: 'ops',
    description: '출석·입퇴실 기록 조회 및 체크',
  },
  {
    key: 'booking',
    label: '시간표/예약 관리',
    group: 'ops',
    description: '예약 슬롯·캘린더 생성 및 변경',
  },
  {
    key: 'passes',
    label: '이용권 확인',
    group: 'ops',
    description: '이용권 잔여·유효성 확인',
  },
  {
    key: 'billing_invoices',
    label: '수납/미납 장부 조회',
    group: 'finance',
    description: '사업주 전용 — 직급으로 위임할 수 없습니다',
    hideInMatrix: true,
  },
  {
    key: 'statistics',
    label: '매출 통계',
    group: 'finance',
    description: '사업주 전용 — 직급으로 위임할 수 없습니다',
    hideInMatrix: true,
  },
  {
    key: 'members:manage',
    label: '직원 목록 및 정보 관리',
    group: 'hr_rbac',
    description: '사원 목록·프로필 조회 및 관리',
  },
  {
    key: 'members_manage',
    label: '직원 목록 관리 (별칭)',
    group: 'hr_rbac',
    description: 'members:manage와 동일 (구버전 호환)',
    hideInMatrix: true,
  },
  {
    key: 'roles:assign',
    label: '직급/권한 부여 및 회수',
    group: 'hr_rbac',
    description: '타 직원에게 직급을 부여하거나 회수 (권한 상승 방지 적용)',
  },
  {
    key: 'ownership:transfer',
    label: '대표이사(CEO) 변경·소유권 이전',
    group: 'hr_rbac',
    description: '이사회/인사 전용 소유권 이전 대행',
  },
  {
    key: 'policies',
    label: '매장 내규 관리',
    group: 'hr_rbac',
    description: '사규·내규 문서 관리',
  },
  {
    key: 'seat_room',
    label: '좌석 및 회의실 공간 관리',
    group: 'facilities',
    description: '좌석·룸 등록 및 점유 관리',
  },
  {
    key: 'rental_equipment',
    label: '대여 장비 및 비품 관리',
    group: 'facilities',
    description: '장비 대여·반납 대장',
  },
  {
    key: 'resources_manage',
    label: '공용차량·자원 등록/수정',
    group: 'facilities',
    description: '공용 자원 카탈로그 등록·수정',
  },
  {
    key: 'resources:manage',
    label: '공용자원 카탈로그 (별칭)',
    group: 'facilities',
    description: 'resources_manage와 동일',
    hideInMatrix: true,
  },
  {
    key: 'grievances_manage',
    label: '노경 건의 전체 조회·처리',
    group: 'facilities',
    description: '사내 건의함 전체 열람 및 처리',
  },
  {
    key: 'feedbacks:read_all',
    label: '사내 건의 전체 열람 (별칭)',
    group: 'facilities',
    description: 'grievances_manage와 동일',
    hideInMatrix: true,
  },
  {
    key: 'shuttle:manage',
    label: '통근 셔틀 노선·명부 관리',
    group: 'intranet',
    description: '셔틀 노선·정류장·고정 탑승 명부 관리',
  },
  {
    key: 'volunteer:manage',
    label: '봉사활동 게시·모집 관리',
    group: 'intranet',
    description: '사내 봉사활동 종류·모집인원 게시 및 마감',
  },
  {
    key: 'meal_survey:manage',
    label: '식수인원 조사 관리',
    group: 'intranet',
    description: '식사 슬롯 설정 및 전체 식수 현황 조회',
  },
  {
    key: 'office_supply_request:manage',
    label: '사무용품 취합 관리',
    group: 'intranet',
    description: '구매 가능 품목·월별 마감 캠페인·부서별 취합',
  },
  {
    key: 'rnd_portal:access',
    label: '연구소 포털 접속',
    group: 'intranet',
    description: '연구소 통합 포털(과제·장비·특허) 진입. 일반 과제 조회와 별도',
  },
] as const;

const BY_KEY = new Map<RolePermissionKey, PermissionCatalogEntry>(
  PERMISSION_CATALOG.map((entry) => [entry.key, entry])
);

export function getPermissionLabel(key: string): string {
  const entry = BY_KEY.get(key as RolePermissionKey);
  return entry?.label ?? key;
}

export function getPermissionDescription(key: string): string {
  const entry = BY_KEY.get(key as RolePermissionKey);
  return entry?.description ?? '';
}

export function listEnabledPermissionLabels(
  permissions: RolePermissionMap | Record<string, boolean> | null | undefined,
  activeCapIds?: readonly string[] | null
): { key: string; label: string }[] {
  if (!permissions) return [];
  const seen = new Set<string>();
  const out: { key: string; label: string }[] = [];
  for (const key of ROLE_PERMISSION_KEYS) {
    if (!permissions[key]) continue;
    const entry = BY_KEY.get(key);
    if (entry?.hideInMatrix) continue;
    if (activeCapIds !== undefined && activeCapIds !== null) {
      if (!isPermissionKeyVisible(key, activeCapIds)) continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, label: entry?.label ?? key });
  }
  return out;
}

export function getPermissionCatalogGroupsForMatrix(
  activeCapIds?: readonly string[] | null
): {
  title: string;
  items: { key: RolePermissionKey; label: string }[];
}[] {
  const order: PermissionCatalogGroupId[] = [
    'ops',
    'finance',
    'hr_rbac',
    'facilities',
    'intranet',
  ];
  return order
    .map((groupId) => ({
      title: PERMISSION_GROUP_TITLES[groupId],
      items: PERMISSION_CATALOG.filter((entry) => {
        if (entry.group !== groupId || entry.hideInMatrix) return false;
        if (activeCapIds === undefined || activeCapIds === null) return true;
        return isPermissionKeyVisible(entry.key, activeCapIds);
      }).map((entry) => ({ key: entry.key, label: entry.label })),
    }))
    .filter((group) => group.items.length > 0);
}

export function getPermissionDictionaryGroups(
  activeCapIds?: readonly string[] | null
): {
  title: string;
  items: { key: RolePermissionKey; label: string; description: string }[];
}[] {
  const order: PermissionCatalogGroupId[] = [
    'ops',
    'finance',
    'hr_rbac',
    'facilities',
    'intranet',
  ];
  return order
    .map((groupId) => ({
      title: PERMISSION_GROUP_TITLES[groupId],
      items: PERMISSION_CATALOG.filter((entry) => {
        if (entry.group !== groupId || entry.hideInMatrix) return false;
        if (activeCapIds === undefined || activeCapIds === null) return true;
        return isPermissionKeyVisible(entry.key, activeCapIds);
      }).map((entry) => ({
        key: entry.key,
        label: entry.label,
        description: entry.description,
      })),
    }))
    .filter((group) => group.items.length > 0);
}

/** ROLE_PERMISSION_KEYS와 카탈로그 1:1 커버리지 검증용 */
export function listCatalogKeys(): RolePermissionKey[] {
  return PERMISSION_CATALOG.map((entry) => entry.key);
}
