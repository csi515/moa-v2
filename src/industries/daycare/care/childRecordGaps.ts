import type { ChildLegalRecord, ChildRecordGap } from './types';

function checkupYear(date?: string): string | undefined {
  return date?.slice(0, 4);
}

/** 예방접종·올해 검진·알레르기·귀가 동의 중 빠진 항목 */
export function getChildRecordGaps(
  record: ChildLegalRecord | undefined,
  year = new Date().getFullYear()
): ChildRecordGap[] {
  const gaps: ChildRecordGap[] = [];
  if (!record?.vaccinationCheckedAt) gaps.push('vaccine');
  if (!record?.healthCheckDate || checkupYear(record.healthCheckDate) !== String(year)) {
    gaps.push('checkup');
  }
  if (!record?.allergyNote?.trim()) gaps.push('allergy');
  const hasPickup = (record?.authorizedPickups ?? []).some((person) => person.name.trim());
  if (!hasPickup) gaps.push('pickup');
  return gaps;
}
