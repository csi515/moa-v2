import { getCoreClient } from '@/lib/supabase';

export type ParentPinError =
  | 'forbidden'
  | 'invalid_pin_format'
  | 'pin_already_used'
  | 'enrollment_inactive'
  | 'pin_generation_failed'
  | 'unknown';

export interface ParentPinRpcResult {
  success: boolean;
  error?: ParentPinError;
  pin?: string;
}

function parsePinError(value: unknown): ParentPinError {
  const code = String(value ?? '');
  if (
    code === 'forbidden' ||
    code === 'invalid_pin_format' ||
    code === 'pin_already_used' ||
    code === 'enrollment_inactive' ||
    code === 'pin_generation_failed'
  ) {
    return code;
  }
  return 'unknown';
}

export function parentPinErrorMessage(error: ParentPinError): string {
  const messages: Record<ParentPinError, string> = {
    forbidden: '이 자녀의 PIN을 변경할 권한이 없습니다.',
    invalid_pin_format: 'PIN은 4~8자리 숫자여야 합니다.',
    pin_already_used: '이 학원에서 다른 회원이 사용 중인 PIN입니다.',
    enrollment_inactive: '퇴원·졸업 상태에서는 PIN을 설정할 수 없습니다.',
    pin_generation_failed: 'PIN 자동 발급에 실패했습니다. 직접 입력해 주세요.',
    unknown: 'PIN 처리 중 오류가 발생했습니다.',
  };
  return messages[error];
}

export async function parentSetChildCheckInPin(
  organizationId: string,
  customerId: string,
  pin: string
): Promise<ParentPinRpcResult> {
  const { data, error } = await getCoreClient().rpc('parent_set_child_check_in_pin', {
    p_org_id: organizationId,
    p_customer_id: customerId,
    p_pin: pin,
  });
  if (error) throw error;

  const result = (data ?? {}) as { success?: boolean; error?: string; pin?: string };
  if (result.success) return { success: true };
  return { success: false, error: parsePinError(result.error) };
}

export async function parentClearChildCheckInPin(
  organizationId: string,
  customerId: string
): Promise<ParentPinRpcResult> {
  const { data, error } = await getCoreClient().rpc('parent_clear_child_check_in_pin', {
    p_org_id: organizationId,
    p_customer_id: customerId,
  });
  if (error) throw error;

  const result = (data ?? {}) as { success?: boolean; error?: string };
  if (result.success) return { success: true };
  return { success: false, error: parsePinError(result.error) };
}

export async function parentGenerateChildCheckInPin(
  organizationId: string,
  customerId: string
): Promise<ParentPinRpcResult> {
  const { data, error } = await getCoreClient().rpc('parent_generate_child_check_in_pin', {
    p_org_id: organizationId,
    p_customer_id: customerId,
  });
  if (error) throw error;

  const result = (data ?? {}) as { success?: boolean; error?: string; pin?: string };
  if (result.success) {
    return { success: true, pin: result.pin ? String(result.pin) : undefined };
  }
  return { success: false, error: parsePinError(result.error) };
}
