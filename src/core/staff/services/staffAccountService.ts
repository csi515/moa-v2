import { getPublicAppBaseUrl } from '@/core/platform/appBaseUrl';
import { getCoreClient } from '../../../lib/supabase';

export type StaffAccountStatus = 'none' | 'invited' | 'connected';

export interface StaffAccountStatusItem {
  staffId: string;
  status: StaffAccountStatus;
  email: string | null;
  invitedAt: string | null;
  /** 관리자에게만 제공 */
  inviteExpiresAt?: string | null;
  inviteExpired?: boolean;
  /** false 면 토큰 도입 전 초대 → 재발급 필요 */
  inviteHasCode?: boolean;
}

export interface InviteStaffResult {
  status: StaffAccountStatus;
  staffId: string;
  userId?: string;
  invitationId?: string;
  email?: string;
  /** 1회용 초대 코드 (발급 직후에만 확인 가능, 서버는 해시만 저장) */
  token?: string;
  expiresAt?: string;
  organizationName?: string;
  staffName?: string;
}

export interface StaffInvitePreview {
  organizationName: string;
  staffName: string;
  expiresAt: string | null;
}

export interface AcceptStaffInviteResult {
  organizationId: string;
  organizationName: string;
  staffId: string;
  staffName: string;
}

/** 초대 코드 정규화: 공백·하이픈 제거 + 대문자 */
export function normalizeStaffInviteCode(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

/** 초대 코드 표시용 (4자리씩) */
export function formatStaffInviteCode(code: string): string {
  return normalizeStaffInviteCode(code).replace(/(.{4})(?=.)/g, '$1-');
}

/** 교직원 초대 링크 (기존 staff_link 딥링크 처리 재사용) */
export function buildStaffInviteUrl(token: string, baseUrl?: string): string {
  // 네이티브 앱에서는 VITE_APP_URL (WebView origin 은 localhost)
  const base = baseUrl ?? getPublicAppBaseUrl();
  return `${base.replace(/\/$/, '')}/?staff_link=${encodeURIComponent(normalizeStaffInviteCode(token))}`;
}

function staffInviteErrorMessage(error: { message?: string }): Error {
  const msg = error.message ?? '';
  if (msg.includes('Invalid or expired invitation code')) {
    return new Error('초대 코드가 유효하지 않거나 만료되었습니다. 관리자에게 재발급을 요청해 주세요.');
  }
  if (msg.includes('Authentication required')) {
    return new Error('로그인 후 다시 시도해 주세요.');
  }
  return new Error('초대 수락 중 오류가 발생했습니다.');
}

/** 코드를 소비하지 않고 사업장·교직원 이름 확인 */
export async function previewStaffInvite(code: string): Promise<StaffInvitePreview> {
  const { data, error } = await getCoreClient().rpc('preview_staff_invite', {
    p_token: normalizeStaffInviteCode(code),
  });
  if (error) throw staffInviteErrorMessage(error);
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    organizationName: String(raw.organization_name ?? ''),
    staffName: String(raw.staff_name ?? ''),
    expiresAt: raw.expires_at ? String(raw.expires_at) : null,
  };
}

/** 로그인한 사용자가 초대 코드를 명시적으로 수락 → 서버 검증 후 멤버 추가 */
export async function acceptStaffInvite(code: string): Promise<AcceptStaffInviteResult> {
  const { data, error } = await getCoreClient().rpc('accept_staff_invite', {
    p_token: normalizeStaffInviteCode(code),
  });
  if (error) throw staffInviteErrorMessage(error);
  const raw = (data ?? {}) as Record<string, unknown>;
  return {
    organizationId: String(raw.organization_id ?? ''),
    organizationName: String(raw.organization_name ?? ''),
    staffId: String(raw.staff_id ?? ''),
    staffName: String(raw.staff_name ?? ''),
  };
}

export interface ConnectStaffResult {
  connected: number;
  memberships: Array<{ organization_id: string; staff_id: string }>;
}

/**
 * 레거시: 로그인 시 pending 초대 자동 연결.
 * 2026-09-28 hotfix 이후 서버에서 no-op (connected: 0). 초대는 코드로 명시적 수락.
 */
export async function connectStaffOnLogin(): Promise<ConnectStaffResult> {
  const { data, error } = await getCoreClient().rpc('connect_staff_on_login');
  if (error) throw error;
  const result = data as {
    connected: number;
    memberships: Array<{ organization_id: string; staff_id: string }>;
  };
  return {
    connected: result.connected ?? 0,
    memberships: result.memberships ?? [],
  };
}

/** 강사 계정 초대 — 1회용 초대 코드 발급 (재호출 시 재발급, 이전 코드 무효) */
export async function inviteStaffMember(
  organizationId: string,
  staffId: string,
  email: string
): Promise<InviteStaffResult> {
  const { data, error } = await getCoreClient().rpc('invite_staff_member', {
    p_org_id: organizationId,
    p_staff_id: staffId,
    p_email: email.trim(),
  });
  if (error) throw error;

  const result = data as {
    status: StaffAccountStatus;
    staff_id: string;
    user_id?: string;
    invitation_id?: string;
    email?: string;
    token?: string;
    expires_at?: string;
    organization_name?: string;
    staff_name?: string;
  };

  return {
    status: result.status,
    staffId: result.staff_id,
    userId: result.user_id,
    invitationId: result.invitation_id,
    email: result.email,
    token: result.token,
    expiresAt: result.expires_at,
    organizationName: result.organization_name,
    staffName: result.staff_name,
  };
}

/** pending 초대 취소 */
export async function revokeStaffInvitation(
  organizationId: string,
  staffId: string
): Promise<void> {
  const { error } = await getCoreClient().rpc('revoke_staff_invitation', {
    p_org_id: organizationId,
    p_staff_id: staffId,
  });
  if (error) throw error;
}

/** 조직 내 강사별 계정 연결 상태 조회 */
export async function fetchStaffAccountStatuses(
  organizationId: string
): Promise<StaffAccountStatusItem[]> {
  const { data, error } = await getCoreClient().rpc('get_staff_account_statuses', {
    p_org_id: organizationId,
  });
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    staff_id: string;
    status: StaffAccountStatus;
    email: string | null;
    invited_at: string | null;
    invite_expires_at?: string | null;
    invite_expired?: boolean;
    invite_has_code?: boolean;
  }>;

  return rows.map((row) => ({
    staffId: row.staff_id,
    status: row.status,
    email: row.email,
    invitedAt: row.invited_at,
    inviteExpiresAt: row.invite_expires_at ?? null,
    inviteExpired: Boolean(row.invite_expired),
    inviteHasCode: row.invite_has_code ?? true,
  }));
}
