/** 앱 푸시 전용 — 카카오·SMS 사용 안 함 */
export type PushPlatform = 'ios' | 'android' | 'web';

export interface PushDeviceToken {
  token: string;
  platform: PushPlatform;
  userId: string;
  organizationId?: string;
  updatedAt: string;
}

export interface AppPushPayload {
  title: string;
  body: string;
  organizationId?: string;
  studentId?: string;
  /** 학부모 포털 딥링크 탭 */
  portalTab?: string;
  type?: string;
}

export const PUSH_TOKEN_STORAGE_KEY = 'core_push_device_tokens_local';
export const PENDING_PORTAL_TAB_KEY = 'moa_pending_parent_portal_tab';
