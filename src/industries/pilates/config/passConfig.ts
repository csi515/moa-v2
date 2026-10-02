import type { PassManagementConfig } from '@/capabilities/billing/ui/PassManagementView';

export const pilatesPassConfig: PassManagementConfig = {
  accent: 'bg-teal-600',
  accentHover: 'hover:bg-teal-700',
  accentText: 'text-teal-600',
  filterActive: 'bg-teal-600 text-white',
  title: '이용권 관리',
  description:
    '횟수제 이용권을 등록하고 잔여 횟수를 관리합니다. 수업 완료 시 1회 차감됩니다. 이 기기에서만 저장되며 다른 기기와 동기화되지 않습니다.',
  createLabel: '+ 이용권 등록',
  emptyTitle: '이용권이 없습니다',
  customerLabel: '회원',
  passName: '이용권',
  defaultPassLabel: '10회 이용권',
  defaultTotalSessions: 10,
  preferSessionPassStudents: false,
};
