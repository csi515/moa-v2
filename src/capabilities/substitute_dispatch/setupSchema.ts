import type { CapabilitySetupSchema } from '@/core/presets/types';

export const substitute_dispatchSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'substitute_dispatch',
  title: '강사 대강 긴급 호출 및 승인 설정',
  description: '결강 시 대체 강사 기본 지급료 및 관리자 승인 절차를 설정합니다.',
  fields: [
    {
      id: 'default_offered_fee',
      label: '기본 권장 대강료 (원)',
      type: 'number',
      defaultValue: 35000,
      description: '대강 요청 등록 시 기본으로 제안되는 강사료 금액입니다.',
    },
    {
      id: 'auto_broadcast_slack',
      label: '원내 단톡방/슬랙 알림 문안 원클릭 복사',
      type: 'boolean',
      defaultValue: true,
      description: '대강 공고 생성 즉시 강사 단톡방에 공유할 수 있는 서식을 자동 생성합니다.',
    },
  ],
};

export const substituteDispatchSetupSchema = substitute_dispatchSetupSchema;
