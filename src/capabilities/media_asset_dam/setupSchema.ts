import type { CapabilitySetupSchema } from '@/core/presets/types';

export const mediaAssetDamSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'media_asset_dam',
  title: '미디어 자산 및 초상권 설정',
  description: '수업 및 시술 사진 원본 아카이빙 시 고객 초상권 동의 필수 여부를 설정합니다.',
  fields: [
    {
      id: 'enforce_portrait_consent',
      label: '마케팅 활용 전 초상권 동의 확인 강제',
      type: 'boolean',
      defaultValue: true,
      description: '초상권 동의가 없는 미디어 파일의 대외 홍보용 추출을 제한합니다.',
    },
    {
      id: 'watermark_preview',
      label: '내부 공유용 미리보기에 워터마크 자동 삽입',
      type: 'boolean',
      defaultValue: true,
      description: '원본 유출 방지를 위해 시스템 내부 프리뷰에 기관 워터마크를 합성합니다.',
    },
  ],
};
