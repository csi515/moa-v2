import type { CapabilitySetupSchema } from '@/core/presets/types';

export const leaveManagementSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'leave_management',
  title: '시간 단위 정밀 휴가 운영 설정',
  description: '유연근무제(9-9-9-9-4제, 탄력근무, 파트타임 등)에 따른 소정근로시간 매핑 및 시간 단위 차감 규칙을 설정합니다.',
  fields: [
    {
      id: 'default_annual_accrual_hours',
      label: '신규 입사자 기본 연차 발생 시간 (시간)',
      type: 'number',
      defaultValue: 120, // 15일 * 8시간 = 120시간
      description: '통상 1년 만근 시 부여되는 법정 기본 연차 발생 총 시간입니다.',
    },
    {
      id: 'allow_half_hour_deduction',
      label: '30분(0.5시간) 단위 분할 사용 허용',
      type: 'boolean',
      defaultValue: true,
      description: '병원 진료, 외출, 조퇴 시 30분 단위 정밀 차감을 허용합니다.',
    },
    {
      id: 'require_approver_designation',
      label: '휴가 신청 시 결재 승인권자 지정 필수',
      type: 'boolean',
      defaultValue: true,
      description: '부서 관리자 또는 팀장의 결재 승인 완료 시에만 잔여 시간이 차감되고 근무표에 반영됩니다.',
    },
    {
      id: 'work_schedule_type',
      label: '기본 소정근무제 유형',
      type: 'select',
      defaultValue: 'flexible_four_point_five',
      options: [
        { label: '9-9-9-9-4 유연근무제 (월~목 9시간, 금 4시간)', value: 'flexible_four_point_five' },
        { label: '표준 8시간 근무제 (주 40시간 균등)', value: 'standard_eight' },
        { label: '파트타임 및 시차출퇴근 자율제', value: 'part_time_custom' },
      ],
      description: '당일 전일 휴가 신청 시 자동 차감될 소정근로시간 기준을 설정합니다.',
    },
  ],
};
