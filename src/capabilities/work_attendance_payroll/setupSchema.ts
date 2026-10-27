import type { CapabilitySetupSchema } from '@/core/presets/types';

export const workAttendancePayrollSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'work_attendance_payroll',
  title: '직원 근태 및 법정 급여명세서 설정',
  description: '매장 Wi-Fi/GPS 출퇴근 인증 기준, 법정 주휴수당 및 4대보험 공제 기준을 설정합니다.',
  fields: [
    {
      id: 'store_wifi_bssid',
      label: '매장 전용 Wi-Fi BSSID (MAC 주소)',
      type: 'text',
      defaultValue: '',
      description: '직원이 매장 Wi-Fi에 연결되었을 때만 출퇴근 태그를 허용합니다. (예: AA:BB:CC:11:22:33)',
    },
    {
      id: 'gps_allowed_radius_meters',
      label: 'GPS 출퇴근 인증 허용 반경 (m)',
      type: 'number',
      defaultValue: 50,
      description: '매장 좌표 기준 해당 반경 이내에서만 모바일 출퇴근 태그가 승인됩니다.',
    },
    {
      id: 'default_hourly_rate',
      label: '사업장 기본 통상 시급 (원)',
      type: 'number',
      defaultValue: 10030,
      description: '신규 파트타임 알바 등록 시 적용할 기본 시급(최저임금 이상)입니다.',
    },
    {
      id: 'auto_calculate_weekly_holiday',
      label: '주 15시간 이상 주휴수당 자동 산출',
      type: 'boolean',
      defaultValue: true,
      description: '근로기준법 제55조에 따라 주 15시간 이상 실근무 시 주휴수당을 자동으로 계산합니다.',
    },
    {
      id: 'auto_generate_payroll_slip',
      label: '근로기준법 제48조 전자 급여명세서 자동 발행',
      type: 'boolean',
      defaultValue: true,
      description: '월말 급여 마감 시 기본급, 주휴/연장수당, 4대보험 공제 내역이 포함된 명세서를 자동 생성합니다.',
    },
  ],
};
