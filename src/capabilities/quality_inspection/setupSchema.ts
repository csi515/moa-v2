import type { CapabilitySetupSchema } from '@/core/presets/types';

export const qualityInspectionSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'quality_inspection',
  title: '전문 품질검사 및 규격 공차 설정',
  description: '공정 및 입고 검사 기준, Min/Max 공차 허용범위 및 불량 시 부적합 보고서 자동 연계 정책',
  fields: [
    {
      id: 'default_sample_size',
      label: '기본 샘플링 검사 수량',
      type: 'number',
      defaultValue: 5,
      description: '로트당 기본 측정 샘플 수량을 설정합니다.',
    },
    {
      id: 'auto_incident_report_on_defect',
      label: '불합격 시 부적합 보고서(CAPA) 자동 발행',
      type: 'boolean',
      defaultValue: true,
      description: '검사 결과 불합격(FAIL) 판정 시 안전·시설 사고/부적합 보고서 초안을 자동으로 생성합니다.',
    },
    {
      id: 'enable_cpk_analytics',
      label: '공정능력지수(Cpk) 통계 분석 활성화',
      type: 'boolean',
      defaultValue: true,
      description: '규격 상하한 및 표준편차 기반의 공정능력지수를 자동 계산하여 관리도에 표시합니다.',
    },
  ],
};
