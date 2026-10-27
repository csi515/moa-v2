import {
  DEFAULT_CREATE_INDUSTRY_TYPE,
  isBlankIndustryInput,
  resolveIndustryCategoryForCreate,
  type IndustryType,
} from '@/core/industry/types';
import { getOwnerLabel } from '@/core/industry/industryUi';
import { getTerminologyDictionary } from '@/core/terminology/dictionaries';
import {
  formatOrganizationAddress,
  normalizeCreateOrganizationAddress,
  type OrganizationAddressValue,
} from '@/core/address';
import type { AcademySettings } from '@/types';
import { StorageService } from '@/services/storage';
import { locationService } from '@/core/locations/locationService';
import { userFacingErrorMessage } from '@/shared/errors/userFacingError';
import { getCoreClient } from '../../../lib/supabase';
import type { MemberRole, Organization } from '../../../lib/supabase';
import {
  prepareCreateOrganizationInput,
  resolveCreateBusinessPhone,
  resolveCreateBusinessRegistrationNumber,
} from './createOrganizationInput';

export {
  prepareCreateOrganizationInput,
  resolveCreateBusinessPhone,
  resolveCreateBusinessRegistrationNumber,
} from './createOrganizationInput';

const ORG_STORAGE_KEY = 'moa_current_organization_id';

/** 사업장은 만들어졌지만 기본 지점 준비가 실패한 경우 */
export class OrganizationLocationSetupError extends Error {
  readonly organizationId: string;

  constructor(organizationId: string, cause: unknown) {
    super(`기본 지점을 준비하지 못했습니다. ${userFacingErrorMessage(cause)}`);
    this.name = 'OrganizationLocationSetupError';
    this.organizationId = organizationId;
  }
}

export async function ensureOrganizationDefaultLocation(organizationId: string): Promise<string> {
  return locationService.ensureDefault(organizationId);
}

export interface CreateOrganizationOptions {
  name: string;
  businessRegistrationNumber?: string;
  representativeName: string;
  businessPhone?: string;
  businessAddress: string;
  industryCategory: string;
  industryType?: IndustryType | string;
  settings?: Partial<AcademySettings>;
  /** 구조화 주소 (선택) — Juso 필드만 저장 */
  addressParts?: OrganizationAddressValue;
}

/** 가입·마법사 폼 필드 → createOrganization 옵션 매핑 */
export type CreateOrganizationFormExtras = Partial<AcademySettings> & {
  directorName?: string;
  representativeName?: string;
  phone?: string;
  address?: string;
  businessNumber?: string;
  industryCategory?: string;
  addressParts?: OrganizationAddressValue;
};

export function toCreateOrganizationOptions(
  name: string,
  industryType: IndustryType | string = DEFAULT_CREATE_INDUSTRY_TYPE,
  extras?: CreateOrganizationFormExtras
): CreateOrganizationOptions {
  const addressParts = extras?.addressParts;
  const formatted = normalizeCreateOrganizationAddress(
    addressParts,
    extras?.address
  );
  const representativeName =
    extras?.representativeName?.trim() ||
    extras?.directorName?.trim() ||
    StorageService.getActiveUser().name.trim() ||
    name;

  return {
    name,
    industryType,
    settings: {
      ...extras,
      directorName: representativeName,
    },
    businessRegistrationNumber: resolveCreateBusinessRegistrationNumber(
      extras?.businessNumber
    ),
    representativeName,
    businessPhone: resolveCreateBusinessPhone(extras?.phone) ?? undefined,
    businessAddress: formatted,
    industryCategory: resolveIndustryCategoryForCreate(
      industryType,
      extras?.industryCategory
    ),
    addressParts,
  };
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  role: MemberRole;
  staffId: string | null;
  parentCustomerId: string | null;
  organization: Organization;
  isCurrentContext?: boolean;
}

export function getStoredOrganizationId(): string | null {
  return localStorage.getItem(ORG_STORAGE_KEY);
}

export function storeOrganizationId(organizationId: string): void {
  localStorage.setItem(ORG_STORAGE_KEY, organizationId);
}

export function clearStoredOrganizationId(): void {
  localStorage.removeItem(ORG_STORAGE_KEY);
}

