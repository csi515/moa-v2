import type { PickupAddress } from '@/core/transport/types';
import type { GuardianFormEntry, StudentFormData } from './studentFormTypes';

export type StudentFormErrors = Partial<Record<string, string>>;

export interface StudentFormValidationInput {
  formData: StudentFormData;
  guardians: GuardianFormEntry[];
  isAdultSelf: boolean;
  showPickupFields: boolean;
  customerLabel: string;
  contactLabel: string;
}

/** 필드 DOM id — submit 후 focus/scroll 대상 */
export const STUDENT_FORM_FIELD_IDS = {
  name: 'student-form-name',
  guardians: 'student-form-guardians',
  pickup: 'student-form-pickup',
  guardianExisting: (idx: number) => `student-form-guardian-${idx}-existing`,
  guardianName: (idx: number) => `student-form-guardian-${idx}-name`,
  guardianPhone: (idx: number) => `student-form-guardian-${idx}-phone`,
  guardianEmail: (idx: number) => `student-form-guardian-${idx}-email`,
} as const;

export function fieldIdForError(field: string): string {
  if (field === 'name') return STUDENT_FORM_FIELD_IDS.name;
  if (field === 'guardians') return STUDENT_FORM_FIELD_IDS.guardians;
  if (field === 'pickup') return STUDENT_FORM_FIELD_IDS.pickup;
  const existing = /^guardian-(\d+)-existing$/.exec(field);
  if (existing) return STUDENT_FORM_FIELD_IDS.guardianExisting(Number(existing[1]));
  const name = /^guardian-(\d+)-name$/.exec(field);
  if (name) return STUDENT_FORM_FIELD_IDS.guardianName(Number(name[1]));
  const phone = /^guardian-(\d+)-phone$/.exec(field);
  if (phone) return STUDENT_FORM_FIELD_IDS.guardianPhone(Number(phone[1]));
  const email = /^guardian-(\d+)-email$/.exec(field);
  if (email) return STUDENT_FORM_FIELD_IDS.guardianEmail(Number(email[1]));
  return field;
}

/**
 * 기존 StudentFormModal handleSubmit 규칙과 동일.
 * 메시지/조건은 바꾸지 않고 필드 키만 붙인다.
 */
export function validateStudentForm(input: StudentFormValidationInput): StudentFormErrors {
  const { formData, guardians, isAdultSelf, showPickupFields, customerLabel, contactLabel } =
    input;
  const errors: StudentFormErrors = {};

  if (!formData.name.trim()) {
    errors.name = `필수 항목: ${customerLabel} 이름을 입력해 주세요`;
  }

  if (!isAdultSelf) {
    guardians.forEach((g, idx) => {
      if (g.mode === 'existing' && !g.existingParentId) {
        errors[`guardian-${idx}-existing`] =
          `검색 결과에서 기존 ${contactLabel}를 선택하거나 새로 등록해 주세요`;
      }
      if (g.mode === 'new' && (!g.name.trim() || !g.phone.trim())) {
        const message = `필수 항목: ${contactLabel} 이름과 전화번호를 모두 입력해 주세요`;
        if (!g.name.trim()) errors[`guardian-${idx}-name`] = message;
        if (!g.phone.trim()) errors[`guardian-${idx}-phone`] = message;
      }
      if (g.invite && !g.email.trim()) {
        errors[`guardian-${idx}-email`] = `초대 기능 사용 시 ${contactLabel} 이메일을 입력해 주세요`;
      }
    });

    const parentKeys = guardians.map((g) =>
      g.mode === 'existing' && g.existingParentId
        ? `id:${g.existingParentId}`
        : `phone:${g.phone.trim()}`
    );
    if (new Set(parentKeys).size !== parentKeys.length) {
      errors.guardians = `중복 오류: 같은 ${contactLabel}를 여러 번 등록할 수 없습니다`;
    }
  }

  if (showPickupFields && formData.usesShuttleService) {
    const hasAddress = formData.pickupAddresses.some((a: PickupAddress) => a.address.trim());
    if (!hasAddress) {
      errors.pickup = '셔틀 이용 시 픽업·하원 주소를 최소 1곳 입력해 주세요';
    }
  }

  return errors;
}

export function firstErrorField(errors: StudentFormErrors): string | null {
  const order = Object.keys(errors);
  return order[0] ?? null;
}

/** guardian key는 매 오픈마다 바뀌므로 dirty 비교에서 제외 */
export function studentFormSnapshot(
  formData: StudentFormData,
  guardians: GuardianFormEntry[],
  isAdultSelf: boolean
): string {
  return JSON.stringify({
    formData,
    isAdultSelf,
    guardians: guardians.map(({ key: _key, ...rest }) => rest),
  });
}

export function focusStudentFormField(field: string, root?: ParentNode | null): void {
  const id = fieldIdForError(field);
  const scope = root ?? document;
  const target =
    scope.querySelector<HTMLElement>(`#${id}`) ??
    document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ block: 'center', inline: 'nearest' });
  const focusable = target.matches('input,select,textarea,button')
    ? target
    : target.querySelector<HTMLElement>('input,select,textarea,button');
  focusable?.focus({ preventScroll: true });
}
