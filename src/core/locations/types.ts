import type { AuthorizationGrant } from '@/core/authorization';
import type { MemberRole } from '@/lib/supabase';

/** 사업자(Organization) 아래 실제 영업 지점. 기존 organization_id를 대체하지 않는다. */
export const DEFAULT_LOCATION_CODE = 'main';
export const DEFAULT_LOCATION_SLUG = 'main';
/** location.timezone 이 없거나 유효하지 않을 때 business date 기본값 */
export const DEFAULT_LOCATION_TIMEZONE = 'Asia/Seoul';

/** 향후 Availability hours/override 가 Location 에 붙는 연결점 */
export const LOCATION_HOURS_SOURCE = 'availability';

export type Location = {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  slug: string;
  address?: string;
  phone?: string;
  timezone: string;
  active: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type UpsertLocationInput = {
  id?: string;
  name: string;
  code?: string;
  slug?: string;
  address?: string;
  phone?: string;
  timezone?: string;
  metadata?: Record<string, unknown>;
};

export type LocationListQuery = {
  activeOnly?: boolean;
  limit?: number;
};

/** 신규 도메인이 organization + 선택적 location 을 같이 쓸 때 */
export type OrganizationLocationScope = {
  organizationId: string;
  locationId?: string | null;
};

/** location 선택/목록 필터. selectedMembership.currentRole + grant 기준. */
export type LocationAccessContext = {
  organizationId: string;
  /** Organization membership role. AppContext.currentUser.role을 쓰지 않는다. */
  role: MemberRole | string | null;
  extraGrants?: readonly AuthorizationGrant[] | null;
};

/** UI 선택이 아니라 현재 조직 catalog로 검증된 실행 location. */
export type TrustedLocationSelection = {
  organizationId: string;
  locationId: string | null;
  locations: readonly Location[];
};