export async function fetchUserOrganizations(userId: string): Promise<OrganizationMembership[]> {
  try {
    const { data, error } = await getCoreClient()
      .from('organization_members')
      .select(
        `
          id,
          role,
          organization_id,
          staff_id,
          parent_customer_id,
          organizations (
            id,
            name,
            industry_type,
            slug,
            settings,
            is_active,
            public_code,
            postal,
            sido,
            sigungu,
            dong,
            jibun,
            road_address,
            address_detail,
            created_at,
            updated_at
          )
        `
      )
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.warn('[org] fetchUserOrganizations joined query failed, trying decoupled query:', error.message || error);
      const { data: members, error: memError } = await getCoreClient()
        .from('organization_members')
        .select('id, role, organization_id, staff_id, parent_customer_id')
        .eq('user_id', userId)
        .eq('is_active', true);

      if (memError) throw memError;
      if (!members || members.length === 0) {
        return [];
      }

      const orgIds = members.map((m) => m.organization_id).filter(Boolean);
      if (orgIds.length === 0) return [];

      const { data: orgs, error: orgsError } = await getCoreClient()
        .from('organizations')
        .select('*')
        .in('id', orgIds)
        .eq('is_active', true);

      if (orgsError || !orgs) {
        console.warn('[org] fetch organizations by ids failed:', orgsError?.message || orgsError);
        return [];
      }

      const orgMap = new Map((orgs ?? []).map((o: any) => [o.id, o]));
      return members
        .filter((m) => orgMap.has(m.organization_id))
        .map((m) => ({
          id: m.id,
          organizationId: m.organization_id,
          role: m.role as MemberRole,
          staffId: m.staff_id ?? null,
          parentCustomerId: m.parent_customer_id ?? null,
          organization: orgMap.get(m.organization_id) as Organization,
        }));
    }

    return (data ?? [])
      .filter((row) => row.organizations)
      .map((row) => ({
        id: row.id,
        organizationId: row.organization_id,
        role: row.role as MemberRole,
        staffId: row.staff_id ?? null,
        parentCustomerId: row.parent_customer_id ?? null,
        organization: row.organizations as Organization,
      }));
  } catch (err) {
    console.warn('[org] fetchUserOrganizations exception:', err);
    throw err;
  }
}

/**
 * Phase 1: 새 RPC를 사용하여 모든 멤버십과 활성 컨텍스트 정보를 함께 가져옴
 * RPC 실패 시 organization_members 직접 조회로 폴백하며, 모든 예외 상황 시 안전하게 빈 목록 반환
 */
export async function fetchUserMembershipsWithContext(): Promise<OrganizationMembership[]> {
  let rpcFailed = false;
  let lastError: any = null;

  try {
    const { data, error } = await getCoreClient().rpc('get_user_memberships' as never);

    if (!error && data) {
      return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
        id: String(row.membership_id),
        organizationId: String(row.organization_id),
        role: row.role as MemberRole,
        staffId: row.staff_id ? String(row.staff_id) : null,
        parentCustomerId: row.parent_customer_id ? String(row.parent_customer_id) : null,
        isCurrentContext: Boolean(row.is_current_context),
        organization: {
          id: String(row.organization_id),
          name: String(row.organization_name ?? ''),
          industry_type: String(row.organization_industry_type ?? ''),
          slug: row.organization_slug ? String(row.organization_slug) : null,
          settings: row.organization_settings ?? {},
          is_active: Boolean(row.organization_is_active),
          public_code: String(row.organization_public_code ?? ''),
          created_at: '',
          updated_at: '',
        } as Organization,
      }));
    }

    rpcFailed = true;
    lastError = error;
    console.warn(
      '[org] get_user_memberships failed, falling back to direct query',
      error?.message
    );
  } catch (rpcErr) {
    rpcFailed = true;
    lastError = rpcErr;
    console.warn('[org] get_user_memberships RPC exception, falling back:', rpcErr);
  }

  try {
    const {
      data: { user },
      error: userErr,
    } = await getCoreClient().auth.getUser();
    if (userErr) throw userErr;
    if (!user?.id) {
      if (rpcFailed && lastError) {
        throw new Error(String(lastError?.message || '사업장 정보를 불러오지 못했습니다.'));
      }
      return [];
    }
    return await fetchUserOrganizations(user.id);
  } catch (directErr) {
    console.warn('[org] fetchUserOrganizations fallback failed:', directErr);
    if (rpcFailed) {
      throw (directErr instanceof Error ? directErr : new Error(String(lastError?.message || directErr || '사업장 정보를 불러오지 못했습니다.')));
    }
    return [];
  }
}

