import type { ReactNode } from 'react';
import type { StaffWorkWindow, Teacher } from '@/types';
import type { ParentInviteLinkCode } from '@/core/parent/services/parentInviteService';

export type GuardianInviteProps = {
  studentId: string;
  studentName: string;
  isOpen: boolean;
  onClose: () => void;
};

export type ParentInviteResultProps = {
  parentName: string;
  email: string;
  organizationName: string;
  linkCodes: ParentInviteLinkCode[];
  emailSent: boolean;
  emailMessage?: string;
  contactLabel?: string;
  onClose: () => void;
};

export type StaffHoursFieldsProps = {
  teachers: Teacher[];
  windows: StaffWorkWindow[];
  onChange: (next: StaffWorkWindow[]) => void;
};

/** @deprecated Use GuardianInviteProps */
export type AcademyGuardianInviteProps = GuardianInviteProps;
/** @deprecated Use ParentInviteResultProps */
export type AcademyParentInviteResultProps = ParentInviteResultProps;
/** @deprecated Use StaffHoursFieldsProps */
export type AcademyStaffHoursFieldsProps = StaffHoursFieldsProps;

let guardianInviteRender: ((props: GuardianInviteProps) => ReactNode) | null = null;
let parentInviteResultRender: ((props: ParentInviteResultProps) => ReactNode) | null = null;
let staffHoursRender: ((props: StaffHoursFieldsProps) => ReactNode) | null = null;

export function registerGuardianInvite(
  render: (props: GuardianInviteProps) => ReactNode
): void {
  guardianInviteRender = render;
}

export function registerParentInviteResult(
  render: (props: ParentInviteResultProps) => ReactNode
): void {
  parentInviteResultRender = render;
}

export function registerStaffHoursFields(
  render: (props: StaffHoursFieldsProps) => ReactNode
): void {
  staffHoursRender = render;
}

export function renderGuardianInvite(props: GuardianInviteProps): ReactNode {
  return guardianInviteRender?.(props) ?? null;
}

export function renderParentInviteResult(props: ParentInviteResultProps): ReactNode {
  return parentInviteResultRender?.(props) ?? null;
}

export function renderStaffHoursFields(props: StaffHoursFieldsProps): ReactNode {
  return staffHoursRender?.(props) ?? null;
}

/** @deprecated Use registerGuardianInvite */
export const registerAcademyGuardianInvite = registerGuardianInvite;
/** @deprecated Use registerParentInviteResult */
export const registerAcademyParentInviteResult = registerParentInviteResult;
/** @deprecated Use registerStaffHoursFields */
export const registerAcademyStaffHoursFields = registerStaffHoursFields;

/** @deprecated Use renderGuardianInvite */
export const renderAcademyGuardianInvite = renderGuardianInvite;
/** @deprecated Use renderParentInviteResult */
export const renderAcademyParentInviteResult = renderParentInviteResult;
/** @deprecated Use renderStaffHoursFields */
export const renderAcademyStaffHoursFields = renderStaffHoursFields;

