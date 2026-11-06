/**
 * 직원 초대 토큰 발급 — onboarding_tokens + role_id 페이로드.
 * claim_staff_invite 가 payload.role_id 로 custom_role_id 를 연결한다.
 */

import { getCoreClient } from '@/lib/supabase';

export type IssueStaffInviteTokenInput = {
  organizationId: string;
  organizationName: string;
  roleId: string;
  roleName: string;
  /** 만료(초). 기본 1시간(이메일 전달용). QR 모달은 5분. */
  ttlSeconds?: number;
};

export type IssueStaffInviteTokenResult = {
  id: string;
  claimToken: string;
  expiresAt: string;
};

export async function issueStaffInviteToken(
  input: IssueStaffInviteTokenInput
): Promise<IssueStaffInviteTokenResult> {
  const ttl = input.ttlSeconds ?? 60 * 60;
  const rawToken =
    'STF-' + crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  const { data, error } = await getCoreClient()
    .from('onboarding_tokens')
    .insert({
      tenant_id: input.organizationId,
      issuer_type: 'STORE_STAFF_INVITE',
      claim_token: rawToken,
      payload: {
        role_id: input.roleId,
        role_name: input.roleName,
        organization_name: input.organizationName,
      },
      expires_at: expiresAt,
      is_used: false,
    })
    .select('id, claim_token, expires_at')
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('초대 토큰 생성에 실패했습니다.');

  return {
    id: data.id,
    claimToken: data.claim_token,
    expiresAt: data.expires_at,
  };
}
