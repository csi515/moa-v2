import { getCoreClient } from '@/lib/supabase';
import { getPublicAppBaseUrl } from '@/core/platform/appBaseUrl';

export interface ParentInviteLinkCode {
  token: string;
  studentName: string;
  customerId: string;
  expiresAt: string;
}

function parseLinkCodes(raw: unknown): ParentInviteLinkCode[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      token: String(row.token ?? ''),
      studentName: String(row.student_name ?? row.studentName ?? ''),
      customerId: String(row.customer_id ?? row.customerId ?? ''),
      expiresAt: String(row.expires_at ?? row.expiresAt ?? ''),
    };
  });
}

export function parseInviteLinkCodesFromResult(data: unknown): ParentInviteLinkCode[] {
  const root = (data ?? {}) as Record<string, unknown>;
  return parseLinkCodes(root.link_codes ?? root.linkCodes);
}

/**
 * 앱 공개 URL (QR·초대 링크).
 * 웹: 현재 origin 우선(배포 호스트와 맞춤). 네이티브(Capacitor): VITE_APP_URL
 * (WebView origin 은 localhost 라 외부에서 열 수 없음).
 */
export function getAppBaseUrl(): string {
  return getPublicAppBaseUrl();
}

export function buildParentInviteUrl(token: string): string {
  return `${getAppBaseUrl()}/?link=${encodeURIComponent(token)}`;
}

/**
 * 초대 메일 발송 요청 (Edge Function: send-parent-invitation)
 *
 * 보안: 수신자 이메일·이름·앱 URL 은 서버가 DB/환경변수에서 결정한다.
 * 클라이언트는 방금 발급된 연결 코드(token)와 교차검증용 ID 만 보낸다.
 */
export async function sendParentInvitationEmail(params: {
  organizationId: string;
  parentCustomerId: string;
  linkCodes: ParentInviteLinkCode[];
}): Promise<{ emailSent: boolean; message?: string }> {
  const tokens = params.linkCodes.map((c) => c.token).filter((t) => t.length > 0);
  if (tokens.length === 0) {
    return { emailSent: false };
  }

  const { data, error } = await getCoreClient().functions.invoke('send-parent-invitation', {
    body: {
      organizationId: params.organizationId,
      parentCustomerId: params.parentCustomerId,
      linkCodes: tokens,
    },
  });

  if (error) {
    return {
      emailSent: false,
      message: '초대 메일을 보내지 못했습니다. 연결 코드나 QR을 직접 전달해 주세요.',
    };
  }

  const result = (data ?? {}) as { email_sent?: boolean; message?: string };
  return {
    emailSent: Boolean(result.email_sent),
    message: result.message,
  };
}
