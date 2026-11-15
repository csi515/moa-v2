/**
 * Moa-v2 Visual DevTools Sandbox 타입 정의
 */

export type SandboxRole = 'owner' | 'admin' | 'staff' | 'customer' | 'parent';

export interface SandboxRoleOption {
  role: SandboxRole;
  label: string;
  badgeColor: string;
}

export interface SandboxIndustryOption {
  code: string;
  name: string;
  customerTerm: string;
}

export interface DevToolsSandboxState {
  isOpen: boolean;
  isOfflineSimulated: boolean;
  isThrottlingEnabled: boolean;
  activeRole: SandboxRole;
  activeIndustry: string;
}
