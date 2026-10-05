import type { Student, Parent } from '@/types';
import type { GuardianRelationship } from '@/core/parent/types';
import { getPrimaryGuardian } from '@/core/parent/guardianHelpers';
import { StorageService } from '@/services/storage';
import { StudentService } from '@/core/students/services/studentService';
import { isAttendanceModuleEnabled } from '@/core/attendance/features';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  inviteParentWithSync,
  syncAllParentStudentLinks,
  type InviteParentResult,
} from '@/core/parent/services/parentAccountService';
import { sendParentInvitationEmail } from '@/core/parent/services/parentInviteService';
import { getIndustryType } from '@/services/adapters/storageContext';

/** 등록 시 보호자 1명 입력 */
export interface GuardianRegistrationInput {
  mode: 'existing' | 'new';
  existingParentId?: string;
  name?: string;
  phone?: string;
  email?: string;
  relationship: GuardianRelationship;
  isPrimary?: boolean;
  invite?: boolean;
}

export interface StudentRegistrationOptions {
  guardians: GuardianRegistrationInput[];
  checkInPin?: string;
  autoGeneratePin?: boolean;
  organizationId?: string;
}

export interface StudentRegistrationInviteResult {
  parentId: string;
  parentName: string;
  email: string;
  result: InviteParentResult;
  emailSent: boolean;
  emailMessage?: string;
}

export interface StudentRegistrationResult {
  student: Student;
  parents: Parent[];
  primaryParent: Parent | null;
  generatedPin?: string;
  invitesSent: number;
  inviteErrors: string[];
  inviteResults: StudentRegistrationInviteResult[];
}

/** 학생 + 보호자 links + PIN + 초대 */
export async function registerStudentWithParent(
  studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  options: StudentRegistrationOptions
): Promise<StudentRegistrationResult> {
  const organizationId = options.organizationId || 'local-org';
  const settings = StorageService.getSettings();
  const industry = getIndustryType() || 'piano';
  const attendanceEnabled = isAttendanceModuleEnabled(settings, industry);

  const { parentId: _p, parentName: _n, parentPhone: _ph, ...studentCore } = studentData;
  const savedStudent = StudentService.saveStudent(studentCore as typeof studentData);

  const parents: Parent[] = [];
  const inviteErrors: string[] = [];
  const inviteResults: StudentRegistrationInviteResult[] = [];
  let invitesSent = 0;

  for (const guardian of options.guardians) {
    const parent = StorageService.createOrLinkParent({
      studentId: savedStudent.id,
      existingParentId: guardian.mode === 'existing' ? guardian.existingParentId : undefined,
      name: guardian.name,
      phone: guardian.phone,
      email: guardian.email,
      relationship: guardian.relationship,
      isPrimary: guardian.isPrimary,
    });
    parents.push(parent);

    if (
      guardian.invite &&
      guardian.email?.trim() &&
      isSupabaseConfigured() &&
      organizationId !== 'local-org'
    ) {
      try {
        const inviteResult = await inviteParentWithSync(
          organizationId,
          parent.id,
          guardian.email.trim()
        );
        let emailSent = false;
        let emailMessage: string | undefined;

        if (inviteResult.linkCodes.length > 0) {
          const emailResult = await sendParentInvitationEmail({
            organizationId,
            parentCustomerId: parent.id,
            linkCodes: inviteResult.linkCodes,
          });
          emailSent = emailResult.emailSent;
          emailMessage = emailResult.message;
        }

        inviteResults.push({
          parentId: parent.id,
          parentName: parent.name,
          email: guardian.email.trim(),
          result: inviteResult,
          emailSent,
          emailMessage,
        });
        invitesSent++;
      } catch (e) {
        inviteErrors.push(
          e instanceof Error ? e.message : `${parent.name} 학부모 초대에 실패했습니다.`
        );
      }
    }
  }

  let generatedPin: string | undefined;
  if (attendanceEnabled) {
    const pin = options.checkInPin?.trim();
    if (pin) {
      const result = await StorageService.setCustomerPin(savedStudent.id, pin, organizationId);
      if (result.ok === false) {
        throw new Error(
          result.error === 'pin_already_used'
            ? '다른 회원이 사용 중인 PIN입니다.'
            : 'PIN은 4~8자리 숫자여야 합니다.'
        );
      }
      generatedPin = pin;
    } else if (options.autoGeneratePin !== false) {
      const { pin: autoPin } = await StorageService.generateCustomerPin(
        savedStudent.id,
        organizationId
      );
      generatedPin = autoPin;
    }
  }

  if (isSupabaseConfigured() && organizationId !== 'local-org') {
    try {
      await syncAllParentStudentLinks(organizationId);
    } catch (e) {
      console.error('Failed to sync parent-student links:', e);
    }
  }

  const student = StorageService.getStudentById(savedStudent.id) || savedStudent;
  const primary = getPrimaryGuardian(student.id);
  const primaryParent = primary
    ? StorageService.getParents().find((p) => p.id === primary.parentId) || null
    : parents[0] || null;

  return {
    student,
    parents,
    primaryParent,
    generatedPin,
    invitesSent,
    inviteErrors,
    inviteResults,
  };
}

/** 수정 시 보호자 links 갱신 (추가·관계 변경·제거) */
export async function updateStudentWithParent(
  studentData: Omit<Student, 'createdAt' | 'updatedAt'> & { id: string },
  options: {
    guardians?: GuardianRegistrationInput[];
    organizationId?: string;
  } = {}
): Promise<{ student: Student; parents: Parent[] }> {
  const { parentId: _p, parentName: _n, parentPhone: _ph, ...studentCore } = studentData;
  const savedStudent = StudentService.saveStudent(studentCore as typeof studentData);

  const parents: Parent[] = [];
  if (options.guardians?.length) {
    parents.push(
      ...StorageService.syncStudentGuardians(
        savedStudent.id,
        options.guardians.map((g) => ({
          existingParentId: g.mode === 'existing' ? g.existingParentId : undefined,
          name: g.name,
          phone: g.phone,
          email: g.email,
          relationship: g.relationship,
          isPrimary: g.isPrimary,
        }))
      )
    );
  }

  const organizationId = options.organizationId;
  if (isSupabaseConfigured() && organizationId && organizationId !== 'local-org') {
    try {
      await syncAllParentStudentLinks(organizationId);
    } catch (e) {
      console.error('Failed to sync parent-student links:', e);
    }
  }

  return {
    student: StorageService.getStudentById(savedStudent.id) || savedStudent,
    parents,
  };
}

/** 주 보호자 이메일 */
export function getLinkedParentEmail(student: Student): string {
  const primary = getPrimaryGuardian(student.id);
  return primary?.parentEmail || '';
}

/** 학생에 연결된 모든 보호자 */
export function getLinkedParentIds(studentId: string): string[] {
  return StorageService.getParentStudentLinks()
    .filter((l) => l.studentId === studentId)
    .map((l) => l.parentId);
}
