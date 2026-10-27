import type { CapabilitySetupSchema } from '@/core/presets/types';

export const skillsMatrixCertSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'skills_matrix_cert',
  title: '직원 자격증 및 직무 스킬 설정',
  description: 'CPR(응급처치), 생활스포츠지도사, 교원자격 등 만료 사전 알림 기준일을 설정합니다.',
  fields: [
    {
      id: 'cert_expiry_alert_days',
      label: '자격증 갱신 사전 경고 일수(일)',
      type: 'number',
      defaultValue: 60,
      description: '법정 필수 자격증 갱신 기한 도래 시 관리자에게 노출할 알림 일수입니다.',
    },
    {
      id: 'enable_skill_level_badge',
      label: '강사 프로필에 스킬 레벨 뱃지 표기',
      type: 'boolean',
      defaultValue: true,
      description: '회원 예약 화면 또는 강사 배정 시 스킬 레벨(1~5단계)을 노출합니다.',
    },
  ],
};
