import type { CapabilitySetupSchema } from '@/core/presets/types';

export const dietBodyLogSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'diet_body_log',
  title: '식단 & 체성분 피트니스 다이어리 설정',
  description: '인바디 권장 측정 주기(일), 식단 사진 업로드 필수 여부 및 운동 볼륨 기준을 설정합니다.',
  fields: [
    {
      id: 'inbodyMeasurementCycleDays',
      label: '인바디 권장 재측정 주기 (일)',
      type: 'number',
      defaultValue: 30,
      required: true,
    },
    {
      id: 'targetMuscleGroups',
      label: '기본 운동 부위 분류 (쉼표 구분)',
      type: 'tags',
      defaultValue: ['가슴', '등', '하체', '어깨', '팔', '코어', '유산소'],
    },
    {
      id: 'requireMealPhoto',
      label: '식단 기록 시 사진 첨부 권장',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'enableTrainerPushNotification',
      label: '식단 등록 시 담당 트레이너에게 알림 전송',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};
