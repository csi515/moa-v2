import type { CapabilitySetupSchema } from '@/core/presets/types';

export const treatmentChartSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'treatment_chart',
  title: '시술 및 케어 히스토리 차트 설정',
  description: '주요 시술 종목별 기본 권장 주기(주), 약재 배합 메모 및 사진 첨부 옵션을 설정합니다.',
  fields: [
    {
      id: 'defaultVisitCycleWeeks',
      label: '기본 재방문 권장 주기 (주)',
      type: 'number',
      defaultValue: 4,
      required: true,
    },
    {
      id: 'categories',
      label: '시술/케어 분류 카테고리 (쉼표 구분)',
      type: 'tags',
      defaultValue: ['커트/펌/염색', '네일아트/페디', '스킨케어/필링', '속눈썹/왁싱', '펫미용/목욕'],
    },
    {
      id: 'allowBeforeAfterPhotos',
      label: '시술 전/후 사진 기록 활성화',
      type: 'boolean',
      defaultValue: true,
    },
    {
      id: 'requireFormulaNotes',
      label: '약재/배합 컬러 번호 필수 기재',
      type: 'boolean',
      defaultValue: false,
    },
  ],
};
