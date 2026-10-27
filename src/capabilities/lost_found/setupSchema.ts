import type { CapabilitySetupSchema } from '@/core/presets/types';

export const lostFoundSetupSchema: CapabilitySetupSchema = {
  capabilityId: 'lost_found',
  title: '시설 분실물·습득물 보관 관리 설정',
  description: '법적 보관 기한(일), 만료 임박 알림 기준일 및 분실물 공지 정책을 설정합니다.',
  fields: [
    {
      id: 'defaultRetentionDays',
      label: '기본 법적 보관 기한 (일)',
      type: 'number',
      defaultValue: 30,
      required: true,
    },
    {
      id: 'expiringSoonNoticeDays',
      label: '폐기/기부 전 만료 임박 알림 기준일 (일 전)',
      type: 'number',
      defaultValue: 7,
      required: true,
    },
    {
      id: 'defaultStorageLocations',
      label: '기본 보관 장소 목록 (쉼표 구분)',
      type: 'tags',
      defaultValue: ['안내데스크 1번 보관함', '안내데스크 2번 보관함', '사무실 금고', '지하 보관실 B구역'],
    },
    {
      id: 'allowMemberOnlineInquiry',
      label: '회원 모바일 화면에서 분실물 목록 조회 허용',
      type: 'boolean',
      defaultValue: true,
    },
  ],
};
