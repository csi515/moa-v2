import type { PassManagementConfig } from '@/capabilities/billing/ui/PassManagementView';

export const skinPassConfig: PassManagementConfig = {
  accent: 'bg-rose-600',
  accentHover: 'hover:bg-rose-700',
  accentText: 'text-rose-600',
  filterActive: 'bg-rose-600 text-white',
  title: '관리권 관리',
  description:
    '횟수제 관리권을 등록하고 잔여 횟수를 관리합니다. 시술 완료 시 1회 차감됩니다. 이 기기에서만 저장되며 다른 기기와 동기화되지 않습니다.',
  createLabel: '+ 관리권 등록',
  emptyTitle: '관리권이 없습니다',
  customerLabel: '고객',
  passName: '관리권',
  defaultPassLabel: '10회 관리권',
  defaultTotalSessions: 10,
  preferSessionPassStudents: false,
};