/**
 * Phase 1: 활성 멤버십 컨텍스트 설정
 */
export async function setActiveMembership(membershipId: string): Promise<void> {
  const { error } = await getCoreClient().rpc('set_active_membership' as any, {
    p_membership_id: membershipId,
  });

  if (error) throw error;
}

/**
 * Phase 1: 활성 멤버십 컨텍스트 클리어
 */
export async function clearActiveMembership(): Promise<void> {
  const { error } = await getCoreClient().rpc('clear_active_membership' as any);

  if (error) throw error;
}

export async function createOrganization(
  nameOrOptions: string | CreateOrganizationOptions,
  industryType = DEFAULT_CREATE_INDUSTRY_TYPE,
  settings?: Partial<AcademySettings>
): Promise<string> {
  // Phase 3: Enhanced with required fields validation
  if (typeof nameOrOptions === 'string') {
    throw new Error('조직 생성 시 필수 정보를 모두 입력해야 합니다.');
  }

  const options: CreateOrganizationOptions = nameOrOptions;
  const prepared = prepareCreateOrganizationInput(options);

  const resolvedIndustryType = isBlankIndustryInput(options.industryType)
    ? DEFAULT_CREATE_INDUSTRY_TYPE
    : String(options.industryType).trim();
  const slug = prepared.name
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || `org-${Date.now()}`;

  const parts = options.addressParts;
  const { data, error } = await getCoreClient().rpc('create_organization', {
    p_name: prepared.name,
    p_business_registration_number: prepared.businessRegistrationNumber ?? null,
    p_representative_name: prepared.representativeName,
    p_business_phone: prepared.businessPhone,
    p_business_address: prepared.businessAddress,
    p_industry_category: prepared.industryCategory,
    p_industry_type: resolvedIndustryType,
    p_slug: slug,
    p_settings: (options.settings ?? {}) as Record<string, unknown>,
    p_postal: parts?.postal ?? null,
    p_sido: parts?.sido ?? null,
    p_sigungu: parts?.sigungu ?? null,
    p_dong: parts?.dong ?? null,
    p_jibun: parts?.jibun ?? null,
    p_road_address: parts?.roadAddress?.trim() || null,
    p_address_detail: parts?.addressDetail?.trim() || null,
  });

  if (error) throw error;
  if (!data) throw new Error('사업장 생성에 실패했습니다.');

  const orgId = data as string;
  try {
    await ensureOrganizationDefaultLocation(orgId);
  } catch (error) {
    throw new OrganizationLocationSetupError(orgId, error);
  }
  return orgId;
}

/** org 멤버 role 라벨 (업종별 용어 사전 연동) */
export function getRoleLabel(
  role: MemberRole,
  industry?: IndustryType | string | null
): string {
  if (!industry) {
    const defaultLabels: Record<MemberRole, string> = {
      owner: '대표',
      admin: '관리자',
      manager: '매니저',
      staff: '강사',
      parent: '학부모',
      instructor: '강사',
      member: '회원',
      customer: '고객',
      guardian: '보호자',
    };
    return defaultLabels[role];
  }

  const dict = getTerminologyDictionary(industry);
  const labels: Record<MemberRole, string> = {
    owner: dict.facility?.owner || getOwnerLabel(industry),
    admin: '관리자',
    manager: '매니저',
    staff: dict.staff?.singular || '직원',
    parent: dict.contact?.singular || '학부모',
    instructor: dict.staff?.singular || '강사',
    member: dict.customer?.singular || '회원',
    customer: dict.customer?.singular || '고객',
    guardian: dict.contact?.singular || '보호자',
  };
  return labels[role];
}

/** 조직 삭제 (소유자만 가능) */
export async function deleteOrganization(organizationId: string): Promise<void> {
  const { data, error } = await getCoreClient().rpc('delete_organization' as any, {
    p_organization_id: organizationId,
  });

  if (error) throw error;
  if (!data) throw new Error('조직 삭제에 실패했습니다.');
}

