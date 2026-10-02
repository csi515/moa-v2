import type { ReactNode } from 'react';
import type { StaffWorkWindow, Teacher } from '@/types';
import type { ParentInviteLinkCode } from '@/core/parent/services/parentInviteService';

export type AcademyGuardianInviteProps = {
  studentId: string;
  studentName: string;
  isOpen: boolean;
  onClose: () => void;
};

export type AcademyParentInviteResultProps = {
  parentName: string;
  email: string;
  organizationName: string;
  linkCodes: ParentInviteLinkCode[];
  emailSent: boolean;
  emailMessage?: string;
  contactLabel?: string;
  onClose: () => void;
};

export type AcademyStaffHoursFieldsProps = {
  teachers: Teacher[];
  windows: StaffWorkWindow[];
  onChange: (next: StaffWorkWindow[]) => void;
};

let guardianInviteRender: ((props: AcademyGuardianInviteProps) => ReactNode) | null = null;
let parentInviteResultRender: ((props: AcademyParentInviteResultProps) => ReactNode) | null = null;
let staffHoursRender: ((props: AcademyStaffHoursFieldsProps) => ReactNode) | null = null;

export function registerAcademyGuardianInvite(
  render: (props: AcademyGuardianInviteProps) => ReactNode
): void {
  guardianInviteRender = render;
}

export function registerAcademyParentInviteResult(
  render: (props: AcademyParentInviteResultProps) => ReactNode
): void {
  parentInviteResultRender = render;
}

export function registerAcademyStaffHoursFields(
  render: (props: AcademyStaffHoursFieldsProps) => ReactNode
): void {
  staffHoursRender = render;
}

export function renderAcademyGuardianInvite(props: AcademyGuardianInviteProps): ReactNode {
  return guardianInviteRender?.(props) ?? null;
}

export function renderAcademyParentInviteResult(props: AcademyParentInviteResultProps): ReactNode {
  return parentInviteResultRender?.(props) ?? null;
}

export function renderAcademyStaffHoursFields(props: AcademyStaffHoursFieldsProps): ReactNode {
  return staffHoursRender?.(props) ?? null;
}
