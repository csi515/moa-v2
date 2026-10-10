import { getIndustryPlugin } from '@/core/industry/registry';
import { getCustomFieldsForIndustry } from '@/core/customer/customFields';
import {
  getStudentLevelLabel,
  getStudentLevelOptions,
  showSchoolFields as getShowSchoolFields,
} from '@/core/students/levelOptions';
import type { IndustryType } from '@/core/industry/types';
import type {
  RosterFieldDefinition,
  RosterPresentationPolicy,
  UnifiedRosterConfig,
} from '../types/rosterSchema';

export interface RosterConfigOptions {
  customerLabel?: string;
  staffLabel?: string;
  serviceLabel?: string;
  placeLabel?: string;
}

/**
 * 업종 프리셋 및 매니페스트 설정을 단일 스키마 설정(`UnifiedRosterConfig`)으로 조립합니다.
 */
export function getRosterConfigForIndustry(
  industry: IndustryType | string | null | undefined,
  options?: RosterConfigOptions
): UnifiedRosterConfig {
  const plugin = getIndustryPlugin(industry);
  const showSchool = getShowSchoolFields(industry);
  const showPickup = Boolean(plugin.showPickupFields);
  const customFieldsDef = getCustomFieldsForIndustry(industry);

  const entityLabel = options?.customerLabel || plugin.customerLabel || '고객';
  const staffLabel = options?.staffLabel || '강사';
  const serviceLabel = options?.serviceLabel || '수업';
  const feeLabel = plugin.feeLabel || '수강료';
  const exitActionLabel = plugin.usesWithdrawalExitLabel ? '퇴원' : '종료';

  const presentation: RosterPresentationPolicy = {
    entityLabel,
    staffLabel,
    serviceLabel,
    feeLabel,
    exitActionLabel,
    statusLabels: {
      active: entityLabel === '원아' ? '재원' : '이용중',
      paused: entityLabel === '원아' ? '휴원' : '일시정지',
      withdrawn: exitActionLabel,
    },
  };

  const fields: RosterFieldDefinition[] = [
    {
      id: 'name',
      name: 'name',
      label: `${entityLabel} 이름`,
      type: 'text',
      required: true,
      placeholder: '이름 입력',
      group: 'basic',
    },
    {
      id: 'gender',
      name: 'gender',
      label: '성별',
      type: 'select',
      options: [
        { value: '', label: '선택 안 함' },
        { value: 'M', label: '남' },
        { value: 'F', label: '여' },
      ],
      group: 'basic',
    },
    {
      id: 'birthDate',
      name: 'birthDate',
      label: '생년월일',
      type: 'date',
      group: 'basic',
    },
    {
      id: 'phone',
      name: 'phone',
      label: '연락처',
      type: 'phone',
      placeholder: '선택',
      group: 'basic',
    },
  ];

  if (showSchool) {
    fields.push(
      {
        id: 'school',
        name: 'school',
        label: '학교',
        type: 'text',
        placeholder: '예: ○○초등학교',
        group: 'basic',
      },
      {
        id: 'grade',
        name: 'grade',
        label: '학년',
        type: 'text',
        placeholder: '예: 3학년',
        group: 'basic',
      }
    );
  }

  fields.push({
    id: 'joinDate',
    name: 'joinDate',
    label: '등록일',
    type: 'date',
    required: true,
    group: 'basic',
  });

  if (showPickup) {
    fields.push(
      {
        id: 'address',
        name: 'address',
        label: '거주지 주소',
        type: 'address',
        placeholder: '예: 서울시 강남구 테헤란로 123',
        group: 'pickup',
      },
      {
        id: 'usesShuttleService',
        name: 'usesShuttleService',
        label: '셔틀 픽업·하원 서비스 이용',
        type: 'boolean',
        defaultValue: false,
        group: 'pickup',
      }
    );
  }

  // Level & Service
  const levelLabel = getStudentLevelLabel(industry);
  const levelOptions = getStudentLevelOptions(industry);
  fields.push(
    {
      id: 'level',
      name: 'level',
      label: levelLabel,
      type: 'select',
      options: levelOptions,
      defaultValue: levelOptions[0],
      group: 'service',
    },
    {
      id: 'teacherId',
      name: 'teacherId',
      label: `담당 ${staffLabel}`,
      type: 'select',
      group: 'service',
    },
    {
      id: 'billingMode',
      name: 'billingMode',
      label: '수강 형태',
      type: 'select',
      options: [
        { value: 'monthly', label: '일반', hint: '매월 청구' },
        { value: 'session_pass', label: '회차권', hint: '출석 시 차감' },
      ],
      defaultValue: 'monthly',
      group: 'billing',
    },
    {
      id: 'tuitionFee',
      name: 'tuitionFee',
      label: feeLabel,
      type: 'number',
      defaultValue: 180000,
      group: 'billing',
    },
    {
      id: 'paymentDay',
      name: 'paymentDay',
      label: '납부일',
      type: 'number',
      defaultValue: 10,
      group: 'billing',
    }
  );

  // Custom metadata fields
  customFieldsDef.forEach((cf) => {
    fields.push({
      id: cf.key,
      name: cf.key,
      label: cf.label,
      type: cf.type as any,
      required: cf.required,
      placeholder: cf.placeholder,
      options: cf.options,
      defaultValue: cf.defaultValue,
      group: 'custom',
    });
  });

  return {
    fields,
    presentation,
    showSchoolFields: showSchool,
    showPickupFields: showPickup,
  };
}