/** 조직 이름·설정·구조화 주소 업데이트 */
export async function updateOrganization(
  organizationId: string,
  updates: {
    name?: string;
    settings?: Partial<AcademySettings>;
    addressParts?: OrganizationAddressValue;
  }
): Promise<void> {
  const payload: Record<string, unknown> = {};

  if (updates.name !== undefined) {
    payload.name = updates.name;
  }

  if (updates.addressParts) {
    const parts = updates.addressParts;
    const display = formatOrganizationAddress(parts);
    payload.postal = parts.postal;
    payload.sido = parts.sido;
    payload.sigungu = parts.sigungu;
    payload.dong = parts.dong;
    payload.jibun = parts.jibun;
    payload.road_address = parts.roadAddress.trim() || null;
    payload.address_detail = parts.addressDetail.trim() || null;

    const { data: currentOrg, error: fetchError } = await getCoreClient()
      .from('organizations')
      .select('settings')
      .eq('id', organizationId)
      .single();

    if (fetchError) throw fetchError;

    const currentSettings = (currentOrg?.settings as Record<string, unknown>) ?? {};
    const mergedSettings: Record<string, unknown> = {
      ...currentSettings,
      ...(updates.settings ?? {}),
    };
    // 도로명 미선택 시 레거시 businessAddress/address 를 비우지 않음
    if (display) {
      mergedSettings.address = display;
      mergedSettings.businessAddress = display;
    } else if (updates.settings?.address) {
      mergedSettings.address = updates.settings.address;
      mergedSettings.businessAddress = updates.settings.address;
    }
    payload.settings = mergedSettings;
  } else if (updates.settings !== undefined) {
    const { data: currentOrg, error: fetchError } = await getCoreClient()
      .from('organizations')
      .select('settings')
      .eq('id', organizationId)
      .single();

    if (fetchError) throw fetchError;

    const currentSettings = (currentOrg?.settings as Record<string, unknown>) ?? {};
    payload.settings = { ...currentSettings, ...updates.settings };
  }

  const { error } = await getCoreClient()
    .from('organizations')
    // Supabase Update 타입이 과도하게 좁혀져 payload(Record)를 직접 받지 못함
    .update(payload as never)
    .eq('id', organizationId);

  if (error) throw error;
}

/** 조직 구조화 주소 조회 (편집 화면 hydrate용) */
export async function fetchOrganizationAddress(
  organizationId: string
): Promise<OrganizationAddressValue & { legacyAddress: string }> {
  const { data, error } = await getCoreClient()
    .from('organizations')
    .select('postal, sido, sigungu, dong, jibun, road_address, address_detail, settings')
    .eq('id', organizationId)
    .single();

  if (error) throw error;

  const settings = (data?.settings as Record<string, unknown>) ?? {};
  const legacyAddress = String(
    settings.address || settings.businessAddress || ''
  );

  return {
    roadAddress: String(data?.road_address ?? ''),
    addressDetail: String(data?.address_detail ?? ''),
    postal: data?.postal ? String(data.postal) : null,
    sido: data?.sido ? String(data.sido) : null,
    sigungu: data?.sigungu ? String(data.sigungu) : null,
    dong: data?.dong ? String(data.dong) : null,
    jibun: data?.jibun ? String(data.jibun) : null,
    legacyAddress,
  };
}

/**
 * CEO 대표자 소유권 원자적 이전 RPC 호출 함수
 * - 신임 대표자에게 role='owner' 승격
 * - 전임 대표자(호출자)는 role='member'로 전환 및 세션 즉시 파기 (token_version + 1)
 * - 불변 감사 로그(core.audit_logs) 적재
 */
export async function transferOrganizationOwnership(
  newOwnerMemberId: string,
  reason: string
): Promise<void> {
  const client = getCoreClient();
  const { error } = await (client.rpc as any)('transfer_organization_ownership', {
    p_new_owner_member_id: newOwnerMemberId,
    p_reason: reason.trim(),
  });

  if (error) {
    throw new Error(userFacingErrorMessage(error) || error.message || '소유권 이전 처리에 실패했습니다.');
  }
}

export interface InitialDepartmentInput {
  name: string;
  code?: string;
}

/**
 * 기업/제조업 온보딩 시 다중 부서 초기 등록 함수
 */
export async function createInitialDepartments(
  organizationId: string,
  departments: InitialDepartmentInput[]
): Promise<void> {
  if (!organizationId || !departments || departments.length === 0) return;
  const client = getCoreClient();
  const rows = departments.map((d) => ({
    organization_id: organizationId,
    name: d.name.trim(),
    code: d.code?.trim() || null,
  }));

  const { error } = await client.from('departments').insert(rows as any);
  if (error) {
    throw new Error(userFacingErrorMessage(error) || error.message || '부서 초기 등록에 실패했습니다.');
  }
}


